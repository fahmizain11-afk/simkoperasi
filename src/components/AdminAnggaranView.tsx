import React, { useState, useMemo } from 'react';
import { 
  ItemAnggaranRAPBK, 
  RAPBKSetting, 
  PendapatanLain, 
  BebanKoperasi, 
  Pinjaman, 
  Angsuran, 
  Pembelian,
  PiutangWarung,
  KoperasiSetup, 
  Member
} from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  Target, TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, 
  Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, AlertCircle, 
  Printer, Download, Filter, RefreshCw, Sparkles, Check, X, 
  Calendar, FileSpreadsheet, ShieldCheck, HelpCircle, ArrowUpRight,
  ArrowDownRight, Layers, DollarSign, Wallet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAnggaranViewProps {
  setup: KoperasiSetup;
  anggaranList: ItemAnggaranRAPBK[];
  rapbkSettings: RAPBKSetting[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  pembelian: Pembelian[];
  piutangWarung: PiutangWarung[];
  members: Member[];
  onAddOrUpdateItem: (item: ItemAnggaranRAPBK) => void;
  onDeleteItem: (id: string) => void;
  onUpdateSetting: (setting: RAPBKSetting) => void;
  onLoadStandardTemplate: (year: number) => void;
  isDarkMode?: boolean;
}

export const AdminAnggaranView: React.FC<AdminAnggaranViewProps> = ({
  setup,
  anggaranList,
  rapbkSettings,
  income,
  expenses,
  pinjaman,
  angsuran,
  pembelian,
  piutangWarung,
  members,
  onAddOrUpdateItem,
  onDeleteItem,
  onUpdateSetting,
  onLoadStandardTemplate,
  isDarkMode = false
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'penyusunan' | 'cetak'>('dashboard');
  const [filterTipe, setFilterTipe] = useState<'all' | 'pendapatan' | 'belanja'>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemAnggaranRAPBK | null>(null);
  const [formData, setFormData] = useState<{
    tipe: 'pendapatan' | 'belanja';
    kategori: string;
    posAkun: string;
    targetTahunan: number;
    keterangan: string;
  }>({
    tipe: 'pendapatan',
    kategori: 'Jasa Pinjaman',
    posAkun: '',
    targetTahunan: 0,
    keterangan: ''
  });

  // Modal State for Setting / Pengesahan
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [settingFormData, setSettingFormData] = useState<RAPBKSetting>({
    id: `rapbk-setting-${selectedYear}`,
    tahunBuku: selectedYear,
    status: 'Disahkan',
    tanggalPengesahan: new Date().toISOString().split('T')[0],
    disahkanOleh: 'Rapat Anggota Tahunan (RAT)',
    catatan: '',
    targetPertumbuhanSHU: 10
  });

  // Active Setting for current selected year
  const activeSetting = useMemo(() => {
    const found = rapbkSettings.find(s => s.tahunBuku === selectedYear);
    if (found) return found;
    return {
      id: `rapbk-setting-${selectedYear}`,
      tahunBuku: selectedYear,
      status: 'Draft' as const,
      tanggalPengesahan: '',
      disahkanOleh: 'Belum Disahkan (Masih Pembahasan)',
      catatan: '',
      targetPertumbuhanSHU: 10
    };
  }, [rapbkSettings, selectedYear]);

  // Filtered Budget items for selected year
  const currentYearBudget = useMemo(() => {
    return anggaranList.filter(item => item.tahunBuku === selectedYear);
  }, [anggaranList, selectedYear]);

  // Calculate Real-time Actuals for the selected year
  const realisasiData = useMemo(() => {
    // 1. Realisasi Jasa Pinjaman (Bunga Pinjaman) dari angsuran di tahun terpilih
    const realisasiJasaPinjaman = angsuran
      .filter(a => {
        if (!a.tanggal) return false;
        const yr = new Date(a.tanggal).getFullYear();
        return yr === selectedYear;
      })
      .reduce((sum, a) => sum + (a.jasaBayar || 0), 0);

    // 2. Realisasi Provisi Pinjaman dari pinjaman baru di tahun terpilih
    const realisasiProvisi = pinjaman
      .filter(p => {
        if (!p.tanggal) return false;
        const yr = new Date(p.tanggal).getFullYear();
        return yr === selectedYear;
      })
      .reduce((sum, p) => sum + (p.provisiDipotong || (p.nominalPinjaman * (p.biayaProvisiPersen || 1) / 100)), 0);

    // 3. Realisasi Pendapatan Lain-lain (termasuk warung/kantin, jasa giro, denda, seragam)
    const incomeThisYear = income.filter(i => {
      if (!i.tanggal) return false;
      const yr = new Date(i.tanggal).getFullYear();
      return yr === selectedYear;
    });

    const realisasiWarungIncome = incomeThisYear
      .filter(i => i.sumber === 'warung' || i.keterangan?.toLowerCase().includes('warung') || i.keterangan?.toLowerCase().includes('kantin'))
      .reduce((sum, i) => sum + i.nominal, 0);

    const realisasiBungaBank = incomeThisYear
      .filter(i => i.sumber === 'bunga_simpanan' || i.keterangan?.toLowerCase().includes('giro') || i.keterangan?.toLowerCase().includes('bank'))
      .reduce((sum, i) => sum + i.nominal, 0);

    const realisasiIncomeLain = incomeThisYear
      .filter(i => i.sumber !== 'warung' && i.sumber !== 'bunga_simpanan' && !i.keterangan?.toLowerCase().includes('warung') && !i.keterangan?.toLowerCase().includes('bank'))
      .reduce((sum, i) => sum + i.nominal, 0);

    // 4. Realisasi Beban Operasional per kategori
    const expensesThisYear = expenses.filter(e => {
      if (!e.tanggal) return false;
      const yr = new Date(e.tanggal).getFullYear();
      return yr === selectedYear;
    });

    // Helper to match actual expense based on category/keyword
    const getExpenseActual = (posAkun: string, kategori: string) => {
      const p = posAkun.toLowerCase();
      const k = kategori.toLowerCase();
      
      return expensesThisYear
        .filter(e => {
          const ek = (e.kategori || '').toLowerCase();
          const ed = (e.keterangan || '').toLowerCase();
          
          if (k.includes('rat') || p.includes('rat')) {
            return ek.includes('rat') || ed.includes('rat');
          }
          if (k.includes('honor') || p.includes('honor') || p.includes('pengurus') || p.includes('insentif')) {
            return ek.includes('honor') || ek.includes('gaji') || ed.includes('honor') || ed.includes('pengurus');
          }
          if (k.includes('atk') || p.includes('atk') || p.includes('kertas') || p.includes('tinta')) {
            return ek.includes('atk') || ek.includes('cetak') || ed.includes('atk') || ed.includes('kertas') || ed.includes('tinta');
          }
          if (k.includes('listrik') || p.includes('listrik') || p.includes('internet') || p.includes('air')) {
            return ek.includes('listrik') || ek.includes('internet') || ek.includes('utilitas') || ed.includes('listrik') || ed.includes('wifi');
          }
          if (k.includes('transport') || p.includes('transport') || p.includes('sppd') || p.includes('dinas')) {
            return ek.includes('transport') || ek.includes('sppd') || ed.includes('transport') || ed.includes('bensin');
          }
          if (k.includes('penyusutan') || p.includes('penyusutan') || p.includes('inventaris')) {
            return ek.includes('penyusutan') || ed.includes('penyusutan');
          }
          if (k.includes('sosial') || p.includes('sosial') || p.includes('santunan') || p.includes('pendidikan')) {
            return ek.includes('sosial') || ek.includes('santunan') || ed.includes('sosial') || ed.includes('duka');
          }
          if (k.includes('pemeliharaan') || p.includes('pemeliharaan') || p.includes('hosting') || p.includes('server')) {
            return ek.includes('pemeliharaan') || ed.includes('hosting') || ed.includes('server') || ed.includes('aplikasi');
          }
          // Default fallback match by category name
          return ek.includes(k) || ed.includes(p);
        })
        .reduce((sum, e) => sum + e.nominal, 0);
    };

    return {
      realisasiJasaPinjaman,
      realisasiProvisi,
      realisasiWarungIncome,
      realisasiBungaBank,
      realisasiIncomeLain,
      totalIncomeRiil: realisasiJasaPinjaman + realisasiProvisi + realisasiWarungIncome + realisasiBungaBank + realisasiIncomeLain,
      totalExpensesRiil: expensesThisYear.reduce((sum, e) => sum + e.nominal, 0),
      getExpenseActual
    };
  }, [selectedYear, angsuran, pinjaman, income, expenses]);

  // Aggregate mapped data with comparison calculations
  const mappedBudgetItems = useMemo(() => {
    return currentYearBudget.map(item => {
      let realisasi = 0;
      if (item.tipe === 'pendapatan') {
        const p = item.posAkun.toLowerCase();
        const k = item.kategori.toLowerCase();
        if (k.includes('pinjaman') || p.includes('jasa pinjaman') || p.includes('bunga')) {
          realisasi = realisasiData.realisasiJasaPinjaman;
        } else if (k.includes('provisi') || p.includes('provisi') || p.includes('administrasi')) {
          realisasi = realisasiData.realisasiProvisi;
        } else if (k.includes('warung') || p.includes('warung') || p.includes('kantin')) {
          realisasi = realisasiData.realisasiWarungIncome;
        } else if (k.includes('giro') || p.includes('bunga bank') || p.includes('giro')) {
          realisasi = realisasiData.realisasiBungaBank;
        } else {
          realisasi = realisasiData.realisasiIncomeLain;
        }
      } else {
        realisasi = realisasiData.getExpenseActual(item.posAkun, item.kategori);
      }

      const target = item.targetTahunan || 0;
      const persentase = target > 0 ? (realisasi / target) * 100 : 0;
      const selisih = item.tipe === 'pendapatan' ? realisasi - target : target - realisasi; // for expense, positive selisih means under budget (hemat)

      // Status indicator
      let statusBadge: 'aman' | 'waspada' | 'overbudget' | 'tercapai' | 'belum_tercapai' = 'aman';
      if (item.tipe === 'pendapatan') {
        if (persentase >= 100) statusBadge = 'tercapai';
        else if (persentase >= 75) statusBadge = 'aman';
        else statusBadge = 'belum_tercapai';
      } else {
        if (persentase > 100) statusBadge = 'overbudget';
        else if (persentase >= 85) statusBadge = 'waspada';
        else statusBadge = 'aman';
      }

      return {
        ...item,
        realisasi,
        persentase,
        selisih,
        statusBadge
      };
    });
  }, [currentYearBudget, realisasiData]);

  // Summaries
  const summary = useMemo(() => {
    const pendapatanItems = mappedBudgetItems.filter(i => i.tipe === 'pendapatan');
    const belanjaItems = mappedBudgetItems.filter(i => i.tipe === 'belanja');

    const totalTargetPendapatan = pendapatanItems.reduce((sum, i) => sum + i.targetTahunan, 0);
    const totalRealisasiPendapatan = pendapatanItems.reduce((sum, i) => sum + i.realisasi, 0);
    const capaianPendapatanPersen = totalTargetPendapatan > 0 ? (totalRealisasiPendapatan / totalTargetPendapatan) * 100 : 0;

    const totalTargetBelanja = belanjaItems.reduce((sum, i) => sum + i.targetTahunan, 0);
    const totalRealisasiBelanja = belanjaItems.reduce((sum, i) => sum + i.realisasi, 0);
    const serapanBelanjaPersen = totalTargetBelanja > 0 ? (totalRealisasiBelanja / totalTargetBelanja) * 100 : 0;

    const targetSHUBersih = totalTargetPendapatan - totalTargetBelanja;
    const realisasiSHUBersih = totalRealisasiPendapatan - totalRealisasiBelanja;
    const capaianSHUPersen = targetSHUBersih > 0 ? (realisasiSHUBersih / targetSHUBersih) * 100 : 0;

    const overbudgetCount = belanjaItems.filter(i => i.statusBadge === 'overbudget').length;
    const waspadaCount = belanjaItems.filter(i => i.statusBadge === 'waspada').length;

    return {
      totalTargetPendapatan,
      totalRealisasiPendapatan,
      capaianPendapatanPersen,
      totalTargetBelanja,
      totalRealisasiBelanja,
      serapanBelanjaPersen,
      targetSHUBersih,
      realisasiSHUBersih,
      capaianSHUPersen,
      overbudgetCount,
      waspadaCount,
      pendapatanItems,
      belanjaItems
    };
  }, [mappedBudgetItems]);

  // Chart Data Preparation for Recharts
  const chartData = useMemo(() => {
    return mappedBudgetItems.map(item => ({
      name: item.posAkun.length > 22 ? item.posAkun.substring(0, 20) + '...' : item.posAkun,
      fullName: item.posAkun,
      tipe: item.tipe === 'pendapatan' ? 'Pendapatan' : 'Belanja',
      target: item.targetTahunan,
      realisasi: item.realisasi,
      persen: Math.round(item.persentase)
    }));
  }, [mappedBudgetItems]);

  // Filtered List for Table View
  const filteredList = useMemo(() => {
    return mappedBudgetItems.filter(item => {
      const matchTipe = filterTipe === 'all' || item.tipe === filterTipe;
      const matchKategori = filterKategori === 'all' || item.kategori === filterKategori;
      const matchSearch = !searchQuery.trim() || 
        item.posAkun.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchTipe && matchKategori && matchSearch;
    });
  }, [mappedBudgetItems, filterTipe, filterKategori, searchQuery]);

  // Distinct Categories for Filter Dropdown
  const distinctCategories = useMemo(() => {
    const setCat = new Set<string>();
    currentYearBudget.forEach(i => setCat.add(i.kategori));
    return Array.from(setCat);
  }, [currentYearBudget]);

  const handleOpenAddModal = (tipe: 'pendapatan' | 'belanja' = 'pendapatan') => {
    setEditingItem(null);
    setFormData({
      tipe,
      kategori: tipe === 'pendapatan' ? 'Jasa Pinjaman' : 'Operasional Kantor',
      posAkun: '',
      targetTahunan: 0,
      keterangan: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ItemAnggaranRAPBK) => {
    setEditingItem(item);
    setFormData({
      tipe: item.tipe,
      kategori: item.kategori,
      posAkun: item.posAkun,
      targetTahunan: item.targetTahunan,
      keterangan: item.keterangan || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.posAkun.trim()) {
      alert("Nama Pos Akun Anggaran wajib diisi!");
      return;
    }
    if (formData.targetTahunan <= 0) {
      alert("Target Tahunan (Rp) harus lebih dari 0!");
      return;
    }

    const newItem: ItemAnggaranRAPBK = {
      id: editingItem ? editingItem.id : `rapbk-${Date.now()}`,
      tahunBuku: selectedYear,
      tipe: formData.tipe,
      kategori: formData.kategori,
      posAkun: formData.posAkun.trim(),
      targetTahunan: Number(formData.targetTahunan),
      keterangan: formData.keterangan.trim(),
      updatedAt: new Date().toISOString()
    };

    onAddOrUpdateItem(newItem);
    setIsModalOpen(false);
  };

  const handleOpenSettingModal = () => {
    setSettingFormData(activeSetting);
    setIsSettingModalOpen(true);
  };

  const handleSaveSettingModal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSetting({
      ...settingFormData,
      tahunBuku: selectedYear,
      id: `rapbk-setting-${selectedYear}`
    });
    setIsSettingModalOpen(false);
  };

  // Export CSV / Excel
  const handleExportCSV = () => {
    const headers = ['No', 'Tahun Buku', 'Tipe', 'Kategori', 'Pos Akun RAPBK', 'Target Pagu (Rp)', 'Realisasi Berjalan (Rp)', 'Selisih (Rp)', 'Persentase (%)', 'Status', 'Keterangan'];
    const rows = mappedBudgetItems.map((item, idx) => [
      idx + 1,
      item.tahunBuku,
      item.tipe === 'pendapatan' ? 'Pendapatan' : 'Belanja/Beban',
      item.kategori,
      `"${item.posAkun.replace(/"/g, '""')}"`,
      item.targetTahunan,
      item.realisasi,
      item.selisih,
      `${item.persentase.toFixed(1)}%`,
      item.statusBadge.toUpperCase(),
      `"${(item.keterangan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RAPBK_Koperasi_${setup.namaKoperasi || 'DanaSegar'}_Tahun_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-300" />
                Modul Perencanaan & Evaluasi Keuangan
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeSetting.status === 'Disahkan' 
                  ? 'bg-emerald-400 text-emerald-950' 
                  : activeSetting.status === 'Revisi'
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-slate-700 text-slate-200'
              }`}>
                {activeSetting.status === 'Disahkan' ? '✓ STATUS: DISAHKAN' : activeSetting.status === 'Revisi' ? '⚠ STATUS: REVISI' : '📝 STATUS: DRAFT'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>RAPBK & Rencana Kerja Tahunan</span>
              <span className="text-emerald-300 font-extrabold underline decoration-emerald-400">Tahun Buku {selectedYear}</span>
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Penyusunan Rencana Anggaran Pendapatan dan Belanja Koperasi (RAPBK), monitoring realisasi serapan anggaran per pos akun, dan evaluasi capaian target SHU tahunan {setup.namaKoperasi || "Koperasi Dana Segar"}.
            </p>
          </div>

          {/* Action Tools & Year Selector */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Year Selector */}
            <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 text-xs">
              <span className="px-2 font-medium text-emerald-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tahun:
              </span>
              {[currentYear - 1, currentYear, currentYear + 1].map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    selectedYear === yr 
                      ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Pengesahan Setting Button */}
            <button
              onClick={handleOpenSettingModal}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
              title="Atur Status Pengesahan & Catatan RAPBK"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Status Pengesahan</span>
            </button>

            {/* Export & Print */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Ekspor ke Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-emerald-700/50 pt-3 text-xs">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dasbor & Analisis Realisasi</span>
          </button>
          <button
            onClick={() => setActiveSubTab('penyusunan')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'penyusunan'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Penyusunan & Rincian Target ({currentYearBudget.length} Pos)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cetak')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'cetak'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Lembar Cetak RAPBK Resmi</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DASBOR & ANALISIS REALISASI */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Target vs Realisasi Pendapatan */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Target Pendapatan
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summary.capaianPendapatanPersen >= 100 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                    : summary.capaianPendapatanPersen >= 75
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                }`}>
                  {summary.capaianPendapatanPersen.toFixed(1)}% Capaian
                </span>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatRupiah(summary.totalRealisasiPendapatan)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Pagu Target: <strong>{formatRupiah(summary.totalTargetPendapatan)}</strong></span>
                  <span className={summary.totalRealisasiPendapatan >= summary.totalTargetPendapatan ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                    {summary.totalRealisasiPendapatan >= summary.totalTargetPendapatan ? 'Surplus ' : 'Sisa '} 
                    {formatRupiah(Math.abs(summary.totalTargetPendapatan - summary.totalRealisasiPendapatan))}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.capaianPendapatanPersen >= 100 ? 'bg-emerald-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(summary.capaianPendapatanPersen, 100)}%` }}
                />
              </div>
            </div>

            {/* 2. Pagu vs Realisasi Belanja */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" /> Pagu Belanja & Beban
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summary.serapanBelanjaPersen > 100 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' 
                    : summary.serapanBelanjaPersen >= 85
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}>
                  {summary.serapanBelanjaPersen.toFixed(1)}% Terserap
                </span>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatRupiah(summary.totalRealisasiBelanja)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Pagu Anggaran: <strong>{formatRupiah(summary.totalTargetBelanja)}</strong></span>
                  <span className={summary.totalRealisasiBelanja > summary.totalTargetBelanja ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {summary.totalRealisasiBelanja > summary.totalTargetBelanja ? 'Over ' : 'Sisa Pagu '} 
                    {formatRupiah(Math.abs(summary.totalTargetBelanja - summary.totalRealisasiBelanja))}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.serapanBelanjaPersen > 100 ? 'bg-rose-500' : summary.serapanBelanjaPersen >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(summary.serapanBelanjaPersen, 100)}%` }}
                />
              </div>
            </div>

            {/* 3. Proyeksi vs Realisasi SHU Bersih */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Proyeksi SHU Bersih
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {summary.capaianSHUPersen.toFixed(1)}% Realisasi
                </span>
              </div>

              <div className="mt-3">
                <div className={`text-2xl font-black ${summary.realisasiSHUBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatRupiah(summary.realisasiSHUBersih)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Target SHU: <strong>{formatRupiah(summary.targetSHUBersih)}</strong></span>
                  <span className={summary.realisasiSHUBersih >= summary.targetSHUBersih ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {summary.realisasiSHUBersih >= summary.targetSHUBersih ? 'Melampaui Target' : 'Menuju Target'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.capaianSHUPersen >= 100 ? 'bg-indigo-500' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(summary.capaianSHUPersen, 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Budget Health & Warnings Alert */}
          {(summary.overbudgetCount > 0 || summary.waspadaCount > 0) && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">Catatan Pengawasan Anggaran ({selectedYear}):</h4>
                <p className="mt-1 leading-relaxed">
                  Terdapat <strong>{summary.overbudgetCount} pos beban yang telah melampaui pagu (&gt;100%)</strong> dan <strong>{summary.waspadaCount} pos dalam status waspada (&gt;85% terserap)</strong>. 
                  Disarankan bagi pengurus untuk melakukan efisiensi pengeluaran pada pos-pos terkait atau mengajukan revisi RAPBK pada rapat pengurus/pengawas berikutnya.
                </p>
              </div>
            </div>
          )}

          {/* Visual Comparison Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Grafik Komparasi: Target RAPBK vs Realisasi Riil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Perbandingan visual antara nominal pagu anggaran yang direncanakan dengan realisasi berjalan per pos akun.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" /> Target RAPBK</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-400 inline-block" /> Realisasi Berjalan</span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      angle={-20} 
                      textAnchor="end" 
                      tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#475569' }} 
                      height={45} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#475569' }} 
                      tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`} 
                    />
                    <Tooltip 
                      formatter={(val: any) => [formatRupiah(Number(val)), 'Nominal']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="target" name="Target RAPBK" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realisasi" name="Realisasi Riil" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada data anggaran untuk tahun {selectedYear}. Klik tombol "Muat Template Standar" di tab Penyusunan.
              </div>
            )}
          </div>

          {/* Quick Realization Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Rekap Tabel Realisasi Anggaran ({mappedBudgetItems.length} Pos Akun)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('penyusunan')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Kelola / Tambah Pos Anggaran
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">Pos Anggaran RAPBK</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 text-right">Target Pagu (Rp)</th>
                    <th className="p-3 text-right">Realisasi (Rp)</th>
                    <th className="p-3 text-right">Deviasi / Sisa</th>
                    <th className="p-3 text-center">Serapan (%)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {mappedBudgetItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Belum ada pos anggaran yang dibuat untuk tahun {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    mappedBudgetItems.map((item, idx) => {
                      const isPendapatan = item.tipe === 'pendapatan';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                          <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isPendapatan ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{item.posAkun}</span>
                            </div>
                            {item.keterangan && (
                              <p className="text-[10px] text-slate-400 font-normal pl-3.5">{item.keterangan}</p>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{item.kategori}</td>
                          <td className="p-3 text-right font-medium">{formatRupiah(item.targetTahunan)}</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatRupiah(item.realisasi)}
                          </td>
                          <td className={`p-3 text-right font-medium ${
                            item.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {formatRupiah(item.selisih)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.persentase.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.statusBadge === 'tercapai' || item.statusBadge === 'aman'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : item.statusBadge === 'waspada'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            }`}>
                              {item.statusBadge.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PENYUSUNAN & PENGATURAN TARGET RAPBK */}
      {activeSubTab === 'penyusunan' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tipe */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setFilterTipe('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    filterTipe === 'all' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterTipe('pendapatan')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    filterTipe === 'pendapatan' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pendapatan
                </button>
                <button
                  onClick={() => setFilterTipe('belanja')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    filterTipe === 'belanja' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Belanja / Beban
                </button>
              </div>

              {/* Filter Kategori */}
              {distinctCategories.length > 0 && (
                <select
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Kategori</option>
                  {distinctCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentYearBudget.length === 0 && (
                <button
                  onClick={() => onLoadStandardTemplate(selectedYear)}
                  className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Muat Template Standar RAPBK</span>
                </button>
              )}

              <button
                onClick={() => handleOpenAddModal('pendapatan')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pos Anggaran</span>
              </button>
            </div>
          </div>

          {/* Table of Budget Items */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5">Pos Akun Anggaran</th>
                    <th className="p-3.5">Tipe</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5 text-right">Target Pagu Tahunan (Rp)</th>
                    <th className="p-3.5">Keterangan / Rencana Penggunaan</th>
                    <th className="p-3.5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <Target className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">
                            Belum ada pos anggaran pada kategori ini untuk Tahun Buku {selectedYear}.
                          </p>
                          <button
                            onClick={() => onLoadStandardTemplate(selectedYear)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700 transition"
                          >
                            Muat Template Standar RAPBK
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="p-3.5 text-center font-medium text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {item.posAkun}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.tipe === 'pendapatan'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          }`}>
                            {item.tipe === 'pendapatan' ? 'Pendapatan' : 'Belanja'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">{item.kategori}</td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-emerald-400 text-sm">
                          {formatRupiah(item.targetTahunan)}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                          {item.keterangan || '-'}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-lg transition"
                              title="Edit Pos Anggaran"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus pos anggaran "${item.posAkun}"?`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition"
                              title="Hapus Pos Anggaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LEMBAR CETAK RAPBK RESMI LPJ RAT */}
      {activeSubTab === 'cetak' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pratinjau lembar resmi Rencana Anggaran Pendapatan dan Belanja Koperasi (RAPBK) siap cetak / simpan sebagai dokumen PDF pertanggungjawaban RAT.
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Dokumen RAPBK (PDF)
            </button>
          </div>

          {/* Printable Sheet */}
          <div className="bg-white text-slate-900 p-8 md:p-12 rounded-2xl shadow-md border border-slate-200 max-w-4xl mx-auto space-y-8 print:p-0 print:border-none print:shadow-none">
            {/* Header Kop */}
            <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
              <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wide">
                {setup.namaKoperasi || "KOPERASI KONSUMEN DANA SEGAR SMKN 10 GARUT"}
              </h2>
              <p className="text-xs text-slate-600">
                Badan Hukum No: {setup.noBadanHukum || "AHU-00123.AH.01.2026"} | Alamat: {setup.alamatKantor || "Garut, Jawa Barat"}
              </p>
              <div className="pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 underline">
                  RENCANA ANGGARAN PENDAPATAN DAN BELANJA KOPERASI (RAPBK)
                </h3>
                <p className="text-xs font-semibold text-slate-700">
                  TAHUN BUKU {selectedYear}
                </p>
              </div>
            </div>

            {/* Table RAPBK Cetak */}
            <div className="space-y-6 text-xs">
              {/* PENDAPATAN */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 p-2 border border-slate-300">
                  I. RENCANA PENDAPATAN KOPERASI TAHUN {selectedYear}
                </h4>
                <table className="w-full border-collapse border border-slate-300 mt-1">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 w-10 text-center">No</th>
                      <th className="p-2 border border-slate-300">Pos Akun Pendapatan</th>
                      <th className="p-2 border border-slate-300 text-right w-40">Target RAPBK (Rp)</th>
                      <th className="p-2 border border-slate-300 text-right w-40">Realisasi (Rp)</th>
                      <th className="p-2 border border-slate-300 text-center w-20">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.pendapatanItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-slate-300">{item.posAkun}</td>
                        <td className="p-2 border border-slate-300 text-right font-medium">{formatRupiah(item.targetTahunan)}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">{formatRupiah(item.realisasi)}</td>
                        <td className="p-2 border border-slate-300 text-center">{item.persentase.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50 font-bold">
                      <td colSpan={2} className="p-2 border border-slate-300 text-right uppercase">Total Rencana Pendapatan (A)</td>
                      <td className="p-2 border border-slate-300 text-right text-emerald-900">{formatRupiah(summary.totalTargetPendapatan)}</td>
                      <td className="p-2 border border-slate-300 text-right text-emerald-900">{formatRupiah(summary.totalRealisasiPendapatan)}</td>
                      <td className="p-2 border border-slate-300 text-center">{summary.capaianPendapatanPersen.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* BELANJA */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 p-2 border border-slate-300">
                  II. RENCANA BELANJA & BEBAN OPERASIONAL TAHUN {selectedYear}
                </h4>
                <table className="w-full border-collapse border border-slate-300 mt-1">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 w-10 text-center">No</th>
                      <th className="p-2 border border-slate-300">Pos Akun Beban & Operasional</th>
                      <th className="p-2 border border-slate-300 text-right w-40">Pagu RAPBK (Rp)</th>
                      <th className="p-2 border border-slate-300 text-right w-40">Realisasi (Rp)</th>
                      <th className="p-2 border border-slate-300 text-center w-20">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.belanjaItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                        <td className="p-2 border border-slate-300">{item.posAkun}</td>
                        <td className="p-2 border border-slate-300 text-right font-medium">{formatRupiah(item.targetTahunan)}</td>
                        <td className="p-2 border border-slate-300 text-right font-bold">{formatRupiah(item.realisasi)}</td>
                        <td className="p-2 border border-slate-300 text-center">{item.persentase.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50 font-bold">
                      <td colSpan={2} className="p-2 border border-slate-300 text-right uppercase">Total Pagu Belanja (B)</td>
                      <td className="p-2 border border-slate-300 text-right text-rose-900">{formatRupiah(summary.totalTargetBelanja)}</td>
                      <td className="p-2 border border-slate-300 text-right text-rose-900">{formatRupiah(summary.totalRealisasiBelanja)}</td>
                      <td className="p-2 border border-slate-300 text-center">{summary.serapanBelanjaPersen.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* REKAP SHU PROYEKSI */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>PROYEKSI TARGET SISA HASIL USAHA (SHU) TAHUN {selectedYear} (A - B):</span>
                  <span className="text-emerald-800 text-base">{formatRupiah(summary.targetSHUBersih)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-200 pt-2">
                  <span>Realisasi SHU Berjalan s/d Saat Ini:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(summary.realisasiSHUBersih)} ({summary.capaianSHUPersen.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Catatan Pengesahan */}
              <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Catatan Pengesahan:</strong> {activeSetting.catatan || `RAPBK Tahun Buku ${selectedYear} telah disetujui dan disahkan pada ${activeSetting.disahkanOleh || 'Rapat Anggota Tahunan (RAT)'} tanggal ${activeSetting.tanggalPengesahan || '-'}.`}
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
                <div>
                  <p className="text-slate-600">Mengetahui,</p>
                  <p className="font-bold text-slate-900">Ketua Koperasi</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">( ........................................ )</p>
                </div>
                <div>
                  <p className="text-slate-600">Disusun Oleh,</p>
                  <p className="font-bold text-slate-900">Bendahara Koperasi</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">( ........................................ )</p>
                </div>
                <div>
                  <p className="text-slate-600">Disetujui,</p>
                  <p className="font-bold text-slate-900">Ketua Pengawas</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">( ........................................ )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT POS ANGGARAN */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  {editingItem ? 'Edit Pos Anggaran RAPBK' : 'Tambah Pos Anggaran RAPBK Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
                {/* Tipe */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tipe Pos Anggaran *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipe: 'pendapatan' })}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                        formData.tipe === 'pendapatan'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" /> Pendapatan
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipe: 'belanja' })}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                        formData.tipe === 'belanja'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" /> Belanja / Beban
                    </button>
                  </div>
                </div>

                {/* Kategori */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kategori Anggaran *</label>
                  <input
                    type="text"
                    required
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    placeholder={formData.tipe === 'pendapatan' ? 'contoh: Jasa Pinjaman, Provisi, Usaha Warung' : 'contoh: Operasional Kantor, RAT, Honor Pengurus, ATK'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Pos Akun */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nama Pos Akun Spesifik *</label>
                  <input
                    type="text"
                    required
                    value={formData.posAkun}
                    onChange={(e) => setFormData({ ...formData, posAkun: e.target.value })}
                    placeholder="contoh: Beban ATK, Kertas, Tinta & Cetak Buku Anggota"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Target Tahunan (Rp) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Pagu Target Tahunan (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      required
                      value={formData.targetTahunan || ''}
                      onChange={(e) => setFormData({ ...formData, targetTahunan: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Keterangan / Rencana Penggunaan</label>
                  <textarea
                    rows={2}
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Catatan tujuan atau rincian dasar penetapan angka anggaran..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-750">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition"
                  >
                    Simpan Pos Anggaran
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PENGESAHAN RAPBK SETTING */}
      <AnimatePresence>
        {isSettingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Pengesahan RAPBK Tahun {selectedYear}
                </h3>
                <button
                  onClick={() => setIsSettingModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettingModal} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Legalitas RAPBK</label>
                  <select
                    value={settingFormData.status}
                    onChange={(e: any) => setSettingFormData({ ...settingFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Disahkan">✓ Disahkan (Resmi Berlaku)</option>
                    <option value="Draft">📝 Draft (Masih Dalam Pembahasan)</option>
                    <option value="Revisi">⚠ Revisi (Perubahan Anggaran)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal Pengesahan</label>
                  <input
                    type="date"
                    value={settingFormData.tanggalPengesahan || ''}
                    onChange={(e) => setSettingFormData({ ...settingFormData, tanggalPengesahan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Disahkan Dalam Forum / Rapat</label>
                  <input
                    type="text"
                    value={settingFormData.disahkanOleh || ''}
                    onChange={(e) => setSettingFormData({ ...settingFormData, disahkanOleh: e.target.value })}
                    placeholder="contoh: Rapat Anggota Tahunan (RAT) Tahun Buku 2025"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Catatan / Risalah Tambahan</label>
                  <textarea
                    rows={3}
                    value={settingFormData.catatan || ''}
                    onChange={(e) => setSettingFormData({ ...settingFormData, catatan: e.target.value })}
                    placeholder="Catatan kesepakatan anggota pada saat pengesahan RAPBK..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-750">
                  <button
                    type="button"
                    onClick={() => setIsSettingModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition"
                  >
                    Simpan Pengesahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
