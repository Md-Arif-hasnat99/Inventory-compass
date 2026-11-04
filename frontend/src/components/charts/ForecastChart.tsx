import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface ForecastChartProps {
  points: Array<{
    date: string;
    predictedDemand: number;
    lowerBound?: number;
    upperBound?: number;
  }>;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ points }) => {
  const splitIndex = points.length - 1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#68716b' }}
            tickLine={false}
            axisLine={{ stroke: '#e1e6e1' }}
            tickFormatter={(val: string) => val.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#68716b' }}
            tickLine={false}
            axisLine={{ stroke: '#e1e6e1' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const pt = payload[0].payload as any;
              return (
                <div className="bg-white border border-[#e1e6e1] rounded-md p-3 shadow-sm text-xs">
                  <p className="font-semibold text-[#202522]">{label}</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-[#2f6b4f] font-semibold">
                      {pt.predictedDemand} units
                    </p>
                    {pt.lowerBound !== null && pt.lowerBound !== undefined && (
                      <p className="text-[#68716b]">Lower: {pt.lowerBound} units</p>
                    )}
                    {pt.upperBound !== null && pt.upperBound !== undefined && (
                      <p className="text-[#68716b]">Upper: {pt.upperBound} units</p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="#2f6b4f"
            fillOpacity={0.1}
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="predictedDemand"
            stroke="#2f6b4f"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2f6b4f' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};