"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { OddsPoint } from "@/lib/types";

/** Odds Movement Graph — home / draw / away price over time. */
export function OddsMovementChart({ history }: { history: OddsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={history} margin={{ top: 8, right: 8, left: -18 }}>
        <CartesianGrid stroke="rgba(120,150,200,0.12)" strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fill: "#5b6c8c", fontSize: 11 }} />
        <YAxis tick={{ fill: "#5b6c8c", fontSize: 11 }} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            background: "#0d1629",
            border: "1px solid rgba(120,150,200,0.2)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a7c6" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="home" name="เจ้าบ้าน" stroke="#3dff8b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="draw" name="เสมอ" stroke="#2f81f7" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="away" name="ทีมเยือน" stroke="#94a7c6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
