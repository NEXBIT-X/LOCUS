import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import theme from '../themes/colors'

type Props = {
  children: ReactNode
}

export default function GlassCard({ children }: Props) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassStroke,
    padding: theme.spacing.m,
  },
})