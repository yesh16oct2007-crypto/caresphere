/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Crisp Electric Blue
          600: '#2563eb', // Modern Clinical Cobalt
          700: '#1d4ed8', // Authoritative Royal Blue
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        medblue: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed', // Royal Iris Violet
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        teal: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // Modern Mediterranean Cyan
          600: '#0891b2', // Deep Clinical Aqua
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        medgreen: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Vitality Green
          600: '#16a34a',
          700: '#15803d',
        },
        coral: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
        }
      },
      boxShadow: {
        'glow-brand': '0 0 25px -5px rgba(2, 132, 199, 0.25)',
        'glow-teal': '0 0 25px -5px rgba(20, 184, 166, 0.25)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Mukta', // Great for Devanagari/Hindi/Marathi
          'Noto Sans Tamil',
          'Noto Sans Telugu',
          'Noto Sans Kannada',
          'Noto Sans Malayalam',
          'Noto Sans Bengali',
          'Noto Sans Gujarati',
          'Noto Sans Gurmukhi',
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
};
