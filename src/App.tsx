import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  FileDown,
  Home,
  ListOrdered,
  Moon,
  Pencil,
  PieChart,
  Plus,
  Search,
  ShoppingBasket,
  Sun,
  Trash2,
} from 'lucide-react';
import { BudgetsView } from './components/BudgetsView';
import { DailyBarChart, DonutCategoryChart } from './components/Charts';
import { ConfirmDialog } from './components/ConfirmDialog';
import { GroceryPlanner } from './components/GroceryPlanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RecurringBillsView } from './components/RecurringBillsView';
import { ReportsAndBackupView } from './components/ReportsAndBackupView';
import { TransactionModal } from './components/TransactionModal';
import { ALL_CATEGORIES, DEFAULT_BUDGETS, EXPENSE_CATEGORIES } from './data/smartCatalog';
import {
  loadPersistedState,
  loadThemePreference,
  savePersistedState,
  saveThemePreference,
  toBackupPayload,
  type PersistedState,
} from './db/indexedDb';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  downloadBackupFromDrive,
  exportLocalJsonFile,
  findDriveBackupFile,
  getCachedDriveToken,
  initDriveAuth,
  isDriveOAuthConfigured,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadBackupToDrive,
} from './services/googleDriveSync';
import {
  shouldTriggerDailyReminder,
  showHouseholdNotification,
} from './services/notifications';
import { exportMonthlyReportPDF } from './services/pdfExport';
import type {
  CategoryId,
  ExpenseCategoryId,
  GroceryDraftItem,
  KasRumahBackupPayload,
  RecurringExpense,
  ReminderSettings,
  SyncSettings,
  Transaction,
  TransactionType,
} from './types/finance';
import {
  formatDateID,
  formatIDR,
  formatMonthLabelID,
  generateId,
  getMonthKey,
  getRecentDays,
  getRecurringStatus,
  getTodayISO,
  shiftMonthKey,
} from './utils/format';

type NavTab = 'overview' | 'transactions' | 'shopping_recurring' | 'budgets' | 'reports';

