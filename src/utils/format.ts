import type { RecurringExpense } from '../types/finance';

export function formatIDR(amount: number): string {
  const abs = Math.round(Math.abs(amount));
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return amount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatIDRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${sign}Rp ${val} jt`;
  }
  if (abs >= 1_000) {
    const val = Math.round(abs / 1_000);
    return `${sign}Rp ${val} rb`;
  }
  return `${sign}Rp ${abs}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function formatMonthLabelID(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return `${MONTH_NAMES_ID[m - 1] ?? m} ${y}`;
}

export function formatDateID(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_SHORT_ID[dt.getDay()];
  const monthShort = (MONTH_NAMES_ID[m - 1] ?? '').slice(0, 3);
  return `${dayName}, ${d} ${monthShort} ${y}`;
}

export function getDaysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function getRecentDays(count = 14): { iso: string; dayShort: string; dayNum: string }[] {
  const result: { iso: string; dayShort: string; dayNum: string }[] = [];
  const base = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    result.push({
      iso: `${y}-${m}-${d}`,
      dayShort: DAY_NAMES_SHORT_ID[dt.getDay()],
      dayNum: String(dt.getDate()),
    });
  }
  return result;
}

export function getDayNameID(dayOfWeek: number): string {
  const full = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return full[dayOfWeek] ?? 'Senin';
}

export function getRecurringStatus(
  item: RecurringExpense,
  todayISO: string
): 'paid' | 'due' | 'upcoming' {
  if (!item.active) return 'upcoming';

  const [ty, tm, td] = todayISO.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  if (item.frequency === 'monthly') {
    const currentMonthKey = todayISO.slice(0, 7);
    if (item.lastPaidDate && item.lastPaidDate.startsWith(currentMonthKey)) {
      return 'paid';
    }
    const dueDay = item.dayOfMonth ?? 1;
    return td >= dueDay ? 'due' : 'upcoming';
  }

  // Weekly: check if paid within current Mon-Sun week
  const dayIndex = (todayDate.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const weekStart = new Date(ty, tm - 1, td - dayIndex);
  const weekStartISO = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  if (item.lastPaidDate && item.lastPaidDate >= weekStartISO) {
    return 'paid';
  }
  const targetDow = item.dayOfWeek ?? 1;
  const targetIndex = (targetDow + 6) % 7;
  return dayIndex >= targetIndex ? 'due' : 'upcoming';
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
