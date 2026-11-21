import React, { useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bell,
  Cloud,
  CloudOff,
  Download,
  FileDown,
  LogOut,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showHouseholdNotification,
} from '../services/notifications';
import { exportMonthlyReportPDF } from '../services/pdfExport';
import type {
  CategoryBudget,
  KasRumahBackupPayload,
  ReminderSettings,
  SyncSettings,
  Transaction,
} from '../types/finance';
import { formatMonthLabelID } from '../utils/format';
import { DailyBarChart, DonutCategoryChart } from './Charts';

interface ReportsAndBackupViewProps {
  monthKey: string;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  reminderSettings: ReminderSettings;
  syncSettings: SyncSettings;
  driveConfigured: boolean;
  driveUser: User | null;
  isDriveConnected: boolean;
  isSyncing: boolean;
  onUpdateReminder: (next: ReminderSettings) => void;
  onUpdateSyncSettings: (next: SyncSettings) => void;
  onSignInDrive: () => Promise<void>;
  onSignOutDrive: () => Promise<void>;
  onBackupToDrive: () => Promise<void>;
  onRequestRestoreFromDrive: () => void;
  onExportLocalJson: () => void;
  onImportLocalJson: (payload: KasRumahBackupPayload) => void;
  onRequestResetData: () => void;
}

