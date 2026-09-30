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
      // il cambio mese del calendario: il vecchio esce da una parte mentre il
      // nuovo entra dall'altra
      keyframes: {
        'entra-destra': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'entra-sinistra': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'esce-sinistra': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-100%)' } },
        'esce-destra': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(100%)' } },
      },
      animation: {
        'entra-destra': 'entra-destra 0.26s ease-out both',
        'entra-sinistra': 'entra-sinistra 0.26s ease-out both',
        'esce-sinistra': 'esce-sinistra 0.26s ease-out both',
        'esce-destra': 'esce-destra 0.26s ease-out both',
      },
      // I colori del tema (src/lib/tema.ts): variabili CSS con i tre canali,
      // così il tema cambia in testa alla pagina e i modificatori di opacità
      // tipo `bg-nvg/10` continuano a funzionare.
      colors: {
        ...Object.fromEntries(
          [
            'bg',
            'surface',
            'surface2',
            'line',
            'ink',
            'muted',
            'nvg',
            'nvgdim',
            'nvgink',
            'info',
            'viola',
            'warn',
            'danger',
          ].map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]),
        ),
        itgreen: '#008c45',
        itred: '#cd212a',
      },
      fontFamily: {
        sans,
        mono: sans,
      },
      boxShadow: {
        nvg: '0 0 0 1px rgb(var(--c-nvg) / .35), 0 0 24px -6px rgb(var(--c-nvg) / .45)',
      },
    },
  },
  plugins: [],
} satisfies Config;
