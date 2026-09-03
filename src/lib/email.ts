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
