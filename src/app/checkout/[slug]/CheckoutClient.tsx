'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutClient({ tool, userEmail, userId }: { tool: any, userEmail: string, userId: string }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const posterImage = tool.slug === 'ugc-batch' ? '/images/poster-ugc-batch.jpg' 
    : tool.slug === 'ai-content-factory' ? '/images/poster-ai-content-factory.jpg' 
    : null;

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
      
      // อัปโหลดสลิป
      const { error: uploadError } = await supabase.storage.from('slips').upload(fileName, file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        // ถ้า upload ไม่ได้ ให้ส่ง order โดยไม่มีรูป (แจ้ง admin ทีหลัง)
        slipUrl = 'upload-failed';
      } else {
        const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(fileName);
        slipUrl = publicUrl;
      }

      // แปลงราคาเป็นตัวเลข
      const numericPrice = parseFloat(String(tool.price).replace(/[^0-9.]/g, '')) || 0;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          amount: numericPrice,
          slipUrl: slipUrl
        })
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
    <div className="min-h-screen bg-slate-950 text-white p-6 py-12">
      <div className="max-w-2xl mx-auto">
        
        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4 text-sm font-bold">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>1</div>
            <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>2</div>
            <div className={`h-1 w-12 rounded ${step >= 3 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>3</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-xl">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4">สรุปคำสั่งซื้อ</h2>
              
              <div className="flex flex-col md:flex-row gap-6">
                {posterImage ? (
                  <div className="w-full md:w-1/3 aspect-[3/4] rounded-xl overflow-hidden relative">
                    <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full md:w-1/3 aspect-[3/4] bg-slate-800 rounded-xl flex items-center justify-center text-6xl">
                    {tool.icon || '🛠️'}
                  </div>
                )}
                
                <div className="flex-1 flex flex-col">
                  <h3 className="text-xl font-bold mb-2 text-cyan-400">{tool.name}</h3>
                  <p className="text-slate-400 mb-6 flex-grow">{tool.description}</p>
                  
                  <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                    <span className="text-slate-500">ยอดชำระ</span>
                    <span className="text-3xl font-bold text-amber-400">฿{tool.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 mt-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                ดำเนินการชำระเงิน
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4 flex items-center gap-2">
                <span onClick={() => setStep(1)} className="cursor-pointer text-slate-500 hover:text-cyan-400">←</span>
                ชำระเงิน
              </h2>

              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
                <div className="text-xl font-bold text-amber-400">🏦 ธนาคารกรุงศรี (Krungsri)</div>
                <div className="text-lg">👤 ชื่อบัญชี: ภีมทพัฒน์ นิลมาตย์</div>
                <div className="text-2xl font-mono bg-slate-950 py-3 rounded-lg flex items-center justify-center gap-4">
                  775-1-16804-7
                  <button 
                    onClick={() => navigator.clipboard.writeText('7751168047')}
                    className="text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700 text-amber-400"
                  >
                    คัดลอก
                  </button>
                </div>
                <div className="text-xl text-white font-bold">
                  💰 จำนวนเงิน: <span className="text-amber-400">{tool.price?.toLocaleString()}</span> บาท
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <label className="block text-slate-300 font-semibold mb-2">อัปโหลดสลิปโอนเงิน</label>
                
                <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-8 text-center transition-colors">
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {preview ? (
                    <div className="flex flex-col items-center">
                      <img src={preview} alt="Slip preview" className="max-h-48 rounded-lg mb-4" />
                      <span className="text-cyan-400 text-sm">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2">
                      <span className="text-4xl">📸</span>
                      <span>คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่</span>
                      <span className="text-sm text-slate-500">รองรับ jpg, png, webp</span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full py-4 mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin text-xl">↻</span> กำลังอัปโหลด...
                  </>
                ) : (
                  <>📤 ส่งสลิปยืนยัน</>
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                ✓
              </div>
              <h2 className="text-3xl font-bold text-green-400">ส่งสลิปเรียบร้อยแล้ว!</h2>
              <div className="space-y-2 text-slate-300 bg-slate-800/50 p-6 rounded-xl inline-block text-left">
                <p>⏳ ทีมงานจะตรวจสอบและอนุมัติภายใน 5-15 นาที</p>
                <p>✨ เมื่ออนุมัติแล้ว ระบบจะปลดล็อกเครื่องมือให้อัตโนมัติ</p>
              </div>
              
              <div className="pt-8">
                <Link 
                  href="/"
                  className="inline-block px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                >
                  กลับหน้าหลัก →
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
