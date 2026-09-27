import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"PHEEM AI TOOLKIT" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    })
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

export function buildToolUpdateEmail(toolName: string, updateNote?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#06b6d4; font-size:24px; margin:0;">🔧 PHEEM AI TOOLKIT</h1>
      <p style="color:#94a3b8; font-size:14px; margin-top:8px;">แจ้งเตือนอัปเดตเครื่องมือ</p>
    </div>

    <!-- Main Card -->
    <div style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border:1px solid #22d3ee33; border-radius:16px; padding:30px; margin-bottom:20px;">
      <div style="background:#06b6d4; color:white; display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; margin-bottom:16px;">
        🆕 อัปเดตใหม่
      </div>
      
      <h2 style="color:#ffffff; font-size:20px; margin:0 0 12px 0;">
        เครื่องมือ "${toolName}" มีอัปเดตใหม่!
      </h2>
      
      <p style="color:#cbd5e1; font-size:14px; line-height:1.6; margin:0 0 20px 0;">
        ${updateNote || `เราได้อัปเดตเครื่องมือ "${toolName}" ให้ดียิ่งขึ้น! เข้าไปลองใช้งานเวอร์ชันใหม่ได้เลยครับ`}
      </p>

      <a href="https://aisalerpro.vercel.app" 
         style="display:inline-block; background:linear-gradient(135deg, #06b6d4, #0891b2); color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        🚀 เข้าใช้งานเลย
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center; padding-top:20px; border-top:1px solid #1e293b;">
      <p style="color:#64748b; font-size:12px; margin:0;">
        คุณได้รับอีเมลนี้เพราะคุณเป็นสมาชิกของ PHEEM AI TOOLKIT<br>
        © 2026 PHEEM AI TOOLKIT. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`
}

export interface TrialFollowUpOptions {
  customerName?: string
  toolName: string
  toolSlug?: string
  toolPrice?: string | number
  customMessage?: string
}

export function buildTrialFollowUpEmail({
  customerName,
  toolName,
  toolSlug,
  toolPrice,
  customMessage
}: TrialFollowUpOptions) {
  const priceDisplay = toolPrice ? `${toolPrice} บาท` : 'ราคาพิเศษ'
  const checkoutUrl = toolSlug 
    ? `https://aisalerpro.vercel.app/checkout/${toolSlug}` 
    : 'https://aisalerpro.vercel.app/store'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0b0f19; font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:620px; margin:0 auto; padding:32px 16px;">
    <!-- Logo & Brand Header -->
    <div style="text-align:center; margin-bottom:28px;">
      <h1 style="color:#06b6d4; font-size:26px; font-weight:800; letter-spacing:1px; margin:0;">PHEEM AI TOOLKIT</h1>
      <p style="color:#94a3b8; font-size:13px; margin:6px 0 0 0; text-transform:uppercase; letter-spacing:2px;">MULTI-PROVIDER STUDIO</p>
    </div>

    <!-- Hero Card -->
    <div style="background:linear-gradient(180deg, #131d33 0%, #0d1527 100%); border:1px solid #06b6d440; border-radius:20px; padding:32px 24px; box-shadow:0 12px 30px rgba(0,0,0,0.5); margin-bottom:20px;">
      <!-- Badge -->
      <div style="display:inline-block; background:linear-gradient(135deg, #f59e0b, #d97706); color:#ffffff; font-size:12px; font-weight:700; padding:5px 14px; border-radius:30px; margin-bottom:18px; text-transform:uppercase; letter-spacing:0.5px;">
        🎁 ข้อเสนอพิเศษสำหรับผู้ทดลองใช้
      </div>

      <h2 style="color:#ffffff; font-size:22px; font-weight:700; line-height:1.4; margin:0 0 14px 0;">
        สวัสดีคุณ ${customerName || 'คนพิเศษ'} 👋<br>
        <span style="color:#38bdf8;">ทดลองใช้ ${toolName} แล้วเป็นอย่างไรบ้างครับ?</span>
      </h2>

      <p style="color:#cbd5e1; font-size:15px; line-height:1.7; margin:0 0 20px 0;">
        ${customMessage || `หวังว่าคุณจะประทับใจกับความง่ายและรวดเร็วของเครื่องมือ <b>${toolName}</b> ในการทำคลิปวิดีโอ! หากคุณต้องการก้าวไปอีกขั้นเพื่อสร้างผลงานได้แบบ <b>ไม่จำกัด</b> วันนี้เราขอมอบข้อเสนอสุดพิเศษให้คุณ`}
      </p>

      <!-- Benefits Box -->
      <div style="background:rgba(6, 182, 212, 0.08); border:1px solid rgba(6, 182, 212, 0.25); border-radius:14px; padding:18px 20px; margin-bottom:24px;">
        <p style="color:#38bdf8; font-size:14px; font-weight:700; margin:0 0 12px 0;">
          ✨ สิทธิพิเศษเมื่อปลดล็อกเวอร์ชันเต็ม (ตลอดชีพ):
        </p>
        <ul style="color:#e2e8f0; font-size:14px; line-height:1.8; margin:0; padding-left:20px;">
          <li><b>สร้างคลิปได้ไม่จำกัด</b> (ไม่มีขีดจำกัด 3 คลิปอีกต่อไป)</li>
          <li><b>ความละเอียดสูงสุด คมชัดระดับ 4K / Full HD</b> ไม่มีลายน้ำ</li>
          <li><b>รับอัปเดตฟรีตลอดชีพ (Lifetime Updates)</b> เมื่อระบบมีฟีเจอร์ใหม่</li>
          <li><b>เข้าห้องซัพพอร์ต VIP</b> คำปรึกษาและเทคนิคทำคอนเทนต์ปิดการขาย</li>
        </ul>
      </div>

      <!-- Price Box -->
      <div style="text-align:center; background:#0a101f; border:1px dashed #38bdf866; border-radius:14px; padding:16px; margin-bottom:24px;">
        <span style="color:#94a3b8; font-size:13px;">ราคาพิเศษ ซื้อขาดตลอดชีพ เพียง</span>
        <div style="color:#10b981; font-size:30px; font-weight:800; margin:4px 0;">
          ${priceDisplay}
        </div>
        <span style="color:#64748b; font-size:12px;">(ไม่มีรายเดือน • จ่ายครั้งเดียวใช้ได้ตลอดไป)</span>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align:center; margin-bottom:16px;">
        <a href="${checkoutUrl}" 
           style="display:inline-block; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#ffffff; font-size:16px; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:12px; box-shadow:0 6px 20px rgba(16, 185, 129, 0.35);">
          🛒 ปลดล็อกเวอร์ชันเต็มทันที
        </a>
      </div>

      <div style="text-align:center;">
        <a href="https://m.me/100083126689322" 
           style="display:inline-block; color:#38bdf8; font-size:14px; font-weight:600; text-decoration:none; padding:6px 12px;">
          💬 หรือทักแชท Facebook เพื่อสั่งซื้อ / สอบถามแอดมิน &rarr;
        </a>
      </div>

      <!-- Bank Transfer Option -->
      <div style="margin-top:24px; padding-top:18px; border-top:1px solid #1e293b; color:#94a3b8; font-size:12px; line-height:1.6; text-align:center;">
        💳 โอนชำระตรงได้ที่: <b>ธ.กรุงศรี</b> เลขที่ <b>775-1-16804-7</b> (ภีมทพัฒน์ นิลมาตย์)<br>
        โอนแล้วส่งสลิปมาทางหน้าเว็บหรือ Messenger ได้ทันที ทีมงานจะเปิดสิทธิ์ให้ทันทีครับ
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center; padding:12px; color:#64748b; font-size:12px; line-height:1.6;">
      <p style="margin:0;">
        PHEEM AI TOOLKIT • ศูนย์รวมเครื่องมือ AI สร้างคอนเทนต์ระดับโปร<br>
        หากมีข้อสงสัย ติดต่อเราได้ทางเพจ Facebook ได้ตลอด 24 ชม.
      </p>
    </div>
  </div>
</body>
</html>`
}

