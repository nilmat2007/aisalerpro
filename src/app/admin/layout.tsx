import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import { headers } from 'next/headers'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  const headersList = await headers()
  
  const pathname = headersList.get('x-invoke-path') || ''
  const isLoginPage = pathname === '/admin/login' || (headersList.get('referer') || '').includes('/admin/login')
  
  if (!session && !isLoginPage) {
    redirect('/admin/login')
  }

  if (isLoginPage || !session) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-200">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
