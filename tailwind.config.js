/** @type {import('tailwindcss').Config} */
// Token bridge: every colour resolves to a CSS variable declared in
// src/app/globals.css. See DESIGN.md for what each token is for.
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1280px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
          strong: 'hsl(var(--border-strong))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        panel: 'hsl(var(--panel))',
        subtle: { foreground: 'hsl(var(--subtle-foreground))' },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          ink: 'hsl(var(--primary-ink))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Status tones (closed set — see src/lib/status.ts)
        ok: { DEFAULT: 'hsl(var(--ok))', wash: 'hsl(var(--ok-wash))' },
        info: { DEFAULT: 'hsl(var(--info))', wash: 'hsl(var(--info-wash))' },
        warn: { DEFAULT: 'hsl(var(--warn))', wash: 'hsl(var(--warn-wash))' },
        danger: { DEFAULT: 'hsl(var(--danger))', wash: 'hsl(var(--danger-wash))' },
        quiet: { DEFAULT: 'hsl(var(--quiet))', wash: 'hsl(var(--quiet-wash))' },
        // Legacy aliases (shadcn variants)
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: 'var(--radius)', // 6px
        DEFAULT: 'var(--radius)',
        md: 'calc(var(--radius) + 2px)', // 8px
        lg: 'calc(var(--radius) + 2px)', // 8px — cards, dialogs
        xl: 'calc(var(--radius) + 6px)', // 12px — sheets, phone cards
        '2xl': 'calc(var(--radius) + 6px)',
      },
      // Fixed rem scale, ratio ≈1.2. Body is 14px.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.3125rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.5rem' }],
        xl: ['1.375rem', { lineHeight: '1.65rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        // Clamped: nothing in the app renders above 28px (DESIGN.md).
        '3xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '4xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '5xl': ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        100: '25rem',
        112: '28rem',
        128: '32rem',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
        // Legacy names now flat (DESIGN.md: Flat-By-Default).
        soft: 'none',
        medium: 'var(--shadow-overlay)',
        large: 'var(--shadow-overlay)',
        'xl-soft': 'var(--shadow-overlay)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in': {
          from: { transform: 'translateY(4px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-out',
        'slide-in': 'slide-in 180ms cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: { 150: '150ms', 250: '250ms', 350: '350ms' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
