import { supabase } from '../lib/supabase'
import {
  PredictionInput,
  PredictionResult,
  PredictionSnapshot,
  useAppStore,
} from '../store/appStore'

export const DEFAULT_PREDICTION_INPUT: PredictionInput = {
  gpsDelta: 50,
  accelVariance: 1.2,
  activityStatus: 1,
  claimVelocity: 2,
  anomalyScore: 0.2,
  dayOfWeek: 1,
  hourOfDay: 10,
  zoneId: 3,
  historicalAvgIncome: 400,
}

type PredictionResponse = PredictionResult & {
  id?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toCompactInput(input: PredictionInput) {
  return {
    gps_delta: Number(input.gpsDelta),
    accel_variance: Number(input.accelVariance),
    activity_status: Number(input.activityStatus),
    claim_velocity: Number(input.claimVelocity),
    anomaly_score: Number(input.anomalyScore),
    day_of_week: Number(input.dayOfWeek),
    hour_of_day: Number(input.hourOfDay),
    zone_id: Number(input.zoneId),
    historical_avg_income: Number(input.historicalAvgIncome),
  }
}

export function buildTelemetryPredictionInput(params: {
  gpsDelta: number
  accelVariance: number
  isOnline: boolean
  claimVelocity: number
  zoneId: number
  historicalAvgIncome: number
  timestamp?: string
}): PredictionInput {
  const stamp = params.timestamp ? new Date(params.timestamp) : new Date()
  const anomalyScore = clamp(
    Number(((params.gpsDelta / 120) * 0.45 + params.accelVariance * 0.18 + (params.claimVelocity / 5) * 0.25).toFixed(2)),
    0,
    1,
  )

  return {
    gpsDelta: Number(params.gpsDelta.toFixed(2)),
    accelVariance: Number(params.accelVariance.toFixed(3)),
    activityStatus: params.isOnline ? 1 : 0,
    claimVelocity: Math.max(0, Math.round(params.claimVelocity)),
    anomalyScore,
    dayOfWeek: stamp.getDay(),
    hourOfDay: stamp.getHours(),
    zoneId: Math.max(0, Math.round(params.zoneId)),
    historicalAvgIncome: Math.max(0, Math.round(params.historicalAvgIncome)),
  }
}

export function getSimulationInput(kind: 'baseline' | 'storm' | 'fraud') {
  if (kind === 'storm') {
    return {
      gpsDelta: 140,
      accelVariance: 3.9,
      activityStatus: 1,
      claimVelocity: 4,
      anomalyScore: 0.84,
      dayOfWeek: 5,
      hourOfDay: 18,
      zoneId: 9,
      historicalAvgIncome: 680,
    } satisfies PredictionInput
  }

  if (kind === 'fraud') {
    return {
      gpsDelta: 240,
      accelVariance: 5.1,
      activityStatus: 0,
      claimVelocity: 6,
      anomalyScore: 0.96,
      dayOfWeek: 2,
      hourOfDay: 1,
      zoneId: 7,
      historicalAvgIncome: 900,
    } satisfies PredictionInput
  }

  return DEFAULT_PREDICTION_INPUT
}

async function callSupabasePrediction(input: PredictionInput, source: PredictionSnapshot['source']): Promise<PredictionResponse | null> {
  const { data, error } = await supabase.rpc('run_prediction', {
    prediction_payload: toCompactInput(input),
    prediction_source: source,
  })

  if (error || !data) {
    return null
  }

  if (Array.isArray(data)) {
    const row = data[0] as PredictionResponse | undefined
    return row ?? null
  }

  return data as PredictionResponse
}

async function callDirectPrediction(input: PredictionInput): Promise<PredictionResponse> {
  const response = await fetch('https://locus-a0z9.onrender.com/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toCompactInput(input)),
  })

  if (!response.ok) {
    throw new Error(`Prediction API failed with ${response.status}`)
  }

  return (await response.json()) as PredictionResponse
}

export async function runPrediction(input: PredictionInput, source: PredictionSnapshot['source'] = 'simulation') {
  const rpcResult = await callSupabasePrediction(input, source)
  const result = rpcResult ?? (await callDirectPrediction(input))
  const snapshot: PredictionSnapshot = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source,
    input,
    result: {
      fraudScore: Number(result.fraudScore ?? 0),
      status: String(result.status ?? 'UNKNOWN'),
      expectedIncomeLost: Number(result.expectedIncomeLost ?? 0),
    },
  }

  useAppStore.getState().setLatestPrediction(snapshot)
  const existing = useAppStore.getState().predictionHistory
  useAppStore.getState().setPredictionHistory([snapshot, ...existing].slice(0, 8))

  return snapshot
}