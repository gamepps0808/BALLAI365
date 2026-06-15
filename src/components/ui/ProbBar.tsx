/** Win probability split bar: home (green) / draw (blue) / away (gray). */
export function ProbBar({
  home,
  draw,
  away,
  height = 6,
}: {
  home: number;
  draw: number;
  away: number;
  height?: number;
}) {
  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height }}
      role="img"
      aria-label={`เจ้าบ้าน ${home}% เสมอ ${draw}% ทีมเยือน ${away}%`}
    >
      <div style={{ width: `${home}%`, background: "var(--neon-green)" }} />
      <div style={{ width: `${draw}%`, background: "var(--neon-blue)" }} />
      <div style={{ width: `${away}%`, background: "rgba(120,150,200,0.35)" }} />
    </div>
  );
}
