import Link from 'next/link'
import { adminMetrics, workerPolicyHighlights, workerQuickActions, workerSupportCards } from '@/lib/demo-data'

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="aurora aurora-a left-[-120px] top-[-80px] h-[360px] w-[360px]" />
      <div className="aurora aurora-b right-[-80px] top-[80px] h-[320px] w-[320px]" />
      <div className="aurora aurora-c bottom-[-120px] left-[28%] h-[320px] w-[320px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="glass-panel panel-lift flex flex-col gap-4 rounded-[30px] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl tracking-tight">LOCUS</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/auth" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:border-cyan-300/50 hover:bg-cyan-400/15">
              Sign In
            </Link>
            <Link href="/worker" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Open Worker Portal
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel panel-lift rounded-[36px] p-7 shadow-glow animate-fade-up">
            <div className="flex flex-wrap items-center gap-3">
              
            </div>
            <h1 className="mt-5 max-w-2xl font-[var(--font-display)] text-5xl leading-[1.02] tracking-tight sm:text-6xl">
              Fast, calm protection for gig workers when the weather turns.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200/85">
              Locus ties together worker identity, policy coverage, instant prediction scoring, and simulated payouts so the
              mobile app and website behave like one operational system. The design stays simple, but the flow feels complete.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/worker" className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold transition hover:bg-rose-400">
                Worker dashboard
              </Link>
              <Link href="/admin" className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                Insurer dashboard
              </Link>
              <Link href="/auth" className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm transition hover:border-white/25 hover:bg-white/10">
                Email sign in
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {adminMetrics.map((metric) => (
                <div key={metric.label} className="panel-lift rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{metric.label}</p>
                  <p className="mt-2 font-[var(--font-display)] text-2xl">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel panel-lift rounded-[34px] p-6 animate-fade-up" style={{ animationDelay: '90ms' }}>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">How it works</p>
              <div className="mt-5 space-y-4">
                <Feature title="1. Worker signal" description="App telemetry and weather conditions establish a live incident context." />
                <Feature title="2. Prediction engine" description="Supabase stores the score instantly and can also call the API for fraud and loss estimates." />
                <Feature title="3. Payout simulation" description="The database creates the claim, payout, and review trail used by both web and mobile." />
              </div>
            </div>

            <div className="glass-panel panel-lift rounded-[34px] p-6 animate-fade-up" style={{ animationDelay: '160ms' }}>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Product modules</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {workerQuickActions.map((item) => (
                  <MiniCard key={item.label} title={item.label} description={item.description} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel panel-lift rounded-[34px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Coverage</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight">Built for serious disruptions</h2>
            <div className="mt-5 space-y-3">
              {workerPolicyHighlights.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel panel-lift rounded-[34px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Support & access</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight">Everything the worker needs is close by</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {workerSupportCards.map((item) => (
                <MiniCard key={item.label} title={item.label} description={item.value} />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <GlassBlock title="Live data model" body="One worker identity, one active policy, one claim pipeline, shared by both mobile and web." />
          <GlassBlock title="Prediction service" body="The prediction API is available directly and through Supabase RPC for instant scoring." />
          <GlassBlock title="Deployment ready" body="Built for Vercel, Supabase, and clean route-based auth with a modern product shell." />
        </section>

        <section className="glass-panel panel-lift rounded-[34px] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Finals Foundation</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl tracking-tight">What makes this submission hard to clone</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MiniCard title="Decision traceability" description="Every prediction and simulation can be logged and reviewed in a timeline for evaluator trust." />
            <MiniCard title="Resilience by design" description="RPC-first prediction flow with API fallback and deterministic backup scoring for demo reliability." />
            <MiniCard title="Opinionated scope" description="Focused on gig-worker disruption protection, not generic insurtech templates or copied flowcharts." />
          </div>
        </section>

        <footer className="pb-2 text-center text-sm text-slate-300/80">
          Simulated insurance for gig workers, with a calm interface and real operational depth.
        </footer>
      </div>
    </main>
  )
}

function Feature({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="panel-lift rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="font-[var(--font-display)] text-lg tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
    </div>
  )
}

function MiniCard({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="panel-lift rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <p className="font-[var(--font-display)] text-base tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
    </div>
  )
}

function GlassBlock({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="glass-panel panel-lift rounded-[30px] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Feature</p>
      <h3 className="mt-3 font-[var(--font-display)] text-2xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  )
}
