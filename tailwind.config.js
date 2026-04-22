/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pharma: {
          50: '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d2',
          300: '#86efae',
          400: '#4ade82',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        teal: {
          accent: '#0d9488',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          300: '#cbd5e1',
          100: '#f1f5f9',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 8px -1px rgba(15,23,42,0.06)',
        cardHover: '0 6px 24px -6px rgba(22,163,74,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
