/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cream: {
          outer: '#EFEAE2',
          inner: '#F9F6F0',
        },
        charcoal: {
          DEFAULT: '#141416',
          card: '#18181B',
        },
        pastel: {
          lavender: '#E8C2E8',
          butter: '#F5E284',
          sage: '#A7B582',
          periwinkle: '#C4D0F5',
          peach: '#F7C59F',
        },
      },
    },
  },
  plugins: [],
};
