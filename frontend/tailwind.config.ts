import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * GitForge design system.
 *
 * Colors are driven by CSS custom properties (defined in src/index.css) using
 * the shadcn/ui HSL convention, so components stay theme-agnostic. On top of the
 * shadcn base we add GitForge-specific tokens: a violet→cyan accent gradient,
 * swim-lane colors for the commit graph, and glass surface variables.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
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
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // GitForge semantic tokens
        forge: {
          violet: 'hsl(var(--forge-violet))',
          cyan: 'hsl(var(--forge-cyan))',
          fuchsia: 'hsl(var(--forge-fuchsia))',
          emerald: 'hsl(var(--forge-emerald))',
          amber: 'hsl(var(--forge-amber))',
          rose: 'hsl(var(--forge-rose))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        glass: '0 8px 32px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        glow: '0 0 0 1px hsl(var(--forge-violet) / 0.4), 0 0 24px -4px hsl(var(--forge-violet) / 0.5)',
        'glow-cyan': '0 0 0 1px hsl(var(--forge-cyan) / 0.4), 0 0 24px -4px hsl(var(--forge-cyan) / 0.5)',
      },
      backgroundImage: {
        'forge-gradient':
          'linear-gradient(135deg, hsl(var(--forge-violet)) 0%, hsl(var(--forge-cyan)) 100%)',
        'forge-radial':
          'radial-gradient(1200px 600px at 20% -10%, hsl(var(--forge-violet) / 0.18), transparent 60%), radial-gradient(1000px 500px at 100% 0%, hsl(var(--forge-cyan) / 0.12), transparent 55%)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        glow: 'glow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
