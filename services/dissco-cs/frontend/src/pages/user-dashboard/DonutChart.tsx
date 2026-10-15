import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface ChartSegment { value: number; color: string; name: string }

export function DonutChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const data = segments.filter(s => s.value > 0);
  return (
    <div className="w-[62px] h-[62px] flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="100%" paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((seg, i) => <Cell key={i} fill={seg.color} stroke="none" />)}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} (${Math.round((value / total) * 100)}%)`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
