/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'co-badge-bluekom',
    'co-badge-somtel',
    'alert-low-balance',
    'font-financial',
    'num-credit',
    'num-debit',
    'num-balance',
    'num-neutral',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── System tokens (resolved at runtime via CSS vars) ────────────────
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",

        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover:      "var(--color-primary-hover)",
          active:     "var(--color-primary-active)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── Semantic Surface Tokens ──────────────────────────────────────────
        surface: {
          DEFAULT: "var(--color-surface)",
          muted:   "var(--color-surface-muted)",
        },

        // ── CashDesk Navy Blue Scale (Primary) ──────────────────────────────
        cashdesk: {
          50:  '#f0fafa',
          100: '#cceeee',
          200: '#9ddada',
          300: '#5ec0c0',
          400: '#2ea8a8',
          500: '#178c8c',
          600: '#136f6f',
          700: '#115858',
          800: '#0f4646',
          900: '#0B1F4D',  // ← PRIMARY
          950: '#071333',
        },

        // ── Signal Gold CTA Scale ───────────────────────────────────────────
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          DEFAULT: '#F5B700',  // ← PRIMARY CTA
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // ── Somtel Brand Scale (Solar Gold) ──────────────────────────────────
        somtel: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          DEFAULT: '#F5B700',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        // ── Bluekom (kept for legacy company badge usage) ────────────────────
        bluekom: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        // ── Status Semantic Palette ─────────────────────────────────────────
        status: {
          approved:    '#0d9488',
          pending:     '#d97706',
          rejected:    '#e11d48',
          correction:  '#ea580c',
          paid:        '#2563eb',
          closed:      '#64748b',
        },
      },

      // ── Border radius ──────────────────────────────────────────────────────
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ── Typography (Instrument Sans, Bricolage Grotesque, IBM Plex Mono) ──
      fontFamily: {
        sans: [
          '"Instrument Sans"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: [
          '"Bricolage Grotesque"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
        financial: [
          '"IBM Plex Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },

      // ── Shadows ────────────────────────────────────────────────────────────
      boxShadow: {
        'xs':      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'glow-primary': '0 0 20px -4px hsl(var(--primary) / 0.35)',
      },

      // ── Animations ─────────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':        'fade-in 0.2s ease-out',
        'slide-in-left':  'slide-in-left 0.2s ease-out',
        'scale-in':       'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
