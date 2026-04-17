"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassCard, GlassHero, MetricCard, PageFrame, PageShell, Pill, TopLinks } from '@/components/design-system'
import {
  adminMetrics,
  adminPayoutQueue,
  adminPredictionSnapshots,
  adminReviewQueue,
  adminSystemHealth,
  adminWorkerRegistry,
  fraudSignals,
  lossRatioTrend,
  pipelineClaims,
  workerSummary,
  zoneProbability,
} from '@/lib/demo-data'
import { requireSupabase } from '@/lib/supabase'
import { createScenario, predictClaim } from '@/lib/prediction'
import { AdminDashboardData, AdminWorkerAccount, DecisionTimelineEntry } from '@/lib/types'
import type { PredictionResult } from '@/lib/types'

type ToastState = { title: string; subtitle: string } | null

const initialClaims = pipelineClaims

const scenarioButtons = [
  { key: 'baseline', label: 'Baseline' },
  { key: 'storm', label: 'Storm' },
  { key: 'fraud', label: 'Fraud test' },
] as const

export default function AdminPage() {
  const router = useRouter()
  const [claims, setClaims] = useState(initialClaims)
  const [claimsThisWeek, setClaimsThisWeek] = useState(34)
  const [toast, setToast] = useState<ToastState>(null)
  const [payoutState, setPayoutState] = useState<'idle' | 'processing' | 'credited'>('idle')
  const [liveData, setLiveData] = useState<AdminDashboardData | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [predictionBusy, setPredictionBusy] = useState(false)
  const [timeline, setTimeline] = useState<DecisionTimelineEntry[]>([])
  const [workerAccounts, setWorkerAccounts] = useState<AdminWorkerAccount[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [fundAmount, setFundAmount] = useState('250')
  const [fundNote, setFundNote] = useState('Manual test top-up')
  const [funding, setFunding] = useState(false)

  const fetchTimeline = async () => {
    const client = requireSupabase()
    const { data: timelinePayload } = await client.rpc('web_get_decision_timeline', { p_limit: 16 })
    if (Array.isArray(timelinePayload)) {
      setTimeline(timelinePayload as DecisionTimelineEntry[])
    }
  }

  const fetchWorkerAccounts = async () => {
    const client = requireSupabase()
    const { data: workersPayload } = await client.rpc('web_list_workers_for_admin')
    if (Array.isArray(workersPayload)) {
      const typed = workersPayload as AdminWorkerAccount[]
      setWorkerAccounts(typed)
        setSelectedWorkerId((current) => (current || typed[0]?.worker_id || ''))
    }
  }

  useEffect(() => {
    const client = requireSupabase()
    client.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }

      const { data: roleResult } = await client.rpc('is_admin_user')
      if (!roleResult) {
        setAccessDenied(true)
        router.replace('/worker')
        return
      }

      const { data: payload } = await client.rpc('web_get_admin_dashboard')
      if (payload && typeof payload === 'object') {
        const typed = payload as AdminDashboardData
        setLiveData(typed)
        if (typed.claimsPipeline?.length) {
          setClaims(typed.claimsPipeline)
        }
      }

      await fetchTimeline()
      await fetchWorkerAccounts()
    })
  }, [router])

  const metrics = useMemo(
    () => {
      const base = liveData?.metrics?.length ? liveData.metrics : adminMetrics
      return base.map((metric) =>
        metric.label === 'Claims This Week' ? { ...metric, value: String(claimsThisWeek) } : metric,
      )
    },
    [claimsThisWeek, liveData],
  )

  const chartZoneProbability = liveData?.zoneProbability?.length ? liveData.zoneProbability : zoneProbability
  const chartLossRatio = liveData?.lossRatioTrend?.length ? liveData.lossRatioTrend : lossRatioTrend
  const panelSignals = liveData?.fraudSignals?.length ? liveData.fraudSignals : fraudSignals
  const reviewQueue = liveData?.reviewQueue?.length ? liveData.reviewQueue : adminReviewQueue
  const systemHealth = liveData?.systemHealth?.length ? liveData.systemHealth : adminSystemHealth
  const payoutQueue = liveData?.payoutQueue?.length ? liveData.payoutQueue : adminPayoutQueue
  const workerRegistry = liveData?.workerRegistry?.length ? liveData.workerRegistry : adminWorkerRegistry
  const predictionSnapshots = liveData?.predictionSnapshots?.length ? liveData.predictionSnapshots : adminPredictionSnapshots

  const runPrediction = async (kind: 'baseline' | 'storm' | 'fraud') => {
    setPredictionBusy(true)
    try {
      const result = await predictClaim(createScenario(kind), 'web')
      setPrediction(result)
    } finally {
      setPredictionBusy(false)
    }
  }

  const triggerSimulation = () => {
    setToast({
      title: 'Triggering rain event in Zone 4B — Velachery',
      subtitle: 'Simulation queued for automatic claim approval.',
    })
    setPayoutState('idle')

    window.setTimeout(() => {
      const client = requireSupabase()
      setClaims((current) => [
        {
          workerId: 'WRK-1248',
          zone: 'Zone 4B',
          triggerType: 'Simulated Heavy Rain',
          confidenceScore: '94%',
          status: 'Auto Approved',
          payoutAmount: '₹450',
        },
        ...current,
      ])
      setClaimsThisWeek((current) => current + 1)

      void client.rpc('web_simulate_rain_event')
      void predictClaim(createScenario('storm'), 'web').then((result) => setPrediction(result))

      setToast({
        title: 'Auto claim approved',
        subtitle: 'UPI payout initiated for ₹450.',
      })
      setPayoutState('processing')

      window.setTimeout(() => {
        setPayoutState('credited')
      }, 3000)
    }, 2000)
  }

  const addTestFunds = async () => {
    if (!selectedWorkerId || !Number.isFinite(Number(fundAmount)) || Number(fundAmount) <= 0) {
      setToast({
        title: 'Invalid fund request',
        subtitle: 'Pick a worker and enter a positive amount.',
      })
      return
    }

    setFunding(true)
    try {
      const client = requireSupabase()
      const { error } = await client.rpc('web_admin_add_test_funds', {
        p_worker_id: selectedWorkerId,
        p_amount: Number(fundAmount),
        p_note: fundNote,
      })

      if (error) {
        setToast({ title: 'Fund action failed', subtitle: error.message })
      } else {
        setToast({
          title: 'Funds added for testing',
          subtitle: `₹${Number(fundAmount).toLocaleString('en-IN')} credited to worker balance.`,
        })
        await fetchWorkerAccounts()
        await fetchTimeline()
      }
    } finally {
      setFunding(false)
    }
  }

  return (
    <PageShell>
      <PageFrame>
        {accessDenied ? (
          <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
            <div className="glass-panel panel-lift rounded-[34px] p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-200">Restricted area</p>
              <h1 className="mt-3 font-[var(--font-display)] text-4xl tracking-tight text-white">Admin access required</h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                This command center only opens for admin accounts. The backend also enforces this rule at the database layer.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.replace('/worker')}
                  className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Go to worker portal
                </button>
                <button
                  type="button"
                  onClick={() => router.replace('/auth')}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm transition hover:border-white/25 hover:bg-white/10"
                >
                  Sign in again
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!accessDenied ? (
          <>
            <GlassHero>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-[var(--font-display)] text-3xl tracking-tight">Locus Insurer Console</p>
                  <p className="mt-1 text-sm text-slate-300">Claims, fraud review, prediction scoring, and payout orchestration.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <TopLinks />
                  <button
                    type="button"
                    onClick={triggerSimulation}
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
                  >
                    Simulate Rain Event
                  </button>
                </div>
              </div>
            </GlassHero>

            {toast ? (
              <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50 shadow-glow">
                <div className="font-semibold">{toast.title}</div>
                <div className="text-cyan-100/80">{toast.subtitle}</div>
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <GlassCard title="Live Disruption Map">
                <div className="relative min-h-[250px] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6">
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute left-10 top-12 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="absolute bottom-12 right-8 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Zone 4B — Velachery</p>
                      <h3 className="mt-2 font-[var(--font-display)] text-3xl">FLOOD ALERT ACTIVE</h3>
                    </div>
                    <div className="relative mt-10 h-28 w-28 rounded-full border border-rose-400/35 bg-rose-500/10">
                      <div className="absolute inset-8 animate-pulse rounded-full bg-rose-500 shadow-[0_0_35px_rgba(233,69,96,0.7)]" />
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title="Prediction Engine">
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Use the same payload as the mobile app. The web client will call Supabase first and fall back to the API when needed.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {scenarioButtons.map((button) => (
                      <button
                        key={button.key}
                        type="button"
                        onClick={() => runPrediction(button.key)}
                        disabled={predictionBusy}
                        className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniStat label="GPS delta" value="50m" />
                    <MiniStat label="Claim velocity" value="2" />
                    <MiniStat label="Zone" value="3" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Latest output</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {prediction ? prediction.status : predictionBusy ? 'Computing...' : 'Run a scenario'}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      Fraud score {prediction ? prediction.fraud_score.toFixed(3) : '0.000'} · Expected income lost ₹
                      {prediction ? prediction.expected_income_lost.toLocaleString('en-IN') : '0.00'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <GlassCard title="Health & Controls">
                <div className="grid gap-3">
                  {systemHealth.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                      <span className="text-slate-300">{item.label}</span>
                      <Pill tone={item.tone === 'rose' ? 'red' : item.tone === 'amber' ? 'amber' : 'green'}>{item.value}</Pill>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Fraud Detection">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-rose-200">Flagged claim</div>
                    <div className="mt-2 text-lg font-semibold text-white">GPS SPOOF DETECTED</div>
                    <div className="mt-1 text-sm text-rose-100">Confidence Score 22% · Hard Flag — Fraud Review</div>
                  </div>
                  {panelSignals.map((signal) => (
                    <div key={signal.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                      <span>{signal.label}</span>
                      <span className="font-semibold text-rose-200">{signal.result}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>

            <GlassCard title="Claims Pipeline">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-medium">Worker ID</th>
                      <th className="px-4 py-3 font-medium">Zone</th>
                      <th className="px-4 py-3 font-medium">Trigger Type</th>
                      <th className="px-4 py-3 font-medium">Confidence</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={`${claim.workerId}-${claim.zone}-${claim.triggerType}`} className="border-t border-white/8 bg-slate-950/20">
                        <td className="px-4 py-3">{claim.workerId}</td>
                        <td className="px-4 py-3">{claim.zone}</td>
                        <td className={`px-4 py-3 ${claim.triggerType.includes('GPS') ? 'font-semibold text-rose-300' : ''}`}>
                          {claim.triggerType}
                        </td>
                        <td className="px-4 py-3">{claim.confidenceScore}</td>
                        <td className="px-4 py-3">{claim.status}</td>
                        <td className="px-4 py-3">{claim.payoutAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <section className="grid gap-6 xl:grid-cols-3">
              <GlassCard title="Review Queue">
                <div className="space-y-3">
                  {reviewQueue.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-cyan-200">{item.status}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Payout Queue">
                <div className="space-y-3">
                  {payoutQueue.map((item) => (
                    <div key={item.title} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.status}</p>
                      </div>
                      <p className="text-lg font-semibold text-emerald-300">{item.amount}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Worker Registry">
                <div className="space-y-3">
                  {workerRegistry.map((item) => (
                    <div key={item.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {item.zone} · Risk {item.risk}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Test Funds Panel">
                <div className="space-y-3 text-sm text-slate-300">
                  <p>Admin can add testing credits to worker accounts. Changes are persisted in Supabase immediately.</p>

                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Worker account</span>
                    <select
                      value={selectedWorkerId}
                      onChange={(event) => setSelectedWorkerId(event.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white"
                    >
                      {workerAccounts.map((account) => (
                        <option key={account.worker_id} value={account.worker_id}>
                          {account.full_name} · ₹{Number(account.active_credit_balance).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Amount (₹)</span>
                    <input
                      type="number"
                      min="1"
                      value={fundAmount}
                      onChange={(event) => setFundAmount(event.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Note</span>
                    <input
                      type="text"
                      value={fundNote}
                      onChange={(event) => setFundNote(event.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-white"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={addTestFunds}
                    disabled={funding}
                    className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {funding ? 'Crediting...' : 'Add Test Funds'}
                  </button>
                </div>
              </GlassCard>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <GlassCard title="Predictive Analytics">
                <div className="h-[320px] rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartZoneProbability}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="zone" stroke="#cbd5e1" />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 16,
                        }}
                        cursor={{ fill: 'rgba(0, 180, 216, 0.08)' }}
                      />
                      <Bar dataKey="probability" radius={[12, 12, 0, 0]} fill="#00b4d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard title="Loss Ratio Trend">
                <div className="h-[320px] rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartLossRatio}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="week" stroke="#cbd5e1" />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 16,
                        }}
                        formatter={(value) => [`${value}%`, 'Loss Ratio']}
                      />
                      <Line type="monotone" dataKey="ratio" stroke="#e94560" strokeWidth={4} dot={{ r: 4, fill: '#e94560' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            <section className="grid gap-6 xl:grid-cols-3">
              <GlassCard title="Prediction Snapshots">
                <div className="space-y-3">
                  {predictionSnapshots.map((item) => (
                    <div key={item.title} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-400">Status {item.status}</p>
                      </div>
                      <p className="font-semibold text-cyan-200">{item.score}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Decision Timeline">
                <div className="space-y-3">
                  {(timeline.length ? timeline : []).slice(0, 6).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{entry.event_name}</p>
                        <Pill tone={entry.actor_role === 'admin' ? 'amber' : entry.actor_role === 'worker' ? 'green' : 'neutral'}>
                          {entry.actor_role}
                        </Pill>
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{new Date(entry.created_at).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                  {timeline.length === 0 ? <p className="text-sm text-slate-300">No events yet. Run a simulation to populate this timeline.</p> : null}
                </div>
              </GlassCard>

              <GlassCard title="Control Room">
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">Run a live scenario and immediately store the prediction output in the shared backend.</p>
                  <div className="flex flex-wrap gap-3">
                    {scenarioButtons.map((button) => (
                      <button
                        key={button.key}
                        type="button"
                        onClick={() => runPrediction(button.key)}
                        disabled={predictionBusy}
                        className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Latest output</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {prediction ? prediction.status : predictionBusy ? 'Computing...' : 'Run a scenario'}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      Fraud score {prediction ? prediction.fraud_score.toFixed(3) : '0.000'} · Expected loss ₹
                      {prediction ? prediction.expected_income_lost.toLocaleString('en-IN') : '0.00'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title="Operations Notes">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    Use the database-backed fake payout flow for demos. No Razorpay keys or secrets are embedded here.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    The same Supabase data source powers mobile worker screens and web control-room reports.
                  </div>
                </div>
              </GlassCard>
            </section>

            {payoutState !== 'idle' ? (
              <GlassCard title="UPI Payout Initiated">
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Worker UPI handle</p>
                    <p className="mt-2 text-xl font-semibold text-white">{workerSummary.upiHandle}</p>
                    <p className="mt-4 text-sm text-slate-300">Amount</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-300">₹450</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Transaction ID</p>
                    <p className="mt-2 font-mono text-sm text-cyan-100">UPI/LOCUS/26/0417/884201</p>
                    <p className="mt-4 text-sm text-slate-300">Status</p>
                    <p className="mt-2 text-lg font-semibold text-white">{payoutState === 'processing' ? 'Processing → Credited' : 'Credited'}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-rose-500 ${payoutState === 'processing' ? 'animate-pulse' : ''}`}
                        style={{ width: payoutState === 'processing' ? '55%' : '100%', transition: 'width 1s ease' }}
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </PageFrame>
    </PageShell>
  )
}

function MiniStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
