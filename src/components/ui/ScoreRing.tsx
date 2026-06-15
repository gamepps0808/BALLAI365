import { aiScoreTone } from "@/lib/engine/labels";

const ringColor: Record<string, string> = {
  green: "var(--neon-green)",
  blue: "var(--neon-blue)",
  orange: "var(--warning)",
  red: "var(--danger)",
};

/** Circular AI Score gauge (0-100). */
export function ScoreRing({
  score,
  size = 96,
  label = "/100",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const stroke = size >= 80 ? 7 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = ringColor[aiScoreTone(score)];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(120,150,200,0.15)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular font-bold leading-none"
          style={{ color, fontSize: size * 0.3 }}
        >
          {score}
        </span>
        {size >= 70 && (
          <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
        )}
      </div>
    </div>
  );
}
