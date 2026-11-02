export default function FlowToolsLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-light)] h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl puppap-skeleton" />
            <div className="w-36 h-5 puppap-skeleton" />
          </div>
          <div className="w-28 h-8 rounded-xl puppap-skeleton" />
        </div>
      </header>

      <section className="py-12 px-4 sm:px-6 border-b border-[var(--border-light)] text-center space-y-4 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-bold">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span>กำลังเปิดคลังเครื่องมือ Google Flow...</span>
        </div>
        <div className="w-72 h-10 puppap-skeleton" />
        <div className="w-full max-w-lg h-4 puppap-skeleton" />
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="puppap-card overflow-hidden flex flex-col">
              <div className="aspect-[16/10] w-full puppap-skeleton rounded-none" />
              <div className="p-5 space-y-3">
                <div className="w-3/4 h-5 puppap-skeleton" />
                <div className="w-full h-3.5 puppap-skeleton" />
                <div className="w-full h-10 rounded-xl puppap-skeleton mt-2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
