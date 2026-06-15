import { FormResult } from "@/lib/types";

const styles: Record<FormResult, string> = {
  W: "bg-[var(--neon-green-soft)] text-[var(--neon-green)]",
  D: "bg-[rgba(91,108,140,0.25)] text-[var(--text-secondary)]",
  L: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function FormBadges({ form }: { form: FormResult[] }) {
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${styles[r]}`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
