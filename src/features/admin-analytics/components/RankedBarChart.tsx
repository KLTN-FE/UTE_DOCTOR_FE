"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface RankedDatum {
  label: string;
  value: number;
}

interface RankedBarChartProps {
  data: RankedDatum[];
  color?: string;
  valueName?: string;
  /** Fixed upper bound for the value axis (e.g. 10 for the 1–10 rating scale). */
  domainMax?: number;
  valueFormatter?: (value: number) => string;
}

const truncate = (value: string, max = 18) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function RankedBarChart({
  data,
  color = "#0ea5e9",
  valueName = "Giá trị",
  domainMax,
  valueFormatter,
}: RankedBarChartProps) {
  const height = Math.max(160, data.length * 46);

  return (
    <div style={{ width: "100%", height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <XAxis
            type="number"
            domain={domainMax ? [0, domainMax] : [0, "auto"]}
            allowDecimals={Boolean(domainMax)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            interval={0}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(value: string) => truncate(String(value))}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.15)" }}
            contentStyle={{
              borderRadius: 12,
              borderColor: "var(--border)",
              background: "var(--card)",
            }}
            formatter={(value: number) => [
              valueFormatter ? valueFormatter(value) : String(value),
              valueName,
            ]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
