"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/** Model Performance — daily accuracy bars. */
export function AccuracyChart({
  data,
}: {
  data: { date: string; accuracy: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22 }}>
        <CartesianGrid stroke="rgba(120,150,200,0.12)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "#5b6c8c", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "#5b6c8c", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "#0d1629",
            border: "1px solid rgba(120,150,200,0.2)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => [`${v}%`, "Accuracy"]}
        />
        <Bar dataKey="accuracy" fill="#2f81f7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
