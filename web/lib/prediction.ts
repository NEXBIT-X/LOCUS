import { requireSupabase } from './supabase'
import type { PredictionInput, PredictionResult } from './types'

const PREDICTION_API_URL = 'https://locus-a0z9.onrender.com/predict'
const REQUEST_TIMEOUT_MS = 5500
const RETRY_ATTEMPTS = 2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toCompactInput(input: PredictionInput) {
  return {
    gps_delta: Number(input.gps_delta),
    accel_variance: Number(input.accel_variance),
    activity_status: Number(input.activity_status),
    claim_velocity: Number(input.claim_velocity),
    anomaly_score: Number(input.anomaly_score),
    day_of_week: Number(input.day_of_week),
    hour_of_day: Number(input.hour_of_day),
    zone_id: Number(input.zone_id),
    historical_avg_income: Number(input.historical_avg_income),
  }
}

async function logDecisionEvent(eventName: string, details: Record<string, unknown>) {
  try {
    const client = requireSupabase()
    await client.rpc('web_log_decision_event', {
      p_event_name: eventName,
      p_event_details: details,
    })
  } catch {
    // Timeline logging must never block core prediction paths.
  }
}

export function createScenario(kind: 'baseline' | 'storm' | 'fraud'): PredictionInput {
  if (kind === 'storm') {
    return {
      gps_delta: 140,
      accel_variance: 3.9,
      activity_status: 1,
      claim_velocity: 4,
      anomaly_score: 0.84,
      day_of_week: 5,
      hour_of_day: 18,
      zone_id: 4,
      historical_avg_income: 680,
    }
  }

  if (kind === 'fraud') {
    return {
      gps_delta: 240,
      accel_variance: 5.1,
      activity_status: 0,
      claim_velocity: 6,
      anomaly_score: 0.96,
      day_of_week: 2,
      hour_of_day: 1,
      zone_id: 7,
      historical_avg_income: 900,
    }
  }

  return {
    gps_delta: 50,
    accel_variance: 1.2,
    activity_status: 1,
    claim_velocity: 2,
    anomaly_score: 0.2,
    day_of_week: 1,
    hour_of_day: 10,
    zone_id: 3,
    historical_avg_income: 400,
  }
}

function fallbackResult(input: PredictionInput): PredictionResult {
  const score = clamp(
    (input.gps_delta / 300 + input.accel_variance / 6 + input.anomaly_score * 0.7 + input.claim_velocity / 10) /
      3,
    0,
    1,
  )

  return {
    fraud_score: Number(score.toFixed(3)),
    status: score >= 0.75 ? 'HARD_FLAG' : score >= 0.45 ? 'SOFT_FLAG' : 'CLEAR',
    expected_income_lost: Number((input.historical_avg_income * score).toFixed(2)),
  }
}

async function fetchWithTimeout(url: string, payload: Record<string, unknown>) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callPredictionApiWithRetry(input: PredictionInput) {
  const payload = toCompactInput(input)
  let lastError: unknown = null

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(PREDICTION_API_URL, payload)
      if (response.ok) {
        return (await response.json()) as PredictionResult
      }
      lastError = new Error(`Prediction API failed with ${response.status}`)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Prediction API unavailable')
}

export async function predictClaim(input: PredictionInput, source: 'live' | 'simulation' | 'seed' | 'web' = 'web') {
  const client = requireSupabase()
  const payload = toCompactInput(input)
  const startedAt = Date.now()

  try {
    const { data, error } = await client.rpc('web_predict_claim', {
      prediction_payload: payload,
      prediction_source: source,
    })

    if (!error && data) {
      await logDecisionEvent('prediction.rpc.success', {
        source,
        elapsed_ms: Date.now() - startedAt,
      })
      return data as PredictionResult
    }

    await logDecisionEvent('prediction.rpc.error', {
      source,
      elapsed_ms: Date.now() - startedAt,
      message: error?.message ?? 'unknown rpc error',
    })
  } catch {
    // Fall through to direct API.
  }

  try {
    const apiResult = await callPredictionApiWithRetry(input)
    await logDecisionEvent('prediction.api.success', {
      source,
      elapsed_ms: Date.now() - startedAt,
      endpoint: PREDICTION_API_URL,
    })
    return apiResult
  } catch {
    // Fall back to local deterministic scoring.
  }

  const fallback = fallbackResult(input)
  await logDecisionEvent('prediction.fallback.used', {
    source,
    elapsed_ms: Date.now() - startedAt,
    status: fallback.status,
    fraud_score: fallback.fraud_score,
  })
  return fallback
}
