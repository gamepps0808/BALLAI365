import { Topbar } from "@/components/layout/Topbar";
import { Disclaimer } from "./Disclaimer";
import { Inbox } from "lucide-react";

/** Empty state page — used while a section waits for real API data. */
export function EmptyPage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main>
      <Topbar title={title} />
      <div className="space-y-4 p-4 lg:p-6">
        <div className="glass flex flex-col items-center gap-3 p-14 text-center">
          <Inbox size={36} className="text-[var(--text-muted)]" />
          <p className="text-[13px] text-[var(--text-secondary)]">{message}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            ส่วนนี้จะแสดงข้อมูลจริงเมื่อเชื่อมต่อ API Provider แล้ว (ตั้งค่าใน Admin Panel)
          </p>
        </div>
        <Disclaimer />
      </div>
    </main>
  );
}
