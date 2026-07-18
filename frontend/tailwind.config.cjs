/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './public/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A5F',
          900: '#1E3A8A',
        },
        // Semantic surface tokens — used for app chrome (body, cards,
        // borders) so dark mode reads as a deliberate dark palette rather
        // than gray-900 inverted defaults. Pages should prefer these
        // (surface-*, content-*) over raw gray-* where the element needs
        // to flip between themes; raw gray-* utilities are paired with a
        // dark: variant inline at each call site for finer-grained cases.
        surface: {
          DEFAULT: '#FFFFFF',
          sunken:  '#F9FAFB',  // page background, light mode
          raised:  '#FFFFFF',  // cards, light mode
          dark:        '#0F1115',  // page background, dark mode
          'dark-raised': '#1A1D23', // cards, dark mode
          'dark-hover':  '#22262E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionProperty: {
        theme: 'background-color, border-color, color, fill, stroke, box-shadow',
      },
    },
  },
  plugins: [],
};