import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <SearchX size={40} className="text-[var(--text-muted)]" />
      <h1 className="text-lg font-bold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-[13px] text-[var(--text-secondary)]">
        คู่แข่งขันหรือหน้านี้อาจถูกลบ หรือยังไม่มีข้อมูล
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[var(--neon-blue)] px-5 py-2 text-[13px] font-semibold text-white"
      >
        กลับหน้าหลัก
      </Link>
    </main>
  );
}
