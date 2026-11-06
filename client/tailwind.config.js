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
        // Primary: #123B5D (Navy Blue)
        navy: {
          50: '#f0f5fa',
          100: '#e0ecf6',
          200: '#c2d8eb',
          300: '#94bddc',
          400: '#5f9bc7',
          500: '#2d6a9f',
          600: '#1a517e',
          700: '#144167',
          800: '#123B5D', // Brand Navy Blue
          900: '#0e304d',
          950: '#081c2e',
        },
        brand: {
          50: '#f0f5fa',
          100: '#e0ecf6',
          200: '#c2d8eb',
          300: '#94bddc',
          400: '#5f9bc7',
          500: '#2d6a9f',
          600: '#123B5D', // Primary Navy Blue (#123B5D)
          700: '#0e304d',
          800: '#0b263e',
          900: '#123B5D',
          950: '#071827',
        },
        // Secondary: #0D9488 (Medical Teal)
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0D9488', // Medical Teal (#0D9488)
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Accent: #38BDF8 (Sky / Electric Blue)
        accent: {
          DEFAULT: '#38BDF8',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38BDF8', // Accent
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        // Success: #10B981 (Emerald)
        success: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        medblue: {
          50: '#f0f5fa',
          100: '#e0ebf4',
          200: '#bcd4e7',
          400: '#38BDF8',
          500: '#0ea5e9',
          600: '#123B5D',
          700: '#0D9488',
        },
        coral: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(18, 59, 93, 0.05), 0 1px 2px -1px rgba(18, 59, 93, 0.05)',
        'premium': '0 10px 30px -5px rgba(18, 59, 93, 0.08), 0 4px 6px -2px rgba(18, 59, 93, 0.04)',
        'glow-brand': '0 0 25px -5px rgba(18, 59, 93, 0.35)',
        'glow-teal': '0 0 25px -5px rgba(13, 148, 136, 0.35)',
        'glow-accent': '0 0 25px -5px rgba(56, 189, 248, 0.4)',
        'glow-sos': '0 0 25px 2px rgba(239, 68, 68, 0.5)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Mukta',
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
