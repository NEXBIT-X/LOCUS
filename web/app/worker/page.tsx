"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GlassCard, GlassHero, PageFrame, PageShell, Pill, TopLinks } from '@/components/design-system'
import {
  payoutHistory,
  workerCoverageTimeline,
  workerIncidentFeed,
  workerPolicyHighlights,
  workerQuickActions,
  workerRiskSnapshot,
  workerSummary,
  workerSupportCards,
  workerTrend,
  weatherTimeline,
} from '@/lib/demo-data'
import { requireSupabase } from '@/lib/supabase'
import { createScenario, predictClaim } from '@/lib/prediction'
import { DecisionTimelineEntry, PredictionResult, WorkerDashboardData } from '@/lib/types'

const scenarioButtons = [
  { key: 'baseline', label: 'Baseline' },
  { key: 'storm', label: 'Storm' },
  { key: 'fraud', label: 'Fraud test' },
] as const

export default function WorkerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState<WorkerDashboardData | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [predictionBusy, setPredictionBusy] = useState(false)
  const [timeline, setTimeline] = useState<DecisionTimelineEntry[]>([])

  const fetchWorkerSurface = async () => {
    const client = requireSupabase()
    const { data: payload } = await client.rpc('web_get_worker_dashboard')
    if (payload && typeof payload === 'object') {
      setLive(payload as WorkerDashboardData)
    }

    const { data: timelinePayload } = await client.rpc('web_get_decision_timeline', { p_limit: 8 })
    if (Array.isArray(timelinePayload)) {
      setTimeline(timelinePayload as DecisionTimelineEntry[])
    }
  }

  useEffect(() => {
    const client = requireSupabase()
    let intervalRef: ReturnType<typeof setInterval> | null = null

    client.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }

      await fetchWorkerSurface()

      intervalRef = setInterval(() => {
        void fetchWorkerSurface()
      }, 15000)

      setLoading(false)
    })

    return () => {
      if (intervalRef) {
        clearInterval(intervalRef)
      }
    }
  }, [router])

  const ui = useMemo(() => {
    if (!live) {
      return {
        workerName: workerSummary.workerName,
        badge: workerSummary.badge,
        averageEarnings: Number(workerSummary.averageEarnings.replace(/[^0-9]/g, '')),
        protectedThisWeek: Number(workerSummary.protectedThisWeek.replace(/[^0-9]/g, '')),
        planTier: workerSummary.planTier,
        premiumPaid: Number(workerSummary.premiumPaid.replace(/[^0-9]/g, '')),
        coverageWindow: workerSummary.coverageWindow,
        location: workerSummary.location,
        weatherTrigger: workerSummary.weatherTrigger,
        weatherRate: workerSummary.weatherRate,
        statusLabel: workerSummary.statusLabel,
        creditBalance: Number(workerSummary.creditBalance.replace(/[^0-9]/g, '')),
        repaidThisMonth: Number(workerSummary.repaidThisMonth.replace(/[^0-9]/g, '')),
        banner: workerSummary.banner,
        payoutHistory: payoutHistory.map((item) => ({
          date: item.date,
          disruptionType: item.disruptionType,
          amount: Number(item.amount.replace(/[^0-9]/g, '')),
          status: item.status,
        })),
        incidentFeed: workerIncidentFeed,
        policyHighlights: workerPolicyHighlights,
        supportCards: workerSupportCards,
        coverageTimeline: workerCoverageTimeline,
        quickActions: workerQuickActions,
        riskSnapshot: workerRiskSnapshot,
      }
    }

    return live
  }, [live])

  const runPrediction = async (kind: 'baseline' | 'storm' | 'fraud') => {
    setPredictionBusy(true)
    try {
      const result = await predictClaim(createScenario(kind), 'web')
      setPrediction(result)
    } finally {
      setPredictionBusy(false)
    }
  }

  return (
    <PageShell>
      <PageFrame>
        <GlassHero className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-[var(--font-display)] text-3xl tracking-tight">Locus Worker Portal</p>
            <p className="mt-1 text-sm text-slate-300">Coverage, payouts, prediction runs, and incident response in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TopLinks />
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90">
              {ui.workerName}
            </div>
            <Pill tone="green">{ui.badge}</Pill>
          </div>
        </GlassHero>

        <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-r from-amber-400/20 via-orange-400/15 to-rose-500/20 p-4 text-sm text-amber-50 shadow-glow">
          {loading ? 'Loading dashboard...' : ui.banner}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <GlassCard title="Coverage Snapshot" className="overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-slate-300">Average weekly earnings</p>
                <p className="mt-2 font-[var(--font-display)] text-5xl tracking-tight">₹{ui.averageEarnings.toLocaleString('en-IN')}</p>
                <p className="mt-2 text-sm text-slate-300">Protected this week: ₹{ui.protectedThisWeek.toLocaleString('en-IN')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Plan tier" value={ui.planTier} />
                <Stat label="Premium paid" value={`₹${ui.premiumPaid.toLocaleString('en-IN')}`} />
                <Stat label="Coverage window" value={ui.coverageWindow} />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Live Incident">
            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/35 p-5">
              <div className="absolute inset-0 text-grid opacity-20" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">{ui.location}</p>
                  <h3 className="mt-1 font-[var(--font-display)] text-2xl text-white">{ui.weatherTrigger}</h3>
                  <p className="mt-2 text-sm text-cyan-200">Rain intensity {ui.weatherRate}</p>
                </div>
                <div className="h-20 w-20 rounded-full border border-rose-400/40 bg-rose-500/15 shadow-[0_0_40px_rgba(233,69,96,0.45)] animate-soft-pulse" />
              </div>
              <div className="relative mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100">
                {ui.statusLabel}
              </div>
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <GlassCard title="Risk Snapshot">
            <div className="space-y-3">
              {ui.riskSnapshot?.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Support & Access">
            <div className="grid gap-3">
              {ui.supportCards?.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Current Coverage Rules">
            <div className="grid gap-3">
              {ui.policyHighlights?.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlassCard title="Prediction Lab">
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Run the same prediction payload against Supabase and the live API. The dashboard keeps the result visible for review.
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
                <MiniStat label="Activity" value="Working" />
                <MiniStat label="Zone" value="3" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Prediction result</div>
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

          <GlassCard title="Coverage Timeline">
            <div className="space-y-3">
              {ui.coverageTimeline?.map((step, index) => (
                <div key={step.stage} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{step.stage}</p>
                    <p className="text-xs text-slate-300">{step.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlassCard title="Weekly Trend">
            <div className="h-[320px] rounded-2xl border border-white/10 bg-slate-950/25 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workerTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="hour" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 16,
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#4ade80" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard title="Weather Timeline">
            <div className="space-y-3">
              {weatherTimeline.map((item) => (
                <div key={item.time} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-300">{item.time}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <GlassCard title="Recent Payouts">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Disruption</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ui.payoutHistory.map((entry) => (
                  <tr key={`${entry.date}-${entry.disruptionType}`} className="border-t border-white/8 bg-slate-950/25">
                    <td className="px-4 py-3">{entry.date}</td>
                    <td className="px-4 py-3">{entry.disruptionType}</td>
                    <td className="px-4 py-3">₹{entry.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <Pill tone={String(entry.status).toLowerCase().includes('flag') ? 'red' : 'green'}>{entry.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard title="Emergency Actions">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workerQuickActions.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-[var(--font-display)] text-lg tracking-tight">{item.label}</p>
                <p className="mt-1 text-sm text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Decision Timeline">
          <div className="grid gap-3">
            {(timeline.length ? timeline : []).slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{entry.event_name}</p>
                  <Pill tone={entry.actor_role === 'worker' ? 'green' : 'neutral'}>{entry.actor_role}</Pill>
                </div>
                <p className="mt-1 text-xs text-slate-300">{new Date(entry.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
            {timeline.length === 0 ? <p className="text-sm text-slate-300">No timeline events yet. Run a prediction to generate one.</p> : null}
          </div>
        </GlassCard>
      </PageFrame>
    </PageShell>
  )
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
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