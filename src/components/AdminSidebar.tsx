'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'จัดการเครื่องมือ', href: '/admin/tools', icon: '🔧' },
    { name: 'ตั้งค่าเว็บไซต์', href: '/admin/settings', icon: '⚙️' },
  ]

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-slate-900 p-4 border-b border-slate-800">
        <div className="text-white font-bold">Admin Panel</div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-white">
          ☰
        </button>
      </div>

      <div className={`${isOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4 flex flex-col shrink-0`}>
        <div className="hidden md:block text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-8 px-4">
          Admin Panel
        </div>

        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
        >
          <span>🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  )
}
