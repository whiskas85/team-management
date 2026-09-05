import type { Config } from 'tailwindcss';

// Stack unico: niente macchina da scrivere. Le cifre restano allineate grazie
// alla utility `.num` (font-variant-numeric: tabular-nums) definita in globals.css.
const sans = [
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  'Inter',
  'system-ui',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palette del logo. Valori espliciti (non var CSS) così restano
      // utilizzabili i modificatori di opacità tipo `bg-nvg/10`.
      colors: {
        bg: '#050605',
        surface: '#0e110e',
        surface2: '#151a15',
        line: '#232a23',
        ink: '#e7ede7',
        muted: '#7f8a7f',
        nvg: '#4cff00',
        nvgdim: '#34ad00',
        itgreen: '#008c45',
        itred: '#cd212a',
        warn: '#ffb300',
        danger: '#ff4438',
      },
      fontFamily: {
        sans,
        mono: sans,
      },
      boxShadow: {
        nvg: '0 0 0 1px rgba(76,255,0,.35), 0 0 24px -6px rgba(76,255,0,.45)',
      },
    },
  },
  plugins: [],
} satisfies Config;
