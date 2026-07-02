"use client";

import { useEffect, useState } from "react";

/**
 * นับถอยหลังถึงเวลาเตะ — "เตะในอีก 2 ชม. 14 นาที"
 * SSR แสดงค่าว่างก่อน (กัน hydration mismatch เพราะเวลา server ≠ client) แล้วค่อยติ๊กบน client
 * เกินเวลาเตะแล้ว = ไม่แสดง (สถานะ LIVE มีป้ายของตัวเองอยู่แล้ว)
 */
function label(msLeft: number): string | null {
  if (msLeft <= 0) return null;
  const m = Math.floor(msLeft / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `อีก ${d} วัน ${h} ชม.`;
  if (h > 0) return `อีก ${h} ชม. ${mm} น.`;
  if (mm >= 1) return `อีก ${mm} นาที`;
  return "ใกล้เตะแล้ว!";
}

export function KickoffCountdown({ kickoff }: { kickoff: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(kickoff).getTime();
    const update = () => setText(label(target - Date.now()));
    const raf = requestAnimationFrame(update); // อัปเดตแรกนอก effect body (เลี่ยง setState sync)
    const timer = setInterval(update, 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [kickoff]);

  if (!text) return null;
  return (
    <p className="tabular mt-0.5 whitespace-nowrap text-[11px] font-bold text-[var(--warning)]">
      ⏱ {text}
    </p>
  );
}
