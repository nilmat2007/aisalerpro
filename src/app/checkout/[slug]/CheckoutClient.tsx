'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  generatePromptPayPayload,
  PROMPTPAY_ID,
  PROMPTPAY_DISPLAY,
  PROMPTPAY_RECEIVER_NAME,
} from '@/lib/promptpay';
import { getPriceInfo } from '@/lib/price-utils';

// Multi-zone & high-contrast QR code scanner for Thai Bank Mini-QR codes on slips
function decodeSlipQrCode(img: HTMLImageElement): string | null {
  try {
    const zones = [
      // 1. Full image
      { sx: 0, sy: 0, sw: 1, sh: 1, scale: 1 },
      // 2. Bottom half (where most Thai banking apps place Mini-QR)
      { sx: 0, sy: 0.42, sw: 1, sh: 0.58, scale: 1.5 },
      // 3. Bottom-right quadrant (K PLUS, SCB, Krungsri, BBL)
      { sx: 0.35, sy: 0.45, sw: 0.65, sh: 0.55, scale: 2.0 },
      // 4. Bottom-left quadrant (Krungthai NEXT, TTB, GSB)
      { sx: 0, sy: 0.45, sw: 0.65, sh: 0.55, scale: 2.0 },
      // 5. Middle-right zone (short slips)
      { sx: 0.35, sy: 0.2, sw: 0.65, sh: 0.6, scale: 1.8 },
    ];

    const scanCanvas = document.createElement('canvas');
    const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
    if (!scanCtx) return null;

    for (const z of zones) {
      const cropX = Math.floor(img.width * z.sx);
      const cropY = Math.floor(img.height * z.sy);
      const cropW = Math.max(64, Math.floor(img.width * z.sw));
      const cropH = Math.max(64, Math.floor(img.height * z.sh));

      const targetW = Math.min(1600, Math.round(cropW * z.scale));
      const targetH = Math.min(1600, Math.round(cropH * z.scale));

      scanCanvas.width = targetW;
      scanCanvas.height = targetH;
      scanCtx.fillStyle = '#FFFFFF';
      scanCtx.fillRect(0, 0, targetW, targetH);
      scanCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      const imageData = scanCtx.getImageData(0, 0, targetW, targetH);
      const decoded = jsQR(imageData.data, targetW, targetH, {
        inversionAttempts: 'attemptBoth',
      });
      if (decoded?.data && decoded.data.trim().length >= 18) {
        return decoded.data.trim();
      }
    }
  } catch (e) {
    console.warn('QR scan warning:', e);
  }
  return null;
}

