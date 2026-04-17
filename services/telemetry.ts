import { AppState, AppStateStatus } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { TaskManagerTaskBody } from 'expo-task-manager'
import { buildTelemetryPredictionInput, runPrediction } from './prediction'

const LOCATION_TASK_NAME = 'locus-location-task'
const TELEMETRY_QUEUE_KEY = 'locus-telemetry-queue'
const ACCEL_BATCH_KEY = 'locus-accelerometer-batch'

type TelemetryPayload = {
  ts: string
  worker_id: string
  zone_id: string | null
  location: string
  latitude: number
  longitude: number
  speed: number | null
  accuracy: number | null
  gps_delta_meters: number
  accel_variance: number
  accelBatch: Array<{ x: number; y: number; z: number; ts: number }>
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: TaskManagerTaskBody) => {
  if (error) {
    return
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations
  if (!locations || locations.length === 0) {
    return
  }

  const latestLocation = locations[locations.length - 1]
  const rawAccel = await AsyncStorage.getItem(ACCEL_BATCH_KEY)
  const accelBatch = rawAccel ? (JSON.parse(rawAccel) as TelemetryPayload['accelBatch']) : []
  const { data: userData } = await supabase.auth.getUser()
  const workerId = userData.user?.id

  if (!workerId) {
    return
  }

  const zoneRes = await supabase.rpc('match_telemetry_to_zone', {
    worker_lat: latestLocation.coords.latitude,
    worker_lon: latestLocation.coords.longitude,
  })

  const accelVariance = computeAccelVariance(accelBatch)
  const gpsDeltaMeters = Number(latestLocation.coords.accuracy ?? 0)

  const payload: TelemetryPayload = {
    ts: new Date().toISOString(),
    worker_id: workerId,
    zone_id: zoneRes.data ?? null,
    location: `POINT(${latestLocation.coords.longitude} ${latestLocation.coords.latitude})`,
    latitude: latestLocation.coords.latitude,
    longitude: latestLocation.coords.longitude,
    speed: latestLocation.coords.speed,
    accuracy: latestLocation.coords.accuracy,
    gps_delta_meters: gpsDeltaMeters,
    accel_variance: accelVariance,
    accelBatch,
  }

  await queueTelemetry(payload)
  await AsyncStorage.setItem(ACCEL_BATCH_KEY, JSON.stringify([]))
})

export async function startTelemetry() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    return false
  }

  const bg = await Location.requestBackgroundPermissionsAsync()
  if (bg.status !== 'granted') {
    return false
  }

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (!started) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000,
      distanceInterval: 20,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Locus telemetry online',
        notificationBody: 'Background location is active for disruption protection.',
      },
    })
  }

  return true
}

export async function stopTelemetry() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }
}

export function startAccelerometerBatching() {
  Accelerometer.setUpdateInterval(12000)
  const samples: Array<{ x: number; y: number; z: number; ts: number }> = []

  const subscription = Accelerometer.addListener((reading: AccelerometerMeasurement) => {
    samples.push({ ...reading, ts: Date.now() })
    if (samples.length >= 20) {
      AsyncStorage.setItem(ACCEL_BATCH_KEY, JSON.stringify(samples.slice(-20)))
    }
  })

  return () => {
    subscription.remove()
  }
}

export function initializeTelemetrySync() {
  const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (state.isConnected) {
      await flushTelemetryQueue()
    }
  })

  return unsubscribe
}

export function initializeTelemetryEngine() {
  const teardownSync = initializeTelemetrySync()
  const teardownAccelerometer = startAccelerometerBatching()
  let disposed = false

  const resumeTelemetry = async (state: AppStateStatus) => {
    if (disposed || state !== 'active') {
      return
    }

    const isOnline = useAppStore.getState().isOnline
    if (isOnline) {
      const started = await startTelemetry()
      if (started) {
        await flushTelemetryQueue()
      }
    }
  }

  const appStateSubscription = AppState.addEventListener('change', resumeTelemetry)

  return () => {
    disposed = true
    appStateSubscription.remove()
    teardownSync()
    teardownAccelerometer()
  }
}

async function queueTelemetry(payload: TelemetryPayload) {
  const current = await readQueue()
  const nextQueue = [...current, payload]
  await AsyncStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(nextQueue))
  useAppStore.getState().setTelemetryQueueSize(nextQueue.length)
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(TELEMETRY_QUEUE_KEY)
  if (!raw) {
    return [] as TelemetryPayload[]
  }

  try {
    return JSON.parse(raw) as TelemetryPayload[]
  } catch {
    return []
  }
}

export async function flushTelemetryQueue() {
  const queue = await readQueue()
  if (!queue.length) {
    useAppStore.getState().setTelemetryQueueSize(0)
    return
  }

  const rows = queue.map((item) => ({
    worker_id: item.worker_id,
    zone_id: item.zone_id,
    location: item.location,
    gps_delta_meters: item.gps_delta_meters,
    accel_variance: item.accel_variance,
    recorded_at: item.ts,
  }))

  const { error } = await supabase.from('telemetry').insert(rows)
  if (!error) {
    await AsyncStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify([]))
    useAppStore.getState().setTelemetryQueueSize(0)

    const latest = queue[queue.length - 1]
    const worker = useAppStore.getState().worker
    const claimVelocity = queue.length
    const predictionInput = buildTelemetryPredictionInput({
      gpsDelta: latest.gps_delta_meters,
      accelVariance: latest.accel_variance,
      isOnline: useAppStore.getState().isOnline,
      claimVelocity,
      zoneId: latest.zone_id ? Number(latest.zone_id) : 0,
      historicalAvgIncome: worker?.activeCreditBalance ?? 400,
      timestamp: latest.ts,
    })

    await runPrediction(predictionInput, 'live')
  }
}

function computeAccelVariance(batch: Array<{ x: number; y: number; z: number }>) {
  if (!batch.length) {
    return 0
  }

  const magnitudes = batch.map((s) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z))
  const mean = magnitudes.reduce((acc, m) => acc + m, 0) / magnitudes.length
  const variance =
    magnitudes.reduce((acc, m) => {
      const d = m - mean
      return acc + d * d
    }, 0) / magnitudes.length

  return Number(variance.toFixed(6))
}