import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Member, Simpanan, Pinjaman, Angsuran, KoperasiSetup } from '../types';
import { formatRupiah, calculateLoanOutstanding, exportToExcel } from '../utils/finance';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart as PieIcon,
  Layers,
  Calendar,
  Download,
  Table as TableIcon,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AdminTrenSimpananPinjamanChartProps {
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  members?: Member[];
  setup?: KoperasiSetup;
  className?: string;
}

export type ChartMode = 'arus_bulanan' | 'saldo_kumulatif' | 'komposisi_simpanan' | 'rasio_ldr';
export type TimeRange = '6m' | '12m' | '2026' | 'all';

export interface MonthDataPoint {
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'Jan 26'
  fullMonthLabel: string; // 'Januari 2026'
  year: number;
  monthNum: number;
  // Arus Bulanan
  simpananMasuk: number;
  simpananPokok: number;
  simpananWajib: number;
  simpananSukarela: number;
  penarikanSukarela: number;
  simpananNetto: number;
  pinjamanCair: number;
  pinjamanCount: number;
  angsuranMasuk: number;
  angsuranPokok: number;
  angsuranJasa: number;
  arusKasBersih: number; // (simpananMasuk + angsuranMasuk) - (pinjamanCair + penarikanSukarela)
  // Akumulasi Posisi Portofolio
  saldoKumulatifSimpanan: number;
  piutangPinjamanBeredar: number;
  rasioLdr: number; // (piutangPinjamanBeredar / saldoKumulatifSimpanan) * 100
}

