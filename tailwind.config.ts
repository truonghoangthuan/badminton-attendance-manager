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
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        inter: ['Inter', '"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        newsreader: ['Newsreader', 'Georgia', 'serif'],
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
