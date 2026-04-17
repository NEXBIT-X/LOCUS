"use client"

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard, GlassHero, PageFrame, PageShell, TopLinks } from '@/components/design-system'
import { requireSupabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')

  useEffect(() => {
    const client = requireSupabase()
    client.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/worker')
      }
    })
  }, [router])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)

    try {
      const client = requireSupabase()
      const { error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        setNotice(error.message)
      } else {
        router.replace('/worker')
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to sign in')
    } finally {
      setBusy(false)
    }
  }

  const signUp = async () => {
    setBusy(true)
    setNotice(null)

    try {
      const client = requireSupabase()
      const { error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        setNotice(error.message)
      } else {
        setMode('sign-in')
        setNotice('Account created. Sign in with your email and password.')
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <PageFrame>
        <GlassHero className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-[var(--font-display)] text-3xl tracking-tight">Locus Access</p>
            <p className="mt-1 text-sm text-slate-300">Email and password access for the worker portal and insurer console.</p>
          </div>
          <TopLinks />
        </GlassHero>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <GlassCard title="What you can do here" className="self-start">
            <div className="space-y-4 text-sm text-slate-300">
              <InfoLine title="Worker portal" body="Check coverage, incident status, payout history, and prediction outputs." />
              <InfoLine title="Insurer console" body="Review claims, run simulations, and keep the admin flow restricted to admin users." />
              <InfoLine title="Email/password only" body="No OTP or phone-based login is used in this build." />
            </div>
          </GlassCard>

          <GlassCard title={mode === 'sign-in' ? 'Sign in' : 'Create account'} className="mx-auto w-full max-w-xl">
            <form className="space-y-4" onSubmit={mode === 'sign-in' ? signIn : (event) => { event.preventDefault(); void signUp() }}>
              <div>
                <label className="text-sm text-slate-300" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm outline-none ring-cyan-300/50 transition focus:ring"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm outline-none ring-cyan-300/50 transition focus:ring"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Working...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <span>{mode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}</span>
              <button
                type="button"
                onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                className="font-semibold text-cyan-200 transition hover:text-cyan-100"
              >
                {mode === 'sign-in' ? 'Switch to sign up' : 'Switch to sign in'}
              </button>
            </div>

            {notice ? <p className="mt-4 text-sm text-cyan-100">{notice}</p> : null}
          </GlassCard>
        </div>
      </PageFrame>
    </PageShell>
  )
}

function InfoLine({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="font-[var(--font-display)] text-lg tracking-tight text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  )
}
