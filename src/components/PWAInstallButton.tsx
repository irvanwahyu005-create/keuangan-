import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setSwActive(regs.length > 0 || Boolean(navigator.serviceWorker.controller));
      });
    }
  }, [showGuide]);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) setShowGuide(true);
      return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 dark:bg-teal-950/60 px-2.5 sm:px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 transition-colors hover:bg-teal-100 dark:hover:bg-teal-900/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">Install</span>
        <span className="hidden sm:inline">Install PWA</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="pwa-guide-title"
                    className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    Install Kas Rumah (PWA Offline)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bisa dibuka penuh tanpa internet di Chrome & HP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan instalasi"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live PWA & Offline Readiness */}
            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Service Worker Offline</span>
                <span className={`font-semibold ${swActive ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {swActive ? 'Aktif' : 'Siap di tab Chrome'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Database Lokal (IndexedDB)</span>
                <span className="font-semibold text-teal-700 dark:text-teal-400">Aktif</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Web App Manifest</span>
                <span className="font-semibold text-teal-700 dark:text-teal-400">Kas Rumah</span>
              </div>
            </div>

            {isInIframe && (
              <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Buka di Tab Chrome Baru untuk Meng-install
                </p>
                <p className="mt-1">
                  Browser Chrome menonaktifkan prompt install otomatis saat halaman dibuka di dalam jendela pratinjau (iframe). Salin URL di bawah dan buka langsung di tab baru Google Chrome:
                </p>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'URL Disalin' : 'Salin URL Aplikasi'}</span>
                </button>
              </div>
            )}

            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari.</li>
                <li>2. Gulir ke bawah dan ketuk <strong>Tambah ke Layar Utama</strong>.</li>
                <li>3. Ketuk <strong>Tambah</strong> untuk menjalankan Kas Rumah secara offline.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <li>1. Buka URL aplikasi di tab baru <strong>Google Chrome</strong> (Desktop / Android).</li>
                <li>2. Di Desktop: klik ikon <strong>Install</strong> di kanan kolom alamat Chrome (atau menu <strong>⋮ → Simpan dan bagikan → Install Kas Rumah</strong>).</li>
                <li>3. Di Android: ketuk menu <strong>⋮ → Tambahkan ke layar utama / Install aplikasi</strong>.</li>
                <li className="flex items-center gap-1.5 pt-1 text-slate-500 dark:text-slate-400">
                  <WifiOff className="h-3.5 w-3.5 shrink-0" />
                  <span>Setelah ter-install, aplikasi dapat dibuka penuh meski tanpa koneksi internet.</span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
