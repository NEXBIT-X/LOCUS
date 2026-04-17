-- Locus Round 3 admin rules and shared auth/data bridge.
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Optional: keep one active policy per worker.
create unique index if not exists policies_active_worker_idx
  on public.policies(worker_id)
  where is_active = true;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('worker', 'admin')) default 'worker',
  created_at timestamptz not null default now()
);

create table if not exists public.decision_timeline (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null check (actor_role in ('worker', 'admin', 'system')),
  event_name text not null,
  event_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.workers
  add column if not exists role text not null default 'worker';

alter table public.workers
  add column if not exists city text default 'Chennai';

alter table public.workers
  add column if not exists zone_label text default 'Velachery';

alter table public.workers
  add column if not exists upi_handle text default 'worker@upi';

alter table public.workers
  add column if not exists emergency_contact text default '+91 90000 00000';

-- Helper: identify admin users from the role table.
create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = coalesce(p_user_id, auth.uid())
      and ur.role = 'admin'
  );
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Admin access required';
  end if;
end;
$$;

create or replace function public.web_log_decision_event(
  p_event_name text,
  p_event_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text := case when public.is_admin_user(auth.uid()) then 'admin' else 'worker' end;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  insert into public.decision_timeline(actor_id, actor_role, event_name, event_details, created_at)
  values (auth.uid(), actor_role, coalesce(nullif(trim(p_event_name), ''), 'event.unknown'), coalesce(p_event_details, '{}'::jsonb), now());

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.web_get_decision_timeline(p_limit int default 25)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_limit int := greatest(1, least(coalesce(p_limit, 25), 100));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  if public.is_admin_user(auth.uid()) then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'actor_id', d.actor_id,
          'actor_role', d.actor_role,
          'event_name', d.event_name,
          'details', d.event_details,
          'created_at', d.created_at
        )
        order by d.created_at desc
      ),
      '[]'::jsonb
    ) into result
    from (
      select *
      from public.decision_timeline
      order by created_at desc
      limit safe_limit
    ) d;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'actor_id', d.actor_id,
          'actor_role', d.actor_role,
          'event_name', d.event_name,
          'details', d.event_details,
          'created_at', d.created_at
        )
        order by d.created_at desc
      ),
      '[]'::jsonb
    ) into result
    from (
      select *
      from public.decision_timeline
      where actor_id = auth.uid()
         or event_details ->> 'target_worker_id' = auth.uid()::text
      order by created_at desc
      limit safe_limit
    ) d;
  end if;

  return result;
end;
$$;

-- Seed/update role rows when new auth users are created.
create or replace function public.sync_new_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inferred_role text := case
    when lower(coalesce(new.email, '')) in ('admin@locus.dev', 'insurer@locus.dev') then 'admin'
    else 'worker'
  end;
begin
  insert into public.user_roles(user_id, role)
  values (new.id, inferred_role)
  on conflict (user_id) do update set role = excluded.role;

  insert into public.workers (id, full_name, kyc_status, trust_tier, active_credit_balance, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'verified',
    3,
    1200,
    inferred_role
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, workers.full_name),
        role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.sync_new_auth_user_role();

