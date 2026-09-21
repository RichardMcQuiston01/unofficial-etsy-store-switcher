/** @type {import('tailwindcss').Config} */
export default {
  // Includes lib/ — UI rendering logic (e.g. lib/popup-view.ts) lives there,
  // not just in entrypoints/, and Tailwind only keeps classes it can find by
  // scanning these paths as plain text.
  content: ['./entrypoints/**/*.{html,ts,js}', './lib/**/*.ts'],
  theme: {
    extend: {},
  },
  plugins: [],
};
