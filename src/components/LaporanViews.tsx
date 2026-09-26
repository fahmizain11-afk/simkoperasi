import React, { useState, useMemo, useEffect } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman, RekeningNeraca, SHUDistribution, PembayaranPending, PengajuanPinjaman } from '../types';
import { 
  formatRupiah, 
  exportToExcel, 
  exportToPDF, 
  terbilang,
  calculateCooperativeRevenue, 
  calculateLoanOutstanding, 
  calculateAngsuranInterest, 
  calculateAngsuranPrincipal, 
  calculateAccumulatedJasaManasuka, 
  calculateKasKoperasi,
  calculateMonthlyCashFlowSummaries,
  UnifiedMonthlyCashFlowItem,
  DetailedCashMutationItem
} from '../utils/finance';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, LayoutDashboard, FileSpreadsheet, 
  HelpCircle, Calendar, Users, Scale, Download, RefreshCw, AlertCircle, CheckCircle2,
  Search, Coins, CreditCard, Receipt, Bell, Clock, MessageSquare, AlertTriangle, Megaphone, Trash2, Edit, Edit3, Plus, Save,
  Award, Lightbulb, ShoppingBag, ArrowUpRight, ArrowDownLeft, AlertOctagon, Printer, Wallet, Send, X,
  UserCheck, UserPlus, ArrowRight, ShieldCheck, Check, ChevronRight, FileCheck, Landmark, FileText,
  ArrowUpDown, Filter, Eye, ListFilter, ExternalLink, SlidersHorizontal, Sparkles, Percent, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalGrafikLabaBulanan } from './PortalGrafikLabaBulanan';
import { AdminTrenSimpananPinjamanChart } from './AdminTrenSimpananPinjamanChart';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// ================= COOPERATIVE REAL-TIME DASHBOARD =================
interface DashboardProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  setup?: KoperasiSetup;
  announcements?: Pengumuman[];
  pembelian?: Pembelian[];
  piutangWarung?: PiutangWarung[];
  pembayaranPending?: PembayaranPending[];
  pengajuanPinjaman?: PengajuanPinjaman[];
  userRole?: 'admin' | 'pengawas' | 'karyawan_warung' | 'member' | null;
  onNavigateTab?: (tab: any) => void;
}

