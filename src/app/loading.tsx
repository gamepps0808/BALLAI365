/**
 * Skeleton ระหว่าง server render (force-dynamic ทุกหน้า) — โครงเรืองแสงตามเลย์เอาต์จริง
 * ผู้ใช้เห็น "เว็บกำลังมา" ทันที แทนจอเปล่า → ความรู้สึกไวขึ้นมาก
 */
export default function Loading() {
  return (
    <main className="animate-fade-up space-y-4 p-4 lg:p-6">
      {/* แถบหัวเรื่อง */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-3 w-56" />
        </div>
        <div className="skeleton h-9 w-28 rounded-full" />
      </div>

      {/* การ์ดสถิติแถวบน */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[68px]" />
        ))}
      </div>

      {/* การ์ดบอลเด่น (ใหญ่) + แผงขวา */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="skeleton h-64" />
          <div className="grid grid-cols-3 gap-3">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
          <div className="skeleton h-40" />
        </div>
        <div className="hidden space-y-3 xl:block">
          <div className="skeleton h-48" />
          <div className="skeleton h-32" />
          <div className="skeleton h-40" />
        </div>
      </div>

      <p className="text-center text-[11px] text-[var(--text-muted)]">
        กำลังโหลดข้อมูลวิเคราะห์ล่าสุด…
      </p>
    </main>
  );
}
