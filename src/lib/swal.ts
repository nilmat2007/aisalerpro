import Swal from 'sweetalert2'

// Dark theme config
const darkTheme = {
  background: '#0f172a',
  color: '#e2e8f0',
  confirmButtonColor: '#06b6d4',
  cancelButtonColor: '#475569',
  customClass: {
    popup: 'rounded-xl border border-slate-700',
    confirmButton: 'rounded-lg px-6',
    cancelButton: 'rounded-lg px-6',
  }
}

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1e293b',
  color: '#e2e8f0',
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

export function showSuccess(title: string, text?: string) {
  return Toast.fire({ icon: 'success', title, text })
}

export function showError(title: string, text?: string) {
  return Toast.fire({ icon: 'error', title, text })
}

export function showInfo(title: string, text?: string) {
  return Toast.fire({ icon: 'info', title, text })
}

export async function showConfirm(title: string, text?: string) {
  const result = await Swal.fire({
    ...darkTheme,
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })
  return result.isConfirmed
}

export async function showConfirmDelete(itemName: string) {
  const result = await Swal.fire({
    ...darkTheme,
    icon: 'warning',
    title: 'ยืนยันการลบ?',
    html: `คุณต้องการลบ <strong class="text-red-400">${itemName}</strong> ใช่หรือไม่?<br><small class="text-slate-400">การกระทำนี้ไม่สามารถย้อนกลับได้</small>`,
    showCancelButton: true,
    confirmButtonText: '🗑️ ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#ef4444',
    reverseButtons: true,
  })
  return result.isConfirmed
}

export async function showLoading(title = 'กำลังดำเนินการ...') {
  Swal.fire({
    ...darkTheme,
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

export function closeLoading() {
  Swal.close()
}

export async function showInputPrompt(title: string, placeholder?: string) {
  const result = await Swal.fire({
    ...darkTheme,
    title,
    input: 'textarea',
    inputPlaceholder: placeholder || '',
    inputAttributes: {
      style: 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px'
    },
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })
  return result.isConfirmed ? result.value : null
}
