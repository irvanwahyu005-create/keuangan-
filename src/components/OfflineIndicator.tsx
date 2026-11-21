import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  hasPendingChanges?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ hasPendingChanges }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg md:bottom-5"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        Mode Offline — Data tersimpan di perangkat
        {hasPendingChanges ? ' · Menunggu sinkron saat online' : ''}
      </span>
    </div>
  );
};
