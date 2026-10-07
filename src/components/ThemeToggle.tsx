'use client'

import { useState, useEffect } from 'react'

export type PuppapTheme = 'dark' | 'cream'

export function useTheme() {
  const [theme, setTheme] = useState<PuppapTheme>('dark')

  useEffect(() => {
    // อ่านค่าธีมจาก documentElement หรือ localStorage
    const currentTheme = (document.documentElement.getAttribute('data-theme') as PuppapTheme) ||
      (localStorage.getItem('puppap_theme') as PuppapTheme) ||
      'dark'
    setTheme(currentTheme)
    document.documentElement.setAttribute('data-theme', currentTheme)

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'puppap_theme' && (e.newValue === 'dark' || e.newValue === 'cream')) {
        setTheme(e.newValue)
        document.documentElement.setAttribute('data-theme', e.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = () => {
    const nextTheme: PuppapTheme = theme === 'dark' ? 'cream' : 'dark'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    try {
      localStorage.setItem('puppap_theme', nextTheme)
      window.dispatchEvent(new CustomEvent('puppap_theme_changed', { detail: nextTheme }))
    } catch {}
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}

export default function ThemeToggle({
  className = '',
  size = 'md',
  showLabel = false,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const { theme, toggleTheme, isDark } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }[size]

  if (!mounted) {
    return (
      <div
        className={`btn-theme-toggle ${sizeClasses} opacity-60 inline-flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        🌓
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-theme-toggle ${sizeClasses} ${className} group`}
      title={
        isDark
          ? 'กำลังใช้ธีมดำสนิท (Obsidian Dark) — คลิกเพื่อเปลี่ยนเป็นธีมครีมมือถือ'
          : 'กำลังใช้ธีมครีมมือถือ (Cream Paper) — คลิกเพื่อเปลี่ยนเป็นธีมดำสนิท'
      }
      aria-label="สลับธีม Dark / Cream"
    >
      <span className="transition-transform duration-300 group-hover:rotate-45">
        🌓
      </span>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Dark Mode' : 'Cream Mode'}
        </span>
      )}
    </button>
  )
}
