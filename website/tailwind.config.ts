import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d9ebff',
          200: '#b5d7ff',
          300: '#84bcff',
          400: '#529dff',
          500: '#2a7dff',
          600: '#165fe6',
          700: '#1149b3',
          800: '#0f3b8c',
          900: '#0e326f'
        }
      },
      boxShadow: {
        card: '0 2px 20px rgba(16,24,40,0.06)'
      }
    }
  },
  plugins: []
} satisfies Config;


