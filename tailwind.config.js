/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#0a0a0a',
        surface:  '#111111',
        elevated: '#181818',
        overlay:  '#222222',
        accent:   '#73E33B',
        warn:     '#f59e0b',
        danger:   '#ff4757',
        info:     '#38bdf8',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        subtle:  'rgba(255,255,255,0.05)',
        default: 'rgba(255,255,255,0.09)',
        strong:  'rgba(255,255,255,0.16)',
      },
    },
  },
  plugins: [],
};