export function AdminTrenSimpananPinjamanChart({
  simpanan = [],
  pinjaman = [],
  angsuran = [],
  members = [],
  setup,
  className = ''
}: AdminTrenSimpananPinjamanChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('arus_bulanan');
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [showTable, setShowTable] = useState<boolean>(false);

  // Month names helper in Indonesian
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const fullMonthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Aggregate monthly series chronologically
  const fullMonthlyData = useMemo<MonthDataPoint[]>(() => {
    // 1. Gather all transaction dates to determine minimum and maximum range
    const allDates: string[] = [];
    simpanan.forEach(s => s.tanggal && allDates.push(s.tanggal));
    pinjaman.forEach(p => p.tanggal && allDates.push(p.tanggal));
    angsuran.forEach(a => a.tanggal && allDates.push(a.tanggal));

    // Determine span: fallback from Jan 2026 to Dec 2026 if empty
    let startYear = 2026;
    let startMonth = 0; // 0-indexed: Jan
    let endYear = 2026;
    let endMonth = 11; // Dec

    if (allDates.length > 0) {
      const parsedYears = allDates.map(d => parseInt(d.substring(0, 4), 10)).filter(y => !isNaN(y));
      if (parsedYears.length > 0) {
        startYear = Math.min(...parsedYears, 2026);
        endYear = Math.max(...parsedYears, 2026);
      }
    }

    // Build complete continuous list of months
    const monthsList: { key: string; label: string; fullLabel: string; year: number; monthNum: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = (y === startYear && allDates.length > 0) ? 0 : 0;
      const mEnd = (y === endYear) ? 11 : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = `${monthNames[m]} ${String(y).substring(2)}`;
        const fullLabel = `${fullMonthNames[m]} ${y}`;
        monthsList.push({ key, label, fullLabel, year: y, monthNum: m + 1 });
      }
    }

    // Sort chronologically
    monthsList.sort((a, b) => a.key.localeCompare(b.key));

    // Keep running cumulative balances
    let runningSimpanan = (setup?.simpananPokokAwal || 0) + (setup?.simpananWajibAwal || 0) + (setup?.simpananSukarelaAwal || 0);
    
    // Check if we have any recorded data at all
    let hasActualData = false;

    const points: MonthDataPoint[] = monthsList.map(({ key, label, fullLabel, year, monthNum }) => {
      // 1. Simpanan in this month
      const mSimpanan = simpanan.filter(s => (s.tanggal || '').startsWith(key));
      let simpananMasuk = 0;
      let simpananPokok = 0;
      let simpananWajib = 0;
      let simpananSukarela = 0;
      let penarikanSukarela = 0;

      mSimpanan.forEach(s => {
        const jml = Number(s.jumlah) || 0;
        if (jml >= 0) {
          simpananMasuk += jml;
          if (s.jenis === 'Pokok') simpananPokok += jml;
          else if (s.jenis === 'Wajib') simpananWajib += jml;
          else simpananSukarela += jml;
        } else {
          penarikanSukarela += Math.abs(jml);
        }
      });

      const simpananNetto = simpananMasuk - penarikanSukarela;
      runningSimpanan += simpananNetto;

      // 2. Pinjaman disbursed in this month
      const mPinjaman = pinjaman.filter(p => (p.tanggal || '').startsWith(key));
      const pinjamanCair = mPinjaman.reduce((acc, p) => acc + (Number(p.nominalPinjaman) || 0), 0);
      const pinjamanCount = mPinjaman.length;

      // 3. Angsuran collected in this month
      const mAngsuran = angsuran.filter(a => (a.tanggal || '').startsWith(key));
      const angsuranMasuk = mAngsuran.reduce((acc, a) => acc + (Number(a.jumlahBayar) || 0), 0);
      const angsuranPokok = mAngsuran.reduce((acc, a) => acc + (Number(a.pokokBayar) || 0), 0);
      const angsuranJasa = mAngsuran.reduce((acc, a) => acc + (Number(a.jasaBayar) || 0), 0);

      if (simpananMasuk > 0 || pinjamanCair > 0 || angsuranMasuk > 0) {
        hasActualData = true;
      }

      // 4. Calculate active loan outstanding up to end of this month
      // Active loans disbursed on or before this month:
      const loansUpToMonth = pinjaman.filter(p => (p.tanggal || '') <= `${key}-31`);
      const repaysUpToMonth = angsuran.filter(a => (a.tanggal || '') <= `${key}-31`);
      
      const piutangPinjamanBeredar = loansUpToMonth.reduce((acc, p) => {
        const pRepays = repaysUpToMonth.filter(a => a.pinjamanId === p.id);
        return acc + calculateLoanOutstanding(p, pRepays);
      }, (setup?.piutangAwal || 0));

      const safeSimpanan = Math.max(0, runningSimpanan);
      const rasioLdr = safeSimpanan > 0 
        ? Math.round((piutangPinjamanBeredar / safeSimpanan) * 1000) / 10 
        : 0;

      const arusKasBersih = (simpananMasuk + angsuranMasuk) - (pinjamanCair + penarikanSukarela);

      return {
        monthKey: key,
        monthLabel: label,
        fullMonthLabel: fullLabel,
        year,
        monthNum,
        simpananMasuk,
        simpananPokok,
        simpananWajib,
        simpananSukarela,
        penarikanSukarela,
        simpananNetto,
        pinjamanCair,
        pinjamanCount,
        angsuranMasuk,
        angsuranPokok,
        angsuranJasa,
        arusKasBersih,
        saldoKumulatifSimpanan: safeSimpanan,
        piutangPinjamanBeredar: Math.max(0, piutangPinjamanBeredar),
        rasioLdr
      };
    });

    // If no real transactions exist yet, provide realistic starter baseline for 2026 demonstration
    if (!hasActualData) {
      const demoData = [
        { key: '2026-01', label: 'Jan 26', fullLabel: 'Januari 2026', sMasuk: 3500000, pCair: 2000000, angsuran: 850000, kumulatifS: 15500000, sisaP: 10500000 },
        { key: '2026-02', label: 'Feb 26', fullLabel: 'Februari 2026', sMasuk: 4200000, pCair: 3000000, angsuran: 1200000, kumulatifS: 19700000, sisaP: 12300000 },
        { key: '2026-03', label: 'Mar 26', fullLabel: 'Maret 2026', sMasuk: 4800000, pCair: 3500000, angsuran: 1750000, kumulatifS: 24500000, sisaP: 14050000 },
        { key: '2026-04', label: 'Apr 26', fullLabel: 'April 2026', sMasuk: 5100000, pCair: 4000000, angsuran: 2200000, kumulatifS: 29600000, sisaP: 15850000 },
        { key: '2026-05', label: 'Mei 26', fullLabel: 'Mei 2026', sMasuk: 5900000, pCair: 4500000, angsuran: 2650000, kumulatifS: 35500000, sisaP: 17700000 },
        { key: '2026-06', label: 'Jun 26', fullLabel: 'Juni 2026', sMasuk: 6500000, pCair: 5000000, angsuran: 3100000, kumulatifS: 42000000, sisaP: 19600000 },
        { key: '2026-07', label: 'Jul 26', fullLabel: 'Juli 2026', sMasuk: 7200000, pCair: 6000000, angsuran: 3800000, kumulatifS: 49200000, sisaP: 21800000 },
      ];

      return demoData.map((d, idx) => ({
        monthKey: d.key,
        monthLabel: d.label,
        fullMonthLabel: d.fullLabel,
        year: 2026,
        monthNum: idx + 1,
        simpananMasuk: d.sMasuk,
        simpananPokok: Math.round(d.sMasuk * 0.25),
        simpananWajib: Math.round(d.sMasuk * 0.55),
        simpananSukarela: Math.round(d.sMasuk * 0.2),
        penarikanSukarela: 0,
        simpananNetto: d.sMasuk,
        pinjamanCair: d.pCair,
        pinjamanCount: Math.round(d.pCair / 2000000) || 1,
        angsuranMasuk: d.angsuran,
        angsuranPokok: Math.round(d.angsuran * 0.85),
        angsuranJasa: Math.round(d.angsuran * 0.15),
        arusKasBersih: (d.sMasuk + d.angsuran) - d.pCair,
        saldoKumulatifSimpanan: d.kumulatifS,
        piutangPinjamanBeredar: d.sisaP,
        rasioLdr: Math.round((d.sisaP / d.kumulatifS) * 1000) / 10
      }));
    }

    return points;
  }, [simpanan, pinjaman, angsuran, setup]);

  // Filter based on selected TimeRange
  const filteredData = useMemo(() => {
    if (fullMonthlyData.length === 0) return [];
    
    // Sort chronological
    const sorted = [...fullMonthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    if (timeRange === '6m') {
      return sorted.slice(-6);
    }
    if (timeRange === '12m') {
      return sorted.slice(-12);
    }
    if (timeRange === '2026') {
      const yearFiltered = sorted.filter(d => d.year === 2026);
      return yearFiltered.length > 0 ? yearFiltered : sorted.slice(-6);
    }
    return sorted;
  }, [fullMonthlyData, timeRange]);

  // Summary Metrics across all data for top KPI cards
  const metrics = useMemo(() => {
    const totalSimpanan = simpanan.reduce((a, c) => a + (Number(c.jumlah) || 0), 0) + (setup?.simpananPokokAwal || 0) + (setup?.simpananWajibAwal || 0) + (setup?.simpananSukarelaAwal || 0);
    const totalSimpananPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + (Number(c.jumlah) || 0), 0) + (setup?.simpananPokokAwal || 0);
    const totalSimpananWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + (Number(c.jumlah) || 0), 0) + (setup?.simpananWajibAwal || 0);
    const totalSimpananSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + (Number(c.jumlah) || 0), 0) + (setup?.simpananSukarelaAwal || 0);

    const totalPinjamanDisbursed = pinjaman.reduce((a, c) => a + (Number(c.nominalPinjaman) || 0), 0);
    const totalPinjamanCount = pinjaman.length;

    const totalAngsuranBayar = angsuran.reduce((a, c) => a + (Number(c.jumlahBayar) || 0), 0);
    const totalAngsuranPokok = angsuran.reduce((a, c) => a + (Number(c.pokokBayar) || 0), 0);
    const totalAngsuranJasa = angsuran.reduce((a, c) => a + (Number(c.jasaBayar) || 0), 0);

    // Outstanding Loan
    const piutangBeredar = pinjaman.reduce((acc, p) => {
      const pRepays = angsuran.filter(a => a.pinjamanId === p.id);
      return acc + calculateLoanOutstanding(p, pRepays);
    }, (setup?.piutangAwal || 0));

    // LDR
    const ldrPersen = totalSimpanan > 0 ? (piutangBeredar / totalSimpanan) * 100 : 0;

    // Inflow vs Outflow over currently filtered period
    const periodSimpananMasuk = filteredData.reduce((acc, d) => acc + d.simpananMasuk, 0);
    const periodPinjamanCair = filteredData.reduce((acc, d) => acc + d.pinjamanCair, 0);
    const periodAngsuranMasuk = filteredData.reduce((acc, d) => acc + d.angsuranMasuk, 0);
    const periodNet = (periodSimpananMasuk + periodAngsuranMasuk) - periodPinjamanCair;

    return {
      totalSimpanan,
      totalSimpananPokok,
      totalSimpananWajib,
      totalSimpananSukarela,
      totalPinjamanDisbursed,
      totalPinjamanCount,
      totalAngsuranBayar,
      totalAngsuranPokok,
      totalAngsuranJasa,
      piutangBeredar,
      ldrPersen,
      periodSimpananMasuk,
      periodPinjamanCair,
      periodAngsuranMasuk,
      periodNet
    };
  }, [simpanan, pinjaman, angsuran, setup, filteredData]);

  // Export to Excel handler
  const handleExportExcel = () => {
    const exportRows = filteredData.map(d => ({
      'Bulan': d.fullMonthLabel,
      'Simpanan Masuk (Rp)': d.simpananMasuk,
      'Simpanan Pokok (Rp)': d.simpananPokok,
      'Simpanan Wajib (Rp)': d.simpananWajib,
      'Simpanan Sukarela (Rp)': d.simpananSukarela,
      'Penarikan Sukarela (Rp)': d.penarikanSukarela,
      'Simpanan Netto (Rp)': d.simpananNetto,
      'Pencairan Pinjaman (Rp)': d.pinjamanCair,
      'Jumlah Peminjam (Org)': d.pinjamanCount,
      'Angsuran Diterima (Rp)': d.angsuranMasuk,
      'Arus Kas Bersih (Rp)': d.arusKasBersih,
      'Saldo Kumulatif Simpanan (Rp)': d.saldoKumulatifSimpanan,
      'Sisa Piutang Pinjaman (Rp)': d.piutangPinjamanBeredar,
      'Rasio LDR (%)': `${d.rasioLdr}%`
    }));

    exportToExcel(
      exportRows,
      'Tren_Simpanan_Pinjaman',
      `Tren_Simpanan_Pinjaman_${timeRange}`,
      setup
    );
  };

  // Custom High-Contrast Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = filteredData.find(d => d.monthLabel === label) || payload[0]?.payload;
      if (!dataPoint) return null;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-2.5 min-w-[260px]">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="flex items-center gap-1.5 font-black text-sm text-emerald-400">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{dataPoint.fullMonthLabel}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              LDR: {dataPoint.rasioLdr}%
            </span>
          </div>

          <div className="space-y-1.5 font-sans">
            {chartMode === 'arus_bulanan' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Simpanan Masuk:
                  </span>
                  <span className="font-mono font-bold text-emerald-300">{formatRupiah(dataPoint.simpananMasuk)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                    Pencairan Pinjaman:
                  </span>
                  <span className="font-mono font-bold text-indigo-300">{formatRupiah(dataPoint.pinjamanCair)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Angsuran Diterima:
                  </span>
                  <span className="font-mono font-bold text-amber-300">{formatRupiah(dataPoint.angsuranMasuk)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                  <span className="text-slate-400">Selisih Likuiditas Bulanan:</span>
                  <span className={`font-mono font-black ${dataPoint.arusKasBersih >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dataPoint.arusKasBersih >= 0 ? '+' : ''}{formatRupiah(dataPoint.arusKasBersih)}
                  </span>
                </div>
              </>
            )}

            {chartMode === 'saldo_kumulatif' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Saldo Total Simpanan:
                  </span>
                  <span className="font-mono font-bold text-emerald-300">{formatRupiah(dataPoint.saldoKumulatifSimpanan)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    Sisa Piutang Pinjaman:
                  </span>
                  <span className="font-mono font-bold text-rose-300">{formatRupiah(dataPoint.piutangPinjamanBeredar)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                  <span className="text-slate-400">Kelebihan Likuiditas Simpanan:</span>
                  <span className="font-mono font-black text-cyan-400">
                    {formatRupiah(Math.max(0, dataPoint.saldoKumulatifSimpanan - dataPoint.piutangPinjamanBeredar))}
                  </span>
                </div>
              </>
            )}

            {chartMode === 'komposisi_simpanan' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    Simpanan Pokok:
                  </span>
                  <span className="font-mono font-bold text-blue-300">{formatRupiah(dataPoint.simpananPokok)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Simpanan Wajib:
                  </span>
                  <span className="font-mono font-bold text-emerald-300">{formatRupiah(dataPoint.simpananWajib)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Simpanan Sukarela:
                  </span>
                  <span className="font-mono font-bold text-amber-300">{formatRupiah(dataPoint.simpananSukarela)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                  <span className="text-slate-400">Total Simpanan Masuk:</span>
                  <span className="font-mono font-black text-white">{formatRupiah(dataPoint.simpananMasuk)}</span>
                </div>
              </>
            )}

            {chartMode === 'rasio_ldr' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Rasio Pinjaman/Simpanan:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">{dataPoint.rasioLdr}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Piutang Beredar:</span>
                  <span className="font-mono text-slate-200">{formatRupiah(dataPoint.piutangPinjamanBeredar)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Saldo Simpanan:</span>
                  <span className="font-mono text-slate-200">{formatRupiah(dataPoint.saldoKumulatifSimpanan)}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-800/80 text-[10px] text-slate-300 mt-1">
                  {dataPoint.rasioLdr >= 70 && dataPoint.rasioLdr <= 90
                    ? '✓ Rasio optimal: Dana simpanan produktif dan likuiditas terjaga.'
                    : dataPoint.rasioLdr < 70
                    ? 'ℹ Likuiditas berlebih: Potensi dana simpanan belum terserap pinjaman.'
                    : '⚠ Rasio tinggi: Penyaluran melampaui 90%, pantau ketersediaan kas.'}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 ${className}`}>
      {/* Header & Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 tracking-tight">
                  Visualisasi Grafik Tren Simpanan & Pinjaman
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                  Real-Time Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analisis perbandingan penghimpunan simpanan anggota, penyaluran kredit pinjaman, dan perputaran angsuran.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Filter */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === '6m'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              6 Bulan
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === '12m'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              12 Bulan
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('2026')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === '2026'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tahun 2026
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Table Toggle Button */}
          <button
            type="button"
            onClick={() => setShowTable(prev => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              showTable
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{showTable ? 'Sembunyikan Tabel' : 'Lihat Tabel'}</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Unduh Data Tren ke Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Simpanan Terhimpun */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Simpanan</span>
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-850 dark:text-slate-100 font-mono">
              {formatRupiah(metrics.totalSimpanan)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Pokok: {formatRupiah(metrics.totalSimpananPokok)}</span>
              <span>Wajib: {formatRupiah(metrics.totalSimpananWajib)}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Pinjaman Disalurkan */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pinjaman Disalurkan</span>
            <span className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <HandCoins className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatRupiah(metrics.totalPinjamanDisbursed)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Akumulasi {metrics.totalPinjamanCount} transaksi pinjaman anggota
            </p>
          </div>
        </div>

        {/* KPI 3: Sisa Piutang Pinjaman Beredar */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sisa Piutang Beredar</span>
            <span className="p-1.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatRupiah(metrics.piutangBeredar)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Angsuran Masuk:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(metrics.totalAngsuranBayar)}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Rasio Penyaluran LDR */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rasio Likuiditas (LDR)</span>
            <span className={`p-1.5 rounded-lg ${
              metrics.ldrPersen >= 70 && metrics.ldrPersen <= 90
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : metrics.ldrPersen < 70
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
            }`}>
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black font-mono text-slate-850 dark:text-slate-100">
                {metrics.ldrPersen.toFixed(1)}%
              </p>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                metrics.ldrPersen >= 70 && metrics.ldrPersen <= 90
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : metrics.ldrPersen < 70
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {metrics.ldrPersen >= 70 && metrics.ldrPersen <= 90
                  ? 'Ideal (Sehat)'
                  : metrics.ldrPersen < 70
                  ? 'Kas Likuid'
                  : 'Penyaluran Tinggi'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Rasio kredit terhadap simpanan (Standar sehat: 70% - 90%)
            </p>
          </div>
        </div>
      </div>

      {/* Mode View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setChartMode('arus_bulanan')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              chartMode === 'arus_bulanan'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Arus Bulanan (Simpanan vs Pinjaman vs Angsuran)</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('saldo_kumulatif')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              chartMode === 'saldo_kumulatif'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pertumbuhan Saldo Kumulatif & Portofolio</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('komposisi_simpanan')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              chartMode === 'komposisi_simpanan'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Komposisi Jenis Simpanan</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('rasio_ldr')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
              chartMode === 'rasio_ldr'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Tren Rasio Penyaluran (LDR %)</span>
          </button>
        </div>

        {/* Legend Hint */}
        <div className="text-[11px] text-slate-500 font-medium px-2">
          Periode: <span className="font-bold text-slate-700 dark:text-slate-300">{filteredData[0]?.monthLabel || '-'} s/d {filteredData[filteredData.length - 1]?.monthLabel || '-'}</span>
        </div>
      </div>

      {/* Main Interactive Recharts Stage */}
      <div className="w-full h-[380px] sm:h-[420px] text-xs">
        <ResponsiveContainer width="100%" height="100%">
          {/* Mode 1: Arus Bulanan Composed Chart */}
          {chartMode === 'arus_bulanan' ? (
            <ComposedChart data={filteredData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="simpananGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="pinjamanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={80}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
              <Bar dataKey="simpananMasuk" name="Simpanan Masuk (Rp)" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={36} />
              <Bar dataKey="pinjamanCair" name="Pinjaman Dicairkan (Rp)" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={36} />
              <Line
                type="monotone"
                dataKey="angsuranMasuk"
                name="Angsuran Diterima (Rp)"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="arusKasBersih"
                name="Surplus / Selisih Likuiditas"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#06b6d4' }}
              />
            </ComposedChart>
          ) : chartMode === 'saldo_kumulatif' ? (
            /* Mode 2: Saldo Kumulatif Area Chart */
            <AreaChart data={filteredData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="kumulatifSimpananGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="piutangBeredarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={85}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
              <Area
                type="monotone"
                dataKey="saldoKumulatifSimpanan"
                name="Saldo Total Simpanan Terhimpun"
                stroke="#059669"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#kumulatifSimpananGrad)"
              />
              <Area
                type="monotone"
                dataKey="piutangPinjamanBeredar"
                name="Sisa Piutang Pinjaman Beredar"
                stroke="#e11d48"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#piutangBeredarGrad)"
              />
            </AreaChart>
          ) : chartMode === 'komposisi_simpanan' ? (
            /* Mode 3: Komposisi Jenis Simpanan Stacked Bar */
            <BarChart data={filteredData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={80}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
              <Bar dataKey="simpananPokok" name="Simpanan Pokok" stackId="simpanan" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={40} />
              <Bar dataKey="simpananWajib" name="Simpanan Wajib" stackId="simpanan" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={40} />
              <Bar dataKey="simpananSukarela" name="Simpanan Sukarela" stackId="simpanan" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          ) : (
            /* Mode 4: Rasio Penyaluran LDR Line Chart */
            <LineChart data={filteredData} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax + 10))]}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
              {/* Benchmark Lines for Healthy Cooperative LDR: 70% and 90% */}
              <ReferenceLine y={90} label={{ value: 'Batas Atas Sehat (90%)', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10 }} stroke="#f43f5e" strokeDasharray="4 4" />
              <ReferenceLine y={70} label={{ value: 'Batas Bawah Ideal (70%)', position: 'insideBottomRight', fill: '#059669', fontSize: 10 }} stroke="#059669" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="rasioLdr"
                name="Rasio Penyaluran Kredit (LDR %)"
                stroke="#0d9488"
                strokeWidth={3.5}
                dot={{ r: 5, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Analytical Footnote Box */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            Interpretasi Likuiditas & Kinerja Keuangan Koperasi:
          </p>
          <p className="leading-relaxed">
            Grafik ini mengorelasikan kemampuan koperasi menghimpun simpanan (dana internal) terhadap penyerapan pinjaman dan kelancaran pembayaran angsuran bulanan.
            Selisih positif menunjukkan akumulasi surplus kas likuiditas koperasi, sedangkan rasio LDR dalam rentang <b>70% - 90%</b> menandakan dana simpanan berputar optimal secara produktif untuk kesejahteraan anggota.
          </p>
        </div>
      </div>

      {/* Collapsible Detailed Data Table */}
      <AnimatePresence>
        {showTable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3 pt-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-emerald-600" />
                Rincian Tabel Data Tren Simpanan & Pinjaman ({filteredData.length} Periode)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Satuan: Rupiah (IDR)</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Periode</th>
                    <th className="p-3 text-right">Simpanan Masuk</th>
                    <th className="p-3 text-right">Pinjaman Cair</th>
                    <th className="p-3 text-right">Angsuran Masuk</th>
                    <th className="p-3 text-right">Arus Bersih</th>
                    <th className="p-3 text-right">Saldo Kumulatif</th>
                    <th className="p-3 text-right">Piutang Beredar</th>
                    <th className="p-3 text-center">Rasio LDR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredData.map((d) => (
                    <tr key={d.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-sans font-bold text-slate-800 dark:text-slate-200">{d.fullMonthLabel}</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{formatRupiah(d.simpananMasuk)}</td>
                      <td className="p-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">{formatRupiah(d.pinjamanCair)}</td>
                      <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">{formatRupiah(d.angsuranMasuk)}</td>
                      <td className={`p-3 text-right font-bold ${d.arusKasBersih >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>
                        {d.arusKasBersih >= 0 ? '+' : ''}{formatRupiah(d.arusKasBersih)}
                      </td>
                      <td className="p-3 text-right text-slate-800 dark:text-slate-100">{formatRupiah(d.saldoKumulatifSimpanan)}</td>
                      <td className="p-3 text-right text-rose-600 dark:text-rose-400">{formatRupiah(d.piutangPinjamanBeredar)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          d.rasioLdr >= 70 && d.rasioLdr <= 90
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : d.rasioLdr < 70
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {d.rasioLdr}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
