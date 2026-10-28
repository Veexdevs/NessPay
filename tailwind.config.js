/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#000000',
          900: '#080808',
          850: '#0d0d0d',
          800: '#121212',
          700: '#1a1a1a',
          600: '#262626',
          500: '#3a3a3a',
          400: '#5c5c5c',
          300: '#8a8a8a',
          200: '#b8b8b8',
          100: '#e2e2e2',
          50: '#f5f5f5',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'Haettenschweiler', 'sans-serif'],
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        hard: '6px 6px 0 0 #ffffff',
        'hard-sm': '3px 3px 0 0 #ffffff',
        'hard-dim': '6px 6px 0 0 #1f1f1f',
      },
      backgroundImage: {
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        grid: "linear-gradient(to right, #171717 1px, transparent 1px), linear-gradient(to bottom, #171717 1px, transparent 1px)",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s ease-out both',
        marquee: 'marquee 28s linear infinite',
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
