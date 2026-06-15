"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/** Data freshness indicator — required on every page (UI/UX rule #14-15). */
export function Freshness() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
      <RefreshCw size={11} />
      อัปเดตล่าสุด {time ?? "--:--:--"}
    </span>
  );
}
