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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Vibrant Cyan-Blue
          600: '#0284c7', // Radiant Clinical Azure
          700: '#0369a1', // Deep Sapphire Blue
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        medblue: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Royal Medical Indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Bio-Mint
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        medgreen: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Vitality Emerald
          600: '#059669',
          700: '#047857',
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
