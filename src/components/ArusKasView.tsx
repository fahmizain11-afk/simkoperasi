import React, { useState, useEffect, useMemo } from 'react';
import { 
  Member, KoperasiSetup, PendapatanLain, BebanKoperasi, Pinjaman, Angsuran
} from '../types';
import { 
  formatRupiah, 
  calculateAngsuranInterest, 
  calculateLoanOutstanding,
  exportToExcel, 
  calculateMonthlyProfitLossSummaries, 
  calculateAverageMonthlyNetProfit, 
  UnifiedMonthlyProfitItem 
} from '../utils/finance';
import { 
  TrendingUp, TrendingDown, DollarSign, Tag, Calendar, Plus, Trash2,
  ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter,
  CalendarDays, FileSpreadsheet, Layers, PieChart, BarChart3, ChevronDown, Check,
  Activity, Percent, Clock, Sparkles
} from 'lucide-react';
import { PortalGrafikLabaBulanan } from './PortalGrafikLabaBulanan';

export interface ArusKasProps {
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pinjaman?: Pinjaman[];
  angsuran?: Angsuran[];
  members?: Member[];
  setup?: KoperasiSetup;
  onAddIncome: (item: Omit<PendapatanLain, 'id'>) => void;
  onAddExpense: (item: Omit<BebanKoperasi, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onClearArusKas?: () => void;
  onNavigateToAngsuran?: (angsuranId?: string, memberId?: string, query?: string) => void;
  onNavigateToPinjaman?: (pinjamanId?: string, memberId?: string) => void;
  isDarkMode: boolean;
}

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatYearMonthIndo = (ym: string): string => {
  if (!ym) return '-';
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = INDO_MONTH_NAMES[monthIdx] || parts[1];
  return `${monthName} ${year}`;
};

export type MonthlyProfitLossSummary = UnifiedMonthlyProfitItem;

export function ArusKasView({ 
  income, expenses, pinjaman = [], angsuran = [], members = [], setup, 
  onAddIncome, onAddExpense, onDeleteIncome, onDeleteExpense, onClearArusKas, 
  onNavigateToAngsuran, onNavigateToPinjaman, isDarkMode 
}: ArusKasProps) {
  // Input states
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState<string>('warung');
  const [incNotes, setIncNotes] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().substring(0, 10));