export const ReportsAndBackupView: React.FC<ReportsAndBackupViewProps> = ({
  monthKey,
  transactions,
  budgets,
  reminderSettings,
  syncSettings,
  driveConfigured,
  driveUser,
  isDriveConnected,
  isSyncing,
  onUpdateReminder,
  onUpdateSyncSettings,
  onSignInDrive,
  onSignOutDrive,
  onBackupToDrive,
  onRequestRestoreFromDrive,
  onExportLocalJson,
  onImportLocalJson,
  onRequestResetData,
}) => {
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleReminder = async () => {
    setErrorMsg(null);
    if (!reminderSettings.enabled) {
      const perm = await requestNotificationPermission();
      setNotifPerm(perm);
      if (perm === 'denied') {
        setErrorMsg('Izin notifikasi diblokir oleh browser. Aktifkan izin notifikasi di setelan situs Chrome.');
        return;
      }
      onUpdateReminder({ ...reminderSettings, enabled: true });
      setFeedback(`Pengingat harian diaktifkan pada pukul ${reminderSettings.time}.`);
    } else {
      onUpdateReminder({ ...reminderSettings, enabled: false });
      setFeedback('Pengingat harian dinonaktifkan.');
    }
  };

  const handleTestNotification = async () => {
    setErrorMsg(null);
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm !== 'granted') {
      setErrorMsg('Berikan izin notifikasi pada browser untuk mengirim pengingat harian.');
      return;
    }
    const ok = await showHouseholdNotification(
      'Pengingat Kas Rumah',
      'Sudah catat belanja dapur, pengeluaran tak terduga, dan uang masuk hari ini?'
    );
    if (ok) {
      setFeedback('Notifikasi pengingat berhasil dikirim.');
    } else {
      setErrorMsg('Browser tidak mendukung tampilan notifikasi sistem di mode ini.');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as KasRumahBackupPayload;
      if (!data || data.app !== 'Kas Rumah' || !Array.isArray(data.transactions)) {
        throw new Error('Format file cadangan JSON tidak valid.');
      }
      onImportLocalJson(data);
      setFeedback(`Berhasil memuat cadangan lokal (${data.transactions.length} transaksi).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membaca file JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDriveSignIn = async () => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      await onSignInDrive();
      setFeedback('Terhubung ke Google Drive. Siap melakukan sinkronisasi cadangan.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal masuk ke Google Drive.');
    }
  };

  const handleManualDriveBackup = async () => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      await onBackupToDrive();
      setFeedback('Cadangan Kas Rumah berhasil disinkronkan ke Google Drive.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mencadangkan ke Google Drive.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Action Bar for PDF Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Laporan Visual & Ekspor PDF
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Periode aktif: {formatMonthLabelID(monthKey)} · Tersedia penuh saat offline.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportMonthlyReportPDF(monthKey, transactions, budgets)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap"
        >
          <FileDown className="h-4 w-4" />
          <span>Export Laporan PDF</span>
        </button>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-5">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Komposisi Pengeluaran (Donat)
          </h3>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Ketuk atau arahkan kursor ke segmen untuk detail nominal kategori.
          </p>
          <DonutCategoryChart transactions={transactions} monthKey={monthKey} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-7">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Arus Pengeluaran & Kas Harian (Batang)
          </h3>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Pantau lonjakan belanja harian sepanjang bulan {formatMonthLabelID(monthKey)}.
          </p>
          <DailyBarChart transactions={transactions} monthKey={monthKey} />
        </div>
      </div>

      {/* Notifications & Google Drive Backup Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Reminder Notifications */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Notifikasi Pengingat Harian
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Status izin browser: {notifPerm === 'granted' ? 'Diizinkan' : notifPerm === 'denied' ? 'Diblokir' : 'Belum diminta'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleReminder}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                reminderSettings.enabled
                  ? 'bg-teal-700 text-white hover:bg-teal-800'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {reminderSettings.enabled ? 'Aktif' : 'Aktifkan'}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="reminder-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Jam Pengingat Harian
              </label>
              <input
                id="reminder-time"
                type="time"
                value={reminderSettings.time}
                onChange={(e) =>
                  onUpdateReminder({ ...reminderSettings, time: e.target.value })
                }
                className="font-mono-num mt-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              className="min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Kirim Tes Notifikasi
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Pengingat otomatis muncul sesuai jam pilihan agar catatan belanja dapur dan pengeluaran harian keluarga tidak terlewat.
          </p>
        </div>

        {/* Google Drive Auto-Sync & Local Backup */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400">
                {isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Backup & Auto-Sinkron Google Drive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {syncSettings.lastSyncedAt
                    ? `Terakhir sinkron: ${new Date(syncSettings.lastSyncedAt).toLocaleString('id-ID')}`
                    : 'Belum pernah sinkron ke Google Drive'}
                  {syncSettings.hasPendingChanges ? ' · Perubahan lokal menunggu sinkron' : ''}
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={syncSettings.autoSyncEnabled}
                onChange={(e) =>
                  onUpdateSyncSettings({ ...syncSettings, autoSyncEnabled: e.target.checked })
                }
                className="h-4 w-4 accent-teal-700"
              />
              <span>Auto-sinkron</span>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {driveConfigured && isDriveConnected && driveUser ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {driveUser.displayName || 'Akun Google Terhubung'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{driveUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOutDrive}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Keluar
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!isOnline || isSyncing}
                    onClick={handleManualDriveBackup}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Backup ke Drive Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline || isSyncing}
                    onClick={onRequestRestoreFromDrive}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Pulihkan dari Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Masuk dengan akun Google untuk mencadangkan <code className="font-mono-num">kas_rumah_backup.json</code> otomatis saat online.
                  </p>
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={handleDriveSignIn}
                    className="inline-flex min-h-[40px] items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50"
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
                {!driveConfigured && (
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Izin Google Drive sedang menunggu persetujuan pada kartu koneksi di bawah chat. Setelah disetujui, tombol masuk Google Drive di atas akan langsung aktif.
                  </p>
                )}
              </div>
            )}

            {/* Portable Offline JSON Backup & Reset */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onExportLocalJson}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Ekspor Cadangan (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Impor Cadangan (.json)</span>
              </button>

              <button
                type="button"
                onClick={onRequestResetData}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Kosongkan Data</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </div>

          {feedback && (
            <p role="status" className="mt-3 text-xs font-medium text-teal-700 dark:text-teal-400">
              {feedback}
            </p>
          )}
          {errorMsg && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
