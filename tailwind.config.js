/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        obsidian: '#0B0E14',
        'aurora-card': '#131823',
        'aurora-elevated': '#1B2232',
        'cyan-glow': '#22D3EE',
        'mint-glow': '#34D399',
        'amber-glow': '#FBBF24',
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
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.65' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.22s ease-out both',
        in: 'fadeIn 0.2s ease-out both',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
