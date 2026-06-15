/** Global loading skeleton — glassmorphism shimmer cards. */
export default function Loading() {
  return (
    <main className="animate-pulse space-y-4 p-4 lg:p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass h-[68px]" />
        ))}
      </div>
      <div className="glass h-[420px]" />
      <div className="glass h-[280px]" />
    </main>
  );
}
