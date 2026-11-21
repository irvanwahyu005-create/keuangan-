import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { RecurringExpense } from '../types/finance';
import {
  formatDateID,
  formatIDR,
  generateId,
  getDayNameID,
  getRecurringStatus,
  getTodayISO,
} from '../utils/format';

interface RecurringBillsViewProps {
  recurring: RecurringExpense[];
  onSaveRecurring: (items: RecurringExpense[]) => void;
  onRecordPayment: (item: RecurringExpense) => void;
  onRequestDelete: (item: RecurringExpense) => void;
}

export const RecurringBillsView: React.FC<RecurringBillsViewProps> = ({
  recurring,
  onSaveRecurring,
  onRecordPayment,
  onRequestDelete,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const todayISO = getTodayISO();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    const num = parseInt(amount.replace(/\D/g, ''), 10);
    if (!clean || !num || num <= 0) return;

    const newItem: RecurringExpense = {
      id: generateId('rec'),
      title: clean,
      category: frequency === 'weekly' ? 'tetap_mingguan' : 'tetap_bulanan',
      amount: num,
      frequency,
      dayOfWeek: frequency === 'weekly' ? parseInt(dayOfWeek, 10) : undefined,
      dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth, 10) : undefined,
      active: true,
    };

    onSaveRecurring([newItem, ...recurring]);
    setTitle('');
    setAmount('');
  };

  const weeklyTotal = recurring
    .filter((r) => r.active && r.frequency === 'weekly')
    .reduce((sum, r) => sum + r.amount, 0);

  const monthlyTotal = recurring
    .filter((r) => r.active && r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Komitmen Rutin Mingguan
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatIDR(weeklyTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Estimasi per bulan (~4x): <span className="font-mono-num font-semibold">{formatIDR(weeklyTotal * 4)}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Komitmen Tagihan Bulanan
          </p>
          <p className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatIDR(monthlyTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total rutin per bulan: <span className="font-mono-num font-semibold">{formatIDR(monthlyTotal + weeklyTotal * 4)}</span>
          </p>
        </div>
      </div>

      {/* Add Recurring Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
      >
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Tambah Pengeluaran Tetap Mingguan / Bulanan
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label htmlFor="rec-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Tagihan / Rutin
            </label>
            <input
              id="rec-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Listrik PLN, Jajan Mingguan..."
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="rec-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nominal (Rp)
            </label>
            <input
              id="rec-amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250000"
              className="font-mono-num mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="rec-freq" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Periode
            </label>
            <select
              id="rec-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            >
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            {frequency === 'weekly' ? (
              <>
                <label htmlFor="rec-dow" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hari
                </label>
                <select
                  id="rec-dow"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {getDayNameID(d).slice(0, 3)}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor="rec-dom" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tgl
                </label>
                <input
                  id="rec-dom"
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                />
              </>
            )}
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      </form>

      {/* Recurring List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <CalendarClock className="h-5 w-5 text-teal-700 dark:text-teal-400" />
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Jadwal Tagihan & Pengeluaran Tetap
          </h3>
        </div>

        {recurring.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Belum ada pengeluaran rutin mingguan atau bulanan yang ditambahkan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recurring.map((item) => {
              const status = getRecurringStatus(item, todayISO);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <span
                        className={`text-xs font-semibold ${
                          status === 'paid'
                            ? 'text-teal-700 dark:text-teal-400'
                            : status === 'due'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {status === 'paid'
                          ? '· Sudah Dibayar Periode Ini'
                          : status === 'due'
                          ? '· Jatuh Tempo'
                          : '· Terjadwal'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {item.frequency === 'weekly'
                          ? `Mingguan setiap hari ${getDayNameID(item.dayOfWeek ?? 1)}`
                          : `Bulanan setiap tanggal ${item.dayOfMonth ?? 1}`}
                      </span>
                      {item.lastPaidDate && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>Terakhir bayar {formatDateID(item.lastPaidDate)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono-num text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatIDR(item.amount)}
                    </span>

                    {status === 'paid' ? (
                      <span className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lunas
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRecordPayment(item)}
                        className="min-h-[38px] rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
                      >
                        Catat Bayar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRequestDelete(item)}
                      aria-label={`Hapus tagihan ${item.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