export default function App() {
  const isOnline = useOnlineStatus();
  const todayISO = getTodayISO();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [subTabShopping, setSubTabShopping] = useState<'grocery' | 'recurring'>('grocery');
  const [monthKey, setMonthKey] = useState<string>(() => getMonthKey(todayISO));
  const [isLoaded, setIsLoaded] = useState(false);

  const [state, setState] = useState<PersistedState>({
    transactions: [],
    budgets: DEFAULT_BUDGETS,
    recurring: [],
    groceryDraft: [],
    reminderSettings: { enabled: false, time: '20:00' },
    syncSettings: {
      autoSyncEnabled: true,
      driveFileName: 'kas_rumah_backup.json',
      hasPendingChanges: false,
    },
  });

  // Transaction modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filters on Transactions tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | CategoryId>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Konfirmasi',
    variant: 'danger',
    onConfirm: () => {},
  });

  // Google Drive Auth state
  const driveConfigured = isDriveOAuthConfigured();
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Apply light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  // Load initial data from IndexedDB
  useEffect(() => {
    let active = true;
    loadPersistedState().then((loaded) => {
      if (!active) return;
      setState(loaded);
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist every state change to IndexedDB + localStorage
  useEffect(() => {
    if (!isLoaded) return;
    savePersistedState(state);
  }, [state, isLoaded]);

  // Initialize Drive Auth listener if Firebase config exists
  useEffect(() => {
    if (!driveConfigured) return;
    return initDriveAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );
  }, [driveConfigured]);

  // Daily reminder checker
  useEffect(() => {
    if (!isLoaded) return;
    const checkReminder = async () => {
      if (shouldTriggerDailyReminder(state.reminderSettings)) {
        const sent = await showHouseholdNotification(
          'Pengingat Harian Kas Rumah',
          'Waktunya mencatat belanja dapur, pengeluaran tak terduga, dan uang masuk hari ini.'
        );
        if (sent) {
          setState((prev) => ({
            ...prev,
            reminderSettings: {
              ...prev.reminderSettings,
              lastNotifiedDate: getTodayISO(),
            },
          }));
        }
      }
    };
    checkReminder();
    const id = window.setInterval(checkReminder, 60000);
    return () => window.clearInterval(id);
  }, [isLoaded, state.reminderSettings]);

  // Perform Drive Backup
  const runDriveBackup = useCallback(async () => {
    const token = driveToken || getCachedDriveToken();
    if (!token || !isOnline) return;
    setIsSyncing(true);
    try {
      const payload = toBackupPayload(state);
      const file = await uploadBackupToDrive(token, payload, state.syncSettings.driveFileId);
      setState((prev) => ({
        ...prev,
        syncSettings: {
          ...prev.syncSettings,
          driveFileId: file.id,
          lastSyncedAt: new Date().toISOString(),
          hasPendingChanges: false,
          lastError: undefined,
        },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        syncSettings: {
          ...prev.syncSettings,
          lastError: err instanceof Error ? err.message : 'Gagal sinkron ke Google Drive',
        },
      }));
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [driveToken, isOnline, state]);

  // Auto-sync to Google Drive whenever online and changes are pending
  useEffect(() => {
    if (
      !isLoaded ||
      !isOnline ||
      !driveToken ||
      !state.syncSettings.autoSyncEnabled ||
      !state.syncSettings.hasPendingChanges ||
      isSyncing
    ) {
      return;
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      runDriveBackup().catch(() => {
        // Error stored in syncSettings.lastError
      });
    }, 2500);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [
    isLoaded,
    isOnline,
    driveToken,
    state.syncSettings.autoSyncEnabled,
    state.syncSettings.hasPendingChanges,
    isSyncing,
    runDriveBackup,
  ]);

  const mutateState = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = updater(prev);
      return {
        ...next,
        syncSettings: {
          ...next.syncSettings,
          hasPendingChanges: true,
        },
      };
    });
  }, []);

  // Handlers
  const handleSaveTransaction = (txData: {
    id?: string;
    type: TransactionType;
    category: CategoryId;
    title: string;
    amount: number;
    date: string;
    notes?: string;
    estimatedPrice?: number;
  }) => {
    const now = new Date().toISOString();
    if (txData.id) {
      mutateState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === txData.id ? { ...t, ...txData, updatedAt: now } : t
        ),
      }));
      showToast('Transaksi berhasil diperbarui.');
    } else {
      const created: Transaction = {
        id: generateId('tx'),
        type: txData.type,
        category: txData.category,
        title: txData.title,
        amount: txData.amount,
        date: txData.date,
        notes: txData.notes,
        estimatedPrice: txData.estimatedPrice,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };
      mutateState((prev) => ({
        ...prev,
        transactions: [created, ...prev.transactions],
      }));
      setMonthKey(getMonthKey(txData.date));
      showToast('Transaksi tersimpan ke Kas Rumah.');
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setConfirmState({
      open: true,
      title: 'Hapus Transaksi?',
      description: `Transaksi "${tx.title}" sebesar ${formatIDR(tx.amount)} akan dihapus permanen dari catatan lokal.`,
      confirmLabel: 'Hapus',
      variant: 'danger',
      onConfirm: () => {
        mutateState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((item) => item.id !== tx.id),
        }));
        setConfirmState((prev) => ({ ...prev, open: false }));
        showToast('Transaksi dihapus.');
      },
    });
  };

  const handleCommitGroceryItems = (checkedItems: GroceryDraftItem[]) => {
    if (checkedItems.length === 0) return;
    const now = new Date().toISOString();

    // Group checked items by category for clean daily ledger entries
    const grouped = new Map<ExpenseCategoryId, GroceryDraftItem[]>();
    for (const item of checkedItems) {
      const list = grouped.get(item.category) ?? [];
      list.push(item);
      grouped.set(item.category, list);
    }

    const newTxs: Transaction[] = [];
    for (const [cat, items] of grouped.entries()) {
      const total = items.reduce(
        (sum, i) => sum + Math.round(i.quantity * i.estimatedUnitPrice),
        0
      );
      const summaryTitle = items
        .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
        .join(', ');
      newTxs.push({
        id: generateId('tx'),
        type: 'expense',
        category: cat,
        title: summaryTitle,
        amount: total,
        estimatedPrice: total,
        date: todayISO,
        source: 'grocery_list',
        createdAt: now,
        updatedAt: now,
      });
    }

    const checkedIds = new Set(checkedItems.map((i) => i.id));
    mutateState((prev) => ({
      ...prev,
      transactions: [...newTxs, ...prev.transactions],
      groceryDraft: prev.groceryDraft.filter((i) => !checkedIds.has(i.id)),
    }));
    setMonthKey(getMonthKey(todayISO));
    showToast(`${checkedItems.length} item belanja dicatat ke pengeluaran hari ini.`);
  };

  const handleRecordRecurringPayment = (item: RecurringExpense) => {
    const now = new Date().toISOString();
    const newTx: Transaction = {
      id: generateId('tx'),
      type: 'expense',
      category: item.category,
      title: item.title,
      amount: item.amount,
      date: todayISO,
      notes: item.frequency === 'weekly' ? 'Pengeluaran tetap mingguan' : 'Pengeluaran tetap bulanan',
      source: 'recurring',
      createdAt: now,
      updatedAt: now,
    };

    mutateState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      recurring: prev.recurring.map((r) =>
        r.id === item.id ? { ...r, lastPaidDate: todayISO } : r
      ),
    }));
    setMonthKey(getMonthKey(todayISO));
    showToast(`Pembayaran "${item.title}" tercatat hari ini.`);
  };

  const handleDeleteRecurring = (item: RecurringExpense) => {
    setConfirmState({
      open: true,
      title: 'Hapus Jadwal Rutin?',
      description: `Jadwal pengeluaran tetap "${item.title}" (${formatIDR(item.amount)}) akan dihapus dari daftar rutin.`,
      confirmLabel: 'Hapus Jadwal',
      variant: 'danger',
      onConfirm: () => {
        mutateState((prev) => ({
          ...prev,
          recurring: prev.recurring.filter((r) => r.id !== item.id),
        }));
        setConfirmState((prev) => ({ ...prev, open: false }));
        showToast('Jadwal rutin dihapus.');
      },
    });
  };

  const handleUpdateBudget = (category: ExpenseCategoryId, nextLimit: number) => {
    mutateState((prev) => {
      const exists = prev.budgets.some((b) => b.category === category);
      const budgets = exists
        ? prev.budgets.map((b) => (b.category === category ? { ...b, monthlyLimit: nextLimit } : b))
        : [...prev.budgets, { category, monthlyLimit: nextLimit }];
      return { ...prev, budgets };
    });
    showToast(`Anggaran ${EXPENSE_CATEGORIES[category].label} diperbarui.`);
  };

  const handleRestoreFromDrive = () => {
    setConfirmState({
      open: true,
      title: 'Pulihkan Cadangan dari Google Drive?',
      description:
        'Data transaksi, anggaran, dan jadwal rutin saat ini di perangkat akan digantikan dengan salinan terbaru dari file kas_rumah_backup.json di Google Drive Anda.',
      confirmLabel: 'Pulihkan Data',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        const token = driveToken || getCachedDriveToken();
        if (!token) return;
        setIsSyncing(true);
        try {
          const meta = await findDriveBackupFile(token);
          if (!meta) {
            showToast('Belum ada file cadangan kas_rumah_backup.json di Google Drive.');
            return;
          }
          const payload = await downloadBackupFromDrive(token, meta.id);
          setState((prev) => ({
            ...prev,
            transactions: payload.transactions,
            budgets: payload.budgets?.length ? payload.budgets : prev.budgets,
            recurring: payload.recurring ?? [],
            groceryDraft: payload.groceryDraft ?? [],
            reminderSettings: payload.reminderSettings ?? prev.reminderSettings,
            syncSettings: {
              ...prev.syncSettings,
              driveFileId: meta.id,
              lastSyncedAt: new Date().toISOString(),
              hasPendingChanges: false,
            },
          }));
          showToast(`Berhasil memulihkan ${payload.transactions.length} transaksi dari Google Drive.`);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal memulihkan dari Google Drive.');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleImportLocalJson = (payload: KasRumahBackupPayload) => {
    setConfirmState({
      open: true,
      title: 'Impor Cadangan JSON?',
      description: `Sebanyak ${payload.transactions.length} transaksi dari file cadangan akan menggantikan data lokal saat ini.`,
      confirmLabel: 'Impor & Terapkan',
      variant: 'primary',
      onConfirm: () => {
        setState((prev) => ({
          ...prev,
          transactions: payload.transactions,
          budgets: payload.budgets?.length ? payload.budgets : prev.budgets,
          recurring: payload.recurring ?? [],
          groceryDraft: payload.groceryDraft ?? [],
          reminderSettings: payload.reminderSettings ?? prev.reminderSettings,
          syncSettings: {
            ...prev.syncSettings,
            hasPendingChanges: true,
          },
        }));
        setConfirmState((prev) => ({ ...prev, open: false }));
        showToast('Data berhasil dipulihkan dari file cadangan JSON.');
      },
    });
  };

  const handleResetData = () => {
    setConfirmState({
      open: true,
      title: 'Kosongkan Semua Catatan Kas Rumah?',
      description:
        'Semua transaksi, daftar belanja, dan jadwal rutin di perangkat akan dihapus agar Anda dapat mulai mencatat dari awal (nol). Anggaran kategori tetap dipertahankan.',
      confirmLabel: 'Kosongkan Data',
      variant: 'danger',
      onConfirm: () => {
        mutateState((prev) => ({
          ...prev,
          transactions: [],
          recurring: [],
          groceryDraft: [],
        }));
        setConfirmState((prev) => ({ ...prev, open: false }));
        showToast('Data catatan dikosongkan.');
      },
    });
  };

  // Derived Monthly Metrics
  const monthTransactions = useMemo(() => {
    return state.transactions
      .filter((t) => t.date.startsWith(monthKey))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [state.transactions, monthKey]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let todayExpense = 0;
    for (const tx of monthTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else {
        expense += tx.amount;
        if (tx.date === todayISO) todayExpense += tx.amount;
      }
    }
    return {
      income,
      expense,
      balance: income - expense,
      todayExpense,
    };
  }, [monthTransactions, todayISO]);

  const dueRecurring = useMemo(() => {
    return state.recurring.filter((item) => getRecurringStatus(item, todayISO) === 'due');
  }, [state.recurring, todayISO]);

  const hasTodayLog = useMemo(() => {
    return state.transactions.some((t) => t.date === todayISO);
  }, [state.transactions, todayISO]);

  const recentDays = useMemo(() => getRecentDays(14), []);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthTransactions.filter((tx) => {
      if (selectedDayFilter && tx.date !== selectedDayFilter) return false;
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      if (q) {
        const catLabel = ALL_CATEGORIES[tx.category]?.label.toLowerCase() ?? '';
        const match =
          tx.title.toLowerCase().includes(q) ||
          catLabel.includes(q) ||
          (tx.notes?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [monthTransactions, selectedDayFilter, filterType, filterCategory, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const list = groups.get(tx.date) ?? [];
      list.push(tx);
      groups.set(tx.date, list);
    }
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const navItems: { id: NavTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Ringkasan', mobileLabel: 'Beranda', icon: <Home className="h-5 w-5" /> },
    { id: 'transactions', label: 'Transaksi Harian', mobileLabel: 'Harian', icon: <ListOrdered className="h-5 w-5" /> },
    { id: 'shopping_recurring', label: 'Belanja & Rutin', mobileLabel: 'Belanja', icon: <ShoppingBasket className="h-5 w-5" /> },
    { id: 'budgets', label: 'Anggaran', mobileLabel: 'Anggaran', icon: <PieChart className="h-5 w-5" /> },
    { id: 'reports', label: 'Laporan & Backup', mobileLabel: 'Laporan', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9F7] dark:bg-[#0F1412] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:flex">
          <div>
            <div className="flex items-center gap-3 px-2">
              <img
                src="/icon.svg"
                alt="Logo Kas Rumah"
                className="h-9 w-9 shrink-0 rounded-xl"
              />
              <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Kas Rumah
              </span>
            </div>

            <nav aria-label="Menu utama" className="mt-7 space-y-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/60 font-semibold text-teal-800 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            {driveConfigured && !driveToken && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={async () => {
                  try {
                    const res = await signInWithGoogleDrive();
                    setDriveUser(res.user);
                    setDriveToken(res.accessToken);
                    showToast('Berhasil masuk ke Google Drive.');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Gagal masuk ke Google Drive.');
                  }
                }}
                className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                {isOnline ? (
                  <Cloud className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>
                  {!isOnline
                    ? 'Offline (IndexedDB)'
                    : isSyncing
                    ? 'Menyinkronkan...'
                    : driveToken
                    ? 'Drive Terhubung'
                    : 'Offline Ready · Lokal'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-8">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 backdrop-blur-md sm:px-6 lg:h-16">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/icon.svg"
                alt="Kas Rumah"
                className="h-8 w-8 shrink-0 rounded-lg lg:hidden"
              />
              <h1 className="font-display truncate text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                <span className="sm:hidden">Kas Rumah</span>
                <span className="hidden sm:inline">{navItems.find((n) => n.id === activeTab)?.label ?? 'Kas Rumah'}</span>
              </h1>
            </div>

            {/* Month Switcher */}
            <div className="hidden items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-1 py-1 sm:flex">
              <button
                type="button"
                onClick={() => {
                  setMonthKey((m) => shiftMonthKey(m, -1));
                  setSelectedDayFilter(null);
                }}
                aria-label="Bulan sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[118px] text-center text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {formatMonthLabelID(monthKey)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMonthKey((m) => shiftMonthKey(m, 1));
                  setSelectedDayFilter(null);
                }}
                aria-label="Bulan berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                aria-label="Ganti tema"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 lg:hidden"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTx(null);
                  setTxModalOpen(true);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Catat</span>
              </button>
            </div>
          </header>

          {/* Mobile Month Strip */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setMonthKey((m) => shiftMonthKey(m, -1));
                setSelectedDayFilter(null);
              }}
              aria-label="Bulan sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Periode {formatMonthLabelID(monthKey)}
            </span>
            <button
              type="button"
              onClick={() => {
                setMonthKey((m) => shiftMonthKey(m, 1));
                setSelectedDayFilter(null);
              }}
              aria-label="Bulan berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Main Content Area */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            {!isLoaded ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                ))}
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* KPI Strip */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>Uang Masuk</span>
                          <ArrowDownLeft className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                        </div>
                        <p className="font-mono-num mt-2 text-2xl font-bold text-teal-700 dark:text-teal-400">
                          {formatIDR(summary.income)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Total pemasukan {formatMonthLabelID(monthKey)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>Total Pengeluaran</span>
                          <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <p className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatIDR(summary.expense)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {monthTransactions.filter((t) => t.type === 'expense').length} transaksi keluar
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Sisa Kas Bulan Ini
                        </span>
                        <p
                          className={`font-mono-num mt-2 text-2xl font-bold ${
                            summary.balance < 0
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {formatIDR(summary.balance)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {summary.income > 0
                            ? `Rasio sisa ${Math.round((summary.balance / summary.income) * 100)}%`
                            : 'Catat uang masuk untuk hitung rasio'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Pengeluaran Hari Ini
                        </span>
                        <p className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatIDR(summary.todayExpense)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateID(todayISO)}
                        </p>
                      </div>
                    </div>

                    {/* Google Drive Sign-In Prompt on Overview when not connected */}
                    {driveConfigured && !driveToken && (
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
                            <Cloud className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Auto-Sinkron Google Drive
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Masuk dengan Google agar catatan offline otomatis dicadangkan saat online.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={async () => {
                            try {
                              const res = await signInWithGoogleDrive();
                              setDriveUser(res.user);
                              setDriveToken(res.accessToken);
                              showToast('Berhasil masuk ke Google Drive.');
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : 'Gagal masuk ke Google Drive.');
                            }
                          }}
                          className="inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      </div>
                    )}

                    {/* Actionable Due Bills / Daily Check-In Alerts */}
                    {(dueRecurring.length > 0 || !hasTodayLog) && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {dueRecurring.length > 0 && (
                          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4">
                            <div>
                              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                                {dueRecurring.length} Pengeluaran Tetap Jatuh Tempo
                              </p>
                              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                                {dueRecurring.map((d) => d.title).join(', ')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('shopping_recurring');
                                setSubTabShopping('recurring');
                              }}
                              className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap shrink-0"
                            >
                              Bayar Sekarang
                            </button>
                          </div>
                        )}

                        {!hasTodayLog && (
                          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Belum ada catatan hari ini
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Catat belanja dapur, bumbu masak, atau uang masuk hari ini agar anggaran tetap akurat.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTx(null);
                                setTxModalOpen(true);
                              }}
                              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                            >
                              + Catat Hari Ini
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual Analytics Overview */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-5">
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                            Pengeluaran per Kategori
                          </h2>
                          <button
                            type="button"
                            onClick={() => setActiveTab('budgets')}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap"
                          >
                            Cek Anggaran
                          </button>
                        </div>
                        <DonutCategoryChart transactions={state.transactions} monthKey={monthKey} />
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-7">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                            Grafik Harian ({formatMonthLabelID(monthKey)})
                          </h2>
                          <button
                            type="button"
                            onClick={() => exportMonthlyReportPDF(monthKey, state.transactions, state.budgets)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Unduh PDF
                          </button>
                        </div>
                        <DailyBarChart transactions={state.transactions} monthKey={monthKey} />
                      </div>
                    </div>

                    {/* Recent Transactions & Quick Pantry Preview */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:col-span-7">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                            Catatan Terbaru
                          </h2>
                          <button
                            type="button"
                            onClick={() => setActiveTab('transactions')}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            Lihat Semua
                          </button>
                        </div>

                        {monthTransactions.length === 0 ? (
                          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            Belum ada transaksi di bulan {formatMonthLabelID(monthKey)}.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {monthTransactions.slice(0, 6).map((tx) => {
                              const cat = ALL_CATEGORIES[tx.category];
                              return (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                      {tx.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      <span>{cat?.label ?? tx.category}</span>
                                      <span aria-hidden="true"> · </span>
                                      <span>{formatDateID(tx.date)}</span>
                                    </p>
                                  </div>
                                  <span
                                    className={`font-mono-num shrink-0 text-sm font-bold ${
                                      tx.type === 'income'
                                        ? 'text-teal-700 dark:text-teal-400'
                                        : 'text-slate-900 dark:text-slate-100'
                                    }`}
                                  >
                                    {tx.type === 'income' ? '+' : '-'}
                                    {formatIDR(tx.amount)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:col-span-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                            Rencana Belanja Dapur
                          </h2>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('shopping_recurring');
                              setSubTabShopping('grocery');
                            }}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            Kelola Daftar
                          </button>
                        </div>

                        {state.groceryDraft.length === 0 ? (
                          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            Daftar belanja dapur kosong.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {state.groceryDraft.slice(0, 5).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-5 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {ALL_CATEGORIES[item.category]?.shortLabel}
                                    {' · '}
                                    <span className="font-mono-num">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </p>
                                </div>
                                <span className="font-mono-num shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  ~{formatIDR(Math.round(item.quantity * item.estimatedUnitPrice))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="space-y-5">
                    {/* Horizontal 14-day Date Scroller */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Filter Cepat Tanggal Harian
                        </span>
                        {selectedDayFilter && (
                          <button
                            type="button"
                            onClick={() => setSelectedDayFilter(null)}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            Tampilkan Semua Hari
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {recentDays.map((d) => {
                          const isSelected = selectedDayFilter === d.iso;
                          const isToday = d.iso === todayISO;
                          return (
                            <button
                              key={d.iso}
                              type="button"
                              onClick={() => {
                                setMonthKey(getMonthKey(d.iso));
                                setSelectedDayFilter((prev) => (prev === d.iso ? null : d.iso));
                              }}
                              className={`flex min-h-[54px] min-w-[48px] shrink-0 flex-col items-center justify-center rounded-xl border px-2.5 py-1.5 transition-colors ${
                                isSelected
                                  ? 'border-teal-700 bg-teal-700 text-white'
                                  : isToday
                                  ? 'border-teal-300 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-[10px] font-medium">{d.dayShort}</span>
                              <span className="font-mono-num text-sm font-bold">{d.dayNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari bawang, belanja online, gaji..."
                          className="min-h-[42px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pr-4 pl-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
                        {(['all', 'expense', 'income'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFilterType(t)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              filterType === t
                                ? 'bg-teal-700 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {t === 'all' ? 'Semua' : t === 'expense' ? 'Keluar' : 'Masuk'}
                          </button>
                        ))}
                      </div>

                      <select
                        aria-label="Filter kategori"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as 'all' | CategoryId)}
                        className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-teal-600 focus:outline-none"
                      >
                        <option value="all">Semua Kategori</option>
                        {Object.values(ALL_CATEGORIES).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date-Grouped Ledger */}
                    {groupedByDate.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tidak ada catatan transaksi yang cocok
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Coba ubah filter tanggal atau catat pengeluaran rumah tangga baru.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(null);
                            setTxModalOpen(true);
                          }}
                          className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          <Plus className="h-4 w-4" />
                          Catat Transaksi Pertama
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupedByDate.map(([dateKey, items]) => {
                          const dayExpense = items
                            .filter((i) => i.type === 'expense')
                            .reduce((s, i) => s + i.amount, 0);
                          const dayIncome = items
                            .filter((i) => i.type === 'income')
                            .reduce((s, i) => s + i.amount, 0);

                          return (
                            <div
                              key={dateKey}
                              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {formatDateID(dateKey)}
                                  {dateKey === todayISO ? ' · Hari Ini' : ''}
                                </span>
                                <div className="flex items-center gap-3 text-xs">
                                  {dayIncome > 0 && (
                                    <span className="font-mono-num font-semibold text-teal-700 dark:text-teal-400">
                                      +{formatIDR(dayIncome)}
                                    </span>
                                  )}
                                  {dayExpense > 0 && (
                                    <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-300">
                                      -{formatIDR(dayExpense)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((tx) => {
                                  const cat = ALL_CATEGORIES[tx.category];
                                  return (
                                    <div
                                      key={tx.id}
                                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                          {tx.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                          <span>{cat?.label ?? tx.category}</span>
                                          {tx.notes && (
                                            <>
                                              <span aria-hidden="true"> · </span>
                                              <span>{tx.notes}</span>
                                            </>
                                          )}
                                        </p>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2">
                                        <span
                                          className={`font-mono-num text-sm font-bold ${
                                            tx.type === 'income'
                                              ? 'text-teal-700 dark:text-teal-400'
                                              : 'text-slate-900 dark:text-slate-100'
                                          }`}
                                        >
                                          {tx.type === 'income' ? '+' : '-'}
                                          {formatIDR(tx.amount)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingTx(tx);
                                            setTxModalOpen(true);
                                          }}
                                          aria-label={`Ubah ${tx.title}`}
                                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTransaction(tx)}
                                          aria-label={`Hapus ${tx.title}`}
                                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'shopping_recurring' && (
                  <div className="space-y-6">
                    <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
                      <button
                        type="button"
                        onClick={() => setSubTabShopping('grocery')}
                        className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          subTabShopping === 'grocery'
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <ShoppingBasket className="h-4 w-4" />
                        <span>Belanja Dapur, Bumbu & Pokok</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTabShopping('recurring')}
                        className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          subTabShopping === 'recurring'
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          Tetap Mingguan & Bulanan
                          {dueRecurring.length > 0 ? ` (${dueRecurring.length})` : ''}
                        </span>
                      </button>
                    </div>

                    {subTabShopping === 'grocery' ? (
                      <GroceryPlanner
                        items={state.groceryDraft}
                        history={state.transactions}
                        onChangeItems={(next) =>
                          mutateState((prev) => ({ ...prev, groceryDraft: next }))
                        }
                        onCommitChecked={handleCommitGroceryItems}
                      />
                    ) : (
                      <RecurringBillsView
                        recurring={state.recurring}
                        onSaveRecurring={(next) =>
                          mutateState((prev) => ({ ...prev, recurring: next }))
                        }
                        onRecordPayment={handleRecordRecurringPayment}
                        onRequestDelete={handleDeleteRecurring}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'budgets' && (
                  <BudgetsView
                    monthKey={monthKey}
                    transactions={state.transactions}
                    budgets={state.budgets}
                    onUpdateBudget={handleUpdateBudget}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsAndBackupView
                    monthKey={monthKey}
                    transactions={state.transactions}
                    budgets={state.budgets}
                    reminderSettings={state.reminderSettings}
                    syncSettings={state.syncSettings}
                    driveConfigured={driveConfigured}
                    driveUser={driveUser}
                    isDriveConnected={Boolean(driveUser && driveToken)}
                    isSyncing={isSyncing}
                    onUpdateReminder={(next: ReminderSettings) =>
                      mutateState((prev) => ({ ...prev, reminderSettings: next }))
                    }
                    onUpdateSyncSettings={(next: SyncSettings) =>
                      setState((prev) => ({ ...prev, syncSettings: next }))
                    }
                    onSignInDrive={async () => {
                      const res = await signInWithGoogleDrive();
                      setDriveUser(res.user);
                      setDriveToken(res.accessToken);
                    }}
                    onSignOutDrive={async () => {
                      await signOutGoogleDrive();
                      setDriveUser(null);
                      setDriveToken(null);
                    }}
                    onBackupToDrive={runDriveBackup}
                    onRequestRestoreFromDrive={handleRestoreFromDrive}
                    onExportLocalJson={() => exportLocalJsonFile(toBackupPayload(state))}
                    onImportLocalJson={handleImportLocalJson}
                    onRequestResetData={handleResetData}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Navigasi bawah seluler"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active
                    ? 'font-semibold text-teal-700 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-[64px]">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator hasPendingChanges={state.syncSettings.hasPendingChanges} />

      {/* Transient Toast */}
      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-5"
        >
          {toastMsg}
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        open={txModalOpen}
        initialTransaction={editingTx}
        defaultDate={selectedDayFilter ?? todayISO}
        history={state.transactions}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
