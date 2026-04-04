import { StyleSheet, Text, View } from 'react-native'
import GlassCard from '../components/GlassCard'
import theme from '../themes/colors'
import { useAppStore } from '../store/appStore'
import MiniBars from '../components/MiniBars'

type Props = {
  weeklyPremium: number
  layer1: number
  layer2: number
  activeCreditBalance: number
}

export default function WalletScreen({ weeklyPremium, layer1, layer2, activeCreditBalance }: Props) {
  const ledger = useAppStore((s) => s.creditLedger)
  const score = useAppStore((s) => s.creditScore)

  return (
    <View style={styles.container}>
      <GlassCard>
        <Text style={styles.title}>Wallet & Credit</Text>
        <Text style={styles.mainFigure}>INR {activeCreditBalance.toFixed(2)}</Text>
        <Text style={styles.sub}>Weekly premium INR {weeklyPremium.toFixed(2)} | Layer1 INR {layer1.toFixed(0)} | Layer2 INR {layer2.toFixed(0)}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.title}>Credit Score</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.sub}>Improves with consistent INR 50 micro-repayments.</Text>
        <View style={styles.graphWrap}>
          <MiniBars values={ledger.slice(0, 6).map((l) => l.deduction).reverse()} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.title}>Micro-Repayment Ledger</Text>
        {ledger.map((item) => (
          <View style={styles.row} key={item.id}>
            <View>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.sub}>Weekly deduction</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.minus}>- INR {item.deduction}</Text>
              <Text style={styles.plus}>+{item.scoreDelta} score</Text>
            </View>
          </View>
        ))}
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
    fontWeight: '600',
    marginBottom: 8,
  },
  mainFigure: {
    color: theme.colors.text,
    fontSize: 34,
    fontFamily: theme.typography.sans,
    fontWeight: '800',
  },
  score: {
    color: theme.colors.primary,
    fontSize: 40,
    fontFamily: theme.typography.sans,
    fontWeight: '800',
  },
  sub: {
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassStroke,
    paddingTop: 10,
    marginTop: 10,
  },
  date: {
    color: theme.colors.text,
    fontFamily: theme.typography.mono,
  },
  right: {
    alignItems: 'flex-end',
  },
  minus: {
    color: theme.colors.warning,
    fontFamily: theme.typography.mono,
  },
  plus: {
    color: theme.colors.success,
    marginTop: 2,
    fontFamily: theme.typography.mono,
  },
  graphWrap: {
    marginTop: 12,
  },
})