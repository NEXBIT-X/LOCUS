import { useCallback, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AppStore, CreditEntry, PredictionSnapshot, useAppStore } from '../store/appStore'

type ClaimRow = {
  id: string
  status: string
  final_payout_amount: number
  created_at: string
}

export function useLocusData(session: Session | null) {
  const setWorker = useAppStore((s: AppStore) => s.setWorker)
  const setActivePolicy = useAppStore((s: AppStore) => s.setActivePolicy)
  const setCreditLedger = useAppStore((s: AppStore) => s.setCreditLedger)
  const setKycStatus = useAppStore((s: AppStore) => s.setKycStatus)
  const setPayoutState = useAppStore((s: AppStore) => s.setPayoutState)
  const setLatestPrediction = useAppStore((s: AppStore) => s.setLatestPrediction)
  const setPredictionHistory = useAppStore((s: AppStore) => s.setPredictionHistory)

  const refresh = useCallback(async () => {
    if (!session) {
      return
    }

    // Ensure worker row exists for first-time auth users.
    await supabase.from('workers').upsert(
      {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name ?? null,
      },
      { onConflict: 'id' },
    )

    try {
      await supabase.rpc('seed_demo_workspace')
    } catch {
      // The app still works if the seed RPC has not been installed yet.
    }

    const workerRes = await supabase
      .from('workers')
      .select('full_name, trust_tier, active_credit_balance, kyc_status')
      .eq('id', session.user.id)
      .maybeSingle()

    if (workerRes.data) {
      const row = workerRes.data
      setWorker({
        fullName: row.full_name,
        trustTier: row.trust_tier ?? 2,
        activeCreditBalance: Number(row.active_credit_balance ?? 0),
        kycStatus: (row.kyc_status as 'pending' | 'uploaded' | 'verified' | 'rejected') ?? 'pending',
      })
      setKycStatus((row.kyc_status as 'pending' | 'uploaded' | 'verified' | 'rejected') ?? 'pending')
    }

    const policyRes = await supabase
      .from('policies')
      .select('weekly_premium, layer_1_max_limit, layer_2_max_limit')
      .eq('worker_id', session.user.id)
      .eq('is_active', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (policyRes.data) {
      setActivePolicy({
        weeklyPremium: Number(policyRes.data.weekly_premium ?? 0),
        layer1: Number(policyRes.data.layer_1_max_limit ?? 0),
        layer2: Number(policyRes.data.layer_2_max_limit ?? 0),
      })
    }

    const claimsRes = await supabase
      .from('claims')
      .select('id, status, final_payout_amount, created_at')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const claims = (claimsRes.data ?? []) as ClaimRow[]
    const ledger: CreditEntry[] = claims.map((row, idx) => ({
      id: row.id,
      date: new Date(row.created_at).toISOString().slice(0, 10),
      deduction: Math.min(50, Math.max(0, Number(row.final_payout_amount ?? 0))),
      scoreDelta: Math.max(1, 5 - Math.min(idx, 4)),
    }))

    if (ledger.length) {
      setCreditLedger(ledger)
    }

    if (claims.length) {
      const latest = claims[0].status
      if (latest === 'auto_approved' || latest === 'paid') {
        setPayoutState('auto_approved')
      } else if (latest === 'soft_flagged' || latest === 'hard_flagged') {
        setPayoutState('tier2_verification')
      } else {
        setPayoutState('disruption_detected')
      }
    }

    const predictionsRes = await supabase
      .from('prediction_runs')
      .select('id, created_at, source, payload, fraud_score, status, expected_income_lost')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(8)

    const predictionHistory = ((predictionsRes.data ?? []) as Array<{
      id: string
      created_at: string
      source: string
      payload: Record<string, number>
      fraud_score: number
      status: string
      expected_income_lost: number
    }>).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      source: (row.source as PredictionSnapshot['source']) ?? 'live',
      input: {
        gpsDelta: Number(row.payload?.gps_delta ?? 0),
        accelVariance: Number(row.payload?.accel_variance ?? 0),
        activityStatus: Number(row.payload?.activity_status ?? 0),
        claimVelocity: Number(row.payload?.claim_velocity ?? 0),
        anomalyScore: Number(row.payload?.anomaly_score ?? 0),
        dayOfWeek: Number(row.payload?.day_of_week ?? 0),
        hourOfDay: Number(row.payload?.hour_of_day ?? 0),
        zoneId: Number(row.payload?.zone_id ?? 0),
        historicalAvgIncome: Number(row.payload?.historical_avg_income ?? 0),
      },
      result: {
        fraudScore: Number(row.fraud_score ?? 0),
        status: row.status,
        expectedIncomeLost: Number(row.expected_income_lost ?? 0),
      },
    }))

    setPredictionHistory(predictionHistory)
    setLatestPrediction(predictionHistory[0] ?? null)
  }, [session, setActivePolicy, setCreditLedger, setKycStatus, setPayoutState, setWorker])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { refresh }
}