-- Helper that assembles the worker dashboard JSON payload.
create or replace function public._build_worker_dashboard(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_row record;
  policy_row record;
  protected_week numeric := 0;
  repaid_month numeric := 0;
  history jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'No authenticated user';
  end if;

  select
    w.full_name,
    coalesce(w.active_credit_balance, 340) as credit_balance,
    coalesce(w.historical_avg_income, 4700) as avg_income,
    coalesce(w.city, 'Chennai') as city,
    coalesce(w.zone_label, 'Velachery') as zone_label,
    coalesce(w.upi_handle, 'worker@upi') as upi_handle
  into worker_row
  from public.workers w
  where w.id = p_user_id
  limit 1;

  select
    coalesce(p.weekly_premium, 60) as weekly_premium,
    p.valid_from,
    p.valid_to
  into policy_row
  from public.policies p
  where p.worker_id = p_user_id and p.is_active = true
  order by p.valid_from desc
  limit 1;

  select coalesce(sum(c.final_payout_amount), 0)
  into protected_week
  from public.claims c
  where c.worker_id = p_user_id
    and c.created_at >= date_trunc('week', now());

  select coalesce(sum(least(c.final_payout_amount, 60)), 0)
  into repaid_month
  from public.claims c
  where c.worker_id = p_user_id
    and c.created_at >= date_trunc('month', now());

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(c.created_at, 'Mon DD'),
        'disruptionType', coalesce(e.event_type, 'Disruption'),
        'amount', coalesce(c.final_payout_amount, 0),
        'status', initcap(replace(c.status, '_', ' '))
      )
      order by c.created_at desc
    ),
    '[]'::jsonb
  )
  into history
  from (
    select * from public.claims where worker_id = p_user_id order by created_at desc limit 5
  ) c
  left join public.disruption_events e on e.id = c.event_id;

  return jsonb_build_object(
    'workerName', coalesce(worker_row.full_name, 'Arjun Kumar'),
    'badge', 'Weekly Shield · Active',
    'averageEarnings', coalesce(worker_row.avg_income, 4700),
    'protectedThisWeek', protected_week,
    'planTier', 'Standard',
    'premiumPaid', coalesce(policy_row.weekly_premium, 60),
    'coverageWindow', concat(to_char(coalesce(policy_row.valid_from, now()), 'Dy'), '-', to_char(coalesce(policy_row.valid_to, now() + interval '6 day'), 'Dy')),
    'location', concat(worker_row.zone_label, ', ', worker_row.city),
    'weatherTrigger', 'HEAVY RAIN',
    'weatherRate', '>15mm/hr',
    'statusLabel', 'TRIGGER ACTIVE · Claim Initiated Automatically',
    'creditBalance', coalesce(worker_row.credit_balance, 340),
    'repaidThisMonth', repaid_month,
    'banner', 'Rain disruption detected in your zone. ₹450 credit advance initiated. No action needed.',
    'upiHandle', worker_row.upi_handle,
    'payoutHistory', history
  );
end;
$$;

