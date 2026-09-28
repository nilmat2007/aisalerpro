export const dynamic = 'force-dynamic'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-slate-500 mb-8">Privacy Policy — PHEEM AI TOOLKIT</p>
        <p className="text-slate-400 text-sm mb-8">อัปเดตล่าสุด: 28 กันยายน 2026</p>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p>เมื่อคุณใช้บริการ PHEEM AI TOOLKIT เราอาจเก็บรวบรวมข้อมูลดังต่อไปนี้:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ชื่อ-นามสกุล และอีเมล (จากการลงทะเบียนผ่าน Google)</li>
              <li>รูปโปรไฟล์จาก Google Account</li>
              <li>ข้อมูลการสั่งซื้อและการชำระเงิน</li>
              <li>ข้อมูลการใช้งานเครื่องมือและ License Key</li>
              <li>ข้อมูลการสนทนาผ่าน Facebook Messenger (Page-Scoped ID, ข้อความ)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p>เราใช้ข้อมูลของคุณเพื่อ:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ให้บริการเครื่องมือ AI และจัดการบัญชีผู้ใช้</li>
              <li>ดำเนินการสั่งซื้อ การชำระเงิน และการจัดส่ง License Key</li>
              <li>ส่งข้อมูลอัปเดต โปรโมชั่น และข้อเสนอพิเศษผ่านอีเมลหรือ Facebook Messenger</li>
              <li>ปรับปรุงบริการและประสบการณ์การใช้งาน</li>
              <li>ติดต่อสื่อสารและให้บริการลูกค้า</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">3. การแบ่งปันข้อมูล</h2>
            <p>เราไม่ขาย ไม่แลกเปลี่ยน หรือโอนข้อมูลส่วนบุคคลของคุณให้กับบุคคลภายนอก ยกเว้น:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ผู้ให้บริการที่เชื่อถือได้ เช่น Google (ระบบล็อกอิน), Supabase (ฐานข้อมูล), Vercel (โฮสติ้ง)</li>
              <li>เมื่อได้รับความยินยอมจากคุณ หรือตามที่กฎหมายกำหนด</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">4. ความปลอดภัยของข้อมูล</h2>
            <p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัส SSL, Row Level Security (RLS) และการจำกัดสิทธิ์การเข้าถึงข้อมูล เพื่อปกป้องข้อมูลส่วนบุคคลของคุณ</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">5. สิทธิ์ของคุณ</h2>
            <p>คุณมีสิทธิ์:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>เข้าถึงและแก้ไขข้อมูลส่วนบุคคลของคุณ</li>
              <li>ขอให้ลบข้อมูลส่วนบุคคลของคุณ</li>
              <li>ยกเลิกการรับข้อความโปรโมชั่น</li>
              <li>ขอสำเนาข้อมูลที่เราเก็บรวบรวมเกี่ยวกับคุณ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">6. การลบข้อมูล</h2>
            <p>หากคุณต้องการให้ลบข้อมูลทั้งหมดของคุณออกจากระบบ สามารถติดต่อเราได้ที่อีเมลด้านล่าง เราจะดำเนินการลบข้อมูลภายใน 30 วัน</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">7. คุกกี้</h2>
            <p>เราใช้คุกกี้เพื่อจัดการเซสชันการล็อกอินและปรับปรุงประสบการณ์การใช้งาน คุณสามารถตั้งค่าเบราว์เซอร์ให้ปฏิเสธคุกกี้ได้ แต่อาจทำให้ฟีเจอร์บางอย่างไม่สามารถใช้งานได้</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">8. การเปลี่ยนแปลงนโยบาย</h2>
            <p>เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว การเปลี่ยนแปลงจะประกาศบนหน้าเว็บนี้พร้อมระบุวันที่อัปเดต</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">9. ติดต่อเรา</h2>
            <p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่:</p>
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
