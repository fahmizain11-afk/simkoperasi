import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export interface DeleteItemDetail {
  label: string;
  value: string;
  isHighlight?: boolean;
}

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemType?: string;
  itemName?: string;
  itemDetails?: DeleteItemDetail[];
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Konfirmasi Penghapusan',
  itemType = 'Record Data',
  itemName,
  itemDetails,
  warningMessage = 'Tindakan ini permanen. Record yang dihapus tidak dapat dikembalikan dan akan memperbarui saldo buku kas serta laporan keuangan koperasi secara otomatis.',
  confirmText = 'Ya, Hapus Data',
  cancelText = 'Batal',
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="confirm-delete-modal-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <motion.div
            id="confirm-delete-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-100 dark:border-rose-950/40 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-5 pb-4 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                    Hapus {itemType}
                  </p>
                </div>
              </div>
              <button
                id="close-confirm-modal-btn"
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3.5">
              {itemName && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Item yang akan dihapus:
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">
                    {itemName}
                  </p>
                </div>
              )}

              {itemDetails && itemDetails.length > 0 && (
                <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
                  {itemDetails.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{detail.label}:</span>
                      <span className={`font-semibold ${detail.isHighlight ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {warningMessage}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-2.5 justify-end">
              <button
                id="cancel-delete-btn"
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                onClick={async () => {
                  await onConfirm();
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