  const [expAmount, setExpAmount] = useState('');
  const [expCat, setExpCat] = useState<string>('gaji_karyawan');
  const [expNotes, setExpNotes] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));

  // Global Month Filter & Views
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('semua');
  const [activeTabSection, setActiveTabSection] = useState<'rekap_laba' | 'jurnal_transaksi'>('jurnal_transaksi');

  // Income table filters & sorting
  const [incomeFilterTab, setIncomeFilterTab] = useState<'semua' | 'jasa_pinjaman' | 'provisi' | 'warung' | 'jurnal_manual'>('semua');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeSortBy, setIncomeSortBy] = useState<'tanggal_desc' | 'tanggal_asc' | 'nominal_desc' | 'nominal_asc' | 'sumber_asc'>('tanggal_desc');

  // Expenses table filters & sorting
  const [expenseFilterTab, setExpenseFilterTab] = useState<'semua' | 'gaji' | 'operasional' | 'listrik' | 'penyusutan' | 'lainnya'>('semua');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseSortBy, setExpenseSortBy] = useState<'tanggal_desc' | 'tanggal_asc' | 'nominal_desc' | 'nominal_asc' | 'kategori_asc'>('tanggal_desc');

  // Custom categories state
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('kop_custom_income_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [newIncomeCatInput, setNewIncomeCatInput] = useState('');
  const [showManageIncomeCats, setShowManageIncomeCats] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('kop_custom_expense_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [newCatInput, setNewCatInput] = useState('');
  const [showManageCats, setShowManageCats] = useState(false);

  useEffect(() => {
    localStorage.setItem('kop_custom_income_categories', JSON.stringify(customIncomeCategories));
  }, [customIncomeCategories]);

  useEffect(() => {
    localStorage.setItem('kop_custom_expense_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  const standardIncomeSources: Record<string, string> = {
    warung: 'Laba Warung Toko',
    jasa_pinjaman: 'Pendapatan Jasa Pinjaman (Bunga)',
    bunga_pinjaman: 'Pendapatan Jasa Pinjaman (Bunga)',
    provisi: 'Pendapatan Biaya Provisi Pinjaman',
    provisi_pinjaman: 'Pendapatan Biaya Provisi Pinjaman',
    bunga_simpanan: 'Bunga Simpanan Bank',
    denda: 'Uang Denda Keterlambatan',
    lain_lain: 'Pendapatan Lain-lain'
  };

  const standardExpenseCategories: Record<string, string> = {
    gaji_karyawan: 'Beban Gaji Karyawan',
    listrik: 'Beban Listrik & PDAM',
    gaji_pengurus: 'Honor Pengurus',
    gaji_pengawas: 'Honor Pengawas',
    operasional_kantor: 'Beban Operasional Kantor / ATK',
    beban_rapat: 'Beban Rapat',
    penyusutan_inventaris: 'Beban Penyusutan Aktiva Tetap (Inventaris)',
    beban_lain: 'Kategori Beban Lainnya'
  };

  const getIncomeSourceLabel = (src: string) => {
    return standardIncomeSources[src] || src.replace(/_/g, ' ');
  };

  const getExpenseCategoryLabel = (cat: string) => {
    return standardExpenseCategories[cat] || cat;
  };

  // Aggregated income list including real-time Jasa Pinjaman and Provisi from transactions
  const combinedIncomeList = useMemo(() => {
    const list: Array<{
      id: string;
      tanggal: string;
      sumber: string;
      sumberKey: string;
      nominal: number;
      keterangan: string;
      isAuto: boolean;
      rawId?: string;
      angsuranId?: string;
      pinjamanId?: string;
      anggotaId?: string;
      rawAngsuran?: Angsuran;
      rawPinjaman?: Pinjaman;
      rawMember?: Member;
    }> = [];

    // 1. Manual / Jurnal income entries
    income.forEach(inc => {
      let key = inc.sumber;
      if (key === 'bunga_pinjaman') key = 'jasa_pinjaman';
      if (key === 'provisi_pinjaman') key = 'provisi';

      list.push({
        id: `inc-${inc.id}`,
        tanggal: inc.tanggal,
        sumber: getIncomeSourceLabel(inc.sumber),
        sumberKey: key,
        nominal: inc.nominal,
        keterangan: inc.keterangan || `Pendapatan ${getIncomeSourceLabel(inc.sumber)}`,
        isAuto: false,
        rawId: inc.id
      });
    });

    // 2. Real-time Provisi from Pinjaman
    pinjaman.forEach(p => {
      if (p.provisiDipotong && p.provisiDipotong > 0) {
        const m = members.find(mem => mem.id === p.anggotaId);
        list.push({
          id: `prov-${p.id}`,
          tanggal: p.tanggal,
          sumber: 'Pendapatan Biaya Provisi Pinjaman',
          sumberKey: 'provisi',
          nominal: p.provisiDipotong,
          keterangan: `Provisi (${p.biayaProvisiPersen || 1}%) Pinjaman #${p.id.substring(0, 6)} - ${m ? m.nama + ' (' + m.noAnggota + ')' : 'Anggota'}`,
          isAuto: true,
          pinjamanId: p.id,
          anggotaId: p.anggotaId,
          rawPinjaman: p,
          rawMember: m
        });
      }
    });

    // 3. Real-time Jasa Pinjaman from Angsuran (reconciled with authoritative double-entry loan ledger)
    const processedLoanIds = new Set<string>();
    pinjaman.forEach(p => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      if (repays.length > 0) {
        processedLoanIds.add(p.id);
        const m = members.find(mem => mem.id === p.anggotaId);
        const totalPaid = repays.reduce((sum, a) => sum + (Number(a.jumlahBayar) || 0), 0);
        const remainingPrincipal = calculateLoanOutstanding(p, repays);
        const principalRecovered = Math.max(0, (Number(p.nominalPinjaman) || 0) - remainingPrincipal);
        const totalLoanJasa = Math.max(0, totalPaid - principalRecovered);

        const nominalSum = repays.reduce((sum, a) => sum + (calculateAngsuranInterest(a, p) || 0), 0);
        if (nominalSum > 0 && Math.abs(nominalSum - totalLoanJasa) > 0.01) {
          repays.forEach(a => {
            const baseInt = calculateAngsuranInterest(a, p);
            const allocated = (baseInt / nominalSum) * totalLoanJasa;
            if (allocated > 0) {
              list.push({
                id: `jasa-angsuran-${a.id}`,
                tanggal: a.tanggal,
                sumber: 'Pendapatan Jasa Pinjaman (Bunga)',
                sumberKey: 'jasa_pinjaman',
                nominal: allocated,
                keterangan: `Jasa Angsuran Ke-${a.bulanKe || 1} - ${m ? m.nama + ' (' + m.noAnggota + ')' : 'Anggota'}`,
                isAuto: true,
                angsuranId: a.id,
                anggotaId: a.anggotaId,
                pinjamanId: a.pinjamanId,
                rawAngsuran: a,
                rawPinjaman: p,
                rawMember: m
              });
            }
          });
        } else if (nominalSum === 0 && totalLoanJasa > 0) {
          const lastA = repays[repays.length - 1];
          list.push({
            id: `jasa-angsuran-${lastA.id}`,
            tanggal: lastA.tanggal,
            sumber: 'Pendapatan Jasa Pinjaman (Bunga)',
            sumberKey: 'jasa_pinjaman',
            nominal: totalLoanJasa,
            keterangan: `Realisasi Jasa Pinjaman #${p.id.substring(0, 6)} - ${m ? m.nama + ' (' + m.noAnggota + ')' : 'Anggota'}`,
            isAuto: true,
            angsuranId: lastA.id,
            anggotaId: lastA.anggotaId,
            pinjamanId: lastA.pinjamanId,
            rawAngsuran: lastA,
            rawPinjaman: p,
            rawMember: m
          });
        } else {
          repays.forEach(a => {
            const interestAmount = calculateAngsuranInterest(a, p);
            if (interestAmount > 0) {
              list.push({
                id: `jasa-angsuran-${a.id}`,
                tanggal: a.tanggal,
                sumber: 'Pendapatan Jasa Pinjaman (Bunga)',
                sumberKey: 'jasa_pinjaman',
                nominal: interestAmount,
                keterangan: `Jasa Angsuran Ke-${a.bulanKe || 1} - ${m ? m.nama + ' (' + m.noAnggota + ')' : 'Anggota'}`,
                isAuto: true,
                angsuranId: a.id,
                anggotaId: a.anggotaId,
                pinjamanId: a.pinjamanId,
                rawAngsuran: a,
                rawPinjaman: p,
                rawMember: m
              });
            }
          });
        }
      }
    });

    // Account for any standalone / orphan angsurans without matched loan in lookup
    angsuran.forEach(a => {
      if (!a.pinjamanId || !processedLoanIds.has(a.pinjamanId)) {
        const interestAmount = calculateAngsuranInterest(a);
        if (interestAmount > 0) {
          const m = members.find(mem => mem.id === a.anggotaId);
          list.push({
            id: `jasa-angsuran-${a.id}`,
            tanggal: a.tanggal,
            sumber: 'Pendapatan Jasa Pinjaman (Bunga)',
            sumberKey: 'jasa_pinjaman',
            nominal: interestAmount,
            keterangan: `Jasa Angsuran Ke-${a.bulanKe || 1} - ${m ? m.nama + ' (' + m.noAnggota + ')' : 'Anggota'}`,
            isAuto: true,
            angsuranId: a.id,
            anggotaId: a.anggotaId,
            pinjamanId: a.pinjamanId,
            rawAngsuran: a,
            rawMember: m
          });
        }
      }
    });

    return list;
  }, [income, pinjaman, angsuran, members]);

  // List of all unique months extracted from combined income and expenses
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const currentYM = new Date().toISOString().substring(0, 7);
    monthSet.add(currentYM);

    combinedIncomeList.forEach(item => {
      if (item.tanggal && item.tanggal.length >= 7) {
        monthSet.add(item.tanggal.substring(0, 7));
      }
    });

    expenses.forEach(item => {
      if (item.tanggal && item.tanggal.length >= 7) {
        monthSet.add(item.tanggal.substring(0, 7));
      }
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [combinedIncomeList, expenses]);

  // Monthly Net Profit Summaries calculation (Rekapitulasi Laba Bersih Per Bulan)
  const monthlyProfitLossSummaries = useMemo<MonthlyProfitLossSummary[]>(() => {
    return calculateMonthlyProfitLossSummaries(income, expenses, pinjaman, angsuran);
  }, [income, expenses, pinjaman, angsuran]);

  // Financial summary for the currently selected period (month or all-time)
  const currentPeriodSummary = useMemo(() => {
    if (selectedMonthFilter !== 'semua') {
      const found = monthlyProfitLossSummaries.find(s => s.monthKey === selectedMonthFilter);
      if (found) return found;
    }

    // All time aggregate - fully synchronized with monthly summaries
    const totalIncome = monthlyProfitLossSummaries.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalExpense = monthlyProfitLossSummaries.reduce((sum, s) => sum + s.totalExpense, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : (netProfit < 0 ? -100 : 0);
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

    return {
      monthKey: 'semua',
      monthLabel: 'Seluruh Periode (Kumulatif)',
      year: 0,
      monthNum: 0,
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      expenseRatio,
      incomeBreakdown: {
        jasaPinjaman: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.jasaPinjaman, 0),
        provisi: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.provisi, 0),
        warung: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.warung, 0),
        bungaBank: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.bungaBank, 0),
        denda: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.denda, 0),
        lainLain: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.lainLain, 0),
        manual: monthlyProfitLossSummaries.reduce((s, item) => s + item.incomeBreakdown.manual, 0)
      },
      expenseBreakdown: {
        gaji: monthlyProfitLossSummaries.reduce((s, item) => s + item.expenseBreakdown.gaji, 0),
        operasional: monthlyProfitLossSummaries.reduce((s, item) => s + item.expenseBreakdown.operasional, 0),
        listrik: monthlyProfitLossSummaries.reduce((s, item) => s + item.expenseBreakdown.listrik, 0),
        penyusutan: monthlyProfitLossSummaries.reduce((s, item) => s + item.expenseBreakdown.penyusutan, 0),
        lainnya: monthlyProfitLossSummaries.reduce((s, item) => s + item.expenseBreakdown.lainnya, 0)
      },
      incomeCount: combinedIncomeList.length,
      expenseCount: expenses.length
    };
  }, [selectedMonthFilter, monthlyProfitLossSummaries, combinedIncomeList, expenses]);

  // Average monthly net profit
  const averageMonthlyNetProfit = useMemo(() => {
    return calculateAverageMonthlyNetProfit(monthlyProfitLossSummaries);
  }, [monthlyProfitLossSummaries]);

  // Filtered & Sorted Income List
  const filteredIncomeList = useMemo(() => {
    const list = combinedIncomeList.filter(item => {
      // Month filter
      if (selectedMonthFilter !== 'semua') {
        if (!item.tanggal || !item.tanggal.startsWith(selectedMonthFilter)) return false;
      }

      // Tab filter
      if (incomeFilterTab === 'jasa_pinjaman' && item.sumberKey !== 'jasa_pinjaman') return false;
      if (incomeFilterTab === 'provisi' && item.sumberKey !== 'provisi') return false;
      if (incomeFilterTab === 'warung' && item.sumberKey !== 'warung') return false;
      if (incomeFilterTab === 'jurnal_manual' && item.isAuto) return false;

      // Search filter
      if (incomeSearch.trim()) {
        const q = incomeSearch.toLowerCase().trim();
        const matchSumber = item.sumber.toLowerCase().includes(q);
        const matchKet = item.keterangan.toLowerCase().includes(q);
        const matchTanggal = item.tanggal.includes(q);
        const matchNominal = String(item.nominal).includes(q) || formatRupiah(item.nominal).toLowerCase().includes(q);
        if (!matchSumber && !matchKet && !matchTanggal && !matchNominal) return false;
      }

      return true;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (incomeSortBy === 'tanggal_desc') return b.tanggal.localeCompare(a.tanggal);
      if (incomeSortBy === 'tanggal_asc') return a.tanggal.localeCompare(b.tanggal);
      if (incomeSortBy === 'nominal_desc') return b.nominal - a.nominal;
      if (incomeSortBy === 'nominal_asc') return a.nominal - b.nominal;
      if (incomeSortBy === 'sumber_asc') return a.sumber.localeCompare(b.sumber);
      return 0;
    });
  }, [combinedIncomeList, selectedMonthFilter, incomeFilterTab, incomeSearch, incomeSortBy]);

  const totalFilteredIncome = useMemo(() => {
    return filteredIncomeList.reduce((acc, c) => acc + c.nominal, 0);
  }, [filteredIncomeList]);

  // Filtered & Sorted Expenses List
  const filteredExpenses = useMemo(() => {
    const list = expenses.filter(exp => {
      // Month filter
      if (selectedMonthFilter !== 'semua') {
        if (!exp.tanggal || !exp.tanggal.startsWith(selectedMonthFilter)) return false;
      }

      // Filter tab
      if (expenseFilterTab === 'gaji') {
        if (!['gaji_karyawan', 'gaji_pengurus', 'gaji_pengawas'].includes(exp.kategori)) return false;
      } else if (expenseFilterTab === 'operasional') {
        if (!['operasional_kantor', 'beban_rapat'].includes(exp.kategori)) return false;
      } else if (expenseFilterTab === 'listrik') {
        if (!['listrik', 'air', 'pdam'].includes(exp.kategori)) return false;
      } else if (expenseFilterTab === 'penyusutan') {
        if (!['penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(exp.kategori) && !exp.kategori?.toLowerCase().includes('penyusutan')) return false;
      } else if (expenseFilterTab === 'lainnya') {
        if (['gaji_karyawan', 'gaji_pengurus', 'gaji_pengawas', 'operasional_kantor', 'beban_rapat', 'listrik', 'air', 'pdam', 'penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(exp.kategori) || exp.kategori?.toLowerCase().includes('penyusutan')) return false;
      }

      // Search query
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const catLabel = getExpenseCategoryLabel(exp.kategori).toLowerCase();
        const ket = (exp.keterangan || '').toLowerCase();
        const tgl = (exp.tanggal || '').toLowerCase();
        const nomStr = String(exp.nominal);
        const nomFmt = formatRupiah(exp.nominal).toLowerCase();
        return catLabel.includes(q) || ket.includes(q) || tgl.includes(q) || nomStr.includes(q) || nomFmt.includes(q);
      }

      return true;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (expenseSortBy === 'tanggal_desc') return b.tanggal.localeCompare(a.tanggal);
      if (expenseSortBy === 'tanggal_asc') return a.tanggal.localeCompare(b.tanggal);
      if (expenseSortBy === 'nominal_desc') return b.nominal - a.nominal;
      if (expenseSortBy === 'nominal_asc') return a.nominal - b.nominal;
      if (expenseSortBy === 'kategori_asc') return getExpenseCategoryLabel(a.kategori).localeCompare(getExpenseCategoryLabel(b.kategori));
      return 0;
    });
  }, [expenses, selectedMonthFilter, expenseFilterTab, expenseSearch, expenseSortBy]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, c) => acc + c.nominal, 0);
  }, [filteredExpenses]);

  // Form Submissions
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = incAmount.replace(/\D/g, '');
    const val = parseFloat(clean);
    if (isNaN(val) || val <= 0) return;
    onAddIncome({
      tanggal: incDate,
      sumber: incSource,
      nominal: val,
      keterangan: incNotes || `Pendapatan ${getIncomeSourceLabel(incSource)}`
    });
    setIncAmount('');
    setIncNotes('');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = expAmount.replace(/\D/g, '');
    const val = parseFloat(clean);
    if (isNaN(val) || val <= 0) return;
    onAddExpense({
      tanggal: expDate,
      kategori: expCat,
      nominal: val,
      keterangan: expNotes || `Beban ${getExpenseCategoryLabel(expCat)}`
    });
    setExpAmount('');
    setExpNotes('');
  };

  const handleAddCustomIncomeCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = newIncomeCatInput.trim();
    if (!cleanInput) return;
    if (Object.values(standardIncomeSources).some(c => c.toLowerCase() === cleanInput.toLowerCase()) || 
        Object.keys(standardIncomeSources).some(k => k.toLowerCase() === cleanInput.toLowerCase()) ||
        customIncomeCategories.some(c => c.toLowerCase() === cleanInput.toLowerCase())) {
      alert('Sumber pendapatan ini sudah ada!');
      return;
    }
    setCustomIncomeCategories(prev => [...prev, cleanInput]);
    setIncSource(cleanInput);
    setNewIncomeCatInput('');
  };

  const handleDeleteCustomIncomeCategory = (catToDelete: string) => {
    if (window.confirm(`Hapus sumber pendapatan "${catToDelete}"?`)) {
      setCustomIncomeCategories(prev => prev.filter(c => c !== catToDelete));
      if (incSource === catToDelete) {
        setIncSource('warung');
      }
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = newCatInput.trim();
    if (!cleanInput) return;
    if (Object.values(standardExpenseCategories).some(c => c.toLowerCase() === cleanInput.toLowerCase()) || 
        Object.keys(standardExpenseCategories).some(k => k.toLowerCase() === cleanInput.toLowerCase()) ||
        customCategories.some(c => c.toLowerCase() === cleanInput.toLowerCase())) {
      alert('Kategori ini sudah ada!');
      return;
    }
    setCustomCategories(prev => [...prev, cleanInput]);
    setExpCat(cleanInput);
    setNewCatInput('');
  };

  const handleDeleteCustomCategory = (catToDelete: string) => {
    if (window.confirm(`Hapus kategori "${catToDelete}"?`)) {
      setCustomCategories(prev => prev.filter(c => c !== catToDelete));
      if (expCat === catToDelete) {
        setExpCat('gaji_karyawan');
      }
    }
  };

  // Export Monthly Profit Recap to Excel
  const handleExportMonthlyProfitExcel = () => {
    const exportData = monthlyProfitLossSummaries.map((item, idx) => ({
      No: idx + 1,
      "Periode Bulan": item.monthLabel,
      "Kode Periode": item.monthKey,
      "Total Pendapatan (Rp)": item.totalIncome,
      "Jasa Pinjaman (Rp)": item.incomeBreakdown.jasaPinjaman,
      "Provisi Pinjaman (Rp)": item.incomeBreakdown.provisi,
      "Laba Toko/Warung (Rp)": item.incomeBreakdown.warung,
      "Pendapatan Lain (Rp)": item.incomeBreakdown.bungaBank + item.incomeBreakdown.denda + item.incomeBreakdown.lainLain,
      "Total Beban (Rp)": item.totalExpense,
      "Beban Gaji & Honor (Rp)": item.expenseBreakdown.gaji,
      "Beban Operasional & ATK (Rp)": item.expenseBreakdown.operasional,
      "Beban Utilitas & Listrik (Rp)": item.expenseBreakdown.listrik,
      "Beban Penyusutan (Rp)": item.expenseBreakdown.penyusutan,
      "Laba Bersih (Rp)": item.netProfit,
      "Status Kinerja": item.netProfit >= 0 ? "SURPLUS / LABA" : "DEFISIT / RUGI",
      "Margin Laba (%)": `${item.profitMargin.toFixed(1)}%`
    }));

    exportToExcel(
      exportData, 
      "Rekap_Laba_Bersih_Bulanan", 
      `Laporan_Laba_Bersih_Bulanan_${new Date().getFullYear()}`, 
      setup
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Pendapatan, Beban & Laba Bersih
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Penyortiran per bulan, rincian arus kas operasional, dan evaluasi laba rugi bersih koperasi.
              </p>
            </div>
          </div>
        </div>

        {/* Global Month Filter & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-2xs">
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Bulan:</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-2"
            >
              <option value="semua">Semua Bulan (Kumulatif)</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  {formatYearMonthIndo(ym)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Clear Filter if specific month is active */}
          {selectedMonthFilter !== 'semua' && (
            <button
              type="button"
              onClick={() => setSelectedMonthFilter('semua')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
              title="Reset ke semua bulan"
            >
              ✕ Reset Bulan
            </button>
          )}

          {/* Export Monthly Recap to Excel Button */}
          <button
            type="button"
            onClick={handleExportMonthlyProfitExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
            title="Download Rekapitulasi Laba Rugi Bulanan ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel Rekap</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards for Selected Month / All-time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Pendapatan
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-2">
            {formatRupiah(currentPeriodSummary.totalIncome)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2">
            <span>Periode: <strong className="text-slate-700 dark:text-slate-300">{currentPeriodSummary.monthLabel}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentPeriodSummary.incomeCount} item</span>
          </div>
        </div>

        {/* Total Beban Penyaluran */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Beban
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
            {formatRupiah(currentPeriodSummary.totalExpense)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2">
            <span>Rasio Beban: <strong className="text-rose-600 dark:text-rose-400">{currentPeriodSummary.expenseRatio.toFixed(1)}%</strong></span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{currentPeriodSummary.expenseCount} item</span>
          </div>
        </div>

        {/* Laba Bersih (Net Profit) - Highlighted */}
        <div className={`p-5 rounded-2xl border shadow-2xs relative overflow-hidden ${
          currentPeriodSummary.netProfit >= 0
            ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-800'
            : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-300 dark:border-rose-700/80 bg-white dark:bg-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className={`w-3.5 h-3.5 ${currentPeriodSummary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
              {selectedMonthFilter === 'semua' ? 'Laba Bersih Kumulatif' : 'Laba Bersih Bulan Ini'}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
              currentPeriodSummary.netProfit >= 0
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            }`}>
              {currentPeriodSummary.netProfit >= 0 ? 'Surplus Laba' : 'Defisit'}
            </span>
          </div>
          <h3 className={`text-2xl font-bold font-mono mt-2 ${
            currentPeriodSummary.netProfit >= 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatRupiah(currentPeriodSummary.netProfit)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2">
            <span>Margin Laba:</span>
            <strong className={`font-semibold ${
              currentPeriodSummary.netProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {currentPeriodSummary.profitMargin >= 0 ? '+' : ''}{currentPeriodSummary.profitMargin.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Rata-Rata Laba Bersih per Bulan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rata-Rata Laba Bulanan
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold font-mono mt-2 ${
            averageMonthlyNetProfit >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatRupiah(averageMonthlyNetProfit)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2">
            <span>Berdasarkan {monthlyProfitLossSummaries.length} Periode Bulan</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Aktif</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation between Monthly Recap vs Journal Entries */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTabSection('jurnal_transaksi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTabSection === 'jurnal_transaksi'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Buku Jurnal & Rincian Transaksi</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTabSection === 'jurnal_transaksi' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {filteredIncomeList.length + filteredExpenses.length} Data
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('rekap_laba')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTabSection === 'rekap_laba'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rekapitulasi Laba Bersih Per Bulan</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTabSection === 'rekap_laba' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {monthlyProfitLossSummaries.length} Bulan
            </span>
          </button>
        </div>

        {/* Indicator if filtering a specific month */}
        {selectedMonthFilter !== 'semua' && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3.5 h-3.5" />
            <span>Filter Aktif: {formatYearMonthIndo(selectedMonthFilter)}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: REKAPITULASI LABA BERSIH PER BULAN */}
      {activeTabSection === 'rekap_laba' && (
        <div className="space-y-6">
          {/* 📊 GRAFIK BATANG RECHARTS TREN PENDAPATAN & BEBAN BULANAN (ANALISIS LABA RUGI) */}
          <PortalGrafikLabaBulanan
            income={income}
            expenses={expenses}
            pinjaman={pinjaman}
            angsuran={angsuran}
            namaKoperasi={setup?.namaKoperasi || "Koperasi Dana Segar"}
          />

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Daftar Perbandingan Laba Bersih Per Bulan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ringkasan akumulasi pendapatan, beban, dan perolehan laba operasional bulanan koperasi.
                </p>
              </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMonthlyProfitExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/70 dark:bg-slate-900/90 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Periode Bulan</th>
                  <th className="px-4 py-3">Total Pendapatan</th>
                  <th className="px-4 py-3">Total Beban</th>
                  <th className="px-4 py-3">Laba Bersih (Net Profit)</th>
                  <th className="px-4 py-3">Margin Laba</th>
                  <th className="px-4 py-3">Rasio Beban/Pendapatan</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {monthlyProfitLossSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                      Belum ada catatan pendapatan atau beban untuk dihitung.
                    </td>
                  </tr>
                ) : (
                  monthlyProfitLossSummaries.map((month) => {
                    const isSelected = selectedMonthFilter === month.monthKey;
                    const isSurplus = month.netProfit >= 0;

                    return (
                      <tr 
                        key={month.monthKey}
                        className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-700/30 ${
                          isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/30 font-medium' : ''
                        }`}
                      >
                        {/* Periode Bulan */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {month.monthLabel}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                                Terpilih
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {month.incomeCount} trx pendapatan • {month.expenseCount} trx beban
                          </span>
                        </td>

                        {/* Total Pendapatan */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                            {formatRupiah(month.totalIncome)}
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 mt-0.5">
                            {month.incomeBreakdown.jasaPinjaman > 0 && (
                              <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-1.5 py-0.2 rounded">
                                Jasa: {formatRupiah(month.incomeBreakdown.jasaPinjaman)}
                              </span>
                            )}
                            {month.incomeBreakdown.provisi > 0 && (
                              <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded">
                                Provisi: {formatRupiah(month.incomeBreakdown.provisi)}
                              </span>
                            )}
                            {month.incomeBreakdown.warung > 0 && (
                              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                                Toko: {formatRupiah(month.incomeBreakdown.warung)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Beban */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold font-mono text-rose-600 dark:text-rose-400">
                            {formatRupiah(month.totalExpense)}
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 mt-0.5">
                            {month.expenseBreakdown.gaji > 0 && (
                              <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded">
                                Gaji: {formatRupiah(month.expenseBreakdown.gaji)}
                              </span>
                            )}
                            {month.expenseBreakdown.operasional > 0 && (
                              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded">
                                Ops: {formatRupiah(month.expenseBreakdown.operasional)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Laba Bersih */}
                        <td className="px-4 py-3.5">
                          <div className={`font-bold font-mono text-base ${
                            isSurplus ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {formatRupiah(month.netProfit)}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 border ${
                            isSurplus 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}>
                            {isSurplus ? '✓ Surplus Laba' : '⚠ Defisit Rugi'}
                          </span>
                        </td>

                        {/* Margin Laba */}
                        <td className="px-4 py-3.5">
                          <div className={`font-bold ${isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {month.profitMargin >= 0 ? '+' : ''}{month.profitMargin.toFixed(1)}%
                          </div>
                          <span className="text-[10px] text-slate-400">
                            dari total pendapatan
                          </span>
                        </td>

                        {/* Rasio Bar */}
                        <td className="px-4 py-3.5 min-w-[140px]">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                            {month.totalIncome > 0 ? (
                              <>
                                <div 
                                  className="bg-emerald-500 h-full" 
                                  style={{ width: `${Math.min(100, Math.max(0, month.profitMargin))}%` }}
                                  title={`Laba: ${month.profitMargin.toFixed(1)}%`}
                                />
                                <div 
                                  className="bg-rose-500 h-full" 
                                  style={{ width: `${Math.min(100, month.expenseRatio)}%` }}
                                  title={`Beban: ${month.expenseRatio.toFixed(1)}%`}
                                />
                              </>
                            ) : (
                              <div className="bg-slate-400 h-full w-full opacity-30" />
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Laba {Math.max(0, month.profitMargin).toFixed(0)}%</span>
                            <span>Beban {month.expenseRatio.toFixed(0)}%</span>
                          </div>
                        </td>

                        {/* Aksi Cepat */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonthFilter(month.monthKey);
                              setActiveTabSection('jurnal_transaksi');
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-2xs"
                          >
                            Buka Transaksi →
                          </button>
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

      {/* Forms Section: Catat Pendapatan & Beban */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Pendapatan */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><TrendingUp className="w-5 h-5"/></span>
            Catat Pendapatan Non-Operasional / Toko
          </h3>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sumber Pendapatan</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value)}
                >
                  <optgroup label="Sumber Default">
                    <option value="warung">Laba Warung Toko</option>
                    <option value="jasa_pinjaman">Pendapatan Jasa Pinjaman (Bunga)</option>
                    <option value="provisi">Pendapatan Biaya Provisi Pinjaman</option>
                    <option value="bunga_simpanan">Bunga Simpanan Bank</option>
                    <option value="denda">Uang Denda Keterlambatan</option>
                    <option value="lain_lain">Pendapatan Lain-lain</option>
                  </optgroup>
                  {customIncomeCategories.length > 0 && (
                    <optgroup label="Sumber Pendapatan Custom">
                      {customIncomeCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nominal Pendapatan (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-medium">Rp</span>
                <input 
                  type="text"
                  placeholder="Contoh: 1.500.000"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                  value={incAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setIncAmount(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
                  }}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keterangan Tambahan</label>
              <textarea 
                placeholder="Deskripsi peroleh atau transaksi kas..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                value={incNotes}
                onChange={(e) => setIncNotes(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4"/> Catat Pendapatan
            </button>

            {/* Kelola Sumber Pendapatan Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-750 mt-4">
              <button
                type="button"
                onClick={() => setShowManageIncomeCats(!showManageIncomeCats)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                {showManageIncomeCats ? "Sembunyikan Pengelola Sumber" : "Kelola / Tambah Sumber Pendapatan Custom Baru"}
              </button>
              
              {showManageIncomeCats && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    Daftar Sumber Pendapatan Custom Anda
                  </div>
                  
                  {customIncomeCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada sumber pendapatan custom tambahan.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {customIncomeCategories.map((cat) => (
                        <span 
                          key={cat} 
                          className="inline-flex items-center gap-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomIncomeCategory(cat)}
                            className="text-slate-400 hover:text-rose-600 font-bold text-[10px] ml-1.5 cursor-pointer"
                            title="Hapus Sumber Pendapatan"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nama sumber pendapatan baru..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      value={newIncomeCatInput}
                      onChange={(e) => setNewIncomeCatInput(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={handleAddCustomIncomeCategory}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Input Beban */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <span className="p-2 bg-rose-50 dark:bg-rose-900/40 text-rose-700 rounded-lg"><TrendingDown className="w-5 h-5"/></span>
            Catat Beban Penyaluran Operasional
          </h3>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kategori Beban</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  value={expCat}
                  onChange={(e) => setExpCat(e.target.value)}
                >
                  <optgroup label="Kategori Standar">
                    <option value="gaji_karyawan">Beban Gaji Karyawan</option>
                    <option value="listrik">Beban Listrik & PDAM</option>
                    <option value="gaji_pengurus">Honor Pengurus</option>
                    <option value="gaji_pengawas">Honor Pengawas</option>
                    <option value="operasional_kantor">Beban Operasional Kantor / ATK</option>
                    <option value="beban_rapat">Beban Rapat</option>
                    <option value="penyusutan_inventaris">Beban Penyusutan Aktiva Tetap (Inventaris)</option>
                    <option value="beban_lain">Kategori Beban Lainnya</option>
                  </optgroup>
                  {customCategories.length > 0 && (
                    <optgroup label="Kategori Custom Tambahan">
                      {customCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nominal Beban (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-medium">Rp</span>
                <input 
                  type="text"
                  placeholder="Contoh: 750.000"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                  value={expAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setExpAmount(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
                  }}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keterangan Tambahan</label>
              <textarea 
                placeholder="Rincian penggunaan dana / pengeluaran..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                value={expNotes}
                onChange={(e) => setExpNotes(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4"/> Catat Beban Penyaluran
            </button>

            {/* Kelola Kategori Custom Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-750 mt-4">
              <button
                type="button"
                onClick={() => setShowManageCats(!showManageCats)}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                {showManageCats ? "Sembunyikan Pengelola Kategori" : "Kelola / Tambah Kategori Beban Custom Baru"}
              </button>
              
              {showManageCats && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    Daftar Kategori Beban Custom Anda
                  </div>
                  
                  {customCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada kategori custom tambahan.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {customCategories.map((cat) => (
                        <span 
                          key={cat} 
                          className="inline-flex items-center gap-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomCategory(cat)}
                            className="text-slate-400 hover:text-rose-600 font-bold text-[10px] ml-1.5 cursor-pointer"
                            title="Hapus Kategori"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nama kategori beban baru..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* SECTION 2: TABULAR RECORDS WITH MONTHLY SORTING & FILTERING */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Income Log Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600"/> Historis Pendapatan Koperasi
              </h4>
              <p className="text-[11px] text-slate-450 mt-0.5">
                {selectedMonthFilter === 'semua' 
                  ? 'Akumulasi seluruh pendapatan koperasi (semua periode)' 
                  : `Filter bulan: ${formatYearMonthIndo(selectedMonthFilter)}`}
              </p>
            </div>
            <span className="text-xs text-white bg-emerald-700 px-3 py-1 rounded-full font-medium self-start sm:self-auto shadow-xs whitespace-nowrap">
              Tot: {formatRupiah(totalFilteredIncome)}
            </span>
          </div>

          {/* Quick Filter, Sorter & Search Bar */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setIncomeFilterTab('semua')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  incomeFilterTab === 'semua'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setIncomeFilterTab('jasa_pinjaman')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  incomeFilterTab === 'jasa_pinjaman'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                }`}
              >
                Jasa Pinjaman
              </button>
              <button
                type="button"
                onClick={() => setIncomeFilterTab('provisi')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  incomeFilterTab === 'provisi'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                }`}
              >
                Provisi
              </button>
              <button
                type="button"
                onClick={() => setIncomeFilterTab('warung')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  incomeFilterTab === 'warung'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                }`}
              >
                Laba Toko
              </button>
              <button
                type="button"
                onClick={() => setIncomeFilterTab('jurnal_manual')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  incomeFilterTab === 'jurnal_manual'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Sorting Dropdown & Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sorter Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={incomeSortBy}
                  onChange={(e) => setIncomeSortBy(e.target.value as any)}
                  className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  title="Urutkan daftar pendapatan"
                >
                  <option value="tanggal_desc">📅 Tanggal Terbaru</option>
                  <option value="tanggal_asc">📅 Tanggal Terlama</option>
                  <option value="nominal_desc">💰 Nominal Tertinggi</option>
                  <option value="nominal_asc">💰 Nominal Terendah</option>
                  <option value="sumber_asc">🏷️ Sumber (A-Z)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:w-36">
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  className="w-full px-2.5 py-1 pl-7 text-[11px] bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 placeholder:text-slate-400"
                />
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 z-10 shadow-xs">
                <tr>
                  <th 
                    className="px-3.5 py-2.5 cursor-pointer hover:text-emerald-600 transition"
                    onClick={() => setIncomeSortBy(prev => prev === 'tanggal_desc' ? 'tanggal_asc' : 'tanggal_desc')}
                    title="Klik untuk mengubah urutan tanggal"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tanggal</span>
                      {incomeSortBy === 'tanggal_desc' ? <ArrowDown className="w-3 h-3 text-emerald-600" /> : incomeSortBy === 'tanggal_asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Sumber</th>
                  <th 
                    className="px-3.5 py-2.5 cursor-pointer hover:text-emerald-600 transition"
                    onClick={() => setIncomeSortBy(prev => prev === 'nominal_desc' ? 'nominal_asc' : 'nominal_desc')}
                    title="Klik untuk mengubah urutan nominal"
                  >
                    <div className="flex items-center gap-1">
                      <span>Jumlah</span>
                      {incomeSortBy === 'nominal_desc' ? <ArrowDown className="w-3 h-3 text-emerald-600" /> : incomeSortBy === 'nominal_asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Ket</th>
                  <th className="px-3.5 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 font-mono">
                {filteredIncomeList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                      {incomeSearch || selectedMonthFilter !== 'semua' ? 'Tidak ada pendapatan yang sesuai dengan filter/pencarian' : 'Belum ada data pendapatan'}
                    </td>
                  </tr>
                ) : (
                  filteredIncomeList.map((inc) => {
                    let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
                    if (inc.sumberKey === 'jasa_pinjaman') {
                      badgeClass = "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800";
                    } else if (inc.sumberKey === 'provisi') {
                      badgeClass = "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
                    } else if (inc.sumberKey === 'warung') {
                      badgeClass = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                    } else if (inc.sumberKey === 'bunga_simpanan') {
                      badgeClass = "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
                    } else if (inc.sumberKey === 'denda') {
                      badgeClass = "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                    }

                    return (
                      <tr key={inc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/35 transition">
                        <td className="px-3.5 py-2.5 text-xs whitespace-nowrap">{inc.tanggal}</td>
                        <td className="px-3.5 py-2.5 text-xs">
                          {inc.sumberKey === 'jasa_pinjaman' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToAngsuran) {
                                  onNavigateToAngsuran(inc.angsuranId, inc.anggotaId, inc.rawMember?.nama || inc.rawAngsuran?.id);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold rounded-md border ${badgeClass} hover:opacity-85 hover:scale-[1.02] cursor-pointer transition shadow-2xs group text-left`}
                              title="Klik untuk membuka data transaksi angsuran ini di Kas Masuk"
                            >
                              <span>{inc.sumber}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                            </button>
                          ) : inc.sumberKey === 'provisi' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToPinjaman) {
                                  onNavigateToPinjaman(inc.pinjamanId, inc.anggotaId);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold rounded-md border ${badgeClass} hover:opacity-85 hover:scale-[1.02] cursor-pointer transition shadow-2xs group text-left`}
                              title="Klik untuk membuka data pinjaman ini"
                            >
                              <span>{inc.sumber}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                            </button>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-sans font-semibold rounded-md border ${badgeClass}`}>
                              {inc.sumber}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {formatRupiah(inc.nominal)}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs max-w-[170px] truncate" title={inc.keterangan}>
                          {inc.sumberKey === 'jasa_pinjaman' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToAngsuran) {
                                  onNavigateToAngsuran(inc.angsuranId, inc.anggotaId, inc.rawMember?.nama || inc.rawAngsuran?.id);
                                }
                              }}
                              className="font-sans text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:underline cursor-pointer truncate text-left block w-full"
                              title="Buka rincian angsuran di Kas Masuk"
                            >
                              {inc.keterangan}
                            </button>
                          ) : inc.sumberKey === 'provisi' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToPinjaman) {
                                  onNavigateToPinjaman(inc.pinjamanId, inc.anggotaId);
                                }
                              }}
                              className="font-sans text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-400 hover:underline cursor-pointer truncate text-left block w-full"
                              title="Buka rincian pinjaman"
                            >
                              {inc.keterangan}
                            </button>
                          ) : (
                            <span className="font-sans text-slate-600 dark:text-slate-300">{inc.keterangan}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {inc.isAuto ? (
                            inc.sumberKey === 'jasa_pinjaman' ? (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (onNavigateToAngsuran) {
                                    onNavigateToAngsuran(inc.angsuranId, inc.anggotaId, inc.rawMember?.nama || inc.rawAngsuran?.id);
                                  }
                                }}
                                className="px-2 py-0.5 text-[10px] font-sans text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 border border-teal-200 dark:border-teal-800 rounded font-bold transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs"
                                title="Buka data transaksi angsuran di Kas Masuk"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Buka
                              </button>
                            ) : inc.sumberKey === 'provisi' ? (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (onNavigateToPinjaman) {
                                    onNavigateToPinjaman(inc.pinjamanId, inc.anggotaId);
                                  }
                                }}
                                className="px-2 py-0.5 text-[10px] font-sans text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded font-bold transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs"
                                title="Buka data pinjaman"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Pinjaman
                              </button>
                            ) : (
                              <span 
                                className="text-[10px] font-sans text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-none"
                                title="Dihitung otomatis dari transaksi simpan pinjam / angsuran koperasi"
                              >
                                Auto
                              </span>
                            )
                          ) : (
                            <button 
                              onClick={() => {
                                if (inc.rawId && window.confirm('Yakin ingin menghapus catatan pendapatan ini?')) {
                                  onDeleteIncome(inc.rawId);
                                }
                              }}
                              className="p-1 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                              title="Hapus Jurnal Pendapatan"
                            >
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Log Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600"/> Historis Penyaluran Beban
              </h4>
              <p className="text-[11px] text-slate-450 mt-0.5">
                {selectedMonthFilter === 'semua' 
                  ? 'Catatan beban operasional, gaji, listrik, dan pemeliharaan (semua periode)' 
                  : `Filter bulan: ${formatYearMonthIndo(selectedMonthFilter)}`}
              </p>
            </div>
            <span className="text-xs text-white bg-rose-600 px-3 py-1 rounded-full font-medium self-start sm:self-auto shadow-xs whitespace-nowrap">
              Tot: {formatRupiah(totalFilteredExpenses)}
            </span>
          </div>

          {/* Quick Filter, Sorter & Search Bar */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setExpenseFilterTab('semua')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  expenseFilterTab === 'semua'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilterTab('gaji')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  expenseFilterTab === 'gaji'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-slate-200 dark:border-slate-700 hover:bg-rose-50'
                }`}
              >
                Gaji/Honor
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilterTab('operasional')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  expenseFilterTab === 'operasional'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50'
                }`}
              >
                Operasional
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilterTab('penyusutan')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                  expenseFilterTab === 'penyusutan'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-700 hover:bg-purple-50'
                }`}
              >
                Penyusutan
              </button>
            </div>

            {/* Sorting Dropdown & Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sorter Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={expenseSortBy}
                  onChange={(e) => setExpenseSortBy(e.target.value as any)}
                  className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  title="Urutkan daftar beban"
                >
                  <option value="tanggal_desc">📅 Tanggal Terbaru</option>
                  <option value="tanggal_asc">📅 Tanggal Terlama</option>
                  <option value="nominal_desc">💰 Nominal Tertinggi</option>
                  <option value="nominal_asc">💰 Nominal Terendah</option>
                  <option value="kategori_asc">🏷️ Kategori (A-Z)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:w-40">
                <input
                  type="text"
                  placeholder="Cari transaksi beban..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full px-2.5 py-1 pl-7 pr-6 text-[11px] bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:outline-rose-500"
                />
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                {expenseSearch && (
                  <button
                    type="button"
                    onClick={() => setExpenseSearch('')}
                    className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 z-10 shadow-xs">
                <tr>
                  <th 
                    className="px-3.5 py-2.5 cursor-pointer hover:text-rose-600 transition"
                    onClick={() => setExpenseSortBy(prev => prev === 'tanggal_desc' ? 'tanggal_asc' : 'tanggal_desc')}
                    title="Klik untuk mengubah urutan tanggal"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tanggal</span>
                      {expenseSortBy === 'tanggal_desc' ? <ArrowDown className="w-3 h-3 text-rose-600" /> : expenseSortBy === 'tanggal_asc' ? <ArrowUp className="w-3 h-3 text-rose-600" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Kategori</th>
                  <th 
                    className="px-3.5 py-2.5 cursor-pointer hover:text-rose-600 transition"
                    onClick={() => setExpenseSortBy(prev => prev === 'nominal_desc' ? 'nominal_asc' : 'nominal_desc')}
                    title="Klik untuk mengubah urutan nominal"
                  >
                    <div className="flex items-center gap-1">
                      <span>Jumlah</span>
                      {expenseSortBy === 'nominal_desc' ? <ArrowDown className="w-3 h-3 text-rose-600" /> : expenseSortBy === 'nominal_asc' ? <ArrowUp className="w-3 h-3 text-rose-600" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </div>
                  </th>
                  <th className="px-3.5 py-2.5">Ket</th>
                  <th className="px-3.5 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                      {expenseSearch || expenseFilterTab !== 'semua' || selectedMonthFilter !== 'semua' ? 'Tidak ada transaksi beban yang sesuai filter/pencarian' : 'Belum ada beban dikeluarkan'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/35 transition">
                      <td className="px-3.5 py-2.5 text-xs whitespace-nowrap">{exp.tanggal}</td>
                      <td className="px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-sans font-semibold rounded-md border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800">
                          {getExpenseCategoryLabel(exp.kategori)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {formatRupiah(exp.nominal)}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs max-w-[150px] truncate" title={exp.keterangan}>
                        {exp.keterangan}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button 
                          onClick={() => {
                            if(window.confirm('Yakin ingin menghapus beban ini?')) onDeleteExpense(exp.id);
                          }}
                          className="p-1 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                          title="Hapus Jurnal Beban"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
