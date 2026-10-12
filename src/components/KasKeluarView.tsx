import React, { useState, useMemo, useEffect } from 'react';
import { 
  Member, KoperasiSetup, BebanKoperasi, Pinjaman, Simpanan, Pembelian,
  PengurusPengawas, PengajuanPinjaman, PiutangWarung, Angsuran, SHUDistribution
} from '../types';
import { 
  formatRupiah, formatYearMonthIndo, INDO_MONTH_NAMES, exportToExcel 
} from '../utils/finance';
import { 
  TrendingDown, Plus, Trash2, Search, Filter, Calendar, FileSpreadsheet, 
  Printer, ArrowUpRight, DollarSign, Wallet, ShoppingCart, UserMinus, 
  CreditCard, CheckCircle2, AlertCircle, Info, Sparkles, Receipt, HandCoins, Shield,
  Coins, Award, ArrowRight, Boxes, QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { PinjamanView } from './CoreViews';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { parseMemberScanCode } from '../utils/memberCard';

export interface KasKeluarProps {
  setup: KoperasiSetup;
  pengurusPengawas?: PengurusPengawas[];
  members: Member[];
  expenses: BebanKoperasi[];
  pinjaman: Pinjaman[];
  angsuran?: Angsuran[];
  simpanan: Simpanan[];
  pembelian: Pembelian[];
  piutangWarung?: PiutangWarung[];
  onAddExpense: (item: Omit<BebanKoperasi, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
  onAddPinjaman?: (p: Omit<Pinjaman, 'id'>) => void;
  onEditPinjaman?: (p: Pinjaman) => void;
  onDeletePinjaman?: (id: string) => void;
  pengajuanPinjaman?: PengajuanPinjaman[];
  onApprovePengajuanPinjaman?: (id: string, catatan?: string, customNominal?: number, isPartial?: boolean) => void;
  onRejectPengajuanPinjaman?: (id: string, catatan?: string) => void;
  onAddSimpanan?: (s: Omit<Simpanan, 'id'>) => void;
  onAddPembelian?: (p: Omit<Pembelian, 'id'>) => void;
  onDeletePembelian?: (id: string) => void;
  availableCash?: number;
  initialActiveTab?: 'beban' | 'pinjaman' | 'pencairan_pinjaman' | 'penarikan_simpanan' | 'pembelian' | 'shu' | 'rekap_bulanan';
  initialLoanSearchTerm?: string;
  initialLoanAnggotaId?: string;
  initialLoanId?: string;
  onNavigateToAngsuran?: (angsuranId?: string, memberId?: string, query?: string) => void;
  isDarkMode?: boolean;
  userRole?: 'admin' | 'pengawas' | 'karyawan_warung' | 'member' | null;
  shuDistributions?: SHUDistribution[];
  onAddSHUDistribution?: (dist: SHUDistribution) => Promise<void> | void;
}

export function KasKeluarView({
  setup,
  pengurusPengawas = [],
  members,
  expenses,
  pinjaman,
  angsuran = [],
  simpanan,
  pembelian = [],
  piutangWarung = [],
  onAddExpense,
  onDeleteExpense,
  onAddPinjaman = () => {},
  onEditPinjaman = () => {},
  onDeletePinjaman = () => {},
  pengajuanPinjaman = [],
  onApprovePengajuanPinjaman = () => {},
  onRejectPengajuanPinjaman = () => {},
  onAddSimpanan,
  onAddPembelian,
  onDeletePembelian,
  availableCash = 0,
  initialActiveTab = 'beban',
  initialLoanSearchTerm,
  initialLoanAnggotaId,
  initialLoanId,
  onNavigateToAngsuran,
  isDarkMode = false,
  userRole = 'admin',
  shuDistributions = [],
  onAddSHUDistribution
}: KasKeluarProps) {
  const isKasir = userRole === 'karyawan_warung';

  const [activeTab, setActiveTab] = useState<'beban' | 'pinjaman' | 'penarikan_simpanan' | 'pembelian' | 'shu' | 'rekap_bulanan'>(() => {
    if (isKasir) return 'beban';
    if (initialActiveTab === 'pencairan_pinjaman' || initialActiveTab === 'pinjaman') return 'pinjaman';
    return (initialActiveTab as any) || 'beban';
  });

  // Strict role enforcement: kasir only has access to biaya beban
  useEffect(() => {
    if (isKasir && activeTab !== 'beban') {
      setActiveTab('beban');
    }
  }, [isKasir, activeTab]);

  useEffect(() => {
    if (isKasir) {
      setActiveTab('beban');
    } else if (initialActiveTab) {
      if (initialActiveTab === 'pencairan_pinjaman' || initialActiveTab === 'pinjaman') {
        setActiveTab('pinjaman');
      } else {
        setActiveTab(initialActiveTab as any);
      }
    }
  }, [initialActiveTab, isKasir]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('semua');

  // Input State: Beban Operasional
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));
  const [expCategory, setExpCategory] = useState<string>('listrik_air');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Input State: Penarikan Simpanan Sukarela
  const [tarikAnggotaId, setTarikAnggotaId] = useState('');
  const [tarikDate, setTarikDate] = useState(new Date().toISOString().substring(0, 10));
  const [tarikAmount, setTarikAmount] = useState('');
  const [tarikNotes, setTarikNotes] = useState('');
  const [showMemberScannerModal, setShowMemberScannerModal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Input State: Pembelian Barang / Inventaris
  const [pemDate, setPemDate] = useState(new Date().toISOString().substring(0, 10));
  const [pemNama, setPemNama] = useState('');
  const [pemKategori, setPemKategori] = useState('Inventaris Kantor');
  const [pemQty, setPemQty] = useState('1');
  const [pemHarga, setPemHarga] = useState('');
  const [pemNotes, setPemNotes] = useState('');

  // Input State: Kas Keluar SHU (Pencairan / Distribusi SHU)
  const [shuDate, setShuDate] = useState(new Date().toISOString().substring(0, 10));
  const [shuRecipientType, setShuRecipientType] = useState<'anggota' | 'pengurus' | 'umum'>('anggota');
  const [shuAnggotaId, setShuAnggotaId] = useState<string>('');
  const [shuPengurusNama, setShuPengurusNama] = useState<string>('');
  const [shuCategory, setShuCategory] = useState<'pencairan_anggota' | 'pencairan_pengurus' | 'pencairan_umum'>('pencairan_anggota');
  const [shuAmount, setShuAmount] = useState<string>('');
  const [shuNotes, setShuNotes] = useState<string>('');
  const [shuSuccessMsg, setShuSuccessMsg] = useState<string>('');
  const [shuErrorMsg, setShuErrorMsg] = useState<string>('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'expense' | 'pembelian'; id: string; title: string }>({
    isOpen: false,
    type: 'expense',
    id: '',
    title: ''
  });

  // Calculate voluntary savings per member for withdrawal validation
  const memberSukarelaMap = useMemo(() => {
    const map = new Map<string, number>();
    simpanan.forEach(s => {
      const prev = map.get(s.anggotaId) || 0;
      if (s.jenis === 'Sukarela') {
        map.set(s.anggotaId, prev + s.jumlah);
      }
    });
    return map;
  }, [simpanan]);

  // Outflow transactions collection for Rekap Bulanan
  const allOutflows = useMemo(() => {
    const list: Array<{
      id: string;
      sourceId: string;
      tanggal: string;
      kategori: 'Beban Operasional' | 'Pencairan Pinjaman' | 'Penarikan Simpanan' | 'Pembelian Inventaris' | 'Pencairan SHU';
      subKategori: string;
      penerima: string;
      nominal: number;
      keterangan: string;
      refType: 'expense' | 'pinjaman' | 'simpanan_tarik' | 'pembelian' | 'shu';
    }> = [];

    const isSHUExpense = (e: BebanKoperasi) => {
      const cat = (e.kategori || '').toLowerCase();
      const ket = (e.keterangan || '').toLowerCase();
      return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
    };

    // 1. Beban Operasional Reguler
    expenses.filter(e => !isSHUExpense(e)).forEach(e => {
      list.push({
        id: `out-exp-${e.id}`,
        sourceId: e.id,
        tanggal: e.tanggal,
        kategori: 'Beban Operasional',
        subKategori: e.kategori.replace(/_/g, ' ').toUpperCase(),
        penerima: 'Operasional Koperasi',
        nominal: e.nominal,
        keterangan: e.keterangan,
        refType: 'expense'
      });
    });

    // 2. Pencairan Pinjaman (Uang kas diserahkan ke anggota)
    pinjaman.forEach(p => {
      const m = members.find(mem => mem.id === p.anggotaId);
      list.push({
        id: `out-pinj-${p.id}`,
        sourceId: p.id,
        tanggal: p.tanggal,
        kategori: 'Pencairan Pinjaman',
        subKategori: `Tenor ${p.tenor} Bulan (${p.bungaFlatPersen}% Bunga)`,
        penerima: m ? `${m.nama} (${m.noAnggota})` : 'Anggota',
        nominal: p.jumlahDiterima || p.nominalPinjaman,
        keterangan: p.keterangan ? `Pencairan Kredit: ${p.keterangan}` : `Pencairan pinjaman pokok ${formatRupiah(p.nominalPinjaman)}`,
        refType: 'pinjaman'
      });
    });

    // 3. Penarikan Simpanan Sukarela (nominal negatif dalam data simpanan)
    simpanan.filter(s => s.jumlah < 0).forEach(s => {
      const m = members.find(mem => mem.id === s.anggotaId);
      list.push({
        id: `out-simp-${s.id}`,
        sourceId: s.id,
        tanggal: s.tanggal,
        kategori: 'Penarikan Simpanan',
        subKategori: `Simpanan ${s.jenis}`,
        penerima: m ? `${m.nama} (${m.noAnggota})` : 'Anggota',
        nominal: Math.abs(s.jumlah),
        keterangan: s.keterangan || 'Penarikan saldo simpanan sukarela',
        refType: 'simpanan_tarik'
      });
    });

    // 4. Pembelian Inventaris & Barang Dagang
    pembelian.forEach(pem => {
      list.push({
        id: `out-pem-${pem.id}`,
        sourceId: pem.id,
        tanggal: pem.tanggal,
        kategori: 'Pembelian Inventaris',
        subKategori: pem.kategori || 'Inventaris',
        penerima: pem.namaBarang,
        nominal: pem.totalHarga,
        keterangan: `${pem.kuantitas} unit @ ${formatRupiah(pem.hargaSatuan)} - ${pem.keterangan || ''}`,
        refType: 'pembelian'
      });
    });

    // 5. Kas Keluar SHU (Pencairan / Distribusi Hak SHU)
    expenses.filter(e => isSHUExpense(e)).forEach(e => {
      list.push({
        id: `out-shu-${e.id}`,
        sourceId: e.id,
        tanggal: e.tanggal,
        kategori: 'Pencairan SHU',
        subKategori: 'Pencairan Hak SHU',
        penerima: e.keterangan.includes('Anggota') ? 'Hak SHU Anggota' : e.keterangan.includes('Pengurus') ? 'Hak SHU Pengurus' : e.keterangan.includes('Pengawas') ? 'Hak SHU Pengawas' : 'Penerima SHU',
        nominal: e.nominal,
        keterangan: e.keterangan,
        refType: 'shu'
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [expenses, pinjaman, simpanan, pembelian, members]);

  // Unique months available for filtering
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allOutflows.forEach(item => {
      if (item.tanggal && item.tanggal.length >= 7) {
        set.add(item.tanggal.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [allOutflows]);

  // Filtered outflows by month and search
  const filteredOutflows = useMemo(() => {
    return allOutflows.filter(item => {
      const matchesMonth = selectedMonthFilter === 'semua' || item.tanggal.startsWith(selectedMonthFilter);
      const matchesSearch = !searchQuery || 
        item.penerima.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subKategori.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMonth && matchesSearch;
    });
  }, [allOutflows, selectedMonthFilter, searchQuery]);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    let totalKasKeluar = 0;
    let totalBeban = 0;
    let totalPinjaman = 0;
    let totalTarik = 0;
    let totalPembelian = 0;
    let totalSHU = 0;

    filteredOutflows.forEach(item => {
      totalKasKeluar += item.nominal;
      if (item.kategori === 'Beban Operasional') totalBeban += item.nominal;
      else if (item.kategori === 'Pencairan Pinjaman') totalPinjaman += item.nominal;
      else if (item.kategori === 'Penarikan Simpanan') totalTarik += item.nominal;
      else if (item.kategori === 'Pembelian Inventaris') totalPembelian += item.nominal;
      else if (item.kategori === 'Pencairan SHU') totalSHU += item.nominal;
    });

    return { totalKasKeluar, totalBeban, totalPinjaman, totalTarik, totalPembelian, totalSHU };
  }, [filteredOutflows]);

  // Form Handlers
  const handleAddBebanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nominalNum = parseFloat(expAmount.replace(/\D/g, ''));
    if (!nominalNum || nominalNum <= 0) {
      alert('Harap masukkan nominal beban kas keluar yang valid.');
      return;
    }
    onAddExpense({
      tanggal: expDate,
      kategori: expCategory,
      nominal: nominalNum,
      keterangan: expNotes || `Beban ${expCategory.replace(/_/g, ' ')}`
    });
    setExpAmount('');
    setExpNotes('');
  };

  const handleAddSHUKasKeluar = (e: React.FormEvent) => {
    e.preventDefault();
    setShuErrorMsg('');
    const nominalNum = parseFloat(shuAmount.replace(/\D/g, ''));
    if (!nominalNum || nominalNum <= 0) {
      setShuErrorMsg('Harap masukkan nominal pencairan SHU yang valid.');
      return;
    }

    let penerimaLabel = 'Umum (Kolektif Anggota)';
    if (shuRecipientType === 'anggota') {
      const m = members.find(mem => mem.id === shuAnggotaId);
      if (!m) {
        setShuErrorMsg('Silakan pilih anggota penerima pencairan SHU.');
        return;
      }
      penerimaLabel = `${m.nama} (${m.noAnggota})`;
    } else if (shuRecipientType === 'pengurus') {
      if (!shuPengurusNama.trim()) {
        setShuErrorMsg('Silakan pilih atau masukkan nama pengurus/pengawas penerima SHU.');
        return;
      }
      penerimaLabel = `${shuPengurusNama} (Pengurus/Pengawas)`;
    }

    const catatan = shuNotes.trim() ? ` - ${shuNotes.trim()}` : '';
    const finalKeterangan = `Pencairan Kas SHU: ${penerimaLabel}${catatan}`;

    onAddExpense({
      tanggal: shuDate,
      kategori: 'pencairan_shu',
      nominal: nominalNum,
      keterangan: finalKeterangan
    });

    setShuAmount('');
    setShuNotes('');
    setShuSuccessMsg(`Pencairan Kas SHU sebesar ${formatRupiah(nominalNum)} untuk ${penerimaLabel} berhasil dicatat! Transaksi ini secara otomatis memotong Kas Koperasi dan mengurangi akun SHU pada Neraca Saldo.`);
    setTimeout(() => setShuSuccessMsg(''), 6000);
  };

  const handleTarikSimpananSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarikAnggotaId) {
      alert('Silakan pilih anggota yang ingin melakukan penarikan simpanan.');
      return;
    }
    const nominalNum = parseFloat(tarikAmount.replace(/\D/g, ''));
    if (!nominalNum || nominalNum <= 0) {
      alert('Masukkan jumlah penarikan yang valid.');
      return;
    }
    const saldoSukarela = memberSukarelaMap.get(tarikAnggotaId) || 0;
    if (nominalNum > saldoSukarela) {
      alert(`Saldo Simpanan Sukarela anggota ini hanya ${formatRupiah(saldoSukarela)}. Penarikan tidak boleh melebihi saldo sukarela.`);
      return;
    }
    if (onAddSimpanan) {
      onAddSimpanan({
        anggotaId: tarikAnggotaId,
        tanggal: tarikDate,
        jenis: 'Sukarela',
        jumlah: -nominalNum, // negative value represents withdrawal
        keterangan: tarikNotes || 'Penarikan tunai Simpanan Sukarela'
      });
      setTarikAmount('');
      setTarikNotes('');
      setTarikAnggotaId('');
    }
  };

  const handlePembelianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pemNama.trim()) {
      alert('Masukkan nama barang / inventaris.');
      return;
    }
    const qty = parseInt(pemQty, 10) || 1;
    const harga = parseFloat(pemHarga.replace(/\D/g, '')) || 0;
    if (harga <= 0) {
      alert('Masukkan harga satuan yang valid.');
      return;
    }
    if (onAddPembelian) {
      onAddPembelian({
        tanggal: pemDate,
        namaBarang: pemNama.trim(),
        kategori: pemKategori,
        kuantitas: qty,
        hargaSatuan: harga,
        totalHarga: qty * harga,
        keterangan: pemNotes.trim() || 'Pengadaan barang/inventaris kantor'
      });
      setPemNama('');
      setPemHarga('');
      setPemQty('1');
      setPemNotes('');
    }
  };

  const handleExportExcel = () => {
    const exportRows = filteredOutflows.map((item, idx) => ({
      No: idx + 1,
      Tanggal: item.tanggal,
      Klasifikasi: item.kategori,
      SubKategori: item.subKategori,
      Penerima: item.penerima,
      Nominal: item.nominal,
      Keterangan: item.keterangan
    }));
    exportToExcel(exportRows, 'Rekap_Kas_Keluar', `Rekap_Kas_Keluar_${selectedMonthFilter}`, setup);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Kas Keluar
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                  {isKasir ? 'Biaya & Beban Operasional' : 'Semua Pengeluaran Kas'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKasir
                  ? 'Otorisasi kasir: pencatatan dan pengelolaan biaya beban operasional kas koperasi.'
                  : 'Pusat pencatatan seluruh pengeluaran kas: beban operasional, pencairan pinjaman, penarikan simpanan, dan pengadaan inventaris.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Saldo Kas Tersedia</span>
            <span className={`text-base font-extrabold ${availableCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatRupiah(availableCash)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('beban')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'beban'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Biaya & Beban Operasional</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
            {expenses.length}
          </span>
        </button>

        {!isKasir && (
          <>
            <button
              onClick={() => setActiveTab('pinjaman')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'pinjaman'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <HandCoins className="w-4 h-4" />
              <span>Akad Kredit & Pinjaman</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
                {pinjaman.length}
              </span>
              {pengajuanPinjaman.filter(p => p.status === 'Pending').length > 0 && (
                <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse">
                  {pengajuanPinjaman.filter(p => p.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('penarikan_simpanan')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'penarikan_simpanan'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <UserMinus className="w-4 h-4" />
              <span>Penarikan Simpanan</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
                {simpanan.filter(s => s.jumlah < 0).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pembelian')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'pembelian'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Pembelian Inventaris</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
                {pembelian.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shu')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'shu'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Kas Keluar SHU</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
                {expenses.filter(e => {
                  const cat = (e.kategori || '').toLowerCase();
                  const ket = (e.keterangan || '').toLowerCase();
                  return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                }).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rekap_bulanan')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'rekap_bulanan'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rekap Bulanan Kas Keluar</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-700/20 text-current">
                {allOutflows.length}
              </span>
            </button>
          </>
        )}

        {isKasir && (
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 sm:ml-auto">
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>Otorisasi Kasir: Khusus Biaya Beban Operasional</span>
          </span>
        )}
      </div>

      {/* TAB CONTENT: BIAYA & BEBAN OPERASIONAL */}
      {(isKasir || activeTab === 'beban') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Beban */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Catat Pengeluaran / Beban Kas</h2>
            </div>

            <form onSubmit={handleAddBebanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Kategori Beban</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="listrik_air">Listrik, Air & Internet</option>
                  <option value="atk">ATK, Kertas & Perlengkapan Kantor</option>
                  <option value="gaji_karyawan">Honorarium / Gaji Pengelola</option>
                  <option value="rapat">Konsumsi Rapat Pengurus & Anggota</option>
                  <option value="pemeliharaan">Pemeliharaan Gedung & Perangkat</option>
                  <option value="transportasi">Transportasi & Perjalanan Dinas</option>
                  <option value="pajak_retribusi">Pajak, Iuran & Retribusi</option>
                  <option value="beban_lain">Beban Operasional Lain-lain</option>
                  {!isKasir && (
                    <option value="pencairan_shu">Pencairan / Kas Keluar SHU (Mengurangi SHU & Kas)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={expAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setExpAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                    }}
                    placeholder="0"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Keterangan / Keperluan</label>
                <textarea
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Contoh: Pembayaran tagihan listrik PLN bulan Maret 2025"
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan Beban Kas Keluar
              </button>
            </form>
          </div>

          {/* List Beban Terkini */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Biaya & Beban Operasional</h2>
                <p className="text-xs text-slate-400">Total {expenses.length} transaksi beban terdaftar</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Beban</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {formatRupiah(expenses.reduce((acc, c) => acc + (c.nominal || 0), 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    {onDeleteExpense && <th className="py-2.5 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        Belum ada catatan biaya operasional. Masukkan melalui formulir di samping.
                      </td>
                    </tr>
                  ) : (
                    expenses.slice().reverse().map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">{e.tanggal}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {e.kategori.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200 max-w-xs truncate" title={e.keterangan}>
                          {e.keterangan || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatRupiah(e.nominal)}
                        </td>
                        {onDeleteExpense && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, type: 'expense', id: e.id, title: `Beban ${e.kategori} senilai ${formatRupiah(e.nominal)}` })}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Hapus beban"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AKAD KREDIT & PINJAMAN */}
      {!isKasir && activeTab === 'pinjaman' && (
        <div className="space-y-4">
          <PinjamanView
            setup={setup}
            pengurusPengawas={pengurusPengawas}
            members={members}
            pinjaman={pinjaman}
            angsuran={angsuran}
            simpanan={simpanan}
            piutangWarung={piutangWarung}
            onAddPinjaman={onAddPinjaman}
            onEditPinjaman={onEditPinjaman}
            onDeletePinjaman={onDeletePinjaman}
            pengajuanPinjaman={pengajuanPinjaman}
            onApprovePengajuanPinjaman={onApprovePengajuanPinjaman}
            onRejectPengajuanPinjaman={onRejectPengajuanPinjaman}
            availableCash={availableCash}
            initialSearchTerm={initialLoanSearchTerm}
            initialAnggotaId={initialLoanAnggotaId}
            initialPinjamanId={initialLoanId}
            onNavigateToAngsuran={onNavigateToAngsuran}
          />
        </div>
      )}

      {/* TAB CONTENT: PENARIKAN SIMPANAN SUKARELA */}
      {!isKasir && activeTab === 'penarikan_simpanan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Tarik Simpanan */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <UserMinus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Input Penarikan Simpanan Sukarela</h2>
            </div>

            <form onSubmit={handleTarikSimpananSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pilih Anggota</label>
                  <button
                    type="button"
                    onClick={() => setShowMemberScannerModal(true)}
                    className="px-2 py-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                    title="Scan QR Code / Barcode Kartu Anggota Digital via Kamera"
                  >
                    <QrCode className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Scan KTA</span>
                  </button>
                </div>

                {scanFeedback && (
                  <div className={`p-2 rounded-xl text-xs flex items-center gap-2 mb-2 ${
                    scanFeedback.startsWith('✓') 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {scanFeedback.startsWith('✓') ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                    <span>{scanFeedback}</span>
                  </div>
                )}

                <select
                  value={tarikAnggotaId}
                  onChange={(e) => setTarikAnggotaId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                >
                  <option value="">-- Pilih Anggota Koperasi --</option>
                  {members.map(m => {
                    const saldo = memberSukarelaMap.get(m.id) || 0;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.noAnggota} - {m.nama} (Saldo Sukarela: {formatRupiah(saldo)})
                      </option>
                    );
                  })}
                </select>
                {tarikAnggotaId && (
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-400">Saldo Sukarela Tersedia: </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatRupiah(memberSukarelaMap.get(tarikAnggotaId) || 0)}
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tanggal Penarikan</label>
                <input
                  type="date"
                  value={tarikDate}
                  onChange={(e) => setTarikDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Jumlah Penarikan (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={tarikAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTarikAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                    }}
                    placeholder="0"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Keterangan / Keperluan</label>
                <input
                  type="text"
                  value={tarikNotes}
                  onChange={(e) => setTarikNotes(e.target.value)}
                  placeholder="Contoh: Keperluan mendesak keluarga"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Proses Penarikan Kas Keluar
              </button>
            </form>
          </div>

          {/* Riwayat Penarikan */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Riwayat Penarikan Simpanan Sukarela</h2>
                <p className="text-xs text-slate-400">Daftar penarikan tunai simpanan sukarela oleh anggota</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Penarikan Kas</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {formatRupiah(Math.abs(simpanan.filter(s => s.jumlah < 0).reduce((acc, c) => acc + c.jumlah, 0)))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Anggota</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Nominal Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {simpanan.filter(s => s.jumlah < 0).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Belum ada transaksi penarikan simpanan sukarela.
                      </td>
                    </tr>
                  ) : (
                    simpanan.filter(s => s.jumlah < 0).slice().reverse().map(s => {
                      const m = members.find(mem => mem.id === s.anggotaId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">{s.tanggal}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                            {m ? `${m.nama} (${m.noAnggota})` : 'Anggota'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {s.keterangan || 'Penarikan simpanan sukarela'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {formatRupiah(Math.abs(s.jumlah))}
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

      {/* TAB CONTENT: PEMBELIAN INVENTARIS */}
      {!isKasir && activeTab === 'pembelian' && (
        <div className="space-y-6">
          {/* Title Header area matching Unit Usaha Warung */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="p-3 bg-white/10 backdrop-blur-md rounded-2xl"><Boxes className="w-6 h-6 text-white"/></span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Inventaris & Pengadaan Barang Koperasi</h2>
                  <p className="text-xs text-emerald-100 mt-1">
                    Kelola pengeluaran kas untuk perolehan aset inventaris, peralatan operasional kantor, serta persediaan modal koperasi.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center min-w-[100px]">
                  <span className="text-[10px] text-emerald-200 block uppercase font-mono">Total Transaksi</span>
                  <span className="text-sm font-bold font-mono">{pembelian.length} Item</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center min-w-[125px]">
                  <span className="text-[10px] text-emerald-250 block uppercase font-mono">Total Nilai Aset</span>
                  <span className="text-sm font-bold font-mono text-amber-200">
                    {formatRupiah(pembelian.reduce((sum, p) => sum + p.totalHarga, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Pembelian */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <ShoppingCart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Catat Pembelian / Pengadaan</h2>
            </div>

            <form onSubmit={handlePembelianSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tanggal Pembelian</label>
                <input
                  type="date"
                  value={pemDate}
                  onChange={(e) => setPemDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nama Barang / Aset</label>
                <input
                  type="text"
                  value={pemNama}
                  onChange={(e) => setPemNama(e.target.value)}
                  placeholder="Contoh: Printer Struk Thermal 80mm"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Kategori Barang</label>
                <select
                  value={pemKategori}
                  onChange={(e) => setPemKategori(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Inventaris Kantor">Inventaris Kantor</option>
                  <option value="Inventaris Elektronik">Inventaris Elektronik / Komputer</option>
                  <option value="Perlengkapan Kasir">Perlengkapan Kasir & Toko</option>
                  <option value="Persediaan Barang Dagang">Persediaan Barang Dagang / Kulakan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Kuantitas (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={pemQty}
                    onChange={(e) => setPemQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="text"
                    value={pemHarga}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPemHarga(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                    }}
                    placeholder="0"
                    required
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Keterangan / Supplier</label>
                <input
                  type="text"
                  value={pemNotes}
                  onChange={(e) => setPemNotes(e.target.value)}
                  placeholder="Contoh: Toko Elektronik Maju Jaya"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan Pembelian Kas Keluar
              </button>
            </form>
          </div>

          {/* List Pembelian */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Pembelian & Pengadaan Aset</h2>
                <p className="text-xs text-slate-400">Total {pembelian.length} item pembelian terdaftar</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pengadaan</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {formatRupiah(pembelian.reduce((acc, c) => acc + (c.totalHarga || 0), 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Barang</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right">Total Kas Keluar</th>
                    {onDeletePembelian && <th className="py-2.5 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {pembelian.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Belum ada catatan pembelian barang atau inventaris.
                      </td>
                    </tr>
                  ) : (
                    pembelian.slice().reverse().map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">{p.tanggal}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">{p.namaBarang}</td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{p.kategori}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{p.kuantitas}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{formatRupiah(p.hargaSatuan)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatRupiah(p.totalHarga)}</td>
                        {onDeletePembelian && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, type: 'pembelian', id: p.id, title: `${p.namaBarang} (${formatRupiah(p.totalHarga)})` })}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Hapus pembelian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB CONTENT: KAS KELUAR SHU (PENCAIRAN / DISTRIBUSI SHU) */}
      {!isKasir && activeTab === 'shu' && (
        <div className="space-y-6">
          {/* Header & Impact Info Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-slate-900/50 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Kas Keluar SHU (Pencairan / Distribusi Sisa Hasil Usaha)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold">
                    Terintegrasi Neraca Saldo
                  </span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                  Pengeluaran kas untuk SHU (bagian anggota, pengurus, pengawas) secara langsung <strong>memotong saldo Kas Koperasi (Aktiva)</strong> dan <strong>mengurangi saldo SHU Berjalan pada Neraca Saldo (Pasiva)</strong>, sedangkan nilai <strong>Dana Cadangan</strong> pada Neraca Saldo menyesuaikan nominal alokasi distribusi SHU yang dibukukan.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Summary Cards for SHU Outflows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                Total Kas Keluar SHU Dicairkan
              </span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {formatRupiah(
                  expenses.filter(e => {
                    const cat = (e.kategori || '').toLowerCase();
                    const ket = (e.keterangan || '').toLowerCase();
                    return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                  }).reduce((sum, e) => sum + e.nominal, 0)
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Mengurangi Kas & SHU Neraca Saldo</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Kas Tersedia Koperasi
              </span>
              <div className={`text-lg font-extrabold font-mono ${availableCash >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatRupiah(availableCash)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Likuiditas riil kas koperasi</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                Alokasi Dana Cadangan
              </span>
              <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                {formatRupiah(
                  (setup?.danaCadanganAwal || 0) + 
                  (shuDistributions || []).reduce((sum, d) => sum + (d.danaCadanganNominal || 0), 0)
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Menyesuaikan distribusi SHU</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Transaksi SHU
              </span>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {expenses.filter(e => {
                  const cat = (e.kategori || '').toLowerCase();
                  const ket = (e.keterangan || '').toLowerCase();
                  return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                }).length} Transaksi
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pencairan anggota & pengurus</p>
            </div>
          </div>

          {/* Form Input Kas Keluar SHU & Daftar Riwayat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Form Catat Kas Keluar SHU */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Catat Kas Keluar SHU</h2>
              </div>

              {shuSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{shuSuccessMsg}</span>
                </div>
              )}

              {shuErrorMsg && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{shuErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddSHUKasKeluar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={shuDate}
                    onChange={(e) => setShuDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Penerima SHU</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl text-[11px] font-bold mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShuRecipientType('anggota');
                        setShuCategory('pencairan_anggota');
                      }}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${shuRecipientType === 'anggota' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Anggota
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShuRecipientType('pengurus');
                        setShuCategory('pencairan_pengurus');
                      }}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${shuRecipientType === 'pengurus' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Pengurus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShuRecipientType('umum');
                        setShuCategory('pencairan_umum');
                      }}
                      className={`py-1.5 rounded-lg transition cursor-pointer ${shuRecipientType === 'umum' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Kolektif
                    </button>
                  </div>

                  {shuRecipientType === 'anggota' && (
                    <select
                      value={shuAnggotaId}
                      onChange={(e) => setShuAnggotaId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Anggota Koperasi --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.noAnggota})
                        </option>
                      ))}
                    </select>
                  )}

                  {shuRecipientType === 'pengurus' && (
                    <select
                      value={shuPengurusNama}
                      onChange={(e) => setShuPengurusNama(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Pengurus / Pengawas --</option>
                      {pengurusPengawas && pengurusPengawas.length > 0 ? (
                        pengurusPengawas.map(p => (
                          <option key={p.id} value={p.nama}>
                            {p.nama} ({p.jabatan || 'Pengurus/Pengawas'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Ketua Pengurus">Ketua Pengurus</option>
                          <option value="Sekretaris Pengurus">Sekretaris Pengurus</option>
                          <option value="Bendahara Pengurus">Bendahara Pengurus</option>
                          <option value="Dewan Pengawas">Dewan Pengawas</option>
                        </>
                      )}
                    </select>
                  )}

                  {shuRecipientType === 'umum' && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                      Pencairan kolektif / kas keluar serentak SHU untuk seluruh anggota / stakeholder koperasi.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nominal Pencairan SHU (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={shuAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setShuAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      placeholder="0"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Keterangan / Keperluan</label>
                  <textarea
                    value={shuNotes}
                    onChange={(e) => setShuNotes(e.target.value)}
                    placeholder="Contoh: Pencairan SHU Tahun Buku berjalan bagian anggota..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    Efek Otomatis Pembukuan Akuntansi:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li><strong>Kas Koperasi:</strong> Berkurang sebesar nominal pencairan</li>
                    <li><strong>SHU Neraca Saldo:</strong> Berkurang sebesar nominal pencairan</li>
                    <li><strong>Dana Cadangan:</strong> Tetap terjaga & sinkron dengan alokasi distribusi</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Kas Keluar SHU
                </button>
              </form>
            </div>

            {/* List Kas Keluar SHU Terkini */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Daftar Kas Keluar & Pencairan SHU
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total {expenses.filter(e => {
                      const cat = (e.kategori || '').toLowerCase();
                      const ket = (e.keterangan || '').toLowerCase();
                      return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                    }).length} transaksi pencairan SHU
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total SHU Dicairkan</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatRupiah(
                      expenses.filter(e => {
                        const cat = (e.kategori || '').toLowerCase();
                        const ket = (e.keterangan || '').toLowerCase();
                        return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                      }).reduce((sum, e) => sum + e.nominal, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Table List SHU Outflows */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Klasifikasi</th>
                      <th className="py-2.5 px-3">Keterangan / Penerima</th>
                      <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                      <th className="py-2.5 px-3 text-center">Dampak Neraca</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {expenses.filter(e => {
                      const cat = (e.kategori || '').toLowerCase();
                      const ket = (e.keterangan || '').toLowerCase();
                      return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada transaksi pengeluaran kas / pencairan SHU yang dicatat.
                        </td>
                      </tr>
                    ) : (
                      expenses.filter(e => {
                        const cat = (e.kategori || '').toLowerCase();
                        const ket = (e.keterangan || '').toLowerCase();
                        return cat === 'pencairan_shu' || cat === 'shu' || cat === 'distribusi_shu' || cat.includes('shu') || ket.includes('pembagian shu') || ket.includes('pencairan shu') || ket.includes('bagian anggota') || ket.includes('bagian pengurus') || ket.includes('bagian pengawas');
                      }).map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">{e.tanggal}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Kas Keluar SHU
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{e.keterangan}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                            {formatRupiah(e.nominal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                              Kas (-) & SHU (-)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {onDeleteExpense && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, type: 'expense', id: e.id, title: `Pencairan SHU senilai ${formatRupiah(e.nominal)}` })}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Hapus transaksi kas keluar SHU"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* TAB CONTENT: REKAP BULANAN KAS KELUAR */}
      {!isKasir && activeTab === 'rekap_bulanan' && (
        <div className="space-y-6">
          {/* Filter Bar & Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Filter className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Pilih Bulan:</span>
              </div>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="semua">Semua Periode Transaksi</option>
                {availableMonths.map(ym => (
                  <option key={ym} value={ym}>
                    {formatYearMonthIndo(ym)}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari penerima / keterangan..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Rekap
              </button>
            </div>
          </div>

          {/* 5 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                Total Kas Keluar {selectedMonthFilter !== 'semua' ? `(${formatYearMonthIndo(selectedMonthFilter)})` : ''}
              </span>
              <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                {formatRupiah(monthlyStats.totalKasKeluar)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{filteredOutflows.length} transaksi tercatat</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Biaya Operasional
              </span>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {formatRupiah(monthlyStats.totalBeban)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Listrik, ATK, honor, dll</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Pencairan Pinjaman
              </span>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {formatRupiah(monthlyStats.totalPinjaman)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Modal kredit disalurkan</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                Kas Keluar SHU
              </span>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                {formatRupiah(monthlyStats.totalSHU)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pencairan SHU Anggota/Pengurus</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Tarik Simpanan & Pembelian
              </span>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                {formatRupiah(monthlyStats.totalTarik + monthlyStats.totalPembelian)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tarik: {formatRupiah(monthlyStats.totalTarik)} | Aset: {formatRupiah(monthlyStats.totalPembelian)}</p>
            </div>
          </div>

          {/* Unified Rekap Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Daftar Lengkap Mutasi Kas Keluar
              </h2>
              <span className="text-xs text-slate-400">
                Menampilkan {filteredOutflows.length} pengeluaran
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Klasifikasi Kas Keluar</th>
                    <th className="py-2.5 px-3">Penerima / Barang</th>
                    <th className="py-2.5 px-3">Keterangan / Rincian</th>
                    <th className="py-2.5 px-3 text-right">Nominal Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {filteredOutflows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                        Tidak ada transaksi kas keluar pada periode atau kriteria pencarian ini.
                      </td>
                    </tr>
                  ) : (
                    filteredOutflows.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">{item.tanggal}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.kategori === 'Beban Operasional'
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                                : item.kategori === 'Pencairan Pinjaman'
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                : item.kategori === 'Penarikan Simpanan'
                                ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                                : item.kategori === 'Pencairan SHU'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                            }`}>
                              {item.kategori}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{item.subKategori}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {item.penerima}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-sm truncate" title={item.keterangan}>
                          {item.keterangan || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatRupiah(item.nominal)}
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

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          title="Konfirmasi Hapus Kas Keluar"
          itemName={deleteModal.title}
          warningMessage={`Apakah Anda yakin ingin menghapus data kas keluar "${deleteModal.title}"? Saldo kas koperasi akan disesuaikan kembali secara otomatis.`}
          onConfirm={() => {
            if (deleteModal.type === 'expense' && onDeleteExpense) {
              onDeleteExpense(deleteModal.id);
            } else if (deleteModal.type === 'pembelian' && onDeletePembelian) {
              onDeletePembelian(deleteModal.id);
            }
            setDeleteModal({ isOpen: false, type: 'expense', id: '', title: '' });
          }}
          onClose={() => setDeleteModal({ isOpen: false, type: 'expense', id: '', title: '' })}
        />
      )}

      {/* SCANNER MODAL: Camera Barcode Scanner Kartu Anggota Tarik Simpanan */}
      <CameraBarcodeScannerModal
        isOpen={showMemberScannerModal}
        onClose={() => setShowMemberScannerModal(false)}
        title="Scan Kartu Anggota (Tarik Simpanan Sukarela)"
        subtitle="Arahkan kamera ke QR Code atau Barcode pada kartu anggota di layar HP atau kartu fisik"
        onScan={(scannedCode) => {
          const mem = parseMemberScanCode(scannedCode, members);
          if (mem) {
            setTarikAnggotaId(mem.id);
            setScanFeedback(`✓ Kartu Anggota Terdeteksi: ${mem.nama} (${mem.noAnggota})`);
            setTimeout(() => setScanFeedback(null), 3500);
            setShowMemberScannerModal(false);
          } else {
            setScanFeedback(`⚠️ Kode "${scannedCode}" bukan kode anggota terdaftar.`);
            setTimeout(() => setScanFeedback(null), 3500);
          }
        }}
      />
    </div>
  );
}
