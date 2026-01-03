"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  enableSystem?: boolean
}

interface ThemeProviderState {
  theme: Theme
  systemTheme: 'dark' | 'light'
  effectiveTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isSystemTheme: boolean
}

const initialState: ThemeProviderState = {
  theme: 'system',
  systemTheme: 'light',
  effectiveTheme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
  isSystemTheme: true,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'agente-theme',
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light')

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  // Load saved theme from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme | null
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || (enableSystem && savedTheme === 'system'))) {
        setTheme(savedTheme)
      }
    } catch {
      // Fallback to default theme if localStorage is not available
      setTheme(defaultTheme)
    }
  }, [defaultTheme, enableSystem, storageKey])

  // Calculate effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)

    // Set data attribute for CSS targeting
    root.setAttribute('data-theme', effectiveTheme)

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        effectiveTheme === 'dark' ? '#0f172a' : '#ffffff'
      )
    }
  }, [effectiveTheme])

  const handleSetTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch {
      // Handle localStorage error gracefully
    }
    setTheme(newTheme)
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      handleSetTheme('light')
    } else if (theme === 'light') {
      handleSetTheme('dark')
    } else {
      handleSetTheme(enableSystem ? 'system' : 'light')
    }
  }

  const value: ThemeProviderState = {
    theme,
    systemTheme,
    effectiveTheme,
    setTheme: handleSetTheme,
    toggleTheme,
    isSystemTheme: theme === 'system',
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

// Theme toggle component
export function ThemeToggle({
  variant = 'default',
  size = 'default',
  className = ''
}: {
  variant?: 'default' | 'ghost' | 'glass'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const { theme, effectiveTheme, toggleTheme } = useTheme()

  const getIcon = () => {
    if (theme === 'system') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }

    return effectiveTheme === 'dark' ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )
  }

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      default: 'h-9 w-9 text-sm',
      lg: 'h-10 w-10 text-base'
    }

    const variantClasses = {
      default: 'bg-background hover:bg-accent hover:text-accent-foreground border border-input shadow-sm',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      glass: 'glass-button border-0'
    }

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`
  }

  return (
    <button
      onClick={toggleTheme}
      className={getButtonClasses()}
      title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}

export default ThemeProvider