"use client"

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard, GlassHero, PageFrame, PageShell, TopLinks } from '@/components/design-system'
import { requireSupabase } from '@/lib/supabase'
import type { WorkerSettings } from '@/lib/types'

const initialSettings: WorkerSettings = {
  full_name: '',
  city: '',
  zone_label: '',
  upi_handle: '',
  emergency_contact: '',
  historical_avg_income: 0,
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [settings, setSettings] = useState<WorkerSettings>(initialSettings)

  useEffect(() => {
    const client = requireSupabase()
    client.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/auth')
        return
      }

      const { data: payload } = await client.rpc('web_get_worker_settings')
      if (payload && typeof payload === 'object') {
        setSettings(payload as WorkerSettings)
      }
      setLoading(false)
    })
  }, [router])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)

    try {
      const client = requireSupabase()
      const { error } = await client.rpc('web_update_worker_settings', {
        p_full_name: settings.full_name,
        p_city: settings.city,
        p_zone_label: settings.zone_label,
        p_upi_handle: settings.upi_handle,
        p_emergency_contact: settings.emergency_contact,
        p_historical_avg_income: Number(settings.historical_avg_income),
      })

      if (error) {
        setNotice(error.message)
      } else {
        setNotice('Settings saved. Worker dashboard data now uses these values from Supabase.')
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <PageFrame>
        <GlassHero className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-[var(--font-display)] text-3xl tracking-tight">Profile Settings</p>
            <p className="mt-1 text-sm text-slate-300">Update DB-backed profile and payout details used across the app.</p>
          </div>
          <TopLinks />
        </GlassHero>

        <GlassCard title="Worker Configuration" className="mx-auto max-w-3xl">
          {loading ? <p className="text-sm text-slate-300">Loading settings...</p> : null}

          {!loading ? (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <Field
                label="Full name"
                value={settings.full_name}
                onChange={(value) => setSettings((current) => ({ ...current, full_name: value }))}
                placeholder="Arjun Kumar"
              />

              <Field
                label="City"
                value={settings.city}
                onChange={(value) => setSettings((current) => ({ ...current, city: value }))}
                placeholder="Chennai"
              />

              <Field
                label="Zone label"
                value={settings.zone_label}
                onChange={(value) => setSettings((current) => ({ ...current, zone_label: value }))}
                placeholder="Velachery"
              />

              <Field
                label="UPI handle"
                value={settings.upi_handle}
                onChange={(value) => setSettings((current) => ({ ...current, upi_handle: value }))}
                placeholder="arjun.k@upi"
              />

              <Field
                label="Emergency contact"
                value={settings.emergency_contact}
                onChange={(value) => setSettings((current) => ({ ...current, emergency_contact: value }))}
                placeholder="+91 98765 43210"
              />

              <Field
                label="Historical average income"
                value={String(settings.historical_avg_income)}
                onChange={(value) => setSettings((current) => ({ ...current, historical_avg_income: Number(value || 0) }))}
                placeholder="4700"
                type="number"
              />

              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          ) : null}

          {notice ? <p className="mt-4 text-sm text-cyan-100">{notice}</p> : null}
        </GlassCard>
      </PageFrame>
    </PageShell>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: 'text' | 'number'
}>) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm outline-none ring-cyan-300/50 transition focus:ring"
      />
    </label>
  )
}
