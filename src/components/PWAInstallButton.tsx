import React, { useState } from 'react';
import { Download, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'card' | 'compact' | 'drawer';
  className?: string;
  appName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
  appName = 'Koperasi Dana Segar SMKN 10 Garut'
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, isMobile, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If on PC/Desktop (not mobile) or already running as standalone PWA app, hide the install button
  if (!isMobile || isStandalone || isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          id="btn-pwa-install-nav"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm border border-emerald-500/40 active:scale-95 cursor-pointer ${className}`}
          title="Pasang aplikasi ke layar utama HP (1-Klik)"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
          <span>Pasang di HP</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          id="btn-pwa-install-compact"
          onClick={handleClick}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition border border-emerald-200 dark:border-emerald-800 cursor-pointer ${className}`}
        >
          <Download className="w-3 h-3" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'drawer' && (
        <button
          id="btn-pwa-install-drawer"
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md transition active:scale-98 cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20">
              <Smartphone className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Pasang Aplikasi di HP</p>
              <p className="text-[10px] text-emerald-100 font-normal">Akses 1-Klik & Mode Offline Cepat</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] uppercase font-extrabold tracking-wider">
            GRATIS
          </span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg border border-emerald-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-2.5 flex items-center justify-center border border-white/20 shrink-0">
              <Smartphone className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-[10px] font-extrabold text-emerald-200 uppercase tracking-wide">
                  PWA Mobile
                </span>
                <span className="text-[11px] text-emerald-200/80">Android & iOS</span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                Pasang Aplikasi Koperasi ke Layar Utama HP
              </h4>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Buka profil, cek simpanan, dan kuitansi seketika tanpa perlu buka browser dan login berulang kali.
              </p>
            </div>
          </div>

          <button
            id="btn-pwa-install-banner-action"
            onClick={handleClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Pasang ke HP Sekarang
          </button>
        </div>
      )}

      {variant === 'card' && (
        <div className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Aplikasi Layar Utama (PWA)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Akses instan 1-klik & Caching cepat</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0 cursor-pointer"
          >
            Pasang
          </button>
        </div>
      )}

      {/* Full Installation Guidance Modal */}
      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appName={appName}
      />
    </>
  );
};
