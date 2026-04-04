'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  /** 'ghost' = borderless icon button (for navbars), 'pill' = rounded pill with label */
  variant?: 'ghost' | 'pill'
}

export function ThemeToggle({ variant = 'ghost' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  if (variant === 'pill') {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 dark:border-white/10 light:border-gray-200
          bg-white/5 dark:bg-white/5 hover:bg-white/10
          text-gray-300 dark:text-gray-300 text-gray-700
          text-xs font-medium transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-8 h-8 flex items-center justify-center rounded-lg
        text-gray-400 hover:text-white dark:text-gray-400 dark:hover:text-white
        hover:bg-white/10 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
