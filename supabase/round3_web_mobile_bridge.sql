-- Locus Round 3: Mobile + Web data bridge
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Keep one active policy row per worker for simpler app/web reads.
create unique index if not exists policies_active_worker_idx
  on public.policies(worker_id)
  where is_active = true;

-- Ensure every auth user gets a workers row.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workers (id, full_name, kyc_status, trust_tier, active_credit_balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'verified',
    3,
    1200
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, workers.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Seed helper used by web and mobile.
create or replace function public.seed_round3_demo(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := coalesce(p_user_id, auth.uid());
  velachery_zone uuid;
  event_id uuid;
begin
  if target_user is null then
    raise exception 'No authenticated user';
  end if;

  insert into public.zones(name, pincode, base_risk_multiplier, ml_zone_id)
  values
    ('Velachery', '600042', 1.35, 4),
    ('Adyar', '600020', 1.12, 2),
    ('Guindy', '600032', 1.08, 3)
  on conflict (ml_zone_id) do nothing;

  select id into velachery_zone
  from public.zones
  where name ilike 'Velachery%'
  order by id
  limit 1;

  insert into public.workers (id, full_name, kyc_status, trust_tier, active_credit_balance, current_zone_id, historical_avg_income, historical_anomaly_score)
  values (
    target_user,
    'Arjun K.',
    'verified',
    3,
    4700,
    velachery_zone,
    4700,
    0.13
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    kyc_status = excluded.kyc_status,
    trust_tier = excluded.trust_tier,
    active_credit_balance = greatest(workers.active_credit_balance, excluded.active_credit_balance),
    current_zone_id = coalesce(excluded.current_zone_id, workers.current_zone_id),
    historical_avg_income = excluded.historical_avg_income,
    historical_anomaly_score = excluded.historical_anomaly_score;

  update public.policies
  set is_active = false
  where worker_id = target_user
    and is_active = true;

  insert into public.policies (
    worker_id,
    valid_from,
    valid_to,
    weekly_premium,
    layer_1_max_limit,
    layer_2_max_limit,
    is_active
  )
  values (
    target_user,
    date_trunc('week', now()),
    date_trunc('week', now()) + interval '6 days 23 hours 59 minutes',
    60,
    2500,
    7500,
    true
  );

  insert into public.disruption_events(zone_id, event_type, severity_level, is_exclusion, started_at)
  values (velachery_zone, 'HEAVY_RAIN', 'HIGH', false, now() - interval '4 hours')
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
  )
  select
    target_user,
    event_id,
    x.status,
    x.gps_delta,
    x.accel_var,
    x.activity_status,
    x.claim_velocity,
    x.anomaly,
    extract(dow from x.ts)::int,
    extract(hour from x.ts)::int,
    4,
    4700,
    x.fraud_label,
    x.expected_loss,
    x.payout,
    x.is_advance,
    x.ts
  from (
    values
      ('paid'::text, 90::numeric, 1.9::numeric, 1::int, 1.0::numeric, 0.18::numeric, 0::int, 450::numeric, 450::numeric, true, now() - interval '5 days'),
      ('paid'::text, 110::numeric, 2.3::numeric, 1::int, 1.2::numeric, 0.22::numeric, 0::int, 600::numeric, 600::numeric, false, now() - interval '3 days'),
      ('soft_flagged'::text, 340::numeric, 4.1::numeric, 0::int, 2.4::numeric, 0.71::numeric, 1::int, 180::numeric, 180::numeric, false, now() - interval '1 day')
  ) as x(status, gps_delta, accel_var, activity_status, claim_velocity, anomaly, fraud_label, expected_loss, payout, is_advance, ts)
  where not exists (
    select 1 from public.claims c where c.worker_id = target_user
  );

  insert into public.prediction_runs(worker_id, source, payload, fraud_score, status, expected_income_lost)
  select
    target_user,
    'seed',
    jsonb_build_object(
      'gps_delta', p.gps_delta,
      'accel_variance', p.accel_var,
      'activity_status', p.activity_status,
      'claim_velocity', p.claim_velocity,
      'anomaly_score', p.anomaly,
      'day_of_week', extract(dow from now())::int,
      'hour_of_day', extract(hour from now())::int,
      'zone_id', 4,
      'historical_avg_income', 4700
    ),
    p.score,
    p.status,
    p.expected_loss
  from (
    values
      (76::numeric, 2.8::numeric, 1::int, 2.0::numeric, 0.43::numeric, 0.37::numeric, 'SOFT_FLAG'::text, 420::numeric),
      (84::numeric, 3.5::numeric, 1::int, 3.0::numeric, 0.62::numeric, 0.56::numeric, 'HARD_FLAG'::text, 760::numeric)
  ) as p(gps_delta, accel_var, activity_status, claim_velocity, anomaly, score, status, expected_loss)
  where not exists (
    select 1 from public.prediction_runs pr where pr.worker_id = target_user
  );

  return jsonb_build_object('ok', true, 'worker_id', target_user);
end;
$$;

create or replace function public.web_get_worker_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  worker_row record;
  policy_row record;
  protected_week numeric := 0;
  repaid_month numeric := 0;
  history jsonb := '[]'::jsonb;
begin
  if target_user is null then
    raise exception 'Not authenticated';
  end if;

  perform public.seed_round3_demo(target_user);

  select
    w.full_name,
    coalesce(w.active_credit_balance, 0) as credit_balance,
    coalesce(w.historical_avg_income, 4700) as avg_income
  into worker_row
  from public.workers w
  where w.id = target_user
  limit 1;

  select
    coalesce(p.weekly_premium, 60) as weekly_premium,
    p.valid_from,
    p.valid_to
  into policy_row
  from public.policies p
  where p.worker_id = target_user and p.is_active = true
  order by p.valid_from desc
  limit 1;

  select coalesce(sum(c.final_payout_amount), 0)
  into protected_week
  from public.claims c
  where c.worker_id = target_user
    and c.created_at >= date_trunc('week', now());

  select coalesce(sum(least(c.final_payout_amount, 60)), 0)
  into repaid_month
  from public.claims c
  where c.worker_id = target_user
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
    select * from public.claims where worker_id = target_user order by created_at desc limit 5
  ) c
  left join public.disruption_events e on e.id = c.event_id;

  return jsonb_build_object(
    'workerName', coalesce(worker_row.full_name, 'Arjun K.'),
    'badge', 'Weekly Shield - Active',
    'averageEarnings', coalesce(worker_row.avg_income, 4700),
    'protectedThisWeek', protected_week,
    'planTier', 'Standard',
    'premiumPaid', coalesce(policy_row.weekly_premium, 60),
    'coverageWindow', concat(to_char(coalesce(policy_row.valid_from, now()), 'Dy'), '-', to_char(coalesce(policy_row.valid_to, now() + interval '6 day'), 'Dy')),
    'location', 'Velachery, Chennai',
    'weatherTrigger', 'HEAVY RAIN',
    'weatherRate', '>15mm/hr',
    'statusLabel', 'TRIGGER ACTIVE - Claim Initiated Automatically',
    'creditBalance', coalesce(worker_row.credit_balance, 340),
    'repaidThisMonth', repaid_month,
    'banner', 'Rain disruption detected in your zone. Rs 450 credit advance initiated. No action needed.',
    'upiHandle', 'arjun.k@upi',
    'payoutHistory', history
  );
end;
$$;

create or replace function public.web_get_admin_dashboard()
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

create or replace function public.web_simulate_rain_event()
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
  if target_user is null then
    raise exception 'Not authenticated';
  end if;

  perform public.seed_round3_demo(target_user);

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

grant execute on function public.seed_round3_demo(uuid) to authenticated;
grant execute on function public.web_get_worker_dashboard() to authenticated;
grant execute on function public.web_get_admin_dashboard() to authenticated;
grant execute on function public.web_simulate_rain_event() to authenticated;
