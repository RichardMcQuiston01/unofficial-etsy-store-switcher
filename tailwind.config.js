/** @type {import('tailwindcss').Config} */
export default {
  // Includes lib/ — UI rendering logic (e.g. lib/popup-view.ts) lives there,
  // not just in entrypoints/, and Tailwind only keeps classes it can find by
  // scanning these paths as plain text.
  content: ['./entrypoints/**/*.{html,ts,js}', './lib/**/*.ts'],
  theme: {
    extend: {
      // The forest green from mcqforyou.design's header/buttons (#2e4635).
      colors: {
        brand: {
          50: '#f5f6f5',
          100: '#e6e9e7',
          200: '#c4cbc6',
          300: '#97a39a',
          400: '#627468',
          500: '#435949',
          600: '#2e4635',
          700: '#26392b',
          800: '#1e2e22',
          900: '#17231b',
        },
      },
    },
  },
  plugins: [],
};
