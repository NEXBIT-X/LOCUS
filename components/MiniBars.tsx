import { View } from 'react-native'
import theme from '../themes/colors'

type Props = {
  values: number[]
  height?: number
}

export default function MiniBars({ values, height = 84 }: Props) {
  const max = Math.max(...values, 1)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height }}>
      {values.map((v, i) => {
        const ratio = Math.max(0.08, v / max)
        return (
          <View
            key={`${i}-${v}`}
            style={{
              flex: 1,
              height: Math.round(height * ratio),
              borderRadius: 6,
              backgroundColor: i === values.length - 1 ? theme.colors.primary : 'rgba(255,255,255,0.14)',
            }}
          />
        )
      })}
    </View>
  )
}
