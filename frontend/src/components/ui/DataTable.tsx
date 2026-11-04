import React from 'react';

interface DataTableProps<T> {
  columns: { key: string; label: string; numeric?: boolean; render?: (item: T) => React.ReactNode }[];
  data: T[];
  emptyMessage?: string;
  rowKey?: (item: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No data available.',
  rowKey,
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="overflow-x-auto border border-[#e1e6e1] rounded-lg bg-white">
        <div className="p-8 text-center text-[#68716b]">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto border border-[#e1e6e1] rounded-lg bg-white ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-[#f1f3f0] border-b border-[#e1e6e1]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#68716b]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e1e6e1]">
          {data.map((item) => {
            const key = rowKey ? rowKey(item) : String(item);
            return (
              <tr key={key} className="hover:bg-[#f1f3f0] transition-colors">
                {columns.map((col) => {
                  const renderContent = col.render ? col.render(item) : String((item as any)[col.key]);
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-[#202522] ${
                        col.numeric ? 'text-right tabular-nums' : ''
                      }`}
                    >
                      {renderContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}