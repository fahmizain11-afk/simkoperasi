import React, { useState, useMemo } from 'react';
import { Simpanan } from '../types';
import { formatRupiah, formatYearMonthIndo, getMemberWajibMonthStatus, INDO_MONTH_NAMES } from '../utils/finance';
import { Check, AlertCircle, Clock, ChevronLeft, ChevronRight, Calendar, UserCheck, HelpCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export interface KalenderSimpananWajibProps {
  memberId?: string;
  memberNama?: string;
  memberNoAnggota?: string;
  simpananList: Simpanan[];
  nominalWajib?: number;
  selectedMonthYM?: string; // single selected month, format YYYY-MM
  selectedMonths?: string[]; // multi-selected months, format YYYY-MM[]
  onSelectMonth?: (ym: string) => void;
  onSelectMonths?: (months: string[]) => void;
  readOnly?: boolean;
  className?: string;
  compact?: boolean;
}

export const KalenderSimpananWajib: React.FC<KalenderSimpananWajibProps> = ({
  memberId,
  memberNama,
  memberNoAnggota,
  simpananList,
  nominalWajib = 50000,
  selectedMonthYM,
  selectedMonths,
  onSelectMonth,
  onSelectMonths,
  readOnly = false,
  className = '',
  compact = false
}) => {
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentRunningYM = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Normalized active selected months (supports both single & multi-select)
  // ATURAN: Bulan yang sudah dibayar (LUNAS) TIDAK BISA DIPILIH
  const activeSelectedMonths: string[] = useMemo(() => {
    let raw: string[] = [];
    if (selectedMonths && Array.isArray(selectedMonths)) {
      raw = selectedMonths;
    } else if (selectedMonthYM && typeof selectedMonthYM === 'string') {
      raw = [selectedMonthYM];
    }
    // Filter out any month that is already paid
    if (memberId && raw.length > 0) {
      return raw.filter(ym => {
        const st = getMemberWajibMonthStatus(memberId, simpananList, ym, nominalWajib);
        return !st.isPaid;
      });
    }
    return raw;
  }, [selectedMonths, selectedMonthYM, memberId, simpananList, nominalWajib]);

  // Default year to the selected month's year or current year
  const initialYear = useMemo(() => {
    const firstMonth = activeSelectedMonths[0] || selectedMonthYM;
    if (firstMonth && firstMonth.includes('-')) {
      const y = parseInt(firstMonth.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return currentYear;
  }, [activeSelectedMonths, selectedMonthYM, currentYear]);

  const [viewYear, setViewYear] = useState<number>(initialYear);

  // Month definition (12 months: 4 kolom x 3 baris)
  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const monthNum = idx + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const ym = `${viewYear}-${monthStr}`;
      const monthName = INDO_MONTH_NAMES[idx] || `Bulan ${monthNum}`;

      // Check payment status if member is selected
      const status = memberId 
        ? getMemberWajibMonthStatus(memberId, simpananList, ym, nominalWajib)
        : { isPaid: false, totalPaid: 0, payments: [], latestPayment: undefined, paymentDate: undefined, transactionId: undefined };

      const isCurrentMonth = viewYear === currentYear && monthNum === currentMonth;
      const isFutureMonth = viewYear > currentYear || (viewYear === currentYear && monthNum > currentMonth);
      const isPastOrCurrent = !isFutureMonth;

      // Status Category Rules:
      // 1. Hijau: Bulan yang sudah dibayar (baik bulan lalu, kini, maupun bayar dimuka)
      // 2. Merah: Bulan yang belum dibayar s.d. bulan berjalan
      // 3. Abu-abu: Bulan setelah bulan berjalan (kecuali bulan setelah bulan berjalan berwarna abu)
      let colorType: 'hijau' | 'merah' | 'abu' | 'netral';
      let statusLabel: string;

      if (!memberId) {
        colorType = 'netral';
        statusLabel = 'Pilih Anggota';
      } else if (status.isPaid) {
        colorType = 'hijau';
        statusLabel = isFutureMonth ? 'Lunas Dimuka' : 'Lunas';
      } else if (isPastOrCurrent) {
        colorType = 'merah';
        statusLabel = isCurrentMonth ? 'Belum Bayar' : 'Tunggakan';
      } else {
        colorType = 'abu';
        statusLabel = 'Belum Tempo';
      }

      // BULAN YANG SUDAH DIBAYAR (status.isPaid) TIDAK PERNAH BISA DIPILIH
      const isSelected = !status.isPaid && activeSelectedMonths.includes(ym);
      const selectedIndex = isSelected ? activeSelectedMonths.indexOf(ym) + 1 : 0;

      return {
        monthNum,
        monthStr,
        ym,
        monthName,
        isCurrentMonth,
        isFutureMonth,
        isPastOrCurrent,
        colorType,
        statusLabel,
        isPaid: status.isPaid,
        totalPaid: status.totalPaid,
        paymentDate: status.paymentDate,
        isSelected,
        selectedIndex
      };
    });
  }, [viewYear, currentYear, currentMonth, memberId, simpananList, nominalWajib, activeSelectedMonths]);

  // Statistics for this viewYear
  const yearStats = useMemo(() => {
    const paidCount = monthsData.filter(m => m.colorType === 'hijau').length;
    const unpaidCount = monthsData.filter(m => m.colorType === 'merah').length;
    const futureCount = monthsData.filter(m => m.colorType === 'abu').length;
    const totalPaidNominal = monthsData.filter(m => m.colorType === 'hijau').reduce((acc, m) => acc + (m.totalPaid || nominalWajib), 0);
    const totalUnpaidNominal = unpaidCount * nominalWajib;
    const unpaidMonthsList = monthsData.filter(m => m.colorType === 'merah').map(m => m.ym);

    return {
      paidCount,
      unpaidCount,
      futureCount,
      totalPaidNominal,
      totalUnpaidNominal,
      unpaidMonthsList
    };
  }, [monthsData, nominalWajib]);

  // Month selection toggle handler (allows selecting > 1 months, including future months for early payment)
  const handleMonthClick = (ym: string) => {
    if (readOnly) return;

    // If month is already paid, do not allow re-selection for payment to prevent duplicate records
    if (memberId) {
      const status = getMemberWajibMonthStatus(memberId, simpananList, ym, nominalWajib);
      if (status.isPaid) {
        return;
      }
    }

    if (onSelectMonths) {
      let nextMonths: string[];
      if (activeSelectedMonths.includes(ym)) {
        // Toggle OFF
        nextMonths = activeSelectedMonths.filter(x => x !== ym);
      } else {
        // Toggle ON (add and sort chronologically)
        nextMonths = [...activeSelectedMonths, ym].sort();
      }
      onSelectMonths(nextMonths);
    } else if (onSelectMonth) {
      onSelectMonth(ym);
    }
  };

  // Quick Action: Select all unpaid/arrears months in this year
  const handleSelectAllUnpaid = () => {
    if (readOnly || yearStats.unpaidMonthsList.length === 0) return;
    const combined = Array.from(new Set([...activeSelectedMonths, ...yearStats.unpaidMonthsList])).sort();
    if (onSelectMonths) {
      onSelectMonths(combined);
    } else if (onSelectMonth && yearStats.unpaidMonthsList.length > 0) {
      onSelectMonth(yearStats.unpaidMonthsList[0]);
    }
  };

  // Quick Action: Select current running month only (or first upcoming unpaid if current is already paid)
  const handleSelectCurrentMonthOnly = () => {
    if (readOnly) return;
    if (memberId) {
      const st = getMemberWajibMonthStatus(memberId, simpananList, currentRunningYM, nominalWajib);
      if (st.isPaid) {
        // If current month is already paid, find first upcoming unpaid month
        let nextUnpaid = '';
        let y = currentYear;
        let m = currentMonth + 1;
        while (!nextUnpaid && y <= currentYear + 2) {
          const testYM = `${y}-${String(m).padStart(2, '0')}`;
          const checkSt = getMemberWajibMonthStatus(memberId, simpananList, testYM, nominalWajib);
          if (!checkSt.isPaid) {
            nextUnpaid = testYM;
            break;
          }
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
        if (nextUnpaid) {
          setViewYear(parseInt(nextUnpaid.split('-')[0], 10));
          if (onSelectMonths) onSelectMonths([nextUnpaid]);
          else if (onSelectMonth) onSelectMonth(nextUnpaid);
        }
        return;
      }
    }
    setViewYear(currentYear);
    if (onSelectMonths) {
      onSelectMonths([currentRunningYM]);
    } else if (onSelectMonth) {
      onSelectMonth(currentRunningYM);
    }
  };

  // Quick Action: Select N consecutive unpaid or future months (Bayar Di Muka / Lebih Awal)
  const handleSelectAdvance = (count: number) => {
    if (readOnly || !memberId) return;

    const resultMonths: string[] = [];
    let y = currentYear;
    let m = 1;

    // Find earliest unpaid month (checking from previous year up to current)
    let startFound = false;
    for (let checkY = currentYear - 1; checkY <= currentYear; checkY++) {
      for (let checkM = 1; checkM <= 12; checkM++) {
        if (checkY === currentYear && checkM > currentMonth) break;
        const testYM = `${checkY}-${String(checkM).padStart(2, '0')}`;
        const st = getMemberWajibMonthStatus(memberId, simpananList, testYM, nominalWajib);
        if (!st.isPaid) {
          y = checkY;
          m = checkM;
          startFound = true;
          break;
        }
      }
      if (startFound) break;
    }

    if (!startFound) {
      y = currentYear;
      m = currentMonth;
    }

    // Collect `count` unpaid or future months
    while (resultMonths.length < count && y <= currentYear + 3) {
      const testYM = `${y}-${String(m).padStart(2, '0')}`;
      const st = getMemberWajibMonthStatus(memberId, simpananList, testYM, nominalWajib);
      if (!st.isPaid) {
        resultMonths.push(testYM);
      }
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    if (resultMonths.length > 0) {
      if (onSelectMonths) {
        onSelectMonths(resultMonths);
      } else if (onSelectMonth) {
        onSelectMonth(resultMonths[0]);
      }
    }
  };

  // Quick Action: Clear all selections
  const handleClearSelection = () => {
    if (readOnly) return;
    if (onSelectMonths) {
      onSelectMonths([]);
    } else if (onSelectMonth) {
      onSelectMonth('');
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm space-y-3 ${className}`}>
      {/* Header: Title, Member Info, and Year Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Kalender Pembayaran Bulan (Simpanan Wajib)
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                Tahun {viewYear}
              </span>
            </div>
            {memberNama ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Anggota:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{memberNama}</strong>
                {memberNoAnggota && <span className="font-mono text-[10px] text-slate-400">({memberNoAnggota})</span>}
              </p>
            ) : (
              <p className="text-[10.5px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1 font-medium">
                <HelpCircle className="w-3 h-3 shrink-0" />
                <span>Pilih nama Anggota untuk melihat status iuran</span>
              </p>
            )}
          </div>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewYear(prev => prev - 1)}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Tahun Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono font-black text-xs px-2 text-slate-800 dark:text-slate-200">
            {viewYear}
          </span>
          <button
            type="button"
            onClick={() => setViewYear(prev => prev + 1)}
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Tahun Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {viewYear !== currentYear && (
            <button
              type="button"
              onClick={() => setViewYear(currentYear)}
              className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer ml-1 shadow-2xs"
              title="Kembali ke Tahun Berjalan"
            >
              Tahun Ini
            </button>
          )}
        </div>
      </div>

      {/* MULTI-MONTH SELECTION SUMMARY BANNER (Menyesuaikan jumlah bulan * 50.000) */}
      {activeSelectedMonths.length > 0 && (
        <div className="p-2.5 bg-gradient-to-r from-amber-50 to-amber-100/70 dark:from-amber-950/40 dark:to-amber-900/30 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activeSelectedMonths.length} Bulan Terpilih:</span>
            </div>
            <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-sm">
              {formatRupiah(activeSelectedMonths.length * nominalWajib)}
            </span>
            <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-800/60 px-2 py-0.5 rounded font-mono font-bold">
              {activeSelectedMonths.length} × {formatRupiah(nominalWajib)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {activeSelectedMonths.map(ym => {
                const parts = ym.split('-');
                const mIdx = parseInt(parts[1], 10) - 1;
                return `${INDO_MONTH_NAMES[mIdx]?.substring(0, 3)} '${parts[0].substring(2)}`;
              }).join(', ')}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-[10.5px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline cursor-pointer ml-1"
                title="Batalkan seluruh pilihan bulan"
              >
                Hapus Pilihan
              </button>
            )}
          </div>
        </div>
      )}

      {/* KALENDER 4 KOLOM X 3 BARIS */}
      <div className="grid grid-cols-4 gap-2 md:gap-2.5">
        {monthsData.map((m) => {
          const isCurrentlySelected = m.isSelected;
          let cardStyle = '';
          let badgeStyle = '';
          let statusText = '';
          let icon = null;

          if (m.colorType === 'hijau') {
            // HIJAU: Bulan yang sudah dibayar (Lunas)
            cardStyle = 'bg-emerald-600 text-white border-2 border-emerald-700 dark:border-emerald-500 shadow-xs opacity-90 cursor-not-allowed';
            badgeStyle = 'bg-black/20 text-emerald-100 border border-white/20';
            statusText = 'Lunas';
            icon = <Check className="w-3 h-3 stroke-[3]" />;
          } else if (isCurrentlySelected) {
            // DIPILIH UNTUK DIBAYAR (Bulan Tunggakan, Bulan Ini, atau Bulan Mendatang Bayar Dimuka)
            cardStyle = 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-2 border-amber-600 shadow-md ring-4 ring-amber-300 dark:ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.04] z-20 font-bold';
            badgeStyle = 'bg-black/25 text-amber-50 border border-white/30';
            statusText = m.isFutureMonth ? 'Bayar Di Muka' : (m.isCurrentMonth ? 'Bayar Kini' : 'Bayar Tunggakan');
            icon = <Check className="w-3 h-3 stroke-[3]" />;
          } else if (m.colorType === 'merah') {
            // MERAH: Bulan yang belum dibayar (s.d. bulan berjalan)
            cardStyle = 'bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-700 dark:border-rose-500 shadow-xs cursor-pointer';
            badgeStyle = 'bg-black/20 text-rose-100 border border-white/20';
            statusText = m.isCurrentMonth ? 'Belum Bayar' : 'Tunggakan';
            icon = <AlertCircle className="w-3 h-3 stroke-[2.5]" />;
          } else if (m.colorType === 'abu') {
            // ABU-ABU: Bulan setelah bulan berjalan (Bisa dipilih untuk bayar di muka)
            cardStyle = 'bg-slate-100 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-950 text-slate-700 border-2 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 dark:border-slate-700 cursor-pointer';
            badgeStyle = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
            statusText = 'Mendatang';
            icon = <Clock className="w-2.5 h-2.5" />;
          } else {
            // NETRAL (Belum ada anggota dipilih)
            cardStyle = 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-2 border-slate-250 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-750';
            badgeStyle = 'bg-slate-200 dark:bg-slate-700 text-slate-500';
            statusText = 'Pilih Anggota';
            icon = <Calendar className="w-2.5 h-2.5" />;
          }

          const isClickable = !readOnly && (!memberId || m.colorType !== 'hijau');

          return (
            <button
              key={m.ym}
              type="button"
              disabled={!isClickable}
              onClick={() => handleMonthClick(m.ym)}
              className={`relative flex flex-col items-center justify-between rounded-xl p-2 md:p-2.5 text-center transition-all duration-150 select-none ${
                isClickable ? 'hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'
              } ${cardStyle} ${compact ? 'min-h-[62px]' : 'min-h-[74px]'}`}
              title={
                m.colorType === 'hijau'
                  ? `${m.monthName} ${viewYear} - Sudah Lunas (${formatRupiah(m.totalPaid || nominalWajib)})`
                  : `${m.monthName} ${viewYear} - Status: ${m.statusLabel} (${formatRupiah(nominalWajib)}) - Klik untuk pilih/batalkan`
              }
            >
              {/* Corner Badge: Bulan Berjalan */}
              {m.isCurrentMonth && (
                <span className="absolute -top-2 -right-1 bg-amber-400 text-slate-950 text-[8.5px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-amber-300 z-10">
                  Bulan Ini
                </span>
              )}

              {/* Order Number Badge when Multiple Months Selected */}
              {isCurrentlySelected && activeSelectedMonths.length > 1 && (
                <span className="absolute -top-1.5 -left-1.5 bg-amber-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-amber-300 z-10">
                  {m.selectedIndex}
                </span>
              )}

              {/* Month Name & Subtitle */}
              <div className="w-full text-center">
                <span className={`block font-black tracking-wide uppercase ${compact ? 'text-xs' : 'text-xs md:text-sm'}`}>
                  {m.monthName.substring(0, 3)}
                </span>
                <span className={`text-[9px] font-mono block -mt-0.5 ${
                  m.colorType === 'hijau' ? 'text-emerald-100' :
                  isCurrentlySelected ? 'text-amber-100' :
                  m.colorType === 'merah' ? 'text-rose-100' :
                  'text-slate-400 dark:text-slate-500'
                }`}>
                  {m.monthStr}/{viewYear}
                </span>
              </div>

              {/* Status Badge */}
              <div className="mt-1 flex items-center justify-center gap-1 w-full">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${badgeStyle}`}>
                  {icon}
                  <span className="leading-none">{statusText}</span>
                </span>
              </div>

              {/* Selection Checkmark Marker */}
              {isCurrentlySelected && (
                <span className="absolute -bottom-2 bg-amber-400 text-slate-950 font-black text-[8.5px] px-2 py-0.2 rounded-full shadow-sm border border-amber-300 whitespace-nowrap">
                  {activeSelectedMonths.length > 1 ? `✓ Dipilih (${m.selectedIndex})` : '✓ Dipilih'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Petunjuk Warna & Legend */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        {/* Color Legend */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-700 inline-block shrink-0 shadow-2xs"></span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
              Hijau: Sudah Bayar ({memberId ? yearStats.paidCount : '-'})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-600 border border-rose-700 inline-block shrink-0 shadow-2xs"></span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
              Merah: Belum Bayar ({memberId ? yearStats.unpaidCount : '-'})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 inline-block shrink-0 shadow-2xs"></span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
              Abu: Bulan Mendatang ({memberId ? yearStats.futureCount : '-'})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-600 inline-block shrink-0 shadow-2xs"></span>
            <span className="text-amber-800 dark:text-amber-300 font-bold text-[11px]">
              Kuning: Dipilih ({activeSelectedMonths.length} Bulan)
            </span>
          </div>
        </div>

        {/* Selected Month Helper */}
        {activeSelectedMonths.length > 0 && (
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Total Dipilih: <strong className="text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{activeSelectedMonths.length} Bulan ({formatRupiah(activeSelectedMonths.length * nominalWajib)})</strong>
          </div>
        )}
      </div>

      {/* Quick Action & Advance Payment Controls */}
      {memberId && (
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleSelectCurrentMonthOnly}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                activeSelectedMonths.length === 1 && activeSelectedMonths[0] === currentRunningYM
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-250 dark:border-slate-700'
              }`}
            >
              <Calendar className="w-3 h-3 text-amber-500" />
              <span>Bulan Ini (1 Bulan)</span>
            </button>

            {yearStats.unpaidCount > 0 && !readOnly && (
              <button
                type="button"
                onClick={handleSelectAllUnpaid}
                className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Pilih seluruh bulan yang belum dibayar sekaligus"
              >
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>Pilih Semua Tunggakan ({yearStats.unpaidCount} Bulan = {formatRupiah(yearStats.totalUnpaidNominal)})</span>
              </button>
            )}

            {!readOnly && (
              <>
                <div className="hidden sm:inline-block h-4 w-px bg-slate-200 dark:bg-slate-700 my-auto" />
                <button
                  type="button"
                  onClick={() => handleSelectAdvance(3)}
                  className={`px-2 py-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    activeSelectedMonths.length === 3
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                  }`}
                  title="Pilih 3 bulan ke depan sekaligus (Rp 150.000)"
                >
                  <span>+3 Bulan ({formatRupiah(3 * nominalWajib)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAdvance(6)}
                  className={`px-2 py-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    activeSelectedMonths.length === 6
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                  }`}
                  title="Pilih 6 bulan / 1 semester ke depan sekaligus (Rp 300.000)"
                >
                  <span>+6 Bulan (1 Sem)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAdvance(12)}
                  className={`px-2 py-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    activeSelectedMonths.length === 12
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                  }`}
                  title="Pilih 12 bulan / 1 tahun ke depan sekaligus (Rp 600.000)"
                >
                  <span>+12 Bulan (1 Thn)</span>
                </button>
              </>
            )}

            {activeSelectedMonths.length > 1 && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  if (onSelectMonths) onSelectMonths([activeSelectedMonths[0]]);
                  else if (onSelectMonth) onSelectMonth(activeSelectedMonths[0]);
                }}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Kembalikan ke 1 bulan pilihan"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset 1 Bulan</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400 italic">
              💡 Klik kotak bulan (termasuk bulan abu-abu/mendatang) untuk memilih lebih dari 1 bulan pembayaran di muka.
            </span>
            {yearStats.unpaidCount > 0 ? (
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono shrink-0">
                Tunggakan {viewYear}: {formatRupiah(yearStats.totalUnpaidNominal)}
              </span>
            ) : (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>Semua iuran s.d. bulan ini lunas!</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
