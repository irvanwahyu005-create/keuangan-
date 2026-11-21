import React, { useMemo, useState } from 'react';
import { Check, Plus, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react';
import {
  detectSmartCategoryAndPrice,
  EXPENSE_CATEGORIES,
} from '../data/smartCatalog';
import type { GroceryDraftItem, Transaction } from '../types/finance';
import { formatIDR, generateId } from '../utils/format';

interface GroceryPlannerProps {
  items: GroceryDraftItem[];
  history: Transaction[];
  onChangeItems: (next: GroceryDraftItem[]) => void;
  onCommitChecked: (checkedItems: GroceryDraftItem[]) => void;
}

const PANTRY_QUICK_ADD = [
  { name: 'Bawang Merah', quantity: 0.5, unit: 'kg', price: 44000, category: 'bumbu_masak' as const },
  { name: 'Bawang Putih', quantity: 0.25, unit: 'kg', price: 42000, category: 'bumbu_masak' as const },
  { name: 'Cabai Rawit Merah', quantity: 0.25, unit: 'kg', price: 56000, category: 'bumbu_masak' as const },
  { name: 'Kunyit, Jahe & Lengkuas', quantity: 1, unit: 'paket', price: 6000, category: 'bumbu_masak' as const },
  { name: 'Daging Ayam Potong', quantity: 1, unit: 'kg', price: 38000, category: 'belanja_dapur' as const },
  { name: 'Telur Ayam Negeri', quantity: 1, unit: 'kg', price: 29000, category: 'kebutuhan_pokok' as const },
  { name: 'Beras Premium 5kg', quantity: 1, unit: 'karung', price: 75000, category: 'kebutuhan_pokok' as const },
  { name: 'Minyak Goreng 2L', quantity: 1, unit: 'pouch', price: 36000, category: 'kebutuhan_pokok' as const },
];

export const GroceryPlanner: React.FC<GroceryPlannerProps> = ({
  items,
  history,
  onChangeItems,
  onCommitChecked,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [category, setCategory] = useState<'belanja_dapur' | 'bumbu_masak' | 'kebutuhan_pokok'>('belanja_dapur');

  const detected = useMemo(() => {
    return detectSmartCategoryAndPrice(name, history, 'expense');
  }, [name, history]);

  const handleNameChange = (val: string) => {
    setName(val);
    const match = detectSmartCategoryAndPrice(val, history, 'expense');
    if (match) {
      if (
        match.category === 'belanja_dapur' ||
        match.category === 'bumbu_masak' ||
        match.category === 'kebutuhan_pokok'
      ) {
        setCategory(match.category);
      }
      setEstimatedPrice(String(match.estimatedPrice));
      if (match.unitHint && match.unitHint !== 'riwayat') {
        setUnit(match.unitHint);
      }
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const qty = Math.max(0.1, parseFloat(quantity) || 1);
    const unitPrice = Math.max(500, parseInt(estimatedPrice.replace(/\D/g, ''), 10) || detected?.estimatedPrice || 15000);

    const newItem: GroceryDraftItem = {
      id: generateId('groc'),
      name: cleanName,
      quantity: qty,
      unit: unit.trim() || 'pcs',
      estimatedUnitPrice: unitPrice,
      category,
      checked: false,
    };

    onChangeItems([newItem, ...items]);
    setName('');
    setQuantity('1');
    setEstimatedPrice('');
  };

  const handleQuickAdd = (preset: (typeof PANTRY_QUICK_ADD)[number]) => {
    const existing = items.find((i) => i.name.toLowerCase() === preset.name.toLowerCase());
    if (existing) {
      onChangeItems(
        items.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + preset.quantity } : i))
      );
      return;
    }
    onChangeItems([
      {
        id: generateId('groc'),
        name: preset.name,
        quantity: preset.quantity,
        unit: preset.unit,
        estimatedUnitPrice: preset.price,
        category: preset.category,
        checked: false,
      },
      ...items,
    ]);
  };

  const toggleCheck = (id: string) => {
    onChangeItems(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const updateItemPrice = (id: string, nextTotal: number) => {
    onChangeItems(
      items.map((i) => {
        if (i.id !== id) return i;
        const nextUnit = Math.max(0, Math.round(nextTotal / Math.max(0.1, i.quantity)));
        return { ...i, estimatedUnitPrice: nextUnit };
      })
    );
  };

  const removeItem = (id: string) => {
    onChangeItems(items.filter((i) => i.id !== id));
  };

  const checkedItems = items.filter((i) => i.checked);
  const totalAll = items.reduce((sum, i) => sum + Math.round(i.quantity * i.estimatedUnitPrice), 0);
  const totalChecked = checkedItems.reduce((sum, i) => sum + Math.round(i.quantity * i.estimatedUnitPrice), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Daftar Belanja Dapur, Bumbu & Pokok
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ketik nama bahan masakan untuk deteksi kategori otomatis dan estimasi harga pasar.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400">Estimasi Keranjang</span>
            <p className="font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatIDR(totalAll)}
            </p>
          </div>
        </div>

        <form onSubmit={handleAddItem} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label htmlFor="groc-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Bahan / Kebutuhan
            </label>
            <input
              id="groc-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Bawang merah, Kunyit, Beras..."
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-3">
            <div>
              <label htmlFor="groc-qty" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah
              </label>
              <input
                id="groc-qty"
                type="number"
                step="0.25"
                min="0.25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="font-mono-num mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="groc-unit" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Satuan
              </label>
              <input
                id="groc-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="groc-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Harga/Satuan
            </label>
            <input
              id="groc-price"
              type="number"
              inputMode="numeric"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="Otomatis"
              className="font-mono-num mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </button>
          </div>
        </form>

        {detected && name.trim().length >= 2 && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              Kategori otomatis: <strong>{EXPENSE_CATEGORIES[category]?.label ?? 'Belanja Dapur'}</strong>
              {' · '}
              Estimasi harga: <strong className="font-mono-num">{formatIDR(detected.estimatedPrice)}/{detected.unitHint}</strong>
            </span>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tambah Cepat Bahan Dapur & Sembako:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PANTRY_QUICK_ADD.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleQuickAdd(preset)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Checklist & Commit Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBasket className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Daftar Belanja Aktif ({items.length} item)
            </h3>
          </div>

          {checkedItems.length > 0 && (
            <button
              type="button"
              onClick={() => onCommitChecked(checkedItems)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
            >
              <Check className="h-4 w-4" />
              <span>
                Catat {checkedItems.length} Item ({formatIDR(totalChecked)})
              </span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Keranjang belanja masih kosong. Tambahkan kebutuhan dapur di atas sebelum ke pasar atau warung.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const subtotal = Math.round(item.quantity * item.estimatedUnitPrice);
              const catMeta = EXPENSE_CATEGORIES[item.category];
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      aria-label={item.checked ? `Batal tandai ${item.name}` : `Tandai sudah dibeli ${item.name}`}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        item.checked
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                      }`}
                    >
                      {item.checked && <Check className="h-4 w-4" />}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${
                          item.checked
                            ? 'text-slate-400 line-through dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{catMeta.label}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-num">
                          {item.quantity} {item.unit}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`Estimasi harga ${item.name}`}
                      value={subtotal}
                      onChange={(e) => updateItemPrice(item.id, parseInt(e.target.value, 10) || 0)}
                      className="font-mono-num w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-right text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Hapus ${item.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
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
