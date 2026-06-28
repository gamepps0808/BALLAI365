import { Activity, TrendingUp, Target, HeartPulse, ClipboardList, Flame } from "lucide-react";
import type { PredictionFactors } from "@/lib/types";

/**
 * การ์ด 6 ปัจจัยที่ AI ใช้ตัดสิน — แต่ละด้านมีคะแนน 0-10 + เหตุผลสั้น
 * อ่านง่ายกว่าข้อความยาว (form/market/xg/injury/tactical/motivation)
 */
const META = [
  { key: "form", label: "ฟอร์ม", icon: Activity },
  { key: "market", label: "ราคาตลาด", icon: TrendingUp },
  { key: "xg", label: "โอกาสยิง (xG)", icon: Target },
  { key: "injury", label: "ตัวจริง/เจ็บ", icon: HeartPulse },
  { key: "tactical", label: "แทคติก", icon: ClipboardList },
  { key: "motivation", label: "แรงจูงใจ", icon: Flame },
] as const;

function tone(score: number | null): string {
  if (score == null) return "var(--text-muted)";
  if (score >= 7) return "var(--neon-green)";
  if (score >= 4) return "var(--warning)";
  return "var(--danger)";
}

export function AiFactors({ factors }: { factors: PredictionFactors }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {META.map(({ key, label, icon: Icon }) => {
        const f = factors[key];
        const score = f?.score ?? null;
        const c = tone(score);
        return (
          <div key={key} className="glass p-2.5">
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                <Icon size={12} className="shrink-0" /> {label}
              </span>
              <span className="tabular text-[13px] font-extrabold leading-none" style={{ color: c }}>
                {score != null ? score : "—"}
                <span className="text-[9px] font-normal text-[var(--text-muted)]">/10</span>
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-1 rounded-full"
                style={{ width: `${(score ?? 0) * 10}%`, background: c }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-[var(--text-muted)]">
              {f?.noteTh || "ข้อมูลจำกัด"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
