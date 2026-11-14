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
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        limestone: '#FAF7F2',
        linen: '#FFFFFF',
        sand: '#F3ECE1',
        espresso: '#1F1B18',
        stone: '#6B6259',
        terracotta: '#C85A38',
        olive: '#6E7F5E',
        mediterranean: '#2A7B88',
        'border-warm': '#E6DDD1',
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
