import { DISCLAIMER_TH, DISCLAIMER_EN } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

/** Legal & safety disclaimer — required on every page. */
export function Disclaimer() {
  return (
    <div className="glass mt-6 flex items-start gap-3 p-4 text-[12px] leading-relaxed text-[var(--text-secondary)]">
      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" />
      <div>
        <p>{DISCLAIMER_TH}</p>
        <p className="mt-1 text-[var(--text-muted)]">{DISCLAIMER_EN}</p>
      </div>
    </div>
  );
}
