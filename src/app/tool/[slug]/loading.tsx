export default function ToolGuideLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)] pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-6 flex justify-between items-center">
        <div className="w-28 h-8 rounded-xl puppap-skeleton" />
        <div className="w-9 h-9 rounded-full puppap-skeleton" />
      </div>

      <div className="text-center pt-8 pb-10 px-4 flex flex-col items-center space-y-4">
        <div className="w-28 h-28 rounded-3xl puppap-skeleton" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-bold">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span>กำลังโหลดคู่มือและลิงก์เครื่องมือ Flow...</span>
        </div>
        <div className="w-64 h-9 puppap-skeleton" />
        <div className="w-full max-w-md h-4 puppap-skeleton" />
        <div className="w-full max-w-xl h-40 rounded-2xl puppap-skeleton mt-4" />
      </div>
    </div>
  );
}
