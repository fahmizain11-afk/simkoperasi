import React, { useState, useMemo } from 'react';
import { Angsuran, Pinjaman } from '../types';
import { formatRupiah } from '../utils/finance';
import { Check, CheckCircle2, Lock, AlertCircle, RotateCcw, Sparkles, CreditCard, ChevronRight, ArrowRight } from 'lucide-react';

export interface KalenderAngsuranPinjamanProps {
  pinjaman: Pinjaman;
  relatedPayments: Angsuran[];
  sisaPokok: number;
  jasaBulanBerjalan?: number;
  selectedInstallments: number[];
  onSelectInstallments: (installments: number[]) => void;
  readOnly?: boolean;
  className?: string;
  compact?: boolean;
}

export interface InstallmentValidationResult {
  isValid: boolean;
  error?: string;
  expectedSequence?: number[];
}

/**
 * Validasi pemilihan bulan angsuran harus berurutan secara kronologis sesuai sisa tenor pinjaman.
 * Aturan:
 * 1. Angsuran yang dipilih harus dimulai dari angsuran tertua yang belum dibayar (unpaid[0]).
 * 2. Seluruh angsuran yang dipilih harus berurutan (kontigu tanpa celah/jeda) sesuai sisa tenor.
 */
export function validateChronologicalInstallments(
  selected: number[],
  unpaid: number[]
): InstallmentValidationResult {
  if (!unpaid || unpaid.length === 0) {
    return { isValid: true };
  }
  if (!selected || selected.length === 0) {
    return {
      isValid: false,
      error: `Pilih minimal 1 bulan angsuran. Angsuran berjalan yang harus dibayar adalah Angsuran Ke-${unpaid[0]}.`,
      expectedSequence: [unpaid[0]]
    };
  }

  const sortedSelected = [...selected].sort((a, b) => a - b);
  const firstUnpaid = unpaid[0];

  // Aturan 1: Harus dimulai dari angsuran pertama yang belum dibayar
  if (sortedSelected[0] !== firstUnpaid) {
    return {
      isValid: false,
      error: `Pemilihan angsuran harus dimulai secara kronologis dari Angsuran Ke-${firstUnpaid} (angsuran tertua/berjalan yang belum lunas). Anda tidak dapat melompati Angsuran Ke-${firstUnpaid}.`,
      expectedSequence: unpaid.slice(0, sortedSelected.length)
    };
  }

  // Aturan 2: Harus berurutan terus menerus tanpa jeda (contoh valid: [3], [3, 4], [3, 4, 5])
  for (let i = 0; i < sortedSelected.length; i++) {
    const expected = unpaid[i];
    if (sortedSelected[i] !== expected) {
      return {
        isValid: false,
        error: `Pemilihan angsuran harus berurutan secara kronologis sesuai sisa tenor pinjaman. Ditemukan lompatan pada Angsuran Ke-${sortedSelected[i]} (seharusnya Angsuran Ke-${expected} terlebih dahulu).`,
        expectedSequence: unpaid.slice(0, sortedSelected.length)
      };
    }
  }

  return { isValid: true };
}

