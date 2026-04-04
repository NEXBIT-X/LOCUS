import Svg, { Circle, Path } from 'react-native-svg'
import theme from '../themes/colors'

type Props = {
  size?: number
}

export default function LocusLogo({ size = 36 }: Props) {
  const fill = theme.colors.primary

  return (
    <Svg width={size} height={size} viewBox="0 0 128 110" fill="none">
      <Path d="M63.2751 30.4513H0V0H7.70563V22.7669H63.2751V30.4513Z" fill={fill} />
      <Path
        d="M128 22.7669L120.047 30.4513H72.6775L64.7249 22.7669V7.68441L72.6775 0H120.047L128 7.68441V22.7669ZM120.047 22.7669V7.68441H72.6775V22.7669H120.047Z"
        fill={fill}
      />
      <Path
        d="M63.2751 70.2256H7.95261L0 62.5412V47.4588L7.95261 39.7744H63.2751V47.2201H7.70563V62.5412H63.2751V70.2256Z"
        fill={fill}
      />
      <Path
        d="M128 62.5412L120.047 70.2256H72.6775L64.7249 62.5412V39.7744H72.4305V62.5412H120.393V39.7744H128V62.5412Z"
        fill={fill}
      />
      <Path
        d="M63.2751 102.316L55.3225 110H0V102.554H55.3225V87.2332H8.15019L0 79.3101V72.103H7.70563V79.3101H55.3225L63.2751 87.2332V102.316Z"
        fill={fill}
      />
    </Svg>
  )
}