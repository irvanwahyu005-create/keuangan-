import React, { useMemo, useState } from 'react';
import { EXPENSE_CATEGORIES } from '../data/smartCatalog';
import type { CategoryBudget, ExpenseCategoryId, Transaction } from '../types/finance';
import { formatIDR, formatMonthLabelID } from '../utils/format';

interface BudgetsViewProps {
  monthKey: string;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  onUpdateBudget: (category: ExpenseCategoryId, nextLimit: number) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  monthKey,
  transactions,
  budgets,
  onUpdateBudget,
}) => {
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryId | null>(null);
  const [editValue, setEditValue] = useState('');

  const spentByCategory = useMemo(() => {
    const map = new Map<ExpenseCategoryId, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(monthKey)) continue;
      const cat = tx.category as ExpenseCategoryId;
      map.set(cat, (map.get(cat) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions, monthKey]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = Array.from(spentByCategory.values()).reduce((sum, val) => sum + val, 0);
  const totalRemaining = totalBudget - totalSpent;

  const startEdit = (category: ExpenseCategoryId, currentLimit: number) => {
    setEditingCategory(category);
    setEditValue(String(currentLimit));
  };

  const commitEdit = (category: ExpenseCategoryId) => {
    const parsed = parseInt(editValue.replace(/\D/g, ''), 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onUpdateBudget(category, parsed);
    }
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Anggaran ({formatMonthLabelID(monthKey)})
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatIDR(totalBudget)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sudah Terpakai
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatIDR(totalSpent)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sisa Ruang Anggaran
          </p>
          <p
            className={`font-mono-num mt-1.5 text-2xl font-bold ${
              totalRemaining < 0
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            {formatIDR(totalRemaining)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Batas Anggaran Bulanan per Kategori
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Klik tombol Ubah Batas untuk menyesuaikan target belanja dapur, bumbu, belanja online, dan tagihan rutin.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategoryId[]).map((catId) => {
            const meta = EXPENSE_CATEGORIES[catId];
            const limit = budgets.find((b) => b.category === catId)?.monthlyLimit ?? 0;
            const spent = spentByCategory.get(catId) ?? 0;
            const ratio = limit > 0 ? (spent / limit) * 100 : 0;
            const clampedWidth = Math.min(100, Math.max(0, ratio));

            const statusLabel =
              limit === 0
                ? 'Belum Diatur'
                : spent > limit
                ? 'Melebihi Batas'
                : ratio >= 85
                ? 'Mendekati Batas'
                : 'Aman';

            const statusColorClass =
              limit === 0
                ? 'text-slate-500 dark:text-slate-400'
                : spent > limit
                ? 'text-rose-700 dark:text-rose-400'
                : ratio >= 85
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-teal-700 dark:text-teal-400';

            const barColorClass =
              spent > limit
                ? 'bg-rose-600'
                : ratio >= 85
                ? 'bg-amber-600'
                : 'bg-teal-700';

            return (
              <div key={catId} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-xs"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden="true"
                      />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {meta.label}
                      </h4>
                      <span className={`text-xs font-semibold ${statusColorClass}`}>
                        · {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {meta.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingCategory === catId ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label={`Anggaran ${meta.label}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(catId);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          autoFocus
                          className="font-mono-num w-32 rounded-lg border border-teal-600 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-right text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => commitEdit(catId)}
                          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(catId, limit)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        Ubah Batas
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${barColorClass}`}
                      style={{ width: `${clampedWidth}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      Terpakai <strong className="font-mono-num text-slate-900 dark:text-slate-100">{formatIDR(spent)}</strong>
                      {' / '}
                      <span className="font-mono-num">{formatIDR(limit)}</span>
                    </span>
                    <span className="font-mono-num font-semibold">
                      {limit > 0 ? `${Math.round(ratio)}%` : '0%'}
                      {' · '}
                      Sisa {formatIDR(limit - spent)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
