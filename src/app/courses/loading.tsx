export default function CoursesLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      {/* Navbar Skeleton */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-light)] h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl puppap-skeleton" />
            <div className="w-36 h-5 puppap-skeleton" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-9 rounded-xl puppap-skeleton" />
          </div>
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-b border-[var(--border-light)]">
        <div className="max-w-3xl mx-auto text-center space-y-4 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-bold">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            <span>กำลังโหลดข้อมูลคอร์สเรียน 22 บทเรียน...</span>
          </div>
          <div className="w-3/4 max-w-lg h-10 puppap-skeleton" />
          <div className="w-full max-w-xl h-4 puppap-skeleton" />
          <div className="grid grid-cols-3 gap-3 w-full max-w-xl pt-3">
            <div className="puppap-card p-4 h-20 puppap-skeleton" />
            <div className="puppap-card p-4 h-20 puppap-skeleton" />
            <div className="puppap-card p-4 h-20 puppap-skeleton" />
          </div>
          <div className="w-64 h-12 rounded-xl puppap-skeleton mt-2" />
        </div>
      </section>

      {/* Curriculum Modules Skeleton */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-4">
        {[1, 2, 3, 4, 5].map((mod) => (
          <div key={mod} className="puppap-card p-5 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="w-2/3 h-5 puppap-skeleton" />
              <div className="w-16 h-6 rounded-full puppap-skeleton" />
            </div>
            <div className="w-1/2 h-3.5 puppap-skeleton" />
          </div>
        ))}
      </main>
    </div>
  );
}
