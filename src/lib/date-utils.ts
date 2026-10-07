/**
 * แปลงวันที่ ISO string เป็นข้อความภาษาไทยที่อ่านง่าย
 * ตัวอย่าง:
 * - "🟢 อัปเดตวันนี้" (< 24 ชม.)
 * - "🟢 อัปเดตเมื่อวาน" (1 วัน)
 * - "🔥 อัปเดตเมื่อ 3 วันที่แล้ว" (2-7 วัน)
 * - "🕒 อัปเดตเมื่อ 28 ก.ย. 2569" (> 7 วัน)
 */
export function formatToolUpdateDate(dateString: string | null | undefined): {
  text: string
  fullDate: string
  isRecent: boolean
} | null {
  if (!dateString) return null

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // วันที่แบบเต็มภาษาไทย เช่น 28 ก.ย. 2569
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const thaiYear = date.getFullYear() + 543
    const fullDate = `${day} ${month} ${thaiYear}`

    // เช็คความสดใหม่
    if (diffHours < 24 && diffHours >= 0) {
      return {
        text: '🟢 อัปเดตวันนี้',
        fullDate,
        isRecent: true
      }
    }

    if (diffDays === 1) {
      return {
        text: '🟢 อัปเดตเมื่อวาน',
        fullDate,
        isRecent: true
      }
    }

    if (diffDays >= 2 && diffDays <= 7) {
      return {
        text: `🔥 อัปเดตเมื่อ ${diffDays} วันที่แล้ว`,
        fullDate,
        isRecent: true
      }
    }

    if (diffDays <= 30) {
      return {
        text: `🕒 อัปเดตเมื่อ ${diffDays} วันที่แล้ว`,
        fullDate,
        isRecent: false
      }
    }

    return {
      text: `🕒 อัปเดต: ${fullDate}`,
      fullDate,
      isRecent: false
    }
  } catch {
    return null
  }
}
