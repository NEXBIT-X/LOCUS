import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import GlassCard from '../components/GlassCard'
import LineTrendChart from '../components/LineTrendChart'
import theme from '../themes/colors'
import { AppStore, useAppStore } from '../store/appStore'
import { getSimulationInput, runPrediction } from '../services/prediction'

export default function TelemetryScreen() {
  const [busy, setBusy] = useState<null | 'baseline' | 'storm' | 'fraud'>(null)
  const queueSize = useAppStore((s: AppStore) => s.telemetryQueueSize)
  const isOnline = useAppStore((s: AppStore) => s.isOnline)
  const latestPrediction = useAppStore((s: AppStore) => s.latestPrediction)
  const predictionHistory = useAppStore((s: AppStore) => s.predictionHistory)

  const simulate = async (kind: 'baseline' | 'storm' | 'fraud') => {
    try {
      setBusy(kind)
      await runPrediction(getSimulationInput(kind), 'simulation')
    } catch (error) {
      Alert.alert('Prediction failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.container}>
      <GlassCard>
        <Text style={styles.title}>Telemetry Engine</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Background GPS Polling</Text>
          <Text style={styles.value}>5 min</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sensor Batch Mode</Text>
          <Text style={styles.value}>Accelerometer</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Offline Queue</Text>
          <Text style={styles.value}>{queueSize} payloads</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Node State</Text>
          <Text style={[styles.value, isOnline ? styles.up : styles.down]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.title}>Simulation Console</Text>
        <Text style={styles.sub}>Run sample payloads against the prediction service and persist the result in Supabase.</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.simButton} onPress={() => simulate('baseline')} disabled={busy !== null}>
            <Text style={styles.simButtonText}>{busy === 'baseline' ? 'Running...' : 'Baseline'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.simButton} onPress={() => simulate('storm')} disabled={busy !== null}>
            <Text style={styles.simButtonText}>{busy === 'storm' ? 'Running...' : 'Storm'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.simButton, styles.dangerButton]} onPress={() => simulate('fraud')} disabled={busy !== null}>
            <Text style={styles.simButtonText}>{busy === 'fraud' ? 'Running...' : 'Hard Flag'}</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.title}>Latest Prediction</Text>
        {latestPrediction ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={latestPrediction.result.status === 'HARD_FLAG' ? styles.hard : styles.soft}>
                {latestPrediction.result.status}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fraud score</Text>
              <Text style={styles.value}>{latestPrediction.result.fraudScore.toFixed(3)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Expected income lost</Text>
              <Text style={styles.value}>INR {latestPrediction.result.expectedIncomeLost.toFixed(2)}</Text>
            </View>
            <View style={styles.chartWrap}>
              <LineTrendChart values={predictionHistory.slice(0, 8).map((item) => item.result.fraudScore * 100).reverse()} />
            </View>
          </>
        ) : (
          <Text style={styles.sub}>No prediction yet. Use the simulation buttons above or wait for telemetry to flush a live sample.</Text>
        )}
      </GlassCard>

      <GlassCard>
        <Text style={styles.title}>Coverage Zone Map</Text>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 12.9716,
              longitude: 77.5946,
              latitudeDelta: 0.042,
              longitudeDelta: 0.042,
            }}
            customMapStyle={mapDarkStyle}
          >
            <Marker coordinate={{ latitude: 12.9716, longitude: 77.5946 }} title="Current Node" />
          </MapView>
        </View>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.m,
    paddingBottom: 140,
  },
  title: {
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: theme.colors.textMuted,
  },
  value: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
  },
  mapWrap: {
    borderRadius: theme.radius.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
  },
  map: {
    width: '100%',
    height: 260,
  },
  up: {
    color: theme.colors.success,
  },
  down: {
    color: theme.colors.danger,
  },
  sub: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  simButton: {
    minWidth: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    borderRadius: theme.radius.m,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dangerButton: {
    borderColor: 'rgba(244, 63, 94, 0.5)',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  simButtonText: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
    fontSize: 11,
  },
  hard: {
    color: theme.colors.danger,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
  },
  soft: {
    color: theme.colors.success,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
  },
  chartWrap: {
    marginTop: 10,
  },
})

const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#11161C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8FA3B8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050608' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1B2632' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#003049' }] },
]