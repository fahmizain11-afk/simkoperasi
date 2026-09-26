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
  Cell,
  ReferenceLine 
} from 'recharts';
import { PendapatanLain, BebanKoperasi, Pinjaman, Angsuran } from '../types';
import { formatRupiah, calculateAngsuranInterest, calculateMonthlyProfitLossSummaries, calculateAverageMonthlyNetProfit, UnifiedMonthlyProfitItem } from '../utils/finance';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Layers, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Table, 
  Activity, 
  Scale, 
  Award,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PortalGrafikLabaBulananProps {
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  namaKoperasi?: string;
  onViewDetailFinance?: () => void;
  className?: string;
}

export interface MonthlyProfitDataPoint {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Agu 26"
  fullMonthLabel: string; // "Agustus 2026"
  year: number;
  monthNum: number;
  pendapatan: number;
  beban: number;
  labaBersih: number;
  marginPersen: number;
  rasioBeban: number;
  jasaPinjaman: number;
  provisi: number;
  warung: number;
  bungaBank: number;
  denda: number;
  lainLain: number;
  gaji: number;
  operasional: number;
  listrik: number;
  penyusutan: number;
  bebanLainnya: number;
}

export function PortalGrafikLabaBulanan({
  income = [],
  expenses = [],
  pinjaman = [],
  angsuran = [],
  namaKoperasi = 'Koperasi Dana Segar',
  onViewDetailFinance,
  className = ''
}: PortalGrafikLabaBulananProps) {
  // View states
  const [chartMode, setChartMode] = useState<'composed' | 'bar_dual' | 'bar_laba' | 'area_laba' | 'margin'>('bar_dual');
  const [rangeFilter, setRangeFilter] = useState<'6m' | '12m' | 'all'>('6m');
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [selectedHoverPoint, setSelectedHoverPoint] = useState<MonthlyProfitDataPoint | null>(null);

  // Compute all monthly profit & loss data chronologically using unified finance calculations
  const allMonthlyProfitData = useMemo<MonthlyProfitDataPoint[]>(() => {
    const rawSummaries = calculateMonthlyProfitLossSummaries(income, expenses, pinjaman, angsuran);
    
    // Sort chronological (oldest to newest) for chart display
    const sorted = [...rawSummaries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return sorted.map(s => ({
      monthKey: s.monthKey,
      monthLabel: s.monthLabel,
      fullMonthLabel: s.fullMonthLabel,
      year: s.year,
      monthNum: s.monthNum,
      pendapatan: s.totalIncome,
      beban: s.totalExpense,
      labaBersih: s.netProfit,
      marginPersen: s.profitMargin,
      rasioBeban: s.expenseRatio,
      jasaPinjaman: s.incomeBreakdown.jasaPinjaman,
      provisi: s.incomeBreakdown.provisi,
      warung: s.incomeBreakdown.warung,
      bungaBank: s.incomeBreakdown.bungaBank,
      denda: s.incomeBreakdown.denda,
      lainLain: s.incomeBreakdown.lainLain,
      gaji: s.expenseBreakdown.gaji,
      operasional: s.expenseBreakdown.operasional,
      listrik: s.expenseBreakdown.listrik,
      penyusutan: s.expenseBreakdown.penyusutan,
      bebanLainnya: s.expenseBreakdown.lainnya
    }));
  }, [income, expenses, pinjaman, angsuran]);

  // Filtered data by range
  const displayedData = useMemo(() => {
    if (rangeFilter === '6m') {
      return allMonthlyProfitData.slice(-6);
    }
    if (rangeFilter === '12m') {
      return allMonthlyProfitData.slice(-12);
    }
    return allMonthlyProfitData;
  }, [allMonthlyProfitData, rangeFilter]);

  // Aggregated KPI Stats for the selected period (synchronized with ArusKasView)
  const stats = useMemo(() => {
    const totalPendapatan = displayedData.reduce((sum, d) => sum + d.pendapatan, 0);
    const totalBeban = displayedData.reduce((sum, d) => sum + d.beban, 0);
    const totalLaba = totalPendapatan - totalBeban;
    
    // Convert displayedData back to summary structure to use authoritative calculateAverageMonthlyNetProfit
    const summaryItems: UnifiedMonthlyProfitItem[] = displayedData.map(d => ({
      monthKey: d.monthKey,
      monthLabel: d.monthLabel,
      fullMonthLabel: d.fullMonthLabel,
      year: d.year,
      monthNum: d.monthNum,
      totalIncome: d.pendapatan,
      totalExpense: d.beban,
      netProfit: d.labaBersih,
      profitMargin: d.marginPersen,
      expenseRatio: d.rasioBeban,
      incomeBreakdown: {
        jasaPinjaman: d.jasaPinjaman,
        provisi: d.provisi,
        warung: d.warung,
        bungaBank: d.bungaBank,
        denda: d.denda,
        lainLain: d.lainLain,
        manual: 0
      },
      expenseBreakdown: {
        gaji: d.gaji,
        operasional: d.operasional,
        listrik: d.listrik,
        penyusutan: d.penyusutan,
        lainnya: d.bebanLainnya
      },
      incomeCount: 0,
      expenseCount: 0
    }));

    const avgLabaBulanan = calculateAverageMonthlyNetProfit(summaryItems);
    const avgMargin = totalPendapatan > 0 ? Math.round((totalLaba / totalPendapatan) * 1000) / 10 : 0;

    // Find best performing month
    let bestMonth: MonthlyProfitDataPoint | null = null;
    displayedData.forEach(d => {
      if (!bestMonth || d.labaBersih > bestMonth.labaBersih) {
        bestMonth = d;
      }
    });

    // Breakdown totals
    const totalJasa = displayedData.reduce((sum, d) => sum + d.jasaPinjaman, 0);
    const totalProvisi = displayedData.reduce((sum, d) => sum + d.provisi, 0);
    const totalWarung = displayedData.reduce((sum, d) => sum + d.warung, 0);
    const totalGaji = displayedData.reduce((sum, d) => sum + d.gaji, 0);
    const totalOperasional = displayedData.reduce((sum, d) => sum + d.operasional, 0);

    return {
      totalPendapatan,
      totalBeban,
      totalLaba,
      avgLabaBulanan,
      avgMargin,
      bestMonth,
      totalJasa,
      totalProvisi,
      totalWarung,
      totalGaji,
      totalOperasional,
      countMonths: displayedData.length
    };
  }, [displayedData]);

  // Custom Chart Tooltip
  const CustomProfitTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyProfitDataPoint = payload[0]?.payload;
      if (!data) return null;

      const isSurplus = data.labaBersih >= 0;

      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[240px] space-y-2.5 z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {data.fullMonthLabel}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isSurplus ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {isSurplus ? 'Surplus' : 'Defisit'} {data.marginPersen > 0 ? `+${data.marginPersen}%` : `${data.marginPersen}%`}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Total Pendapatan:
              </span>
              <span className="font-mono font-bold text-emerald-300">{formatRupiah(data.pendapatan)}</span>
            </div>

            {/* Income sub-breakdown */}
            <div className="pl-3 text-[11px] text-slate-350 space-y-0.5 border-l border-slate-700">
              {data.jasaPinjaman > 0 && (
                <div className="flex justify-between">
                  <span>Jasa Pinjaman:</span>
                  <span className="font-mono">{formatRupiah(data.jasaPinjaman)}</span>
                </div>
              )}
              {data.provisi > 0 && (
                <div className="flex justify-between">
                  <span>Provisi Akad:</span>
                  <span className="font-mono">{formatRupiah(data.provisi)}</span>
                </div>
              )}
              {data.warung > 0 && (
                <div className="flex justify-between">
                  <span>Toko / Warung:</span>
                  <span className="font-mono">{formatRupiah(data.warung)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Total Beban:
              </span>
              <span className="font-mono font-bold text-rose-300">{formatRupiah(data.beban)}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700 font-extrabold text-sm">
              <span className="text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Laba Bersih:
              </span>
              <span className={`font-mono ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatRupiah(data.labaBersih)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden ${className}`}>
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/5 via-emerald-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Rekapitulasi Kinerja Finansial
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              • Transparansi Akuntabel
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Grafik Batang Tren Pendapatan & Beban Bulanan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Visualisasi grafik batang interaktif menggunakan Recharts untuk menganalisis perbandingan pendapatan usaha, beban operasional, dan laba rugi bulanan {namaKoperasi}.
          </p>
        </div>

        {/* Action / View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* Period Range selector */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRangeFilter('6m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                rangeFilter === '6m'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              6 Bulan
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('12m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                rangeFilter === '12m'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              1 Tahun
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                rangeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Semua ({allMonthlyProfitData.length})
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              title="Grafik Batang Komparasi Pendapatan vs Beban"
              onClick={() => setChartMode('bar_dual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'bar_dual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Batang Pendapatan vs Beban</span>
            </button>

            <button
              type="button"
              title="Grafik Batang Gabungan Pendapatan, Beban & Garis Laba"
              onClick={() => setChartMode('composed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'composed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batang & Garis Laba</span>
            </button>

            <button
              type="button"
              title="Batang Laba Bersih (Surplus / Defisit)"
              onClick={() => setChartMode('bar_laba')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'bar_laba'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Batang Laba Bersih</span>
            </button>

            <button
              type="button"
              title="Tren Area Pertumbuhan Laba Bersih"
              onClick={() => setChartMode('area_laba')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'area_laba'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tren Laba</span>
            </button>

            <button
              type="button"
              title="Grafik Margin Keuntungan (%)"
              onClick={() => setChartMode('margin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'margin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Margin %</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Laba Bersih Periode */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50/50 to-white dark:from-emerald-950/40 dark:via-slate-850 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Laba Bersih
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className={`text-lg sm:text-2xl font-extrabold font-sans tracking-tight ${
              stats.totalLaba >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatRupiah(stats.totalLaba)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {stats.avgMargin}%
              </span>
              <span>margin periode</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Pendapatan Usaha */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Pendapatan
            </span>
            <div className="p-2 bg-teal-500 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-slate-850 dark:text-slate-100 font-sans tracking-tight">
              {formatRupiah(stats.totalPendapatan)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Jasa pinjaman: {formatRupiah(stats.totalJasa)}
            </p>
          </div>
        </div>

        {/* Card 3: Total Beban Operasional */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Beban
            </span>
            <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-slate-850 dark:text-slate-100 font-sans tracking-tight">
              {formatRupiah(stats.totalBeban)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Gaji & Operasional: {formatRupiah(stats.totalGaji + stats.totalOperasional)}
            </p>
          </div>
        </div>

        {/* Card 4: Rata-Rata Bulanan & Performa Terbaik */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rata-Rata Laba / Bulan
            </span>
            <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 font-sans tracking-tight">
              {formatRupiah(stats.avgLabaBulanan)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Puncak: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.bestMonth?.fullMonthLabel || '-'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {chartMode === 'bar_dual' && 'Grafik Batang Recharts: Perbandingan Pendapatan Usaha vs Beban Operasional'}
              {chartMode === 'composed' && 'Grafik Batang Recharts: Pendapatan, Beban, dan Garis Tren Laba Bersih'}
              {chartMode === 'bar_laba' && 'Grafik Batang Recharts: Distribusi Surplus Laba & Defisit Bulanan'}
              {chartMode === 'area_laba' && 'Grafik Tren Area: Pertumbuhan Akumulasi Laba Bersih Per Bulan'}
              {chartMode === 'margin' && 'Grafik Rasio: Tren Margin Keuntungan Operasional (Profit Margin %)'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {(chartMode === 'composed' || chartMode === 'bar_dual') && (
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" /> Pendapatan
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Beban
                </span>
                {chartMode === 'composed' && (
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <span className="w-3 h-1 bg-indigo-600 inline-block rounded-full" /> Laba Bersih
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-[380px] w-full pt-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'bar_dual' ? (
              <BarChart data={displayedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="portalIncomeBarGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="portalExpenseBarGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={85} 
                  tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomProfitTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="pendapatan" 
                  name="Pendapatan Usaha" 
                  fill="url(#portalIncomeBarGrad2)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={42}
                />
                <Bar 
                  dataKey="beban" 
                  name="Beban Operasional" 
                  fill="url(#portalExpenseBarGrad2)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={42}
                />
              </BarChart>
            ) : chartMode === 'composed' ? (
              <ComposedChart data={displayedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="portalLabaLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="portalIncomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="portalExpenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={85} 
                  tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomProfitTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="pendapatan" 
                  name="Pendapatan Usaha" 
                  fill="url(#portalIncomeBarGrad)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={38}
                />
                <Bar 
                  dataKey="beban" 
                  name="Beban Operasional" 
                  fill="url(#portalExpenseBarGrad)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={38}
                />
                <Line 
                  type="monotone" 
                  dataKey="labaBersih" 
                  name="Laba Bersih (Surplus)" 
                  stroke="#4f46e5" 
                  strokeWidth={3.5} 
                  dot={{ r: 4, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </ComposedChart>
            ) : chartMode === 'area_laba' ? (
              <AreaChart data={displayedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="portalLabaAreaGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={85} 
                  tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomProfitTooltip />} />
                <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="2 2" />
                <Area 
                  type="monotone" 
                  dataKey="labaBersih" 
                  name="Laba Bersih" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  fill="url(#portalLabaAreaGreen)" 
                  dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            ) : chartMode === 'bar_laba' ? (
              <BarChart data={displayedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={85} 
                  tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomProfitTooltip />} />
                <ReferenceLine y={0} stroke="#64748B" />
                <Bar dataKey="labaBersih" name="Laba Bersih" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {displayedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.labaBersih >= 0 ? '#059669' : '#e11d48'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={displayedData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.7} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={60} 
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomProfitTooltip />} />
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Line 
                  type="monotone" 
                  dataKey="marginPersen" 
                  name="Margin Laba (%)" 
                  stroke="#0284c7" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mini Summary Cards & Table Toggle */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDataTable(!showDataTable)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{showDataTable ? 'Sembunyikan Rincian Angka Tabel' : 'Tampilkan Rincian Angka Tabel'}</span>
              {showDataTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {onViewDetailFinance && (
              <button
                type="button"
                onClick={onViewDetailFinance}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Buka Laporan Keuangan Lengkap &rarr;</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-450 dark:text-slate-400">
            * Laba Bersih dihitung otomatis dari <span className="font-semibold text-slate-700 dark:text-slate-300">Pendapatan Terbuku - Beban Operasional</span>.
          </p>
        </div>

        {/* Collapsible Detailed Data Table */}
        <AnimatePresence>
          {showDataTable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-750 font-bold">
                    <th className="py-3 px-4">Periode Bulan</th>
                    <th className="py-3 px-4 text-right">Pendapatan Usaha</th>
                    <th className="py-3 px-4 text-right">Beban Operasional</th>
                    <th className="py-3 px-4 text-right">Laba Bersih (Net)</th>
                    <th className="py-3 px-4 text-center">Margin %</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {displayedData.map((row) => {
                    const isPositive = row.labaBersih >= 0;
                    return (
                      <tr key={row.monthKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.fullMonthLabel}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(row.pendapatan)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {formatRupiah(row.beban)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                          <span className={isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}>
                            {formatRupiah(row.labaBersih)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            row.marginPersen >= 50 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                            row.marginPersen > 0 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' :
                            'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}>
                            {row.marginPersen}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPositive
                              ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {isPositive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {isPositive ? 'Surplus Laba' : 'Defisit'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-3 px-4 uppercase text-[11px]">Total Periode ({displayedData.length} Bulan)</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatRupiah(stats.totalPendapatan)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 dark:text-rose-300">{formatRupiah(stats.totalBeban)}</td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700 dark:text-indigo-300">{formatRupiah(stats.totalLaba)}</td>
                    <td className="py-3 px-4 text-center font-mono">{stats.avgMargin}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                        Akumulatif
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
