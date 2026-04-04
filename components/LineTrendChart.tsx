import Svg, { Polyline } from 'react-native-svg'
import { View } from 'react-native'
import theme from '../themes/colors'

type Props = {
  values: number[]
  width?: number
  height?: number
}

export default function LineTrendChart({ values, width = 280, height = 72 }: Props) {
  if (!values.length) {
    return <View style={{ height, width }} />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : width

  const points = values
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
