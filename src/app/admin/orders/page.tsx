'use client';

import { useState, useEffect } from 'react';


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [rejectNote, setRejectNote] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);

  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

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
    if (!confirm('ยืนยันการอนุมัติคำสั่งซื้อนี้?')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      if (res.ok) {
        alert('อนุมัติสำเร็จ');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNote.trim()) {
      alert('กรุณาระบุเหตุผลการปฏิเสธ');
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectNote })
      });
      if (res.ok) {
        alert('ปฏิเสธคำสั่งซื้อแล้ว');
        setRejectId(null);
        setRejectNote('');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

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
          <div className="text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : (
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบข้อมูลคำสั่งซื้อ
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
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
                        {order.status === 'pending' && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">⏳ รอตรวจสอบ</span>}
                        {order.status === 'approved' && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">✅ อนุมัติแล้ว</span>}
                        {order.status === 'rejected' && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">❌ ปฏิเสธ</span>}
                      </td>
                      <td className="px-4 py-3">
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApprove(order.id)}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs disabled:opacity-50"
                            >
                              ✅ อนุมัติ
                            </button>
                            <button 
                              onClick={() => setRejectId(order.id)}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs disabled:opacity-50"
                            >
                              ❌ ปฏิเสธ
                            </button>
                          </div>
                        )}
                        {order.status === 'approved' && order.license_key_id && (
                          <div className="text-xs text-green-400">
                            Key Gen Success
                          </div>
                        )}
                        {order.status === 'rejected' && order.admin_note && (
                          <div className="text-xs text-red-400">
                            เหตุผล: {order.admin_note}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">ปฏิเสธคำสั่งซื้อ</h3>
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
