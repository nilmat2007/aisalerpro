'use client'

import { useState, useEffect } from 'react'

export type PuppapTheme = 'dark' | 'cream'

export function useTheme() {
  const [theme, setTheme] = useState<PuppapTheme>('cream')

  useEffect(() => {
    // อ่านค่าธีมจาก documentElement หรือ localStorage (default: cream)
    const currentTheme =
      (document.documentElement.getAttribute('data-theme') as PuppapTheme) ||
      (localStorage.getItem('puppap_theme') as PuppapTheme) ||
      'cream'
    setTheme(currentTheme)
    document.documentElement.setAttribute('data-theme', currentTheme)

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'puppap_theme' && (e.newValue === 'dark' || e.newValue === 'cream')) {
        setTheme(e.newValue)
        document.documentElement.setAttribute('data-theme', e.newValue)
      }
    }
    const handleCustomEvent = (e: any) => {
      if (e.detail === 'dark' || e.detail === 'cream') {
        setTheme(e.detail)
      }
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('puppap_theme_changed', handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('puppap_theme_changed', handleCustomEvent)
    }
  }, [])

  const setThemeMode = (newTheme: PuppapTheme) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      localStorage.setItem('puppap_theme', newTheme)
      window.dispatchEvent(new CustomEvent('puppap_theme_changed', { detail: newTheme }))
    } catch {}
  }

  const toggleTheme = () => {
    const nextTheme: PuppapTheme = theme === 'dark' ? 'cream' : 'dark'
    setThemeMode(nextTheme)
  }

  return { theme, setThemeMode, toggleTheme, isDark: theme === 'dark' }
}

export default function ThemeToggle({
  className = '',
  variant = 'segmented', // 'segmented' (☀️ สว่าง | 🌙 มืด) or 'icon' (ปุ่มเดี่ยว)
  size = 'md',
}: {
  className?: string
  variant?: 'segmented' | 'icon'
  size?: 'sm' | 'md'
}) {
  const { theme, setThemeMode, toggleTheme, isDark } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    if (variant === 'segmented') {
      return (
        <div className={`inline-flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary-btn)] opacity-70 ${className}`}>
          <div className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--bg-card)]">☀️ สว่าง</div>
          <div className="px-3 py-1 text-xs font-semibold rounded-full text-[var(--text-muted)]">🌙 มืด</div>
        </div>
      )
    }
    return (
      <div className={`btn-theme-toggle w-8 h-8 opacity-60 inline-flex items-center justify-center ${className}`}>
        ☀️
      </div>
    )
  }

  // แบบ Segmented Capsule Pill สไตล์สากล (☀️ สว่าง | 🌙 มืด) เข้าใจง่ายทันที
  if (variant === 'segmented') {
    const isSm = size === 'sm'
    return (
      <div
        className={`inline-flex items-center p-1 rounded-full border-[1.5px] border-[var(--border)] bg-[var(--bg-secondary-btn)] shadow-sm select-none ${className}`}
        role="group"
        aria-label="ตัวเลือกโหมดกลางวัน/กลางคืน"
      >
        {/* ปุ่มโหมดสว่าง */}
        <button
          type="button"
          onClick={() => setThemeMode('cream')}
          className={`flex items-center gap-1.5 rounded-full font-bold transition-all duration-200 ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1 text-xs md:text-sm'
          } ${
            !isDark
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)] scale-100'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="โหมดสว่าง (กลางวัน)"
        >
          <span className="text-amber-500">☀️</span>
          <span>สว่าง</span>
        </button>

        {/* ปุ่มโหมดมืด */}
        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={`flex items-center gap-1.5 rounded-full font-bold transition-all duration-200 ${
            isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1 text-xs md:text-sm'
          } ${
            isDark
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border)] scale-100'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="โหมดมืด (กลางคืน)"
        >
          <span className="text-sky-400">🌙</span>
          <span>มืด</span>
        </button>
      </div>
    )
  }

  // แบบ Icon ปุ่มเดี่ยว
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-theme-toggle w-8 h-8 ${className}`}
      title={
        isDark
          ? 'กำลังใช้โหมดมืด (คลิกเพื่อเปลี่ยนเป็นโหมดสว่าง ☀️)'
          : 'กำลังใช้โหมดสว่าง (คลิกเพื่อเปลี่ยนเป็นโหมดมืด 🌙)'
      }
      aria-label="สลับโหมดกลางวัน/กลางคืน"
    >
      <span className="text-sm">
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
