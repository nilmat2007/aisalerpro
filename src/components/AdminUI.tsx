'use client'

// ==================== Loading Spinner ====================
export function LoadingSpinner({ text = 'กำลังโหลด...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-slate-400 text-sm animate-pulse">{text}</p>
    </div>
  )
}

// ==================== Loading Skeleton ====================
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-slate-800 rounded-lg h-12 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

// ==================== Pagination ====================
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← ก่อนหน้า
      </button>
      {getPages().map((page, i) =>
        typeof page === 'string' ? (
          <span key={`dots-${i}`} className="px-2 text-slate-500">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 text-sm rounded-lg transition-colors ${
              page === currentPage
                ? 'bg-cyan-500 text-slate-900 font-bold'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ถัดไป →
      </button>
    </div>
  )
}

// ==================== Empty State ====================
export function EmptyState({ icon = '📭', title = 'ไม่พบข้อมูล', description }: { icon?: string; title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  )
}

// ==================== Stats Card ====================
export function StatsCard({ label, value, icon, color = 'cyan' }: { label: string; value: string | number; icon: string; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
      <div className="text-slate-400 text-sm mb-1">{icon} {label}</div>
      <div className={`text-2xl font-bold ${colorMap[color] || 'text-white'}`}>{value}</div>
    </div>
  )
}
