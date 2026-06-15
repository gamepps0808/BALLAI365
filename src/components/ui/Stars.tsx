import { Star } from "lucide-react";

export function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} จาก ${max} ดาว`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < count ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-muted)]"}
        />
      ))}
    </div>
  );
}
