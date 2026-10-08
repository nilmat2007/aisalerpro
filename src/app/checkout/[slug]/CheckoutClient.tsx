'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function CheckoutClient({
  tool,
  userEmail,
  userId,
}: {
  tool: any;
  userEmail: string;
  userId: string;
}) {
  const [step, setStep] = useState(2); // Start at step 2 (payment) or step 1
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const posterImage = tool.poster_url || null;

  // Clean price display without duplicate 'บาท'
  const rawPrice = String(tool.price || '0').replace(/[^0-9.]/g, '');
  const numericPrice = parseFloat(rawPrice) || 0;
  const displayPrice = numericPrice > 0 ? numericPrice.toLocaleString() : String(tool.price || '0').replace(/บาท/g, '').trim();

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('7751168047');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      let slipUrl = '';

      // Upload slip
      const { error: uploadError } = await supabase.storage.from('slips').upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        slipUrl = 'upload-failed';
      } else {
        const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(fileName);
        slipUrl = publicUrl;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          amount: numericPrice,
          slipUrl: slipUrl,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create order');

      setStep(3);
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6 py-10 sm:py-12 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Top Back & Theme Toggle */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/store" className="puppap-btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <span>← ย้อนกลับ</span>
          </Link>
          <ThemeToggle size="sm" />
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-bold">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                step >= 1
                  ? 'bg-[var(--accent)] text-white border-[var(--border)] shadow-xs'
                  : 'bg-[var(--bg-secondary-btn)] text-[var(--text-muted)] border-[var(--border-light)]'
              }`}
            >
              1
            </button>
            <div className={`h-1 w-8 sm:w-12 rounded-full ${step >= 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'}`}></div>
            <button
              onClick={() => setStep(2)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                step >= 2
                  ? 'bg-[var(--accent)] text-white border-[var(--border)] shadow-xs'
                  : 'bg-[var(--bg-secondary-btn)] text-[var(--text-muted)] border-[var(--border-light)]'
              }`}
            >
              2
            </button>
            <div className={`h-1 w-8 sm:w-12 rounded-full ${step >= 3 ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'}`}></div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                step >= 3
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-[var(--bg-secondary-btn)] text-[var(--text-muted)] border-[var(--border-light)]'
              }`}
            >
              3
            </div>
          </div>
        </div>

        <div className="puppap-card p-6 sm:p-10 shadow-xl border-2 border-[var(--border)]">
          {/* STEP 1: สรุปคำสั่งซื้อ */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-black border-b border-[var(--border-light)] pb-4 text-[var(--text-primary)]">
                สรุปคำสั่งซื้อ
              </h2>

              <div className="flex flex-col sm:flex-row gap-6">
                {posterImage ? (
                  <div className="w-full sm:w-1/3 aspect-[16/10] sm:aspect-[3/4] rounded-2xl overflow-hidden relative border border-[var(--border)] bg-black/10">
                    <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full sm:w-1/3 aspect-[3/4] bg-[var(--bg-deep)] border border-[var(--border)] rounded-2xl flex items-center justify-center text-5xl">
                    {tool.icon || '🛠️'}
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-1">
                      {tool.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-end border-t border-[var(--border-light)] pt-4">
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">ยอดชำระ</span>
                    <span className="text-2xl sm:text-3xl font-black text-[var(--accent)]">
                      ฿{displayPrice}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="puppap-btn-primary w-full py-3.5 text-base font-bold shadow-md flex items-center justify-center gap-2"
              >
                <span>ดำเนินการชำระเงิน →</span>
              </button>
            </div>
          )}

          {/* STEP 2: โอนเงิน & อัปโหลดสลิป */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] text-lg px-1 transition-colors"
                    title="กลับไปหน้าสรุปคำสั่งซื้อ"
                  >
                    ←
                  </button>
                  <span>ชำระเงิน</span>
                </h2>
                <span className="text-xs text-[var(--text-muted)]">ขั้นตอน 2 จาก 3</span>
              </div>

              {/* Bank Account Card - High Contrast & Crystal Clear */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-deep)] border-2 border-[var(--border)] space-y-4 shadow-sm text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <span>🏛️</span>
                  <span>ธนาคารกรุงศรีอยุธยา (Krungsri)</span>
                </div>

                <div className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <span>ชื่อบัญชี: </span>
                  <span className="text-[var(--accent)] font-black">ภีมทพัฒน์ นิลมาตย์</span>
                </div>

                {/* Account Number Box (Deep Obsidian Dark background with Bright Amber text for 100% Contrast) */}
                <div className="bg-stone-950 border-2 border-amber-500/70 py-3.5 px-4 sm:px-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                  <div className="text-xs text-stone-400 uppercase tracking-widest sm:hidden">
                    เลขที่บัญชี
                  </div>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wider select-all">
                    775-1-16804-7
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className={`text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                    }`}
                  >
                    <span>{copied ? '✅' : '📋'}</span>
                    <span>{copied ? 'คัดลอกสำเร็จ!' : 'คัดลอกเลขบัญชี'}</span>
                  </button>
                </div>

                {/* Payment Amount Row */}
                <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-[var(--text-secondary)]">
                    💰 ยอดที่ต้องโอน:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[var(--accent)]">
                    ฿{displayPrice}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">
                    บาท
                  </span>
                </div>
              </div>

              {/* Slip Upload Area */}
              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  📤 อัปโหลดสลิปโอนเงิน
                </label>

                <div className="relative border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg-deep)] rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {preview ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="max-h-56 rounded-xl overflow-hidden border border-[var(--border)] shadow-md bg-white">
                        <img src={preview} alt="Slip preview" className="max-h-56 object-contain" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[var(--accent)] hover:underline pt-2">
                        🔄 คลิกเพื่อเปลี่ยนรูปสลิป
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                      <span className="text-4xl group-hover:scale-110 transition-transform">📸</span>
                      <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        คลิกเพื่อเลือกไฟล์ หรือ ลากสลิปมาวางที่นี่
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        รองรับไฟล์รูปภาพ JPG, PNG, WEBP (ไม่เกิน 10MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="puppap-btn-primary w-full py-4 text-base font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin text-xl">↻</span>
                    <span>กำลังอัปโหลดและส่งข้อมูล...</span>
                  </>
                ) : !file ? (
                  <span>⚠️ กรุณาแนบสลิปก่อนกดยืนยัน</span>
                ) : (
                  <>
                    <span>📤 ส่งสลิปยืนยันการชำระเงิน</span>
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: เสร็จสมบูรณ์ */}
          {step === 3 && (
            <div className="text-center space-y-6 py-6 sm:py-8">
              <div className="w-20 h-20 bg-emerald-500/15 border-2 border-emerald-500 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-md">
                ✓
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ส่งสลิปเรียบร้อยแล้ว!
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  ระบบได้รับข้อมูลการชำระเงินของคุณแล้ว
                </p>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)] bg-[var(--bg-deep)] border border-[var(--border-light)] p-5 sm:p-6 rounded-2xl inline-block text-left shadow-xs">
                <p className="flex items-center gap-2">
                  <span>⏳</span>
                  <span>ทีมงานจะตรวจสอบและอนุมัติภายใน 5-15 นาที</span>
                </p>
                <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <span>✨</span>
                  <span>เมื่ออนุมัติแล้ว ระบบจะปลดล็อกเครื่องมือ/คอร์สให้อัตโนมัติ</span>
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="puppap-btn-primary px-8 py-3 text-sm font-bold shadow-md w-full sm:w-auto text-center"
                >
                  กลับหน้าแดชบอร์ด →
                </Link>
                <Link
                  href="/store"
                  className="puppap-btn-secondary px-6 py-3 text-sm font-semibold w-full sm:w-auto text-center"
                >
                  ดูรายการอื่น
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
