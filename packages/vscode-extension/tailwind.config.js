/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/webview/**/*.{tsx,ts,jsx,js}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (CSS variables)
        'board': 'var(--board)',
        'board-light': 'var(--board-light)',
        'board-dark': 'var(--board-dark)',
        'card-bg': 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'chalk': 'var(--chalk)',
        'chalk-white': 'var(--chalk-white)',
        'chalk-dim': 'var(--chalk-dim)',
        'chalk-muted': 'var(--chalk-muted)',
        'xp-bar': 'var(--xp-fill)',
        'xp-bg': 'var(--xp-bg)',
        'surface': 'var(--board)',
        'surface-light': 'var(--board-light)',

        // Chalk stick colors (same in both themes)
        'chalk-yellow': '#fde68a',
        'chalk-pink': '#fca5a5',
        'chalk-blue': '#93c5fd',
        'chalk-green': '#86efac',
        'chalk-orange': '#fdba74',

        // Phase colors — chalk tones
        'phase-foundation': { DEFAULT: '#b0bec5', light: '#cfd8dc' },
        'phase-design': { DEFAULT: '#ce93d8', light: '#e1bee7' },
        'phase-architecture': { DEFAULT: '#81d4fa', light: '#b3e5fc' },
        'phase-engineering': { DEFAULT: '#fff176', light: '#fff9c4' },
        'phase-development': { DEFAULT: '#a5d6a7', light: '#c8e6c9' },
        'phase-launch': { DEFAULT: '#ffab91', light: '#ffccbc' },
        'phase-reference': { DEFAULT: '#b0bec5', light: '#cfd8dc' },

        // Rarity
        'rarity-common': { DEFAULT: '#cfd8dc', glow: '#eceff1' },
        'rarity-rare': { DEFAULT: '#90caf9', glow: '#bbdefb' },
        'rarity-epic': { DEFAULT: '#ce93d8', glow: '#e1bee7' },
      },
      fontFamily: {
        'chalk': ['"Courier New"', 'Courier', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'badge-unlock': 'badge-unlock 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        'badge-unlock': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
