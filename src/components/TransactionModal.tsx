import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  ALL_CATEGORIES,
  detectSmartCategoryAndPrice,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../data/smartCatalog';
import type { CategoryId, Transaction, TransactionType } from '../types/finance';
import { formatIDR, getTodayISO } from '../utils/format';

interface TransactionModalProps {
  open: boolean;
  initialTransaction?: Transaction | null;
  defaultDate?: string;
  history: Transaction[];
  onClose: () => void;
  onSave: (txData: {
    id?: string;
    type: TransactionType;
    category: CategoryId;
    title: string;
    amount: number;
    date: string;
    notes?: string;
    estimatedPrice?: number;
  }) => void;
}

const QUICK_PRESETS: { label: string; type: TransactionType; category: CategoryId; amount: number }[] = [
  { label: 'Bawang Merah 1/2 kg', type: 'expense', category: 'bumbu_masak', amount: 22000 },
  { label: 'Cabai Rawit 1/4 kg', type: 'expense', category: 'bumbu_masak', amount: 14000 },
  { label: 'Beras 5 kg', type: 'expense', category: 'kebutuhan_pokok', amount: 75000 },
  { label: 'Gas Elpiji 3 kg', type: 'expense', category: 'kebutuhan_pokok', amount: 22000 },
  { label: 'Belanja Shopee', type: 'expense', category: 'belanja_online', amount: 85000 },
  { label: 'Uang Belanja Masuk', type: 'income', category: 'uang_belanja', amount: 500000 },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  initialTransaction,
  defaultDate,
  history,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryId>('belanja_dapur');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(defaultDate || getTodayISO());
  const [notes, setNotes] = useState('');
  const [manualCategoryLocked, setManualCategoryLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialTransaction) {
      setType(initialTransaction.type);
      setTitle(initialTransaction.title);
      setCategory(initialTransaction.category);
      setAmountInput(String(initialTransaction.amount));
      setDate(initialTransaction.date);
      setNotes(initialTransaction.notes ?? '');
      setManualCategoryLocked(true);
    } else {
      setType('expense');
      setTitle('');
      setCategory('belanja_dapur');
      setAmountInput('');
      setDate(defaultDate || getTodayISO());
      setNotes('');
      setManualCategoryLocked(false);
    }
    setErrorMsg('');
  }, [open, initialTransaction, defaultDate]);

  const smartSuggestion = useMemo(() => {
    if (initialTransaction) return null;
    return detectSmartCategoryAndPrice(title, history, type);
  }, [title, history, type, initialTransaction]);

  useEffect(() => {
    if (!smartSuggestion || manualCategoryLocked || initialTransaction) return;
    setCategory(smartSuggestion.category);
  }, [smartSuggestion, manualCategoryLocked, initialTransaction]);

  const categoryOptions = useMemo(() => {
    return type === 'expense'
      ? Object.values(EXPENSE_CATEGORIES)
      : Object.values(INCOME_CATEGORIES);
  }, [type]);

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    setManualCategoryLocked(false);
    setCategory(nextType === 'expense' ? 'belanja_dapur' : 'gaji');
  };

  const applyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setType(preset.type);
    setTitle(preset.label);
    setCategory(preset.category);
    setAmountInput(String(preset.amount));
    setManualCategoryLocked(true);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const numericAmount = parseInt(amountInput.replace(/\D/g, ''), 10);

    if (!cleanTitle) {
      setErrorMsg('Tuliskan nama barang atau keterangan transaksi.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Masukkan nominal rupiah yang valid lebih dari 0.');
      return;
    }

    onSave({
      id: initialTransaction?.id,
      type,
      category,
      title: cleanTitle,
      amount: numericAmount,
      date,
      notes: notes.trim() || undefined,
      estimatedPrice: smartSuggestion?.estimatedPrice,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-center justify-between gap-4">
          <h2
            id="tx-modal-title"
            className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {initialTransaction ? 'Ubah Transaksi' : 'Catat Transaksi Rumah'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Switch */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => handleTypeSwitch('expense')}
            className={`min-h-[42px] rounded-lg text-sm font-semibold transition-colors ${
              type === 'expense'
                ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => handleTypeSwitch('income')}
            className={`min-h-[42px] rounded-lg text-sm font-semibold transition-colors ${
              type === 'income'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Uang Masuk
          </button>
        </div>

        {!initialTransaction && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Isi Cepat Umum:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="tx-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Nama Barang / Keterangan
            </label>
            <input
              id="tx-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg('');
              }}
              placeholder={
                type === 'expense'
                  ? 'Contoh: Bawang merah 1/2 kg, Minyak 2L, Shopee...'
                  : 'Contoh: Gaji bulanan, Uang belanja minggu ini...'
              }
              className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />

            {smartSuggestion && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 dark:border-teal-900/70 bg-teal-50/70 dark:bg-teal-950/30 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
                  <span>
                    Otomatis: <strong>{ALL_CATEGORIES[smartSuggestion.category].label}</strong>
                    {' · '}
                    Estimasi <strong className="font-mono-num">{formatIDR(smartSuggestion.estimatedPrice)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmountInput(String(smartSuggestion.estimatedPrice))}
                  className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
                >
                  Pakai Estimasi
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tx-amount"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Nominal (Rp)
              </label>
              <input
                id="tx-amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="25000"
                className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Tanggal
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-mono-num mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-category"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Kategori
            </label>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as CategoryId);
                setManualCategoryLocked(true);
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tx-notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Catatan Tambahan (Opsional)
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Beli di warung depan / promo ongkir"
              className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              {initialTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
