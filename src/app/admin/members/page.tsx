'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showConfirm, showLoading, closeLoading } from '@/lib/swal'
import { LoadingSpinner, Pagination, EmptyState } from '@/components/AdminUI'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/members')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error(error)
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }

  const getNewMembersThisWeek = () => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return members.filter(m => new Date(m.created_at) > oneWeekAgo).length
  }

  const getMostPopularTool = () => {
    const toolCounts: Record<string, number> = {}
    members.forEach(m => {
      m.user_tools?.forEach((ut: any) => {
        const name = ut.tools?.name || 'All-in-One'
        toolCounts[name] = (toolCounts[name] || 0) + 1
      })
    })
    
    let maxTool = 'ไม่มีข้อมูล'
    let maxCount = 0
    for (const [tool, count] of Object.entries(toolCounts)) {
      if (count > maxCount) {
        maxCount = count
        maxTool = tool
      }
    }
    return `${maxTool} (${maxCount})`
  }

  // Pagination logic
  const totalPages = Math.ceil(members.length / itemsPerPage)
  const paginatedMembers = members.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) return <LoadingSpinner text='กำลังโหลดสมาชิก...' />

  return (
    <div className="p-8 min-h-screen bg-slate-950">
      <h1 className="text-3xl font-bold text-white mb-8">รายชื่อสมาชิก</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-sm mb-1">สมาชิกทั้งหมด</div>
          <div className="text-3xl font-bold text-white">{members.length} คน</div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-sm mb-1">สมัครใหม่ (7 วันที่ผ่านมา)</div>
          <div className="text-3xl font-bold text-cyan-400">{getNewMembersThisWeek()} คน</div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-sm mb-1">เครื่องมือยอดนิยม</div>
          <div className="text-xl font-bold text-purple-400">{getMostPopularTool()}</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="bg-slate-950/50">
              <tr>
                <th className="p-4 font-semibold">ผู้ใช้งาน</th>
                <th className="p-4 font-semibold">เครื่องมือที่ครอบครอง</th>
                <th className="p-4 font-semibold">วันที่สมัคร</th>
                <th className="p-4 font-semibold">เข้าสู่ระบบล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-800/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={member.avatar_url || '/placeholder.png'} alt="" className="w-10 h-10 rounded-full bg-slate-800" />
                      <div>
                        <div className="font-semibold text-white">{member.display_name || 'No Name'}</div>
                        <div className="text-sm text-slate-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {member.user_tools?.map((ut: any) => (
                        <span key={ut.id} className="bg-slate-800 border border-slate-700 text-xs px-2 py-1 rounded">
                          {ut.tools?.name || 'All-in-One'}
                        </span>
                      ))}
                      {(!member.user_tools || member.user_tools.length === 0) && (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    {new Date(member.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString('th-TH') : '-'}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <EmptyState />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  )
}
