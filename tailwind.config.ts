import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#12372a',
          purple: '#24553f',
          blue: '#1b4d8c',
          court: '#2f7a53',
          shuttle: '#f4c95d',
          line: '#dbe6dd',
          sand: '#f6f3eb',
          ink: '#1d2a22',
          slate: '#637267',
        }
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans Variable"', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 18px 45px rgba(18, 55, 42, 0.08)',
        'glass-hover': '0 22px 50px rgba(18, 55, 42, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
