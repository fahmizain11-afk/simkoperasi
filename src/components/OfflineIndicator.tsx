import React from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const { isOnline, wasOffline } = useOnlineStatus();

  // If online and was not previously offline, hide indicator
  if (isOnline && !wasOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-bounce-short">
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-600 dark:bg-amber-700 text-white shadow-xl shadow-amber-900/30 border border-amber-400/30 text-xs font-medium backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-ping" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[11px] leading-tight">Mode Offline Aktif</p>
            <p className="text-[10px] text-amber-100 leading-tight truncate">Data profil & simpanan diakses dari cache instan.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            title="Coba hubungkan kembali"
            className="p-1 rounded-lg bg-amber-700/80 hover:bg-amber-800 text-amber-100 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600 dark:bg-emerald-700 text-white shadow-xl shadow-emerald-900/30 border border-emerald-400/30 text-xs font-medium backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[11px] leading-tight">Koneksi Internet Pulih</p>
            <p className="text-[10px] text-emerald-100 leading-tight">Sinkronisasi data otomatis dengan cloud.</p>
          </div>
        </div>
      )}
    </div>
  );
};
