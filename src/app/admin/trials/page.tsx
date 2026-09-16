'use client'

import { useEffect, useState, useCallback } from 'react'
import { showSuccess, showError, showConfirm, showLoading, closeLoading } from '@/lib/swal'
import { LoadingSpinner, Pagination, EmptyState } from '@/components/AdminUI'

interface Trial {
  id: string
  user_id: string
  user_email: string
  user_name: string
  tool_id: string
  status: string
  started_at: string
  tools: {
    name: string
    slug: string
    price: number
  }
}

type FilterTab = 'all' | 'active' | 'converted'

const ITEMS_PER_PAGE = 10

export default function AdminTrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchTrials = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/trials')
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
      const data = await res.json()
      setTrials(data)
    } catch (err: any) {
      showError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrials()
  }, [fetchTrials])

  // Stats
  const totalCount = trials.length
  const activeCount = trials.filter((t) => t.status === 'active').length
  const convertedCount = trials.filter((t) => t.status === 'converted').length
  const conversionRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : '0'

  // Filtered data
  const filteredTrials =
    filter === 'all' ? trials : trials.filter((t) => t.status === filter)

  // Pagination
  const totalPages = Math.ceil(filteredTrials.length / ITEMS_PER_PAGE)
  const paginatedTrials = filteredTrials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const handleConvert = async (id: string) => {
    const confirmed = await showConfirm('ยืนยันให้สิทธิ์เต็ม?', 'ผู้ใช้จะได้รับสิทธิ์การใช้งานเต็มรูปแบบ')
    if (!confirmed) return

    try {
      showLoading('กำลังอัปเดตสถานะ...')
      const res = await fetch(`/api/admin/trials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      if (!res.ok) throw new Error('อัปเดตไม่สำเร็จ')
      closeLoading()
      showSuccess('ให้สิทธิ์เต็มเรียบร้อยแล้ว')
      fetchTrials()
    } catch (err: any) {
      closeLoading()
      showError(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleSendEmail = async (id: string) => {
    try {
      showLoading('กำลังส่งอีเมล...')
      const res = await fetch(`/api/admin/trials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_email' }),
      })
      if (!res.ok) throw new Error('ส่งอีเมลไม่สำเร็จ')
      closeLoading()
      showSuccess('ส่งอีเมลเรียบร้อยแล้ว')
    } catch (err: any) {
      closeLoading()
      showError(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'active', label: 'กำลังทดลอง' },
    { key: 'converted', label: 'ซื้อจริงแล้ว' },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-white">
        🎯 CRM ทดลองใช้ — ติดตามปิดการขาย
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">🎁 ทดลองทั้งหมด</p>
          <p className="text-3xl font-bold text-white mt-1">{totalCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">⏳ กำลังทดลอง</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">✅ ซื้อจริงแล้ว</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{convertedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">📈 Conversion Rate</p>
          <p className="text-3xl font-bold text-cyan-400 mt-1">{conversionRate}%</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredTrials.length === 0 ? (
        <EmptyState message="ไม่พบข้อมูลทดลองใช้" />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">วันที่</th>
                  <th className="text-left px-4 py-3 font-medium">ชื่อ</th>
                  <th className="text-left px-4 py-3 font-medium">อีเมล</th>
                  <th className="text-left px-4 py-3 font-medium">เครื่องมือ</th>
                  <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                  <th className="text-left px-4 py-3 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrials.map((trial) => (
                  <tr
                    key={trial.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-300">
                      {formatThaiDate(trial.started_at)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {trial.user_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{trial.user_email}</td>
                    <td className="px-4 py-3 text-cyan-400 font-medium">
                      {trial.tools.name}
                    </td>
                    <td className="px-4 py-3">
                      {trial.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ⏳ กำลังทดลอง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          ✅ ซื้อจริงแล้ว
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trial.status === 'active' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConvert(trial.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
                          >
                            ✅ ให้สิทธิ์เต็ม
                          </button>
                          <button
                            onClick={() => handleSendEmail(trial.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                          >
                            📧 ส่งอีเมล
                          </button>
                        </div>
                      ) : (
                        <span className="text-green-400 text-xs font-medium">
                          ปิดการขายสำเร็จ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}