// Compress and resize mobile slip images (up to 1280px JPEG @ 0.85 quality) + extract Bank Mini-QR
async function prepareSlipImage(file: File): Promise<{
  blob: Blob;
  base64: string;
  mimeType: string;
  qrPayload: string | null;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        resolve({
          blob: file,
          base64: dataUrl,
          mimeType: file.type || 'image/jpeg',
          qrPayload: null,
        });
      };
      img.onload = () => {
        try {
          const qrPayload = decodeSlipQrCode(img);

          const maxDim = 1280;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              blob: file,
              base64: dataUrl,
              mimeType: file.type || 'image/jpeg',
              qrPayload,
            });
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          canvas.toBlob(
            (blob) => {
              resolve({
                blob: blob || file,
                base64: compressedBase64,
                mimeType: 'image/jpeg',
                qrPayload,
              });
            },
            'image/jpeg',
            0.85
          );
        } catch (err) {
          resolve({
            blob: file,
            base64: dataUrl,
            mimeType: file.type || 'image/jpeg',
            qrPayload: null,
          });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function CheckoutClient({
  tool,
  userEmail,
  userId,
  alreadyOwned = false,
  initialOrder = null,
}: {
  tool: any;
  userEmail: string;
  userId: string;
  alreadyOwned?: boolean;
  initialOrder?: any;
}) {
  const hasInitialPending = initialOrder?.status === 'pending';
  const [step, setStep] = useState(hasInitialPending ? 3 : 2);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialOrder?.slip_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>(
    initialOrder?.status === 'pending'
      ? 'pending'
      : initialOrder?.status === 'rejected'
      ? 'rejected'
      : 'idle'
  );
  const cleanInitialNote = initialOrder?.admin_note
    ? String(initialOrder.admin_note).replace(/\[[A-Z0-9_-]+[^\]]*\]/g, '').trim()
    : '';
  const [rejectionNote, setRejectionNote] = useState<string>(cleanInitialNote);
  const router = useRouter();

  const posterImage = tool.poster_url || null;
  const isCourse = tool.slug === 'tiktok-ai-affiliate' || tool.category === 'course';
  const destinationUrl = isCourse ? `/course/${tool.slug}` : `/tool/${tool.slug}`;

  // Clean price display without duplicate 'บาท'
  const rawPrice = String(tool.price || '0').replace(/[^0-9.]/g, '');
  const numericPrice = parseFloat(rawPrice) || 0;
  const displayPrice = numericPrice > 0 ? numericPrice.toLocaleString() : String(tool.price || '0').replace(/บาท/g, '').trim();
  const priceInfo = getPriceInfo(tool.price, tool.features);

  // Real-time 5-second auto-polling while waiting on Step 3
  useEffect(() => {
    if (step !== 3 || orderStatus !== 'pending' || !tool?.id) return;

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/orders?toolId=${encodeURIComponent(tool.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.hasAccess || data.latestOrder?.status === 'approved') {
          setOrderStatus('approved');
          router.refresh();
        } else if (data.latestOrder?.status === 'rejected') {
          setOrderStatus('rejected');
          setRejectionNote(
            data.latestOrder.admin_note ||
              'ภาพหลักฐานการโอนเงิน (สลิป) ไม่ถูกต้อง หรือยอดเงินไม่ตรงกับรายการสั่งซื้อ'
          );
        }
      } catch (err) {
        // Ignore transient network errors during polling
      }
    };

    const interval = setInterval(checkOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [step, orderStatus, tool?.id, router]);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(PROMPTPAY_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Generate Dynamic PromptPay QR Code that locks the exact price
  useEffect(() => {
    let active = true;
    const payload = generatePromptPayPayload(PROMPTPAY_ID, numericPrice > 0 ? numericPrice : undefined);
    QRCode.toDataURL(payload, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0A2246',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => console.error('Failed to generate PromptPay QR:', err));
    return () => {
      active = false;
    };
  }, [numericPrice]);

  // Download a complete Thai QR Payment Card PNG for mobile banking apps ("Scan from Gallery")
  const handleDownloadQrCard = async () => {
    if (!qrDataUrl) return;
    setDownloadingQr(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 980;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // White card background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Navy Thai QR Payment top header bar
      ctx.fillStyle = '#113566';
      ctx.fillRect(0, 0, canvas.width, 130);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THAI QR PAYMENT · พร้อมเพย์', canvas.width / 2, 65);

      ctx.fillStyle = '#93C5FD';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('สแกนจ่ายได้ทุกแอปธนาคาร (ล็อกยอดโอนอัตโนมัติ)', canvas.width / 2, 105);

      // Draw QR Code in the center
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR load failed'));
        qrImg.src = qrDataUrl;
      });

      const qrSize = 480;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 165;

      // Subtle border around QR
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Receiver Name & PromptPay Info
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`ชื่อบัญชี: ${PROMPTPAY_RECEIVER_NAME}`, canvas.width / 2, 715);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`พร้อมเพย์: ${PROMPTPAY_DISPLAY}`, canvas.width / 2, 760);

      // Amount Pill
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(90, 800, canvas.width - 180, 96);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 800, canvas.width - 180, 96);

      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(`ยอดโอน: ฿${displayPrice}.00 บาท`, canvas.width / 2, 862);

      ctx.fillStyle = '#64748B';
      ctx.font = '20px sans-serif';
      ctx.fillText('PUP PAP AI — หลังโอนเสร็จ กรุณาแนบสลิปที่หน้าเว็บไซต์เพื่อรับสิทธิ์ทันที', canvas.width / 2, 945);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PromptPay_${numericPrice || displayPrice}THB_PUPPAP_AI.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download QR card:', e);
    } finally {
      setDownloadingQr(false);
    }
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
      // 1. Compress & sanitize slip image on client
      const prepared = await prepareSlipImage(file);
      const supabase = createClient();
      const safeFileName = `${userId}_${Date.now()}.jpg`;

      let slipUrl = '';

      // 2. Try direct upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(safeFileName, prepared.blob, {
          contentType: prepared.mimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(safeFileName);
        slipUrl = publicUrl;
      } else {
        console.warn('Direct client storage upload failed, using server fallback:', uploadError.message);
      }

      // 3. Submit order (includes base64 + QR payload for 7-Layer AI Anti-Fraud Verification)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          amount: numericPrice,
          slipUrl,
          slipBase64: prepared.base64,
          slipMimeType: prepared.mimeType,
          qrPayload: prepared.qrPayload,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.alreadyOwned) {
          setOrderStatus('approved');
          setStep(3);
          return;
        }
        throw new Error(result.error || 'ไม่สามารถส่งข้อมูลสลิปได้ กรุณาลองใหม่อีกครั้ง');
      }

      if (result.slip_url) {
        setPreview(result.slip_url);
      }

      // Handle instant AI verification decision
      if (result.status === 'approved') {
        setOrderStatus('approved');
        setRejectionNote('');
        setStep(3);
        router.refresh();
        return;
      }

      if (result.status === 'rejected') {
        setOrderStatus('rejected');
        setRejectionNote(
          result.rejection_reason ||
            'สลิปไม่ผ่านการตรวจสอบอัตโนมัติ กรุณาแนบรูปสลิปที่โอนสำเร็จและชัดเจนอีกครั้งครับ'
        );
        setFile(null);
        setStep(2);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      setOrderStatus('pending');
      setRejectionNote('');
      setStep(3);
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`เกิดข้อผิดพลาด: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (alreadyOwned) {
    return (
      <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6 py-10 sm:py-16 transition-colors duration-200">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="puppap-btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
              <span>← กลับหน้าแดชบอร์ด</span>
            </Link>
            <ThemeToggle size="sm" />
          </div>

          <div className="puppap-card p-6 sm:p-10 text-center space-y-5 border-2 border-emerald-500/50 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-3xl font-black mx-auto">
              ✓
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                ✅ ปลดล็อกแล้ว · สิทธิ์ใช้งานตลอดชีพ
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                คุณมีสิทธิ์ใช้งาน &quot;{tool.name}&quot; อยู่แล้ว!
              </h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                บัญชีอีเมล <strong className="text-[var(--text-primary)]">{userEmail}</strong> ได้รับสิทธิ์ใช้งานรายการนี้เรียบร้อยแล้ว ไม่จำเป็นต้องชำระเงินหรือสั่งซื้อซ้ำครับ
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              {tool.flow_url && (
                <a
                  href={tool.flow_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="puppap-btn-primary px-6 py-3.5 text-sm font-black shadow-md flex items-center justify-center gap-2"
                >
                  <span>🚀 เปิดใช้ Flow Tool ทันที</span>
                </a>
              )}
              <Link
                href={destinationUrl}
                className={`${tool.flow_url ? 'puppap-btn-secondary' : 'puppap-btn-primary'} px-6 py-3.5 text-sm font-bold flex items-center justify-center gap-2`}
              >
                <span>📖 {isCourse ? 'เข้าสู่ห้องเรียน' : 'เปิดดูคู่มือ & ลิงก์ใช้งาน'}</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-[var(--border-light)]">
              <Link href="/" className="text-xs font-bold text-[var(--accent)] hover:underline">
                ← กลับไปยังหน้าแดชบอร์ดหลักของคุณ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6 py-10 sm:py-12 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Top Back & Theme Toggle */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="puppap-btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <span>← กลับหน้าหลัก</span>
          </Link>
          <ThemeToggle size="sm" />
        </div>

        {/* Returning Customer Helper Notice */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
            <strong className="text-amber-800 dark:text-amber-300">💡 เคยซื้อรายการนี้ไปแล้วใช่ไหมครับ?</strong>
            <p className="text-[var(--text-secondary)] mt-0.5">
              หากคุณมีรหัสผ่านเดิม หรือ License Key อยู่แล้ว ไม่ต้องโอนเงินซ้ำ กดปุ่มด้านขวาเพื่อกรอกรหัสปลดล็อกได้เลยครับ (ขณะนี้ล็อกอินด้วย: <strong>{userEmail}</strong>)
            </p>
          </div>
          <Link
            href={isCourse ? '/#unlock-box' : `/tool/${tool.slug}`}
            className="puppap-btn-secondary px-3.5 py-2 text-xs font-bold shrink-0 self-end sm:self-center"
          >
            🔑 ไปหน้ากรอกรหัสปลดล็อก
          </Link>
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

              {orderStatus === 'rejected' && (
                <div className="p-4 rounded-xl bg-red-500/15 border-2 border-red-500/40 text-left space-y-1">
                  <div className="text-sm font-black text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>สลิปก่อนหน้านี้ไม่ผ่านการตรวจสอบ กรุณาแนบรูปสลิปใหม่อีกครั้งครับ</span>
                  </div>
                  {rejectionNote && (
                    <p className="text-xs text-[var(--text-secondary)] pl-6">
                      เหตุผลจากแอดมิน: <strong>{rejectionNote}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Dynamic Thai PromptPay QR Code Card - Locks Exact Amount Automatically */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-deep)] border-2 border-[var(--border)] space-y-4 shadow-sm text-center">
                {/* Official Thai QR Payment Header Banner */}
                <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#113566]/30 bg-white shadow-lg">
                  <div className="bg-[#113566] text-white py-2.5 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇹🇭</span>
                      <span className="font-black tracking-wide text-sm sm:text-base">
                        THAI QR PAYMENT
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/15 text-[11px] font-bold tracking-wider">
                      PromptPay
                    </span>
                  </div>

                  {/* QR Code Image Container */}
                  <div className="p-4 sm:p-5 flex flex-col items-center bg-white">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`PromptPay QR ${displayPrice} THB`}
                        className="w-52 h-52 sm:w-56 sm:h-56 object-contain select-all"
                      />
                    ) : (
                      <div className="w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs font-semibold">
                        กำลังสร้าง QR Code...
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-200 w-full text-center space-y-0.5">
                      <div className="text-xs font-bold text-slate-500">
                        สแกนจ่ายได้ทุกแอปธนาคาร (ล็อกยอดอัตโนมัติ)
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {PROMPTPAY_RECEIVER_NAME}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-600">
                        พร้อมเพย์: {PROMPTPAY_DISPLAY}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Locked Amount Highlight Banner */}
                <div className="pt-1 flex flex-col items-center gap-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold">
                    <span>🔒</span>
                    <span>ล็อกยอดโอนอัตโนมัติ (สแกนแล้วกดโอนได้ทันที ไม่ต้องกรอกตัวเลข)</span>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                    {priceInfo.hasPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm text-[var(--text-muted)] line-through font-semibold">
                          ปกติ ฿{priceInfo.formattedOriginal}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black">
                          ลด {priceInfo.discountPercent}%
                        </span>
                      </div>
                    )}
                    <span className="text-base sm:text-lg font-bold text-[var(--text-secondary)]">
                      💰 ยอดชำระ:
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[var(--accent)]">
                      ฿{displayPrice}.00
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                      บาท
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Save QR Image (for mobile users) + Copy PromptPay Number */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQrCard}
                    disabled={!qrDataUrl || downloadingQr}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#113566] hover:bg-[#1a498b] text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <span>💾</span>
                    <span>{downloadingQr ? 'กำลังบันทึกรูป...' : 'บันทึกรูป QR ลงมือถือ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 border ${
                      copied
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-[var(--bg-primary)] hover:border-[var(--accent)] text-[var(--text-primary)] border-[var(--border)]'
                    }`}
                  >
                    <span>{copied ? '✅' : '📋'}</span>
                    <span>
                      {copied ? 'คัดลอกเบอร์พร้อมเพย์แล้ว!' : `คัดลอกพร้อมเพย์ (${PROMPTPAY_DISPLAY})`}
                    </span>
                  </button>
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
                    <span>🤖 AI กำลังตรวจสอบสลิปและเปิดสิทธิ์อัตโนมัติ (3–5 วินาที)...</span>
                  </>
                ) : !file ? (
                  <span>⚠️ กรุณาแนบสลิปก่อนกดยืนยัน</span>
                ) : (
                  <>
                    <span>📤 ส่งสลิปเพื่อตรวจสอบและเปิดสิทธิ์ทันที</span>
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: รอตรวจสอบแบบ Real-time / อนุมัติแล้ว / ปฏิเสธ */}
          {step === 3 && (
            <div className="text-center space-y-6 py-4 sm:py-6">
              {orderStatus === 'approved' ? (
                /* 🎉 สถานะ: อนุมัติเรียบร้อยแล้ว (Real-time Auto-Unlock) */
                <div className="space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg">
                    🎉
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      ✅ อนุมัติสำเร็จ · ปลดล็อกสิทธิ์ตลอดชีพแล้ว!
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      ยินดีต้อนรับ! เริ่มเข้าเรียนได้ทันที
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                      แอดมินตรวจสอบสลิปและเปิดสิทธิ์ <strong className="text-[var(--text-primary)]">{tool.name}</strong> ให้บัญชี <strong>{userEmail}</strong> เรียบร้อยแล้วครับ
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href={destinationUrl}
                      className="puppap-btn-primary px-8 py-4 text-base font-black shadow-xl w-full sm:w-auto text-center flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                    >
                      <span>🚀 {isCourse ? 'กดตรงนี้เพื่อเข้าสู่ห้องเรียนทันที' : 'กดตรงนี้เพื่อเข้าใช้งานเครื่องมือทันที'}</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : orderStatus === 'rejected' ? (
                /* ⚠️ สถานะ: สลิปถูกปฏิเสธ (ให้แนบสลิปใหม่ได้ทันทีโดยไม่หลุดจากหน้าซื้อ) */
                <div className="space-y-5">
                  <div className="w-20 h-20 bg-red-500/15 border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-md">
                    ⚠️
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                      สลิปไม่ผ่านการตรวจสอบ
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      ไม่ต้องกังวลใจครับ คุณสามารถกดปุ่มด้านล่างเพื่อแนบรูปสลิปที่ถูกต้องใหม่อีกครั้งได้ทันที
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-left max-w-md mx-auto space-y-1">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">
                      📝 เหตุผลจากเจ้าหน้าที่:
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium">
                      {rejectionNote || 'ภาพหลักฐานการโอนเงิน (สลิป) ไม่ชัดเจน หรือยอดเงินไม่ตรงกับรายการสั่งซื้อ'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setStep(2);
                      }}
                      className="puppap-btn-primary px-8 py-3.5 text-sm sm:text-base font-black shadow-lg w-full sm:w-auto text-center"
                    >
                      🔄 กดเพื่อแนบสลิปใหม่อีกครั้ง
                    </button>
                    <a
                      href="https://m.me/100083126689322"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="puppap-btn-secondary px-6 py-3.5 text-xs sm:text-sm font-bold w-full sm:w-auto text-center"
                    >
                      💬 ทักแชทติดต่อแอดมิน
                    </a>
                  </div>
                </div>
              ) : (
                /* ⏳ สถานะ: กำลังรอตรวจสอบ (เช็กสถานะอัตโนมัติทุก 5 วินาที) */
                <div className="space-y-5">
                  <div className="w-20 h-20 bg-emerald-500/15 border-2 border-emerald-500 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-md">
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      ส่งสลิปเรียบร้อยแล้ว!
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span>กำลังตรวจสอบสลิปอัตโนมัติ... (หน้านี้จะเปลี่ยนเป็นปุ่มเข้าเรียนทันทีเมื่ออนุมัติ)</span>
                    </div>
                  </div>

                  {preview && (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="max-h-40 rounded-xl overflow-hidden border border-[var(--border)] shadow-sm bg-white">
                        <img src={preview} alt="Uploaded slip" className="max-h-40 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setStep(2);
                        }}
                        className="text-xs text-[var(--accent)] hover:underline font-bold"
                      >
                        🔄 แนบสลิปผิดรูป? กดตรงนี้เพื่อเปลี่ยนรูปสลิปใหม่
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)] bg-[var(--bg-deep)] border border-[var(--border-light)] p-5 sm:p-6 rounded-2xl inline-block text-left shadow-xs">
                    <p className="flex items-center gap-2">
                      <span>⏳</span>
                      <span>ทีมงานได้รับรูปสลิปแล้ว ใช้เวลาตรวจสอบเพียง 1–5 นาที</span>
                    </p>
                    <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                      <span>⚡</span>
                      <span>เปิดหน้านี้ค้างไว้ได้เลย ทันทีที่อนุมัติ ปุ่ม <strong>&quot;เข้าสู่ห้องเรียน&quot;</strong> จะเด้งขึ้นมาอัตโนมัติ</span>
                    </p>
                    <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>📧</span>
                      <span>และมีอีเมลยืนยันส่งไปที่ {userEmail} อีกหนึ่งช่องทางครับ</span>
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/"
                      className="puppap-btn-primary px-8 py-3 text-sm font-bold shadow-md w-full sm:w-auto text-center"
                    >
                      กลับหน้าแดชบอร์ด →
                    </Link>
                    <a
                      href="https://m.me/100083126689322"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="puppap-btn-secondary px-6 py-3 text-sm font-semibold w-full sm:w-auto text-center"
                    >
                      💬 ทักแชทแจ้งแอดมิน
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
