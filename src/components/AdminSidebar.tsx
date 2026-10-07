'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // ซ่อน Sidebar ในหน้า Login
  if (pathname === '/admin/login') return null

  // ปิด Drawer อัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // ล็อคการเลื่อนหน้าจอด้านหลังเมื่อเปิด Drawer บนมือถือ
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const links = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'จัดการเครื่องมือ', href: '/admin/tools', icon: '🔧' },
    { name: 'License Keys', href: '/admin/licenses', icon: '🔑' },
    { name: 'คำสั่งซื้อ', href: '/admin/orders', icon: '🛒' },
    { name: 'สมาชิก', href: '/admin/members', icon: '👥' },
    { name: 'ประกาศ', href: '/admin/announcements', icon: '📢' },
    { name: 'CRM ทดลองใช้', href: '/admin/trials', icon: '🎯' },
    { name: 'Facebook Broadcast', href: '/admin/facebook', icon: '💬' },
    { name: 'ตั้งค่าเว็บไซต์', href: '/admin/settings', icon: '⚙️' },
  ]

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img src="/images/logo-puppap-ai.png" alt="PUP PAP AI" className="w-8 h-8 rounded-lg object-contain shadow-md" />
          <div className="flex flex-col">
            <span className="text-sm font-black text-white leading-tight">PUP PAP AI</span>
            <span className="text-[10px] text-red-400 font-bold tracking-wider">ADMIN PANEL</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon" />
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none"
            aria-label="เปิดเมนู"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Slide-over overlay) */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col h-full p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <img src="/images/logo-puppap-ai.png" alt="PUP PAP AI" className="w-9 h-9 rounded-xl object-contain shadow-md" />
                <div>
                  <div className="text-base font-black text-white leading-tight">PUP PAP AI</div>
                  <div className="text-[10px] text-red-400 font-bold tracking-wider">ADMIN PANEL</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle variant="icon" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="ปิดเมนู"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Menu Links */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 py-2">
              {links.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span>{link.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Logout */}
            <div className="pt-3 border-t border-slate-800 mt-auto">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
              >
                <span className="text-lg">🚪</span>
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex-col shrink-0 sticky top-0 h-screen z-30">
        <div className="flex items-center justify-between gap-2 mb-8 px-2">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-puppap-ai.png" alt="PUP PAP AI" className="w-10 h-10 rounded-xl object-contain shadow-md" />
            <div>
              <div className="text-base font-black text-white leading-tight">PUP PAP AI</div>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[9px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                PRO · ADMIN
              </div>
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
          >
            <span className="text-lg">🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  )
}
