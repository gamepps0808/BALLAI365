/* eslint-disable @next/next/no-img-element */
/** Team crest — real logo from the API when available, placeholder otherwise. */
const palette: Record<string, string> = {
  mci: "#6CABDD",
  liv: "#C8102E",
  rma: "#FEBE10",
  fcb: "#A50044",
  bay: "#DC052D",
  bvb: "#FDE100",
  int: "#0068A8",
  acm: "#FB090B",
  psg: "#004170",
  mar: "#2FAEE0",
};

export function TeamLogo({
  teamId,
  shortName,
  logo,
  size = 40,
}: {
  teamId: string;
  shortName: string;
  logo?: string;
  size?: number;
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={shortName}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full bg-white/5 object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    );
  }

  const color = palette[teamId] ?? "#2f81f7";
  const initials = shortName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.3,
        background: `${color}26`,
        border: `2px solid ${color}66`,
        color,
      }}
      aria-label={shortName}
    >
      {initials}
    </div>
  );
}
