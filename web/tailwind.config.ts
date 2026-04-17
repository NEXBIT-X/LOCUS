import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        locus: {
          bg: '#1a1a2e',
          card: '#0f3460',
          accentRed: '#e94560',
          accentBlue: '#00b4d8',
          accentPurple: '#533483',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(0, 180, 216, 0.28), 0 20px 60px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        pulseSlow: 'pulse 2.6s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config