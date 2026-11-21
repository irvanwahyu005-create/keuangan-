import React, { useMemo, useState } from 'react';
import { EXPENSE_CATEGORIES } from '../data/smartCatalog';
import type { ExpenseCategoryId, Transaction } from '../types/finance';
import { formatIDR, formatIDRCompact, getDaysInMonth } from '../utils/format';

interface DonutCategoryChartProps {
  transactions: Transaction[];
  monthKey: string;
}

export const DonutCategoryChart: React.FC<DonutCategoryChartProps> = ({
  transactions,
  monthKey,
}) => {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategoryId | null>(null);

  const { segments, totalExpense } = useMemo(() => {
    const totals = new Map<ExpenseCategoryId, number>();
    let total = 0;

    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(monthKey)) continue;
      const cat = tx.category as ExpenseCategoryId;
      totals.set(cat, (totals.get(cat) ?? 0) + tx.amount);
      total += tx.amount;
    }

    const list = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategoryId[])
      .map((catId) => {
        const meta = EXPENSE_CATEGORIES[catId];
        const value = totals.get(catId) ?? 0;
        return {
          id: catId,
          label: meta.label,
          shortLabel: meta.shortLabel,
          color: meta.color,
          value,
          percent: total > 0 ? (value / total) * 100 : 0,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return { segments: list, totalExpense: total };
  }, [transactions, monthKey]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((seg) => {
      const length = totalExpense > 0 ? (seg.value / totalExpense) * circumference : 0;
      const arc = {
        ...seg,
        dashArray: `${Math.max(0, length - 2)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += length;
      return arc;
    });
  }, [segments, totalExpense, circumference]);

  const activeSeg = segments.find((s) => s.id === activeCategory) ?? null;

  if (totalExpense === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Belum ada pengeluaran pada bulan ini</p>
        <p className="mt-1 text-xs">Catat belanja dapur, bumbu, atau tagihan untuk melihat komposisi donat.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-12">
      <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:col-span-5">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Grafik donat pengeluaran per kategori">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="22"
            className="text-slate-100 dark:text-slate-800"
          />
          {arcs.map((arc) => {
            const isDimmed = activeCategory !== null && activeCategory !== arc.id;
            return (
              <circle
                key={arc.id}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={activeCategory === arc.id ? 26 : 22}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                className="cursor-pointer transition-all duration-150"
                style={{ opacity: isDimmed ? 0.35 : 1 }}
                onMouseEnter={() => setActiveCategory(arc.id)}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={() => setActiveCategory((prev) => (prev === arc.id ? null : arc.id))}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {activeSeg ? activeSeg.shortLabel : 'Total Keluar'}
          </span>
          <span className="font-mono-num mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatIDRCompact(activeSeg ? activeSeg.value : totalExpense)}
          </span>
          {activeSeg && (
            <span className="font-mono-num text-[11px] font-medium text-teal-700 dark:text-teal-400">
              {activeSeg.percent.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 sm:col-span-7">
        {segments.map((seg) => {
          const isSelected = activeCategory === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              onMouseEnter={() => setActiveCategory(seg.id)}
              onMouseLeave={() => setActiveCategory(null)}
              onClick={() => setActiveCategory((prev) => (prev === seg.id ? null : seg.id))}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                isSelected
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-xs"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {seg.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="font-mono-num text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {formatIDR(seg.value)}
                </span>
                <span className="font-mono-num w-11 text-right text-[11px] text-slate-500 dark:text-slate-400">
                  {seg.percent.toFixed(0)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface DailyBarChartProps {
  transactions: Transaction[];
  monthKey: string;
}

export const DailyBarChart: React.FC<DailyBarChartProps> = ({ transactions, monthKey }) => {
  const [mode, setMode] = useState<'expense' | 'cashflow'>('expense');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysCount = useMemo(() => getDaysInMonth(monthKey), [monthKey]);

  const dailyData = useMemo(() => {
    const days = Array.from({ length: daysCount }, (_, idx) => ({
      day: idx + 1,
      income: 0,
      expense: 0,
    }));

    for (const tx of transactions) {
      if (!tx.date.startsWith(monthKey)) continue;
      const dNum = parseInt(tx.date.slice(8, 10), 10);
      if (dNum >= 1 && dNum <= daysCount) {
        if (tx.type === 'income') {
          days[dNum - 1].income += tx.amount;
        } else {
          days[dNum - 1].expense += tx.amount;
        }
      }
    }
    return days;
  }, [transactions, monthKey, daysCount]);

  const maxValue = useMemo(() => {
    let max = 100000;
    for (const d of dailyData) {
      if (d.expense > max) max = d.expense;
      if (mode === 'cashflow' && d.income > max) max = d.income;
    }
    return max;
  }, [dailyData, mode]);

  const avgDailyExpense = useMemo(() => {
    const activeDays = dailyData.filter((d) => d.expense > 0);
    if (activeDays.length === 0) return 0;
    const sum = activeDays.reduce((acc, d) => acc + d.expense, 0);
    return Math.round(sum / activeDays.length);
  }, [dailyData]);

  const inspected = hoveredDay ? dailyData[hoveredDay - 1] : null;
  const chartHeight = 164;
  const chartWidth = 620;
  const paddingLeft = 8;
  const paddingRight = 8;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const slotWidth = usableWidth / daysCount;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {inspected ? (
            <span>
              Tgl <strong className="font-mono-num text-slate-900 dark:text-slate-100">{inspected.day}</strong>
              {' · '}
              Keluar <strong className="font-mono-num text-rose-700 dark:text-rose-400">{formatIDR(inspected.expense)}</strong>
              {mode === 'cashflow' && (
                <>
                  {' · '}
                  Masuk <strong className="font-mono-num text-teal-700 dark:text-teal-400">{formatIDR(inspected.income)}</strong>
                </>
              )}
            </span>
          ) : (
            <span>
              Rata-rata hari aktif:{' '}
              <strong className="font-mono-num text-slate-900 dark:text-slate-100">
                {formatIDR(avgDailyExpense)}/hari
              </strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode('expense')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'expense'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Keluar Harian
          </button>
          <button
            type="button"
            onClick={() => setMode('cashflow')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'cashflow'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Masuk vs Keluar
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`}
          className="h-52 w-full min-w-[460px]"
          role="img"
          aria-label="Grafik batang transaksi harian"
        >
          {/* Horizontal grid guidelines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * (chartHeight - 16);
            return (
              <line
                key={ratio}
                x1={paddingLeft}
                x2={chartWidth - paddingRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-slate-200 dark:text-slate-800"
              />
            );
          })}

          {/* Average expense reference line */}
          {avgDailyExpense > 0 && (
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={chartHeight - (avgDailyExpense / maxValue) * (chartHeight - 16)}
              y2={chartHeight - (avgDailyExpense / maxValue) * (chartHeight - 16)}
              stroke="#B45309"
              strokeWidth="1.25"
              strokeDasharray="4 3"
              opacity="0.7"
            />
          )}

          {dailyData.map((d, idx) => {
            const xCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
            const expH = (d.expense / maxValue) * (chartHeight - 16);
            const incH = (d.income / maxValue) * (chartHeight - 16);
            const isActive = hoveredDay === d.day;

            const barWidth = mode === 'cashflow' ? Math.max(4, slotWidth * 0.34) : Math.max(6, slotWidth * 0.58);

            return (
              <g
                key={d.day}
                onMouseEnter={() => setHoveredDay(d.day)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setHoveredDay((prev) => (prev === d.day ? null : d.day))}
                className="cursor-pointer"
              >
                <rect
                  x={paddingLeft + idx * slotWidth}
                  y={0}
                  width={slotWidth}
                  height={chartHeight + 22}
                  fill="transparent"
                />
                {isActive && (
                  <rect
                    x={paddingLeft + idx * slotWidth + 1}
                    y={6}
                    width={slotWidth - 2}
                    height={chartHeight - 6}
                    rx="4"
                    fill="currentColor"
                    className="text-slate-100 dark:text-slate-800/70"
                  />
                )}

                {mode === 'cashflow' && d.income > 0 && (
                  <rect
                    x={xCenter - barWidth - 1}
                    y={chartHeight - Math.max(2, incH)}
                    width={barWidth}
                    height={Math.max(2, incH)}
                    rx="2"
                    fill="#0D9488"
                    opacity={isActive ? 1 : 0.85}
                  />
                )}

                {d.expense > 0 && (
                  <rect
                    x={mode === 'cashflow' ? xCenter + 1 : xCenter - barWidth / 2}
                    y={chartHeight - Math.max(2, expH)}
                    width={barWidth}
                    height={Math.max(2, expH)}
                    rx="2"
                    fill="#0F766E"
                    className={mode === 'cashflow' ? 'fill-rose-600 dark:fill-rose-500' : 'fill-teal-700 dark:fill-teal-500'}
                    opacity={isActive ? 1 : 0.85}
                  />
                )}

                {(d.day === 1 || d.day % 5 === 0 || d.day === daysCount) && (
                  <text
                    x={xCenter}
                    y={chartHeight + 17}
                    textAnchor="middle"
                    className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono-num"
                  >
                    {d.day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          {mode === 'cashflow' ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-teal-600" /> Uang Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" /> Pengeluaran
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-teal-700" /> Pengeluaran Harian
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-t border-dashed border-amber-700" /> Garis Rata-rata
          </span>
        </div>
        <span className="font-mono-num">Maks: {formatIDRCompact(maxValue)}</span>
      </div>
    </div>
  );
};
