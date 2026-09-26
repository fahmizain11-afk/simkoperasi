import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  X, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Bell
} from 'lucide-react';
import { Pengumuman } from '../types';

interface AnnouncementPopupModalProps {
  announcements?: Pengumuman[];
  namaKoperasi?: string;
  storageKeyPrefix?: string; // e.g., 'portal_public' or 'member_cabinet'
}

export const AnnouncementPopupModal: React.FC<AnnouncementPopupModalProps> = ({
  announcements,
  namaKoperasi = 'Koperasi Dana Segar',
  storageKeyPrefix = 'portal_announcement'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dontShowAgainSession, setDontShowAgainSession] = useState(false);

  // Filter only active announcements
  const activeList = (announcements || []).filter(a => a.status === 'Aktif');

  useEffect(() => {
    if (activeList.length === 0) {
      setIsOpen(false);
      return;
    }

    // Check if user has already dismissed this set of announcements in the current session
    const lastDismissedId = sessionStorage.getItem(`${storageKeyPrefix}_dismissed_latest_id`);
    const latestAnnId = activeList[0]?.id || '';
    
    // If the latest announcement ID is different or not dismissed, show popup
    if (lastDismissedId !== latestAnnId) {
      // Small delay for smooth entry after page loads
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeList.length, storageKeyPrefix]);

  if (!isOpen || activeList.length === 0) return null;

  const currentAnn = activeList[activeIdx] || activeList[0];

  const handleClose = () => {
    setIsOpen(false);
    if (dontShowAgainSession && activeList[0]?.id) {
      sessionStorage.setItem(`${storageKeyPrefix}_dismissed_latest_id`, activeList[0].id);
    }
  };

  const handleNext = () => {
    if (activeIdx < activeList.length - 1) {
      setActiveIdx(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans my-8">
        
        {/* Modal Header */}
        <div className={`p-6 text-white relative ${
          currentAnn.isUrgent 
            ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700' 
            : 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800'
        }`}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Tutup Pengumuman"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              {currentAnn.isUrgent ? (
                <AlertTriangle className="w-6 h-6 text-rose-200 animate-bounce" />
              ) : (
                <Megaphone className="w-6 h-6 text-emerald-200 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  currentAnn.isUrgent 
                    ? 'bg-rose-900/60 text-rose-200 border border-rose-400/40' 
                    : 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/40'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  {currentAnn.isUrgent ? 'PENGUMUMAN PENTING & URGENT' : 'PENGUMUMAN RESMI'}
                </span>
                {activeList.length > 1 && (
                  <span className="text-[11px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                    {activeIdx + 1} dari {activeList.length}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                {currentAnn.judul}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-150 dark:border-slate-800 gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tanggal: <strong>{currentAnn.tanggal}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-slate-400" />
              <span>Diterbitkan oleh: <strong className="text-slate-700 dark:text-slate-200">Pengurus Koperasi</strong></span>
            </div>
          </div>

          {/* Announcement Content */}
          <div className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-850/60 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 max-h-60 overflow-y-auto">
            {currentAnn.konten}
          </div>

          {/* Pagination Indicators if multiple */}
          {activeList.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {activeList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeIdx 
                      ? 'w-6 bg-emerald-600 dark:bg-emerald-400' 
                      : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                  }`}
                  aria-label={`Lihat pengumuman ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-150 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none self-start sm:self-center">
              <input
                type="checkbox"
                checked={dontShowAgainSession}
                onChange={(e) => setDontShowAgainSession(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>Jangan tampilkan lagi pada sesi ini</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {activeList.length > 1 && activeIdx > 0 && (
                <button
                  onClick={() => setActiveIdx(prev => prev - 1)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Sebelumnya
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
              >
                {activeIdx < activeList.length - 1 ? (
                  <>
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saya Mengerti</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
