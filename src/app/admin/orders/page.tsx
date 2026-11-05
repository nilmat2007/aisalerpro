'use client';

import { useState, useEffect } from 'react';
import { showSuccess, showError, showConfirm, showConfirmDelete, showLoading, closeLoading } from '@/lib/swal'
import { LoadingSpinner, Pagination, EmptyState } from '@/components/AdminUI'


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [rejectNote, setRejectNote] = useState('');
  const [rejectReason, setRejectReason] = useState('false_slip');
  const [rejectId, setRejectId] = useState<string | null>(null);

  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm('ยืนยันการอนุมัติคำสั่งซื้อนี้?');
    if (!confirmed) return;
    setProcessingId(id);
    showLoading('กำลังดำเนินการ...');
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      closeLoading();
      if (res.ok) {
        await showSuccess('อนุมัติสำเร็จ');
        fetchOrders();
      } else {
        const data = await res.json();
        showError('เกิดข้อผิดพลาด', data.error);
      }
    } catch (err) {
      console.error(err);
      closeLoading();
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติคำสั่งซื้อได้');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetryGrant = async (id: string) => {
    setProcessingId(id);
    showLoading('กำลังซ่อมสิทธิ์และอนุมัติคำสั่งซื้อ...');
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_grant' }),
      });
      closeLoading();
      if (res.ok) {
        await showSuccess('ซ่อมสิทธิ์และอนุมัติสำเร็จ!');
        fetchOrders();
      } else {
        const data = await res.json();
        showError('เกิดข้อผิดพลาด', data.error);
      }
    } catch (err) {
      console.error(err);
      closeLoading();
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถซ่อมสิทธิ์ได้');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNote.trim()) {
      showError('กรุณาระบุเหตุผล', 'กรุณาระบุเหตุผลการปฏิเสธ');
      return;
    }
    setProcessingId(id);
    showLoading('กำลังดำเนินการ...');
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          note: rejectNote,
          revoke_reason: rejectReason,
        })
      });
      closeLoading();
      if (res.ok) {
        await showSuccess('ปฏิเสธคำสั่งซื้อแล้ว');
        setRejectId(null);
        setRejectNote('');
        setRejectReason('false_slip');
        fetchOrders();
      } else {
        const data = await res.json();
        showError('เกิดข้อผิดพลาด', data.error);
      }
    } catch (err) {
      console.error(err);
      closeLoading();
      showError('เกิดข้อผิดพลาด', 'ไม่สามารถปฏิเสธคำสั่งซื้อได้');
    } finally {
      setProcessingId(null);
    }
  };

  const renderApprovedActorBadge = (order: any) => {
    const actor: string = order.approved_by_actor || '';
    const note: string = order.admin_note || '';
    if (actor === 'system:auto_slip' || note.includes('[AUTO-APPROVED')) {
      return (
        <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/15 text-cyan-300 text-[11px] rounded border border-cyan-500/30">
          🤖 ระบบตรวจสอบสลิปอัตโนมัติ
        </span>
      );
    }
    if (actor.startsWith('telegram:')) {
      return (
        <span className="inline-block mt-1 px-2 py-0.5 bg-sky-500/15 text-sky-300 text-[11px] rounded border border-sky-500/30">
          📱 อนุมัติผ่าน Telegram ({actor.replace('telegram:', '')})
        </span>
      );
    }
    if (actor === 'system:cleanup_retry' || note.includes('[AUTO-RETRY-HEALED')) {
      return (
        <span className="inline-block mt-1 px-2 py-0.5 bg-purple-500/15 text-purple-300 text-[11px] rounded border border-purple-500/30">
          🔄 ระบบซ่อมสิทธิ์อัตโนมัติ
        </span>
      );
    }
    if (actor.startsWith('admin:') || order.status === 'approved') {
      return (
        <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-300 text-[11px] rounded border border-emerald-500/30">
          👤 แอดมินอนุมัติ
        </span>
      );
    }
    return null;
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <div className="w-full">
      <div className="overflow-auto">
        <h1 className="text-3xl font-bold text-white mb-8">จัดการคำสั่งซื้อ (Orders)</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-cyan-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>ทั้งหมด</button>
          <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'pending' ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>รอตรวจสอบ</button>
          <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'approved' ? 'bg-green-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>อนุมัติแล้ว</button>
          <button onClick={() => setFilter('rejected')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'rejected' ? 'bg-red-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>ปฏิเสธ</button>
        </div>

        {loading ? (
          <LoadingSpinner text='กำลังโหลดคำสั่งซื้อ...' />
        ) : filteredOrders.length === 0 ? (
          <EmptyState icon='🧾' title='ไม่พบคำสั่งซื้อ' />
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">อีเมล</th>
                    <th className="px-4 py-3">เครื่องมือ</th>
                    <th className="px-4 py-3">จำนวนเงิน</th>
                    <th className="px-4 py-3">สลิป</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => (
                    <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3">{order.user_email}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-cyan-400">{order.tools?.name}</div>
                        <div className="text-xs text-slate-500">{order.tools?.slug}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-400">{order.amount?.toLocaleString()} ฿</td>
                      <td className="px-4 py-3">
                        {order.slip_url ? (
                          <img 
                            src={order.slip_url} 
                            alt="Slip" 
                            className="w-12 h-16 object-cover rounded cursor-pointer border border-slate-700 hover:border-cyan-500"
                            onClick={() => setSelectedSlip(order.slip_url)}
                          />
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {order.status === 'pending' && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">⏳ รอตรวจสอบ</span>}
                          {order.status === 'approved' && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">✅ อนุมัติแล้ว</span>}
                          {order.status === 'rejected' && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">❌ ปฏิเสธ</span>}
                          {order.status === 'approved' && renderApprovedActorBadge(order)}
                          {order.admin_note?.includes('[GRANT_RETRY_NEEDED') && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] rounded border border-amber-500/40 font-semibold">
                              ⚠️ รอซ่อมสิทธิ์ (Grant Delayed)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.status === 'pending' && (
                          <div className="flex flex-wrap gap-2">
                            {order.admin_note?.includes('[GRANT_RETRY_NEEDED') && (
                              <button
                                onClick={() => handleRetryGrant(order.id)}
                                disabled={processingId === order.id}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs disabled:opacity-50"
                              >
                                🔄 Retry Grant
                              </button>
                            )}
                            <button 
                              onClick={() => handleApprove(order.id)}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs disabled:opacity-50"
                            >
                              ✅ อนุมัติ
                            </button>
                            <button 
                              onClick={() => {
                                setRejectId(order.id);
                                setRejectReason('false_slip');
                              }}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs disabled:opacity-50"
                            >
                              ❌ ปฏิเสธ
                            </button>
                          </div>
                        )}
                        {order.status === 'approved' && (
                          <div className="flex items-center gap-2">
                            {order.license_key_id && (
                              <span className="text-xs text-green-400">
                                Key Gen Success
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setRejectId(order.id);
                                setRejectReason('admin_revoke');
                                setRejectNote('แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)');
                              }}
                              disabled={processingId === order.id}
                              className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded text-xs transition-colors disabled:opacity-50"
                            >
                              🚫 ยกเลิกสิทธิ์
                            </button>
                          </div>
                        )}
                        {order.status === 'rejected' && order.admin_note && (
                          <div className="text-xs text-red-400 space-y-1">
                            <div>เหตุผล: {order.admin_note}</div>
                            {order.admin_note.includes('kept_active_via_order_id=') && (
                              <span className="inline-block px-2 py-0.5 bg-emerald-500/15 text-emerald-300 text-[11px] rounded border border-emerald-500/30">
                                🛡️ สิทธิ์ยังใช้งานได้จากคำสั่งซื้ออื่น (Surviving Key)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">ปฏิเสธ / ยกเลิกสิทธิ์คำสั่งซื้อ</h3>
            <div className="mb-3">
              <label className="block text-xs text-slate-400 mb-1">ประเภทเหตุผล (Revoke Reason)</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="false_slip">สลิปปลอม / ยอดไม่ตรง (false_slip)</option>
                <option value="refund">คืนเงินลูกค้า (refund)</option>
                <option value="chargeback">ปฏิเสธรายการชำระเงิน (chargeback)</option>
                <option value="duplicate_test">รายการซ้ำ / ทดสอบระบบ (duplicate_test)</option>
                <option value="admin_revoke">แอดมินยกเลิกสิทธิ์ทั่วไป (admin_revoke)</option>
              </select>
            </div>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="ระบุเหตุผล (เช่น สลิปไม่ชัดเจน, ยอดเงินไม่ถูกต้อง)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 h-32 mb-4"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setRejectId(null); setRejectNote(''); }}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => handleReject(rejectId)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSlip(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button 
              className="absolute -top-4 -right-4 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 z-10"
              onClick={() => setSelectedSlip(null)}
            >
              ✕
            </button>
            <img src={selectedSlip} alt="Slip Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}