export const KalenderAngsuranPinjaman: React.FC<KalenderAngsuranPinjamanProps> = ({
  pinjaman,
  relatedPayments = [],
  sisaPokok,
  jasaBulanBerjalan,
  selectedInstallments,
  onSelectInstallments,
  readOnly = false,
  className = '',
  compact = false
}) => {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [pendingRangeTarget, setPendingRangeTarget] = useState<number | null>(null);

  const tenor = pinjaman.tenor || 10;
  const nomPinjaman = pinjaman.nominalPinjaman || 0;
  const regPokok = pinjaman.angsuranPokokPerBulan || Math.round(nomPinjaman / (tenor || 1));
  const regJasa = (jasaBulanBerjalan !== undefined && jasaBulanBerjalan > 0)
    ? jasaBulanBerjalan
    : (pinjaman.jasaPerBulan || Math.round(nomPinjaman * (pinjaman.bungaFlatPersen ? pinjaman.bungaFlatPersen / 100 : 0.015)));

  // Ambil daftar status angsuran ke-1 sampai ke-N
  const installmentItems = useMemo(() => {
    return Array.from({ length: tenor }, (_, i) => {
      const bKe = i + 1;
      const payment = relatedPayments.find(a => a.bulanKe === bKe);
      const isPaid = Boolean(payment) || (relatedPayments.filter(a => !a.bulanKe).length >= bKe);
      const isSelected = !isPaid && selectedInstallments.includes(bKe);
      const selectedIndex = isSelected ? selectedInstallments.indexOf(bKe) + 1 : 0;

      return {
        bulanKe: bKe,
        isPaid,
        paidPayment: payment,
        isSelected,
        selectedIndex,
        pokok: regPokok,
        jasa: regJasa,
        total: regPokok + regJasa
      };
    });
  }, [tenor, relatedPayments, selectedInstallments, regPokok, regJasa]);

  // Daftar angsuran yang belum dibayar (urut kecil)
  const unpaidInstallments = useMemo(() => {
    return installmentItems.filter(item => !item.isPaid).map(item => item.bulanKe);
  }, [installmentItems]);

  const paidCount = installmentItems.filter(it => it.isPaid).length;
  const unpaidCount = unpaidInstallments.length;
  const firstUnpaid = unpaidInstallments.length > 0 ? unpaidInstallments[0] : null;
  const lastSelected = selectedInstallments.length > 0 ? selectedInstallments[selectedInstallments.length - 1] : null;
  const nextExpected = lastSelected !== null ? lastSelected + 1 : firstUnpaid;

  // Real-time validation hasil seleksi
  const validationResult = useMemo(() => {
    return validateChronologicalInstallments(selectedInstallments, unpaidInstallments);
  }, [selectedInstallments, unpaidInstallments]);

  // Handler klik tombol angsuran dengan validasi ketat berurutan secara kronologis
  const handleItemClick = (bKe: number) => {
    if (readOnly) return;

    const item = installmentItems.find(it => it.bulanKe === bKe);
    if (!item) return;

    // 1. Angsuran yang sudah lunas TIDAK BISA DIPILIH
    if (item.isPaid) {
      setWarningMessage(`Angsuran ke-${bKe} sudah dibayar (Lunas) dan tidak dapat dipilih lagi.`);
      setPendingRangeTarget(null);
      setTimeout(() => setWarningMessage(null), 3500);
      return;
    }

    if (firstUnpaid === null) return;

    // 2. Jika tombol SEDANG TERPILIH (User ingin membatalkan/mengurangi seleksi)
    if (selectedInstallments.includes(bKe)) {
      // Jika yang diklik adalah elemen terakhir (tail), lepaskan dengan aman
      if (bKe === lastSelected) {
        if (selectedInstallments.length === 1) {
          // Jika hanya 1 bulan (yaitu firstUnpaid), cegah pembatalan total agar selalu ada angsuran berjalan yang dipilih
          setWarningMessage(`Angsuran Ke-${firstUnpaid} adalah angsuran jatuh tempo berjalan yang wajib dipilih minimal 1 bulan.`);
          setPendingRangeTarget(null);
          setTimeout(() => setWarningMessage(null), 3000);
          return;
        }
        const next = selectedInstallments.slice(0, -1);
        onSelectInstallments(next);
        setWarningMessage(null);
        setPendingRangeTarget(null);
        return;
      }

      // Jika yang diklik di tengah atau awal (misal [3, 4, 5] dan klik 4 atau 3),
      // kita harus memotong seleksi agar tetap berurutan secara kronologis
      const clickIdx = selectedInstallments.indexOf(bKe);
      if (clickIdx === 0) {
        // Klik pada angsuran pertama: reset ke hanya 1 bulan pertama
        onSelectInstallments([firstUnpaid]);
        setWarningMessage(`Pilihan disesuaikan menjadi 1 bulan (Angsuran Ke-${firstUnpaid}) agar tetap berurutan.`);
      } else {
        // Potong hingga sebelum elemen tersebut
        const next = selectedInstallments.slice(0, clickIdx);
        onSelectInstallments(next);
        setWarningMessage(`Pilihan disesuaikan hingga Angsuran Ke-${next[next.length - 1]} agar tetap berurutan secara kronologis.`);
      }
      setPendingRangeTarget(null);
      setTimeout(() => setWarningMessage(null), 3500);
      return;
    }

    // 3. Jika tombol BELUM TERPILIH (User ingin memilih)
    // Cek apakah bKe adalah angsuran berikutnya yang berurutan secara kronologis
    if (bKe === nextExpected) {
      // Sesuai urutan kronologis!
      const next = [...selectedInstallments, bKe];
      onSelectInstallments(next);
      setWarningMessage(null);
      setPendingRangeTarget(null);
      return;
    }

    // Jika bKe melompati urutan (misal saat ini [3], klik 5 atau 6)
    if (bKe > (nextExpected || 0)) {
      setPendingRangeTarget(bKe);
      const skippedCount = bKe - (nextExpected || 0);
      setWarningMessage(
        `Pemilihan angsuran harus berurutan secara kronologis sesuai sisa tenor pinjaman. Anda tidak dapat melompati Angsuran Ke-${nextExpected}${skippedCount > 1 ? ` s.d. Ke-${bKe - 1}` : ''}.`
      );
      return;
    }

    // Jika selectedInstallments kosong dan user klik bKe > firstUnpaid
    if (selectedInstallments.length === 0 && bKe !== firstUnpaid) {
      setPendingRangeTarget(bKe);
      setWarningMessage(
        `Pemilihan angsuran harus dimulai secara kronologis dari Angsuran Ke-${firstUnpaid} (angsuran tertua yang belum dibayar).`
      );
      return;
    }
  };

  // Quick Action: Pilih 1 Bulan Pertama yang belum bayar (selalu firstUnpaid)
  const handleSelectOneMonth = () => {
    if (readOnly || unpaidInstallments.length === 0) return;
    setWarningMessage(null);
    setPendingRangeTarget(null);
    onSelectInstallments([unpaidInstallments[0]]);
  };

  // Quick Action: Pilih N Bulan berurutan dari yang belum bayar
  const handleSelectMultipleMonths = (count: number) => {
    if (readOnly || unpaidInstallments.length === 0) return;
    setWarningMessage(null);
    setPendingRangeTarget(null);
    const toSelect = unpaidInstallments.slice(0, count);
    onSelectInstallments(toSelect);
  };

  // Quick Action: Pilih Seluruh Sisa (Pelunasan Penuh)
  const handleSelectAllRemaining = () => {
    if (readOnly || unpaidInstallments.length === 0) return;
    setWarningMessage(null);
    setPendingRangeTarget(null);
    onSelectInstallments([...unpaidInstallments]);
  };

  // Eksekusi pemilihan berurutan otomatis hingga target bulan
  const handleAutoFillSequenceToTarget = (targetBulan: number) => {
    if (readOnly || firstUnpaid === null) return;
    const targetIdx = unpaidInstallments.indexOf(targetBulan);
    if (targetIdx !== -1) {
      const seq = unpaidInstallments.slice(0, targetIdx + 1);
      onSelectInstallments(seq);
      setWarningMessage(null);
      setPendingRangeTarget(null);
    }
  };

  // Hitung total dari yang terpilih
  const selectedCount = selectedInstallments.length;
  const totalPokokSelected = Math.min(sisaPokok, regPokok * selectedCount);
  const totalJasaSelected = regJasa * selectedCount;
  const totalBayarSelected = totalPokokSelected + totalJasaSelected;

  return (
    <div className={`space-y-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:p-3.5 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 dark:border-indigo-900/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Pilihan Bulan Angsuran (Ke-1 s.d. Ke-{tenor})</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                • {unpaidCount} Belum Bayar
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Pemilihan harus <b>berurutan secara kronologis</b> sesuai sisa tenor pinjaman.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 font-bold text-emerald-800 dark:text-emerald-300">
            {paidCount} Lunas
          </span>
          <span className="rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 font-bold text-amber-800 dark:text-amber-300">
            {unpaidCount} Sisa
          </span>
        </div>
      </div>

      {/* Warning / Chronological Validation Alert Banner */}
      {warningMessage && (
        <div className="animate-in fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/50 p-2.5 text-xs text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 gap-2">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-[11px] font-medium leading-relaxed">
              <span>{warningMessage}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {pendingRangeTarget && firstUnpaid !== null && (
              <button
                type="button"
                onClick={() => handleAutoFillSequenceToTarget(pendingRangeTarget)}
                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] cursor-pointer shadow-xs transition flex items-center gap-1"
              >
                <span>Pilih Berurutan (Ke-{firstUnpaid} s.d. Ke-{pendingRangeTarget})</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <button 
              type="button" 
              onClick={() => {
                setWarningMessage(null);
                setPendingRangeTarget(null);
              }}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline px-1 py-0.5 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Real-time Validation Error (jika prop seleksi luar tidak valid) */}
      {!validationResult.isValid && !warningMessage && (
        <div className="flex items-center justify-between rounded-lg bg-rose-50 dark:bg-rose-950/50 p-2 text-xs text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="text-[11px] font-medium">{validationResult.error}</span>
          </div>
          {validationResult.expectedSequence && (
            <button
              type="button"
              onClick={() => onSelectInstallments(validationResult.expectedSequence!)}
              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer shadow-xs whitespace-nowrap ml-2"
            >
              Perbaiki Urutan
            </button>
          )}
        </div>
      )}

      {/* GRID TOMBOL ANGSURAN KE-1 S.D. KE-N */}
      <div className={`grid gap-1.5 sm:gap-2 ${tenor <= 6 ? 'grid-cols-3 sm:grid-cols-6' : tenor <= 10 ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'}`}>
        {installmentItems.map((item) => {
          const { bulanKe, isPaid, isSelected, selectedIndex, total } = item;
          const isNextInLine = !isPaid && !isSelected && bulanKe === nextExpected;
          const isFutureBeyondNext = !isPaid && !isSelected && bulanKe > (nextExpected || 0);

          if (isPaid) {
            // TOMBOL SUDAH DIBAYAR: TIDAK BISA DIPILIH (DISABLED)
            return (
              <div
                key={bulanKe}
                onClick={() => handleItemClick(bulanKe)}
                title={`Angsuran ke-${bulanKe} sudah dibayar lunas (terkunci)`}
                className="group relative flex flex-col justify-between rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-2 text-left opacity-90 transition select-none cursor-not-allowed dark:border-emerald-800/60 dark:bg-emerald-950/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    Ke-{bulanKe}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[8.5px] font-bold text-white shadow-2xs">
                    <Check className="h-2.5 w-2.5" />
                    <span>Lunas</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-700 dark:text-emerald-400 font-mono">
                  <span>Terbayar</span>
                  <Lock className="h-2.5 w-2.5 text-emerald-600/70" />
                </div>
              </div>
            );
          }

          if (isSelected) {
            // TOMBOL SEDANG DIPILIH (AKTIF)
            const isTail = bulanKe === lastSelected;
            return (
              <button
                key={bulanKe}
                type="button"
                onClick={() => handleItemClick(bulanKe)}
                disabled={readOnly}
                title={isTail ? `Klik untuk membatalkan Angsuran Ke-${bulanKe}` : `Klik untuk menyesuaikan urutan hingga Angsuran Ke-${bulanKe}`}
                className="group relative flex flex-col justify-between rounded-lg border-2 border-indigo-600 bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 text-left text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800 transition transform active:scale-95 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-black tracking-tight">
                    Ke-{bulanKe}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white text-indigo-700 px-1.5 py-0.2 text-[8.5px] font-black shadow-xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    <span>{selectedCount > 1 ? `#${selectedIndex}` : 'Dipilih'}</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[9.5px] text-indigo-100 font-mono font-bold">
                  <span>{formatRupiah(total)}</span>
                  <span className="text-[8px] bg-indigo-500/80 px-1 rounded">
                    {bulanKe === firstUnpaid ? 'Bulan Berjalan' : `Urutan #${selectedIndex}`}
                  </span>
                </div>
              </button>
            );
          }

          // TOMBOL BELUM DIBAYAR (DAPAT DIPILIH SESUAI URUTAN KRONOLOGIS)
          return (
            <button
              key={bulanKe}
              type="button"
              onClick={() => handleItemClick(bulanKe)}
              disabled={readOnly}
              title={
                isNextInLine
                  ? `Klik untuk menambahkan Angsuran Ke-${bulanKe} secara berurutan`
                  : `Angsuran Ke-${bulanKe} (Klik untuk memilih rentang berurutan)`
              }
              className={`group relative flex flex-col justify-between rounded-lg border p-2 text-left transition transform active:scale-95 cursor-pointer shadow-2xs ${
                isNextInLine
                  ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-300 hover:bg-indigo-100/60'
                  : isFutureBeyondNext
                  ? 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:bg-slate-100/60'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`font-mono text-xs font-bold ${isNextInLine ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  Ke-{bulanKe}
                </span>
                {isNextInLine ? (
                  <span className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-900/60 px-1.2 py-0.2 text-[8px] font-bold text-indigo-700 dark:text-indigo-300 animate-pulse">
                    + Urutan Berikutnya
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-700 px-1.2 py-0.2 text-[8px] font-semibold text-slate-500 dark:text-slate-400">
                    Belum
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                <span>{formatRupiah(total)}</span>
                <ChevronRight className={`h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5 ${isNextInLine ? 'text-indigo-500' : 'text-slate-300'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Action Helpers (Selalu menjamin urutan kronologis kontigu) */}
      {!readOnly && unpaidCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] mr-0.5">Pilihan Cepat Berurutan:</span>
          
          <button
            type="button"
            onClick={handleSelectOneMonth}
            className={`px-2 py-1 rounded-md font-bold transition cursor-pointer border ${
              selectedCount === 1
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            1 Bulan ({firstUnpaid ? `Ke-${firstUnpaid}` : 'Berikutnya'})
          </button>

          {unpaidCount >= 2 && (
            <button
              type="button"
              onClick={() => handleSelectMultipleMonths(2)}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer border flex items-center gap-1 ${
                selectedCount === 2
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <span>⚡ 2 Bulan Berurutan</span>
            </button>
          )}

          {unpaidCount >= 3 && (
            <button
              type="button"
              onClick={() => handleSelectMultipleMonths(3)}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer border ${
                selectedCount === 3
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              +3 Bulan Berurutan
            </button>
          )}

          {unpaidCount > 1 && (
            <button
              type="button"
              onClick={handleSelectAllRemaining}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer border flex items-center gap-1 ${
                selectedCount === unpaidCount
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Semua Sisa ({unpaidCount} Bulan Pelunasan)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSelectOneMonth}
            title="Reset ke 1 bulan berikutnya"
            className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-200 ml-auto cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Ringkasan Seleksi Bulan Angsuran dengan Validasi Kronologis */}
      {selectedCount > 0 ? (
        <div className="mt-2 rounded-lg bg-gradient-to-r from-indigo-50 via-white to-amber-50 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-amber-950/30 p-2.5 border border-indigo-200/80 dark:border-indigo-900/50 text-[11px] font-mono">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5 font-sans">
            <span className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>{selectedCount} Bulan Angsuran Berurutan:</span>
              <span className="font-mono text-indigo-700 dark:text-indigo-300 font-black">
                (Ke-{selectedInstallments.join(', ')})
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Sisa Pinjaman: <b className="text-rose-600">{formatRupiah(Math.max(0, sisaPokok - totalPokokSelected))}</b>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1.5 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[9px]">Total Pokok ({selectedCount}x):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(totalPokokSelected)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">Total Jasa ({selectedCount}x):</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{formatRupiah(totalJasaSelected)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[9px]">Total Bayar Angsuran:</span>
              <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-300">{formatRupiah(totalBayarSelected)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-[10.5px] text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Silakan klik tombol angsuran di atas untuk memilih bulan yang ingin diangsur secara berurutan.</span>
        </div>
      )}
    </div>
  );
};
