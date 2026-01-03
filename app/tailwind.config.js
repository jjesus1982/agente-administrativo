/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme")

module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Sistema de cores shadcn/ui + customizações modernas
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Cores para glassmorphism
        glass: {
          bg: "rgba(255, 255, 255, 0.1)",
          "bg-dark": "rgba(30, 41, 59, 0.4)",
          border: "rgba(255, 255, 255, 0.2)",
          "border-dark": "rgba(148, 163, 184, 0.2)",
        },
        // Charts colors
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },

      // Sistema de espaçamento 8px base
      spacing: {
        '0.5': '2px',   // 0.125rem
        '1': '4px',     // 0.25rem
        '1.5': '6px',   // 0.375rem
        '2': '8px',     // 0.5rem - BASE 8px
        '3': '12px',    // 0.75rem
        '4': '16px',    // 1rem - BASE * 2
        '5': '20px',    // 1.25rem
        '6': '24px',    // 1.5rem - BASE * 3
        '8': '32px',    // 2rem - BASE * 4
        '10': '40px',   // 2.5rem - BASE * 5
        '12': '48px',   // 3rem - BASE * 6
        '16': '64px',   // 4rem - BASE * 8
        '20': '80px',   // 5rem - BASE * 10
        '24': '96px',   // 6rem - BASE * 12
        '32': '128px',  // 8rem - BASE * 16
        // Safe areas for mobile devices
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },

      // Tipografia fluida e moderna
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        // Fluid typography
        'fluid-sm': 'clamp(0.875rem, 2vw, 1rem)',
        'fluid-base': 'clamp(1rem, 2.5vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 3vw, 1.5rem)',
        'fluid-xl': 'clamp(1.25rem, 4vw, 2rem)',
        'fluid-2xl': 'clamp(1.5rem, 5vw, 3rem)',
      },

      // Font family
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },

      // Breakpoints responsivos mobile-first
      screens: {
        'xs': '375px',    // iPhone SE
        'sm': '640px',    // Large phones
        'md': '768px',    // Tablets
        'lg': '1024px',   // Small laptops
        'xl': '1280px',   // Desktops
        '2xl': '1536px',  // Large screens
      },

      // Glassmorphism backdrop blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },

      // Sistema de sombras moderno (elevation + glassmorphism)
      boxShadow: {
        // Elevation system
        'elevation-1': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'elevation-2': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        'elevation-3': '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
        'elevation-4': '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
        'elevation-5': '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
        // Glassmorphism
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-inset': 'inset 0 2px 4px rgba(255, 255, 255, 0.1)',
        // Neumorphism
        'neu': '20px 20px 60px #bebebe, -20px -20px 60px #ffffff',
        'neu-dark': '20px 20px 60px #0f172a, -20px -20px 60px #1e293b',
        'neu-inset': 'inset 20px 20px 60px #bebebe, inset -20px -20px 60px #ffffff',
        'neu-inset-dark': 'inset 20px 20px 60px #0f172a, inset -20px -20px 60px #1e293b',
        // Colored shadows
        'primary': '0 10px 30px rgba(59, 130, 246, 0.3)',
        'success': '0 10px 30px rgba(34, 197, 94, 0.3)',
        'warning': '0 10px 30px rgba(245, 158, 11, 0.3)',
        'danger': '0 10px 30px rgba(239, 68, 68, 0.3)',
      },

      // Border radius system
      borderRadius: {
        'lg': 'var(--radius)',
        'md': 'calc(var(--radius) - 2px)',
        'sm': 'calc(var(--radius) - 4px)',
        'xs': '2px',
        'none': '0',
        'full': '9999px',
      },

      // Animações e keyframes modernos
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glass-shimmer": {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        "pulse-glow": {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' }
        },
        "bounce-subtle": {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in": "slide-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "glass-shimmer": "glass-shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
      },

      // Z-index scale
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'offcanvas': '1045',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },

      // Transition timings
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Plugin personalizado para classes utilitárias
    function({ addUtilities }) {
      addUtilities({
        // Touch utilities
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.scroll-smooth': {
          'scroll-behavior': 'smooth',
          '-webkit-overflow-scrolling': 'touch',
        },

        // Glass utilities
        '.glass-card': {
          'backdrop-filter': 'blur(16px)',
          'background': 'var(--glass-bg)',
          'border': '1px solid var(--glass-border)',
          'box-shadow': 'var(--shadow-glass)',
        },
        '.glass-card-dark': {
          'backdrop-filter': 'blur(16px)',
          'background': 'var(--glass-bg-dark)',
          'border': '1px solid var(--glass-border-dark)',
          'box-shadow': 'var(--shadow-glass-dark)',
        },

        // Neumorphism utilities
        '.neu-card': {
          'background': '#f0f0f0',
          'box-shadow': 'var(--shadow-neu)',
          'border-radius': '16px',
        },
        '.neu-card-dark': {
          'background': '#1e293b',
          'box-shadow': 'var(--shadow-neu-dark)',
          'border-radius': '16px',
        },
        '.neu-inset': {
          'box-shadow': 'var(--shadow-neu-inset)',
        },
        '.neu-inset-dark': {
          'box-shadow': 'var(--shadow-neu-inset-dark)',
        },

        // Focus utilities
        '.focus-ring': {
          '&:focus': {
            'outline': 'none',
            'ring': '2px solid hsl(var(--ring))',
            'ring-offset': '2px',
          }
        }
      });
    }
  ],
}