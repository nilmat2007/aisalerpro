'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { showSuccess, showError, showLoading, closeLoading, showConfirmDelete } from '@/lib/swal';
import { LoadingSpinner } from '@/components/AdminUI';

export default function AdminCoursesPage() {
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCourse = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
        const feat = (typeof data?.features === 'object' && data?.features !== null) ? data.features : {};
        setLessons(Array.isArray(feat.lessons) ? feat.lessons : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, []);

  const openAddModal = () => {
    const nextId = lessons.length > 0 ? Math.max(...lessons.map(l => l.id)) + 1 : 1;
    const lastLesson = lessons[lessons.length - 1];
    setEditingLesson({
      id: nextId,
      title: '',
      description: '',
      module_id: lastLesson?.module_id || 4,
      module_title: lastLesson?.module_title || 'โมดูลพิเศษ: มาสเตอร์คลาสขั้นสูง',
      video_url: '',
      duration: '15:00 นาที',
      status: 'coming_soon',
      is_free_preview: false,
      flow_tool_slug: '',
      key_points: ['', '', ''],
      isNew: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lesson: any) => {
    setEditingLesson({ ...lesson, isNew: false });
    setIsModalOpen(true);
  };

  const handleDeleteLesson = async (lesson: any) => {
    const confirmed = await showConfirmDelete(`บทที่ ${lesson.id}: ${lesson.title}`);
    if (!confirmed) return;

    showLoading('กำลังลบบทเรียน...');
    const filtered = lessons.filter(l => l.id !== lesson.id);
    const updatedLessons = filtered.map((l, index) => ({
      ...l,
      id: index + 1,
    }));

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons: updatedLessons }),
      });
      closeLoading();
      if (res.ok) {
        showSuccess('ลบบทเรียนสำเร็จ');
        setLessons(updatedLessons);
      } else {
        showError('ลบบทเรียนไม่สำเร็จ');
      }
    } catch (err: any) {
      closeLoading();
      showError('เกิดข้อผิดพลาดในการลบ', err.message);
    }
  };

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const list = [...lessons];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updatedLessons = list.map((l, idx) => ({ ...l, id: idx + 1 }));

    showLoading('กำลังจัดลำดับบทเรียน...');
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons: updatedLessons }),
      });
      closeLoading();
      if (res.ok) {
        setLessons(updatedLessons);
      } else {
        showError('จัดลำดับไม่สำเร็จ');
      }
    } catch (err: any) {
      closeLoading();
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title?.trim()) {
      showError('กรุณากรอกชื่อบทเรียน');
      return;
    }

    showLoading('กำลังบันทึกบทเรียน...');

    let updatedLessons: any[];
    if (editingLesson.isNew) {
      const { isNew, ...lessonData } = editingLesson;
      const cleanLesson = {
        ...lessonData,
        status: lessonData.video_url?.trim() ? (lessonData.status || 'ready') : (lessonData.status || 'coming_soon'),
      };
      updatedLessons = [...lessons, cleanLesson];
    } else {
      updatedLessons = lessons.map(l => {
        if (l.id === editingLesson.id) {
          const { isNew, ...lessonData } = editingLesson;
          return {
            ...lessonData,
            status: lessonData.video_url?.trim() ? (lessonData.status || 'ready') : lessonData.status,
          };
        }
        return l;
      });
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons: updatedLessons }),
      });

      closeLoading();

      if (res.ok) {
        showSuccess(editingLesson.isNew ? 'เพิ่มบทเรียนใหม่สำเร็จ!' : 'บันทึกบทเรียนสำเร็จ!');
        setLessons(updatedLessons);
        setIsModalOpen(false);
        setEditingLesson(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showError('บันทึกไม่สำเร็จ', err.error || 'ลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      closeLoading();
      showError('เกิดข้อผิดพลาดในการเชื่อมต่อ', err.message);
    }
  };

  const readyCount = lessons.filter(l => l.status === 'ready' && Boolean(l.video_url)).length;
  const inProgressCount = lessons.length - readyCount;
  const freePreviewCount = lessons.filter(l => l.is_free_preview).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎓</span> จัดการคอร์สเรียน & วิดีโอ 16 บทเรียน
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            คอร์ส: {course?.name || 'คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า'} • วิดีโอแนวนอน 16:9
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
          >
            <span>➕</span>
            <span>เพิ่มบทเรียนใหม่</span>
          </button>
          <Link
            href="/courses"
            target="_blank"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <span>👁️ ดูหน้าคอร์สจริง</span>
            <span>↗</span>
          </Link>
          <Link
            href={`/course/${course?.slug || 'tiktok-ai-affiliate'}`}
            target="_blank"
            className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>📺 ห้องเรียนออนไลน์</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-2xl font-black text-white">{lessons.length}</div>
          <div className="text-xs text-slate-400 mt-1">บทเรียนทั้งหมด</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-2xl font-black text-green-400">{readyCount}</div>
          <div className="text-xs text-slate-400 mt-1">วิดีโอพร้อมดูแล้ว</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-2xl font-black text-amber-400">{inProgressCount}</div>
          <div className="text-xs text-slate-400 mt-1">กำลังผลิตเนื้อหา</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-2xl font-black text-cyan-400">{freePreviewCount}</div>
          <div className="text-xs text-slate-400 mt-1">บทเปิดให้ดูฟรี (Preview)</div>
        </div>
      </div>

      {/* Lessons Table */}
      {loading ? (
        <LoadingSpinner text="กำลังโหลดบทเรียน..." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-md">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-slate-800/60 text-slate-300 text-xs">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">ชื่อบทเรียน & สรุป</th>
                <th className="p-4">โมดูล</th>
                <th className="p-4">สถานะวิดีโอ</th>
                <th className="p-4">ตัวอย่างฟรี?</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {lessons.map((lesson, index) => {
                const hasVideo = Boolean(lesson.video_url?.trim());
                const isReady = lesson.status === 'ready' && hasVideo;

                return (
                  <tr key={lesson.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-center font-mono font-bold text-slate-400">
                      {lesson.id}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{lesson.title}</div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {lesson.description}
                      </div>
                      {hasVideo && (
                        <div className="text-[11px] text-cyan-400 font-mono mt-1 truncate max-w-md">
                          🔗 {lesson.video_url}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {lesson.module_title?.split(':')[0] || 'โมดูล'}
                      </span>
                    </td>
                    <td className="p-4">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          พร้อมดู ({lesson.duration || 'มีคลิป'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          กำลังผลิตเนื้อหา
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {lesson.is_free_preview ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          ดูฟรี
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">สำหรับสมาชิก</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(index, 'up')}
                          disabled={index === 0}
                          title="เลื่อนขึ้น"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded text-xs transition-colors"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(index, 'down')}
                          disabled={index === lessons.length - 1}
                          title="เลื่อนลง"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded text-xs transition-colors"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(lesson)}
                          className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson)}
                          title="ลบบทเรียน"
                          className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Add Lesson Modal */}
      {isModalOpen && editingLesson && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{editingLesson.isNew ? '➕' : '🎬'}</span>
                <span>
                  {editingLesson.isNew
                    ? `เพิ่มบทเรียนใหม่ (บทที่ ${editingLesson.id})`
                    : `แก้ไขบทที่ ${editingLesson.id}: ${editingLesson.title}`}
                </span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cyan-400 mb-1">
                  📌 ชื่อบทเรียน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingLesson.title || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  placeholder="เช่น วิธีทำคลิป AI ปักตะกร้าแบบสั้นกระชับ"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  📑 หมวดหมู่ / โมดูล
                </label>
                <input
                  type="text"
                  value={editingLesson.module_title || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, module_title: e.target.value })}
                  placeholder="เช่น โมดูล 4: มาสเตอร์คลาสขั้นสูง หรือพิมพ์ชื่อโมดูลใหม่"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-400 mb-1">
                  🔗 ลิงก์วิดีโอ (YouTube URL หรือ Embed URL)
                </label>
                <input
                  type="text"
                  value={editingLesson.video_url || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                  placeholder="เช่น https://www.youtube.com/watch?v=VIDEO_ID หรือ https://youtu.be/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  วางลิงก์ YouTube (แบบ Unlisted หรือสาธารณะ) ระบบจะแปลงเป็น Player 16:9 ให้ทันที
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    ⏱️ ความยาวคลิป (Duration)
                  </label>
                  <input
                    type="text"
                    value={editingLesson.duration || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                    placeholder="เช่น 12:45 นาที"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    📊 สถานะบทเรียน
                  </label>
                  <select
                    value={editingLesson.status || 'coming_soon'}
                    onChange={(e) => setEditingLesson({ ...editingLesson, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="coming_soon">⏳ กำลังผลิตเนื้อหา (Coming Soon)</option>
                    <option value="ready">🟢 พร้อมดู (Video Ready)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ⚡ เครื่องมือ Flow ที่แนะนำในบทนี้ (Slug)
                </label>
                <select
                  value={editingLesson.flow_tool_slug || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, flow_tool_slug: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">- ไม่มีเครื่องมือเจาะจง -</option>
                  <option value="ugc-batch">Ai SALER PRO - UGC Batch (คลิปขายดุ)</option>
                  <option value="ai-content-factory">AI Content Factory (ละครสั้น/แอนิเมชั่น)</option>
                  <option value="pup-minimal-ads">PUP AI Minimal Ads (คลิปมินิมอล)</option>
                  <option value="pup-showhow-demo">PUP AI Showhow Demo (คลิปโชว์สินค้า/รีวิว)</option>
                  <option value="pup-podcast-studio">PUP AI Podcast Studio (พอดแคสต์)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  📝 คำอธิบายบทเรียนย่อ
                </label>
                <textarea
                  value={editingLesson.description || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingLesson.is_free_preview || false}
                    onChange={(e) => setEditingLesson({ ...editingLesson, is_free_preview: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 accent-cyan-500"
                  />
                  <span className="text-sm font-semibold text-emerald-400">
                    🎁 เปิดให้ดูฟรีเป็นตัวอย่าง (Free Preview) สำหรับคนที่ยังไม่ได้สมัคร
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-lg text-sm shadow-md"
                >
                  {editingLesson.isNew ? '➕ บันทึกและเพิ่มบทเรียน' : '💾 บันทึกบทเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
