/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#080b10',
        surface:  '#0d1117',
        elevated: '#131920',
        overlay:  '#1a2230',
        accent:   '#00ff88',
        warn:     '#f59e0b',
        danger:   '#ff4757',
        info:     '#38bdf8',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        subtle:  'rgba(255,255,255,0.06)',
        default: 'rgba(255,255,255,0.10)',
        strong:  'rgba(255,255,255,0.18)',
      },
    },
  },
  plugins: [],
};
