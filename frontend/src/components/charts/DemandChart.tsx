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

interface DemandChartProps {
  data: Array<{
    date: string;
    actualSales: number | null;
    forecastDemand: number | null;
    lowerBound?: number | null;
    upperBound?: number | null;
    isForecast: boolean;
  }>;
}

export const DemandChart: React.FC<DemandChartProps> = ({ data }) => {
  const splitDate = data.find((p) => p.isForecast)?.date;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    {pt.actualSales !== null && pt.actualSales !== undefined && (
                      <p className="text-[#68716b]">Actual: <span className="font-semibold text-[#202522]">{pt.actualSales} units</span></p>
                    )}
                    {pt.forecastDemand !== null && pt.forecastDemand !== undefined && (
                      <p className="text-[#2f6b4f] font-semibold">{pt.forecastDemand} units forecast</p>
                    )}
                  </div>
                </div>
              );
            }}
          />
          {splitDate && (
            <ReferenceLine
              x={splitDate}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{
                value: 'Forecast begins',
                position: 'top',
                fill: '#68716b',
                fontSize: 10,
              }}
            />
          )}
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
            dataKey="actualSales"
            stroke="#68716b"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#68716b' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="forecastDemand"
            stroke="#2f6b4f"
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: '#2f6b4f' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};