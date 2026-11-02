export default function CourseStudioLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      {/* Studio Header Skeleton */}
      <header className="sticky top-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-light)] h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl puppap-skeleton shrink-0" />
            <div className="space-y-1.5">
              <div className="w-48 sm:w-64 h-4 puppap-skeleton" />
              <div className="w-36 h-3 puppap-skeleton" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-24 h-8 rounded-full puppap-skeleton" />
          </div>
        </div>
      </header>

      {/* Studio Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left: 16:9 Player & Content */}
        <main className="flex-1 min-w-0 space-y-6">
          <div className="w-full aspect-video rounded-2xl border-2 border-[var(--border)] bg-stone-950 flex flex-col items-center justify-center p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin mb-4" />
            <p className="text-white font-bold text-sm sm:text-base">
              🎬 กำลังเปิดห้องเรียนวิดีโอ 16:9...
            </p>
            <p className="text-stone-400 text-xs mt-1">
              กำลังโหลดบทเรียนและชุดคำสั่ง Prompt ประจำบท
            </p>
          </div>

          <div className="puppap-card p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-28 h-10 rounded-xl puppap-skeleton" />
              <div className="w-28 h-10 rounded-full puppap-skeleton" />
            </div>
            <div className="w-44 h-10 rounded-full puppap-skeleton hidden sm:block" />
          </div>

          <div className="puppap-card p-6 space-y-4">
            <div className="w-40 h-4 puppap-skeleton" />
            <div className="w-3/4 h-7 puppap-skeleton" />
            <div className="w-full h-4 puppap-skeleton" />
            <div className="w-5/6 h-4 puppap-skeleton" />
          </div>
        </main>

        {/* Right: Playlist Sidebar (Desktop) */}
        <aside className="hidden lg:block w-88 shrink-0 puppap-card p-5 space-y-4 h-fit">
          <div className="space-y-2 pb-3 border-b border-[var(--border-light)]">
            <div className="w-40 h-4 puppap-skeleton" />
            <div className="w-28 h-3 puppap-skeleton" />
          </div>
          <div className="w-full h-2 rounded-full puppap-skeleton" />
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="w-full h-12 rounded-xl puppap-skeleton" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
