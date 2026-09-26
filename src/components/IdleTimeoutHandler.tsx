import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldAlert, LogOut, CheckCircle, RefreshCw, X, Lock } from 'lucide-react';

interface IdleTimeoutHandlerProps {
  isLoggedIn: boolean;
  onLogout: (reason?: string) => void;
  timeoutMinutes?: number; // Default 2 minutes
  warningSeconds?: number; // Default 20 seconds before logout
  userName?: string;
  userRole?: string | null;
}

export const IdleTimeoutHandler: React.FC<IdleTimeoutHandlerProps> = ({
  isLoggedIn,
  onLogout,
  timeoutMinutes = 2,
  warningSeconds = 20,
  userName,
  userRole,
}) => {
  const timeoutMs = timeoutMinutes * 60 * 1000; // e.g. 120,000 ms for 2 minutes
  const warningMs = warningSeconds * 1000; // e.g. 20,000 ms

  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(warningSeconds);
  const lastActivityRef = useRef<number>(Date.now());
  const logoutTriggeredRef = useRef<boolean>(false);

  // Reset activity function
  const resetActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    logoutTriggeredRef.current = false;
    try {
      localStorage.setItem('koperasi_last_active_time', String(now));
    } catch (e) {
      // Ignore storage errors
    }
    setShowWarning(false);
  }, []);

  // Event listeners for user interaction
  useEffect(() => {
    if (!isLoggedIn) {
      setShowWarning(false);
      logoutTriggeredRef.current = false;
      return;
    }

    // Set initial activity time
    const now = Date.now();
    lastActivityRef.current = now;
    logoutTriggeredRef.current = false;
    try {
      localStorage.setItem('koperasi_last_active_time', String(now));
    } catch (e) {}

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'click'
    ];

    let lastThrottle = 0;
    const handleActivity = () => {
      const currentTime = Date.now();
      // Throttle event handling to once per 800ms to maintain optimum UI performance
      if (currentTime - lastThrottle > 800) {
        lastThrottle = currentTime;
        lastActivityRef.current = currentTime;
        try {
          localStorage.setItem('koperasi_last_active_time', String(currentTime));
        } catch (e) {}
      }

      // If warning modal is open, any user keyboard/mouse activity automatically extends session
      setShowWarning(prev => {
        if (prev) {
          lastActivityRef.current = currentTime;
          return false;
        }
        return prev;
      });
    };

    events.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    // Check timer every 1 second
    const interval = setInterval(() => {
      if (logoutTriggeredRef.current) return;

      const currentTime = Date.now();
      // Check if another tab recorded activity more recently
      let effectiveLastActive = lastActivityRef.current;
      try {
        const storedActive = localStorage.getItem('koperasi_last_active_time');
        if (storedActive) {
          const parsed = parseInt(storedActive, 10);
          if (!isNaN(parsed) && parsed > effectiveLastActive) {
            effectiveLastActive = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch (e) {}

      const idleDuration = currentTime - effectiveLastActive;
      const timeLeft = timeoutMs - idleDuration;

      if (timeLeft <= 0) {
        // Timeout reached (2 minutes without activity)
        logoutTriggeredRef.current = true;
        setShowWarning(false);
        onLogout('idle');
      } else if (timeLeft <= warningMs) {
        // Show countdown modal
        const secondsRemaining = Math.max(1, Math.ceil(timeLeft / 1000));
        setRemainingSeconds(secondsRemaining);
        setShowWarning(true);
      } else {
        // In safe zone
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearInterval(interval);
    };
  }, [isLoggedIn, timeoutMs, warningMs, onLogout]);

  // Handle keyboard shortcut [Enter] or [Space] when warning modal is open to continue session
  useEffect(() => {
    if (!showWarning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        resetActivity();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWarning, resetActivity]);

  if (!isLoggedIn) return null;

  // Percentage for the warning timer progress bar
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / warningSeconds) * 100));

  return (
    <AnimatePresence>
      {showWarning && (
        <div
          id="idle-timeout-warning-overlay"
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm transition-all"
        >
          <motion.div
            id="idle-timeout-modal"
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-500/30 overflow-hidden"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-warning-title"
          >
            {/* Countdown indicator header */}
            <div className="p-6 pb-4 bg-gradient-to-b from-amber-50/80 to-transparent dark:from-amber-950/20 text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 mb-3 shadow-sm">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <h3 id="idle-warning-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Peringatan Tidak Ada Aktivitas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sesi Anda akan ditutup otomatis demi keamanan akun
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-3 space-y-4 text-center">
              {/* Giant Countdown Badge */}
              <div className="py-3 px-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-wider">
                  {remainingSeconds}s
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  detik tersisa sebelum logout ke Portal Utama
                </span>

                {/* Shrinking progress bar */}
                <div className="w-full bg-amber-200/60 dark:bg-amber-900/60 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-amber-500 dark:bg-amber-400 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    Sistem mendeteksi tidak ada aktivitas selama <strong>hampir 2 menit</strong>. Untuk menjaga kerahasiaan data pembukuan dan kas koperasi, akun Anda akan otomatis dikeluarkan ke Portal Utama.
                  </p>
                </div>
                {userName && (
                  <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Pengguna Aktif:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {userName} {userRole ? `(${userRole})` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-3 flex flex-col sm:flex-row gap-2.5">
              <button
                id="idle-continue-session-btn"
                type="button"
                onClick={resetActivity}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tetap Masuk (Lanjutkan Sesi)
              </button>
              <button
                id="idle-logout-now-btn"
                type="button"
                onClick={() => onLogout('idle')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout Sekarang
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
