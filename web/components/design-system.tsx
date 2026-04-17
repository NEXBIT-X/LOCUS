import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageShell({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">{children}</main>
}

export function PageFrame({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="relative mx-auto max-w-7xl space-y-6">{children}</div>
}

export function GlassCard({
  title,
  children,
  className = '',
}: Readonly<{
  title?: string
  children: ReactNode
  className?: string
}>) {
  return (
    <section className={`glass-panel panel-lift rounded-[28px] p-5 shadow-glow ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl tracking-tight text-white">{title}</h2>
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function GlassHero({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <header className={`glass-panel panel-lift rounded-[32px] p-5 shadow-glow ${className}`}>{children}</header>
}

export function Pill({
  children,
  tone = 'blue',
}: Readonly<{ children: ReactNode; tone?: 'blue' | 'green' | 'red' | 'neutral' | 'amber' | 'rose' }>) {
  const toneClasses = {
    blue: 'border-cyan-400/40 bg-cyan-400/12 text-cyan-200',
    green: 'border-emerald-400/40 bg-emerald-400/12 text-emerald-200',
    red: 'border-rose-400/40 bg-rose-400/12 text-rose-200',
    neutral: 'border-white/15 bg-white/8 text-slate-100',
    amber: 'border-amber-400/40 bg-amber-400/12 text-amber-100',
    rose: 'border-rose-400/40 bg-rose-400/12 text-rose-100',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}

export function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="glass-panel panel-lift rounded-[26px] p-5 shadow-glow">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-3 font-[var(--font-display)] text-3xl tracking-tight text-white">{value}</p>
    </div>
  )
}

export function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return <h2 className="font-[var(--font-display)] text-xl tracking-tight text-white">{children}</h2>
}

export function TopLinks() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:border-cyan-300/40 hover:bg-cyan-400/10" href="/">
        Home
      </Link>
      <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:border-cyan-300/40 hover:bg-cyan-400/10" href="/worker">
        Worker Portal
      </Link>
      <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:border-cyan-300/40 hover:bg-cyan-400/10" href="/settings">
        Settings
      </Link>
      <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:border-rose-300/40 hover:bg-rose-500/10" href="/admin">
        Insurer Console
      </Link>
    </div>
  )
}