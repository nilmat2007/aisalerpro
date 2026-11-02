export default function CheckoutLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-28 h-8 rounded-xl puppap-skeleton" />
          <div className="w-9 h-9 rounded-full puppap-skeleton" />
        </div>

        <div className="puppap-card p-6 sm:p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
              กำลังเตรียมหน้าชำระเงินและคิวอาร์โค้ด...
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              กรุณารอสักครู่ ระบบกำลังตรวจสอบสิทธิ์ของคุณ
            </p>
          </div>
          <div className="w-full h-36 rounded-2xl puppap-skeleton" />
          <div className="w-full h-12 rounded-xl puppap-skeleton" />
        </div>
      </div>
    </div>
  );
}