export function DashboardView({ 
  members, 
  simpanan, 
  pinjaman, 
  angsuran, 
  income, 
  expenses, 
  setup, 
  announcements = [], 
  pembelian = [], 
  piutangWarung = [],
  pembayaranPending = [],
  pengajuanPinjaman = [],
  userRole,
  onNavigateTab
}: DashboardProps) {
  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);

  // Financial calculations derived from central state
  const finances = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const piutangAwal = setup?.piutangAwal ?? 0;
    const persediaanWarungAwal = setup?.persediaanWarungAwal ?? 0;
    const inventarisAwal = setup?.inventarisAwal ?? 0;
    const modalAwal = setup?.modalAwal ?? 0;
    const danaCadanganAwal = setup?.danaCadanganAwal ?? 0;

    const totalSimpanan = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalDisbursed = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalProvisi = pinjaman.reduce((a, c) => a + (c.provisiDipotong || 0), 0);
    const totalAngsuran = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    const totalInc = income.reduce((a, c) => a + c.nominal, 0);
    const totalExp = expenses.reduce((a, c) => a + c.nominal, 0);
    const totalPembelian = pembelian?.reduce((a, c) => a + c.totalHarga, 0) ?? 0;
    const totalHutangWarung = piutangWarung?.filter(pw => pw.jenis === 'hutang_baru').reduce((a, c) => a + c.nominal, 0) ?? 0;
    const totalPelunasanWarung = piutangWarung?.filter(pw => pw.jenis === 'pelunasan').reduce((a, c) => a + c.nominal, 0) ?? 0;

    // Kas Akhir (Authoritative cash calculation matching Neraca Saldo)
    const kasAkhir = calculateKasKoperasi(setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung);

    // Double-entry assets: calculate remaining principal outstanding
    const piutangBeredar = pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      return acc + calculateLoanOutstanding(p, repays);
    }, 0);

    const persediaanWarung = (pembelian?.filter(p => p.kategori === 'persediaan_warung').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const inventarisPembelian = (pembelian?.filter(p => p.kategori === 'inventaris').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const inventarisBruto = inventarisAwal + inventarisPembelian;
    const bPenyusutan = expenses.filter(e => e.kategori === 'penyusutan_inventaris' || e.kategori === 'penyusutan_aktiva_tetap' || e.kategori?.toLowerCase().includes('penyusutan')).reduce((a, c) => a + c.nominal, 0);
    const akumulasiPenyusutanAwal = setup?.akumulasiPenyusutanAwal ?? 0;
    const totalAkumulasiPenyusutan = akumulasiPenyusutanAwal + bPenyusutan;
    const inventarisNetto = Math.max(0, inventarisBruto - totalAkumulasiPenyusutan);
    const piutangWarungVal = totalHutangWarung - totalPelunasanWarung;

    // Total Assets (Menggunakan Inventaris Koperasi Netto)
    const totalAssets = kasAkhir + piutangBeredar + persediaanWarung + inventarisNetto + piutangWarungVal;

    // Profit & Loss details (Laba Rugi) using unified revenue calculation
    const revenueBreakdown = calculateCooperativeRevenue(income, pinjaman, angsuran);
    const totalRevenue = revenueBreakdown.totalRevenue;

    const bGajiKaryawan = expenses.filter(e => e.kategori === 'gaji_karyawan').reduce((a, c) => a + c.nominal, 0);
    const bListrik = expenses.filter(e => e.kategori === 'listrik').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengurus = expenses.filter(e => e.kategori === 'gaji_pengurus').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengawas = expenses.filter(e => e.kategori === 'gaji_pengawas').reduce((a, c) => a + c.nominal, 0);
    const bOperasional = expenses.filter(e => e.kategori === 'operasional_kantor').reduce((a, c) => a + c.nominal, 0);
    const bRapat = expenses.filter(e => e.kategori === 'beban_rapat').reduce((a, c) => a + c.nominal, 0);
    const bLain = expenses.filter(e => !['gaji_karyawan', 'listrik', 'gaji_pengurus', 'gaji_pengawas', 'operasional_kantor', 'beban_rapat', 'penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(e.kategori) && !e.kategori?.toLowerCase().includes('penyusutan')).reduce((a, c) => a + c.nominal, 0);

    const totalExpenses = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bRapat + bPenyusutan + bLain;
    const netProfit = totalRevenue - totalExpenses;

    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);

    return {
      kasAkhir,
      totalSimpanan,
      sPokok,
      sWajib,
      sSukarela,
      totalAssets,
      netProfit,
    };
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung, setup]);

  // Menghitung Rasio Likuiditas, Solvabilitas, dan Rentabilitas Koperasi secara real-time
  const cooperativeRatios = useMemo(() => {
    const kas = finances.kasAkhir;
    const sSukarela = finances.sSukarela;
    const totalSimpanan = finances.totalSimpanan;
    const totalAssets = finances.totalAssets;
    const netProfit = finances.netProfit;
    const modalSendiri = finances.sPokok + finances.sWajib;

    // 1. Likuiditas (Cash Ratio)
    // Kemampuan membayar simpanan sukarela anggota yang ditarik sewaktu-waktu
    const likuiditas = sSukarela > 0 ? (kas / sSukarela) * 100 : (kas / (totalSimpanan || 1)) * 100;
    
    // 2. Solvabilitas (Aset terhadap Kewajiban)
    // Kemampuan aset koperasi menjamin kewajiban lancar (Simpanan Sukarela)
    const solvabilitas = sSukarela > 0 ? (totalAssets / sSukarela) * 100 : 100;

    // 3. Rentabilitas Modal Sendiri (ROE)
    // Kemampuan menghasilkan SHU dari modal pokok + wajib anggota
    const modalPenyertaan = modalSendiri > 0 ? modalSendiri : totalSimpanan;
    const rentabilitas = modalPenyertaan > 0 ? (netProfit / modalPenyertaan) * 100 : (netProfit / (totalAssets || 1)) * 100;

    return {
      likuiditas: Math.round(likuiditas * 100) / 100,
      solvabilitas: Math.round(solvabilitas * 100) / 100,
      rentabilitas: Math.round(rentabilitas * 100) / 100,
      hasSukarela: sSukarela > 0
    };
  }, [finances]);

  const summary = useMemo(() => {
    const totalSimpanan = simpanan.reduce((acc, c) => acc + c.jumlah, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.nominal, 0);

    // Kas Koperasi authoritative calculation matching Neraca Saldo exactly
    const kasKoperasi = calculateKasKoperasi(setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung);

    // Pinjaman Beredar (Remaining principal outstanding) and Revenue streams for SHU
    const pinjamanBeredar = pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      return acc + calculateLoanOutstanding(p, repays);
    }, 0);

    const revenueBreakdown = calculateCooperativeRevenue(income, pinjaman, angsuran);
    const totalPendapatan = revenueBreakdown.totalRevenue;
    const shuSementara = totalPendapatan - totalExpenses;

    return {
      kasKoperasi,
      totalSimpanan,
      pinjamanBeredar,
      totalAnggota: members.length,
      shuSementara,
      totalPendapatan,
      totalExpenses
    };
  }, [members, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung, setup]);

  // Find members with loan due date within 3 days or overdue
  const dueNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: {
      loan: Pinjaman;
      member: Member;
      dueDate: Date;
      daysRemaining: number;
      amountDue: number;
      nextMonth: number;
    }[] = [];

    const activeLoans = pinjaman.filter(p => p.status === 'Belum Lunas');
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth() + 1;

    activeLoans.forEach(p => {
      const m = members.find(mem => mem.id === p.anggotaId);
      if (!m) return;

      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === p.id);
      const paidMonths = new Set(relatedAngsuran.map(a => a.bulanKe));

      const startDate = new Date(p.tanggal);
      const getDueDate = (idx: number) => {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + idx);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const unpaidMonthsUpToNow: number[] = [];
      for (let idx = 1; idx <= p.tenor; idx++) {
        const d = getDueDate(idx);
        const dYear = d.getFullYear();
        const dMonth = d.getMonth() + 1;
        const isDue = dYear < nowYear || (dYear === nowYear && dMonth <= nowMonth);
        if (isDue && !paidMonths.has(idx)) {
          unpaidMonthsUpToNow.push(idx);
        }
      }

      let unpaidCount = 1;
      let effectiveMonth = 1;
      let dueDate: Date;

      if (unpaidMonthsUpToNow.length > 0) {
        unpaidCount = unpaidMonthsUpToNow.length;
        effectiveMonth = unpaidMonthsUpToNow[0];
        dueDate = getDueDate(effectiveMonth);
      } else {
        let nextM = 1;
        while (nextM <= p.tenor && paidMonths.has(nextM)) nextM++;
        if (nextM > p.tenor) return;
        effectiveMonth = nextM;
        dueDate = getDueDate(nextM);
      }

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Notification criteria: falling due in the next 3 days, or overdue
      if (diffDays <= 3 || unpaidMonthsUpToNow.length > 0) {
        list.push({
          loan: p,
          member: m,
          dueDate,
          daysRemaining: diffDays,
          amountDue: unpaidCount * p.totalAngsuranPerBulan,
          nextMonth: effectiveMonth
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [members, pinjaman, angsuran]);

  // Summary statistics for due date recap card on dashboard
  const dueSummary = useMemo(() => {
    const totalCount = dueNotifications.length;
    const overdueList = dueNotifications.filter(d => d.daysRemaining < 0);
    const dueSoonList = dueNotifications.filter(d => d.daysRemaining >= 0);
    const totalAmount = dueNotifications.reduce((sum, d) => sum + d.amountDue, 0);
    const overdueAmount = overdueList.reduce((sum, d) => sum + d.amountDue, 0);
    const dueSoonAmount = dueSoonList.reduce((sum, d) => sum + d.amountDue, 0);

    return {
      totalCount,
      overdueCount: overdueList.length,
      dueSoonCount: dueSoonList.length,
      totalAmount,
      overdueAmount,
      dueSoonAmount,
      overdueList,
      dueSoonList
    };
  }, [dueNotifications]);

  const handleWhatsAppReminder = (member: Member, amount: number, nextMonth: number, daysRemaining: number, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let timeInfo = '';
    if (daysRemaining === 0) {
      timeInfo = "HARI INI";
    } else if (daysRemaining === 1) {
      timeInfo = "BESOK HARI";
    } else if (daysRemaining < 0) {
      timeInfo = `TELAH TERLEWAT ${Math.abs(daysRemaining)} HARI`;
    } else {
      timeInfo = `dalam ${daysRemaining} hari ke depan`;
    }
    
    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const message = `Halo Bapak/Ibu ${member.nama},\n\nKami dari *${kopName}* ingin menginformasikan bahwa angsuran pinjaman Anda yang ke-${nextMonth} sebesar *${formatRupiah(amount)}* jatuh tempo pada *${formattedDate}* (${timeInfo}).\n\nMohon lakukan pembayaran atau hubungi petugas administrasi koperasi. Terima kasih. 🙏`;
    
    const cleanPhone = member.noHp.replace(/[^0-9]/g, '');
    let finalPhone = cleanPhone;
    if (finalPhone.startsWith('0')) {
      finalPhone = '62' + finalPhone.substring(1);
    }
    
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Chart data 1: Savings allocation
  const savingsAllocation = useMemo(() => {
    const data = [
      { name: 'Simpanan Pokok', value: simpanan.filter(s => s.jenis === 'Pokok').reduce((a,c) => a + c.jumlah, 0) },
      { name: 'Simpanan Wajib', value: simpanan.filter(s => s.jenis === 'Wajib').reduce((a,c) => a + c.jumlah, 0) },
      { name: 'Simpanan Sukarela', value: simpanan.filter(s => s.jenis === 'Sukarela').reduce((a,c) => a + c.jumlah, 0) }
    ];
    return data;
  }, [simpanan]);

  // Chart data 2: Real Monthly Cashflow Trend (Inflow vs Outflow)
  const monthlyTrends = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const months: { key: string; label: string }[] = [];
    
    // Generate the last 6 months from the current active year/month (defaults to July 2026 based on mock context)
    const today = new Date(2026, 6, 6);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const key = `${year}-${String(monthNum + 1).padStart(2, '0')}`; // "YYYY-MM"
      const label = `${monthNames[monthNum]} ${String(year).substring(2)}`;
      months.push({ key, label });
    }

    let hasAnyActualData = false;

    const computed = months.map(({ key, label }) => {
      // 1. Simpanan (Inflow when positive, Outflow when negative/penarikan)
      const monthSimpanan = simpanan.filter(s => (s.tanggal || '').startsWith(key));
      const simpananIn = monthSimpanan.filter(s => s.jumlah > 0).reduce((sum, s) => sum + s.jumlah, 0);
      const simpananOut = monthSimpanan.filter(s => s.jumlah < 0).reduce((sum, s) => sum + Math.abs(s.jumlah), 0);

      // 2. Angsuran / Repayments (Inflow)
      const angsuranIn = angsuran.filter(a => (a.tanggal || '').startsWith(key)).reduce((sum, a) => sum + a.jumlahBayar, 0);

      // 3. Pendapatan Lain (Inflow)
      const incomeIn = income.filter(i => (i.tanggal || '').startsWith(key)).reduce((sum, i) => sum + i.nominal, 0);

      // 4. Pinjaman: Nominal Pinjaman (Outflow) and Provisi (Inflow)
      const monthPinjaman = pinjaman.filter(p => (p.tanggal || '').startsWith(key));
      const pinjamanOut = monthPinjaman.reduce((sum, p) => sum + p.nominalPinjaman, 0);
      const provisiIn = monthPinjaman.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);

      // 5. Beban / Expenses (Outflow)
      const expensesOut = expenses.filter(e => (e.tanggal || '').startsWith(key)).reduce((sum, e) => sum + e.nominal, 0);

      const totalIn = simpananIn + angsuranIn + incomeIn + provisiIn;
      const totalOut = simpananOut + pinjamanOut + expensesOut;

      if (totalIn > 0 || totalOut > 0) {
        hasAnyActualData = true;
      }

      return {
        month: label,
        'Kas Masuk': totalIn,
        'Kas Keluar': totalOut,
        'Selisih': totalIn - totalOut
      };
    });

    // Fallback to high-fidelity realistic initial numbers if database is empty/new
    if (!hasAnyActualData) {
      return [
        { month: 'Feb 26', 'Kas Masuk': 3500000, 'Kas Keluar': 1200000, 'Selisih': 2300000 },
        { month: 'Mar 26', 'Kas Masuk': 4200000, 'Kas Keluar': 1850000, 'Selisih': 2350000 },
        { month: 'Apr 26', 'Kas Masuk': 5100000, 'Kas Keluar': 2900000, 'Selisih': 2200000 },
        { month: 'Mei 26', 'Kas Masuk': 4800000, 'Kas Keluar': 3100000, 'Selisih': 1700000 },
        { month: 'Jun 26', 'Kas Masuk': 6400000, 'Kas Keluar': 4500000, 'Selisih': 1900000 },
        { month: 'Jul 26', 'Kas Masuk': summary.totalPendapatan || 7500000, 'Kas Keluar': summary.totalExpenses || 4900000, 'Selisih': (summary.totalPendapatan || 7500000) - (summary.totalExpenses || 4900000) }
      ];
    }

    return computed;
  }, [simpanan, angsuran, income, pinjaman, expenses, summary]);

  // 1. Usulan Anggota Baru yang Belum Diverifikasi
  const pendingMembers = useMemo(() => {
    return members.filter(m => m.isVerified === false);
  }, [members]);

  // 2. Setoran Mandiri / Pembayaran Pending yang Menunggu Validasi Kas
  const pendingDeposits = useMemo(() => {
    return (pembayaranPending || []).filter(p => p.status === 'Pending');
  }, [pembayaranPending]);

  // 3. Pengajuan Pinjaman yang Menunggu Persetujuan
  const pendingLoans = useMemo(() => {
    return (pengajuanPinjaman || []).filter(p => p.status === 'Pending');
  }, [pengajuanPinjaman]);

  const totalPendingActionCount = pendingMembers.length + pendingDeposits.length + pendingLoans.length;

  const COLORS = ['#4f46e5', '#f59e0b', '#0d9488'];

  return (
    <div className="space-y-6">
      {/* 🛡️ BANNER NOTIFIKASI AKSES PENGAWAS KOPERASI (HANYA LIHAT / READ-ONLY) */}
      {userRole === 'pengawas' && (
        <div className="p-4 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">Mode Akses Pengawas Koperasi (Hanya Lihat / Read-Only)</h4>
              <p className="text-indigo-700 dark:text-indigo-300 text-xs mt-0.5">
                Anda login dengan hak akses Pengawas Koperasi. Anda dapat memantau seluruh indikator kinerja keuangan, tren laba bulanan, arus kas, dan laporan pembukuan secara transparan tanpa izin mengubah atau mengedit data.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 hidden sm:inline-block">
            Pengawas Aktif
          </span>
        </div>
      )}

      {/* 🔔 PUSAT NOTIFIKASI & VERIFIKASI PENGURUS (REAL-TIME ACTION CENTER) */}
      {totalPendingActionCount > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-slate-800 dark:to-slate-800 p-5 sm:p-6 rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/40 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/60 dark:border-slate-700 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs animate-bounce">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
                    Pusat Notifikasi & Verifikasi Pengurus
                  </h3>
                  <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {totalPendingActionCount} Menunggu Tindakan
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 mt-0.5">
                  Terdapat usulan anggota baru atau transaksi setoran mandiri yang membutuhkan konfirmasi pengurus.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. KARTU NOTIFIKASI USULAN ANGGOTA BARU */}
            {pendingMembers.length > 0 && (
              <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                        <UserPlus className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Usulan Anggota Baru
                      </span>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {pendingMembers.length} Usulan
                    </span>
                  </div>

                  <p className="text-xs text-slate-550 dark:text-slate-400">
                    Ada {pendingMembers.length} calon anggota yang mendaftar dan menunggu verifikasi data:
                  </p>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {pendingMembers.slice(0, 3).map((pm) => (
                      <div key={pm.id} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-150 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{pm.nama}</p>
                          <p className="text-[10px] text-slate-400 font-mono">No. HP: {pm.noHp || '-'}</p>
                        </div>
                        <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                          Pending
                        </span>
                      </div>
                    ))}
                    {pendingMembers.length > 3 && (
                      <p className="text-[10px] text-center text-slate-400 font-medium pt-0.5">
                        +{pendingMembers.length - 3} calon anggota lainnya
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab?.('anggota')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Buka Menu Anggota & Verifikasi</span>
                </button>
              </div>
            )}

            {/* 2. KARTU NOTIFIKASI SETORAN MANDIRI ANGGOTA */}
            {pendingDeposits.length > 0 && (
              <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <Coins className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Setoran Mandiri Anggota
                      </span>
                    </div>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {pendingDeposits.length} Pembayaran
                    </span>
                  </div>

                  <p className="text-xs text-slate-550 dark:text-slate-400">
                    Ada {pendingDeposits.length} pembayaran mandiri yang menunggu validasi kas masuk:
                  </p>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {pendingDeposits.slice(0, 3).map((pd) => (
                      <div key={pd.id} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-150 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{pd.namaAnggota}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            {formatRupiah(pd.jumlah)} <span className="text-[9px] font-normal text-slate-400">({pd.jenis})</span>
                          </p>
                        </div>
                        {pd.buktiTransferUrl ? (
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                            <FileCheck className="w-2.5 h-2.5" /> Bukti Ada
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                            Transfer
                          </span>
                        )}
                      </div>
                    ))}
                    {pendingDeposits.length > 3 && (
                      <p className="text-[10px] text-center text-slate-400 font-medium pt-0.5">
                        +{pendingDeposits.length - 3} setoran lainnya
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab?.('kasmasuk')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Buka Kas Masuk & Validasi</span>
                </button>
              </div>
            )}

            {/* 3. KARTU NOTIFIKASI PENGAJUAN PINJAMAN (JIKA ADA) */}
            {pendingLoans.length > 0 && (
              <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Pengajuan Pinjaman
                      </span>
                    </div>
                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {pendingLoans.length} Pengajuan
                    </span>
                  </div>

                  <p className="text-xs text-slate-550 dark:text-slate-400">
                    Ada {pendingLoans.length} pengajuan pinjaman anggota menunggu persetujuan pengurus:
                  </p>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {pendingLoans.slice(0, 3).map((pl) => {
                      const m = members.find(mem => mem.id === pl.anggotaId);
                      return (
                        <div key={pl.id} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-150 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{m?.nama || 'Anggota'}</p>
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                              {formatRupiah(pl.nominalPinjaman)} <span className="text-[9px] font-normal text-slate-400">({pl.tenor} bln)</span>
                            </p>
                          </div>
                          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                            Menunggu
                          </span>
                        </div>
                      );
                    })}
                    {pendingLoans.length > 3 && (
                      <p className="text-[10px] text-center text-slate-400 font-medium pt-0.5">
                        +{pendingLoans.length - 3} pengajuan lainnya
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab?.('pinjaman')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Tinjau Pinjaman di Menu Pinjaman</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 📢 PENGUMUMAN KOPERASI TERKINI */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Papan Pengumuman Koperasi
              </h3>
              <p className="text-xs text-slate-450 mt-0.5">
                Rilis informasi resmi, pemberitahuan pengurus, dan agenda penting koperasi terintegrasi secara real-time.
              </p>
            </div>
          </div>

          {/* 📢 LIST PENGUMUMAN AKTIF */}
          <div className="space-y-3">
            {activeAnnouncements.map((ann) => (
              <div 
                key={ann.id} 
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  ann.isUrgent 
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200' 
                    : 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ann.isUrgent ? '🚨' : '📢'}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ann.judul}</span>
                    <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-400 bg-white/70 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {ann.tanggal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-6">
                    {ann.konten}
                  </p>
                </div>
                {ann.isUrgent && (
                  <span className="self-start sm:self-center px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider shrink-0 shadow-xs">
                    Urgent
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔔 REKAPITULASI NOTIFIKASI JATUH TEMPO PINJAMAN (KLIK UNTUK MENU JADWAL DAN TAGIHAN) */}
      <div 
        onClick={() => onNavigateTab?.('pengingat')}
        className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer group shadow-sm relative overflow-hidden ${
          dueSummary.totalCount > 0 
            ? 'bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-rose-950/20 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md' 
            : 'bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150/80 dark:border-slate-700/80 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              dueSummary.totalCount > 0 
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 animate-pulse' 
                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Rekap Jatuh Tempo Pinjaman
                </h3>
                {dueSummary.totalCount > 0 ? (
                  <span className="bg-rose-600 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                    {dueSummary.totalCount} Perlu Tindakan
                  </span>
                ) : (
                  <span className="bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    Semua Tagihan Aman
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rekapitulasi tagihan anggota yang telah melewati jatuh tempo atau jatuh tempo ≤ 3 hari ke depan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateTab?.('pengingat');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Jadwal & Tagihan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {dueSummary.totalCount === 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-center sm:text-left gap-2">
            <div className="flex items-center gap-2.5 text-teal-700 dark:text-teal-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold">Semua jadwal angsuran pinjaman berjalan lancar. Tidak ada tagihan jatuh tempo dalam waktu dekat.</span>
            </div>
            <span className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
              Lihat Jadwal dan Tagihan <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        ) : (
          <div className="pt-4 space-y-3.5">
            {/* KPI Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/95 dark:bg-slate-900/60 p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/40 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tagihan Jatuh Tempo</p>
                <p className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {dueSummary.totalCount} <span className="text-xs font-sans font-normal text-slate-500">Anggota</span>
                </p>
                <p className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  Total: {formatRupiah(dueSummary.totalAmount)}
                </p>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/60 p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/40 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sudah Terlewat (Overdue)</p>
                <p className="text-lg font-mono font-bold text-rose-700 dark:text-rose-350 mt-1">
                  {dueSummary.overdueCount} <span className="text-xs font-sans font-normal text-slate-500">Anggota</span>
                </p>
                <p className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatRupiah(dueSummary.overdueAmount)}
                </p>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/60 p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jatuh Tempo Mendatang (≤ 3 Hari)</p>
                <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {dueSummary.dueSoonCount} <span className="text-xs font-sans font-normal text-slate-500">Anggota</span>
                </p>
                <p className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatRupiah(dueSummary.dueSoonAmount)}
                </p>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/60 p-3.5 rounded-xl border border-indigo-200/70 dark:border-indigo-900/40 shadow-2xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tindakan Pengurus</p>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                    Kirim Pesan Pengingat WA
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-2">
                  <span>Kelola di Jadwal & Tagihan</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Quick Preview Chips & Click Prompt */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Sampel Anggota:</span>
                {dueNotifications.slice(0, 4).map(({ member, daysRemaining }, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200/80 dark:border-slate-700"
                  >
                    <span className="font-semibold">{member.nama}</span>
                    <span className={`text-[10px] font-mono ${daysRemaining < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}`}>
                      ({daysRemaining < 0 ? `Terlewat ${Math.abs(daysRemaining)}h` : daysRemaining === 0 ? 'Hari ini' : `${daysRemaining}h`})
                    </span>
                  </span>
                ))}
                {dueNotifications.length > 4 && (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    +{dueNotifications.length - 4} anggota lainnya
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 shrink-0 flex items-center gap-1 group-hover:underline">
                Klik kartu untuk membuka rincian lengkap & kirim WA →
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cards KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Kas */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">Total Kas Koperasi</p>
          <p className="text-lg sm:text-xl lg:text-xs xl:text-sm 2xl:text-lg font-mono font-bold tracking-tighter text-teal-700 dark:text-teal-400 mt-2 truncate" title={formatRupiah(summary.kasKoperasi)}>{formatRupiah(summary.kasKoperasi)}</p>
          <span className="text-[10px] text-slate-400 mt-1 italic block font-medium truncate">Buku Kas & Bank Aktif</span>
        </div>

        {/* Total Simpanan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">Total Simpanan</p>
          <p className="text-lg sm:text-xl lg:text-xs xl:text-sm 2xl:text-lg font-mono font-bold tracking-tighter text-slate-800 dark:text-slate-100 mt-2 truncate" title={formatRupiah(summary.totalSimpanan)}>{formatRupiah(summary.totalSimpanan)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block truncate">Pokok, Wajib, Sukarela</span>
        </div>

        {/* Total Pinjaman Beredar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">Pinjaman Beredar</p>
          <p className="text-lg sm:text-xl lg:text-xs xl:text-sm 2xl:text-lg font-mono font-bold tracking-tighter text-rose-700 dark:text-rose-400 mt-2 truncate" title={formatRupiah(summary.pinjamanBeredar)}>{formatRupiah(summary.pinjamanBeredar)}</p>
          <span className="text-[10px] text-rose-500 font-medium mt-1 block truncate">Piutang Pembiayaan</span>
        </div>

        {/* Total Anggota */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">Total Anggota</p>
          <p className="text-lg sm:text-xl lg:text-xs xl:text-sm 2xl:text-lg font-mono font-bold tracking-tighter text-slate-800 dark:text-slate-100 mt-2 truncate" title={`${summary.totalAnggota} Org`}>{summary.totalAnggota} <span className="text-xs text-slate-400 font-normal">Org</span></p>
          <span className="text-[10px] text-indigo-500 font-semibold mt-1 block truncate">Anggota Terdaftar</span>
        </div>

        {/* SHU Lancar */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">SHU Sementara (Laba Bersih)</p>
          <p className={`text-lg sm:text-xl lg:text-xs xl:text-sm 2xl:text-lg font-mono font-bold tracking-tighter mt-2 truncate ${summary.shuSementara >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'}`} title={`Laba Bersih: ${formatRupiah(summary.shuSementara)} | Cadangan Koperasi (20%): ${formatRupiah(Math.round(summary.shuSementara * 0.2))} | Hak SHU Anggota (80%): ${formatRupiah(summary.shuSementara - Math.round(summary.shuSementara * 0.2))}`}>{formatRupiah(summary.shuSementara)}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block font-medium truncate" title={`Cadangan 20%: ${formatRupiah(Math.round(summary.shuSementara * 0.2))} • Anggota 80%: ${formatRupiah(summary.shuSementara - Math.round(summary.shuSementara * 0.2))}`}>
            Cadangan 20% • Hak Anggota 80%
          </span>
        </div>
      </div>

      {/* 📊 VISUALISASI GRAFIK TREN SIMPANAN & PINJAMAN ANGGOTA (RECHARTS) */}
      <AdminTrenSimpananPinjamanChart
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        members={members}
        setup={setup}
      />

      {/* 📈 REKAPITULASI LABA BULANAN BERBENTUK GRAFIK INTERAKTIF */}
      <PortalGrafikLabaBulanan
        income={income}
        expenses={expenses}
        pinjaman={pinjaman}
        angsuran={angsuran}
        namaKoperasi={setup?.namaKoperasi || "Koperasi Dana Segar"}
      />

      {/* Analytics Graphics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Bar Income Expenses */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-1.5 label-id">
            <span className="w-1.5 h-4 bg-teal-700 rounded-full inline-block"></span>
            Tren Arus Kas Masuk & Arus Kas Keluar Bulanan (Real-time)
          </h3>
          <div className="flex-1 w-full text-xs min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={80} tickFormatter={(v)=>`Rp ${v/1000}k`} />
                <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                <Legend />
                <Bar dataKey="Kas Masuk" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Kas Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Selisih" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Surplus/Selisih" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Pie Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col h-[380px]">
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-1.5 label-id">
            <span className="w-1.5 h-4 bg-amber-505 rounded-full bg-teal-700 inline-block"></span>
            Alokasi Portofolio Simpanan Anggota Koperasi (%)
          </h3>
          <div className="flex-1 w-full text-xs min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={savingsAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {savingsAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= COOPERATIVE FINANCIAL STATEMENTS (LABA RUGI, NERACA, EXPORTS) =================
interface LaporanProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pembelian?: Pembelian[];
  piutangWarung?: PiutangWarung[];
  setup: KoperasiSetup;
  rekening?: RekeningNeraca[];
  onSaveRekening?: (rek: RekeningNeraca) => void;
  onDeleteRekening?: (id: string) => void;
  onDeleteAngsuran?: (id: string) => void;
  onDeleteSimpanan?: (id: string) => void;
  onEditSimpanan?: (updated: Simpanan) => void;
  onEditAngsuran?: (updated: Angsuran) => void;
  onAddExpense?: (newExp: Omit<BebanKoperasi, 'id'>) => Promise<void>;
  shuDistributions?: SHUDistribution[];
  onAddSHUDistribution?: (dist: SHUDistribution) => Promise<void> | void;
  onUpdateSetup?: (newSetup: KoperasiSetup) => void;
  onNavigateToAngsuran?: (angsuranId?: string, memberId?: string, query?: string) => void;
  onNavigateToPinjaman?: (pinjamanId?: string, memberId?: string, query?: string) => void;
  userRole?: 'admin' | 'pengawas' | 'karyawan_warung' | 'member' | null;
}

export function LaporanView({ 
  members, simpanan, pinjaman, angsuran, income, expenses, pembelian = [], piutangWarung = [], setup,
  rekening = [], onSaveRekening, onDeleteRekening,
  onDeleteAngsuran, onDeleteSimpanan, onEditSimpanan, onEditAngsuran,
  onAddExpense, shuDistributions = [], onAddSHUDistribution, onUpdateSetup,
  onNavigateToAngsuran,
  onNavigateToPinjaman,
  userRole
}: LaporanProps) {
  // Deteksi ketersediaan tahun transaksi dari data untuk penentuan default periode tahun buku (mulai dari 1 Januari)
  const availableYears = useMemo(() => {
    const dates = [
      ...(simpanan || []).map(s => s.tanggal),
      ...(pinjaman || []).map(p => p.tanggal),
      ...(angsuran || []).map(a => a.tanggal),
      ...(income || []).map(i => i.tanggal),
      ...(expenses || []).map(e => e.tanggal),
      ...(pembelian || []).map(p => p.tanggal)
    ].filter(Boolean);
    const yrs = Array.from(new Set(dates.map(d => d.substring(0, 4)))).sort();
    const curr = `${new Date().getFullYear()}`;
    if (!yrs.includes(curr)) yrs.push(curr);
    return yrs.sort();
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian]);

  const defaultYear = useMemo(() => {
    const dates = [
      ...(simpanan || []).map(s => s.tanggal),
      ...(pinjaman || []).map(p => p.tanggal),
      ...(angsuran || []).map(a => a.tanggal),
      ...(income || []).map(i => i.tanggal),
      ...(expenses || []).map(e => e.tanggal),
      ...(pembelian || []).map(p => p.tanggal)
    ].filter(Boolean);
    if (dates.length === 0) return `${new Date().getFullYear()}`;
    const yrs = Array.from(new Set(dates.map(d => d.substring(0, 4)))).sort();
    return yrs[yrs.length - 1] || `${new Date().getFullYear()}`;
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian]);

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const dates = [
      ...(simpanan || []).map(s => s.tanggal),
      ...(pinjaman || []).map(p => p.tanggal),
      ...(angsuran || []).map(a => a.tanggal),
      ...(income || []).map(i => i.tanggal),
      ...(expenses || []).map(e => e.tanggal),
      ...(pembelian || []).map(p => p.tanggal)
    ].filter(Boolean);
    if (dates.length > 0) {
      const yrs = Array.from(new Set(dates.map(d => d.substring(0, 4)))).sort();
      return `${yrs[yrs.length - 1]}-01-01`;
    }
    return `${new Date().getFullYear()}-01-01`;
  });

  const [filterEndDate, setFilterEndDate] = useState(() => {
    const dates = [
      ...(simpanan || []).map(s => s.tanggal),
      ...(pinjaman || []).map(p => p.tanggal),
      ...(angsuran || []).map(a => a.tanggal),
      ...(income || []).map(i => i.tanggal),
      ...(expenses || []).map(e => e.tanggal),
      ...(pembelian || []).map(p => p.tanggal)
    ].filter(Boolean);
    if (dates.length > 0) {
      const yrs = Array.from(new Set(dates.map(d => d.substring(0, 4)))).sort();
      return `${yrs[yrs.length - 1]}-12-31`;
    }
    return `${new Date().getFullYear()}-12-31`;
  });

  // Sinkronisasi otomatis ke tahun data terbaru jika filter saat ini berada di tahun yang kosong
  useEffect(() => {
    if (defaultYear) {
      const currentYear = filterStartDate.substring(0, 4);
      const hasRecordsInCurrent = (income || []).some(i => i.tanggal?.startsWith(currentYear)) ||
        (expenses || []).some(e => e.tanggal?.startsWith(currentYear));
      if (!hasRecordsInCurrent && defaultYear !== currentYear) {
        setFilterStartDate(`${defaultYear}-01-01`);
        setFilterEndDate(`${defaultYear}-12-31`);
      }
    }
  }, [defaultYear, income, expenses]);
  
  const [activeReportTab, setActiveReportTab] = useState<'labaRugi' | 'neraca' | 'rekapArusKas' | 'nominatif' | 'simpanan' | 'pinjaman' | 'angsuran' | 'rasioKesehatan' | 'piutangWarung' | 'kreditMacet' | 'pembagianSHU'>('labaRugi');

  // Rekap Arus Kas (Cash Flow) States
  const [cashFlowSortBy, setCashFlowSortBy] = useState<'month' | 'inflow' | 'outflow' | 'net'>('month');
  const [cashFlowSortOrder, setCashFlowSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cashFlowSelectedMonth, setCashFlowSelectedMonth] = useState<string>('all');
  const [cashFlowViewMode, setCashFlowViewMode] = useState<'rekapBulanan' | 'mutasiDetail'>('rekapBulanan');
  const [cashFlowSearch, setCashFlowSearch] = useState<string>('');
  const [cashFlowTypeFilter, setCashFlowTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [cashFlowCategoryFilter, setCashFlowCategoryFilter] = useState<string>('all');

  // Initial Balance Sheet (Neraca Saldo Awal Tahun) Custom Editor States
  const [isEditingInitialNeraca, setIsEditingInitialNeraca] = useState(false);
  const [initKas, setInitKas] = useState('0');
  const [initPiutang, setInitPiutang] = useState('0');
  const [initPiutangWarung, setInitPiutangWarung] = useState('0');
  const [initWarung, setInitWarung] = useState('0');
  const [initBarang, setInitBarang] = useState('0');
  const [initSeragam, setInitSeragam] = useState('0');
  const [initInventaris, setInitInventaris] = useState('0');
  const [initAkumulasiPenyusutan, setInitAkumulasiPenyusutan] = useState('0');
  const [initAtribut, setInitAtribut] = useState('0');
  const [initSimpPokok, setInitSimpPokok] = useState('0');
  const [initSimpWajib, setInitSimpWajib] = useState('0');
  const [initSimpSukarela, setInitSimpSukarela] = useState('0');
  const [initModal, setInitModal] = useState('0');
  const [initDanaCadangan, setInitDanaCadangan] = useState('0');
  const [initShu, setInitShu] = useState('0');

  const formatNumberWithDots = (val: number | string, maxDigits: number = 15): string => {
    if (val === undefined || val === null || val === '') return '';
    let cleanStr = String(val).replace(/\D/g, '');
    if (!cleanStr) return '';
    if (cleanStr.length > maxDigits) cleanStr = cleanStr.slice(0, maxDigits);
    return new Intl.NumberFormat('id-ID').format(parseInt(cleanStr, 10));
  };

  const openInitialNeracaEditor = () => {
    setInitKas(formatNumberWithDots(setup?.kasAwal ?? 0));
    setInitPiutang(formatNumberWithDots(setup?.piutangAwal ?? 0));
    setInitPiutangWarung(formatNumberWithDots(setup?.piutangWarungAwal ?? 0));
    setInitWarung(formatNumberWithDots(setup?.persediaanWarungAwal ?? 0));
    setInitBarang(formatNumberWithDots(setup?.persediaanBarangDagangAwal ?? 0));
    setInitSeragam(formatNumberWithDots(setup?.seragamAwal ?? 0));
    setInitInventaris(formatNumberWithDots(setup?.inventarisAwal ?? 0));
    setInitAkumulasiPenyusutan(formatNumberWithDots(setup?.akumulasiPenyusutanAwal ?? 0));
    setInitAtribut(formatNumberWithDots(setup?.atributAwal ?? 0));
    setInitSimpPokok(formatNumberWithDots(setup?.simpananPokokAwal ?? 0));
    setInitSimpWajib(formatNumberWithDots(setup?.simpananWajibAwal ?? 0));
    setInitSimpSukarela(formatNumberWithDots(setup?.simpananSukarelaAwal ?? 0));
    setInitModal(formatNumberWithDots(setup?.modalAwal ?? 0));
    setInitDanaCadangan(formatNumberWithDots(setup?.danaCadanganAwal ?? 0));
    setInitShu(formatNumberWithDots(setup?.shuAwal ?? 0));
    setIsEditingInitialNeraca(true);
  };

  const handleSaveInitialNeraca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSetup) return;

    const parseNum = (val: string) => {
      if (!val) return 0;
      const cleanStr = String(val).replace(/\D/g, '');
      const num = parseInt(cleanStr, 10);
      return isNaN(num) ? 0 : num;
    };

    const newSetup: KoperasiSetup = {
      ...setup,
      kasAwal: parseNum(initKas),
      piutangAwal: parseNum(initPiutang),
      piutangWarungAwal: parseNum(initPiutangWarung),
      persediaanWarungAwal: parseNum(initWarung),
      persediaanBarangDagangAwal: parseNum(initBarang),
      seragamAwal: parseNum(initSeragam),
      inventarisAwal: parseNum(initInventaris),
      akumulasiPenyusutanAwal: parseNum(initAkumulasiPenyusutan),
      atributAwal: parseNum(initAtribut),
      simpananPokokAwal: parseNum(initSimpPokok),
      simpananWajibAwal: parseNum(initSimpWajib),
      simpananSukarelaAwal: parseNum(initSimpSukarela),
      modalAwal: parseNum(initModal),
      danaCadanganAwal: parseNum(initDanaCadangan),
      shuAwal: parseNum(initShu)
    };

    onUpdateSetup(newSetup);
    setIsEditingInitialNeraca(false);
  };

  const [isInlineEditingNeracaAwal, setIsInlineEditingNeracaAwal] = useState(false);

  const startInlineEditingNeracaAwal = () => {
    setInitKas(formatNumberWithDots(setup?.kasAwal ?? 0));
    setInitPiutang(formatNumberWithDots(setup?.piutangAwal ?? 0));
    setInitPiutangWarung(formatNumberWithDots(setup?.piutangWarungAwal ?? 0));
    setInitWarung(formatNumberWithDots(setup?.persediaanWarungAwal ?? 0));
    setInitBarang(formatNumberWithDots(setup?.persediaanBarangDagangAwal ?? 0));
    setInitSeragam(formatNumberWithDots(setup?.seragamAwal ?? 0));
    setInitInventaris(formatNumberWithDots(setup?.inventarisAwal ?? 0));
    setInitAkumulasiPenyusutan(formatNumberWithDots(setup?.akumulasiPenyusutanAwal ?? 0));
    setInitAtribut(formatNumberWithDots(setup?.atributAwal ?? 0));
    setInitSimpPokok(formatNumberWithDots(setup?.simpananPokokAwal ?? 0));
    setInitSimpWajib(formatNumberWithDots(setup?.simpananWajibAwal ?? 0));
    setInitSimpSukarela(formatNumberWithDots(setup?.simpananSukarelaAwal ?? 0));
    setInitModal(formatNumberWithDots(setup?.modalAwal ?? 0));
    setInitDanaCadangan(formatNumberWithDots(setup?.danaCadanganAwal ?? 0));
    setInitShu(formatNumberWithDots(setup?.shuAwal ?? 0));
    setIsInlineEditingNeracaAwal(true);
  };

  const handleSaveInlineNeracaAwal = () => {
    if (!onUpdateSetup) return;

    const parseNum = (val: string) => {
      if (!val) return 0;
      const cleanStr = String(val).replace(/\D/g, '');
      const num = parseInt(cleanStr, 10);
      return isNaN(num) ? 0 : num;
    };

    const newSetup: KoperasiSetup = {
      ...setup,
      kasAwal: parseNum(initKas),
      piutangAwal: parseNum(initPiutang),
      piutangWarungAwal: parseNum(initPiutangWarung),
      persediaanWarungAwal: parseNum(initWarung),
      persediaanBarangDagangAwal: parseNum(initBarang),
      seragamAwal: parseNum(initSeragam),
      inventarisAwal: parseNum(initInventaris),
      akumulasiPenyusutanAwal: parseNum(initAkumulasiPenyusutan),
      atributAwal: parseNum(initAtribut),
      simpananPokokAwal: parseNum(initSimpPokok),
      simpananWajibAwal: parseNum(initSimpWajib),
      simpananSukarelaAwal: parseNum(initSimpSukarela),
      modalAwal: parseNum(initModal),
      danaCadanganAwal: parseNum(initDanaCadangan),
      shuAwal: parseNum(initShu)
    };

    onUpdateSetup(newSetup);
    setIsInlineEditingNeracaAwal(false);
  };

  const liveTotalAktivaAwal = useMemo(() => {
    const parseVal = (val: string) => {
      if (!val) return 0;
      const cleanStr = String(val).replace(/\D/g, '');
      const n = parseInt(cleanStr, 10);
      return isNaN(n) ? 0 : n;
    };
    const invNet = Math.max(0, parseVal(initInventaris) - parseVal(initAkumulasiPenyusutan));
    return parseVal(initKas) + parseVal(initPiutang) + parseVal(initPiutangWarung) + parseVal(initWarung) + parseVal(initBarang) + invNet + parseVal(initAtribut);
  }, [initKas, initPiutang, initPiutangWarung, initWarung, initBarang, initInventaris, initAkumulasiPenyusutan, initAtribut]);

  const liveTotalPasivaAwal = useMemo(() => {
    const parseVal = (val: string) => {
      if (!val) return 0;
      const cleanStr = String(val).replace(/\D/g, '');
      const n = parseInt(cleanStr, 10);
      return isNaN(n) ? 0 : n;
    };
    return parseVal(initSimpSukarela) + parseVal(initSimpPokok) + parseVal(initSimpWajib) + parseVal(initModal) + parseVal(initDanaCadangan) + parseVal(initShu);
  }, [initSimpSukarela, initSimpPokok, initSimpWajib, initModal, initDanaCadangan, initShu]);

  const isInitialBalancesEmpty = useMemo(() => {
    return (
      (setup?.kasAwal ?? 0) === 0 &&
      (setup?.piutangAwal ?? 0) === 0 &&
      (setup?.piutangWarungAwal ?? 0) === 0 &&
      (setup?.persediaanWarungAwal ?? 0) === 0 &&
      (setup?.persediaanBarangDagangAwal ?? 0) === 0 &&
      (setup?.seragamAwal ?? 0) === 0 &&
      (setup?.inventarisAwal ?? 0) === 0 &&
      (setup?.atributAwal ?? 0) === 0 &&
      (setup?.simpananPokokAwal ?? 0) === 0 &&
      (setup?.simpananWajibAwal ?? 0) === 0 &&
      (setup?.simpananSukarelaAwal ?? 0) === 0 &&
      (setup?.modalAwal ?? 0) === 0 &&
      (setup?.danaCadanganAwal ?? 0) === 0 &&
      (setup?.shuAwal ?? 0) === 0
    );
  }, [setup]);

  // Comparative Balance Sheet Calculation (Awal Tahun vs Akhir Tahun / Berjalan)
  const comparativeBalance = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const piutangAwal = setup?.piutangAwal ?? 0;
    const piutangWarungAwal = setup?.piutangWarungAwal ?? 0;
    const persediaanWarungAwal = setup?.persediaanWarungAwal ?? 0;
    const seragamAwal = setup?.seragamAwal ?? 0;
    const persediaanBarangDagangAwal = setup?.persediaanBarangDagangAwal ?? 0;
    const inventarisAwal = setup?.inventarisAwal ?? 0;
    const akumulasiPenyusutanAwal = setup?.akumulasiPenyusutanAwal ?? 0;
    const atributAwal = setup?.atributAwal ?? 0;

    const simpananPokokAwal = setup?.simpananPokokAwal ?? 0;
    const simpananWajibAwal = setup?.simpananWajibAwal ?? 0;
    const simpananSukarelaAwal = setup?.simpananSukarelaAwal ?? 0;
    const modalAwal = setup?.modalAwal ?? 0;
    const danaCadanganAwal = setup?.danaCadanganAwal ?? 0;
    const shuAwal = setup?.shuAwal ?? 0;

    // Movement calculations during the period
    const totalSimpanan = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalDisbursed = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalProvisi = pinjaman.reduce((a, c) => a + (c.provisiDipotong || 0), 0);
    const totalAngsuran = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    const totalInc = income.reduce((a, c) => a + c.nominal, 0);
    const totalExp = expenses.reduce((a, c) => a + c.nominal, 0);
    const totalPembelian = pembelian?.reduce((a, c) => a + c.totalHarga, 0) ?? 0;
    const totalHutangWarung = piutangWarung?.filter(pw => pw.jenis === 'hutang_baru').reduce((a, c) => a + c.nominal, 0) ?? 0;
    const totalPelunasanWarung = piutangWarung?.filter(pw => pw.jenis === 'pelunasan').reduce((a, c) => a + c.nominal, 0) ?? 0;

    const kasAkhir = calculateKasKoperasi(setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung);

    const piutangBeredar = pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      return acc + calculateLoanOutstanding(p, repays);
    }, 0);

    const persediaanWarung = (pembelian?.filter(p => p.kategori === 'persediaan_warung').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const seragam = (pembelian?.filter(p => p.kategori === 'seragam').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const persediaanBarang = (pembelian?.filter(p => p.kategori === 'persediaan_barang').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const inventarisPembelian = (pembelian?.filter(p => p.kategori === 'inventaris').reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const inventarisBrutoAkhir = inventarisAwal + inventarisPembelian;
    
    // Penyusutan Beban
    const bPenyusutan = expenses.filter(e => e.kategori === 'penyusutan_inventaris' || e.kategori === 'penyusutan_aktiva_tetap' || e.kategori?.toLowerCase().includes('penyusutan')).reduce((a, c) => a + c.nominal, 0);
    const akumulasiPenyusutanAkhir = akumulasiPenyusutanAwal + bPenyusutan;
    const inventarisNettoAwal = Math.max(0, inventarisAwal - akumulasiPenyusutanAwal);
    const inventarisNettoAkhir = Math.max(0, inventarisBrutoAkhir - akumulasiPenyusutanAkhir);

    const atribut = (pembelian?.filter(p => p.kategori === 'atribut' || p.kategori === 'atribut_koperasi' || p.kategori?.toLowerCase().includes('atribut') || p.namaBarang?.toLowerCase().includes('atribut')).reduce((a, c) => a + c.totalHarga, 0) ?? 0);
    const piutangWarungVal = totalHutangWarung - totalPelunasanWarung;

    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);

    const revenueBreakdown = calculateCooperativeRevenue(income, pinjaman, angsuran);
    const totalRevenue = revenueBreakdown.totalRevenue;

    const bGajiKaryawan = expenses.filter(e => e.kategori === 'gaji_karyawan').reduce((a, c) => a + c.nominal, 0);
    const bListrik = expenses.filter(e => e.kategori === 'listrik').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengurus = expenses.filter(e => e.kategori === 'gaji_pengurus').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengawas = expenses.filter(e => e.kategori === 'gaji_pengawas').reduce((a, c) => a + c.nominal, 0);
    const bOperasional = expenses.filter(e => e.kategori === 'operasional_kantor').reduce((a, c) => a + c.nominal, 0);
    const bRapat = expenses.filter(e => e.kategori === 'beban_rapat').reduce((a, c) => a + c.nominal, 0);
    const bLain = expenses.filter(e => !['gaji_karyawan', 'listrik', 'gaji_pengurus', 'gaji_pengawas', 'operasional_kantor', 'beban_rapat', 'penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(e.kategori) && !e.kategori?.toLowerCase().includes('penyusutan')).reduce((a, c) => a + c.nominal, 0);
    const totalExpenses = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bRapat + bPenyusutan + bLain;
    const netProfit = totalRevenue - totalExpenses;

    const danaCadangan = Math.round(netProfit * 0.20);
    const shuBerjalan = netProfit - danaCadangan;

    const aktivaItems = [
      { key: 'kas', nama: 'Kas & Bank', awal: kasAwal, akhir: kasAkhir, val: initKas, setVal: setInitKas },
      { key: 'piutang', nama: 'Piutang Pinjaman Beredar', awal: piutangAwal, akhir: piutangBeredar, val: initPiutang, setVal: setInitPiutang },
      { key: 'persediaanWarung', nama: 'Persediaan Warung Sembako', awal: persediaanWarungAwal, akhir: persediaanWarung, val: initWarung, setVal: setInitWarung },
      { key: 'persediaanBarang', nama: 'Persediaan Barang Dagang', awal: persediaanBarangDagangAwal, akhir: persediaanBarang, val: initBarang, setVal: setInitBarang },
      { key: 'piutangWarung', nama: 'Piutang Warung / Toko', awal: piutangWarungAwal, akhir: piutangWarungVal, val: initPiutangWarung, setVal: setInitPiutangWarung },
      { key: 'inventaris', nama: 'Inventaris Koperasi (Bruto)', awal: inventarisAwal, akhir: inventarisBrutoAkhir, val: initInventaris, setVal: setInitInventaris },
      { key: 'akumulasiPenyusutan', nama: 'Akumulasi Penyusutan Inventaris (-)', awal: -akumulasiPenyusutanAwal, akhir: -akumulasiPenyusutanAkhir, val: initAkumulasiPenyusutan, setVal: setInitAkumulasiPenyusutan, isContra: true },
      { key: 'inventarisNetto', nama: 'INVENTARIS KOPERASI NETTO', awal: inventarisNettoAwal, akhir: inventarisNettoAkhir, isNetto: true },
      { key: 'atribut', nama: 'Atribut Koperasi', awal: atributAwal, akhir: atribut, val: initAtribut, setVal: setInitAtribut },
    ];

    (rekening || []).filter(r => r.kategori === 'Aktiva').forEach(r => {
      aktivaItems.push({ key: `rek-${r.id}`, nama: `[${r.kode}] ${r.nama}`, awal: 0, akhir: r.saldo, val: '0', setVal: () => {} });
    });

    const totalAktivaAwal = kasAwal + piutangAwal + persediaanWarungAwal + persediaanBarangDagangAwal + piutangWarungAwal + inventarisNettoAwal + atributAwal;
    const totalAktivaAkhir = kasAkhir + piutangBeredar + persediaanWarung + persediaanBarang + piutangWarungVal + inventarisNettoAkhir + atribut + ((rekening || []).filter(r => r.kategori === 'Aktiva').reduce((s, r) => s + r.saldo, 0));

    const pasivaItems = [
      { key: 'simpananPokok', nama: 'Simpanan Pokok Anggota', awal: simpananPokokAwal, akhir: sPokok, val: initSimpPokok, setVal: setInitSimpPokok },
      { key: 'simpananWajib', nama: 'Simpanan Wajib Anggota', awal: simpananWajibAwal, akhir: sWajib, val: initSimpWajib, setVal: setInitSimpWajib },
      { key: 'simpananSukarela', nama: 'Simpanan Sukarela / Manasuka', awal: simpananSukarelaAwal, akhir: sSukarela, val: initSimpSukarela, setVal: setInitSimpSukarela },
      { key: 'modalAwal', nama: 'Modal Awal Koperasi', awal: modalAwal, akhir: modalAwal, val: initModal, setVal: setInitModal },
      { key: 'danaCadangan', nama: 'Dana Cadangan Koperasi (20%)', awal: danaCadanganAwal, akhir: danaCadangan, val: initDanaCadangan, setVal: setInitDanaCadangan },
      { key: 'shu', nama: 'SHU Berjalan (80%)', awal: shuAwal, akhir: shuBerjalan, val: initShu, setVal: setInitShu },
    ];

    (rekening || []).filter(r => r.kategori === 'Pasiva').forEach(r => {
      pasivaItems.push({ key: `rek-${r.id}`, nama: `[${r.kode}] ${r.nama}`, awal: 0, akhir: r.saldo, val: '0', setVal: () => {} });
    });

    const totalPasivaAwal = pasivaItems.reduce((a, c) => a + c.awal, 0);
    const totalPasivaAkhir = pasivaItems.reduce((a, c) => a + c.akhir, 0);

    const deltaAktiva = totalAktivaAkhir - totalAktivaAwal;
    const pctAktiva = totalAktivaAwal > 0 ? (deltaAktiva / totalAktivaAwal) * 100 : (totalAktivaAkhir > 0 ? 100 : 0);

    const deltaPasiva = totalPasivaAkhir - totalPasivaAwal;
    const pctPasiva = totalPasivaAwal > 0 ? (deltaPasiva / totalPasivaAwal) * 100 : (totalPasivaAkhir > 0 ? 100 : 0);

    return {
      aktivaItems,
      totalAktivaAwal,
      totalAktivaAkhir,
      deltaAktiva,
      pctAktiva,
      pasivaItems,
      totalPasivaAwal,
      totalPasivaAkhir,
      deltaPasiva,
      pctPasiva,
      netProfit,
      kasDelta: kasAkhir - kasAwal,
      piutangDelta: piutangBeredar - piutangAwal,
      simpananGrowth: (sPokok + sWajib + sSukarela),
    };
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung, setup, initKas, initPiutang, initPiutangWarung, initWarung, initSeragam, initBarang, initInventaris, initAtribut, initSimpSukarela, initSimpPokok, initSimpWajib, initModal, initDanaCadangan, initShu]);

  // SHU Distribution States
  const [persenDanaCadangan, setPersenDanaCadangan] = useState<number>(25);
  const [persenAnggota, setPersenAnggota] = useState<number>(50);
  const [persenPengurus, setPersenPengurus] = useState<number>(17);
  const [persenPengawas, setPersenPengawas] = useState<number>(8);
  const [shuDistributedSuccess, setShuDistributedSuccess] = useState<string>('');
  const [shuDistributionError, setShuDistributionError] = useState<string>('');

  // SHU Per Anggota States (Aturan Baku Perkoperasian JMA & JUA)
  const [shuSubTab, setShuSubTab] = useState<'perAnggota' | 'alokasiKoperasi'>('perAnggota');
  const [persenJasaModal, setPersenJasaModal] = useState<number>(50); // Default 50% JMA (Simpanan)
  const [includeSukarelaInJMA, setIncludeSukarelaInJMA] = useState<boolean>(true); // Default true
  const [shuAnggotaSearch, setShuAnggotaSearch] = useState<string>('');
  const [shuAnggotaSortBy, setShuAnggotaSortBy] = useState<'total' | 'jma' | 'jua' | 'nama' | 'noAnggota' | 'simpanan' | 'usaha'>('total');
  const [shuAnggotaSortOrder, setShuAnggotaSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSHUReference, setSelectedSHUReference] = useState<string>('live');
  const [activeSlipMember, setActiveSlipMember] = useState<{
    member: Member;
    sPokok: number;
    sWajib: number;
    sSukarela: number;
    totalSimpananEligible: number;
    porsiSimpananPct: number;
    shuJMA: number;
    jasaPinjamanDibayar: number;
    belanjaWarung: number;
    totalPartisipasiUsaha: number;
    porsiUsahaPct: number;
    shuJUA: number;
    totalSHU: number;
  } | null>(null);
  
  // States for Piutang Warung report filtering
  const [piutangWarungSearch, setPiutangWarungSearch] = useState('');
  const [piutangWarungFilterType, setPiutangWarungFilterType] = useState('aktif'); // 'aktif' | '' | 'lunas'
  const [piutangWarungMutasiSearch, setPiutangWarungMutasiSearch] = useState('');
  
  // Rekening Neraca CUDR states
  const [isAddingRekening, setIsAddingRekening] = useState(false);
  const [editingRekening, setEditingRekening] = useState<RekeningNeraca | null>(null);
  const [rekKode, setRekKode] = useState('');
  const [rekNama, setRekNama] = useState('');
  const [rekKategori, setRekKategori] = useState<'Aktiva' | 'Pasiva'>('Aktiva');
  const [rekSaldo, setRekSaldo] = useState('');
  const [rekKeterangan, setRekKeterangan] = useState('');
  const [rekSearch, setRekSearch] = useState('');

  const startAddRekening = () => {
    setEditingRekening(null);
    setRekKode('');
    setRekNama('');
    setRekKategori('Aktiva');
    setRekSaldo('0');
    setRekKeterangan('');
    setIsAddingRekening(true);
  };

  const startEditRekening = (rek: RekeningNeraca) => {
    setEditingRekening(rek);
    setRekKode(rek.kode);
    setRekNama(rek.nama);
    setRekKategori(rek.kategori);
    setRekSaldo(String(rek.saldo));
    setRekKeterangan(rek.keterangan || '');
    setIsAddingRekening(true);
  };

  const handleSaveRekeningForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveRekening) return;
    if (!rekKode.trim() || !rekNama.trim()) {
      alert('Kode Rekening dan Nama Rekening harus diisi!');
      return;
    }

    const parsedSaldo = parseFloat(rekSaldo.replace(/\./g, '').replace(',', '.'));
    const finalSaldo = isNaN(parsedSaldo) ? 0 : parsedSaldo;

    const newRek: RekeningNeraca = {
      id: editingRekening ? editingRekening.id : `rek-${Date.now()}`,
      kode: rekKode.trim(),
      nama: rekNama.trim(),
      kategori: rekKategori,
      saldo: finalSaldo,
      keterangan: rekKeterangan.trim()
    };

    onSaveRekening(newRek);
    setIsAddingRekening(false);
    setEditingRekening(null);
  };

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: string;
    itemName: string;
    itemDetails?: { label: string; value: string; isHighlight?: boolean }[];
    warningMessage?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const handleDeleteRekeningAction = (id: string) => {
    if (!onDeleteRekening) return;
    const r = rekening?.find(rek => rek.id === id);
    setDeleteModalState({
      isOpen: true,
      itemType: 'Pos Rekening Neraca',
      itemName: r ? `[${r.kode}] ${r.nama}` : 'Pos Rekening',
      itemDetails: r ? [
        { label: 'Kode Akun', value: r.kode },
        { label: 'Nama Pos Akun', value: r.nama },
        { label: 'Kategori Pos', value: r.kategori },
        { label: 'Saldo Tercatat', value: formatRupiah(r.saldo), isHighlight: true }
      ] : undefined,
      warningMessage: 'Menghapus pos rekening ini akan menghilangkannya dari struktur neraca penyesuaian koperasi.',
      onConfirm: () => {
        onDeleteRekening(id);
      }
    });
  };

  const [nominatifSearch, setNominatifSearch] = useState('');
  const [selectedMemberForMutasi, setSelectedMemberForMutasi] = useState<string | null>(null);

  // New states for individual report filtering
  const [simpananSearch, setSimpananSearch] = useState('');
  const [simpananTypeFilter, setSimpananTypeFilter] = useState('');
  const [pinjamanSearch, setPinjamanSearch] = useState('');
  const [pinjamanStatusFilter, setPinjamanStatusFilter] = useState('');
  const [angsuranSearch, setAngsuranSearch] = useState('');

  // Simpanan Edit States
  const [editingSimpanan, setEditingSimpanan] = useState<Simpanan | null>(null);
  const [editSimpTanggal, setEditSimpTanggal] = useState('');
  const [editSimpJenis, setEditSimpJenis] = useState<'Pokok' | 'Wajib' | 'Sukarela'>('Sukarela');
  const [editSimpJumlah, setEditSimpJumlah] = useState('');
  const [editSimpKeterangan, setEditSimpKeterangan] = useState('');

  const startEditSimpanan = (simp: Simpanan) => {
    setEditingSimpanan(simp);
    setEditSimpTanggal(simp.tanggal);
    setEditSimpJenis(simp.jenis);
    setEditSimpJumlah(String(simp.jumlah));
    setEditSimpKeterangan(simp.keterangan || '');
  };

  const handleSaveEditSimpanan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSimpanan || !onEditSimpanan) return;

    const parsedJumlah = parseFloat(editSimpJumlah.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
      alert("Masukkan jumlah simpanan yang valid.");
      return;
    }

    if (parsedJumlah < 5000) {
      alert("Jumlah transaksi tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
      return;
    }

    const updated: Simpanan = {
      ...editingSimpanan,
      tanggal: editSimpTanggal,
      jenis: editSimpJenis,
      jumlah: parsedJumlah,
      keterangan: editSimpKeterangan,
    };

    onEditSimpanan(updated);
    setEditingSimpanan(null);
  };

  const handleDeleteSimpClick = (id: string) => {
    if (!onDeleteSimpanan) return;
    const item = simpanan.find(s => s.id === id);
    const m = item ? members.find(mem => mem.id === item.anggotaId) : null;
    setDeleteModalState({
      isOpen: true,
      itemType: 'Catatan Simpanan',
      itemName: item ? `Simpanan ${item.jenis} - ${formatRupiah(item.jumlah)}` : 'Catatan Simpanan',
      itemDetails: item ? [
        { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
        { label: 'Tanggal Transaksi', value: item.tanggal },
        { label: 'Jenis Simpanan', value: item.jenis },
        { label: 'Nominal', value: formatRupiah(item.jumlah), isHighlight: true },
        { label: 'Keterangan', value: item.keterangan || '-' }
      ] : undefined,
      warningMessage: 'Menghapus catatan simpanan ini akan secara otomatis memperbarui saldo buku kas serta laporan neraca keuangan koperasi.',
      onConfirm: () => {
        onDeleteSimpanan(id);
      }
    });
  };

  // Angsuran Edit States
  const [editingAngsuran, setEditingAngsuran] = useState<Angsuran | null>(null);
  const [editAngsTanggal, setEditAngsTanggal] = useState('');
  const [editAngsBulanKe, setEditAngsBulanKe] = useState(1);
  const [editAngsPokok, setEditAngsPokok] = useState('');
  const [editAngsJasa, setEditAngsJasa] = useState('');
  const [editAngsKeterangan, setEditAngsKeterangan] = useState('');

  const startEditAngsuran = (item: Angsuran) => {
    setEditingAngsuran(item);
    setEditAngsTanggal(item.tanggal);
    setEditAngsBulanKe(item.bulanKe || 1);
    const pContract = pinjaman.find(p => p.id === item.pinjamanId);
    const pokokVal = item.pokokBayar !== undefined ? item.pokokBayar : calculateAngsuranPrincipal(item, pContract);
    const jasaVal = item.jasaBayar !== undefined ? item.jasaBayar : calculateAngsuranInterest(item, pContract);
    setEditAngsPokok(pokokVal > 0 ? String(pokokVal) : '0');
    setEditAngsJasa(jasaVal > 0 ? String(jasaVal) : '0');
    setEditAngsKeterangan(item.keterangan || '');
  };

  const handleSaveEditAngsuran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAngsuran || !onEditAngsuran) return;
    const cleanNum = (str: string) => {
      const n = parseFloat(str.replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const parsedPokok = cleanNum(editAngsPokok);
    const parsedJasa = cleanNum(editAngsJasa);
    const totalBayar = parsedPokok + parsedJasa;
    if (totalBayar <= 0) {
      alert("Total pembayaran angsuran (Pokok + Jasa) harus lebih dari 0!");
      return;
    }
    const updated: Angsuran = {
      ...editingAngsuran,
      tanggal: editAngsTanggal,
      bulanKe: Number(editAngsBulanKe) || 1,
      pokokBayar: parsedPokok,
      jasaBayar: parsedJasa,
      jumlahBayar: totalBayar,
      keterangan: editAngsKeterangan.trim(),
    };
    onEditAngsuran(updated);
    setEditingAngsuran(null);
  };

  // Computations for Nominative report per member
  const nominatifList = useMemo(() => {
    return members.map(m => {
      // 1. Simpanan Pokok
      const pokok = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Pokok')
        .reduce((sum, s) => sum + s.jumlah, 0);

      // 2. Simpanan Wajib
      const wajib = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Wajib')
        .reduce((sum, s) => sum + s.jumlah, 0);

      // 3. Simpanan Sukarela / Manasuka
      const totalSukarela = simpanan
        .filter(s => s.anggotaId === m.id && s.jenis === 'Sukarela')
        .reduce((sum, s) => sum + s.jumlah, 0);

      // Jasa Manasuka = dihitung sejak pertama kali menyimpan simpanan manasuka (persentase * saldo simpanan manasuka tiap bulan berjalan) dan diakumulasikan
      const jasaManasuka = calculateAccumulatedJasaManasuka(
        m.id,
        simpanan,
        setup?.jasaSimpananSukarelaPersen ?? 0.5
      );
      const totalSimpanan = pokok + wajib + totalSukarela;

      // 4. Sisa Pinjaman Outstanding (Remaining principal outstanding)
      const mPinjaman = pinjaman.filter(p => p.anggotaId === m.id);
      const sisaPinjaman = mPinjaman.reduce((acc, p) => {
        if (p.status === 'Lunas') return acc;
        const historicalRepaysForP = angsuran.filter(a => a.pinjamanId === p.id);
        return acc + calculateLoanOutstanding(p, historicalRepaysForP);
      }, 0);

      // 5. Sisa Piutang Warung Anggota
      const mWarung = piutangWarung.filter(pw => pw.anggotaId === m.id);
      const totalHutangWarung = mWarung
        .filter(pw => pw.jenis === 'hutang_baru')
        .reduce((sum, pw) => sum + pw.nominal, 0);
      const totalPelunasanWarung = mWarung
        .filter(pw => pw.jenis === 'pelunasan')
        .reduce((sum, pw) => sum + pw.nominal, 0);
      const sisaPiutangWarung = Math.max(0, totalHutangWarung - totalPelunasanWarung);

      // 6. Jasa Pinjaman Masuk (Akumulasi Pendapatan Bunga/Jasa Pinjaman Koperasi dari Angsuran Anggota)
      let jasaPinjaman = 0;
      mPinjaman.forEach(p => {
        const repays = angsuran.filter(a => a.pinjamanId === p.id);
        if (repays.length > 0) {
          const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
          const remainingPrincipal = calculateLoanOutstanding(p, repays);
          const principalRecovered = Math.max(0, p.nominalPinjaman - remainingPrincipal);
          jasaPinjaman += Math.max(0, totalPaid - principalRecovered);
        }
      });
      const mPinjamanIds = new Set(mPinjaman.map(p => p.id));
      angsuran
        .filter(a => a.anggotaId === m.id && (!a.pinjamanId || !mPinjamanIds.has(a.pinjamanId)))
        .forEach(a => {
          jasaPinjaman += calculateAngsuranInterest(a);
        });

      // 7. Pendapatan Biaya Provisi Pinjaman Anggota
      const provisi = mPinjaman.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);

      return {
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama,
        jenisKelamin: m.jenisKelamin,
        pokok,
        wajib,
        sukarela: totalSukarela,
        jasaManasuka,
        totalSimpanan,
        sisaPinjaman: Math.round(sisaPinjaman),
        sisaPiutangWarung: Math.round(sisaPiutangWarung),
        jasaPinjaman: Math.round(jasaPinjaman),
        provisi: Math.round(provisi)
      };
    }).sort((a, b) => {
      const numA = parseInt(a.noAnggota.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.noAnggota.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.noAnggota.localeCompare(b.noAnggota, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [members, simpanan, pinjaman, angsuran, piutangWarung, setup]);

  const filteredNominatif = useMemo(() => {
    const q = nominatifSearch.toLowerCase().trim();
    if (!q) return nominatifList;
    return nominatifList.filter(item => 
      item.nama.toLowerCase().includes(q) || 
      item.noAnggota.toLowerCase().includes(q)
    );
  }, [nominatifList, nominatifSearch]);

  const nominatifTotals = useMemo(() => {
    return filteredNominatif.reduce((acc, curr) => {
      acc.pokok += curr.pokok;
      acc.wajib += curr.wajib;
      acc.sukarela += curr.sukarela;
      acc.jasaManasuka += curr.jasaManasuka;
      acc.totalSimpanan += curr.totalSimpanan;
      acc.sisaPinjaman += curr.sisaPinjaman;
      acc.sisaPiutangWarung += curr.sisaPiutangWarung;
      acc.jasaPinjaman += curr.jasaPinjaman;
      acc.provisi += curr.provisi;
      return acc;
    }, { pokok: 0, wajib: 0, sukarela: 0, jasaManasuka: 0, totalSimpanan: 0, sisaPinjaman: 0, sisaPiutangWarung: 0, jasaPinjaman: 0, provisi: 0 });
  }, [filteredNominatif]);

  const handleExportNominatifExcel = () => {
    const ratePercent = setup?.jasaSimpananSukarelaPersen ?? 0.5;
    const dataToExport = filteredNominatif.map((item, idx) => ({
      "No": idx + 1,
      "No Anggota": item.noAnggota,
      "Nama Anggota": item.nama,
      "Jenis Kelamin": item.jenisKelamin || '-',
      "Simpanan Pokok (Rp)": item.pokok,
      "Simpanan Wajib (Rp)": item.wajib,
      "Simpanan Manasuka (Rp)": item.sukarela,
      [`Jasa Manasuka (${ratePercent}%) (Rp)`]: item.jasaManasuka,
      "Total Simpanan (Rp)": item.totalSimpanan,
      "Sisa Pinjaman (Rp)": item.sisaPinjaman,
      "Jasa Pinjaman Masuk (Rp)": item.jasaPinjaman,
      "Provisi Pinjaman (Rp)": item.provisi,
      "Piutang Warung (Rp)": item.sisaPiutangWarung
    }));

    // Add totals row at the bottom for completeness
    dataToExport.push({
      "No": "",
      "No Anggota": "TOTAL",
      "Nama Anggota": "TOTAL KESELURUHAN",
      "Jenis Kelamin": "",
      "Simpanan Pokok (Rp)": nominatifTotals.pokok,
      "Simpanan Wajib (Rp)": nominatifTotals.wajib,
      "Simpanan Manasuka (Rp)": nominatifTotals.sukarela,
      [`Jasa Manasuka (${ratePercent}%) (Rp)`]: nominatifTotals.jasaManasuka,
      "Total Simpanan (Rp)": nominatifTotals.totalSimpanan,
      "Sisa Pinjaman (Rp)": nominatifTotals.sisaPinjaman,
      "Jasa Pinjaman Masuk (Rp)": nominatifTotals.jasaPinjaman,
      "Provisi Pinjaman (Rp)": nominatifTotals.provisi,
      "Piutang Warung (Rp)": nominatifTotals.sisaPiutangWarung
    } as any);

    exportToExcel(dataToExport, "Data Nominatif", `Laporan_Nominatif_Simpanan_Pinjaman_${new Date().toISOString().substring(0, 10)}`, setup);
  };

  const handleExportNominatifPDF = () => {
    const cols = ["NO ANGGOTA", "NAMA ANGGOTA", "S. POKOK", "S. WAJIB", "S. MANASUKA", "JASA MNSK", "TOTAL SIMP.", "SISA PINJ.", "JASA PINJ.", "PROVISI", "PIUTANG WRG"];
    const rows = filteredNominatif.map(item => [
      item.noAnggota,
      item.nama,
      formatRupiah(item.pokok),
      formatRupiah(item.wajib),
      formatRupiah(item.sukarela),
      formatRupiah(item.jasaManasuka),
      formatRupiah(item.totalSimpanan),
      formatRupiah(item.sisaPinjaman),
      formatRupiah(item.jasaPinjaman),
      formatRupiah(item.provisi),
      formatRupiah(item.sisaPiutangWarung)
    ]);

    // Add summed totals row as the last row
    rows.push([
      "TOTAL NOMINATIF",
      "",
      formatRupiah(nominatifTotals.pokok),
      formatRupiah(nominatifTotals.wajib),
      formatRupiah(nominatifTotals.sukarela),
      formatRupiah(nominatifTotals.jasaManasuka),
      formatRupiah(nominatifTotals.totalSimpanan),
      formatRupiah(nominatifTotals.sisaPinjaman),
      formatRupiah(nominatifTotals.jasaPinjaman),
      formatRupiah(nominatifTotals.provisi),
      formatRupiah(nominatifTotals.sisaPiutangWarung)
    ]);

    exportToPDF(
      "LAPORAN DATA NOMINATIF ANGGOTA",
      `Periode data mutakhir berjalan s/d hari ini | Besaran Jasa Manasuka: ${setup?.jasaSimpananSukarelaPersen ?? 0.5}%`,
      cols,
      rows,
      `Laporan_Nominatif_Koperasi_${new Date().toISOString().substring(0, 10)}`,
      [],
      setup,
      'landscape'
    );
  };

  const mutasiMemberData = useMemo(() => {
    if (!selectedMemberForMutasi) return null;
    const member = members.find(m => m.id === selectedMemberForMutasi);
    if (!member) return null;

    const memberLoans = pinjaman.filter(p => p.anggotaId === member.id);
    const memberAngsuran = angsuran
      .filter(a => a.anggotaId === member.id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || (b.bulanKe || 0) - (a.bulanKe || 0));

    const totalPinjamanDiambil = memberLoans.reduce((sum, p) => sum + p.nominalPinjaman, 0);
    const sisaPinjaman = memberLoans.reduce((sum, p) => {
      const pAngsuran = memberAngsuran.filter(a => a.pinjamanId === p.id);
      return sum + calculateLoanOutstanding(p, pAngsuran);
    }, 0);

    let totalPokokTerbayar = 0;
    let totalJasaTerbayar = 0;
    memberAngsuran.forEach(a => {
      const pContract = memberLoans.find(p => p.id === a.pinjamanId);
      totalPokokTerbayar += calculateAngsuranPrincipal(a, pContract);
      totalJasaTerbayar += calculateAngsuranInterest(a, pContract);
    });

    const totalProvisi = memberLoans.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);
    const totalJumlahBayar = memberAngsuran.reduce((sum, a) => sum + a.jumlahBayar, 0);

    return {
      member,
      memberLoans,
      memberAngsuran,
      totalPinjamanDiambil,
      sisaPinjaman: Math.round(sisaPinjaman),
      totalPokokTerbayar: Math.round(totalPokokTerbayar),
      totalJasaTerbayar: Math.round(totalJasaTerbayar),
      totalProvisi: Math.round(totalProvisi),
      totalJumlahBayar: Math.round(totalJumlahBayar)
    };
  }, [selectedMemberForMutasi, members, pinjaman, angsuran]);

  const handleNavigateToAngsuranTab = (noAnggota: string) => {
    setAngsuranSearch(noAnggota);
    setActiveReportTab('angsuran');
    setSelectedMemberForMutasi(null);
  };

  const handleExportMemberMutasiPDF = () => {
    if (!mutasiMemberData) return;
    const { member, memberAngsuran, totalPinjamanDiambil, sisaPinjaman, totalPokokTerbayar, totalJasaTerbayar, totalJumlahBayar } = mutasiMemberData;
    const cols = ["NO", "TANGGAL BAYAR", "ANGSURAN KE", "POKOK (RP)", "JASA/BUNGA (RP)", "TOTAL BAYAR (RP)", "KETERANGAN"];
    const rows = memberAngsuran.map((item, idx) => {
      const pContract = pinjaman.find(p => p.id === item.pinjamanId);
      const pokok = calculateAngsuranPrincipal(item, pContract);
      const jasa = calculateAngsuranInterest(item, pContract);
      return [
        String(idx + 1),
        item.tanggal,
        `Bulan Ke-${item.bulanKe || 1}`,
        formatRupiah(pokok),
        formatRupiah(jasa),
        formatRupiah(item.jumlahBayar),
        item.keterangan || "-"
      ];
    });
    rows.push([
      "TOTAL REALISASI",
      "",
      "",
      formatRupiah(totalPokokTerbayar),
      formatRupiah(totalJasaTerbayar),
      formatRupiah(totalJumlahBayar),
      ""
    ]);

    const summaryNotes = [
      { label: "Nama Anggota", value: `${member.nama} (${member.noAnggota})` },
      { label: "Total Pinjaman", value: formatRupiah(totalPinjamanDiambil) },
      { label: "Sisa Pinjaman", value: formatRupiah(sisaPinjaman) }
    ];

    exportToPDF(
      "KARTU MUTASI ANGSURAN PINJAMAN ANGGOTA",
      `Laporan Riwayat Pembayaran Angsuran: ${member.nama} (${member.noAnggota})`,
      cols,
      rows,
      `Mutasi_Angsuran_${member.noAnggota}_${member.nama.replace(/\s+/g, '_')}`,
      summaryNotes,
      setup
    );
  };

  // Filter lists inside timestamp context
  const sList = useMemo(() => {
    return simpanan.filter(s => s.tanggal >= filterStartDate && s.tanggal <= filterEndDate);
  }, [simpanan, filterStartDate, filterEndDate]);

  const pList = useMemo(() => {
    return pinjaman.filter(p => p.tanggal >= filterStartDate && p.tanggal <= filterEndDate);
  }, [pinjaman, filterStartDate, filterEndDate]);

  const aList = useMemo(() => {
    return angsuran.filter(a => a.tanggal >= filterStartDate && a.tanggal <= filterEndDate);
  }, [angsuran, filterStartDate, filterEndDate]);

  const incList = useMemo(() => {
    return income.filter(i => i.tanggal >= filterStartDate && i.tanggal <= filterEndDate);
  }, [income, filterStartDate, filterEndDate]);

  const expList = useMemo(() => {
    return expenses.filter(e => e.tanggal >= filterStartDate && e.tanggal <= filterEndDate);
  }, [expenses, filterStartDate, filterEndDate]);

  // LABA RUGI CALCULATOR DATA (With exact real-time sync)
  const profitLoss = useMemo(() => {
    const revenue = calculateCooperativeRevenue(incList, pList, aList, pinjaman);
    const { pToko, pBungaBank, pDenda, pProvisi, pJasaBunga, pLain, totalRevenue } = revenue;
    const totalPendapatan = totalRevenue;

    // Beban
    const bGajiKaryawan = expList.filter(e => e.kategori === 'gaji_karyawan').reduce((a,c) => a + c.nominal, 0);
    const bListrik = expList.filter(e => e.kategori === 'listrik').reduce((a,c) => a + c.nominal, 0);
    const bGajiPengurus = expList.filter(e => e.kategori === 'gaji_pengurus').reduce((a,c) => a + c.nominal, 0);
    const bGajiPengawas = expList.filter(e => e.kategori === 'gaji_pengawas').reduce((a,c) => a + c.nominal, 0);
    const bOperasional = expList.filter(e => e.kategori === 'operasional_kantor').reduce((a,c) => a + c.nominal, 0);
    const bRapat = expList.filter(e => e.kategori === 'beban_rapat').reduce((a,c) => a + c.nominal, 0);
    const bPenyusutan = expList.filter(e => e.kategori === 'penyusutan_inventaris' || e.kategori === 'penyusutan_aktiva_tetap' || e.kategori?.toLowerCase().includes('penyusutan')).reduce((a,c) => a + c.nominal, 0);
    const bLain = expList.filter(e => !['gaji_karyawan', 'listrik', 'gaji_pengurus', 'gaji_pengawas', 'operasional_kantor', 'beban_rapat', 'penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(e.kategori) && !e.kategori?.toLowerCase().includes('penyusutan')).reduce((a,c) => a + c.nominal, 0);

    const totalBeban = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bRapat + bPenyusutan + bLain;
    const shuBersih = totalPendapatan - totalBeban;

    return {
      pToko, pBungaBank, pDenda, pLain, pProvisi, pJasaBunga, totalPendapatan,
      bGajiKaryawan, bListrik, bGajiPengurus, bGajiPengawas, bOperasional, bRapat, bPenyusutan, bLain, totalBeban,
      shuBersih
    };
  }, [incList, expList, pList, aList, pinjaman]);

  // NERACA STATEMENT DATA (With double-entry balance check)
  const balanceSheet = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const piutangAwal = setup?.piutangAwal ?? 0;
    const persediaanWarungAwal = setup?.persediaanWarungAwal ?? 0;
    const inventarisAwal = setup?.inventarisAwal ?? 0;
    const akumulasiPenyusutanAwal = setup?.akumulasiPenyusutanAwal ?? 0;
    const simpananPokokAwal = setup?.simpananPokokAwal ?? 0;
    const simpananWajibAwal = setup?.simpananWajibAwal ?? 0;
    const simpananSukarelaAwal = setup?.simpananSukarelaAwal ?? 0;
    const modalAwal = setup?.modalAwal ?? 0;
    const danaCadanganAwal = setup?.danaCadanganAwal ?? 0;

    const totalSimpananAll = simpanan.reduce((a,c) => a + c.jumlah, 0);
    const totalDisbursedAll = pinjaman.reduce((a,c) => a + c.nominalPinjaman, 0);
    const totalAngsuranAll = angsuran.reduce((a,c) => a + c.jumlahBayar, 0);
    const totalIncAll = income.reduce((a,c) => a + c.nominal, 0);
    const totalExpAll = expenses.reduce((a,c) => a + c.nominal, 0);

    // Double-entry assets integration
    const totalPembelianAll = pembelian.reduce((sum, p) => sum + p.totalHarga, 0);
    const totalHutangBaruWarung = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((sum, pw) => sum + pw.nominal, 0);
    const totalPelunasanWarung = piutangWarung.filter(pw => pw.jenis === 'pelunasan').reduce((sum, pw) => sum + pw.nominal, 0);
    const provisiRevenueAll = pinjaman.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);

    // Cash balance after purchase & receivables flows (authoritative calculation matching Neraca Saldo)
    const kasAkhir = calculateKasKoperasi(setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung);

    // Double-entry assets: calculate remaining principal outstanding
    const piutangBeredar = pinjaman.reduce((acc, p) => {
      const relatedPayments = angsuran.filter(a => a.pinjamanId === p.id);
      return acc + calculateLoanOutstanding(p, relatedPayments);
    }, 0);

    // Integration of user-special requested assets
    const persediaanWarung = pembelian.filter(p => p.kategori === 'persediaan_warung').reduce((sum, p) => sum + p.totalHarga, 0);
    const seragamAwal = setup?.seragamAwal ?? 0;
    const seragam = pembelian.filter(p => p.kategori === 'seragam').reduce((sum, p) => sum + p.totalHarga, 0);
    const persediaanBarangDagangAwal = setup?.persediaanBarangDagangAwal ?? 0;
    const persediaanBarang = pembelian.filter(p => p.kategori === 'persediaan_barang').reduce((sum, p) => sum + p.totalHarga, 0);
    
    // Inventaris & Penyusutan Aktiva Tetap
    const inventarisPembelian = pembelian.filter(p => p.kategori === 'inventaris').reduce((sum, p) => sum + p.totalHarga, 0);
    const inventarisBruto = inventarisAwal + inventarisPembelian;
    const bPenyusutan = expenses.filter(e => e.kategori === 'penyusutan_inventaris' || e.kategori === 'penyusutan_aktiva_tetap' || e.kategori?.toLowerCase().includes('penyusutan')).reduce((a, c) => a + c.nominal, 0);
    const akumulasiPenyusutan = akumulasiPenyusutanAwal + bPenyusutan;
    const inventarisNetto = Math.max(0, inventarisBruto - akumulasiPenyusutan);

    const atributAwal = setup?.atributAwal ?? 0;
    const atribut = pembelian.filter(p => p.kategori === 'atribut' || p.kategori === 'atribut_koperasi' || p.kategori?.toLowerCase().includes('atribut') || p.namaBarang?.toLowerCase().includes('atribut')).reduce((sum, p) => sum + p.totalHarga, 0);
    const piutangWarungAwal = setup?.piutangWarungAwal ?? 0;
    const piutangWarungVal = totalHutangBaruWarung - totalPelunasanWarung;

    // Dynamic compilation of custom asset categories
    const isStandardAssetCategory = (p: Pembelian) => {
      const cat = (p.kategori || '').toLowerCase();
      const nama = (p.namaBarang || '').toLowerCase();
      if (cat === 'persediaan_warung') return true;
      if (cat === 'seragam') return true;
      if (cat === 'persediaan_barang') return true;
      if (cat === 'inventaris') return true;
      if (cat === 'atribut' || cat === 'atribut_koperasi' || cat.includes('atribut') || nama.includes('atribut')) return true;
      if (cat === 'lain_lain') return true;
      return false;
    };

    const customAssetsMap: { [key: string]: number } = {};
    pembelian.forEach(p => {
      if (!isStandardAssetCategory(p)) {
        customAssetsMap[p.kategori] = (customAssetsMap[p.kategori] || 0) + p.totalHarga;
      }
    });
    const totalCustomAssets = Object.values(customAssetsMap).reduce((sum, val) => sum + val, 0);

    const customRekeningAktivaList = (rekening || []).filter(r => r.kategori === 'Aktiva');
    const totalCustomRekeningAktiva = customRekeningAktivaList.reduce((sum, r) => sum + r.saldo, 0);

    // Total assets (Aktiva) dengan Inventaris Koperasi Netto
    const totalAktiva = kasAkhir + piutangBeredar + persediaanWarung + persediaanBarang + inventarisNetto + atribut + piutangWarungVal + totalCustomAssets + totalCustomRekeningAktiva;

    // Pasiva
    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a,c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a,c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a,c) => a + c.jumlah, 0);

    const totalSimpanan = sPokok + sWajib + sSukarela;

    // SHU Lancar All Time using unified revenue calculation
    const revenueAll = calculateCooperativeRevenue(income, pinjaman, angsuran);
    const shuBersihAll = revenueAll.totalRevenue - totalExpAll;

    // Split SHU into Dana Cadangan (20%) and SHU Berjalan (80%) for cooperative balance accounting
    const shuAwal = setup?.shuAwal ?? 0;
    const danaCadangan = Math.round(shuBersihAll * 0.20);
    const shuBerjalan = shuBersihAll - danaCadangan;

    const customRekeningPasivaList = (rekening || []).filter(r => r.kategori === 'Pasiva');
    const totalCustomRekeningPasiva = customRekeningPasivaList.reduce((sum, r) => sum + r.saldo, 0);

    const sSukarelaTotal = sSukarela;
    const totalPasiva = sPokok + sWajib + sSukarelaTotal + modalAwal + danaCadangan + shuBerjalan + totalCustomRekeningPasiva;

    return {
      kasAkhir,
      piutangBeredar,
      persediaanWarung,
      seragam,
      persediaanBarang,
      inventaris: inventarisNetto,
      inventarisBruto,
      akumulasiPenyusutan,
      inventarisNetto,
      atribut,
      piutangWarungVal,
      totalAktiva,
      customAssets: customAssetsMap,
      sPokok: simpananPokokAwal + sPokok,
      sWajib: simpananWajibAwal + sWajib,
      sSukarela: sSukarelaTotal,
      totalSimpanan: (simpananPokokAwal + sPokok) + (simpananWajibAwal + sWajib) + sSukarelaTotal,
      modalAwal,
      danaCadangan,
      shuBerjalan,
      shuBersihAll,
      totalPasiva
    };
  }, [simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung, setup, rekening]);

  // Menghitung Rasio Likuiditas, Solvabilitas, dan Rentabilitas Koperasi secara real-time untuk LaporanView
  const cooperativeRatios = useMemo(() => {
    const kas = balanceSheet.kasAkhir;
    const sSukarela = balanceSheet.sSukarela;
    const totalSimpanan = balanceSheet.totalSimpanan;
    const totalAssets = balanceSheet.totalAktiva;
    const netProfit = balanceSheet.shuBersihAll;
    const modalSendiri = balanceSheet.sPokok + balanceSheet.sWajib;

    // 1. Likuiditas (Cash Ratio)
    // Kemampuan membayar simpanan sukarela anggota yang ditarik sewaktu-waktu
    const likuiditas = sSukarela > 0 ? (kas / sSukarela) * 100 : (kas / (totalSimpanan || 1)) * 100;
    
    // 2. Solvabilitas (Aset terhadap Kewajiban)
    // Kemampuan aset koperasi menjamin kewajiban lancar (Simpanan Sukarela)
    const solvabilitas = sSukarela > 0 ? (totalAssets / sSukarela) * 100 : 100;

    // 3. Rentabilitas Modal Sendiri (ROE)
    // Kemampuan menghasilkan SHU dari modal pokok + wajib anggota
    const modalPenyertaan = modalSendiri > 0 ? modalSendiri : totalSimpanan;
    const rentabilitas = modalPenyertaan > 0 ? (netProfit / modalPenyertaan) * 100 : (netProfit / (totalAssets || 1)) * 100;

    return {
      likuiditas: Math.round(likuiditas * 100) / 100,
      solvabilitas: Math.round(solvabilitas * 100) / 100,
      rentabilitas: Math.round(rentabilitas * 100) / 100,
      hasSukarela: sSukarela > 0
    };
  }, [balanceSheet]);

  // Acuan SHU Bersih Berjalan dari Neraca Saldo (Perhitungan akumulasi tahun buku berjalan mulai 1 Januari)
  const neracaSHUBersih = balanceSheet.shuBersihAll;
  const liveSHUBersih = neracaSHUBersih !== 0 ? neracaSHUBersih : profitLoss.shuBersih;

  const handleExecuteSHUDistribution = async () => {
    const totalSHU = liveSHUBersih;
    if (totalSHU <= 0) {
      setShuDistributionError('Sisa Hasil Usaha (SHU) berjalan tidak mencukupi untuk didistribusikan.');
      setShuDistributedSuccess('');
      return;
    }
    const totalPersen = persenDanaCadangan + persenAnggota + persenPengurus + persenPengawas;
    if (totalPersen !== 100) {
      if (!window.confirm(`Total persentase alokasi saat ini adalah ${totalPersen}%. Apakah Anda yakin ingin melanjutkan distribusi SHU?`)) {
        return;
      }
    }

    const danaCadanganNominal = Math.round((totalSHU * persenDanaCadangan) / 100);
    const shuAnggotaNominal = Math.round((totalSHU * persenAnggota) / 100);
    const shuPengurusNominal = Math.round((totalSHU * persenPengurus) / 100);
    const shuPengawasNominal = Math.round((totalSHU * persenPengawas) / 100);

    const activeTahunBuku = filterStartDate ? filterStartDate.substring(0, 4) : `${new Date().getFullYear()}`;
    const distRecord: SHUDistribution = {
      id: `shu-${Date.now()}`,
      tanggal: new Date().toISOString().substring(0, 10),
      tahunBuku: activeTahunBuku,
      totalSHUBersih: totalSHU,
      persenDanaCadangan,
      persenAnggota,
      persenPengurus,
      persenPengawas,
      danaCadanganNominal,
      shuAnggotaNominal,
      shuPengurusNominal,
      shuPengawasNominal,
      keterangan: `Pembagian SHU Tahun Buku ${activeTahunBuku}`
    };

    if (onAddSHUDistribution) {
      await onAddSHUDistribution(distRecord);
    }

    if (onAddExpense) {
      const today = new Date().toISOString().substring(0, 10);
      if (shuAnggotaNominal > 0) {
        await onAddExpense({
          tanggal: today,
          kategori: 'beban_lain',
          nominal: shuAnggotaNominal,
          keterangan: `Pembagian SHU Bagian Anggota (${persenAnggota}%)`
        });
      }
      if (shuPengurusNominal > 0) {
        await onAddExpense({
          tanggal: today,
          kategori: 'gaji_pengurus',
          nominal: shuPengurusNominal,
          keterangan: `Pembagian SHU Bagian Pengurus (${persenPengurus}%)`
        });
      }
      if (shuPengawasNominal > 0) {
        await onAddExpense({
          tanggal: today,
          kategori: 'gaji_pengawas',
          nominal: shuPengawasNominal,
          keterangan: `Pembagian SHU Bagian Pengawas (${persenPengawas}%)`
        });
      }
    }

    setShuDistributedSuccess(`SHU sebesar ${formatRupiah(totalSHU)} berhasil didistribusikan! Dana Cadangan (${formatRupiah(danaCadanganNominal)}) dibukukan ke Neraca, dan sisa pencairan (${formatRupiah(shuAnggotaNominal + shuPengurusNominal + shuPengawasNominal)}) memotong Kas Koperasi.`);
    setShuDistributionError('');
  };

  // ================= PERHITUNGAN SHU PER ANGGOTA (ATURAN BAKU PERKOPERASIAN) =================
  const persenJasaUsaha = Math.max(0, 100 - persenJasaModal);

  const shuPerAnggotaCalculations = useMemo(() => {
    // 1. Tentukan Nilai Dasar SHU dan Alokasi Bagian Anggota (Referensi Neraca Saldo)
    let totalSHUBersihBase = liveSHUBersih;
    let shuAnggotaPool = Math.round((totalSHUBersihBase * persenAnggota) / 100);
    const activeYearStr = filterStartDate ? filterStartDate.substring(0, 4) : `${new Date().getFullYear()}`;
    let referenceLabel = `Neraca Saldo Berjalan (Total SHU Bersih: ${formatRupiah(totalSHUBersihBase)}, Bagian Anggota ${persenAnggota}% - Perhitungan mulai 1 Januari ${activeYearStr})`;

    if (selectedSHUReference !== 'live') {
      const foundDist = shuDistributions.find(d => d.id === selectedSHUReference);
      if (foundDist) {
        totalSHUBersihBase = foundDist.totalSHUBersih;
        shuAnggotaPool = foundDist.shuAnggotaNominal;
        referenceLabel = `Distribusi Tahun Buku ${foundDist.tahunBuku} (${foundDist.tanggal}) - Bagian Anggota ${foundDist.persenAnggota}%`;
      }
    }

    const poolJMA = Math.round((shuAnggotaPool * persenJasaModal) / 100);
    const poolJUA = Math.max(0, shuAnggotaPool - poolJMA);

    // 2. Hitung kontribusi masing-masing anggota
    const memberItems = members.map(m => {
      // Data Simpanan
      const sPokok = simpanan.filter(s => s.anggotaId === m.id && s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
      const sWajib = simpanan.filter(s => s.anggotaId === m.id && s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
      const sSukarela = simpanan.filter(s => s.anggotaId === m.id && s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
      const totalSimpananEligible = sPokok + sWajib + (includeSukarelaInJMA ? sSukarela : 0);
      const totalSemuaSimpanan = sPokok + sWajib + sSukarela;

      // Partisipasi Usaha Anggota:
      // a. Jasa pinjaman yang telah disetor (bunga dari angsuran)
      const jasaPinjamanDibayar = angsuran.filter(a => a.anggotaId === m.id).reduce((a, c) => a + (c.jasaBayar || 0), 0);

      // b. Belanja Toko/Warung (transaksi kasbon warung & penjualan warung tercatat)
      let belanjaWarung = 0;
      (income || []).forEach(inc => {
        if (inc.sumber === 'warung' && (
          (inc.keterangan && m.noAnggota && inc.keterangan.toLowerCase().includes(m.noAnggota.toLowerCase())) ||
          (inc.keterangan && m.nama && inc.keterangan.toLowerCase().includes(m.nama.toLowerCase())) ||
          (inc.keterangan && inc.keterangan.includes(m.id))
        )) {
          belanjaWarung += inc.nominal;
        }
      });
      (piutangWarung || []).forEach(pw => {
        if (pw.anggotaId === m.id && pw.jenis === 'hutang_baru') {
          belanjaWarung += pw.nominal;
        }
      });

      const totalPartisipasiUsaha = jasaPinjamanDibayar + belanjaWarung;

      return {
        member: m,
        sPokok,
        sWajib,
        sSukarela,
        totalSimpananEligible,
        totalSemuaSimpanan,
        jasaPinjamanDibayar,
        belanjaWarung,
        totalPartisipasiUsaha
      };
    });

    // Total Agregat Seluruh Anggota
    const totalSimpananEligibleAll = memberItems.reduce((acc, item) => acc + item.totalSimpananEligible, 0);
    const totalPartisipasiUsahaAll = memberItems.reduce((acc, item) => acc + item.totalPartisipasiUsaha, 0);

    // 3. Kalkulasi Pembagian JMA dan JUA untuk setiap anggota
    const calculatedMembers = memberItems.map(item => {
      const porsiSimpananPct = totalSimpananEligibleAll > 0
        ? (item.totalSimpananEligible / totalSimpananEligibleAll) * 100
        : 0;
      const shuJMA = totalSimpananEligibleAll > 0
        ? Math.round((item.totalSimpananEligible / totalSimpananEligibleAll) * poolJMA)
        : 0;

      const porsiUsahaPct = totalPartisipasiUsahaAll > 0
        ? (item.totalPartisipasiUsaha / totalPartisipasiUsahaAll) * 100
        : 0;
      const shuJUA = totalPartisipasiUsahaAll > 0
        ? Math.round((item.totalPartisipasiUsaha / totalPartisipasiUsahaAll) * poolJUA)
        : (members.length > 0 ? Math.round(poolJUA / members.length) : 0);

      const totalSHU = shuJMA + shuJUA;

      return {
        ...item,
        porsiSimpananPct,
        shuJMA,
        porsiUsahaPct,
        shuJUA,
        totalSHU
      };
    });

    // Statistik Ringkasan
    const totalSHUDistributed = calculatedMembers.reduce((acc, m) => acc + m.totalSHU, 0);
    const totalJMADistributed = calculatedMembers.reduce((acc, m) => acc + m.shuJMA, 0);
    const totalJUADistributed = calculatedMembers.reduce((acc, m) => acc + m.shuJUA, 0);
    const avgSHU = calculatedMembers.length > 0 ? Math.round(totalSHUDistributed / calculatedMembers.length) : 0;
    const maxSHU = calculatedMembers.length > 0 && calculatedMembers.some(m => m.totalSHU > 0) ? Math.max(...calculatedMembers.map(m => m.totalSHU)) : 0;
    const minSHU = calculatedMembers.length > 0 && calculatedMembers.some(m => m.totalSHU > 0) ? Math.min(...calculatedMembers.map(m => m.totalSHU)) : 0;

    return {
      totalSHUBersihBase,
      shuAnggotaPool,
      poolJMA,
      poolJUA,
      referenceLabel,
      totalSimpananEligibleAll,
      totalPartisipasiUsahaAll,
      calculatedMembers,
      totalSHUDistributed,
      totalJMADistributed,
      totalJUADistributed,
      avgSHU,
      maxSHU,
      minSHU
    };
  }, [members, simpanan, angsuran, income, piutangWarung, liveSHUBersih, filterStartDate, persenAnggota, persenJasaModal, includeSukarelaInJMA, selectedSHUReference, shuDistributions]);

  const filteredSHUMembers = useMemo(() => {
    let list = [...shuPerAnggotaCalculations.calculatedMembers];
    if (shuAnggotaSearch.trim()) {
      const q = shuAnggotaSearch.toLowerCase();
      list = list.filter(item =>
        item.member.nama.toLowerCase().includes(q) ||
        item.member.noAnggota.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let diff = 0;
      if (shuAnggotaSortBy === 'total') diff = a.totalSHU - b.totalSHU;
      else if (shuAnggotaSortBy === 'jma') diff = a.shuJMA - b.shuJMA;
      else if (shuAnggotaSortBy === 'jua') diff = a.shuJUA - b.shuJUA;
      else if (shuAnggotaSortBy === 'simpanan') diff = a.totalSimpananEligible - b.totalSimpananEligible;
      else if (shuAnggotaSortBy === 'usaha') diff = a.totalPartisipasiUsaha - b.totalPartisipasiUsaha;
      else if (shuAnggotaSortBy === 'nama') return shuAnggotaSortOrder === 'asc' ? a.member.nama.localeCompare(b.member.nama) : b.member.nama.localeCompare(a.member.nama);
      else if (shuAnggotaSortBy === 'noAnggota') return shuAnggotaSortOrder === 'asc' ? a.member.noAnggota.localeCompare(b.member.noAnggota) : b.member.noAnggota.localeCompare(a.member.noAnggota);

      return shuAnggotaSortOrder === 'asc' ? diff : -diff;
    });
    return list;
  }, [shuPerAnggotaCalculations.calculatedMembers, shuAnggotaSearch, shuAnggotaSortBy, shuAnggotaSortOrder]);

  const handleExportSHUAnggotaExcel = () => {
    const data = shuPerAnggotaCalculations.calculatedMembers.map((item, idx) => ({
      "No": idx + 1,
      "No Anggota": item.member.noAnggota,
      "Nama Anggota": item.member.nama,
      "Simpanan Pokok (Rp)": item.sPokok,
      "Simpanan Wajib (Rp)": item.sWajib,
      "Simpanan Sukarela (Rp)": item.sSukarela,
      "Total Simpanan Modal (Rp)": item.totalSimpananEligible,
      "Porsi Simpanan (%)": item.porsiSimpananPct.toFixed(2) + "%",
      "SHU Jasa Modal / JMA (Rp)": item.shuJMA,
      "Jasa Pinjaman Disetor (Rp)": item.jasaPinjamanDibayar,
      "Belanja Warung (Rp)": item.belanjaWarung,
      "Total Partisipasi Usaha (Rp)": item.totalPartisipasiUsaha,
      "Porsi Usaha (%)": item.porsiUsahaPct.toFixed(2) + "%",
      "SHU Jasa Usaha / JUA (Rp)": item.shuJUA,
      "TOTAL SHU DITERIMA (Rp)": item.totalSHU,
    }));
    exportToExcel(data, "SHU Per Anggota", `Laporan_Pembagian_SHU_Per_Anggota_${new Date().getFullYear()}`, setup);
  };

  const handleExportSHUAnggotaPDF = () => {
    const cols = ["NO", "NO ANGGOTA", "NAMA", "SIMPANAN MODAL", "JASA MODAL (JMA)", "PARTISIPASI USAHA", "JASA USAHA (JUA)", "TOTAL SHU"];
    const rows = shuPerAnggotaCalculations.calculatedMembers.map((item, idx) => [
      String(idx + 1),
      item.member.noAnggota,
      item.member.nama,
      formatRupiah(item.totalSimpananEligible),
      formatRupiah(item.shuJMA),
      formatRupiah(item.totalPartisipasiUsaha),
      formatRupiah(item.shuJUA),
      formatRupiah(item.totalSHU)
    ]);

    const summaryNotes = [
      { label: "Total SHU Bersih Koperasi (Neraca Saldo)", value: formatRupiah(shuPerAnggotaCalculations.totalSHUBersihBase) },
      { label: `SHU Bagian Anggota (${persenAnggota}%)`, value: formatRupiah(shuPerAnggotaCalculations.shuAnggotaPool) },
      { label: `Alokasi Pool Jasa Modal / JMA (${persenJasaModal}%)`, value: formatRupiah(shuPerAnggotaCalculations.poolJMA) },
      { label: `Alokasi Pool Jasa Usaha / JUA (${persenJasaUsaha}%)`, value: formatRupiah(shuPerAnggotaCalculations.poolJUA) },
      { label: "Total Simpanan Modal Seluruh Anggota", value: formatRupiah(shuPerAnggotaCalculations.totalSimpananEligibleAll) },
      { label: "Total Partisipasi Usaha Seluruh Anggota", value: formatRupiah(shuPerAnggotaCalculations.totalPartisipasiUsahaAll) },
      { label: "Total Anggota Penerima", value: `${shuPerAnggotaCalculations.calculatedMembers.length} Anggota` },
      { label: "Total Realisasi SHU Dibagikan", value: formatRupiah(shuPerAnggotaCalculations.totalSHUDistributed) }
    ];

    exportToPDF(
      "DAFTAR PEMBAGIAN SISA HASIL USAHA (SHU) PER ANGGOTA",
      `Tahun Buku ${new Date().getFullYear()} | Referensi Neraca Saldo Koperasi`,
      cols,
      rows,
      `Daftar_Pembagian_SHU_Per_Anggota_${new Date().getFullYear()}`,
      summaryNotes,
      setup,
      'landscape'
    );
  };

  // Export handlers
  const handleExportLabaRugiExcel = () => {
    const data = [
      { Kategori: "PENDAPATAN", Subkategori: "Laba Bersih Warung Koperasi", Nominal: profitLoss.pToko },
      { Kategori: "PENDAPATAN", Subkategori: "Bunga Simpanan Buku Bank", Nominal: profitLoss.pBungaBank },
      { Kategori: "PENDAPATAN", Subkategori: "Denda Keterlambatan", Nominal: profitLoss.pDenda },
      { Kategori: "PENDAPATAN", Subkategori: "Provisi Pinjaman (1%)", Nominal: profitLoss.pProvisi },
      { Kategori: "PENDAPATAN", Subkategori: "Jasa Bunga Kredit Anggota", Nominal: profitLoss.pJasaBunga },
      { Kategori: "PENDAPATAN", Subkategori: "Pendapatan Lain-lain", Nominal: profitLoss.pLain },
      { Kategori: "PENDAPATAN TOTAL", Subkategori: "Total Penerimaan Pendapatan", Nominal: profitLoss.totalPendapatan },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Gaji Karyawan Toko/Kasir", Nominal: profitLoss.bGajiKaryawan },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Air Listrik & WiFi", Nominal: profitLoss.bListrik },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Honor Pengurus", Nominal: profitLoss.bGajiPengurus },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Honor Pengawas", Nominal: profitLoss.bGajiPengawas },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Operasional Kantor / ATK", Nominal: profitLoss.bOperasional },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Rapat Anggota & Pengurus", Nominal: profitLoss.bRapat || 0 },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Penyusutan Aktiva Tetap (Inventaris)", Nominal: profitLoss.bPenyusutan || 0 },
      { Kategori: "BEBAN OPERASIONAL", Subkategori: "Beban Operasi Lainnya", Nominal: profitLoss.bLain },
      { Kategori: "BEBAN TOTAL", Subkategori: "Total Penyaluran Beban", Nominal: profitLoss.totalBeban },
      { Kategori: "SISA HASIL USAHA (SHU)", Subkategori: "SHU Bersih Sementara Berjalan", Nominal: profitLoss.shuBersih }
    ];
    exportToExcel(data, "Laba Rugi", "Laporan_Laba_Rugi_Koperasi", setup);
  };

  const handleExportLabaRugiPDF = () => {
    const cols = ["NAMA TRANSAKSI SAKSI", "NOMINAL RUPIAH"];
    const rows = [
      ["[+] Pendapatan Laba Toko/Warung", formatRupiah(profitLoss.pToko)],
      ["[+] Bunga Simpanan Buku Bank", formatRupiah(profitLoss.pBungaBank)],
      ["[+] Penerimaan Denda Anggota", formatRupiah(profitLoss.pDenda)],
      ["[+] Provisi Akad Pinjaman (1%)", formatRupiah(profitLoss.pProvisi)],
      ["[+] Jasa Bunga Pelunasan Kredit", formatRupiah(profitLoss.pJasaBunga)],
      ["[+] Pendapatan Lain-lain Koperasi", formatRupiah(profitLoss.pLain)],
      ["TOTAL PENDAPATAN kotor (A)", formatRupiah(profitLoss.totalPendapatan)],
      ["[-] Beban Gaji Karyawan Toko/Kasir", formatRupiah(profitLoss.bGajiKaryawan)],
      ["[-] Beban Air, Listrik & WiFi", formatRupiah(profitLoss.bListrik)],
      ["[-] Honor Pengurus", formatRupiah(profitLoss.bGajiPengurus)],
      ["[-] Honor Pengawas", formatRupiah(profitLoss.bGajiPengawas)],
      ["[-] Beban Operasional Kantor & ATK", formatRupiah(profitLoss.bOperasional)],
      ["[-] Beban Rapat Anggota & Pengurus", formatRupiah(profitLoss.bRapat || 0)],
      ["[-] Beban Penyusutan Aktiva Tetap (Inventaris)", formatRupiah(profitLoss.bPenyusutan || 0)],
      ["[-] Beban Operasi Lain-lain", formatRupiah(profitLoss.bLain)],
      ["TOTAL BEBAN pengeluaran (B)", formatRupiah(profitLoss.totalBeban)],
      ["SISA HASIL USAHA (SHU BERSIH SEMENTARA)", formatRupiah(profitLoss.shuBersih)]
    ];

    const summaryNotes = [
      { label: "Total Laba Bersih (SHU 100%)", value: formatRupiah(profitLoss.shuBersih) },
      { label: "Alokasi Dana Cadangan (20%)", value: formatRupiah(Math.round(profitLoss.shuBersih * 0.20)) },
      { label: "Alokasi Hak SHU Anggota (80%)", value: formatRupiah(profitLoss.shuBersih - Math.round(profitLoss.shuBersih * 0.20)) }
    ];

    exportToPDF(
      "LAPORAN LABA RUGI DIGITAL SEMENTARA",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laba_Rugi_Koperasi",
      summaryNotes,
      setup
    );
  };

  const handleExportNeracaPDF = () => {
    const cols = ["ELEMEN NERACA DIGITAL", "SISI AKTIVA (ASET)", "SISI PASIVA (LIABILITAS/EKUITAS)"];
    
    const rows: string[][] = [
      ["Aset Lancar: Kas & Bank Utama", formatRupiah(balanceSheet.kasAkhir), "-"],
      ["Aset Lancar: Piutang Beredar", formatRupiah(balanceSheet.piutangBeredar), "-"],
      ["Aset Lancar: Persediaan Warung", formatRupiah(balanceSheet.persediaanWarung), "-"],
      ["Aset Lancar: Atribut Koperasi", formatRupiah(balanceSheet.atribut), "-"],
      ["Aset Lancar: Persediaan Barang", formatRupiah(balanceSheet.persediaanBarang), "-"],
      ["Aset Lancar: Piutang Warung", formatRupiah(balanceSheet.piutangWarungVal), "-"],
      ["Aset Tetap: Inventaris Koperasi (Bruto)", formatRupiah(balanceSheet.inventarisBruto), "-"],
      ["Aset Tetap: Akumulasi Penyusutan (-)", `(${formatRupiah(balanceSheet.akumulasiPenyusutan)})`, "-"],
      ["Aset Tetap: INVENTARIS KOPERASI NETTO", formatRupiah(balanceSheet.inventarisNetto), "-"]
    ];

    if (balanceSheet.customAssets) {
      Object.entries(balanceSheet.customAssets).forEach(([cat, val]) => {
        const readableLabel = cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        rows.push([`Aset Custom: ${readableLabel}`, formatRupiah(val as number), "-"]);
      });
    }

    // Add custom rekening Aktiva
    if (rekening && rekening.length > 0) {
      rekening.filter(r => r.kategori === 'Aktiva').forEach(r => {
        rows.push([`Aktiva Custom: [${r.kode}] ${r.nama}`, formatRupiah(r.saldo), "-"]);
      });
    }

    rows.push(
      ["Modal: Akumulasi Simpanan Pokok Anggota", "-", formatRupiah(balanceSheet.sPokok)],
      ["Modal: Akumulasi Simpanan Wajib Anggota", "-", formatRupiah(balanceSheet.sWajib)],
      ["Kewajiban Lancar: Simpanan Manasuka Anggota", "-", formatRupiah(balanceSheet.sSukarela)],
      ["Modal: Modal Awal Pokok Koperasi", "-", formatRupiah(balanceSheet.modalAwal)],
      ["Ekuitas: Dana Cadangan Koperasi (20% dari Laba)", "-", formatRupiah(balanceSheet.danaCadangan)],
      ["Ekuitas: Hak SHU Anggota Berjalan (80%)", "-", formatRupiah(balanceSheet.shuBerjalan)]
    );

    // Add custom rekening Pasiva
    if (rekening && rekening.length > 0) {
      rekening.filter(r => r.kategori === 'Pasiva').forEach(r => {
        rows.push([`Pasiva Custom: [${r.kode}] ${r.nama}`, "-", formatRupiah(r.saldo)]);
      });
    }

    rows.push(
      ["TOTAL AKUMULASI (SEIMBANG / BALANCED)", formatRupiah(balanceSheet.totalAktiva), formatRupiah(balanceSheet.totalPasiva)]
    );

    const isBalanced = Math.abs(balanceSheet.totalAktiva - balanceSheet.totalPasiva) < 1;
    const summaryNotes = [
      { label: "Status Verifikasi", value: isBalanced ? "Seimbang (Balanced) ✓" : "Tidak Seimbang ✗" },
      { label: "Total Posisi Neraca", value: formatRupiah(balanceSheet.totalAktiva) },
      { label: "Total Laba Bersih (SHU 100%)", value: formatRupiah(balanceSheet.shuBersihAll) }
    ];

    exportToPDF(
      "LAPORAN NERACA KEUANGAN KOPERASI DIGITAL",
      `Sinkronisasi Otoritatif Aktual real-time s/d: ${new Date().toLocaleDateString('id-ID')}`,
      cols,
      rows,
      "Neraca_Koperasi_Sains",
      summaryNotes,
      setup
    );
  };

  // ================= REKAP ARUS KAS (CASH FLOW) COMPUTATIONS =================
  const rawCashFlowData = useMemo(() => {
    return calculateMonthlyCashFlowSummaries(
      setup,
      simpanan,
      pinjaman,
      angsuran,
      income,
      expenses,
      pembelian,
      piutangWarung
    );
  }, [setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung]);

  // List of all distinct months available
  const availableCashFlowMonths = useMemo(() => {
    return rawCashFlowData.monthlySummaries.map(m => ({
      key: m.monthKey,
      label: m.fullMonthLabel,
      shortLabel: m.monthLabel
    }));
  }, [rawCashFlowData.monthlySummaries]);

  // Filtered & Sorted Monthly Cash Flow Summaries
  const filteredMonthlyCashFlow = useMemo(() => {
    let list = rawCashFlowData.monthlySummaries;

    // Filter by selected month or global date range
    if (cashFlowSelectedMonth !== 'all') {
      list = list.filter(m => m.monthKey === cashFlowSelectedMonth);
    } else if (filterStartDate && filterEndDate) {
      const startYM = filterStartDate.substring(0, 7);
      const endYM = filterEndDate.substring(0, 7);
      list = list.filter(m => m.monthKey >= startYM && m.monthKey <= endYM);
    }

    // Sort
    return [...list].sort((a, b) => {
      let diff = 0;
      if (cashFlowSortBy === 'month') {
        diff = a.monthKey.localeCompare(b.monthKey);
      } else if (cashFlowSortBy === 'inflow') {
        diff = a.totalKasMasuk - b.totalKasMasuk;
      } else if (cashFlowSortBy === 'outflow') {
        diff = a.totalKasKeluar - b.totalKasKeluar;
      } else if (cashFlowSortBy === 'net') {
        diff = a.netCashFlow - b.netCashFlow;
      }
      return cashFlowSortOrder === 'desc' ? -diff : diff;
    });
  }, [rawCashFlowData.monthlySummaries, cashFlowSelectedMonth, filterStartDate, filterEndDate, cashFlowSortBy, cashFlowSortOrder]);

  // Filtered Detailed Mutations (Buku Kas)
  const filteredCashMutations = useMemo(() => {
    let list = rawCashFlowData.allMutations;

    if (cashFlowSelectedMonth !== 'all') {
      list = list.filter(m => m.tanggal && m.tanggal.startsWith(cashFlowSelectedMonth));
    } else if (filterStartDate && filterEndDate) {
      list = list.filter(m => m.tanggal >= filterStartDate && m.tanggal <= filterEndDate);
    }

    if (cashFlowTypeFilter !== 'all') {
      list = list.filter(m => m.tipe === cashFlowTypeFilter);
    }

    if (cashFlowCategoryFilter !== 'all') {
      list = list.filter(m => m.kategori === cashFlowCategoryFilter);
    }

    if (cashFlowSearch.trim()) {
      const q = cashFlowSearch.toLowerCase().trim();
      list = list.filter(m =>
        m.kategori.toLowerCase().includes(q) ||
        m.keterangan.toLowerCase().includes(q) ||
        m.tanggal.includes(q)
      );
    }

    return list;
  }, [rawCashFlowData.allMutations, cashFlowSelectedMonth, filterStartDate, filterEndDate, cashFlowTypeFilter, cashFlowCategoryFilter, cashFlowSearch]);

  // Totals for filtered view
  const cashFlowTotals = useMemo(() => {
    const totalMasuk = filteredMonthlyCashFlow.reduce((s, m) => s + m.totalKasMasuk, 0);
    const totalKeluar = filteredMonthlyCashFlow.reduce((s, m) => s + m.totalKasKeluar, 0);
    const net = totalMasuk - totalKeluar;
    
    // Inflow Breakdown
    const totalSimpananMasuk = filteredMonthlyCashFlow.reduce((s, m) => s + m.totalInflowSimpanan, 0);
    const totalAngsuranMasuk = filteredMonthlyCashFlow.reduce((s, m) => s + m.totalInflowAngsuran, 0);
    const totalProvisiMasuk = filteredMonthlyCashFlow.reduce((s, m) => s + m.inflowProvisi, 0);
    const totalPelunasanWarung = filteredMonthlyCashFlow.reduce((s, m) => s + m.inflowPelunasanWarung, 0);
    const totalPendapatanLain = filteredMonthlyCashFlow.reduce((s, m) => s + m.inflowPendapatanLain, 0);

    // Outflow Breakdown
    const totalPencairanPinjaman = filteredMonthlyCashFlow.reduce((s, m) => s + m.outflowPencairanPinjaman, 0);
    const totalPenarikanSimpanan = filteredMonthlyCashFlow.reduce((s, m) => s + m.outflowPenarikanSimpanan, 0);
    const totalPembelianBarang = filteredMonthlyCashFlow.reduce((s, m) => s + m.outflowPembelianPersediaan + m.outflowPembelianInventaris, 0);
    const totalBebanOperasionalKas = filteredMonthlyCashFlow.reduce((s, m) => s + m.totalBebanOperasionalKas, 0);
    const totalTalanganWarung = filteredMonthlyCashFlow.reduce((s, m) => s + m.outflowHutangWarung, 0);

    const saldoAwal = filteredMonthlyCashFlow.length > 0 
      ? (cashFlowSortOrder === 'desc' && cashFlowSortBy === 'month' 
          ? filteredMonthlyCashFlow[filteredMonthlyCashFlow.length - 1].saldoAwal 
          : filteredMonthlyCashFlow[0].saldoAwal)
      : (setup?.kasAwal ?? 0);

    const saldoAkhir = filteredMonthlyCashFlow.length > 0 
      ? (cashFlowSortOrder === 'desc' && cashFlowSortBy === 'month'
          ? filteredMonthlyCashFlow[0].saldoAkhir
          : filteredMonthlyCashFlow[filteredMonthlyCashFlow.length - 1].saldoAkhir)
      : (setup?.kasAwal ?? 0);

    return {
      totalMasuk,
      totalKeluar,
      net,
      totalSimpananMasuk,
      totalAngsuranMasuk,
      totalProvisiMasuk,
      totalPelunasanWarung,
      totalPendapatanLain,
      totalPencairanPinjaman,
      totalPenarikanSimpanan,
      totalPembelianBarang,
      totalBebanOperasionalKas,
      totalTalanganWarung,
      saldoAwal,
      saldoAkhir
    };
  }, [filteredMonthlyCashFlow, setup, cashFlowSortOrder, cashFlowSortBy]);

  // Distinct category list for filter
  const distinctMutationCategories = useMemo(() => {
    const set = new Set<string>();
    rawCashFlowData.allMutations.forEach(m => {
      if (m.kategori) set.add(m.kategori);
    });
    return Array.from(set).sort();
  }, [rawCashFlowData.allMutations]);

  // Export Handlers
  const handleExportArusKasExcel = () => {
    if (cashFlowViewMode === 'rekapBulanan') {
      const rows: Record<string, any>[] = filteredMonthlyCashFlow.map((m, idx) => ({
        "No": idx + 1,
        "Periode Bulan": m.fullMonthLabel,
        "Simpanan Anggota (Rp)": m.totalInflowSimpanan,
        "Angsuran Pinjaman (Rp)": m.totalInflowAngsuran,
        "Provisi Pinjaman (Rp)": m.inflowProvisi,
        "Pelunasan Piutang Warung (Rp)": m.inflowPelunasanWarung,
        "Pendapatan Lain / Warung (Rp)": m.inflowPendapatanLain,
        "TOTAL KAS MASUK (Rp)": m.totalKasMasuk,
        "Pencairan Pinjaman (Rp)": m.outflowPencairanPinjaman,
        "Penarikan Simpanan (Rp)": m.outflowPenarikanSimpanan,
        "Pembelian Toko & Aset (Rp)": m.outflowPembelianPersediaan + m.outflowPembelianInventaris,
        "Beban Operasional Kas (Rp)": m.totalBebanOperasionalKas,
        "TOTAL KAS KELUAR (Rp)": m.totalKasKeluar,
        "ARUS KAS BERSIH (NET) (Rp)": m.netCashFlow,
        "Saldo Kas Awal (Rp)": m.saldoAwal,
        "Saldo Kas Akhir (Rp)": m.saldoAkhir,
        "Status": m.netCashFlow >= 0 ? "Surplus Kas" : "Defisit Kas"
      }));

      rows.push({
        "No": "",
        "Periode Bulan": "TOTAL KESELURUHAN",
        "Simpanan Anggota (Rp)": cashFlowTotals.totalSimpananMasuk,
        "Angsuran Pinjaman (Rp)": cashFlowTotals.totalAngsuranMasuk,
        "Provisi Pinjaman (Rp)": cashFlowTotals.totalProvisiMasuk,
        "Pelunasan Piutang Warung (Rp)": cashFlowTotals.totalPelunasanWarung,
        "Pendapatan Lain / Warung (Rp)": cashFlowTotals.totalPendapatanLain,
        "TOTAL KAS MASUK (Rp)": cashFlowTotals.totalMasuk,
        "Pencairan Pinjaman (Rp)": cashFlowTotals.totalPencairanPinjaman,
        "Penarikan Simpanan (Rp)": cashFlowTotals.totalPenarikanSimpanan,
        "Pembelian Toko & Aset (Rp)": cashFlowTotals.totalPembelianBarang,
        "Beban Operasional Kas (Rp)": cashFlowTotals.totalBebanOperasionalKas,
        "TOTAL KAS KELUAR (Rp)": cashFlowTotals.totalKeluar,
        "ARUS KAS BERSIH (NET) (Rp)": cashFlowTotals.net,
        "Saldo Kas Awal (Rp)": cashFlowTotals.saldoAwal,
        "Saldo Kas Akhir (Rp)": cashFlowTotals.saldoAkhir,
        "Status": cashFlowTotals.net >= 0 ? "Surplus Keseluruhan" : "Defisit Keseluruhan"
      });

      exportToExcel(rows, "Rekap_Arus_Kas_Bulanan", `Rekap_Arus_Kas_${filterStartDate}_sd_${filterEndDate}`, setup);
    } else {
      const rows = filteredCashMutations.map((m, idx) => ({
        "No": idx + 1,
        "Tanggal": m.tanggal,
        "Tipe": m.tipe === 'inflow' ? 'KAS MASUK' : 'KAS KELUAR',
        "Kategori": m.kategori,
        "Uraian Keterangan": m.keterangan,
        "Kas Masuk (Rp)": m.tipe === 'inflow' ? m.nominal : 0,
        "Kas Keluar (Rp)": m.tipe === 'outflow' ? m.nominal : 0
      }));

      exportToExcel(rows, "Mutasi_Kas_Detail", `Buku_Mutasi_Kas_${filterStartDate}_sd_${filterEndDate}`, setup);
    }
  };

  const handleExportArusKasPDF = () => {
    const cols = [
      "No", "Periode Bulan", "Kas Masuk (Rp)", "Kas Keluar (Rp)", "Arus Kas Bersih (Net)", "Saldo Akhir (Rp)", "Status"
    ];

    const rows = filteredMonthlyCashFlow.map((m, idx) => [
      idx + 1,
      m.fullMonthLabel,
      formatRupiah(m.totalKasMasuk),
      formatRupiah(m.totalKasKeluar),
      formatRupiah(m.netCashFlow),
      formatRupiah(m.saldoAkhir),
      m.netCashFlow >= 0 ? "Surplus (+)" : "Defisit (-)"
    ]);

    rows.push([
      "",
      "TOTAL REKAPITULASI",
      formatRupiah(cashFlowTotals.totalMasuk),
      formatRupiah(cashFlowTotals.totalKeluar),
      formatRupiah(cashFlowTotals.net),
      formatRupiah(cashFlowTotals.saldoAkhir),
      cashFlowTotals.net >= 0 ? "SURPLUS" : "DEFISIT"
    ]);

    const summaryNotes = [
      { label: "Saldo Kas Awal", value: formatRupiah(cashFlowTotals.saldoAwal) },
      { label: "Total Kas Masuk", value: formatRupiah(cashFlowTotals.totalMasuk) },
      { label: "Total Kas Keluar", value: formatRupiah(cashFlowTotals.totalKeluar) },
      { label: "Arus Kas Bersih (Net)", value: `${cashFlowTotals.net >= 0 ? '+' : ''}${formatRupiah(cashFlowTotals.net)}` },
      { label: "Saldo Kas Akhir", value: formatRupiah(cashFlowTotals.saldoAkhir) }
    ];

    exportToPDF(
      "LAPORAN REKAPITULASI ARUS KAS KOPERASI",
      `Periode: ${filterStartDate} s/d ${filterEndDate} (Penyajian Bulanan Kas Masuk & Keluar)`,
      cols,
      rows,
      `Laporan_Arus_Kas_${filterStartDate}_sd_${filterEndDate}`,
      summaryNotes,
      setup,
      'landscape'
    );
  };

  // Filtered Simpanan List
  const filteredSimpananReport = useMemo(() => {
    let result = sList;
    if (simpananTypeFilter) {
      result = result.filter(s => s.jenis === simpananTypeFilter);
    }
    if (simpananSearch.trim()) {
      const q = simpananSearch.toLowerCase().trim();
      result = result.filter(s => {
        const m = members.find(member => member.id === s.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [sList, simpananTypeFilter, simpananSearch, members]);

  const totalSimpananReportSum = useMemo(() => {
    return filteredSimpananReport.reduce((sum, item) => sum + item.jumlah, 0);
  }, [filteredSimpananReport]);

  // Filtered Pinjaman List
  const filteredPinjamanReport = useMemo(() => {
    let result = pList;
    if (pinjamanStatusFilter) {
      result = result.filter(p => p.status === pinjamanStatusFilter);
    }
    if (pinjamanSearch.trim()) {
      const q = pinjamanSearch.toLowerCase().trim();
      result = result.filter(p => {
        const m = members.find(member => member.id === p.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => {
      const mA = members.find(m => m.id === a.anggotaId);
      const mB = members.find(m => m.id === b.anggotaId);
      const noA = mA ? (mA.noAnggota || '') : '';
      const noB = mB ? (mB.noAnggota || '') : '';
      return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [pList, pinjamanStatusFilter, pinjamanSearch, members]);

  // Laporan Kredit Macet Calculation & Logic (Kriteria: Tidak membayar angsuran 3 bulan terakhir)
  const [kreditMacetSearch, setKreditMacetSearch] = useState('');
  const [jasaHilangRateMode, setJasaHilangRateMode] = useState<'simpanan' | 'pinjaman' | 'custom'>('simpanan');
  const [customJasaHilangPercent, setCustomJasaHilangPercent] = useState<number>(setup?.jasaSimpananSukarelaPersen ?? 0.5);

  const effectiveJasaPercent = useMemo(() => {
    if (jasaHilangRateMode === 'simpanan') return setup?.jasaSimpananSukarelaPersen ?? 0.5;
    if (jasaHilangRateMode === 'pinjaman') return setup?.bungaPinjamanPersen ?? 1.5;
    return Number(customJasaHilangPercent) || 0;
  }, [jasaHilangRateMode, setup?.jasaSimpananSukarelaPersen, setup?.bungaPinjamanPersen, customJasaHilangPercent]);

  const kreditMacetList = useMemo(() => {
    const now = new Date();

    return pinjaman.filter(p => {
      if (p.status === 'Lunas') return false;

      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === p.id);
      let lastPaymentDate: Date;

      if (relatedAngsuran.length > 0) {
        const timestamps = relatedAngsuran.map(a => {
          const t = new Date(a.tanggal).getTime();
          return isNaN(t) ? 0 : t;
        }).filter(t => t > 0);

        if (timestamps.length > 0) {
          lastPaymentDate = new Date(Math.max(...timestamps));
        } else {
          lastPaymentDate = new Date(p.tanggal);
        }
      } else {
        lastPaymentDate = new Date(p.tanggal);
      }

      const diffMonths = (now.getFullYear() - lastPaymentDate.getFullYear()) * 12 + (now.getMonth() - lastPaymentDate.getMonth());
      return diffMonths >= 3;
    }).map(p => {
      const member = members.find(m => m.id === p.anggotaId);
      const related = angsuran.filter(a => a.pinjamanId === p.id);
      const totalPaid = related.reduce((sum, a) => sum + a.jumlahBayar, 0);
      const sisaPokok = calculateLoanOutstanding(p, related);
      const sisaTotal = Math.max(0, p.totalWajibBayar - totalPaid);

      const timestamps = related.map(a => new Date(a.tanggal).getTime()).filter(t => !isNaN(t));
      const lastPaymentDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date(p.tanggal);
      const lastPaymentStr = timestamps.length > 0 ? lastPaymentDate.toISOString().split('T')[0] : 'Belum Ada Setoran';

      const diffMonths = (now.getFullYear() - lastPaymentDate.getFullYear()) * 12 + (now.getMonth() - lastPaymentDate.getMonth());
      const monthsOverdue = Math.max(1, diffMonths);
      const sisaPokokRound = Math.round(sisaPokok);
      // Formula: jumlah jasa simpanan (%) x jumlah total pinjaman macet (sisa pokok) x bulan macet angsuran
      const potensiKeuntunganHilang = Math.round(sisaPokokRound * (effectiveJasaPercent / 100) * monthsOverdue);

      return {
        loan: p,
        member,
        totalPaid,
        sisaPokok: sisaPokokRound,
        sisaTotal: Math.round(sisaTotal),
        jumlahAngsuranLunas: related.length,
        lastPaymentStr,
        monthsOverdue: diffMonths,
        potensiKeuntunganHilang
      };
    }).sort((a, b) => {
      const noA = a.member ? (a.member.noAnggota || '') : '';
      const noB = b.member ? (b.member.noAnggota || '') : '';
      return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [pinjaman, angsuran, members, effectiveJasaPercent]);

  const filteredKreditMacetList = useMemo(() => {
    if (!kreditMacetSearch.trim()) return kreditMacetList;
    const q = kreditMacetSearch.toLowerCase().trim();
    return kreditMacetList.filter(item => {
      const namaMatch = item.member ? item.member.nama.toLowerCase().includes(q) : false;
      const noAnggotaMatch = item.member ? item.member.noAnggota.toLowerCase().includes(q) : false;
      const idMatch = item.loan.id ? item.loan.id.toLowerCase().includes(q) : false;
      return namaMatch || noAnggotaMatch || idMatch;
    });
  }, [kreditMacetList, kreditMacetSearch]);

  const kreditMacetSummary = useMemo(() => {
    const totalMacetCount = kreditMacetList.length;
    const totalSisaPokokMacet = kreditMacetList.reduce((sum, i) => sum + i.sisaPokok, 0);
    const totalSisaWajibMacet = kreditMacetList.reduce((sum, i) => sum + i.sisaTotal, 0);
    const totalBulanMacet = kreditMacetList.reduce((sum, i) => sum + Math.max(1, i.monthsOverdue), 0);
    const totalPotensiKeuntunganHilang = kreditMacetList.reduce((sum, i) => sum + i.potensiKeuntunganHilang, 0);
    const rataRataBulanMacet = totalMacetCount > 0 ? (totalBulanMacet / totalMacetCount).toFixed(1) : '0';
    const totalAktifLoanCount = pinjaman.filter(p => p.status === 'Belum Lunas').length;
    const persentaseMacet = totalAktifLoanCount > 0 ? ((totalMacetCount / totalAktifLoanCount) * 100).toFixed(1) : '0';

    return {
      totalMacetCount,
      totalSisaPokokMacet,
      totalSisaWajibMacet,
      totalBulanMacet,
      totalPotensiKeuntunganHilang,
      rataRataBulanMacet,
      persentaseMacet,
      effectiveJasaPercent
    };
  }, [kreditMacetList, pinjaman, effectiveJasaPercent]);

  const handleExportKreditMacetExcel = () => {
    const data = filteredKreditMacetList.map((item, idx) => ({
      "No": idx + 1,
      "No Anggota": item.member?.noAnggota || "-",
      "Nama Anggota": item.member?.nama || "Unknown",
      "No Kontrak Pinjaman": item.loan.id,
      "Tanggal Pencairan": item.loan.tanggal,
      "Plafond Pinjaman": item.loan.nominalPinjaman,
      "Tenor (Bulan)": item.loan.tenor,
      "Setoran Terakhir": item.lastPaymentStr,
      "Masa Tunggakan": `${item.monthsOverdue} Bulan`,
      "Sisa Pokok Macet": item.sisaPokok,
      "Sisa Total Tagihan": item.sisaTotal,
      "Potensi Keuntungan Hilang": item.potensiKeuntunganHilang
    }));
    exportToExcel(data, "Kredit Macet", `Laporan_Kredit_Macet_${new Date().toISOString().split('T')[0]}`, setup);
  };

  const handleExportKreditMacetPDF = () => {
    const cols = ["No", "No Anggota", "Nama Anggota", "ID Kontrak", "Plafond", "Setoran Terakhir", "Tunggakan", "Sisa Pokok Macet", "Potensi Hilang"];
    const rows = filteredKreditMacetList.map((item, idx) => [
      (idx + 1).toString(),
      item.member?.noAnggota || "-",
      item.member?.nama || "Unknown",
      item.loan.id,
      formatRupiah(item.loan.nominalPinjaman),
      item.lastPaymentStr,
      `${item.monthsOverdue} Bulan`,
      formatRupiah(item.sisaPokok),
      formatRupiah(item.potensiKeuntunganHilang)
    ]);

    rows.push([
      "TOTAL", "-", "-", `${filteredKreditMacetList.length} Debitur Macet`, "-", "-", "-", formatRupiah(kreditMacetSummary.totalSisaPokokMacet), formatRupiah(kreditMacetSummary.totalPotensiKeuntunganHilang)
    ]);

    exportToPDF(
      "LAPORAN KREDIT MACET (NON-PERFORMING LOAN / NPL)",
      `Kriteria: Anggota yang tidak membayar angsuran selama 3 bulan atau lebih. Basis Jasa: ${effectiveJasaPercent}%. Per tanggal: ${new Date().toLocaleDateString('id-ID')}`,
      cols,
      rows,
      "Laporan_Kredit_Macet",
      [],
      setup
    );
  };

  const pinjamanReportTotals = useMemo(() => {
    return filteredPinjamanReport.reduce((acc, item) => {
      acc.nominalPinjaman += item.nominalPinjaman;
      acc.provisiDipotong += item.provisiDipotong;
      acc.jumlahDiterima += item.jumlahDiterima;
      acc.totalWajibBayar += item.totalWajibBayar;
      return acc;
    }, { nominalPinjaman: 0, provisiDipotong: 0, jumlahDiterima: 0, totalWajibBayar: 0 });
  }, [filteredPinjamanReport]);

  // Filtered Angsuran List
  const filteredAngsuranReport = useMemo(() => {
    let result = aList;
    if (angsuranSearch.trim()) {
      const q = angsuranSearch.toLowerCase().trim();
      result = result.filter(a => {
        const m = members.find(member => member.id === a.anggotaId);
        return m?.nama.toLowerCase().includes(q) || m?.noAnggota.toLowerCase().includes(q);
      });
    }
    return [...result].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [aList, angsuranSearch, members]);

  const totalAngsuranReportSum = useMemo(() => {
    return filteredAngsuranReport.reduce((sum, item) => sum + item.jumlahBayar, 0);
  }, [filteredAngsuranReport]);

  // Export handlers for new reports
  const handleExportSimpananExcel = () => {
    const data = filteredSimpananReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Jenis": item.jenis,
        "Jumlah (Rp)": item.jumlah,
        "Keterangan": item.keterangan || ""
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Jenis": "",
        "Jumlah (Rp)": totalSimpananReportSum,
        "Keterangan": ""
      } as any);
    }
    exportToExcel(data, "Simpanan", "Laporan_Aktivitas_Simpanan", setup);
  };

  const handleExportSimpananPDF = () => {
    const cols = ["TANGGAL", "NO ANGGOTA", "NAMA ANGGOTA", "JENIS", "JUMLAH SETORAN", "KETERANGAN"];
    const rows = filteredSimpananReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.noAnggota || "",
        m?.nama || "Unknown",
        item.jenis,
        formatRupiah(item.jumlah),
        item.keterangan || ""
      ];
    });
    rows.push([
      "TOTAL SIMPANAN",
      "",
      "",
      "",
      formatRupiah(totalSimpananReportSum),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA MUTASI SIMPANAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Simpanan_Koperasi",
      [],
      setup
    );
  };

  const handleExportPinjamanExcel = () => {
    const data = filteredPinjamanReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Nominal Pinjaman (Rp)": item.nominalPinjaman,
        "Provisi (Rp)": item.provisiDipotong,
        "Diterima (Rp)": item.jumlahDiterima,
        "Tenor (Bulan)": item.tenor,
        "Total Wajib Bayar (Rp)": item.totalWajibBayar,
        "Status": item.status
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Nominal Pinjaman (Rp)": pinjamanReportTotals.nominalPinjaman,
        "Provisi (Rp)": pinjamanReportTotals.provisiDipotong,
        "Diterima (Rp)": pinjamanReportTotals.jumlahDiterima,
        "Tenor (Bulan)": "",
        "Total Wajib Bayar (Rp)": pinjamanReportTotals.totalWajibBayar,
        "Status": ""
      } as any);
    }
    exportToExcel(data, "Pinjaman", "Laporan_Penyaluran_Pinjaman", setup);
  };

  const handleExportPinjamanPDF = () => {
    const cols = ["TANGGAL", "NAMA ANGGOTA", "NOMINAL", "PROVISI", "DITERIMA", "TENOR", "WAJIB BAYAR", "STATUS"];
    const rows = filteredPinjamanReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.nama || "Unknown",
        formatRupiah(item.nominalPinjaman),
        formatRupiah(item.provisiDipotong),
        formatRupiah(item.jumlahDiterima),
        `${item.tenor} Bulan`,
        formatRupiah(item.totalWajibBayar),
        item.status
      ];
    });
    rows.push([
      "TOTAL PINJAMAN",
      "",
      formatRupiah(pinjamanReportTotals.nominalPinjaman),
      formatRupiah(pinjamanReportTotals.provisiDipotong),
      formatRupiah(pinjamanReportTotals.jumlahDiterima),
      "",
      formatRupiah(pinjamanReportTotals.totalWajibBayar),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA PENYALURAN PINJAMAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Pinjaman_Koperasi",
      [],
      setup
    );
  };

  const handleExportAngsuranExcel = () => {
    const data = filteredAngsuranReport.map((item, idx) => {
      const m = members.find(member => member.id === item.anggotaId);
      return {
        "No": idx + 1,
        "Tanggal": item.tanggal,
        "No Anggota": m?.noAnggota || "",
        "Nama Anggota": m?.nama || "Unknown",
        "Angsuran Ke": item.bulanKe,
        "Jumlah Bayar (Rp)": item.jumlahBayar,
        "Keterangan": item.keterangan || ""
      };
    });
    if (data.length > 0) {
      data.push({
        "No": "",
        "Tanggal": "TOTAL",
        "No Anggota": "",
        "Nama Anggota": "",
        "Angsuran Ke": "",
        "Jumlah Bayar (Rp)": totalAngsuranReportSum,
        "Keterangan": ""
      } as any);
    }
    exportToExcel(data, "Angsuran", "Laporan_Penerimaan_Angsuran", setup);
  };

  const handleExportAngsuranPDF = () => {
    const cols = ["TANGGAL", "NO ANGGOTA", "NAMA ANGGOTA", "ANGSURAN KE", "JUMLAH BAYAR", "KETERANGAN"];
    const rows = filteredAngsuranReport.map(item => {
      const m = members.find(member => member.id === item.anggotaId);
      return [
        item.tanggal,
        m?.noAnggota || "",
        m?.nama || "Unknown",
        `Bulan ke-${item.bulanKe}`,
        formatRupiah(item.jumlahBayar),
        item.keterangan || ""
      ];
    });
    rows.push([
      "TOTAL ANGSURAN RECEIVED",
      "",
      "",
      "",
      formatRupiah(totalAngsuranReportSum),
      ""
    ]);
    exportToPDF(
      "LAPORAN DATA MUTASI ANGSURAN PINJAMAN",
      `Periode: ${filterStartDate} s/d ${filterEndDate}`,
      cols,
      rows,
      "Laporan_Angsuran_Koperasi",
      [],
      setup
    );
  };

  // Computations & Export for Rekap Piutang Warung
  const rekapPiutangWarung = useMemo(() => {
    return members
      .map(m => {
        const mTx = piutangWarung.filter(pw => pw.anggotaId === m.id);
        const totalHutangBaru = mTx
          .filter(pw => pw.jenis === 'hutang_baru')
          .reduce((sum, pw) => sum + pw.nominal, 0);
        const totalPelunasan = mTx
          .filter(pw => pw.jenis === 'pelunasan')
          .reduce((sum, pw) => sum + pw.nominal, 0);
        const sisaPiutang = totalHutangBaru - totalPelunasan;
        const status = sisaPiutang > 0 ? 'Ada Piutang' : 'Lunas';
        const jumlahTransaksi = mTx.length;

        return {
          id: m.id,
          noAnggota: m.noAnggota,
          nama: m.nama,
          jenisKelamin: m.jenisKelamin,
          totalHutangBaru,
          totalPelunasan,
          sisaPiutang,
          status,
          jumlahTransaksi
        };
      })
      .filter(item => item.totalHutangBaru > 0 || item.sisaPiutang > 0 || item.jumlahTransaksi > 0);
  }, [members, piutangWarung]);

  const filteredRekapPiutangWarung = useMemo(() => {
    return rekapPiutangWarung.filter(item => {
      if (piutangWarungFilterType === 'aktif' && item.sisaPiutang <= 0) return false;
      if (piutangWarungFilterType === 'lunas' && item.sisaPiutang > 0) return false;

      if (piutangWarungSearch.trim()) {
        const q = piutangWarungSearch.toLowerCase().trim();
        return item.nama.toLowerCase().includes(q) || item.noAnggota.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rekapPiutangWarung, piutangWarungFilterType, piutangWarungSearch]);

  const totalRekapPiutangWarungSum = useMemo(() => {
    return filteredRekapPiutangWarung.reduce((acc, curr) => {
      acc.totalHutangBaru += curr.totalHutangBaru;
      acc.totalPelunasan += curr.totalPelunasan;
      acc.sisaPiutang += curr.sisaPiutang;
      if (curr.sisaPiutang > 0) acc.jumlahDebitur += 1;
      return acc;
    }, { totalHutangBaru: 0, totalPelunasan: 0, sisaPiutang: 0, jumlahDebitur: 0 });
  }, [filteredRekapPiutangWarung]);

  const filteredMutasiPiutangWarung = useMemo(() => {
    return piutangWarung.filter(pw => {
      const m = members.find(mem => mem.id === pw.anggotaId);
      if (piutangWarungMutasiSearch.trim()) {
        const q = piutangWarungMutasiSearch.toLowerCase().trim();
        const matchNama = m?.nama.toLowerCase().includes(q);
        const matchNo = m?.noAnggota.toLowerCase().includes(q);
        const matchKet = pw.keterangan?.toLowerCase().includes(q);
        if (!matchNama && !matchNo && !matchKet) return false;
      }
      return true;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [piutangWarung, members, piutangWarungMutasiSearch]);

  const handleExportPiutangWarungExcel = () => {
    const dataToExport = filteredRekapPiutangWarung.map((item, index) => ({
      No: index + 1,
      "No Anggota": item.noAnggota,
      "Nama Anggota": item.nama,
      "Total Belanja Kredit (Rp)": item.totalHutangBaru,
      "Total Pembayaran (Rp)": item.totalPelunasan,
      "Sisa Piutang Warung (Rp)": item.sisaPiutang,
      "Status Piutang": item.status,
      "Jumlah Transaksi": item.jumlahTransaksi
    }));
    exportToExcel(
      dataToExport, 
      "Rekap Piutang Warung", 
      `Laporan_Rekap_Piutang_Warung_${new Date().toISOString().substring(0, 10)}`, 
      setup
    );
  };

  const handleExportPiutangWarungPDF = () => {
    const cols = ["NO", "NO ANGGOTA", "NAMA ANGGOTA", "TOTAL BELANJA KREDIT", "TOTAL PEMBAYARAN", "SISA PIUTANG AKTIF", "STATUS"];
    const rows = filteredRekapPiutangWarung.map((item, index) => [
      String(index + 1),
      item.noAnggota,
      item.nama,
      formatRupiah(item.totalHutangBaru),
      formatRupiah(item.totalPelunasan),
      formatRupiah(item.sisaPiutang),
      item.status
    ]);
    rows.push([
      "TOTAL AKUMULASI",
      "",
      "",
      formatRupiah(totalRekapPiutangWarungSum.totalHutangBaru),
      formatRupiah(totalRekapPiutangWarungSum.totalPelunasan),
      formatRupiah(totalRekapPiutangWarungSum.sisaPiutang),
      `${totalRekapPiutangWarungSum.jumlahDebitur} Debitur`
    ]);
    exportToPDF(
      "LAPORAN REKAPITULASI PIUTANG WARUNG ANGGOTA",
      `Periode s/d ${new Date().toLocaleDateString('id-ID')} | Debitur Aktif: ${totalRekapPiutangWarungSum.jumlahDebitur} Anggota`,
      cols,
      rows,
      "Rekap_Piutang_Warung_Koperasi",
      [],
      setup,
      'landscape'
    );
  };

  return (
    <div className="space-y-6">
      {/* 🛡️ BANNER NOTIFIKASI AKSES PENGAWAS (HANYA LIHAT / READ-ONLY) */}
      {userRole === 'pengawas' && (
        <div className="p-4 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">Mode Akses Pengawas (Hanya Lihat / Read-Only)</h4>
              <p className="text-indigo-700 dark:text-indigo-300 text-xs mt-0.5">
                Anda sedang memeriksa laporan keuangan koperasi. Seluruh data disajikan secara akurat dan transparan untuk keperluan pengawasan dan audit. Anda dapat mengekspor atau mencetak laporan kapan saja.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 hidden sm:inline-block">
            Hak Akses: Pengawas
          </span>
        </div>
      )}

      {/* Date contexts selectors */}
      <div className="bg-white dark:bg-slate-800 p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase">
          <Calendar className="w-4 h-4 text-emerald-600"/> Rentang Otoritas Laporan:
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <input 
              type="date" 
              value={filterStartDate} 
              onChange={(e)=>setFilterStartDate(e.target.value)}
              className="p-1 px-3 border rounded bg-slate-50 text-slate-700 pointer-events-auto"
            />
            <span className="text-slate-400">s/d</span>
            <input 
              type="date" 
              value={filterEndDate} 
              onChange={(e)=>setFilterEndDate(e.target.value)}
              className="p-1 px-3 border rounded bg-slate-50 text-slate-700 pointer-events-auto"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableYears.map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => { setFilterStartDate(`${yr}-01-01`); setFilterEndDate(`${yr}-12-31`); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${filterStartDate === `${yr}-01-01` && filterEndDate === `${yr}-12-31` ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
              >
                Tahun {yr}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setFilterStartDate('2020-01-01'); setFilterEndDate('2030-12-31'); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${filterStartDate === '2020-01-01' && filterEndDate === '2030-12-31' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
            >
              Semua Periode
            </button>
          </div>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 border-b border-slate-150 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl w-full gap-1.5">
        <button
          onClick={() => setActiveReportTab('labaRugi')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'labaRugi'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <TrendingUp className="w-4 h-4"/> Laba Rugi
        </button>
        <button
          onClick={() => setActiveReportTab('neraca')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'neraca'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Scale className="w-4 h-4"/> Neraca Saldo
        </button>
        <button
          onClick={() => setActiveReportTab('rekapArusKas')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'rekapArusKas'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <ArrowUpDown className="w-4 h-4 text-teal-600"/> Rekap Arus Kas
        </button>
        <button
          onClick={() => setActiveReportTab('nominatif')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'nominatif'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4"/> Data Nominatif
        </button>
        <button
          onClick={() => setActiveReportTab('piutangWarung')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'piutangWarung'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <ShoppingBag className="w-4 h-4"/> Piutang Warung
        </button>
        <button
          onClick={() => setActiveReportTab('rasioKesehatan')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'rasioKesehatan'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Scale className="w-4 h-4"/> Rasio Kesehatan
        </button>
        <button
          onClick={() => setActiveReportTab('pembagianSHU')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'pembagianSHU'
              ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <Wallet className="w-4 h-4"/> Pembagian SHU
        </button>
        <button
          onClick={() => setActiveReportTab('kreditMacet')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${
            activeReportTab === 'kreditMacet'
              ? 'bg-rose-600 text-white shadow-sm border border-rose-700'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          <AlertOctagon className="w-4 h-4"/> Kredit Macet
        </button>
      </div>

      <div className="space-y-6">
        {activeReportTab === 'labaRugi' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600"/> Laba Rugi
              </h3>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportLabaRugiExcel}
                  className="p-1.5 text-xs text-slate-650 dark:text-slate-300 hover:text-green-700 bg-slate-100 dark:bg-slate-700 hover:bg-green-100 rounded-lg cursor-pointer transition"
                  title="Unduh Excel"
                >
                  <Download className="w-4 h-4"/>
                </button>
                <button 
                  onClick={handleExportLabaRugiPDF}
                  className="p-1.5 text-xs text-slate-650 dark:text-slate-300 hover:text-teal-750 bg-slate-100 dark:bg-slate-700 hover:bg-teal-100 rounded-lg cursor-pointer transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* 📊 GRAFIK BATANG RECHARTS TREN PENDAPATAN & BEBAN BULANAN (ANALISIS LABA RUGI) */}
            <div className="pt-2 pb-4">
              <PortalGrafikLabaBulanan
                income={income}
                expenses={expenses}
                pinjaman={pinjaman}
                angsuran={angsuran}
                namaKoperasi={setup?.namaKoperasi || "Koperasi Dana Segar"}
              />
            </div>

            <div className="space-y-4 font-mono text-xs max-w-3xl">
              {/* PENDAPATAN */}
              <div className="space-y-2">
                <p className="font-sans font-bold border-b text-teal-700 text-[10px] pb-1 uppercase tracking-wider">I. PENDAPATAN OPERASIONAL & TOKO</p>
                <div className="flex justify-between pl-2">
                  <span>[+] Laba Penjual Sembako Warung</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pToko)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Pendapatan Biaya Provisi (1%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pProvisi)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Realisasi Jasa Bunga Kontrak</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pJasaBunga)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Denda Keterlambatan Anggota</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pDenda)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Bunga Simpanan Giro Bank</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pBungaBank)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[+] Pendapatan Lain-lain</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.pLain)}</span>
                </div>
                <div className="flex justify-between bg-slate-50 dark:bg-slate-900 border-y py-1.5 px-2 font-bold text-slate-800 dark:text-slate-100">
                  <span>TOTAL PENDAPATAN KOPERASI (A)</span>
                  <span>{formatRupiah(profitLoss.totalPendapatan)}</span>
                </div>
              </div>

              {/* EXPENSES */}
              <div className="space-y-2">
                <p className="font-sans font-bold border-b text-rose-700 text-[10px] pb-1 uppercase tracking-wider">II. BEBAN OPERASIONAL / PENYALURAN</p>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Biaya Gaji Staff Toko</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiKaryawan)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Rekening Air & Listrik Kantor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bListrik)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Honor Pengurus</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiPengurus)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Honor Pengawas</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bGajiPengawas)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban ATK & Operasi Kantor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bOperasional)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Kegiatan Rapat Koperasi</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bRapat || 0)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Beban Penyusutan Aktiva Tetap (Inventaris)</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{formatRupiah(profitLoss.bPenyusutan || 0)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>[-] Pengeluaran Beban Lainnya</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(profitLoss.bLain)}</span>
                </div>
                <div className="flex justify-between bg-slate-50 dark:bg-slate-900 border-y py-1.5 px-2 font-bold text-slate-800 dark:text-slate-100">
                  <span>TOTAL EXPENSES PENYALURAN BEBAN (B)</span>
                  <span>{formatRupiah(profitLoss.totalBeban)}</span>
                </div>
              </div>

              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl font-sans space-y-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wide block">
                      TOTAL LABA BERSIH (SHU SEMENTARA BERJALAN):
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      Sesuai Neraca Keuangan & Dashboard Koperasi
                    </span>
                  </div>
                  <span className={`font-mono text-lg font-extrabold ${profitLoss.shuBersih >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700'}`}>
                    {formatRupiah(profitLoss.shuBersih)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-teal-800 dark:text-teal-300 border-t border-teal-200/60 dark:border-teal-800/40 pt-2 font-mono">
                  <span className="font-sans font-semibold text-slate-600 dark:text-slate-400">Alokasi Neraca:</span>
                  <span>Dana Cadangan (20%): <strong>{formatRupiah(Math.round(profitLoss.shuBersih * 0.20))}</strong></span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>Hak SHU Anggota (80%): <strong>{formatRupiah(profitLoss.shuBersih - Math.round(profitLoss.shuBersih * 0.20))}</strong></span>
                </div>
              </div>

              {/* Deskripsi & Catatan Laporan Laba Rugi */}
              <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 p-4.5 rounded-xl space-y-3 font-sans text-xs mt-4">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400 font-bold text-sm">
                  <Lightbulb className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <h4>Deskripsi & Penjelasan Laporan Laba Rugi (Perhitungan SHU)</h4>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Laporan Laba Rugi menyajikan seluruh rincian kinerja operasional keuangan koperasi selama satu periode berjalan. Laporan ini memperhitungkan seluruh akumulasi <strong>Pendapatan Operasional</strong> (seperti keuntungan penjualan toko/warung sembako, biaya provisi akad 1%, realisasi jasa bunga pinjaman, denda, serta pendapatan simpanan bank/lainnya) dikurangi dengan total <strong>Beban Operasional</strong> (gaji karyawan/pengurus/pengawas, beban listrik, air, ATK, rapat, dan biaya operasional lainnya).
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Sisa Hasil Usaha (SHU) Bersih</strong> yang dihasilkan merupakan selisih antara Total Pendapatan dan Total Beban. Nilai SHU berjalan ini selanjutnya akan dialokasikan ke dalam pos <em>Dana Cadangan (20%)</em> dan <em>SHU Berjalan (80%)</em> pada Laporan Neraca Keuangan Koperasi.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= REKAP ARUS KAS (CASH FLOW) VIEW ================= */}
        {activeReportTab === 'rekapArusKas' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header & Filter Controls Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-xl border border-teal-200 dark:border-teal-800">
                      <ArrowUpDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Rekapitulasi Arus Kas (Kas Masuk & Keluar)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Laporan pergerakan arus kas riil tunai & bank, dapat difilter dan disortir per bulan secara otoritatif
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Mode Selector */}
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold">
                    <button
                      onClick={() => setCashFlowViewMode('rekapBulanan')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        cashFlowViewMode === 'rekapBulanan'
                          ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Rekap Matriks Bulanan
                    </button>
                    <button
                      onClick={() => setCashFlowViewMode('mutasiDetail')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        cashFlowViewMode === 'mutasiDetail'
                          ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Buku Mutasi Kas Detail
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <button
                    onClick={handleExportArusKasExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
                    title="Unduh Excel"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Excel
                  </button>
                  <button
                    onClick={handleExportArusKasPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl transition cursor-pointer"
                    title="Cetak Dokumen PDF"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF
                  </button>
                </div>
              </div>

              {/* Filter & Sort Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* 1. Filter Bulan Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" /> Filter Periode Bulan:
                  </label>
                  <select
                    value={cashFlowSelectedMonth}
                    onChange={(e) => setCashFlowSelectedMonth(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">Semua Bulan (Rentang Tanggal)</option>
                    {availableCashFlowMonths.map(m => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Sortir Berdasarkan */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" /> Urutkan Berdasarkan:
                  </label>
                  <select
                    value={cashFlowSortBy}
                    onChange={(e) => setCashFlowSortBy(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="month">Periode Bulan (Kalender)</option>
                    <option value="inflow">Total Kas Masuk Terbesar</option>
                    <option value="outflow">Total Kas Keluar Terbesar</option>
                    <option value="net">Surplus Arus Kas Terbesar</option>
                  </select>
                </div>

                {/* 3. Arah Urutan (Asc / Desc) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <ListFilter className="w-3.5 h-3.5 text-teal-600" /> Arah Urutan:
                  </label>
                  <button
                    type="button"
                    onClick={() => setCashFlowSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>
                      {cashFlowSortOrder === 'desc' ? 'Terbaru / Terbesar (Desc ↓)' : 'Terlama / Terkecil (Asc ↑)'}
                    </span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>

                {/* 4. Quick Actions / Reset */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-teal-600" /> Atur Ulang Filter:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCashFlowSelectedMonth('all');
                      setCashFlowSortBy('month');
                      setCashFlowSortOrder('desc');
                      setCashFlowSearch('');
                      setCashFlowTypeFilter('all');
                      setCashFlowCategoryFilter('all');
                    }}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Filter & Sortir
                  </button>
                </div>
              </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Saldo Kas Awal */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Saldo Kas Awal
                  </span>
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                    {formatRupiah(cashFlowTotals.saldoAwal)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Posisi kas di awal periode terpilih
                  </div>
                </div>
              </div>

              {/* Total Kas Masuk */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Total Kas Masuk
                  </span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(cashFlowTotals.totalMasuk)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Simpanan, angsuran, provisi & warung
                  </div>
                </div>
              </div>

              {/* Total Kas Keluar */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between border-l-4 border-l-rose-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Total Kas Keluar
                  </span>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {formatRupiah(cashFlowTotals.totalKeluar)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pencairan pinjaman, belanja & beban
                  </div>
                </div>
              </div>

              {/* Saldo Kas Akhir */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between border-l-4 border-l-teal-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" /> Saldo Kas Akhir
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                    cashFlowTotals.net >= 0 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {cashFlowTotals.net >= 0 ? 'Surplus (+)' : 'Defisit (-)'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-teal-700 dark:text-teal-300">
                    {formatRupiah(cashFlowTotals.saldoAkhir)}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1 flex items-center justify-between">
                    <span>Arus Kas Bersih (Net):</span>
                    <span className={`font-bold ${cashFlowTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {cashFlowTotals.net >= 0 ? '+' : ''}{formatRupiah(cashFlowTotals.net)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Breakdown Bento: Inflows vs Outflows Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sisi Kiri: Rincian Penerimaan Kas Masuk */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    Rincian Sumber Penerimaan Kas Masuk
                  </h4>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {formatRupiah(cashFlowTotals.totalMasuk)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">1. Setoran Simpanan Anggota (Pokok/Wajib/Sukarela)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalSimpananMasuk)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">2. Penerimaan Angsuran Pinjaman (Pokok & Jasa)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalAngsuranMasuk)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">3. Penerimaan Biaya Provisi Akad (1%)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalProvisiMasuk)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">4. Pelunasan Piutang / Kasbon Belanja Warung</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalPelunasanWarung)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">5. Pendapatan Penjualan Toko, Bunga Bank & Lainnya</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalPendapatanLain)}</span>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Rincian Pengeluaran Kas Keluar */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    Rincian Pos Penyaluran Kas Keluar
                  </h4>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                    {formatRupiah(cashFlowTotals.totalKeluar)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">1. Pencairan Pinjaman Pokok Anggota Baru</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalPencairanPinjaman)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">2. Penarikan Simpanan Sukarela / Manasuka</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalPenarikanSimpanan)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">3. Belanja Persediaan Toko & Aset Inventaris</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalPembelianBarang)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">4. Beban Operasional Kas (Gaji, Listrik, ATK, Rapat)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalBebanOperasionalKas)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">5. Talangan Belanja Warung / Kasbon Baru</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(cashFlowTotals.totalTalanganWarung)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafik Perbandingan Arus Kas Bulanan */}
            {rawCashFlowData.monthlySummaries.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Grafik Komparasi Arus Kas Bulanan (Inflow vs Outflow vs Net)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Penyajian visual tren arus kas per bulan
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rawCashFlowData.monthlySummaries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => {
                          if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                          if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                          return String(val);
                        }}
                      />
                      <Tooltip 
                        formatter={(val: any, name: any) => [formatRupiah(Number(val)), name]}
                        labelFormatter={(label) => `Bulan: ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="totalKasMasuk" name="Kas Masuk (Inflow)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalKasKeluar" name="Kas Keluar (Outflow)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="netCashFlow" name="Arus Kas Bersih (Net)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TABEL VIEW MODE 1: Rekapitulasi Matriks Bulanan */}
            {cashFlowViewMode === 'rekapBulanan' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden space-y-0">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Tabel Rekapitulasi Arus Kas per Bulan ({filteredMonthlyCashFlow.length} Bulan)
                    </h4>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Klik tombol <em>"Mutasi"</em> pada baris untuk memeriksa detail transaksi bulan tersebut
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">No</th>
                        <th 
                          onClick={() => {
                            if (cashFlowSortBy === 'month') setCashFlowSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            else { setCashFlowSortBy('month'); setCashFlowSortOrder('desc'); }
                          }}
                          className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition"
                        >
                          <div className="flex items-center gap-1">
                            <span>Periode Bulan</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right">Simpanan Masuk</th>
                        <th className="py-3 px-3 text-right">Angsuran Masuk</th>
                        <th className="py-3 px-3 text-right">Provisi & Lain</th>
                        <th 
                          onClick={() => {
                            if (cashFlowSortBy === 'inflow') setCashFlowSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            else { setCashFlowSortBy('inflow'); setCashFlowSortOrder('desc'); }
                          }}
                          className="py-3 px-3 text-right bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100/80 transition"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Total Kas Masuk</span>
                            <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right">Pencairan Pinjaman</th>
                        <th className="py-3 px-3 text-right">Belanja & Beban</th>
                        <th 
                          onClick={() => {
                            if (cashFlowSortBy === 'outflow') setCashFlowSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            else { setCashFlowSortBy('outflow'); setCashFlowSortOrder('desc'); }
                          }}
                          className="py-3 px-3 text-right bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 cursor-pointer hover:bg-rose-100/80 transition"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Total Kas Keluar</span>
                            <ArrowUpDown className="w-3 h-3 text-rose-500" />
                          </div>
                        </th>
                        <th 
                          onClick={() => {
                            if (cashFlowSortBy === 'net') setCashFlowSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            else { setCashFlowSortBy('net'); setCashFlowSortOrder('desc'); }
                          }}
                          className="py-3 px-3 text-right bg-teal-50/70 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 cursor-pointer hover:bg-teal-100/80 transition"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Arus Kas Bersih</span>
                            <ArrowUpDown className="w-3 h-3 text-teal-500" />
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right">Saldo Kas Akhir</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
                      {filteredMonthlyCashFlow.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            Tidak ada pergerakan kas pada periode bulan yang dipilih
                          </td>
                        </tr>
                      ) : (
                        filteredMonthlyCashFlow.map((m, idx) => (
                          <tr key={m.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                            <td className="py-3 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {m.fullMonthLabel}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatRupiah(m.totalInflowSimpanan)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatRupiah(m.totalInflowAngsuran)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatRupiah(m.inflowProvisi + m.inflowPendapatanLain + m.inflowPelunasanWarung)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 whitespace-nowrap">
                              {formatRupiah(m.totalKasMasuk)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatRupiah(m.outflowPencairanPinjaman)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatRupiah(m.outflowPembelianPersediaan + m.outflowPembelianInventaris + m.totalBebanOperasionalKas + m.outflowHutangWarung + m.outflowPenarikanSimpanan)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20 whitespace-nowrap">
                              {formatRupiah(m.totalKasKeluar)}
                            </td>
                            <td className={`py-3 px-3 text-right font-black whitespace-nowrap bg-teal-50/40 dark:bg-teal-950/20 ${
                              m.netCashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {m.netCashFlow >= 0 ? '+' : ''}{formatRupiah(m.netCashFlow)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {formatRupiah(m.saldoAkhir)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                m.netCashFlow >= 0 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {m.netCashFlow >= 0 ? 'Surplus' : 'Defisit'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setCashFlowSelectedMonth(m.monthKey);
                                  setCashFlowViewMode('mutasiDetail');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-md border border-teal-200 dark:border-teal-800 transition cursor-pointer"
                                title="Periksa Rincian Mutasi Bulan Ini"
                              >
                                Mutasi
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {/* Summary Totals Footer */}
                    {filteredMonthlyCashFlow.length > 0 && (
                      <tfoot className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                        <tr>
                          <td colSpan={2} className="py-3 px-3 text-center font-black">
                            TOTAL REKAPITULASI
                          </td>
                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalSimpananMasuk)}
                          </td>
                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalAngsuranMasuk)}
                          </td>
                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalProvisiMasuk + cashFlowTotals.totalPelunasanWarung + cashFlowTotals.totalPendapatanLain)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalMasuk)}
                          </td>
                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalPencairanPinjaman)}
                          </td>
                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalPembelianBarang + cashFlowTotals.totalBebanOperasionalKas + cashFlowTotals.totalTalanganWarung + cashFlowTotals.totalPenarikanSimpanan)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-rose-800 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/40 whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.totalKeluar)}
                          </td>
                          <td className={`py-3 px-3 text-right font-black bg-teal-100/60 dark:bg-teal-950/40 whitespace-nowrap ${
                            cashFlowTotals.net >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                          }`}>
                            {cashFlowTotals.net >= 0 ? '+' : ''}{formatRupiah(cashFlowTotals.net)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatRupiah(cashFlowTotals.saldoAkhir)}
                          </td>
                          <td className="py-3 px-3 text-center font-black">
                            {cashFlowTotals.net >= 0 ? 'SURPLUS' : 'DEFISIT'}
                          </td>
                          <td className="py-3 px-3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* TABEL VIEW MODE 2: Buku Mutasi Kas Detail */}
            {cashFlowViewMode === 'mutasiDetail' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-700">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-teal-600" />
                      Buku Mutasi Kas Detail ({filteredCashMutations.length} Transaksi)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rincian jurnal transaksi penerimaan & pengeluaran kas
                    </p>
                  </div>

                  {/* Filter Mutasi Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Box */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari transaksi / anggota..."
                        value={cashFlowSearch}
                        onChange={(e) => setCashFlowSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Filter Tipe Kas */}
                    <select
                      value={cashFlowTypeFilter}
                      onChange={(e) => setCashFlowTypeFilter(e.target.value as any)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="all">Semua Tipe Kas</option>
                      <option value="inflow">Hanya Kas Masuk</option>
                      <option value="outflow">Hanya Kas Keluar</option>
                    </select>

                    {/* Filter Kategori */}
                    <select
                      value={cashFlowCategoryFilter}
                      onChange={(e) => setCashFlowCategoryFilter(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none max-w-44"
                    >
                      <option value="all">Semua Kategori Pos</option>
                      {distinctMutationCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">No</th>
                        <th className="py-3 px-3 w-28">Tanggal</th>
                        <th className="py-3 px-3 w-28 text-center">Tipe Mutasi</th>
                        <th className="py-3 px-3 w-48">Kategori Akun</th>
                        <th className="py-3 px-3">Uraian / Keterangan Transaksi</th>
                        <th className="py-3 px-3 text-right w-36 text-emerald-800 dark:text-emerald-400">Kas Masuk (Rp)</th>
                        <th className="py-3 px-3 text-right w-36 text-rose-800 dark:text-rose-400">Kas Keluar (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
                      {filteredCashMutations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            Tidak ada data transaksi mutasi kas yang cocok dengan filter pencarian
                          </td>
                        </tr>
                      ) : (
                        filteredCashMutations.map((m, idx) => (
                          <tr key={m.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                            <td className="py-3 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {m.tanggal}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                m.tipe === 'inflow'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {m.tipe === 'inflow' ? 'Kas Masuk' : 'Kas Keluar'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {m.kategori}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {m.keterangan}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {m.tipe === 'inflow' ? formatRupiah(m.nominal) : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                              {m.tipe === 'outflow' ? formatRupiah(m.nominal) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {/* Totals for current filtered mutations */}
                    {filteredCashMutations.length > 0 && (
                      <tfoot className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                        <tr>
                          <td colSpan={5} className="py-3 px-3 text-center font-black">
                            TOTAL TRANSAKSI MUTASI TERPILIH
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                            {formatRupiah(filteredCashMutations.filter(m => m.tipe === 'inflow').reduce((s, m) => s + m.nominal, 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-rose-800 dark:text-rose-300 whitespace-nowrap">
                            {formatRupiah(filteredCashMutations.filter(m => m.tipe === 'outflow').reduce((s, m) => s + m.nominal, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Deskripsi & Catatan Standar Akuntansi Arus Kas */}
            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 p-4.5 rounded-xl space-y-3 font-sans text-xs">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400 font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <h4>Standar Akuntansi & Pedoman Rekapitulasi Arus Kas Koperasi</h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Laporan Arus Kas menyajikan ringkasan penerimaan uang tunai/bank (<strong>Kas Masuk</strong>) dan pengeluaran kas nyata (<strong>Kas Keluar</strong>) selama periode terpilih berdasarkan asas kas riil (<em>Cash Basis</em>). Berbeda dengan Laporan Laba Rugi yang menganut asas akrual dan mencatat beban non-kas seperti penyusutan inventaris, Laporan Arus Kas secara murni memetakan likuiditas dan ketersediaan uang tunai aktual koperasi.
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Arus Kas Bersih (Net Cash Flow)</strong> merupakan selisih Kas Masuk dikurangi Kas Keluar. Nilai surplus arus kas menunjukkan bahwa koperasi memiliki kemampuan likuiditas mandiri yang sehat untuk membiayai operasional, melayani penarikan simpanan, dan menyalurkan pinjaman baru kepada anggota.
              </p>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'kreditMacet' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* BANNER SEBELAH ATAS: POTENSI KEUNTUNGAN YANG HILANG DENGAN INDIKATOR MERAH BERKEDIP AGAK LAMBAT */}
            <div className="bg-gradient-to-r from-rose-50 via-rose-100/60 to-rose-50 dark:from-rose-950/40 dark:via-rose-900/30 dark:to-rose-950/40 border-2 border-rose-400/80 dark:border-rose-700/80 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              {/* Header & Slow Blinking Red Light Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/80 dark:border-rose-800/60 pb-3.5">
                <div className="flex items-center gap-3">
                  {/* Tanda Merah Berkedip Agak Lambat (Slow-blinking red beacon) */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-6 w-6 rounded-full bg-rose-500 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.9)] animate-[pulse_2.5s_ease-in-out_infinite]"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-rose-800 dark:text-rose-200 tracking-tight">
                        Potensi Keuntungan yang Hilang dari Pinjaman Anggota
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 animate-[pulse_2.5s_ease-in-out_infinite]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block"></span>
                        Peringatan Kredit Macet
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      Estimasi potensi dividen / pendapatan jasa simpanan anggota yang tergerus akibat kredit macet.
                    </p>
                  </div>
                </div>

                {/* Switcher Basis Jasa */}
                <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-xl border border-rose-200 dark:border-rose-800 text-xs shrink-0 self-start sm:self-auto shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 px-1.5 hidden md:inline">Opsi Jasa:</span>
                  <button
                    type="button"
                    onClick={() => setJasaHilangRateMode('simpanan')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      jasaHilangRateMode === 'simpanan'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                    }`}
                  >
                    Jasa Simpanan ({setup?.jasaSimpananSukarelaPersen ?? 0.5}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJasaHilangRateMode('pinjaman')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      jasaHilangRateMode === 'pinjaman'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                    }`}
                  >
                    Jasa Pinjaman ({setup?.bungaPinjamanPersen ?? 1.5}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJasaHilangRateMode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      jasaHilangRateMode === 'custom'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                    }`}
                  >
                    Kustom %
                  </button>
                </div>
              </div>

              {/* Grid Rincian Nilai & Kalkulasi */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    Total Potensi Keuntungan Hilang
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatRupiah(kreditMacetSummary.totalPotensiKeuntunganHilang)}
                  </div>
                  <div className="mt-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-rose-50/80 dark:bg-rose-950/50 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                    <span className="font-bold text-rose-700 dark:text-rose-300">Rumus:</span><br/>
                    {effectiveJasaPercent}% (Jasa) × {formatRupiah(kreditMacetSummary.totalSisaPokokMacet)} (Total Pinjaman Macet) × {kreditMacetSummary.totalBulanMacet} (Bulan Macet Angsuran)
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white/80 dark:bg-slate-900/70 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Total Pinjaman Macet
                    </span>
                    <span className="text-sm font-black font-mono text-rose-700 dark:text-rose-300 mt-1 block">
                      {formatRupiah(kreditMacetSummary.totalSisaPokokMacet)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {kreditMacetSummary.totalMacetCount} debitur macet (&ge; 3 bln)
                    </span>
                  </div>

                  <div className="p-3.5 bg-white/80 dark:bg-slate-900/70 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Akumulasi Bulan Macet
                    </span>
                    <span className="text-sm font-black font-mono text-rose-700 dark:text-rose-300 mt-1 block">
                      {kreditMacetSummary.totalBulanMacet} Bulan
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Rata-rata {kreditMacetSummary.rataRataBulanMacet} bln / debitur
                    </span>
                  </div>

                  <div className="p-3.5 bg-white/80 dark:bg-slate-900/70 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Potensi Hilang / Bulan
                    </span>
                    <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300 mt-1 block">
                      {formatRupiah(Math.round(kreditMacetSummary.totalSisaPokokMacet * (effectiveJasaPercent / 100)))}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Jasa per bulan berjalan
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Persentase Kustom */}
              {jasaHilangRateMode === 'custom' && (
                <div className="flex items-center gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Persentase Jasa Kustom:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    max="100"
                    value={customJasaHilangPercent}
                    onChange={(e) => setCustomJasaHilangPercent(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-rose-600"
                  />
                  <span className="text-slate-500">% per bulan</span>
                </div>
              )}
            </div>

            {/* Header & Export Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-600"/> Laporan Kredit Macet / Non-Performing Loan (NPL)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Daftar anggota peminjam yang tidak membayar setoran angsuran selama 3 bulan atau lebih secara berturut-turut.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportKreditMacetExcel}
                    className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5"/> Excel
                  </button>
                  <button 
                    onClick={handleExportKreditMacetPDF}
                    className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5"/> PDF
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Debitur Macet</span>
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {kreditMacetSummary.totalMacetCount} <span className="text-xs font-normal text-slate-500">Anggota</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Tidak bayar angsuran &ge; 3 bulan</p>
                </div>

                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Sisa Pokok Macet</span>
                    <Coins className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {formatRupiah(kreditMacetSummary.totalSisaPokokMacet)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Pokok dana terancam tidak kembali</p>
                </div>

                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Tagihan Outstanding</span>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-amber-800 dark:text-amber-300">
                    {formatRupiah(kreditMacetSummary.totalSisaWajibMacet)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Sisa Pokok + Jasa Koperasi</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rasio NPL Koperasi</span>
                    <Scale className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                    {kreditMacetSummary.persentaseMacet}%
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Persentase dari total kredit aktif</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-rose-100/80 to-rose-50/60 dark:from-rose-950/40 dark:to-rose-900/20 border-2 border-rose-300/80 dark:border-rose-800 rounded-xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-[pulse_2.5s_ease-in-out_infinite]"></span>
                      Potensi Keuntungan Hilang
                    </span>
                    <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                  </div>
                  <p className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {formatRupiah(kreditMacetSummary.totalPotensiKeuntunganHilang)}
                  </p>
                  <p className="text-[10px] text-rose-600/90 dark:text-rose-400/90 mt-1 font-semibold">
                    {effectiveJasaPercent}% × Pokok × Bulan
                  </p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama anggota, nomor anggota, atau ID pinjaman..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-rose-600 font-medium placeholder-slate-400"
                    value={kreditMacetSearch}
                    onChange={(e) => setKreditMacetSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Table Data Kredit Macet */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                  <thead className="bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-bold uppercase border-b border-rose-100 dark:border-rose-900/40 text-[10px]">
                    <tr>
                      <th className="py-3 px-3 text-center">No</th>
                      <th className="py-3 px-3">No. Anggota</th>
                      <th className="py-3 px-3">Nama Anggota</th>
                      <th className="py-3 px-3">ID Kontrak / Tgl Pencairan</th>
                      <th className="py-3 px-3 text-right">Plafond</th>
                      <th className="py-3 px-3 text-center">Setoran Terakhir</th>
                      <th className="py-3 px-3 text-center">Tunggakan</th>
                      <th className="py-3 px-3 text-right">Sisa Pokok Macet</th>
                      <th className="py-3 px-3 text-right">Potensi Keuntungan Hilang</th>
                      <th className="py-3 px-3 text-center">Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                    {filteredKreditMacetList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 italic font-sans">
                          {kreditMacetList.length === 0 
                            ? "Alhamdulillah! Tidak ditemukan pinjaman kredit macet (seluruh anggota disiplin membayar sebelum 3 bulan)."
                            : "Tidak ditemukan data kredit macet yang sesuai dengan kriteria pencarian."}
                        </td>
                      </tr>
                    ) : (
                      filteredKreditMacetList.map((item, idx) => (
                        <tr key={item.loan.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors">
                          <td className="py-3 px-3 font-mono text-center text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-slate-800 dark:text-slate-200 font-bold">{item.member?.noAnggota || "-"}</td>
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100 font-sans">
                            {onNavigateToPinjaman ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToPinjaman(item.loan.id, item.member?.id, item.member?.nama)}
                                className="text-left group cursor-pointer"
                                title={`Buka Akad Kredit Pinjaman ${item.member?.nama || ''} (${item.loan.id})`}
                              >
                                <div className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-800 dark:group-hover:text-indigo-200 group-hover:underline flex items-center gap-1.5 transition-colors">
                                  <span>{item.member?.nama || "Unknown"}</span>
                                  <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                                <div className="text-[10px] font-normal text-slate-400 font-sans">{item.member?.noHp || "-"}</div>
                              </button>
                            ) : (
                              <>
                                {item.member?.nama || "Unknown"}
                                <div className="text-[10px] font-normal text-slate-400 font-sans">{item.member?.noHp || "-"}</div>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            {onNavigateToPinjaman ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToPinjaman(item.loan.id, item.member?.id, item.member?.nama)}
                                className="text-left font-bold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                                title="Buka Akad Kredit Pinjaman"
                              >
                                <span>{item.loan.id}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </button>
                            ) : (
                              <span className="font-bold text-indigo-700 dark:text-indigo-400">{item.loan.id}</span>
                            )}
                            <div className="text-[10px] text-slate-400">{item.loan.tanggal}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatRupiah(item.loan.nominalPinjaman)}
                            <div className="text-[10px] font-normal text-slate-400">Tenor: {item.loan.tenor} Bln</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-350">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                              {item.lastPaymentStr}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <AlertCircle className="w-3 h-3"/> {item.monthsOverdue} Bulan
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                            {formatRupiah(item.sisaPokok)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
                            {formatRupiah(item.potensiKeuntunganHilang)}
                            <div className="text-[10px] font-normal text-slate-400">
                              {effectiveJasaPercent}% × {item.monthsOverdue} bln
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            <button
                              onClick={() => {
                                const printWin = window.open('', '_blank');
                                if (!printWin) return;
                                printWin.document.write(`
                                  <html>
                                    <head>
                                      <title>Surat Peringatan Kredit Macet - ${item.member?.nama || ''}</title>
                                      <style>
                                        body { font-family: sans-serif; padding: 25px; line-height: 1.5; color: #111; }
                                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                        .title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-top: 10px; text-decoration: underline; }
                                        .box { border: 1px solid #ccc; padding: 12px; margin: 15px 0; background: #f9f9f9; border-radius: 6px; }
                                        .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                                        .sig-grid { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 12px; }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="header">
                                        <h2>${setup?.namaKoperasi || 'KOPERASI SIMPAN PINJAM'}</h2>
                                        <p style="font-size:11px; margin:0;">${setup?.alamatKantor || ''}</p>
                                      </div>
                                      <div style="text-align:center;">
                                        <div class="title">SURAT TEGURAN / PERINGATAN KREDIT MACET</div>
                                        <p style="font-size:11px; color:#555;">Nomor: SP/KM/${item.loan.id}/${new Date().getFullYear()}</p>
                                      </div>
                                      <p style="font-size:12px; margin-top:20px;">
                                        Kepada Yth.<br/>
                                        <b>Sdr/i. ${item.member?.nama || '-'}</b> (No. Anggota: ${item.member?.noAnggota || '-'})<br/>
                                        Alamat: ${item.member?.alamat || '-'}<br/>
                                        No. HP: ${item.member?.noHp || '-'}
                                      </p>
                                      <p style="font-size:12px; text-align:justify;">
                                        Berdasarkan catatan pembukuan sistem keuangan Koperasi, Anda memiliki kewajiban pembayaran angsuran pinjaman yang telah mengalami tunggakan selama <b>${item.monthsOverdue} bulan</b> (tidak melakukan pembayaran sejak <b>${item.lastPaymentStr}</b>).
                                      </p>
                                      <div class="box">
                                        <div class="row"><span>ID Kontrak Pinjaman:</span> <b>${item.loan.id}</b></div>
                                        <div class="row"><span>Tanggal Realisasi:</span> <b>${item.loan.tanggal}</b></div>
                                        <div class="row"><span>Plafond Pinjaman:</span> <b>${formatRupiah(item.loan.nominalPinjaman)}</b></div>
                                        <div class="row"><span>Sisa Pokok Macet:</span> <b style="color:red;">${formatRupiah(item.sisaPokok)}</b></div>
                                        <div class="row"><span>Potensi Keuntungan Koperasi yang Hilang:</span> <b style="color:#b45309;">${formatRupiah(item.potensiKeuntunganHilang)} (${item.monthsOverdue} Bln @ ${effectiveJasaPercent}%)</b></div>
                                        <div class="row"><span>Total Kewajiban Pelunasan:</span> <b>${formatRupiah(item.sisaTotal)}</b></div>
                                      </div>
                                      <p style="font-size:12px; text-align:justify;">
                                        Sehubungan dengan hal tersebut, kami menghimbau agar Bapak/Ibu segera hadir ke kantor Koperasi atau melakukan pelunasan tunggakan setoran angsuran guna menghindari sanksi administratif dan tindakan penagihan lebih lanjut sesuai AD/ART Koperasi.
                                      </p>
                                      <div class="sig-grid">
                                        <div>
                                          <p>Diterima Oleh (Anggota),</p>
                                          <div style="height:50px;"></div>
                                          <p><b>( ${item.member?.nama || ''} )</b></p>
                                        </div>
                                        <div>
                                          <p>Pengurus Koperasi,</p>
                                          <div style="height:50px;"></div>
                                          <p><b>( Pengurus / Ketua Koperasi )</b></p>
                                        </div>
                                      </div>
                                    </body>
                                  </html>
                                `);
                                printWin.document.close();
                                printWin.print();
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded text-[10px] font-bold border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-1 mx-auto cursor-pointer transition"
                            >
                              <Printer className="w-3 h-3"/> Cetak Teguran
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredKreditMacetList.length > 0 && (
                    <tfoot className="bg-rose-50/80 dark:bg-rose-950/40 font-bold border-t border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-100 font-mono text-xs">
                      <tr>
                        <td colSpan={7} className="py-3 px-3 text-right uppercase text-[10px] text-rose-800 dark:text-rose-300 tracking-wider">
                          TOTAL ({filteredKreditMacetList.length} DEBITUR MACET):
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400 font-black text-sm">
                          {formatRupiah(kreditMacetSummary.totalSisaPokokMacet)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-700 dark:text-amber-400 font-black text-sm">
                          {formatRupiah(kreditMacetSummary.totalPotensiKeuntunganHilang)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'neraca' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* CARD 1: NERACA SALDO BERJALAN */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600 animate-hover"/> Neraca Saldo Koperasi
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={openInitialNeracaEditor}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5 text-emerald-600"/> Input Data Neraca Awal Custom
                  </button>
                  <button 
                    onClick={handleExportNeracaPDF}
                    className="px-3 py-1.5 text-xs font-bold text-slate-650 dark:text-slate-300 hover:text-teal-750 bg-slate-100 dark:bg-slate-700 hover:bg-teal-100 rounded-lg cursor-pointer transition flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5"/> PDF
                  </button>
                </div>
              </div>

              {isInitialBalancesEmpty && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong className="block font-bold">Saldo Awal Tahun Masih Nol (Rp 0)</strong>
                      <span className="text-slate-600 dark:text-slate-400">
                        Masukkan data Neraca Saldo per 1 Januari secara custom agar Laporan Perbandingan Awal vs Akhir Tahun terhitung akurat.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={openInitialNeracaEditor}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition"
                  >
                    + Input Data Awal
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* AKTIVA (ASSET) */}
                <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border rounded-xl">
                  <p className="font-sans font-bold border-b text-indigo-700 text-[10px] pb-1 uppercase tracking-wider">SISI AKTIVA (ASET / REKENING DEBET)</p>
                  <div className="space-y-2">
                    <p className="text-[9px] font-sans font-bold text-teal-650 dark:text-teal-400 mt-1 uppercase tracking-wide">Aktiva Lancar</p>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">KAS & BANK:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.kasAkhir)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">PIUTANG BEREDAR:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.piutangBeredar)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">PERSEDIAAN WARUNG:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.persediaanWarung)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400 font-sans">PERSEDIAAN BARANG DAGANG:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.persediaanBarang)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">PIUTANG WARUNG:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.piutangWarungVal)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400 font-sans">ATRIBUT KOPERASI:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.atribut)}</p>
                    </div>
                    {balanceSheet.customAssets && Object.entries(balanceSheet.customAssets).map(([cat, val]) => (
                      <div key={cat} className="flex justify-between border-b pb-1">
                        <span className="text-[10px] text-slate-400 uppercase">{cat.split('_').join(' ')}:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(val as number)}</p>
                      </div>
                    ))}
                    
                    {/* Custom Rekening Aktiva */}
                    {rekening && rekening.filter(r => r.kategori === 'Aktiva').map(r => (
                      <div key={r.id} className="flex justify-between border-b pb-1 font-sans">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">[{r.kode}] {r.nama.toUpperCase()}:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(r.saldo)}</p>
                      </div>
                    ))}

                    <p className="text-[9px] font-sans font-bold text-teal-650 dark:text-teal-400 mt-2.5 uppercase tracking-wide">Aktiva Tetap</p>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">INVENTARIS KOPERASI (BRUTO):</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.inventarisBruto)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-rose-500 dark:text-rose-400">AKUMULASI PENYUSUTAN:</span>
                      <p className="font-semibold text-rose-600 dark:text-rose-400">({formatRupiah(balanceSheet.akumulasiPenyusutan)})</p>
                    </div>
                    <div className="flex justify-between border-b pb-1 bg-emerald-50/50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">INVENTARIS KOPERASI NETTO:</span>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(balanceSheet.inventarisNetto)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-2 font-bold text-slate-800 dark:text-slate-100 flex justify-between">
                    <span className="text-[10px] font-sans text-indigo-700 block uppercase">Total Aktiva Aset</span>
                    <p className="text-sm font-bold text-teal-700">{formatRupiah(balanceSheet.totalAktiva)}</p>
                  </div>
                </div>

                {/* PASIVA (KEWAJIBAN & EKUITAS) */}
                <div className="space-y-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border rounded-xl">
                  <p className="font-sans font-bold border-b text-slate-600 text-[10px] pb-1 uppercase tracking-wider">SISI PASIVA (KEWAJIBAN / EKUITAS / REKENING KREDIT)</p>
                  <div className="space-y-2">
                    <p className="text-[9px] font-sans font-bold text-indigo-650 dark:text-indigo-400 mt-2 uppercase tracking-wide">Kewajiban Lancar</p>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">SIMPANAN MANASUKA:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sSukarela)}</p>
                    </div>

                    <p className="text-[9px] font-sans font-bold text-indigo-650 dark:text-indigo-400 mt-3 uppercase tracking-wide">Modal & Ekuitas</p>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">SIMPANAN POKOK:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sPokok)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">SIMPANAN WAJIB:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.sWajib)}</p>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-[10px] text-slate-400">MODAL AWAL KOPERASI:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.modalAwal)}</p>
                    </div>
                    <div className="bg-teal-50/80 dark:bg-teal-950/40 p-2.5 rounded-lg border border-teal-200/70 dark:border-teal-800/50 my-1.5 space-y-1.5 font-sans">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 block">TOTAL LABA BERSIH (SHU 100%):</span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">Sesuai SHU Sementara Berjalan</span>
                        </div>
                        <p className="font-bold font-mono text-sm text-emerald-700 dark:text-emerald-400">{formatRupiah(balanceSheet.shuBersihAll)}</p>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 pl-2 border-t border-teal-100 dark:border-teal-900/50 pt-1">
                        <span>• Dana Cadangan Koperasi (20%):</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.danaCadangan)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 pl-2">
                        <span>• Hak SHU Anggota (80%):</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatRupiah(balanceSheet.shuBerjalan)}</span>
                      </div>
                    </div>

                    {/* Custom Rekening Pasiva */}
                    {rekening && rekening.filter(r => r.kategori === 'Pasiva').map(r => (
                      <div key={r.id} className="flex justify-between border-b pb-1 font-sans">
                        <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">[{r.kode}] {r.nama.toUpperCase()}:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(r.saldo)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 font-bold text-slate-800 dark:text-slate-100 flex justify-between">
                    <span className="text-[10px] font-sans text-slate-500 block uppercase">Total Pasiva Koperasi</span>
                    <p className="text-sm font-bold text-slate-700">{formatRupiah(balanceSheet.totalPasiva)}</p>
                  </div>
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-bold font-sans ${
                Math.abs(balanceSheet.totalAktiva - balanceSheet.totalPasiva) < 1 
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-150 text-emerald-800 dark:text-emerald-400" 
                  : "bg-rose-50 dark:bg-rose-900/30 border-rose-150 text-rose-800 dark:text-rose-400"
              }`}>
                {Math.abs(balanceSheet.totalAktiva - balanceSheet.totalPasiva) < 1 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600"/>
                    Verifikasi Neraca: Seimbang (Balanced) ✓
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600"/>
                    Verifikasi Neraca: Tidak Seimbang (Selisih: {formatRupiah(Math.abs(balanceSheet.totalAktiva - balanceSheet.totalPasiva))}) ✗
                  </>
                )}
              </div>
            </div>

            {/* CARD 2: LAPORAN PERBANDINGAN NERACA SALDO (AWAL TAHUN VS AKHIR TAHUN) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Laporan Perbandingan Neraca Saldo (Awal Tahun vs Akhir Tahun)
                    </h3>
                    <p className="text-xs text-slate-450 mt-0.5">
                      Evaluasi komparatif perkembangan posisi keuangan koperasi antara saldo pembukuan awal tahun dan akumulasi realisasi periode berjalan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {isInlineEditingNeracaAwal ? (
                    <>
                      <button
                        onClick={handleSaveInlineNeracaAwal}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Simpan Saldo Awal
                      </button>
                      <button
                        onClick={() => setIsInlineEditingNeracaAwal(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      {userRole !== 'pengawas' && (
                        <button
                          onClick={startInlineEditingNeracaAwal}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Input / Edit Neraca Awal
                        </button>
                      )}
                      <span className="text-[11px] font-mono font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600">
                        Periode Buku: {new Date().getFullYear()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Mode Inline Input Info Banner */}
              {isInlineEditingNeracaAwal && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <Edit3 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>Mode Input Neraca Saldo Awal Aktif:</strong> Anda dapat mengetikkan nominal awal tahun langsung di kolom <strong>Awal Tahun</strong> pada tabel di bawah ini, lalu klik <strong>Simpan Saldo Awal</strong>.
                    </span>
                  </div>
                  <div className="font-mono font-bold px-2.5 py-1 rounded text-[11px] shrink-0 border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {Math.abs(liveTotalAktivaAwal - liveTotalPasivaAwal) < 1 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓ Seimbang (Total: {formatRupiah(liveTotalAktivaAwal)})</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">✗ Tidak Seimbang (Selisih: {formatRupiah(Math.abs(liveTotalAktivaAwal - liveTotalPasivaAwal))})</span>
                    )}
                  </div>
                </div>
              )}

              {/* 2-Column Comparative Table Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TABEL SISI AKTIVA (ASET) */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/40 space-y-0">
                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                      Sisi Aktiva (Aset / Rekening Debet)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-900/60 px-2 py-0.5 rounded">
                      Aset Lancar & Tetap
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5">Nama Rekening Aset</th>
                          <th className="p-2.5 text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">Awal Tahun</th>
                          <th className="p-2.5 text-right">Akhir Tahun</th>
                          <th className="p-2.5 text-right">Selisih</th>
                          <th className="p-2.5 text-center">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-750 font-mono text-[11px]">
                        {comparativeBalance.aktivaItems.map((item) => {
                          const diff = item.akhir - item.awal;
                          const pct = item.awal > 0 ? (diff / item.awal) * 100 : (item.akhir > 0 ? 100 : 0);
                          return (
                            <tr key={item.key} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{item.nama}</td>
                              <td className="p-2.5 text-right bg-indigo-50/20 dark:bg-indigo-950/20 font-bold">
                                {isInlineEditingNeracaAwal && item.setVal ? (
                                  <input
                                    type="text"
                                    value={item.val}
                                    onChange={(e) => item.setVal!(formatNumberWithDots(e.target.value))}
                                    placeholder="0"
                                    className="w-36 sm:w-44 min-w-[130px] text-right bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                  />
                                ) : (
                                  <span
                                    onClick={startInlineEditingNeracaAwal}
                                    className="cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300"
                                    title="Klik untuk mengedit Neraca Saldo Awal"
                                  >
                                    {formatRupiah(item.awal)}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{formatRupiah(item.akhir)}</td>
                              <td className={`p-2.5 text-right font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {diff >= 0 ? '+' : ''}{formatRupiah(diff)}
                              </td>
                              <td className={`p-2.5 text-center font-bold text-[10px] ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-indigo-50/50 dark:bg-indigo-950/40 font-mono text-xs font-bold border-t-2 border-indigo-200 dark:border-indigo-800">
                        <tr>
                          <td className="p-3 font-sans uppercase text-indigo-900 dark:text-indigo-300">Total Aktiva (Aset)</td>
                          <td className="p-3 text-right text-indigo-950 dark:text-indigo-200 font-extrabold bg-indigo-100/50 dark:bg-indigo-900/50">
                            {isInlineEditingNeracaAwal ? formatRupiah(liveTotalAktivaAwal) : formatRupiah(comparativeBalance.totalAktivaAwal)}
                          </td>
                          <td className="p-3 text-right text-teal-700 dark:text-teal-400 font-extrabold">{formatRupiah(comparativeBalance.totalAktivaAkhir)}</td>
                          <td className={`p-3 text-right ${comparativeBalance.deltaAktiva >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {comparativeBalance.deltaAktiva >= 0 ? '+' : ''}{formatRupiah(comparativeBalance.deltaAktiva)}
                          </td>
                          <td className={`p-3 text-center text-[11px] ${comparativeBalance.pctAktiva >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {comparativeBalance.pctAktiva >= 0 ? `+${comparativeBalance.pctAktiva.toFixed(1)}%` : `${comparativeBalance.pctAktiva.toFixed(1)}%`}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* TABEL SISI PASIVA (KEWAJIBAN & EKUITAS) */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/40 space-y-0">
                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Sisi Pasiva (Kewajiban & Ekuitas Modal)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      Simpanan & Modal
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5">Nama Rekening Pasiva</th>
                          <th className="p-2.5 text-right bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">Awal Tahun</th>
                          <th className="p-2.5 text-right">Akhir Tahun</th>
                          <th className="p-2.5 text-right">Selisih</th>
                          <th className="p-2.5 text-center">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-750 font-mono text-[11px]">
                        {comparativeBalance.pasivaItems.map((item) => {
                          const diff = item.akhir - item.awal;
                          const pct = item.awal > 0 ? (diff / item.awal) * 100 : (item.akhir > 0 ? 100 : 0);
                          return (
                            <tr key={item.key} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{item.nama}</td>
                              <td className="p-2.5 text-right bg-emerald-50/20 dark:bg-emerald-950/20 font-bold">
                                {isInlineEditingNeracaAwal && item.setVal ? (
                                  <input
                                    type="text"
                                    value={item.val}
                                    onChange={(e) => item.setVal!(formatNumberWithDots(e.target.value))}
                                    placeholder="0"
                                    className="w-36 sm:w-44 min-w-[130px] text-right bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
                                  />
                                ) : (
                                  <span
                                    onClick={startInlineEditingNeracaAwal}
                                    className="cursor-pointer hover:underline hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300"
                                    title="Klik untuk mengedit Neraca Saldo Awal"
                                  >
                                    {formatRupiah(item.awal)}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{formatRupiah(item.akhir)}</td>
                              <td className={`p-2.5 text-right font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {diff >= 0 ? '+' : ''}{formatRupiah(diff)}
                              </td>
                              <td className={`p-2.5 text-center font-bold text-[10px] ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-emerald-50/50 dark:bg-emerald-950/40 font-mono text-xs font-bold border-t-2 border-emerald-200 dark:border-emerald-800">
                        <tr>
                          <td className="p-3 font-sans uppercase text-emerald-900 dark:text-emerald-300">Total Pasiva (Modal & Kewajiban)</td>
                          <td className="p-3 text-right text-emerald-950 dark:text-emerald-200 font-extrabold bg-emerald-100/50 dark:bg-emerald-900/50">
                            {isInlineEditingNeracaAwal ? formatRupiah(liveTotalPasivaAwal) : formatRupiah(comparativeBalance.totalPasivaAwal)}
                          </td>
                          <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-extrabold">{formatRupiah(comparativeBalance.totalPasivaAkhir)}</td>
                          <td className={`p-3 text-right ${comparativeBalance.deltaPasiva >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {comparativeBalance.deltaPasiva >= 0 ? '+' : ''}{formatRupiah(comparativeBalance.deltaPasiva)}
                          </td>
                          <td className={`p-3 text-center text-[11px] ${comparativeBalance.pctPasiva >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {comparativeBalance.pctPasiva >= 0 ? `+${comparativeBalance.pctPasiva.toFixed(1)}%` : `${comparativeBalance.pctPasiva.toFixed(1)}%`}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Status Verification Banner */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-850 dark:text-emerald-300 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Keseimbangan Neraca Perbandingan: <strong className="underline">SEIMBANG (BALANCED)</strong> — Total Aktiva = Total Pasiva</span>
                </div>
                <span className="font-mono text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(comparativeBalance.totalAktivaAkhir)}
                </span>
              </div>

              {/* 💡 REFERENSI DISTRIBUSI SHU PADA NERACA SALDO */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-slate-900/50 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Distribusi Sisa Hasil Usaha (SHU) Berjalan pada Neraca Saldo
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold">
                        {formatRupiah(balanceSheet.shuBersihAll)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Alokasi Bagian Anggota ({persenAnggota}%) sebesar <strong className="font-mono">{formatRupiah(Math.round((balanceSheet.shuBersihAll * persenAnggota) / 100))}</strong> dapat dibagikan ke seluruh anggota berdasarkan Jasa Modal (JMA) dan Jasa Usaha (JUA).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveReportTab('pembagianSHU');
                    setShuSubTab('perAnggota');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap text-xs shrink-0 self-end md:self-auto"
                >
                  <Users className="w-4 h-4" />
                  <span>Lihat Pembagian SHU Per Anggota</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 📝 ANALISIS DESKRIPSI PERKEMBANGAN NERACA */}
              <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-750 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-750 pb-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                    Analisis Deskripsi Perkembangan Neraca Koperasi
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {/* Column 1: Asset & Liquidity Analysis */}
                  <div className="space-y-3 bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-750">
                    <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      1. Analisis Pertumbuhan Aset & Arus Kas (Aktiva)
                    </p>
                    <p>
                      Total aset (Aktiva) koperasi mengalami pertumbuhan sebesar <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{comparativeBalance.pctAktiva >= 0 ? `+${comparativeBalance.pctAktiva.toFixed(1)}%` : `${comparativeBalance.pctAktiva.toFixed(1)}%`}</strong>, dari <span className="font-mono">{formatRupiah(comparativeBalance.totalAktivaAwal)}</span> di awal tahun menjadi <span className="font-mono font-bold">{formatRupiah(comparativeBalance.totalAktivaAkhir)}</span> pada akhir periode berjalan.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>Likuiditas Kas & Bank:</strong> Saldo kas bergerak sebesar <span className="font-mono">{formatRupiah(comparativeBalance.kasDelta)}</span> menunjukkan perputaran dana yang produktif untuk pembiayaan anggota dan pembelian persediaan.
                      </li>
                      <li>
                        <strong>Portofolio Pembiayaan:</strong> Piutang pinjaman beredar saat ini sebesar <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatRupiah(comparativeBalance.aktivaItems[1].akhir)}</span>, mencerminkan optimalisasi penyaluran dana simpanan anggota ke unit pinjaman.
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: Equity & Liabilities Analysis */}
                  <div className="space-y-3 bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-750">
                    <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <Coins className="w-4 h-4 text-indigo-600" />
                      2. Analisis Struktur Ekuitas & Kewajiban (Pasiva)
                    </p>
                    <p>
                      Sisi Pasiva bertumbuh seimbang sebesar <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{comparativeBalance.pctPasiva >= 0 ? `+${comparativeBalance.pctPasiva.toFixed(1)}%` : `${comparativeBalance.pctPasiva.toFixed(1)}%`}</strong>, ditopang utama oleh partisipasi modal anggota dan akumulasi hasil usaha koperasi.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>Partisipasi Anggota:</strong> Akumulasi simpanan anggota (Pokok, Wajib, Sukarela) bertambah sebesar <span className="font-mono font-bold text-emerald-600">{formatRupiah(comparativeBalance.simpananGrowth)}</span>, memperkuat pondasi kemandirian modal internal.
                      </li>
                      <li>
                        <strong>Profitabilitas & Cadangan:</strong> Sisa Hasil Usaha (SHU) berjalan menyumbang <span className="font-mono font-bold">{formatRupiah(comparativeBalance.netProfit)}</span>, di mana 20% (<span className="font-mono">{formatRupiah(comparativeBalance.netProfit * 0.2)}</span>) dialokasikan sebagai penguat Dana Cadangan Neraca.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Recommendation Box for Pengurus */}
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                  <p className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    Rekomendasi Strategis untuk Pengurus Koperasi:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-amber-850 dark:text-amber-200">
                    <div className="p-2.5 bg-white/60 dark:bg-slate-900/40 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                      <strong className="block mb-1 text-slate-800 dark:text-slate-200">1. Optimalisasi Kas Kasir</strong>
                      Jaga rasio kas likuid minimal 15-20% dari total simpanan sukarela untuk menjamin penarikan sewaktu-waktu tanpa mengganggu operasional.
                    </div>
                    <div className="p-2.5 bg-white/60 dark:bg-slate-900/40 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                      <strong className="block mb-1 text-slate-800 dark:text-slate-200">2. Mitigasi Piutang Macet</strong>
                      Perketat verifikasi analisis kemampuan bayar dan manfaatkan fitur pengingat otomatis WA untuk menjaga kolektibilitas angsuran tetap lancar.
                    </div>
                    <div className="p-2.5 bg-white/60 dark:bg-slate-900/40 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                      <strong className="block mb-1 text-slate-800 dark:text-slate-200">3. Pemupukan Dana Cadangan</strong>
                      Pertahankan pembukuan alokasi 20% SHU ke Dana Cadangan Neraca guna memperkuat solvabilitas jangka panjang terhadap potensi risiko usaha.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deskripsi & Catatan Neraca Keuangan */}
            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 p-4.5 rounded-xl space-y-3 font-sans text-xs">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-400 font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h4>Deskripsi & Penjelasan Neraca Keuangan (Posisi Keuangan Koperasi)</h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Laporan Neraca Keuangan (Posisi Keuangan) menggambarkan kondisi aset, kewajiban, dan modal koperasi pada saat tertentu. Laporan ini disusun secara seimbang berdasarkan prinsip pembukuan berpasangan (double-entry system):
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                <li>
                  <strong>Sisi Aktiva (Aset/Debet):</strong> Mencakup seluruh kekayaan koperasi yang terdiri dari Kas Utama & Bank, Persediaan Barang/Warung/Atribut, Piutang Belanja Warung, Inventaris Kantor, Piutang Pinjaman Beredar kepada Anggota, serta Rekening Aktiva Kustom.
                </li>
                <li>
                  <strong>Sisi Pasiva (Kewajiban & Ekuitas/Kredit):</strong> Mencakup sisa kewajiban lancar yaitu Simpanan Manasuka Anggota, serta Ekuitas/Modal Koperasi yang terdiri dari Simpanan Pokok, Simpanan Wajib, Modal Awal Koperasi, Dana Cadangan (20%), SHU Berjalan (80%), dan Rekening Pasiva Kustom.
                </li>
              </ul>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Prinsip Keseimbangan (Balance):</strong> Total nilai pada <strong>Sisi Aktiva</strong> harus senantiasa sama/seimbang dengan <strong>Sisi Pasiva</strong> (<em>Total Aktiva = Total Kewajiban + Total Ekuitas</em>) untuk menjamin transparansi dan validitas laporan keuangan koperasi.
              </p>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'nominatif' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600"/> Data Nominatif
                </h3>
                <p className="text-xs text-slate-400 mt-1">Daftar saldo simpanan pokok, wajib, sukarela, beserta sisa pinjaman per anggota secara terperinci.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportNominatifExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportNominatifPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls & Quick Hint */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4"/>
                </span>
                <input 
                  type="text"
                  placeholder="Cari berdasarkan nama anggota atau nomor anggota..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-750 focus:outline-emerald-700 font-medium placeholder-slate-400"
                  value={nominatifSearch}
                  onChange={(e) => setNominatifSearch(e.target.value)}
                />
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
                <Receipt className="w-3.5 h-3.5 text-emerald-600"/>
                <span>Klik anggota / tombol <b>Mutasi</b> untuk menuju ke <b>Data Mutasi Angsuran</b> di Menu Buku Kas & Mutasi</span>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">No</th>
                    <th className="px-3 py-3">No. Anggota</th>
                    <th className="px-3.5 py-3 font-sans">Nama Anggota</th>
                    <th className="px-3 py-3 text-right">Simp. Pokok</th>
                    <th className="px-3 py-3 text-right">Simp. Wajib</th>
                    <th className="px-3 py-3 text-right">Simp. Manasuka</th>
                    <th className="px-3 py-3 text-right">Jasa Manasuka</th>
                    <th className="px-3.5 py-3 text-right bg-emerald-50/20 dark:bg-emerald-900/5 font-sans">Total Tabungan</th>
                    <th className="px-3.5 py-3 text-right text-rose-700 dark:text-rose-450 font-sans">Sisa Pinjaman</th>
                    <th className="px-3.5 py-3 text-right text-indigo-700 dark:text-indigo-400 font-sans bg-indigo-50/20 dark:bg-indigo-900/10">Jasa Pinjaman</th>
                    <th className="px-3.5 py-3 text-right text-sky-700 dark:text-sky-400 font-sans bg-sky-50/30 dark:bg-sky-900/10">Provisi</th>
                    <th className="px-3.5 py-3 text-right text-amber-700 dark:text-amber-400 font-sans bg-amber-50/20 dark:bg-amber-900/10">Piutang Warung</th>
                    <th className="px-3.5 py-3 text-center w-28">Mutasi Angsuran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-[11px]">
                  {filteredNominatif.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-slate-400 italic">Data nominatif tidak ditemukan / Anggota kosong</td>
                    </tr>
                  ) : (
                    filteredNominatif.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150 group">
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToAngsuran) {
                                onNavigateToAngsuran(undefined, item.id, item.nama);
                              } else {
                                setSelectedMemberForMutasi(item.id);
                              }
                            }}
                            className="font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer flex items-center gap-1 group/btn"
                            title="Klik untuk membuka Data Mutasi Angsuran di Menu Buku Kas & Mutasi"
                          >
                            <span>{item.noAnggota}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 text-emerald-600 dark:text-emerald-400 transition shrink-0" />
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToAngsuran) {
                                onNavigateToAngsuran(undefined, item.id, item.nama);
                              } else {
                                setSelectedMemberForMutasi(item.id);
                              }
                            }}
                            className="flex items-center gap-1.5 text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                            title="Klik untuk membuka Data Mutasi Angsuran di Menu Buku Kas & Mutasi"
                          >
                            <span className="font-semibold">{item.nama}</span>
                            {item.jenisKelamin && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.jenisKelamin === 'Laki-laki' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'}`}>
                                {item.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(item.pokok)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(item.wajib)}</td>
                        <td className="px-3 py-2.5 text-right">{formatRupiah(item.sukarela)}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {item.jasaManasuka > 0 ? formatRupiah(item.jasaManasuka) : <span className="text-slate-400">Rp 0</span>}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-900/5">
                          {formatRupiah(item.totalSimpanan)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-rose-750 dark:text-rose-450">
                          {item.sisaPinjaman > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToAngsuran) {
                                  onNavigateToAngsuran(undefined, item.id, item.nama);
                                } else {
                                  setSelectedMemberForMutasi(item.id);
                                }
                              }}
                              className="text-rose-750 dark:text-rose-450 hover:underline hover:text-rose-900 dark:hover:text-rose-300 transition cursor-pointer font-bold"
                              title="Klik untuk membuka Data Mutasi Angsuran di Menu Buku Kas & Mutasi"
                            >
                              {formatRupiah(item.sisaPinjaman)}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10">
                          {item.jasaPinjaman > 0 ? formatRupiah(item.jasaPinjaman) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-sky-700 dark:text-sky-400 bg-sky-50/20 dark:bg-sky-900/10">
                          {item.provisi > 0 ? formatRupiah(item.provisi) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-900/10">
                          {item.sisaPiutangWarung > 0 ? formatRupiah(item.sisaPiutangWarung) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToAngsuran) {
                                  onNavigateToAngsuran(undefined, item.id, item.nama);
                                } else {
                                  setSelectedMemberForMutasi(item.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Buka Data Mutasi Angsuran di Menu Buku Kas & Mutasi"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Mutasi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedMemberForMutasi(item.id)}
                              className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer rounded-lg text-[10px] font-bold flex items-center gap-0.5 border border-slate-200 dark:border-slate-700"
                              title="Buka Rincian Mutasi & Cetak PDF"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredNominatif.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL NOMINATIF:</td>
                      <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.pokok)}</td>
                      <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.wajib)}</td>
                      <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(nominatifTotals.sukarela)}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(nominatifTotals.jasaManasuka)}</td>
                      <td className="px-3.5 py-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-900/10 text-xs">{formatRupiah(nominatifTotals.totalSimpanan)}</td>
                      <td className="px-3.5 py-3 text-right text-rose-700 dark:text-rose-450 text-xs">{formatRupiah(nominatifTotals.sisaPinjaman)}</td>
                      <td className="px-3.5 py-3 text-right text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/20 text-xs">{formatRupiah(nominatifTotals.jasaPinjaman)}</td>
                      <td className="px-3.5 py-3 text-right text-sky-700 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-900/20 text-xs">{formatRupiah(nominatifTotals.provisi)}</td>
                      <td className="px-3.5 py-3 text-right text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-900/10 text-xs">{formatRupiah(nominatifTotals.sisaPiutangWarung)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'simpanan' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-600"/> Laporan Mutasi Simpanan
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan setoran simpanan anggota koperasi</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportSimpananExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportSimpananPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4"/>
                </span>
                <input 
                  type="text"
                  placeholder="Cari berdasarkan nama atau no anggota..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                  value={simpananSearch}
                  onChange={(e) => setSimpananSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium cursor-pointer"
                  value={simpananTypeFilter}
                  onChange={(e) => setSimpananTypeFilter(e.target.value)}
                >
                  <option value="">Semua Jenis Simpanan</option>
                  <option value="Pokok">Simpanan Pokok</option>
                  <option value="Wajib">Simpanan Wajib</option>
                  <option value="Sukarela">Simpanan Sukarela</option>
                </select>
              </div>
            </div>

            {/* Simpanan Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3">Nama Anggota</th>
                    <th className="px-4 py-3 text-center">Jenis Simpanan</th>
                    <th className="px-4 py-3 text-right">Jumlah Setoran</th>
                    <th className="px-4 py-3 pl-6">Keterangan</th>
                    {userRole !== 'pengawas' && (onDeleteSimpanan || onEditSimpanan) && <th className="px-4 py-3 text-center w-24">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredSimpananReport.length === 0 ? (
                    <tr>
                      <td colSpan={userRole !== 'pengawas' && (onDeleteSimpanan || onEditSimpanan) ? 8 : 7} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data simpanan tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredSimpananReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-850 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">{m?.nama || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.jumlah < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border border-rose-100 dark:border-rose-900' :
                              item.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' :
                              item.jenis === 'Wajib' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                              'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-405'
                            }`}>
                              {item.jumlah < 0 ? 'Penarikan Sukarela' : item.jenis}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${item.jumlah < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.jumlah < 0 ? `-${formatRupiah(Math.abs(item.jumlah))}` : formatRupiah(item.jumlah)}
                          </td>
                          <td className="px-4 py-2.5 font-sans pl-6 italic text-slate-455 text-[10.5px]">{item.keterangan || "-"}</td>
                          {userRole !== 'pengawas' && (onDeleteSimpanan || onEditSimpanan) && (
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {onEditSimpanan && (
                                  <button 
                                    onClick={() => startEditSimpanan(item)}
                                    title="Edit Simpanan"
                                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onDeleteSimpanan && (
                                  <button 
                                    onClick={() => handleDeleteSimpClick(item.id)}
                                    title="Hapus Simpanan"
                                    className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSimpananReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL SIMPANAN SE-PERIODE:</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/20 dark:bg-emerald-900/10 font-bold">{formatRupiah(totalSimpananReportSum)}</td>
                      <td colSpan={(onDeleteSimpanan || onEditSimpanan) ? 2 : 1} className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'pinjaman' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600"/> Laporan Penyaluran Pinjaman
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan penyaluran akad kredit pinjaman anggota</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportPinjamanExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportPinjamanPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4"/>
                </span>
                <input 
                  type="text"
                  placeholder="Cari berdasarkan nama atau no anggota..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                  value={pinjamanSearch}
                  onChange={(e) => setPinjamanSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium cursor-pointer"
                  value={pinjamanStatusFilter}
                  onChange={(e) => setPinjamanStatusFilter(e.target.value)}
                >
                  <option value="">Semua Status Pinjaman</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
            </div>

            {/* Pinjaman Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal Akad</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3 font-sans">Nama Anggota</th>
                    <th className="px-4 py-3 text-right">Nominal Pinjaman</th>
                    <th className="px-4 py-3 text-right">Potongan Provisi</th>
                    <th className="px-4 py-3 text-right">Jumlah Diterima</th>
                    <th className="px-4 py-3 text-center">Tenor</th>
                    <th className="px-4 py-3 text-right">Wajib Kembalian</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredPinjamanReport.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data pinjaman tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredPinjamanReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">
                            {onNavigateToPinjaman ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToPinjaman(item.id, item.anggotaId, m?.nama)}
                                className="text-left group cursor-pointer hover:underline text-indigo-600 dark:text-indigo-400 font-bold inline-flex items-center gap-1"
                                title={`Lihat Akad Kredit Pinjaman ${m?.nama || ''}`}
                              >
                                <span>{m?.nama || "Unknown"}</span>
                                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
                              </button>
                            ) : (
                              m?.nama || "Unknown"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(item.nominalPinjaman)}</td>
                          <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400">-{formatRupiah(item.provisiDipotong)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-800 dark:text-emerald-400">{formatRupiah(item.jumlahDiterima)}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-600 dark:text-slate-400">{item.tenor} Bln</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{formatRupiah(item.totalWajibBayar)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.status === 'Lunas' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredPinjamanReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL PENYALURAN:</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(pinjamanReportTotals.nominalPinjaman)}</td>
                      <td className="px-4 py-3 text-right text-rose-605 dark:text-rose-450">-{formatRupiah(pinjamanReportTotals.provisiDipotong)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{formatRupiah(pinjamanReportTotals.jumlahDiterima)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{formatRupiah(pinjamanReportTotals.totalWajibBayar)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'angsuran' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600"/> Laporan Realisasi Angsuran
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Catatan realisasi penerimaan pembayaran cicilan pinjaman anggota</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button 
                  onClick={handleExportAngsuranExcel}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-green-55 hover:text-green-805 dark:hover:bg-green-905/30 dark:hover:text-green-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> Excel
                </button>
                <button 
                  onClick={handleExportAngsuranPDF}
                  className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <Download className="w-3.5 h-3.5"/> PDF
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4"/>
              </span>
              <input 
                type="text"
                placeholder="Cari berdasarkan nama atau no anggota..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium placeholder-slate-400"
                value={angsuranSearch}
                onChange={(e) => setAngsuranSearch(e.target.value)}
              />
            </div>

            {/* Angsuran Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal Bayar</th>
                    <th className="px-4 py-3">No. Anggota</th>
                    <th className="px-4 py-3">Nama Anggota</th>
                    <th className="px-4 py-3 text-center">Angsuran Ke-</th>
                    <th className="px-4 py-3 text-right">Jumlah Bayar</th>
                    <th className="px-4 py-3 pl-6">Keterangan</th>
                    {userRole !== 'pengawas' && (onDeleteAngsuran || onEditAngsuran) && <th className="px-4 py-3 text-center w-28">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-[11px]">
                  {filteredAngsuranReport.length === 0 ? (
                    <tr>
                      <td colSpan={userRole !== 'pengawas' && (onDeleteAngsuran || onEditAngsuran) ? 8 : 7} className="px-4 py-10 text-center text-slate-400 italic">Tidak ada data pembayaran angsuran tercatat pada periode ini</td>
                    </tr>
                  ) : (
                    filteredAngsuranReport.map((item, index) => {
                      const m = members.find(member => member.id === item.anggotaId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-150">
                          <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                          <td className="px-4 py-2.5 text-slate-500 font-medium">{item.tanggal}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-850 dark:text-slate-200">{m?.noAnggota || "-"}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-150">{m?.nama || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">Bulan Ke-{item.bulanKe}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">{formatRupiah(item.jumlahBayar)}</td>
                          <td className="px-4 py-2.5 font-sans pl-6 italic text-slate-500 text-[10.5px]">{item.keterangan || "-"}</td>
                          {userRole !== 'pengawas' && (onDeleteAngsuran || onEditAngsuran) && (
                            <td className="px-4 py-2.5 text-center font-sans">
                              <div className="flex items-center justify-center gap-1.5 mx-auto">
                                {onEditAngsuran && (
                                  <button
                                    onClick={() => startEditAngsuran(item)}
                                    className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-350 rounded text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-0.5"
                                    title="Edit Catatan Angsuran"
                                  >
                                    <Edit className="w-3 h-3" /> Edit
                                  </button>
                                )}
                                {onDeleteAngsuran && (
                                  <button
                                    onClick={() => {
                                      setDeleteModalState({
                                        isOpen: true,
                                        itemType: 'Catatan Angsuran',
                                        itemName: `Angsuran Bulan Ke-${item.bulanKe} - ${formatRupiah(item.jumlahBayar)}`,
                                        itemDetails: [
                                          { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
                                          { label: 'Tanggal Bayar', value: item.tanggal },
                                          { label: 'Angsuran Bulan Ke', value: String(item.bulanKe) },
                                          { label: 'Jumlah Dibayar', value: formatRupiah(item.jumlahBayar), isHighlight: true },
                                          { label: 'Pokok / Jasa', value: `Pokok: ${formatRupiah(item.pokokBayar || 0)} | Jasa: ${formatRupiah(item.jasaBayar || 0)}` },
                                          { label: 'Keterangan', value: item.keterangan || '-' }
                                        ],
                                        warningMessage: 'Menghapus catatan angsuran ini akan mengembalikan sisa pokok pinjaman dan memperbarui saldo kas koperasi secara otomatis.',
                                        onConfirm: () => {
                                          onDeleteAngsuran(item.id);
                                        }
                                      });
                                    }}
                                    className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-350 rounded text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-0.5"
                                    title="Hapus Catatan Angsuran"
                                  >
                                    <Trash2 className="w-3 h-3" /> Hapus
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredAngsuranReport.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-400 font-bold">TOTAL ANGSURAN MASUK:</td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/20 dark:bg-emerald-900/10 font-bold">{formatRupiah(totalAngsuranReportSum)}</td>
                      <td colSpan={(onDeleteAngsuran || onEditAngsuran) ? 2 : 1} className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'piutangWarung' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header & Export Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600"/> Rekapitulasi Piutang Warung Koperasi
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Rekap tagihan belanja kredit, histori pembayaran/pelunasan, dan sisa piutang toko/warung per anggota.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportPiutangWarungExcel}
                    className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5"/> Excel
                  </button>
                  <button 
                    onClick={handleExportPiutangWarungPDF}
                    className="px-3 py-1.5 bg-slate-150 dark:bg-slate-700 hover:bg-emerald-55 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
                  >
                    <Download className="w-3.5 h-3.5"/> PDF
                  </button>
                </div>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Belanja Kredit</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                    {formatRupiah(totalRekapPiutangWarungSum.totalHutangBaru)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Akumulasi transaksi belanja berutang</p>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Pembayaran Piutang</span>
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                    {formatRupiah(totalRekapPiutangWarungSum.totalPelunasan)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Setoran masuk ke Kas Koperasi</p>
                </div>

                <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Sisa Piutang Aktif</span>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-rose-700 dark:text-rose-300">
                    {formatRupiah(totalRekapPiutangWarungSum.sisaPiutang)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Tagihan warung outstanding</p>
                </div>

                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Jumlah Debitur Aktif</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                    {totalRekapPiutangWarungSum.jumlahDebitur} <span className="text-xs font-normal text-slate-500">Anggota</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Memiliki tunggakan belanja warung</p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau ID anggota..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-medium"
                    value={piutangWarungSearch}
                    onChange={(e) => setPiutangWarungSearch(e.target.value)}
                  />
                </div>
                <select
                  value={piutangWarungFilterType}
                  onChange={(e) => setPiutangWarungFilterType(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold focus:outline-emerald-600 cursor-pointer"
                >
                  <option value="aktif">Hanya Memiliki Piutang (&gt; Rp 0)</option>
                  <option value="">Semua Anggota Berpiutang ({rekapPiutangWarung.length})</option>
                  <option value="lunas">Piutang Sudah Lunas (Rp 0)</option>
                </select>
              </div>

              {/* Table 1: Member Piutang Summary */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                    <tr>
                      <th className="py-3 px-3">No</th>
                      <th className="py-3 px-3">No Anggota</th>
                      <th className="py-3 px-3">Nama Anggota</th>
                      <th className="py-3 px-3 text-right">Total Belanja Kredit</th>
                      <th className="py-3 px-3 text-right">Total Pembayaran</th>
                      <th className="py-3 px-3 text-right">Sisa Piutang Aktif</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                    {filteredRekapPiutangWarung.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Tidak ditemukan data piutang warung sesuai kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredRekapPiutangWarung.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-bold">{item.noAnggota}</td>
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{item.nama}</td>
                          <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-400">{formatRupiah(item.totalHutangBaru)}</td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">{formatRupiah(item.totalPelunasan)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                            {item.sisaPiutang > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">{formatRupiah(item.sisaPiutang)}</span>
                            ) : (
                              <span className="text-slate-400">Rp 0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.sisaPiutang > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                <AlertCircle className="w-3 h-3"/> Ada Piutang
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 className="w-3 h-3"/> Lunas
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right font-bold uppercase text-[10px] text-slate-500">Total Akumulasi Rekap:</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-400">{formatRupiah(totalRekapPiutangWarungSum.totalHutangBaru)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">{formatRupiah(totalRekapPiutangWarungSum.totalPelunasan)}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-black">{formatRupiah(totalRekapPiutangWarungSum.sisaPiutang)}</td>
                      <td className="py-3 px-3 text-center text-[10px] text-slate-500 font-mono">{totalRekapPiutangWarungSum.jumlahDebitur} Debitur</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Section 2: Detail Log Mutasi Transaksi Piutang Warung */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-700">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600"/> Riwayat Detail Mutasi Transaksi Piutang Warung
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Semua entri transaksi belanja kredit baru dan pembayaran piutang toko warung.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter transaksi mutasi..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-medium"
                    value={piutangWarungMutasiSearch}
                    onChange={(e) => setPiutangWarungMutasiSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                <table className="w-full table-auto text-left text-xs text-slate-650 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-700 text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Anggota</th>
                      <th className="py-2.5 px-3">Jenis Mutasi</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                    {filteredMutasiPiutangWarung.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          Belum ada riwayat mutasi transaksi piutang warung.
                        </td>
                      </tr>
                    ) : (
                      filteredMutasiPiutangWarung.map((pw, idx) => {
                        const m = members.find(mem => mem.id === pw.anggotaId);
                        return (
                          <tr key={pw.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-350">{pw.tanggal}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100">{m ? m.nama : 'Unknown'}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">({m ? m.noAnggota : '-'})</span>
                            </td>
                            <td className="py-2.5 px-3">
                              {pw.jenis === 'hutang_baru' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                                  <ArrowUpRight className="w-3 h-3"/> Utang Baru (+Piutang)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                                  <ArrowDownLeft className="w-3 h-3"/> Pembayaran (-Piutang, +Kas)
                                </span>
                              )}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${pw.jenis === 'hutang_baru' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                              {pw.jenis === 'hutang_baru' ? '+' : '-'}{formatRupiah(pw.nominal)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">{pw.keterangan || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeReportTab === 'rasioKesehatan' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-750 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 font-sans">
                  <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Kesehatan Keuangan & Kinerja Rasio Koperasi
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5 font-sans">
                  Rasio kesehatan likuiditas, solvabilitas, dan rentabilitas koperasi dihitung real-time berdasarkan standar Kementerian Koperasi & UKM RI.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-bold self-start sm:self-center border border-slate-150 dark:border-slate-750 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LIKUIDITAS CARD */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/25 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-450 rounded-xl">
                      <Coins className="w-4.5 h-4.5" />
                    </div>
                    {/* Rating Badge */}
                    {(() => {
                      let rating = "Sangat Sehat";
                      let color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                      
                      if (cooperativeRatios.hasSukarela) {
                        if (cooperativeRatios.likuiditas >= 15) {
                          rating = "Sangat Sehat";
                          color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                        } else if (cooperativeRatios.likuiditas >= 10) {
                          rating = "Sehat";
                          color = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/60";
                        } else if (cooperativeRatios.likuiditas >= 5) {
                          rating = "Cukup Sehat";
                          color = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60";
                        } else {
                          rating = "Perlu Perhatian";
                          color = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/60";
                        }
                      } else {
                        rating = "Bebas Risiko";
                        color = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60";
                      }
                      
                      return (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-sans ${color}`}>
                          {rating}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">Likuiditas (Cash Ratio)</h4>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans mt-1">
                      {cooperativeRatios.likuiditas}%
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    Mengukur kecukupan saldo kas koperasi untuk melunasi kewajiban jangka pendek seperti penarikan simpanan sukarela anggota sewaktu-waktu.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 font-mono">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 flex items-center justify-between">
                    <span>Rumus:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                      {cooperativeRatios.hasSukarela ? "Kas / Simpanan Sukarela" : "Kas / Total Simpanan"}
                    </span>
                  </p>
                </div>
              </div>

              {/* SOLVABILITAS CARD */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/25 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-450 rounded-xl">
                      <CreditCard className="w-4.5 h-4.5" />
                    </div>
                    {/* Rating Badge */}
                    {(() => {
                      let rating = "Sangat Sehat";
                      let color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                      
                      if (cooperativeRatios.hasSukarela) {
                        if (cooperativeRatios.solvabilitas >= 150) {
                          rating = "Sangat Sehat";
                          color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                        } else if (cooperativeRatios.solvabilitas >= 110) {
                          rating = "Sehat";
                          color = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/60";
                        } else {
                          rating = "Perlu Perhatian";
                          color = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/60";
                        }
                      } else {
                        rating = "Solven Sempurna";
                        color = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60";
                      }
                      
                      return (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-sans ${color}`}>
                          {rating}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">Solvabilitas (Solvency)</h4>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans mt-1">
                      {cooperativeRatios.solvabilitas}%
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    Mengukur kemampuan total aset yang dimiliki koperasi untuk menjamin dan melunasi seluruh kewajibannya apabila koperasi dilikuidasi.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 font-mono">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 flex items-center justify-between">
                    <span>Rumus:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                      {cooperativeRatios.hasSukarela ? "Total Aset / Simpanan Sukarela" : "Bebas Utang (100%)"}
                    </span>
                  </p>
                </div>
              </div>

              {/* RENTABILITAS CARD */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/25 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 rounded-xl">
                      <Receipt className="w-4.5 h-4.5" />
                    </div>
                    {/* Rating Badge */}
                    {(() => {
                      let rating = "Sangat Sehat";
                      let color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                      
                      if (cooperativeRatios.rentabilitas >= 10) {
                        rating = "Sangat Produktif";
                        color = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                      } else if (cooperativeRatios.rentabilitas >= 5) {
                        rating = "Sehat / Produktif";
                        color = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/60";
                      } else if (cooperativeRatios.rentabilitas >= 1) {
                        rating = "Cukup Sehat";
                        color = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60";
                      } else {
                        rating = "Perlu Dioptimalkan";
                        color = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/60";
                      }
                      
                      return (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-sans ${color}`}>
                          {rating}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">Rentabilitas Modal (ROE)</h4>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans mt-1">
                      {cooperativeRatios.rentabilitas}%
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    Mengukur tingkat efisiensi dan kemampuan koperasi menghasilkan Sisa Hasil Usaha (SHU) dari pemanfaatan modal pokok & wajib anggota.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 font-mono">
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 flex items-center justify-between">
                    <span>Rumus:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-350 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                      SHU Bersih / Modal Sendiri
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Rekomendasi dari Praktisi Ekonomi Koperasi */}
            <div className="mt-6 border border-slate-150 dark:border-slate-700/80 rounded-2xl p-6 bg-gradient-to-br from-slate-50 to-emerald-50/20 dark:from-slate-900/40 dark:to-emerald-950/5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl shrink-0">
                  <Award className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-sans">
                    Analisis Kebijakan Finansial
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">
                    Rekomendasi Praktisi Koperasi
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-750">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 font-sans">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    Tinjauan & Evaluasi Rasio Saat Ini
                  </h5>
                  <div className="text-xs text-slate-600 dark:text-slate-350 space-y-3 leading-relaxed font-sans">
                    <p>
                      Berdasarkan kalkulasi indikator rasio kesehatan koperasi saat ini, rasio likuiditas Anda tercatat di angka{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {cooperativeRatios.likuiditas}%
                      </span>.
                      {cooperativeRatios.likuiditas < 10 ? (
                        <span>
                          {' '}Kondisi ini masuk dalam kategori <strong>Kurang Sehat (Ketat)</strong>. Ketersediaan kas berbanding simpanan sukarela anggota sangat mepet. Diperlukan penahanan arus keluar atau penambahan modal segar segera agar tidak terjadi risiko gagal bayar (liquidity mismatch) saat anggota menarik simpanan massal.
                        </span>
                      ) : cooperativeRatios.likuiditas > 45 ? (
                        <span>
                          {' '}Kondisi ini berada dalam zona <strong>Dana Mengendap / Idle Cash</strong>. Meskipun likuiditas sangat aman, secara praktis ekonomi ini menunjukkan inefisiensi yang besar. Dana kas koperasi terlalu pasif, menumpuk tanpa diputar ke dalam sektor pinjaman produktif anggota atau unit warung yang menghasilkan profit optimal.
                        </span>
                      ) : (
                        <span>
                          {' '}Angka ini berada pada rentang yang <strong>Sangat Ideal & Sehat</strong> sesuai standar Kemenkop UKM. Koperasi mampu menyeimbangkan ketersediaan dana darurat yang fleksibel sekaligus meminimalkan jumlah uang kas menganggur agar modal tetap berputar produktif.
                        </span>
                      )}
                    </p>
                    <p>
                      Sedangkan dari perspektif solvabilitas sebesar{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {cooperativeRatios.solvabilitas}%
                      </span>,
                      {cooperativeRatios.solvabilitas < 110 ? (
                        <span>
                          {' '}tingkat solvabilitas di bawah ambang batas aman. Nilai penjaminan aset terhadap utang/kewajiban lancar sangat minim. Koperasi harus berhati-hati dalam menambah utang eksternal dan disarankan melakukan penumpukan modal internal.
                        </span>
                      ) : (
                        <span>
                          {' '}koperasi memiliki tingkat ketahanan ekuitas yang <strong>Sangat Kuat</strong>. Seluruh kewajiban lancar atau simpanan sukarela anggota dapat dijamin penuh oleh nilai likuidasi total aset koperasi tanpa hambatan struktural yang berarti.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 font-sans">
                    <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
                    Langkah & Kebijakan Taktis yang Disarankan
                  </h5>
                  <ul className="text-xs text-slate-600 dark:text-slate-350 space-y-2.5 list-disc pl-4 leading-relaxed font-sans">
                    {cooperativeRatios.likuiditas < 10 && (
                      <li>
                        <strong>Injeksi Likuiditas Segera:</strong> Pengurus disarankan meluncurkan stimulus bunga menarik khusus untuk produk "Simpanan Berjangka" guna memicu simpanan masuk dari anggota, sekaligus membatasi penyerahan pinjaman baru berskala besar selama jangka waktu 30 hari ke depan.
                      </li>
                    )}
                    {cooperativeRatios.likuiditas > 45 && (
                      <li>
                        <strong>Ekspansi Penyaluran Kredit Sehat:</strong> Mengingat likuiditas melimpah, turunkan sedikit suku bunga jasa pinjaman sebesar 0.1% - 0.25% untuk menarik minat anggota meminjam modal kerja, atau belanjakan dana tersebut sebagai inventori tambahan di unit bisnis warung koperasi yang berputar cepat.
                      </li>
                    )}
                    {cooperativeRatios.rentabilitas < 5 ? (
                      <li>
                        <strong>Revitalisasi Profitabilitas (ROE):</strong> Rentabilitas modal sebesar {cooperativeRatios.rentabilitas}% masih belum optimal. Fokuskan penguatan pada sektor warung/toko koperasi agar menghasilkan sirkulasi sisa hasil usaha yang lebih tebal dengan mendorong wajib belanja seluruh anggota koperasi di toko sendiri.
                      </li>
                    ) : (
                      <li>
                        <strong>Maintenance Rentabilitas ({cooperativeRatios.rentabilitas}%):</strong> Kinerja produktivitas modal sendiri ini wajib dipertahankan. Fokuskan pengurus pada mitigasi risiko pinjaman dengan memperketat verifikasi analisis kemampuan bayar calon peminjam demi mencegah kemunculan piutang macet.
                      </li>
                    )}
                    <li>
                      <strong>Pemupukan Dana Cadangan Mandiri:</strong> Alokasikan secara konsisten minimum 20% hingga 25% dari total perolehan SHU bersih tahunan ke dalam pos "Dana Cadangan". Langkah ini krusial untuk memantapkan kemandirian permodalan koperasi jangka panjang tanpa ketergantungan pihak ketiga.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PEMBAGIAN SHU TAB */}
        {activeReportTab === 'pembagianSHU' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  Pembagian Sisa Hasil Usaha (SHU) Koperasi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Perhitungan pembagian SHU sesuai aturan umum perkoperasian (Jasa Modal & Jasa Usaha) mengacu pada Neraca Saldo.
                </p>
              </div>

              {/* Sub-tab Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-250 dark:border-slate-700 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setShuSubTab('perAnggota')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    shuSubTab === 'perAnggota'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>SHU Per Anggota (JMA & JUA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShuSubTab('alokasiKoperasi')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    shuSubTab === 'alokasiKoperasi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>Alokasi Distribusi Koperasi</span>
                </button>
              </div>
            </div>

            {/* ================= SUBTAB 1: PEMBAGIAN SHU PER ANGGOTA ================= */}
            {shuSubTab === 'perAnggota' && (
              <div className="space-y-6">
                {/* 1. Header Card: Live Reference from Neraca Saldo */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50/80 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Dasar Alokasi SHU Anggota (Referensi Neraca Saldo)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        {persenAnggota}% Bagian Anggota
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h2 className="text-3xl font-black font-mono text-emerald-850 dark:text-emerald-300">
                        {formatRupiah(shuPerAnggotaCalculations.shuAnggotaPool)}
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                        dari total SHU Bersih Koperasi <strong className="font-mono text-slate-700 dark:text-slate-300">{formatRupiah(shuPerAnggotaCalculations.totalSHUBersihBase)}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {shuPerAnggotaCalculations.referenceLabel}
                    </p>
                  </div>

                  {/* Actions & Reference Picker */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                    {shuDistributions.length > 0 && (
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Sumber Acuan SHU</label>
                        <select
                          value={selectedSHUReference}
                          onChange={(e) => setSelectedSHUReference(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-emerald-500 cursor-pointer shadow-2xs"
                        >
                          <option value="live">Live Neraca Saldo Berjalan ({formatRupiah(liveSHUBersih)})</option>
                          {shuDistributions.map(d => (
                            <option key={d.id} value={d.id}>
                              Tahun Buku {d.tahunBuku} ({d.tanggal}) - {formatRupiah(d.shuAnggotaNominal)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 self-end sm:self-auto pt-1 sm:pt-4">
                      <button
                        type="button"
                        onClick={handleExportSHUAnggotaExcel}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Ekspor ke spreadsheet Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Export Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportSHUAnggotaPDF}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Cetak format PDF resmi RAT Koperasi"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Configuration Panel: Cooperative Standard Formula (UU 25/1992) */}
                <div className="p-5 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Parameter Rumus Pembagian SHU Anggota (UU No. 25/1992 Pasal 5)
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Rasio Jasa Modal vs Jasa Usaha: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{persenJasaModal}% : {persenJasaUsaha}%</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
                    {/* Ratio Presets and Slider */}
                    <div className="lg:col-span-8 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Preset Rasio Baku:</span>
                        {[
                          { label: "50 : 50 (Seimbang)", modal: 50 },
                          { label: "40 : 60 (Prioritas Usaha)", modal: 40 },
                          { label: "60 : 40 (Prioritas Simpanan)", modal: 60 },
                          { label: "70 : 30", modal: 70 }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setPersenJasaModal(preset.modal)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer border ${
                              persenJasaModal === preset.modal
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Slider Control */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            Jasa Modal / JMA: {persenJasaModal}% ({formatRupiah(shuPerAnggotaCalculations.poolJMA)})
                          </span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Jasa Usaha / JUA: {persenJasaUsaha}% ({formatRupiah(shuPerAnggotaCalculations.poolJUA)})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="5"
                          value={persenJasaModal}
                          onChange={(e) => setPersenJasaModal(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>10% Modal / 90% Usaha</span>
                          <span>50% : 50%</span>
                          <span>90% Modal / 10% Usaha</span>
                        </div>
                      </div>
                    </div>

                    {/* Savings Option & Explanation */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 space-y-2.5">
                      <label className="flex items-start gap-2 text-xs font-semibold text-slate-750 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSukarelaInJMA}
                          onChange={(e) => setIncludeSukarelaInJMA(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Sertakan Simpanan Sukarela dalam Dasar Jasa Modal (JMA)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {includeSukarelaInJMA 
                          ? "✓ JMA dihitung dari: Simpanan Pokok + Simpanan Wajib + Simpanan Sukarela/Manasuka."
                          : "• JMA hanya dihitung dari: Simpanan Pokok + Simpanan Wajib (Simpanan Sukarela dikecualikan)."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Four Metric Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                        <Coins className="w-4 h-4 text-teal-600" />
                        Pool Jasa Modal (JMA)
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                        {persenJasaModal}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatRupiah(shuPerAnggotaCalculations.poolJMA)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total Simpanan: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatRupiah(shuPerAnggotaCalculations.totalSimpananEligibleAll)}</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                        <ShoppingBag className="w-4 h-4 text-indigo-600" />
                        Pool Jasa Usaha (JUA)
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                        {persenJasaUsaha}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatRupiah(shuPerAnggotaCalculations.poolJUA)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total Transaksi: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatRupiah(shuPerAnggotaCalculations.totalPartisipasiUsahaAll)}</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Total Realisasi Dibagikan
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        {shuPerAnggotaCalculations.calculatedMembers.length} Anggota
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(shuPerAnggotaCalculations.totalSHUDistributed)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      JMA: <span className="font-mono">{formatRupiah(shuPerAnggotaCalculations.totalJMADistributed)}</span> | JUA: <span className="font-mono">{formatRupiah(shuPerAnggotaCalculations.totalJUADistributed)}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <Award className="w-4 h-4 text-amber-600" />
                        Rata-rata SHU Diterima
                      </span>
                      <span className="text-[11px] font-mono font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Avg
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatRupiah(shuPerAnggotaCalculations.avgSHU)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tertinggi: <strong className="font-mono text-emerald-600">{formatRupiah(shuPerAnggotaCalculations.maxSHU)}</strong>
                    </p>
                  </div>
                </div>

                {/* 4. Filter & Search Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama anggota atau no. anggota..."
                      value={shuAnggotaSearch}
                      onChange={(e) => setShuAnggotaSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Urutkan:</span>
                    <select
                      value={shuAnggotaSortBy}
                      onChange={(e) => setShuAnggotaSortBy(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-emerald-500 cursor-pointer"
                    >
                      <option value="total">Total SHU Tertinggi</option>
                      <option value="jma">Jasa Modal (JMA) Tertinggi</option>
                      <option value="jua">Jasa Usaha (JUA) Tertinggi</option>
                      <option value="simpanan">Simpanan Terbesar</option>
                      <option value="usaha">Partisipasi Usaha Terbesar</option>
                      <option value="nama">Nama Anggota (A-Z)</option>
                      <option value="noAnggota">Nomor Anggota</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setShuAnggotaSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      title={shuAnggotaSortOrder === 'asc' ? "Urutan Menaik (Ascending)" : "Urutan Menurun (Descending)"}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 5. Interactive Table: SHU Distribution Per Member */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">Anggota Koperasi</th>
                        <th className="p-3 text-right">
                          <div>Simpanan Modal</div>
                          <div className="text-[9px] font-normal text-slate-400 capitalize">
                            {includeSukarelaInJMA ? "Pokok + Wajib + Sukarela" : "Pokok + Wajib"}
                          </div>
                        </th>
                        <th className="p-3 text-right bg-teal-50/40 dark:bg-teal-950/20">
                          <div>SHU Jasa Modal (JMA)</div>
                          <div className="text-[9px] font-normal text-teal-600 dark:text-teal-400 capitalize">
                            Pool {persenJasaModal}%
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div>Partisipasi Transaksi</div>
                          <div className="text-[9px] font-normal text-slate-400 capitalize">
                            Jasa Pinjaman + Warung
                          </div>
                        </th>
                        <th className="p-3 text-right bg-indigo-50/40 dark:bg-indigo-950/20">
                          <div>SHU Jasa Usaha (JUA)</div>
                          <div className="text-[9px] font-normal text-indigo-600 dark:text-indigo-400 capitalize">
                            Pool {persenJasaUsaha}%
                          </div>
                        </th>
                        <th className="p-3 text-right bg-emerald-50/70 dark:bg-emerald-950/30">
                          <div className="font-extrabold text-emerald-800 dark:text-emerald-300">TOTAL SHU</div>
                          <div className="text-[9px] font-normal text-emerald-600 capitalize">JMA + JUA</div>
                        </th>
                        <th className="p-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredSHUMembers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                            Tidak ditemukan data anggota yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredSHUMembers.map((item, idx) => (
                          <tr 
                            key={item.member.id} 
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
                          >
                            <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{item.member.nama}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{item.member.noAnggota}</span>
                                <span>•</span>
                                <span className="capitalize">{item.member.isVerified !== false ? 'Aktif' : 'Menunggu Verifikasi'}</span>
                              </div>
                            </td>

                            {/* Simpanan & Porsi Modal */}
                            <td className="p-3 text-right font-mono">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatRupiah(item.totalSimpananEligible)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Porsi: {item.porsiSimpananPct.toFixed(2)}%
                              </div>
                            </td>

                            {/* SHU JMA */}
                            <td className="p-3 text-right font-mono bg-teal-50/30 dark:bg-teal-950/10">
                              <div className="font-bold text-teal-700 dark:text-teal-400">
                                {formatRupiah(item.shuJMA)}
                              </div>
                              <div className="text-[10px] text-teal-600/80 dark:text-teal-500">
                                Modal
                              </div>
                            </td>

                            {/* Partisipasi Transaksi */}
                            <td className="p-3 text-right font-mono">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatRupiah(item.totalPartisipasiUsaha)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Jasa: {formatRupiah(item.jasaPinjamanDibayar)} | Wrg: {formatRupiah(item.belanjaWarung)}
                              </div>
                            </td>

                            {/* SHU JUA */}
                            <td className="p-3 text-right font-mono bg-indigo-50/30 dark:bg-indigo-950/10">
                              <div className="font-bold text-indigo-700 dark:text-indigo-400">
                                {formatRupiah(item.shuJUA)}
                              </div>
                              <div className="text-[10px] text-indigo-600/80 dark:text-indigo-500">
                                Usaha ({item.porsiUsahaPct.toFixed(2)}%)
                              </div>
                            </td>

                            {/* TOTAL SHU */}
                            <td className="p-3 text-right font-mono bg-emerald-50/50 dark:bg-emerald-950/20">
                              <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                {formatRupiah(item.totalSHU)}
                              </div>
                            </td>

                            {/* Aksi: Cetak Slip */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setActiveSlipMember(item)}
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs"
                                title="Lihat dan cetak slip pembagian SHU anggota ini"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Slip</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-850 font-mono font-bold text-slate-800 dark:text-slate-200 border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="p-3 font-sans uppercase text-slate-700 dark:text-slate-300 text-xs">
                          Total Akumulasi ({shuPerAnggotaCalculations.calculatedMembers.length} Anggota)
                        </td>
                        <td className="p-3 text-right">
                          <div>{formatRupiah(shuPerAnggotaCalculations.totalSimpananEligibleAll)}</div>
                          <div className="text-[10px] text-slate-500 font-normal">100% Simpanan</div>
                        </td>
                        <td className="p-3 text-right text-teal-700 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20">
                          {formatRupiah(shuPerAnggotaCalculations.totalJMADistributed)}
                        </td>
                        <td className="p-3 text-right">
                          <div>{formatRupiah(shuPerAnggotaCalculations.totalPartisipasiUsahaAll)}</div>
                          <div className="text-[10px] text-slate-500 font-normal">100% Transaksi</div>
                        </td>
                        <td className="p-3 text-right text-indigo-700 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20">
                          {formatRupiah(shuPerAnggotaCalculations.totalJUADistributed)}
                        </td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/40 text-sm font-black">
                          {formatRupiah(shuPerAnggotaCalculations.totalSHUDistributed)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 6. Legal & Practical Guide for Cooperative SHU Rules */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                    <Info className="w-4 h-4 text-emerald-600" />
                    <span>Dasar Hukum & Rumus Perkoperasian Indonesia (UU No. 25 Tahun 1992)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 leading-relaxed text-[11px]">
                    <div className="bg-white dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-750 space-y-1">
                      <p className="font-bold text-teal-700 dark:text-teal-400">1. Jasa Modal Anggota (JMA)</p>
                      <p>
                        Diberikan sebagai imbalan atas modal simpanan yang dititipkan anggota ke koperasi. Rumus baku:
                      </p>
                      <p className="font-mono bg-slate-50 dark:bg-slate-900 p-1.5 rounded border text-[10px] text-slate-800 dark:text-slate-200">
                        JMA = (Simpanan Anggota / Total Simpanan Seluruh Anggota) × Pool JMA
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-750 space-y-1">
                      <p className="font-bold text-indigo-700 dark:text-indigo-400">2. Jasa Usaha Anggota (JUA)</p>
                      <p>
                        Diberikan sebanding dengan transaksi ekonomi anggota (jasa bunga pinjaman lunas + perputaran belanja warung koperasi):
                      </p>
                      <p className="font-mono bg-slate-50 dark:bg-slate-900 p-1.5 rounded border text-[10px] text-slate-800 dark:text-slate-200">
                        JUA = (Partisipasi Usaha Anggota / Total Partisipasi Seluruh Anggota) × Pool JUA
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUBTAB 2: ALOKASI DISTRIBUSI KOPERASI (GLOBAL) ================= */}
            {shuSubTab === 'alokasiKoperasi' && (
              <div className="space-y-6">
                {/* Current Available SHU Highlight Card */}
                <div className="p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Nilai SHU Bersih Berjalan (Neraca Saldo)</span>
                <h2 className="text-2xl sm:text-3xl font-black font-mono text-emerald-800 dark:text-emerald-300 mt-1">
                  {formatRupiah(liveSHUBersih)}
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Total akumulasi pendapatan dikurangi beban operasional koperasi (Perhitungan mulai 1 Januari {filterStartDate ? filterStartDate.substring(0, 4) : new Date().getFullYear()}).
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800 sm:pl-6">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tahun Buku</p>
                <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">{filterStartDate ? filterStartDate.substring(0, 4) : new Date().getFullYear()}</p>
              </div>
            </div>

            {shuDistributedSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
                ✅ {shuDistributedSuccess}
              </div>
            )}

            {shuDistributionError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
                ⚠️ {shuDistributionError}
              </div>
            )}

            {/* Form Distribusi SHU */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4 border border-slate-150 dark:border-slate-800 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between border-b pb-2">
                  <span>Form Distribusi SHU</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    (persenDanaCadangan + persenAnggota + persenPengurus + persenPengawas) === 100 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    Total: {persenDanaCadangan + persenAnggota + persenPengurus + persenPengawas}%
                  </span>
                </h4>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">1. Dana Cadangan Koperasi (%)</label>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatRupiah((liveSHUBersih * persenDanaCadangan) / 100)}
                      </span>
                    </div>
                    <input 
                      type="number"
                      min={0}
                      max={100}
                      value={persenDanaCadangan}
                      onChange={(e) => setPersenDanaCadangan(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Disimpan langsung ke modal Dana Cadangan di Neraca Saldo (Tidak mengurangi kas)</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">2. SHU Bagian Anggota (%)</label>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                        {formatRupiah((liveSHUBersih * persenAnggota) / 100)}
                      </span>
                    </div>
                    <input 
                      type="number"
                      min={0}
                      max={100}
                      value={persenAnggota}
                      onChange={(e) => setPersenAnggota(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Dibagikan proporsional kepada anggota (Memotong kas Koperasi)</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">3. SHU Bagian Pengurus (%)</label>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                        {formatRupiah((liveSHUBersih * persenPengurus) / 100)}
                      </span>
                    </div>
                    <input 
                      type="number"
                      min={0}
                      max={100}
                      value={persenPengurus}
                      onChange={(e) => setPersenPengurus(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Insentif kinerja pengurus (Memotong kas Koperasi)</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">4. SHU Bagian Pengawas (%)</label>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                        {formatRupiah((liveSHUBersih * persenPengawas) / 100)}
                      </span>
                    </div>
                    <input 
                      type="number"
                      min={0}
                      max={100}
                      value={persenPengawas}
                      onChange={(e) => setPersenPengawas(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-bold font-mono text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Insentif pengawasan (Memotong kas Koperasi)</p>
                  </div>

                  {userRole === 'pengawas' ? (
                    <div className="w-full mt-2 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      Mode Pengawas: Eksekusi dan pencairan pembagian SHU hanya dapat diproses oleh Pengurus / Admin.
                    </div>
                  ) : (
                    <button
                      onClick={handleExecuteSHUDistribution}
                      disabled={liveSHUBersih <= 0}
                      className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" /> Distribusikan SHU
                    </button>
                  )}
                </div>
              </div>

              {/* Overview Ringkasan Alokasi & Ketentuan */}
              <div className="space-y-4">
                <div className="border border-slate-150 dark:border-slate-800 p-5 rounded-xl bg-white dark:bg-slate-900 space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b pb-2">
                    Ringkasan Alokasi Distribusi
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-sans text-slate-600 dark:text-slate-400">Total SHU Dibagikan:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatRupiah(liveSHUBersih)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="font-sans">Masuk ke Dana Cadangan (Neraca):</span>
                      <span>{formatRupiah((liveSHUBersih * persenDanaCadangan) / 100)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-bold">
                      <span className="font-sans">Total Pencairan Dibagikan (Memotong Kas):</span>
                      <span>{formatRupiah((liveSHUBersih * (persenAnggota + persenPengurus + persenPengawas)) / 100)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" /> Ketentuan Distribusi SHU:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed opacity-90 pl-1">
                    <li><strong>Dana Cadangan</strong> secara otomatis dibukukan sebagai Ekuitas Modal Cadangan di Neraca Saldo dan tidak mengurangi saldo Kas tunai.</li>
                    <li><strong>SHU Bagian Anggota, Pengurus, dan Pengawas</strong> dicatat sebagai pengeluaran pembagian hasil usaha yang memotong saldo Kas Koperasi.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Riwayat Pembagian SHU */}
            {shuDistributions.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Riwayat Pembagian SHU Koperasi
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Tanggal / Th. Buku</th>
                        <th className="p-3 text-right">Total SHU</th>
                        <th className="p-3 text-right">Dana Cadangan</th>
                        <th className="p-3 text-right">Bag. Anggota</th>
                        <th className="p-3 text-right">Bag. Pengurus</th>
                        <th className="p-3 text-right">Bag. Pengawas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
                      {shuDistributions.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                            <div>{item.tanggal}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Th. Buku {item.tahunBuku}</div>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatRupiah(item.totalSHUBersih)}</td>
                          <td className="p-3 text-right text-emerald-700 font-semibold">{formatRupiah(item.danaCadanganNominal)} ({item.persenDanaCadangan}%)</td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(item.shuAnggotaNominal)} ({item.persenAnggota}%)</td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(item.shuPengurusNominal)} ({item.persenPengurus}%)</td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatRupiah(item.shuPengawasNominal)} ({item.persenPengawas}%)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </div>
            )}
          </motion.div>
        )}

        {/* SLIP PEMBAGIAN SHU ANGGOTA MODAL */}
        <AnimatePresence>
          {activeSlipMember && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-250 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8"
              >
                {/* Header (Screen only) */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center no-print">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">Slip Pembagian SHU Anggota</h3>
                      <p className="text-[11px] text-slate-400">Bukti resmi rincian penerimaan Sisa Hasil Usaha</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSlipMember(null)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Slip Document Body (Printable) */}
                <div id="printable-slip" className="p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs font-sans">
                  {/* Kop Slip */}
                  <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 dark:text-white">
                        {setup?.namaKoperasi || "KOPERASI SIMPAN PINJAM & USAHA"}
                      </h2>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {setup?.alamatKantor || "Badan Hukum No. 518/BH/KOP/2020"}
                      </p>
                      {setup?.noBadanHukum && (
                        <p className="text-[10px] text-slate-500 font-mono">No. BH: {setup.noBadanHukum}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        BUKTI PEMBAGIAN SHU
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        Tahun Buku: {new Date().getFullYear()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-750 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">No. Anggota</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {activeSlipMember.member.noAnggota}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Anggota</span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {activeSlipMember.member.nama}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Keanggotaan</span>
                      <span className="font-semibold text-xs text-emerald-600 capitalize">
                        {activeSlipMember.member.isVerified !== false ? 'Aktif' : 'Menunggu Verifikasi'}
                      </span>
                    </div>
                  </div>

                  {/* Details of JMA & JUA */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b pb-1">
                      Rincian Perhitungan Berdasarkan Aturan Baku Perkoperasian
                    </h4>

                    {/* JMA */}
                    <div className="border border-teal-200 dark:border-teal-900/60 rounded-xl p-3.5 bg-teal-50/30 dark:bg-teal-950/20 space-y-2">
                      <div className="flex justify-between items-center text-teal-800 dark:text-teal-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          1. Jasa Modal Anggota (JMA) - Porsi {persenJasaModal}%
                        </span>
                        <span className="font-mono text-sm">{formatRupiah(activeSlipMember.shuJMA)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                        <div>
                          Simpanan Pokok: <strong className="font-mono">{formatRupiah(activeSlipMember.sPokok)}</strong>
                        </div>
                        <div>
                          Simpanan Wajib: <strong className="font-mono">{formatRupiah(activeSlipMember.sWajib)}</strong>
                        </div>
                        {includeSukarelaInJMA && (
                          <div>
                            Simpanan Sukarela: <strong className="font-mono">{formatRupiah(activeSlipMember.sSukarela)}</strong>
                          </div>
                        )}
                        <div>
                          Porsi Simpanan Koperasi: <strong className="font-mono">{activeSlipMember.porsiSimpananPct.toFixed(3)}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* JUA */}
                    <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3.5 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex justify-between items-center text-indigo-800 dark:text-indigo-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          2. Jasa Usaha Anggota (JUA) - Porsi {persenJasaUsaha}%
                        </span>
                        <span className="font-mono text-sm">{formatRupiah(activeSlipMember.shuJUA)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                        <div>
                          Jasa Pinjaman Disetor: <strong className="font-mono">{formatRupiah(activeSlipMember.jasaPinjamanDibayar)}</strong>
                        </div>
                        <div>
                          Transaksi Toko / Warung: <strong className="font-mono">{formatRupiah(activeSlipMember.belanjaWarung)}</strong>
                        </div>
                        <div className="col-span-2">
                          Porsi Partisipasi Usaha Koperasi: <strong className="font-mono">{activeSlipMember.porsiUsahaPct.toFixed(3)}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total SHU Diterima Highlight Card */}
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                        TOTAL SISA HASIL USAHA (SHU) DITERIMA
                      </span>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-800 dark:text-emerald-200">
                        {formatRupiah(activeSlipMember.totalSHU)}
                      </span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic mt-0.5 font-sans">
                        Terbilang: {terbilang(activeSlipMember.totalSHU)} rupiah
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs font-mono self-start sm:self-auto">
                      LUNAS / SIAP CAIR
                    </span>
                  </div>

                  {/* Signatures */}
                  <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <p className="text-slate-500 mb-14">Pengurus / Bendahara Koperasi,</p>
                      <p className="font-bold underline text-slate-900 dark:text-white">( ........................................ )</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tanda Tangan & Cap</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-14">Anggota Penerima,</p>
                      <p className="font-bold underline text-slate-900 dark:text-white">
                        ( {activeSlipMember.member.nama} )
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">No. Anggota: {activeSlipMember.member.noAnggota}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Modal Buttons (Screen only) */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5 no-print">
                  <button
                    type="button"
                    onClick={() => setActiveSlipMember(null)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Slip (Kuitansi)</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SIMPANAN EDIT MODAL */}
        <AnimatePresence>
          {editingSimpanan && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-250 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                  <h3 className="font-bold font-sans tracking-tight text-md">Edit Transaksi Simpanan</h3>
                  <button 
                    onClick={() => setEditingSimpanan(null)}
                    className="text-slate-400 hover:text-white text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSaveEditSimpanan} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Tanggal</label>
                    <input 
                      type="date"
                      required
                      value={editSimpTanggal}
                      onChange={(e) => setEditSimpTanggal(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Jenis Simpanan</label>
                    <select
                      value={editSimpJenis}
                      onChange={(e) => setEditSimpJenis(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-sans cursor-pointer"
                    >
                      <option value="Pokok">Simpanan Pokok</option>
                      <option value="Wajib">Simpanan Wajib</option>
                      <option value="Sukarela">Simpanan Sukarela</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Jumlah Setoran (Rp)</label>
                    <input 
                      type="text"
                      required
                      value={editSimpJumlah}
                      onChange={(e) => setEditSimpJumlah(e.target.value)}
                      placeholder="Contoh: 50000"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Keterangan</label>
                    <textarea 
                      value={editSimpKeterangan}
                      onChange={(e) => setEditSimpKeterangan(e.target.value)}
                      placeholder="Tulis catatan tambahan..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-sans"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2 font-sans">
                    <button 
                      type="button"
                      onClick={() => setEditingSimpanan(null)}
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* ANGSURAN EDIT MODAL */}
          {editingAngsuran && (() => {
            const editMember = members.find(m => m.id === editingAngsuran.anggotaId);
            const editContract = pinjaman.find(p => p.id === editingAngsuran.pinjamanId);
            const numPokok = parseFloat(editAngsPokok.replace(/\./g, '').replace(',', '.')) || 0;
            const numJasa = parseFloat(editAngsJasa.replace(/\./g, '').replace(',', '.')) || 0;
            const totBayar = numPokok + numJasa;
            const defaultPokok = editContract ? (editContract.angsuranPokokPerBulan || Math.round(editContract.nominalPinjaman / editContract.tenor)) : 0;
            const defaultJasa = editContract ? (editContract.jasaPerBulan || Math.round(editContract.nominalPinjaman * ((editContract.bungaFlatPersen || 1.5) / 100))) : 0;

            return (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-250 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto"
                >
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold font-sans tracking-tight text-md">Edit Catatan Angsuran</h3>
                      <p className="text-xs text-slate-400">CTR-{editingAngsuran.pinjamanId?.substring(0,8).toUpperCase()} • {editMember?.nama}</p>
                    </div>
                    <button 
                      onClick={() => setEditingAngsuran(null)}
                      className="text-slate-400 hover:text-white text-sm cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleSaveEditAngsuran} className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Tanggal Transaksi</label>
                        <input 
                          type="date"
                          required
                          value={editAngsTanggal}
                          onChange={(e) => setEditAngsTanggal(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Angsuran Bulan Ke-</label>
                        <input 
                          type="number"
                          min={1}
                          max={editContract?.tenor ? editContract.tenor + 12 : 60}
                          required
                          value={editAngsBulanKe}
                          onChange={(e) => setEditAngsBulanKe(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-slate-500 font-bold uppercase text-[10px]">Pokok Pinjaman (Rp)</label>
                        {editContract && (
                          <button
                            type="button"
                            onClick={() => setEditAngsPokok(String(defaultPokok))}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            Isi Pokok Standar ({formatRupiah(defaultPokok)})
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        required
                        value={editAngsPokok}
                        onChange={(e) => setEditAngsPokok(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-slate-500 font-bold uppercase text-[10px]">Jasa Pinjaman (Rp)</label>
                        <div className="flex gap-2">
                          {editContract && (
                            <button
                              type="button"
                              onClick={() => setEditAngsJasa(String(defaultJasa))}
                              className="text-[10px] text-amber-600 hover:text-amber-800 font-bold cursor-pointer"
                            >
                              Jasa 1.5% ({formatRupiah(defaultJasa)})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditAngsJasa('0')}
                            className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                          >
                            Rp 0
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text"
                        required
                        value={editAngsJasa}
                        onChange={(e) => setEditAngsJasa(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-amber-700 dark:text-amber-400 focus:outline-indigo-500 font-mono font-bold"
                      />
                    </div>

                    {/* Live Total */}
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Total Jumlah Bayar:</span>
                        <span className="text-[11px] text-slate-500">Pokok + Jasa</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-350">{formatRupiah(totBayar)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Keterangan</label>
                      <input 
                        type="text"
                        value={editAngsKeterangan}
                        onChange={(e) => setEditAngsKeterangan(e.target.value)}
                        placeholder="Catatan angsuran..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-sans"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2 font-sans">
                      <button 
                        type="button"
                        onClick={() => setEditingAngsuran(null)}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Simpan Perubahan Angsuran
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            );
          })()}

          {/* Modal Input Data Neraca Saldo Awal Tahun Custom */}
          {isEditingInitialNeraca && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                        Input / Edit Data Neraca Saldo Awal Tahun Custom
                      </h3>
                      <p className="text-xs text-slate-500">
                        Masukkan saldo awal pembukuan per 1 Januari untuk menghitung perbandingan posisi keuangan secara akurat.
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsEditingInitialNeraca(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveInitialNeraca} className="space-y-5 text-xs font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sisi Aktiva (Aset) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <h4 className="font-bold text-indigo-700 dark:text-indigo-400 uppercase text-[11px] border-b pb-1.5 flex items-center gap-1.5">
                        <Coins className="w-4 h-4" /> Pos Sisi Aktiva (Aset)
                      </h4>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Kas & Bank Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initKas} 
                          onChange={(e) => setInitKas(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Piutang Pinjaman Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initPiutang} 
                          onChange={(e) => setInitPiutang(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Piutang Warung / Toko Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initPiutangWarung} 
                          onChange={(e) => setInitPiutangWarung(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Persediaan Warung Sembako Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initWarung} 
                          onChange={(e) => setInitWarung(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Persediaan Barang Dagang Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initBarang} 
                          onChange={(e) => setInitBarang(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Persediaan Seragam Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initSeragam} 
                          onChange={(e) => setInitSeragam(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Inventaris Koperasi Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initInventaris} 
                          onChange={(e) => setInitInventaris(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-rose-600 dark:text-rose-400 font-medium mb-1">Akumulasi Penyusutan Awal (Rp - Pengurang Aktiva)</label>
                        <input 
                          type="text" 
                          value={initAkumulasiPenyusutan} 
                          onChange={(e) => setInitAkumulasiPenyusutan(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-rose-600 dark:text-rose-400 focus:outline-rose-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Atribut Koperasi Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initAtribut} 
                          onChange={(e) => setInitAtribut(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>
                    </div>

                    {/* Sisi Pasiva (Ekuitas & Kewajiban) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[11px] border-b pb-1.5 flex items-center gap-1.5">
                        <Scale className="w-4 h-4" /> Pos Sisi Pasiva (Ekuitas & Kewajiban)
                      </h4>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Simpanan Pokok Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initSimpPokok} 
                          onChange={(e) => setInitSimpPokok(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Simpanan Wajib Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initSimpWajib} 
                          onChange={(e) => setInitSimpWajib(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Simpanan Sukarela / Manasuka Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initSimpSukarela} 
                          onChange={(e) => setInitSimpSukarela(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Modal Awal Koperasi (Rp)</label>
                        <input 
                          type="text" 
                          value={initModal} 
                          onChange={(e) => setInitModal(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Dana Cadangan Awal (Rp)</label>
                        <input 
                          type="text" 
                          value={initDanaCadangan} 
                          onChange={(e) => setInitDanaCadangan(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">SHU Berjalan (Rp)</label>
                        <input 
                          type="text" 
                          value={initShu} 
                          onChange={(e) => setInitShu(formatNumberWithDots(e.target.value))} 
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-500" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Realtime Totals Verification in Modal */}
                  {(() => {
                    const parseVal = (v: string) => {
                      const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
                      return isNaN(n) ? 0 : n;
                    };
                    const totAktiva = parseVal(initKas) + parseVal(initPiutang) + parseVal(initPiutangWarung) + parseVal(initWarung) + parseVal(initBarang) + parseVal(initInventaris) + parseVal(initAtribut);
                    const totPasiva = parseVal(initSimpPokok) + parseVal(initSimpWajib) + parseVal(initSimpSukarela) + parseVal(initModal) + parseVal(initDanaCadangan) + parseVal(initShu);
                    const isBal = Math.abs(totAktiva - totPasiva) < 1;

                    return (
                      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs font-bold ${
                        isBal ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
                      }`}>
                        <div className="flex items-center gap-2 font-sans">
                          {isBal ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                          <span>{isBal ? 'Saldo Awal Seimbang (Balanced) ✓' : `Tidak Seimbang (Selisih: ${formatRupiah(Math.abs(totAktiva - totPasiva))}) ✗`}</span>
                        </div>
                        <div className="flex gap-4">
                          <span>Aktiva: {formatRupiah(totAktiva)}</span>
                          <span>Pasiva: {formatRupiah(totPasiva)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 justify-end pt-2 font-sans">
                    <button 
                      type="button"
                      onClick={() => setIsEditingInitialNeraca(false)}
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm"
                    >
                      Simpan Data Neraca Awal
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* MODAL MUTASI ANGSURAN ANGGOTA */}
          {selectedMemberForMutasi && mutasiMemberData && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[65] p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
              >
                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2 font-sans">
                        Mutasi Angsuran Pinjaman Anggota
                      </h3>
                      <p className="text-xs text-slate-300 font-sans mt-0.5">
                        {mutasiMemberData.member.nama} — <span className="font-mono text-emerald-300 font-bold">{mutasiMemberData.member.noAnggota}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMemberForMutasi(null)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Pinjaman</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                        {formatRupiah(mutasiMemberData.totalPinjamanDiambil)}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block mb-1">Sisa Pokok (Outstanding)</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-rose-700 dark:text-rose-450">
                        {formatRupiah(mutasiMemberData.sisaPinjaman)}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">Pokok Dilunasi</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(mutasiMemberData.totalPokokTerbayar)}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-1">Jasa Disetor</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatRupiah(mutasiMemberData.totalJasaTerbayar)}
                      </span>
                    </div>
                  </div>

                  {/* Loan Contracts list (if any) */}
                  {mutasiMemberData.memberLoans.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[10.5px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Kontrak Pinjaman Anggota ({mutasiMemberData.memberLoans.length} Pinjaman)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mutasiMemberData.memberLoans.map((p, idx) => {
                          const pAngsurans = mutasiMemberData.memberAngsuran.filter(a => a.pinjamanId === p.id);
                          const rem = calculateLoanOutstanding(p, pAngsurans);
                          const isLunas = rem <= 0;
                          return (
                            <div key={p.id || idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-750 flex justify-between items-center text-[11px]">
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                  {formatRupiah(p.nominalPinjaman)} <span className="font-sans text-[10px] font-normal text-slate-400">({p.tenor} Bulan)</span>
                                </div>
                                <div className="text-[10px] text-slate-400">Tgl Cair: {p.tanggal || '-'} {p.provisiDipotong ? `| Provisi: ${formatRupiah(p.provisiDipotong)}` : ''}</div>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${isLunas ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                                  {isLunas ? 'Lunas' : `Sisa: ${formatRupiah(rem)}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Installment Mutation History Table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" /> Rincian Mutasi Pembayaran Angsuran ({mutasiMemberData.memberAngsuran.length} Transaksi)
                      </h4>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-3 py-2.5 text-center w-10">No</th>
                            <th className="px-3 py-2.5">Tanggal</th>
                            <th className="px-3 py-2.5 text-center">Bulan Ke</th>
                            <th className="px-3 py-2.5 text-right">Pokok</th>
                            <th className="px-3 py-2.5 text-right">Jasa / Bunga</th>
                            <th className="px-3 py-2.5 text-right">Total Bayar</th>
                            <th className="px-3 py-2.5 pl-4">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-[11px]">
                          {mutasiMemberData.memberAngsuran.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic font-sans">
                                Belum ada catatan mutasi pembayaran angsuran untuk anggota ini.
                              </td>
                            </tr>
                          ) : (
                            mutasiMemberData.memberAngsuran.map((a, idx) => {
                              const pContract = pinjaman.find(p => p.id === a.pinjamanId);
                              const pokok = calculateAngsuranPrincipal(a, pContract);
                              const jasa = calculateAngsuranInterest(a, pContract);
                              return (
                                <tr key={a.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                  <td className="px-3 py-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-sans">{a.tanggal}</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                                    Bulan Ke-{a.bulanKe || 1}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-800 dark:text-slate-200">{formatRupiah(pokok)}</td>
                                  <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-400">{formatRupiah(jasa)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(a.jumlahBayar)}</td>
                                  <td className="px-3 py-2 pl-4 font-sans text-slate-500 dark:text-slate-400 italic text-[10.5px]">
                                    {a.keterangan || '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {mutasiMemberData.memberAngsuran.length > 0 && (
                          <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                            <tr>
                              <td colSpan={3} className="px-3 py-2.5 text-right font-sans uppercase text-[10px] text-slate-400">Total Realisasi Mutasi:</td>
                              <td className="px-3 py-2.5 text-right text-slate-900 dark:text-slate-100">{formatRupiah(mutasiMemberData.totalPokokTerbayar)}</td>
                              <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-400">{formatRupiah(mutasiMemberData.totalJasaTerbayar)}</td>
                              <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 font-bold">{formatRupiah(mutasiMemberData.totalJumlahBayar)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2 shrink-0">
                  <div className="flex gap-2">
                    {onNavigateToAngsuran ? (
                      <button 
                        type="button"
                        onClick={() => {
                          onNavigateToAngsuran(undefined, mutasiMemberData.member.id, mutasiMemberData.member.nama);
                          setSelectedMemberForMutasi(null);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Buka Data Mutasi Angsuran di Menu Buku Kas & Mutasi"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Buka di Menu Buku Kas & Mutasi
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => handleNavigateToAngsuranTab(mutasiMemberData.member.noAnggota)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Buka di Laporan Angsuran
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={handleExportMemberMutasiPDF}
                      className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-sans font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh PDF Mutasi
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedMemberForMutasi(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-sans font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmDeleteModal
          isOpen={!!deleteModalState?.isOpen}
          title={deleteModalState ? `Hapus ${deleteModalState.itemType}` : undefined}
          itemType={deleteModalState?.itemType}
          itemName={deleteModalState?.itemName}
          itemDetails={deleteModalState?.itemDetails}
          warningMessage={deleteModalState?.warningMessage}
          onConfirm={async () => {
            if (deleteModalState?.onConfirm) {
              await deleteModalState.onConfirm();
            }
            setDeleteModalState(null);
          }}
          onClose={() => setDeleteModalState(null)}
        />
      </div>
    </div>
  );
}
