export default function RootLoading() {
  return (
    <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="max-w-6xl mx-auto puppap-card p-4 sm:p-5 mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl puppap-skeleton shrink-0" />
          <div className="space-y-2">
            <div className="w-40 h-5 puppap-skeleton" />
            <div className="w-56 h-3.5 puppap-skeleton" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-24 h-8 rounded-full puppap-skeleton hidden sm:block" />
          <div className="w-28 h-8 rounded-full puppap-skeleton hidden sm:block" />
          <div className="w-9 h-9 rounded-full puppap-skeleton" />
        </div>
      </div>

      {/* Featured Course Banner Skeleton */}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="puppap-card p-6 sm:p-8 border-2 border-[var(--border-accent)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-32 h-6 rounded-full puppap-skeleton" />
              <div className="w-48 h-6 rounded-full puppap-skeleton" />
            </div>
            <div className="w-3/4 h-8 puppap-skeleton" />
            <div className="w-full max-w-xl h-4 puppap-skeleton" />
          </div>
          <div className="flex flex-col gap-3 w-full lg:w-72 shrink-0">
            <div className="w-full h-12 rounded-xl puppap-skeleton" />
            <div className="w-full h-10 rounded-xl puppap-skeleton" />
          </div>
        </div>

        {/* Tools Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="puppap-card overflow-hidden flex flex-col">
              <div className="aspect-[16/10] w-full puppap-skeleton rounded-none" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl puppap-skeleton shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="w-3/4 h-4 puppap-skeleton" />
                    <div className="w-1/2 h-3 puppap-skeleton" />
                  </div>
                </div>
                <div className="w-full h-3.5 puppap-skeleton" />
                <div className="w-5/6 h-3.5 puppap-skeleton" />
                <div className="pt-2 flex gap-2">
                  <div className="w-20 h-10 rounded-xl puppap-skeleton" />
                  <div className="flex-1 h-10 rounded-xl puppap-skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