create or replace function public._score_prediction_payload(p_prediction_payload jsonb)
returns table (
  fraud_score numeric,
  status text,
  expected_income_lost numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  gps_delta numeric := coalesce((p_prediction_payload ->> 'gps_delta')::numeric, 0);
  accel_variance numeric := coalesce((p_prediction_payload ->> 'accel_variance')::numeric, 0);
  activity_status numeric := coalesce((p_prediction_payload ->> 'activity_status')::numeric, 0);
  claim_velocity numeric := coalesce((p_prediction_payload ->> 'claim_velocity')::numeric, 0);
  anomaly_score numeric := coalesce((p_prediction_payload ->> 'anomaly_score')::numeric, 0);
  historical_avg_income numeric := coalesce((p_prediction_payload ->> 'historical_avg_income')::numeric, 0);
  raw_score numeric;
begin
  raw_score := greatest(
    0,
    least(
      1,
      (
        (gps_delta / 300)
        + (accel_variance / 6)
        + (anomaly_score * 0.7)
        + (claim_velocity / 10)
        + case when activity_status = 0 then 0.14 else 0 end
      ) / 3
    )
  );

  fraud_score := round(raw_score, 3);
  status := case
    when fraud_score >= 0.75 then 'HARD_FLAG'
    when fraud_score >= 0.45 then 'SOFT_FLAG'
    else 'CLEAR'
  end;
  expected_income_lost := round(historical_avg_income * fraud_score, 2);

  return next;
end;
$$;

create or replace function public._store_prediction_run(
  p_prediction_source text,
  p_prediction_payload jsonb,
  p_fraud_score numeric,
  p_status text,
  p_expected_income_lost numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  insert into public.prediction_runs(
    worker_id,
    source,
    payload,
    fraud_score,
    status,
    expected_income_lost,
    created_at
  ) values (
    auth.uid(),
    p_prediction_source,
    p_prediction_payload,
    p_fraud_score,
    p_status,
    p_expected_income_lost,
    now()
  );
end;
$$;

create or replace function public.run_prediction(
  prediction_payload jsonb,
  prediction_source text default 'simulation'
)
returns table (
  "fraudScore" numeric,
  status text,
  "expectedIncomeLost" numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  predicted record;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select * into predicted
  from public._score_prediction_payload(prediction_payload);

  perform public._store_prediction_run(
    prediction_source,
    prediction_payload,
    predicted.fraud_score,
    predicted.status,
    predicted.expected_income_lost
  );

  return query
  select predicted.fraud_score, predicted.status, predicted.expected_income_lost;
end;
$$;

create or replace function public.web_predict_claim(
  prediction_payload jsonb,
  prediction_source text default 'web'
)
returns table (
  fraud_score numeric,
  status text,
  expected_income_lost numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  predicted record;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select * into predicted
  from public._score_prediction_payload(prediction_payload);

  perform public._store_prediction_run(
    prediction_source,
    prediction_payload,
    predicted.fraud_score,
    predicted.status,
    predicted.expected_income_lost
  );

  return query
  select predicted.fraud_score, predicted.status, predicted.expected_income_lost;
end;
$$;

create or replace function public.web_get_worker_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_row record;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  select
    coalesce(w.full_name, 'Worker') as full_name,
    coalesce(w.city, 'Chennai') as city,
    coalesce(w.zone_label, 'Velachery') as zone_label,
    coalesce(w.upi_handle, 'worker@upi') as upi_handle,
    coalesce(w.emergency_contact, '+91 90000 00000') as emergency_contact,
    coalesce(w.historical_avg_income, 4700) as historical_avg_income
  into worker_row
  from public.workers w
  where w.id = auth.uid()
  limit 1;

  if worker_row is null then
    insert into public.workers(
      id,
      full_name,
      kyc_status,
      trust_tier,
      active_credit_balance,
      city,
      zone_label,
      upi_handle,
      emergency_contact,
      historical_avg_income,
      role
    ) values (
      auth.uid(),
      'Worker',
      'verified',
      3,
      1200,
      'Chennai',
      'Velachery',
      'worker@upi',
      '+91 90000 00000',
      4700,
      'worker'
    );

    return jsonb_build_object(
      'full_name', 'Worker',
      'city', 'Chennai',
      'zone_label', 'Velachery',
      'upi_handle', 'worker@upi',
      'emergency_contact', '+91 90000 00000',
      'historical_avg_income', 4700
    );
  end if;

  return jsonb_build_object(
    'full_name', worker_row.full_name,
    'city', worker_row.city,
    'zone_label', worker_row.zone_label,
    'upi_handle', worker_row.upi_handle,
    'emergency_contact', worker_row.emergency_contact,
    'historical_avg_income', worker_row.historical_avg_income
  );
end;
$$;

create or replace function public.web_update_worker_settings(
  p_full_name text,
  p_city text,
  p_zone_label text,
  p_upi_handle text,
  p_emergency_contact text,
  p_historical_avg_income numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  update public.workers
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    city = coalesce(nullif(trim(p_city), ''), city),
    zone_label = coalesce(nullif(trim(p_zone_label), ''), zone_label),
    upi_handle = coalesce(nullif(trim(p_upi_handle), ''), upi_handle),
    emergency_contact = coalesce(nullif(trim(p_emergency_contact), ''), emergency_contact),
    historical_avg_income = case
      when p_historical_avg_income is null or p_historical_avg_income <= 0 then historical_avg_income
      else p_historical_avg_income
    end
  where id = auth.uid();

  perform public.web_log_decision_event(
    'worker.settings.updated',
    jsonb_build_object('updated', true)
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.web_list_workers_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.require_admin();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'worker_id', w.id,
        'full_name', coalesce(w.full_name, 'Worker'),
        'city', coalesce(w.city, 'Chennai'),
        'active_credit_balance', coalesce(w.active_credit_balance, 0)
      )
      order by w.created_at desc
    ),
    '[]'::jsonb
  ) into result
  from public.workers w;

  return result;
end;
$$;

create or replace function public.web_admin_add_test_funds(
  p_worker_id uuid,
  p_amount numeric,
  p_note text default 'Manual test top-up'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_balance numeric;
begin
  perform public.require_admin();

  if p_worker_id is null then
    raise exception 'Worker ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.workers
  set active_credit_balance = coalesce(active_credit_balance, 0) + p_amount
  where id = p_worker_id
  returning active_credit_balance into updated_balance;

  if updated_balance is null then
    raise exception 'Worker account not found';
  end if;

  insert into public.decision_timeline(actor_id, actor_role, event_name, event_details, created_at)
  values (
    auth.uid(),
    'admin',
    'admin.test_funds.added',
    jsonb_build_object(
      'target_worker_id', p_worker_id,
      'amount', p_amount,
      'note', coalesce(nullif(trim(p_note), ''), 'Manual test top-up'),
      'updated_balance', updated_balance
    ),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'worker_id', p_worker_id,
    'updated_balance', updated_balance
  );
end;
$$;

create or replace function public._build_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_workers int := 0;
  active_policies int := 0;
  claims_this_week int := 0;
  total_premium numeric := 0;
  total_payout numeric := 0;
  loss_ratio numeric := 38;
  pipeline jsonb;
begin
  perform public.require_admin();

  select count(*) into total_workers from public.workers;
  select count(*) into active_policies from public.policies where is_active = true;
  select count(*) into claims_this_week
  from public.claims
  where created_at >= date_trunc('week', now());

  select coalesce(sum(weekly_premium), 0) into total_premium
  from public.policies
  where is_active = true;

  select coalesce(sum(final_payout_amount), 0) into total_payout
  from public.claims
  where created_at >= date_trunc('week', now());

  if total_premium > 0 then
    loss_ratio := round((total_payout / total_premium) * 100, 2);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'workerId', concat('WRK-', right(c.worker_id::text, 4)),
        'zone', coalesce(z.name, 'Zone 4B'),
        'triggerType', coalesce(e.event_type, 'Rain Surge'),
        'confidenceScore', concat(round((1 - coalesce(c.ml_feat_anomaly_score, 0.2)) * 100), '%'),
        'status', case
          when c.status = 'hard_flagged' then 'Hard Flag - Fraud Review'
          when c.status = 'soft_flagged' then 'Soft Flag'
          else 'Auto Approved'
        end,
        'payoutAmount', concat('Rs ', coalesce(c.final_payout_amount, 0))
      )
      order by c.created_at desc
    ),
    '[]'::jsonb
  ) into pipeline
  from (
    select * from public.claims order by created_at desc limit 5
  ) c
  left join public.disruption_events e on e.id = c.event_id
  left join public.zones z on z.id = e.zone_id;

  return jsonb_build_object(
    'metrics', jsonb_build_array(
      jsonb_build_object('label', 'Total Workers', 'value', total_workers::text),
      jsonb_build_object('label', 'Active Policies', 'value', active_policies::text),
      jsonb_build_object('label', 'Claims This Week', 'value', claims_this_week::text),
      jsonb_build_object('label', 'Loss Ratio', 'value', concat(loss_ratio::text, '%'))
    ),
    'claimsPipeline', pipeline,
    'fraudSignals', jsonb_build_array(
      jsonb_build_object('label', 'GPS vs Tower Delta', 'result', '>800m - FAIL'),
      jsonb_build_object('label', 'Platform Activity', 'result', 'Offline - FAIL'),
      jsonb_build_object('label', 'Accelerometer', 'result', 'Stationary - FAIL')
    ),
    'zoneProbability', jsonb_build_array(
      jsonb_build_object('zone', '1A', 'probability', 24),
      jsonb_build_object('zone', '2B', 'probability', 39),
      jsonb_build_object('zone', '3C', 'probability', 52),
      jsonb_build_object('zone', '4B', 'probability', 85),
      jsonb_build_object('zone', '5A', 'probability', 61),
      jsonb_build_object('zone', '6D', 'probability', 27)
    ),
    'lossRatioTrend', jsonb_build_array(
      jsonb_build_object('week', 'W1', 'ratio', 52),
      jsonb_build_object('week', 'W2', 'ratio', 49),
      jsonb_build_object('week', 'W3', 'ratio', 46),
      jsonb_build_object('week', 'W4', 'ratio', 44),
      jsonb_build_object('week', 'W5', 'ratio', 41),
      jsonb_build_object('week', 'W6', 'ratio', 38)
    )
  );
end;
$$;

create or replace function public._simulate_rain_event()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  target_zone uuid;
  event_id uuid;
  claim_id uuid;
begin
  perform public.require_admin();

  if target_user is null then
    raise exception 'Not authenticated';
  end if;

  select id into target_zone
  from public.zones
  where name ilike 'Velachery%'
  order by id
  limit 1;

  insert into public.disruption_events(zone_id, event_type, severity_level, is_exclusion, started_at)
  values (target_zone, 'SIMULATED_HEAVY_RAIN', 'HIGH', false, now())
  returning id into event_id;

  insert into public.claims (
    worker_id,
    event_id,
    status,
    ml_feat_gps_delta,
    ml_feat_accel_variance,
    ml_feat_activity_status,
    ml_feat_claim_velocity,
    ml_feat_anomaly_score,
    ml_feat_day_of_week,
    ml_feat_hour_of_day,
    ml_feat_zone_id,
    ml_feat_historical_avg_income,
    ml_out_fraud_label,
    ml_out_expected_income_lost,
    final_payout_amount,
    is_emergency_advance,
    created_at
  ) values (
    target_user,
    event_id,
    'auto_approved',
    88,
    1.7,
    1,
    1.0,
    0.16,
    extract(dow from now())::int,
    extract(hour from now())::int,
    4,
    4700,
    0,
    450,
    450,
    true,
    now()
  )
  returning id into claim_id;

  insert into public.prediction_runs(
    worker_id,
    source,
    payload,
    fraud_score,
    status,
    expected_income_lost,
    created_at
  ) values (
    target_user,
    'simulation',
    jsonb_build_object(
      'gps_delta', 88,
      'accel_variance', 1.7,
      'activity_status', 1,
      'claim_velocity', 1,
      'anomaly_score', 0.16,
      'day_of_week', extract(dow from now())::int,
      'hour_of_day', extract(hour from now())::int,
      'zone_id', 4,
      'historical_avg_income', 4700
    ),
    0.14,
    'CLEAR',
    450,
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'claim_id', claim_id,
    'payout_amount', 450,
    'status', 'Auto Approved'
  );
end;
$$;

-- Public RPCs used by the website.
create or replace function public.web_get_worker_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._build_worker_dashboard(auth.uid());
end;
$$;

create or replace function public.web_get_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._build_admin_dashboard();
end;
$$;

create or replace function public.web_simulate_rain_event()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._simulate_rain_event();
end;
$$;

-- Make sure auth-backed users can see their own data; admins can see all.
alter table public.workers enable row level security;
alter table public.policies enable row level security;
alter table public.claims enable row level security;
alter table public.prediction_runs enable row level security;
alter table public.user_roles enable row level security;
alter table public.decision_timeline enable row level security;

drop policy if exists workers_self on public.workers;
create policy workers_self on public.workers
for select to authenticated
using (id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists workers_self_update on public.workers;
create policy workers_self_update on public.workers
for update to authenticated
using (id = auth.uid() or public.is_admin_user(auth.uid()))
with check (id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists policies_self on public.policies;
create policy policies_self on public.policies
for select to authenticated
using (worker_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists claims_self on public.claims;
create policy claims_self on public.claims
for select to authenticated
using (worker_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists prediction_runs_self on public.prediction_runs;
create policy prediction_runs_self on public.prediction_runs
for select to authenticated
using (worker_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists user_roles_self on public.user_roles;
create policy user_roles_self on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists decision_timeline_self on public.decision_timeline;
create policy decision_timeline_self on public.decision_timeline
for select to authenticated
using (actor_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists decision_timeline_insert_self on public.decision_timeline;
create policy decision_timeline_insert_self on public.decision_timeline
for insert to authenticated
with check (actor_id = auth.uid() or public.is_admin_user(auth.uid()));

grant execute on function public.is_admin_user(uuid) to authenticated;
grant execute on function public.require_admin() to authenticated;
grant execute on function public.web_log_decision_event(text, jsonb) to authenticated;
grant execute on function public.web_get_decision_timeline(int) to authenticated;
grant execute on function public.web_get_worker_settings() to authenticated;
grant execute on function public.web_update_worker_settings(text, text, text, text, text, numeric) to authenticated;
grant execute on function public.web_list_workers_for_admin() to authenticated;
grant execute on function public.web_admin_add_test_funds(uuid, numeric, text) to authenticated;
grant execute on function public.run_prediction(jsonb, text) to authenticated;
grant execute on function public.web_predict_claim(jsonb, text) to authenticated;
grant execute on function public.web_get_worker_dashboard() to authenticated;
grant execute on function public.web_get_admin_dashboard() to authenticated;
grant execute on function public.web_simulate_rain_event() to authenticated;
grant execute on function public.seed_round3_demo(uuid) to authenticated;

-- Mark an admin user manually after signup:
-- update public.user_roles set role = 'admin' where user_id = 'YOUR_AUTH_USER_UUID';

