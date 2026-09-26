import React from 'react';
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  Check, 
  X, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  appName = 'Koperasi Dana Segar SMKN 10 Garut'
}) => {
  const { isInstallable, isInstalled, isIOS, isStandalone, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans my-8">
        {/* Header Ribbon / Banner */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg shrink-0 flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="Logo Koperasi" 
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  // fallback to favicon.svg if image not yet loaded
                  (e.target as HTMLImageElement).src = '/favicon.svg';
                }}
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase text-emerald-100">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Web App Resmi
              </span>
              <h3 className="text-base font-extrabold text-white mt-1 leading-snug">
                Pasang ke Layar Utama HP
              </h3>
              <p className="text-xs text-emerald-100/90 leading-tight mt-0.5">
                {appName}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Keuntungan Fitur */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Buka Instan 1-Klik</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Langsung dari beranda HP tanpa perlu buka browser dan mengetik alamat URL lagi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
              <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Mode Caching Cepat (Offline)</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Akses profil, kartu anggota, dan riwayat simpanan secara instan saat sinyal lemot.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
              <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Hemat Memori & Ringan</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Ukuran di bawah 2 MB, tidak membebani memori HP dan selalu terupdate otomatis.
                </p>
              </div>
            </div>
          </div>

          {/* Action Sections */}
          {isStandalone || isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white mb-1">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Aplikasi Sudah Terpasang!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Anda sudah menjalankan aplikasi koperasi dalam mode layar penuh mandiri (*Standalone App*).
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow"
              >
                Tutup Jendela
              </button>
            </div>
          ) : isInstallable ? (
            /* Android / Chrome / Edge 1-Click Install */
            <div className="space-y-3 pt-2">
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Pasang Sekarang (1-Klik)
              </button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                Klik tombol di atas untuk konfirmasi pemasangan ke layar utama perangkat Anda.
              </p>
            </div>
          ) : isIOS ? (
            /* iOS Safari Step by Step Guide */
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Panduan Pemasangan di iPhone / iPad (Safari)
              </div>
              
              <ol className="text-xs space-y-2.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    Tekan tombol <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700"><Share2 className="w-3 h-3" /> Share / Bagikan</span> di bilah navigasi bawah Safari.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Geser menu ke bawah lalu pilih menu <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700"><PlusSquare className="w-3 h-3" /> Tambah ke Layar Utama</span> (*Add to Home Screen*).
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Tekan <strong className="text-slate-800 dark:text-slate-100">Tambah</strong> (*Add*) di sudut kanan atas. Ikon aplikasi koperasi akan langsung tampil di Beranda iPhone Anda!
                  </div>
                </li>
              </ol>

              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition"
              >
                Saya Mengerti
              </button>
            </div>
          ) : (
            /* General Browser Fallback (e.g. Chrome on Desktop / In-Browser) */
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Cara Pasang di Browser:
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tekan tombol titik tiga <strong>(⋮)</strong> di sudut kanan atas browser Anda, lalu pilih <strong>&quot;Pasang Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (*Install App / Add to Home Screen*).
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow"
              >
                Tutup Panduan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
