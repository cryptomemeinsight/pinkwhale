/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pinkwhale-dark': '#020205', // Almost pure black
        'pinkwhale-deep': '#0a0a1a', // Deep Navy
        'pinkwhale-card': '#13132b', // Card bg
        'pinkwhale-pink': '#ff00aa', // Hot Pink
        'pinkwhale-glow': '#ff4dc4', // Lighter Pink for glows
        'pinkwhale-cyan': '#00f0ff', // Cyber Cyan
      },
      fontFamily: {
        'display': ['Anton', 'Impact', 'sans-serif'],
        'body': ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px #ff00aa, 0 0 20px #ff00aa' },
          'to': { boxShadow: '0 0 20px #ff00aa, 0 0 30px #ff00aa' },
        }
      }
    },
  },
  plugins: [],
}