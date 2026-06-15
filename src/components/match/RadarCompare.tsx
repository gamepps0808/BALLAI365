"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Team } from "@/lib/types";

/** แต้มฟอร์ม 5 นัดจริง (W=3 D=1 L=0) แปลงเป็น 0-100 */
function formScore(t: Team): number {
  const pts = t.form.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  return Math.round((pts / Math.max(t.form.length * 3, 1)) * 100);
}

/**
 * Team Comparison radar — เฉพาะแกนที่มีข้อมูลจริงเท่านั้น
 * (Attack/Defense จากประตูเฉลี่ยจริง · Form จากผล W/D/L จริง · อันดับจากตาราง ·
 *  Possession/Shots/Corners จากสถิติลีก — ไม่มีข้อมูล = ซ่อนแกน ไม่โชว์เลขปลอม)
 */
export function RadarCompare({ home, away }: { home: Team; away: Team }) {
  const data = [
    { axis: "Attack", h: home.power.attack, a: away.power.attack },
    { axis: "Defense", h: home.power.defense, a: away.power.defense },
    home.form.length > 0 && away.form.length > 0
      ? { axis: "Form", h: formScore(home), a: formScore(away) }
      : null,
    home.rank > 0 && away.rank > 0
      ? { axis: "Rank", h: Math.max(20, 100 - home.rank * 4), a: Math.max(20, 100 - away.rank * 4) }
      : null,
    home.statsAvg.possession > 0 && away.statsAvg.possession > 0
      ? { axis: "Possession", h: home.statsAvg.possession, a: away.statsAvg.possession }
      : null,
    home.statsAvg.shots > 0 && away.statsAvg.shots > 0
      ? { axis: "Shots", h: home.statsAvg.shots * 5, a: away.statsAvg.shots * 5 }
      : null,
    home.statsAvg.corners > 0 && away.statsAvg.corners > 0
      ? { axis: "Corners", h: home.statsAvg.corners * 10, a: away.statsAvg.corners * 10 }
      : null,
  ].filter((d): d is { axis: string; h: number; a: number } => d !== null);

  // radar ต้องมีอย่างน้อย 3 แกน — น้อยกว่านั้นบอกตรงๆ ว่าข้อมูลไม่พอ
  if (data.length < 3) {
    return (
      <p className="rounded-lg bg-[var(--bg-elevated)] p-6 text-center text-[12px] text-[var(--text-muted)]">
        ข้อมูลเปรียบเทียบสองทีมยังไม่พอสำหรับวาดกราฟ (Missing Data)
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(120,150,200,0.2)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "#94a7c6", fontSize: 11 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={home.shortName}
          dataKey="h"
          stroke="#3dff8b"
          fill="#3dff8b"
          fillOpacity={0.18}
        />
        <Radar
          name={away.shortName}
          dataKey="a"
          stroke="#ff4d5e"
          fill="#ff4d5e"
          fillOpacity={0.15}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a7c6" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* หมายเหตุ: แกนที่ไม่มีข้อมูลจริง (เช่นสถิติลีกของทีมชาติ) ถูกซ่อนโดยตั้งใจ — ไม่โชว์เลขปลอม */
