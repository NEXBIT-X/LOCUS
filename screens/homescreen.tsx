import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import GlassCard from '../components/GlassCard'
import theme from '../themes/colors'
import { AppStore, useAppStore } from '../store/appStore'
import LineTrendChart from '../components/LineTrendChart'
import { getSimulationInput, runPrediction } from '../services/prediction'

type Props = {
	workerId: string
	activeCreditBalance: number
	weeklyPremium: number
}

const payoutCopy = {
	idle: 'No active claim. Telemetry running silently in the background.',
	disruption_detected: 'Disruption Detected - Analyzing...',
	auto_approved: 'Auto-Approved - INR 800 routing to UPI.',
	tier2_verification: 'Tier 2 Flag - Tap here to verify location.',
} as const

export default function HomeScreen({ workerId, activeCreditBalance, weeklyPremium }: Props) {
	const [running, setRunning] = useState<null | 'baseline' | 'fraud'>(null)
	const payoutState = useAppStore((s: AppStore) => s.payoutState)
	const setPayoutState = useAppStore((s: AppStore) => s.setPayoutState)
	const isOnline = useAppStore((s: AppStore) => s.isOnline)
	const latestPrediction = useAppStore((s: AppStore) => s.latestPrediction)
	const predictionHistory = useAppStore((s: AppStore) => s.predictionHistory)

	const runScenario = async (kind: 'baseline' | 'fraud') => {
		try {
			setRunning(kind)
			await runPrediction(getSimulationInput(kind), 'simulation')
		} catch (error) {
			Alert.alert('Simulation failed', error instanceof Error ? error.message : 'Unknown error')
		} finally {
			setRunning(null)
		}
	}

	const cyclePayoutState = () => {
		if (payoutState === 'idle') return setPayoutState('disruption_detected')
		if (payoutState === 'disruption_detected') return setPayoutState('auto_approved')
		if (payoutState === 'auto_approved') return setPayoutState('tier2_verification')
		setPayoutState('idle')
	}

	return (
		<View style={styles.container}>
			<GlassCard>
				<Text style={styles.kicker}>Worker node</Text>
				<Text style={styles.balanceLabel}>Live Coverage Balance</Text>
				<Text style={styles.balance}>INR {activeCreditBalance.toFixed(2)}</Text>
				<Text style={styles.meta}>ID {workerId.slice(0, 8)} | {isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
				<View style={styles.chartWrap}>
					<LineTrendChart values={[320, 340, 300, 420, 460, 435, Math.max(activeCreditBalance, 100)]} />
				</View>
			</GlassCard>

			<GlassCard>
				<View style={styles.rowBetween}>
					<Text style={styles.sectionTitle}>Prediction Control</Text>
					<Text style={styles.badge}>Supabase RPC</Text>
				</View>
				<Text style={styles.claimText}>Run a seeded risk simulation or a hard-flag scenario using the live prediction endpoint.</Text>
				<View style={styles.simRow}>
					<TouchableOpacity style={styles.simBtn} onPress={() => runScenario('baseline')} disabled={running !== null}>
						<Text style={styles.simBtnText}>{running === 'baseline' ? 'Running...' : 'Baseline'}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.simBtn, styles.simBtnDanger]} onPress={() => runScenario('fraud')} disabled={running !== null}>
						<Text style={styles.simBtnText}>{running === 'fraud' ? 'Running...' : 'Hard Flag'}</Text>
					</TouchableOpacity>
				</View>
			</GlassCard>

			<GlassCard>
				<View style={styles.rowBetween}>
					<Text style={styles.sectionTitle}>Silent Claim</Text>
					<Text style={styles.badge}>Realtime</Text>
				</View>
				<Text
					style={[
						styles.claimText,
						payoutState === 'auto_approved' && styles.success,
						payoutState === 'tier2_verification' && styles.danger,
					]}
				>
					{payoutCopy[payoutState]}
				</Text>
				<TouchableOpacity style={styles.actionBtn} onPress={cyclePayoutState}>
					<Text style={styles.actionBtnText}>Simulate Next State</Text>
				</TouchableOpacity>
			</GlassCard>

		<GlassCard>
			<Text style={styles.sectionTitle}>Risk Snapshot</Text>
			{latestPrediction ? (
				<>
					<View style={styles.rowBetween}>
						<Text style={styles.metricLabel}>Status</Text>
						<Text style={latestPrediction.result.status === 'HARD_FLAG' ? styles.danger : styles.success}>{latestPrediction.result.status}</Text>
					</View>
					<View style={styles.rowBetween}>
						<Text style={styles.metricLabel}>Fraud Score</Text>
						<Text style={styles.metricValue}>{latestPrediction.result.fraudScore.toFixed(3)}</Text>
					</View>
					<View style={styles.chartWrap}>
						<LineTrendChart values={predictionHistory.slice(0, 8).map((item) => item.result.fraudScore * 100).reverse()} />
					</View>
				</>
			) : (
				<Text style={styles.claimText}>No prediction yet. Use the controls above or wait for telemetry to sync.</Text>
			)}
		</GlassCard>

			<GlassCard>
				<Text style={styles.sectionTitle}>Weekly Premium Breakdown</Text>
				<View style={styles.rowBetween}>
					<Text style={styles.metricLabel}>Insurance Pool</Text>
					<Text style={styles.metricValue}>INR 40</Text>
				</View>
				<View style={styles.rowBetween}>
					<Text style={styles.metricLabel}>Credit Pool</Text>
					<Text style={styles.metricValue}>INR 20</Text>
				</View>
				<View style={styles.divider} />
				<View style={styles.rowBetween}>
					<Text style={styles.metricLabel}>Total / Week</Text>
					<Text style={styles.total}>INR {weeklyPremium.toFixed(2)}</Text>
				</View>
			</GlassCard>

			<GlassCard>
				<Text style={styles.zoneTitle}>Zone Alert</Text>
				<Text style={styles.zoneBody}>IMD flood alert active in your pincode. Stay online for automatic disruption handling.</Text>
			</GlassCard>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: theme.spacing.m,
		paddingBottom: 140,
	},
	kicker: {
		color: theme.colors.textMuted,
		fontFamily: theme.typography.sans,
		letterSpacing: 0.2,
		marginBottom: 6,
		textTransform: 'capitalize',
	},
	balanceLabel: {
		color: theme.colors.textMuted,
	},
	balance: {
		color: theme.colors.text,
		fontSize: 40,
		fontWeight: '800',
		marginVertical: 4,
		fontFamily: theme.typography.sans,
	},
	meta: {
		color: theme.colors.textMuted,
		fontFamily: theme.typography.mono,
		fontSize: 12,
	},
	sectionTitle: {
		color: theme.colors.text,
		fontWeight: '600',
		marginBottom: theme.spacing.s,
	},
	rowBetween: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	badge: {
		color: theme.colors.primary,
		borderColor: theme.colors.glassStroke,
		borderWidth: 1,
		borderRadius: theme.radius.pill,
		paddingHorizontal: 12,
		paddingVertical: 4,
		overflow: 'hidden',
		fontSize: 11,
		fontFamily: theme.typography.mono,
	},
	claimText: {
		color: theme.colors.warning,
		lineHeight: 21,
	},
	actionBtn: {
		marginTop: theme.spacing.m,
		borderWidth: 1,
		borderColor: theme.colors.glassStroke,
		borderRadius: theme.radius.m,
		paddingVertical: 10,
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.02)',
	},
	actionBtnText: {
		color: theme.colors.text,
		fontWeight: '600',
	},
	metricLabel: {
		color: theme.colors.textMuted,
		marginBottom: 8,
	},
	metricValue: {
		color: theme.colors.text,
		fontFamily: theme.typography.mono,
	},
	divider: {
		height: 1,
		backgroundColor: theme.colors.glassStroke,
		marginVertical: 10,
	},
	total: {
		color: theme.colors.primary,
		fontSize: 20,
		fontWeight: '700',
		fontFamily: theme.typography.mono,
	},
	zoneTitle: {
		color: theme.colors.text,
		fontWeight: '600',
		marginBottom: 8,
	},
	zoneBody: {
		color: theme.colors.textMuted,
		lineHeight: 20,
	},
	chartWrap: {
		marginTop: 10,
		opacity: 0.9,
	},
	simRow: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 12,
	},
	simBtn: {
		flex: 1,
		borderWidth: 1,
		borderColor: theme.colors.glassStroke,
		borderRadius: theme.radius.m,
		paddingVertical: 11,
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.03)',
	},
	simBtnDanger: {
		borderColor: 'rgba(244, 63, 94, 0.45)',
		backgroundColor: 'rgba(244, 63, 94, 0.08)',
	},
	simBtnText: {
		color: theme.colors.text,
		fontFamily: theme.typography.mono,
		fontSize: 11,
	},
	success: {
		color: theme.colors.success,
		fontFamily: theme.typography.mono,
	},
	danger: {
		color: theme.colors.danger,
		fontFamily: theme.typography.mono,
	},
})
