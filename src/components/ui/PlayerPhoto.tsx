/* eslint-disable @next/next/no-img-element */

/** รูปนักเตะจาก API — ไม่มีรูปใช้อวตารชื่อย่อแทน */
export function PlayerPhoto({
  photo,
  name,
  size = 44,
}: {
  photo?: string;
  name: string;
  size?: number;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full bg-[var(--bg-elevated)] object-cover ring-1 ring-[var(--border-subtle)]"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--neon-blue-soft)] font-bold text-[var(--neon-blue)] ring-1 ring-[var(--border-glow-blue)]"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
