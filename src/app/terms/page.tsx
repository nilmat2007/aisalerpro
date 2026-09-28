export const dynamic = 'force-dynamic'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">ข้อกำหนดการใช้บริการ</h1>
        <p className="text-slate-500 mb-8">Terms of Service — PHEEM AI TOOLKIT</p>
        <p className="text-slate-400 text-sm mb-8">อัปเดตล่าสุด: 28 กันยายน 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">1. การยอมรับข้อกำหนด</h2>
            <p>การใช้งาน PHEEM AI TOOLKIT ถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขทั้งหมดในเอกสารนี้ หากคุณไม่ยอมรับ กรุณาหยุดใช้บริการ</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">2. การให้บริการ</h2>
            <p>PHEEM AI TOOLKIT เป็นแพลตฟอร์มรวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอ โดยให้บริการในรูปแบบ:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ซื้อขาดตลอดชีพ (Lifetime License) — จ่ายครั้งเดียวใช้ได้ตลอดไป</li>
              <li>รับอัปเดตฟรีตลอดชีพสำหรับเครื่องมือที่ซื้อแล้ว</li>
              <li>ระบบทดลองใช้ฟรี (จำกัด 3 คลิป)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">3. บัญชีผู้ใช้</h2>
            <p>คุณต้องลงทะเบียนด้วย Google Account เพื่อใช้บริการ คุณมีหน้าที่รักษาความปลอดภัยของบัญชีและไม่แบ่งปัน License Key กับผู้อื่น</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">4. การชำระเงิน</h2>
            <p>การชำระเงินสามารถทำได้ผ่านการโอนเงินผ่านธนาคาร เมื่อชำระเงินแล้วและได้รับการยืนยันจากแอดมิน ระบบจะออก License Key และปลดล็อกเครื่องมือให้อัตโนมัติ</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">5. การคืนเงิน</h2>
            <p>เนื่องจากเป็นสินค้าดิจิทัล เราไม่รับคืนเงินหลังจากที่ License Key ถูกเปิดใช้งานแล้ว กรุณาทดลองใช้ฟรีก่อนตัดสินใจซื้อ</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">6. ข้อจำกัดการใช้งาน</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ห้ามแชร์ ขายต่อ หรือโอน License Key ให้ผู้อื่น</li>
              <li>ห้ามใช้เครื่องมือเพื่อสร้างเนื้อหาที่ผิดกฎหมายหรือไม่เหมาะสม</li>
              <li>ห้ามพยายามเจาะระบบหรือใช้ช่องโหว่ของระบบ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">7. การยกเลิกสิทธิ์</h2>
            <p>เราขอสงวนสิทธิ์ในการยกเลิกการเข้าถึงเครื่องมือของผู้ใช้ที่ละเมิดข้อกำหนดเหล่านี้ โดยไม่ต้องแจ้งล่วงหน้า</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">8. การเปลี่ยนแปลงข้อกำหนด</h2>
            <p>เราอาจปรับปรุงข้อกำหนดเหล่านี้เป็นครั้งคราว การใช้บริการต่อหลังจากมีการเปลี่ยนแปลง ถือว่าคุณยอมรับข้อกำหนดใหม่</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">9. ติดต่อเรา</h2>
            <p>หากมีคำถาม สามารถติดต่อได้ที่:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>อีเมล: nilmat200757@gmail.com</li>
              <li>Facebook: <a href="https://m.me/100083126689322" className="text-cyan-400 hover:underline">PHEEM AI TOOLKIT</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          © 2026 PHEEM AI TOOLKIT. All rights reserved.
        </div>
      </div>
    </div>
  )
}
