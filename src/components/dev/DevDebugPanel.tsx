import { Bug } from "lucide-react";
import { EndpointStatus } from "@/lib/types";

const stateStyle: Record<EndpointStatus["state"], string> = {
  ok: "bg-[var(--neon-green-soft)] text-[var(--neon-green)]",
  missing: "bg-[var(--warning-soft)] text-[var(--warning)]",
  error: "bg-[var(--danger-soft)] text-[var(--danger)]",
  skipped: "bg-[rgba(91,108,140,0.18)] text-[var(--text-muted)]",
};

const stateLabel: Record<EndpointStatus["state"], string> = {
  ok: "OK",
  missing: "MISSING",
  error: "ERROR",
  skipped: "SKIPPED",
};

/**
 * Dev Debug Panel — shows which API-Football endpoints succeeded for a
 * fixture. Rendered ONLY in development mode.
 */
export function DevDebugPanel({ status }: { status?: EndpointStatus[] }) {
  if (process.env.NODE_ENV !== "development" || !status?.length) return null;

  return (
    <section className="glass border-dashed border-[var(--soft-purple)]/40 p-4">
      <h2 className="flex items-center gap-2 text-[12px] font-extrabold tracking-wider text-[var(--soft-purple)]">
        <Bug size={14} /> DEV DEBUG — API ENDPOINT STATUS
        <span className="font-normal text-[var(--text-muted)]">(แสดงเฉพาะ dev mode)</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {status.map((s) => (
          <div
            key={s.endpoint}
            className="rounded-lg bg-[var(--bg-elevated)] px-2.5 py-2 text-[11px]"
            title={s.note}
          >
            <p className="truncate font-semibold text-[var(--text-secondary)]">{s.endpoint}</p>
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${stateStyle[s.state]}`}>
              {stateLabel[s.state]}
            </span>
            {s.note && (
              <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{s.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
