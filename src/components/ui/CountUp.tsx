"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ตัวเลขนับขึ้น 0 → ค่าจริง (ease-out ~0.8s) — ใช้กับคะแนน AI / เปอร์เซ็นต์
 * SSR แสดงค่าจริงทันที (SEO/no-JS ปลอดภัย) แล้วค่อยเล่นตอน mount
 */
export function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return; // เล่นครั้งเดียวตอนโหลด — ค่าที่อัปเดตทีหลังเปลี่ยนตรงๆ
    played.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let start = 0;
    let raf = 0;
    const tick = (now: number) => {
      if (start === 0) start = now; // เฟรมแรก = 0 (ไม่ setState sync ใน effect)
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}
