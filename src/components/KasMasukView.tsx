import React, { useState, useMemo, useEffect } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, ManasukaBungaLog, KoperasiSetup, PembayaranPending, PendapatanLain } from '../types';
import { formatRupiah, terbilang, getTransactionTime, sortMembersNaturally, createWhatsAppThankYouUrl, calculateMemberLedgerResume, calculateAngsuranPrincipal, calculateAngsuranInterest, calculateLoanOutstanding, calculateHistoricalLoanOutstanding, formatYearMonthIndo, exportToExcel } from '../utils/finance';
import { 
  Users, Wallet, HandCoins, Calendar, CheckCircle2, AlertCircle, AlertTriangle, Phone, ArrowUpRight, Receipt, X,
  Printer, Info, FileText, Trash2, Pencil, Search, MessageSquare, Maximize2, Minimize2, Columns, LayoutGrid, Bell,
  ArrowUpDown, TrendingUp, DollarSign, Plus, FileSpreadsheet, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface KasMasukProps {
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income?: PendapatanLain[];
  onAddIncome?: (inc: Omit<PendapatanLain, 'id'>) => void;
  onDeleteIncome?: (id: string) => void;
  pembayaranPending?: PembayaranPending[];
  onApprovePembayaranPending?: (id: string, catatan?: string) => Promise<void>;
  onRejectPembayaranPending?: (id: string, catatan?: string) => Promise<void>;
  onAddSimpanan: (s: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => void;
  onPostManasukaBunga: (logs: Omit<ManasukaBungaLog, 'id'>, autoPostSukarela: boolean) => void;
  onAddAngsuran: (a: Omit<Angsuran, 'id'> | Omit<Angsuran, 'id'>[], updatePinjamanStatus: boolean) => void;
  onDeleteAngsuran?: (id: string) => void;
  onDeleteSimpanan?: (id: string) => void;
  onEditSimpanan?: (updated: Simpanan) => void;
  onEditAngsuran?: (updated: Angsuran) => void;
  availableCash?: number;
  initialActiveTab?: 'simpanan' | 'angsuran' | 'pendapatan' | 'rekap_bulanan' | 'pembayaran_pending';
  initialSearchTerm?: string;
  initialAnggotaId?: string;
  onNavigateToPinjaman?: (pinjamanId?: string, memberId?: string, query?: string) => void;
  isDarkMode?: boolean;
}

export function KasMasukView({
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  income = [],
  onAddIncome,
  onDeleteIncome,
  pembayaranPending = [],
  onApprovePembayaranPending,
  onRejectPembayaranPending,
  onAddSimpanan,
  onPostManasukaBunga,
  onAddAngsuran,
  onDeleteAngsuran,
  onDeleteSimpanan,
  onEditSimpanan,
  onEditAngsuran,
  availableCash = 0,
  initialActiveTab,
  initialSearchTerm,
  initialAnggotaId,
  onNavigateToPinjaman,
  isDarkMode = false
}: KasMasukProps) {
  const sortedMembers = useMemo(() => sortMembersNaturally(members), [members]);
  // Form states
  const [anggotaId, setAnggotaId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));

  // Edit Simpanan states
  const [editingSimpanan, setEditingSimpanan] = useState<Simpanan | null>(null);
  const [editAnggotaId, setEditAnggotaId] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editJenis, setEditJenis] = useState<'Pokok' | 'Wajib' | 'Sukarela'>('Sukarela');
  const [editJumlah, setEditJumlah] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editIsPenarikan, setEditIsPenarikan] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: string;
    itemName: string;
    itemDetails?: { label: string; value: string; isHighlight?: boolean }[];
    warningMessage?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const startEditSimpanan = (s: Simpanan) => {
    setEditingSimpanan(s);
    setEditAnggotaId(s.anggotaId);
    setEditTanggal(s.tanggal);
    setEditJenis(s.jenis);
    const isNeg = s.jumlah < 0;
    setEditIsPenarikan(isNeg);
    setEditJumlah(formatInputRupiah(String(Math.abs(s.jumlah))));
    setEditKeterangan(s.keterangan || '');
  };

  const handleSaveEditSimpanan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSimpanan) return;
    if (!onEditSimpanan) return;

    const rawJumlah = parseInputRupiah(editJumlah);
    if (rawJumlah <= 0) {
      alert("Jumlah nominal simpanan harus lebih dari 0!");
      return;
    }

    const finalJumlah = editIsPenarikan ? -rawJumlah : rawJumlah;

    const updated: Simpanan = {
      ...editingSimpanan,
      anggotaId: editAnggotaId,
      tanggal: editTanggal,
      jenis: editJenis,
      jumlah: finalJumlah,
      keterangan: editKeterangan,
    };

    onEditSimpanan(updated);
    setEditingSimpanan(null);
  };

  // Edit Angsuran states
  const [editingAngsuran, setEditingAngsuran] = useState<Angsuran | null>(null);
  const [editAngsuranTanggal, setEditAngsuranTanggal] = useState('');
  const [editAngsuranBulanKe, setEditAngsuranBulanKe] = useState(1);
  const [editAngsuranPokok, setEditAngsuranPokok] = useState('');
  const [editAngsuranJasa, setEditAngsuranJasa] = useState('');
  const [editAngsuranKeterangan, setEditAngsuranKeterangan] = useState('');

  const startEditAngsuran = (item: Angsuran) => {
    setEditingAngsuran(item);
    setEditAngsuranTanggal(item.tanggal);
    setEditAngsuranBulanKe(item.bulanKe || 1);

    const pContract = pinjaman.find(p => p.id === item.pinjamanId);
    const pokokVal = item.pokokBayar !== undefined ? item.pokokBayar : calculateAngsuranPrincipal(item, pContract);
    const jasaVal = item.jasaBayar !== undefined ? item.jasaBayar : calculateAngsuranInterest(item, pContract);

    setEditAngsuranPokok(pokokVal > 0 ? formatInputRupiah(String(pokokVal)) : '0');
    setEditAngsuranJasa(jasaVal > 0 ? formatInputRupiah(String(jasaVal)) : '0');
    setEditAngsuranKeterangan(item.keterangan || '');
  };

  const handleSaveEditAngsuran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAngsuran) return;
    if (!onEditAngsuran) return;

    const parsedPokok = parseInputRupiah(editAngsuranPokok);
    const parsedJasa = parseInputRupiah(editAngsuranJasa);
    const totalBayar = parsedPokok + parsedJasa;

    if (totalBayar <= 0) {
      alert("Total pembayaran angsuran (Pokok + Jasa) harus lebih dari 0!");
      return;
    }

    const updated: Angsuran = {
      ...editingAngsuran,
      tanggal: editAngsuranTanggal,
      bulanKe: Number(editAngsuranBulanKe) || 1,
      pokokBayar: parsedPokok,
      jasaBayar: parsedJasa,
      jumlahBayar: totalBayar,
      keterangan: editAngsuranKeterangan.trim(),
    };

    onEditAngsuran(updated);
    setEditingAngsuran(null);
  };
  
  // Savings states
  const [jumlahPokok, setJumlahPokok] = useState('50.000');
  const [jumlahWajib, setJumlahWajib] = useState('50.000');
  const [jumlahSukarela, setJumlahSukarela] = useState('');
  const [keteranganSimpanan, setKeteranganSimpanan] = useState('');
  
  // Installment states
  const [angsuranPokok, setAngsuranPokok] = useState('');
  const [angsuranJasa, setAngsuranJasa] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [bulanKe, setBulanKe] = useState(1);
  const [notes, setNotes] = useState('');

  // Installment mismatch warning modal state
  const [showInstallmentMismatchModal, setShowInstallmentMismatchModal] = useState(false);
  const [installmentMismatchInfo, setInstallmentMismatchInfo] = useState<{
    memberNama: string;
    memberNo: string;
    kontrakId: string;
    bulanKe: number;
    expectedPokok: number;
    expectedJasa: number;
    expectedTotal: number;
    inputPokok: number;
    inputJasa: number;
    inputTotal: number;
    diffPokok: number;
    diffJasa: number;
    diffTotal: number;
    sisaPokokSaatIni: number;
    sisaPokokSetelahBayar: number;
  } | null>(null);

  // Dividen Jasa Manasuka states
  const [isManasukaModalOpen, setIsManasukaModalOpen] = useState(false);
  const [targetBulan, setTargetBulan] = useState('06');
  const [targetTahun, setTargetTahun] = useState('2026');
  const [calculatedLogs, setCalculatedLogs] = useState<Omit<ManasukaBungaLog, 'id'>[]>([]);
  const [logsPosted, setLogsPosted] = useState(false);

  // Receipts / modals
  const [receiptData, setReceiptData] = useState<{
    member: Member;
    items: { jenis: 'Pokok' | 'Wajib' | 'Sukarela'; jumlah: number; keterangan: string }[];
    angsuran?: {
      pinjamanId: string;
      bulanKe: number;
      pokokBayar?: number;
      jasaBayar?: number;
      jumlahBayar: number;
      remaining: number;
      keterangan: string;
      angsuranList?: {
        bulanKe: number;
        pokokBayar: number;
        jasaBayar: number;
        jumlahBayar: number;
        keterangan: string;
      }[];
    };
    txId: string;
    tanggal: string;
  } | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<Angsuran | null>(null);

  // Filters and table switches
  const [activeTab, setActiveTab] = useState<'simpanan' | 'angsuran' | 'pendapatan' | 'rekap_bulanan' | 'pembayaran_pending'>(initialActiveTab || 'simpanan');
  const [isTableFullScreen, setIsTableFullScreen] = useState(false);
  const [filterAnggotaOpt, setFilterAnggotaOpt] = useState(initialAnggotaId || '');
  const [filterJenisOpt, setFilterJenisOpt] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState(initialSearchTerm || '');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('semua');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [historyViewMode, setHistoryViewMode] = useState<'table' | 'grouped_month'>('table');
  const [formMemberSearch, setFormMemberSearch] = useState('');
  const [validationComments, setValidationComments] = useState<Record<string, string>>({});
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'Semua' | 'Pending' | 'Disetujui' | 'Ditolak'>('Semua');
  const [previewBuktiModal, setPreviewBuktiModal] = useState<{ url: string; title: string } | null>(null);

  // Income form states
  const [incTanggal, setIncTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [incSumber, setIncSumber] = useState('warung');
  const [incNominal, setIncNominal] = useState('');
  const [incKeterangan, setIncKeterangan] = useState('');

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
      if (initialActiveTab === 'pembayaran_pending') {
        setPendingStatusFilter('Pending');
      }
    }
  }, [initialActiveTab]);

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setTableSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    if (initialAnggotaId !== undefined) {
      setFilterAnggotaOpt(initialAnggotaId);
    }
  }, [initialAnggotaId]);

  const formFilteredMembers = useMemo(() => {
    if (!formMemberSearch.trim()) return sortedMembers;
    const q = formMemberSearch.toLowerCase().trim();
    return sortedMembers.filter(m => 
      m.nama.toLowerCase().includes(q) || 
      m.noAnggota.toLowerCase().includes(q) ||
      (m.noHp && m.noHp.includes(q))
    );
  }, [sortedMembers, formMemberSearch]);

  // rupian format and parse helpers
  const formatInputRupiah = (valStr: string) => {
    const clean = valStr.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('id-ID');
  };

  const parseInputRupiah = (valStr: string) => {
    const clean = (valStr || '').replace(/\./g, '');
    return parseFloat(clean) || 0;
  };

  const [formMode, setFormMode] = useState<'kas_masuk' | 'pendapatan'>('kas_masuk');

  // Handler for adding income in Kas Masuk
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseInputRupiah(incNominal);
    if (nominal <= 0) {
      alert("Nominal pendapatan harus lebih dari 0!");
      return;
    }
    if (onAddIncome) {
      onAddIncome({
        tanggal: incTanggal,
        sumber: incSumber,
        nominal,
        keterangan: incKeterangan || `Penerimaan kas dari ${incSumber}`
      });
      setIncNominal('');
      setIncKeterangan('');
      setActiveTab('pendapatan');
      alert(`Pendapatan sebesar ${formatRupiah(nominal)} berhasil dibukukan ke Kas Masuk!`);
    } else {
      alert("Handler tambah pendapatan tidak tersedia.");
    }
  };

  // Unified Inflow Transactions Collection for Rekap Bulanan
  const allInflows = useMemo(() => {
    const list: Array<{
      id: string;
      sourceId: string;
      tanggal: string;
      kategori: 'Simpanan Wajib' | 'Simpanan Pokok' | 'Simpanan Sukarela' | 'Angsuran Pinjaman' | 'Pendapatan Koperasi';
      subKategori: string;
      penyetor: string;
      nominal: number;
      keterangan: string;
      refType: 'simpanan' | 'angsuran' | 'income';
    }> = [];

    // 1. Simpanan (positive values = cash inflow)
    simpanan.filter(s => s.jumlah > 0).forEach(s => {
      const m = members.find(mem => mem.id === s.anggotaId);
      list.push({
        id: `in-simp-${s.id}`,
        sourceId: s.id,
        tanggal: s.tanggal,
        kategori: s.jenis === 'Wajib' ? 'Simpanan Wajib' : s.jenis === 'Pokok' ? 'Simpanan Pokok' : 'Simpanan Sukarela',
        subKategori: `Simpanan ${s.jenis}`,
        penyetor: m ? `${m.nama} (${m.noAnggota})` : 'Anggota',
        nominal: s.jumlah,
        keterangan: s.keterangan || `Setoran simpanan ${s.jenis.toLowerCase()}`,
        refType: 'simpanan'
      });
    });

    // 2. Angsuran Pinjaman
    angsuran.forEach(a => {
      const pContract = pinjaman.find(p => p.id === a.pinjamanId);
      const m = members.find(mem => mem.id === (a.anggotaId || pContract?.anggotaId));
      const principalPaid = calculateAngsuranPrincipal(a, pContract);
      const interestPaid = calculateAngsuranInterest(a, pContract);
      list.push({
        id: `in-ang-${a.id}`,
        sourceId: a.id,
        tanggal: a.tanggal,
        kategori: 'Angsuran Pinjaman',
        subKategori: `Angsuran Ke-${a.bulanKe} (Pokok: ${formatRupiah(principalPaid)} | Jasa: ${formatRupiah(interestPaid)})`,
        penyetor: m ? `${m.nama} (${m.noAnggota})` : 'Anggota',
        nominal: a.jumlahBayar,
        keterangan: a.keterangan || `Angsuran pinjaman bulan ke-${a.bulanKe}`,
        refType: 'angsuran'
      });
    });

    // 3. Pendapatan Lain / Usaha Koperasi
    (income || []).forEach(inc => {
      const sourceLabels: Record<string, string> = {
        warung: 'Laba Toko / Warung Koperasi',
        jasa: 'Pendapatan Jasa Pinjaman',
        provisi: 'Pendapatan Biaya Provisi & Adm',
        bunga_bank: 'Pendapatan Bunga Bank',
        denda: 'Denda Keterlambatan',
        lain_lain: 'Pendapatan Operasional Lainnya'
      };
      list.push({
        id: `in-inc-${inc.id}`,
        sourceId: inc.id,
        tanggal: inc.tanggal,
        kategori: 'Pendapatan Koperasi',
        subKategori: sourceLabels[inc.sumber] || inc.sumber,
        penyetor: 'Unit Usaha / Eksternal',
        nominal: inc.nominal,
        keterangan: inc.keterangan || 'Pendapatan kas masuk koperasi',
        refType: 'income'
      });
    });

    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [simpanan, angsuran, income, pinjaman, members]);

  // Monthly summary stats grouped by month
  const monthlyInflowSummary = useMemo(() => {
    const monthMap = new Map<string, {
      simpananWajib: number;
      simpananPokok: number;
      simpananSukarela: number;
      angsuranPokok: number;
      angsuranJasa: number;
      totalAngsuran: number;
      pendapatanKoperasi: number;
      totalKasMasuk: number;
      count: number;
    }>();

    // From simpanan
    simpanan.filter(s => s.jumlah > 0).forEach(s => {
      const ym = s.tanggal && s.tanggal.length >= 7 ? s.tanggal.substring(0, 7) : 'Lainnya';
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { simpananWajib: 0, simpananPokok: 0, simpananSukarela: 0, angsuranPokok: 0, angsuranJasa: 0, totalAngsuran: 0, pendapatanKoperasi: 0, totalKasMasuk: 0, count: 0 });
      }
      const data = monthMap.get(ym)!;
      if (s.jenis === 'Wajib') data.simpananWajib += s.jumlah;
      else if (s.jenis === 'Pokok') data.simpananPokok += s.jumlah;
      else data.simpananSukarela += s.jumlah;
      data.totalKasMasuk += s.jumlah;
      data.count += 1;
    });

    // From angsuran
    angsuran.forEach(a => {
      const ym = a.tanggal && a.tanggal.length >= 7 ? a.tanggal.substring(0, 7) : 'Lainnya';
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { simpananWajib: 0, simpananPokok: 0, simpananSukarela: 0, angsuranPokok: 0, angsuranJasa: 0, totalAngsuran: 0, pendapatanKoperasi: 0, totalKasMasuk: 0, count: 0 });
      }
      const data = monthMap.get(ym)!;
      const pContract = pinjaman.find(p => p.id === a.pinjamanId);
      const pokok = calculateAngsuranPrincipal(a, pContract);
      const jasa = calculateAngsuranInterest(a, pContract);
      data.angsuranPokok += pokok;
      data.angsuranJasa += jasa;
      data.totalAngsuran += a.jumlahBayar;
      data.totalKasMasuk += a.jumlahBayar;
      data.count += 1;
    });

    // From income
    (income || []).forEach(inc => {
      const ym = inc.tanggal && inc.tanggal.length >= 7 ? inc.tanggal.substring(0, 7) : 'Lainnya';
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { simpananWajib: 0, simpananPokok: 0, simpananSukarela: 0, angsuranPokok: 0, angsuranJasa: 0, totalAngsuran: 0, pendapatanKoperasi: 0, totalKasMasuk: 0, count: 0 });
      }
      const data = monthMap.get(ym)!;
      data.pendapatanKoperasi += inc.nominal;
      data.totalKasMasuk += inc.nominal;
      data.count += 1;
    });

    const sortedMonths = Array.from(monthMap.keys()).sort().reverse();
    return sortedMonths.map(ym => ({
      ym,
      ...monthMap.get(ym)!
    }));
  }, [simpanan, angsuran, income, pinjaman]);

  // Export to Excel for Rekap Kas Masuk
  const handleExportExcelRekap = () => {
    const targetData = selectedMonthFilter === 'semua' ? allInflows : allInflows.filter(i => i.tanggal.startsWith(selectedMonthFilter));
    const rows = targetData.map((item, idx) => ({
      No: idx + 1,
      Tanggal: item.tanggal,
      'Kategori Kas Masuk': item.kategori,
      'Sub Kategori': item.subKategori,
      'Penyetor / Sumber': item.penyetor,
      Keterangan: item.keterangan,
      'Nominal (Rp)': item.nominal
    }));

    exportToExcel(
      rows,
      `Rekap Kas Masuk`,
      `Rekap_Kas_Masuk_${selectedMonthFilter}_${Date.now()}.xlsx`,
      setup
    );
  };

  // Print Rekap Kas Masuk
  const handlePrintRekapMasuk = (targetMonth: string = selectedMonthFilter) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Izin popup diblokir. Harap aktifkan popup di peramban Anda.");
      return;
    }
    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const kopAlamat = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const filterTitle = targetMonth === 'semua' ? 'SEMUA BULAN (KUMULATIF)' : formatYearMonthIndo(targetMonth).toUpperCase();

    const dataPrint = targetMonth === 'semua' ? allInflows : allInflows.filter(i => i.tanggal.startsWith(targetMonth));
    const grandTotal = dataPrint.reduce((acc, curr) => acc + curr.nominal, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>REKAP_KAS_MASUK_${targetMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 10px; color: #555; }
            .title { text-align: center; font-weight: bold; margin: 15px 0 10px 0; font-size: 13px; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { background-color: #e6f4ea; font-weight: bold; }
            .signature { margin-top: 35px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sign-box { width: 200px; text-align: center; }
            .sign-line { margin-top: 55px; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${kopName}</h2>
            <p>${kopAlamat}</p>
            <p>LAPORAN REKAPITULASI PENERIMAAN KAS MASUK</p>
          </div>
          <div class="title">REKAP TRANSAKSI KAS MASUK PERIODE: ${filterTitle}</div>
          <table>
            <thead>
              <tr>
                <th width="30">No</th>
                <th width="80">Tanggal</th>
                <th width="140">Kategori Kas Masuk</th>
                <th width="160">Penyetor / Sumber</th>
                <th>Keterangan</th>
                <th width="115" class="text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${dataPrint.map((item, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center">${item.tanggal}</td>
                  <td><b>${item.kategori}</b></td>
                  <td>${item.penyetor}</td>
                  <td>${item.keterangan}</td>
                  <td class="text-right font-mono">${formatRupiah(item.nominal)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" class="text-right"><b>TOTAL KAS MASUK:</b></td>
                <td class="text-right"><b>${formatRupiah(grandTotal)}</b></td>
              </tr>
            </tbody>
          </table>
          <div class="signature">
            <div class="sign-box">
              <p>Mengetahui,<br/>Ketua Koperasi</p>
              <div class="sign-line"></div>
            </div>
            <div class="sign-box">
              <p>Dicetak Pada: ${new Date().toLocaleDateString('id-ID')}<br/>Bendahara Koperasi</p>
              <div class="sign-line"></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Determine if the selected member is already paid Simpanan Pokok
  const hasPokokPaid = useMemo(() => {
    if (!anggotaId) return false;
    const balance = simpanan
      .filter(s => s.anggotaId === anggotaId && s.jenis === 'Pokok')
      .reduce((sum, item) => sum + item.jumlah, 0);
    return balance > 0;
  }, [anggotaId, simpanan]);

  // Track if the selected member has an active/pending loan (Belum Lunas)
  const activeLoanContract = useMemo(() => {
    if (!anggotaId) return null;
    const contract = pinjaman.find(p => p.anggotaId === anggotaId && p.status === 'Belum Lunas');
    if (!contract) return null;

    const mInfo = members.find(m => m.id === contract.anggotaId);
    const relatedPayments = angsuran.filter(a => a.pinjamanId === contract.id);
    const totalTerbayar = relatedPayments.reduce((acc, c) => acc + c.jumlahBayar, 0);

    const nominalPinjaman = contract.nominalPinjaman || 0;
    const totalPokokTerbayar = relatedPayments.reduce((acc, c) => acc + calculateAngsuranPrincipal(c, contract), 0);
    const sisaPokok = Math.max(0, nominalPinjaman - totalPokokTerbayar);
    const jasaBulanBerjalan = contract.jasaPerBulan > 0
      ? contract.jasaPerBulan
      : Math.round(nominalPinjaman * (contract.bungaFlatPersen ? contract.bungaFlatPersen / 100 : 0.015));
    const nominalBayarLunas = sisaPokok + jasaBulanBerjalan;

    const sisa = sisaPokok;

    return {
      contract,
      mInfo,
      totalTerbayar,
      totalPokokTerbayar,
      sisa,
      sisaPokok,
      jasaBulanBerjalan,
      nominalBayarLunas,
      relatedPayments
    };
  }, [anggotaId, pinjaman, angsuran, members]);

  // Toggle to optionally include installment when active loan exists
  const [includeInstallment, setIncludeInstallment] = useState(true);
  const [payOption, setPayOption] = useState<'rutin' | 'dua_bulan' | 'lunas'>('rutin');

  // Calculate voluntary savings balance for selected member
  const selectedMemberSukarelaBalance = useMemo(() => {
    if (!anggotaId) return 0;
    return simpanan
      .filter(s => s.anggotaId === anggotaId && s.jenis === 'Sukarela')
      .reduce((sum, item) => sum + item.jumlah, 0);
  }, [anggotaId, simpanan]);

  // Calculate principal savings balance for selected member
  const selectedMemberPokokBalance = useMemo(() => {
    if (!anggotaId) return 0;
    return simpanan
      .filter(s => s.anggotaId === anggotaId && s.jenis === 'Pokok')
      .reduce((sum, item) => sum + item.jumlah, 0);
  }, [anggotaId, simpanan]);

  // Calculate mandatory savings balance for selected member
  const selectedMemberWajibBalance = useMemo(() => {
    if (!anggotaId) return 0;
    return simpanan
      .filter(s => s.anggotaId === anggotaId && s.jenis === 'Wajib')
      .reduce((sum, item) => sum + item.jumlah, 0);
  }, [anggotaId, simpanan]);

  // Set field defaults when changing selected member
  React.useEffect(() => {
    if (!anggotaId) {
      setJumlahPokok('50.000');
      setJumlahWajib('50.000');
      setJumlahSukarela('');
      setAngsuranPokok('');
      setAngsuranJasa('');
      setCustomAmount('');
      setNotes('');
      return;
    }

    if (hasPokokPaid) {
      setJumlahPokok('0');
    } else {
      setJumlahPokok('50.000');
    }
    setJumlahWajib('50.000');
    setJumlahSukarela('');
    setCustomAmount('');
    setNotes('');
    setIncludeInstallment(true);
  }, [anggotaId, hasPokokPaid]);

  // Set default angsuran pokok & jasa (default jasa pinjaman 1.5% dari total pinjaman)
  React.useEffect(() => {
    if (activeLoanContract) {
      const nomPinjaman = activeLoanContract.contract.nominalPinjaman || 0;
      // Default jasa 1.5% dari total pinjaman
      const defJasa = Math.round(nomPinjaman * 0.015);

      if (payOption === 'lunas') {
        setAngsuranPokok(formatInputRupiah(String(activeLoanContract.sisaPokok)));
        setAngsuranJasa(formatInputRupiah(String(defJasa)));
        setNotes('Pelunasan Lunas Pinjaman (Sisa Pokok + Jasa Bulan Berjalan)');
      } else if (payOption === 'dua_bulan') {
        const defPokok = activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1));
        const twoPokok = Math.min(activeLoanContract.sisaPokok, defPokok * 2);
        const twoJasa = defJasa * 2;
        setAngsuranPokok(formatInputRupiah(String(twoPokok)));
        setAngsuranJasa(formatInputRupiah(String(twoJasa)));
        setNotes(`Bayar 2 Bulan Sekaligus (Bulan Ke-${bulanKe} Tunggakan & Bulan Ke-${bulanKe + 1} Berjalan)`);
      } else {
        const defPokok = activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1));
        setAngsuranPokok(formatInputRupiah(String(defPokok)));
        setAngsuranJasa(formatInputRupiah(String(defJasa)));
      }
    } else {
      setAngsuranPokok('');
      setAngsuranJasa('');
    }
  }, [activeLoanContract?.contract.id, payOption]);

  // Set automatic installment bulanKe based on previous logs
  React.useEffect(() => {
    if (activeLoanContract) {
      const related = activeLoanContract.relatedPayments;
      if (related && related.length > 0) {
        const maxBulan = Math.max(...related.map(a => a.bulanKe || 0));
        setBulanKe(maxBulan + 1);
      } else {
        setBulanKe(1);
      }
    } else {
      setBulanKe(1);
    }
  }, [activeLoanContract]);

  // Calculate remaining principal dynamically for print / view
  const getRemainingPrincipal = (pId: string, _totalContractDebt?: number, currentAngsuran?: Angsuran) => {
    const pContract = pinjaman.find(p => p.id === pId);
    if (!pContract) return 0;
    if (currentAngsuran) {
      return calculateHistoricalLoanOutstanding(pContract, currentAngsuran, angsuran);
    }
    if (pContract.status === 'Lunas') return 0;
    const historicalPays = angsuran.filter(a => a.pinjamanId === pId);
    return calculateLoanOutstanding(pContract, historicalPays);
  };

  // Submit consolidated transactions (Simpanan and/or Angsuran)
  const handleUnifiedSubmit = (e?: React.FormEvent, forceBypassWarning = false) => {
    if (e) e.preventDefault();
    if (!anggotaId) {
      alert("Pilih anggota terlebih dahulu!");
      return;
    }

    const valPokok = parseInputRupiah(jumlahPokok);
    const valWajib = parseInputRupiah(jumlahWajib);
    const valSukarela = parseInputRupiah(jumlahSukarela);

    const hasSavingsToBook = valPokok > 0 || valWajib > 0 || valSukarela > 0;
    
    let hasInstallmentToBook = false;
    let valAngsuranPokok = 0;
    let valAngsuranJasa = 0;
    let nominalToPay = 0;
    let isLunas = false;

    if (activeLoanContract && includeInstallment) {
      const isBayarLunas = payOption === 'lunas';
      valAngsuranPokok = parseInputRupiah(angsuranPokok);
      valAngsuranJasa = parseInputRupiah(angsuranJasa);
      nominalToPay = valAngsuranPokok + valAngsuranJasa;

      if (!isNaN(nominalToPay) && nominalToPay > 0) {
        hasInstallmentToBook = true;
        const afterPayAmount = activeLoanContract.totalTerbayar + nominalToPay;
        isLunas = isBayarLunas || (valAngsuranPokok >= activeLoanContract.sisaPokok) || (afterPayAmount >= activeLoanContract.contract.totalWajibBayar);

        // --- VALIDASI KETIDAKSESUAIAN ANGSURAN & JASA SEBELUM DISIMPAN ---
        if (!forceBypassWarning) {
          const nomPinjaman = activeLoanContract.contract.nominalPinjaman || 0;
          const isDuaBulan = payOption === 'dua_bulan';
          const multiplier = isDuaBulan ? 2 : 1;
          const defPokok = isBayarLunas
            ? activeLoanContract.sisaPokok
            : Math.min(
                activeLoanContract.sisaPokok,
                (activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1))) * multiplier
              );
          const defJasa = (activeLoanContract.jasaBulanBerjalan > 0
            ? activeLoanContract.jasaBulanBerjalan
            : Math.round(nomPinjaman * (activeLoanContract.contract.bungaFlatPersen ? activeLoanContract.contract.bungaFlatPersen / 100 : 0.015))) * multiplier;
          const defTotal = defPokok + defJasa;

          const isPokokMismatch = Math.abs(valAngsuranPokok - defPokok) > 0;
          const isJasaMismatch = Math.abs(valAngsuranJasa - defJasa) > 0;
          const isTotalMismatch = Math.abs(nominalToPay - defTotal) > 0;

          if (isPokokMismatch || isJasaMismatch || isTotalMismatch) {
            const memberObj = members.find(m => m.id === anggotaId);
            setInstallmentMismatchInfo({
              memberNama: memberObj?.nama || 'Anggota',
              memberNo: memberObj?.noAnggota || '-',
              kontrakId: activeLoanContract.contract.id,
              bulanKe: bulanKe,
              expectedPokok: defPokok,
              expectedJasa: defJasa,
              expectedTotal: defTotal,
              inputPokok: valAngsuranPokok,
              inputJasa: valAngsuranJasa,
              inputTotal: nominalToPay,
              diffPokok: valAngsuranPokok - defPokok,
              diffJasa: valAngsuranJasa - defJasa,
              diffTotal: nominalToPay - defTotal,
              sisaPokokSaatIni: activeLoanContract.sisaPokok,
              sisaPokokSetelahBayar: Math.max(0, activeLoanContract.sisaPokok - valAngsuranPokok)
            });
            setShowInstallmentMismatchModal(true);
            return;
          }
        }
      }
    }

    if (!hasSavingsToBook && !hasInstallmentToBook) {
      alert("Silakan isi setoran simpanan atau pembayaran angsuran untuk memulai pembukuan kas masuk!");
      return;
    }

    // Validasi nominal tidak kurang dari 5.000
    if (valPokok > 0 && valPokok < 5000) {
      alert("Jumlah Simpanan Pokok tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
      return;
    }
    if (valWajib > 0 && valWajib < 5000) {
      alert("Jumlah Simpanan Wajib tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
      return;
    }
    if (valSukarela > 0 && valSukarela < 5000) {
      alert("Jumlah Simpanan Sukarela tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
      return;
    }
    if (hasInstallmentToBook && nominalToPay < 5000) {
      const remainingDebt = activeLoanContract ? activeLoanContract.sisa : 0;
      if (Math.abs(nominalToPay - remainingDebt) > 1 && nominalToPay < remainingDebt) {
        alert("Jumlah Angsuran tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
        return;
      }
    }

    const tId = `TX-${Date.now().toString().substring(5)}`;

    // Process Savings Bookings
    const batchData: Omit<Simpanan, 'id'>[] = [];
    if (hasSavingsToBook) {
      if (valPokok > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Pokok',
          jumlah: valPokok,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Pokok',
          transaksiId: tId
        });
      }
      if (valWajib > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Wajib',
          jumlah: valWajib,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Wajib',
          transaksiId: tId
        });
      }
      if (valSukarela > 0) {
        batchData.push({
          anggotaId,
          tanggal,
          jenis: 'Sukarela',
          jumlah: valSukarela,
          keterangan: keteranganSimpanan || 'Pembayaran Setoran Sukarela',
          transaksiId: tId
        });
      }

      onAddSimpanan(batchData);
    }

    // Process Installment Booking
    let bookedInstallmentData: any = undefined;
    if (hasInstallmentToBook && activeLoanContract) {
      if (payOption === 'dua_bulan') {
        const nomPinjaman = activeLoanContract.contract.nominalPinjaman || 0;
        const regPokok = activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1));
        const regJasa = activeLoanContract.jasaBulanBerjalan > 0 
          ? activeLoanContract.jasaBulanBerjalan 
          : Math.round(nomPinjaman * 0.015);

        let pokok1 = Math.round(valAngsuranPokok / 2);
        let pokok2 = valAngsuranPokok - pokok1;
        let jasa1 = Math.round(valAngsuranJasa / 2);
        let jasa2 = valAngsuranJasa - jasa1;

        if (valAngsuranPokok === regPokok * 2 && valAngsuranJasa === regJasa * 2) {
          pokok1 = regPokok;
          pokok2 = regPokok;
          jasa1 = regJasa;
          jasa2 = regJasa;
        }

        const angsuran1: Omit<Angsuran, 'id'> = {
          pinjamanId: activeLoanContract.contract.id,
          anggotaId: activeLoanContract.contract.anggotaId,
          tanggal,
          pokokBayar: pokok1,
          jasaBayar: jasa1,
          jumlahBayar: pokok1 + jasa1,
          bulanKe: bulanKe,
          keterangan: notes 
            ? `${notes} (Angsuran Ke-${bulanKe} - Tunggakan Bulan Kemarin)` 
            : `Angsuran ke-${bulanKe} (Tunggakan Bulan Kemarin)`
        };

        const angsuran2: Omit<Angsuran, 'id'> = {
          pinjamanId: activeLoanContract.contract.id,
          anggotaId: activeLoanContract.contract.anggotaId,
          tanggal,
          pokokBayar: pokok2,
          jasaBayar: jasa2,
          jumlahBayar: pokok2 + jasa2,
          bulanKe: bulanKe + 1,
          keterangan: notes 
            ? `${notes} (Angsuran Ke-${bulanKe + 1} - Bulan Berjalan)` 
            : `Angsuran ke-${bulanKe + 1} (Bulan Berjalan)`
        };

        onAddAngsuran([angsuran1, angsuran2], isLunas);

        bookedInstallmentData = {
          pinjamanId: activeLoanContract.contract.id,
          bulanKe: bulanKe,
          pokokBayar: valAngsuranPokok,
          jasaBayar: valAngsuranJasa,
          jumlahBayar: nominalToPay,
          remaining: Math.max(0, activeLoanContract.sisaPokok - valAngsuranPokok),
          keterangan: notes || `Bayar 2 Bulan Sekaligus (Bulan Ke-${bulanKe} Tunggakan & Bulan Ke-${bulanKe + 1} Berjalan)`,
          angsuranList: [
            { bulanKe: bulanKe, pokokBayar: pokok1, jasaBayar: jasa1, jumlahBayar: pokok1 + jasa1, keterangan: `Angsuran Ke-${bulanKe} (Tunggakan Bulan Kemarin)` },
            { bulanKe: bulanKe + 1, pokokBayar: pokok2, jasaBayar: jasa2, jumlahBayar: pokok2 + jasa2, keterangan: `Angsuran Ke-${bulanKe + 1} (Bulan Berjalan)` }
          ]
        };
      } else {
        onAddAngsuran({
          pinjamanId: activeLoanContract.contract.id,
          anggotaId: activeLoanContract.contract.anggotaId,
          tanggal,
          pokokBayar: valAngsuranPokok,
          jasaBayar: valAngsuranJasa,
          jumlahBayar: nominalToPay,
          bulanKe: bulanKe,
          keterangan: notes || `Pembayaran angsuran ke-${bulanKe}`
        }, isLunas);

        bookedInstallmentData = {
          pinjamanId: activeLoanContract.contract.id,
          bulanKe: bulanKe,
          pokokBayar: valAngsuranPokok,
          jasaBayar: valAngsuranJasa,
          jumlahBayar: nominalToPay,
          remaining: Math.max(0, activeLoanContract.sisaPokok - valAngsuranPokok),
          keterangan: notes || `Pembayaran angsuran ke-${bulanKe}`
        };
      }
    }

    // Trigger Consolidated/Unified Receipt Preview Modal
    const member = members.find(m => m.id === anggotaId);
    if (member) {
      setReceiptData({
        member,
        items: batchData.map(b => ({
          jenis: b.jenis as any,
          jumlah: b.jumlah,
          keterangan: b.keterangan
        })),
        angsuran: bookedInstallmentData,
        txId: tId,
        tanggal
      });
    }

    // Feedback
    let feedback = 'Kas Masuk berhasil dibukukan! ';
    if (hasSavingsToBook && hasInstallmentToBook) {
      feedback = payOption === 'dua_bulan'
        ? `Pembayaran simpanan & 2 KALI ANGSURAN SEKALIGUS (Bulan ke-${bulanKe} Tunggakan & Bulan ke-${bulanKe + 1} Berjalan) berhasil dibukukan terpisah!`
        : 'Pembayaran simpanan & angsuran pinjaman berhasil diproses secara bersamaan!';
    } else if (hasSavingsToBook) {
      feedback = 'Setoran simpanan berhasil diproses!';
    } else if (hasInstallmentToBook) {
      feedback = payOption === 'dua_bulan'
        ? `Setoran 2 KALI ANGSURAN SEKALIGUS (Bulan ke-${bulanKe} Tunggakan & Bulan ke-${bulanKe + 1} Berjalan) sebesar ${formatRupiah(nominalToPay)} berhasil disimpan! Kedua catatan angsuran telah tercatat terpisah di sistem.`
        : `Setoran angsuran bulan ke-${bulanKe} sebesar ${formatRupiah(nominalToPay)} (Pokok: ${formatRupiah(valAngsuranPokok)}, Jasa: ${formatRupiah(valAngsuranJasa)}) berhasil disimpan!`;
    }

    alert(feedback);

    // Reset fields
    setJumlahPokok('');
    setJumlahWajib('');
    setJumlahSukarela('');
    setKeteranganSimpanan('');
    setAngsuranPokok('');
    setAngsuranJasa('');
    setCustomAmount('');
    setNotes('');
  };

  // Unified Cash Receipt (Kas Masuk) Print Handler
  const handlePrintUnifiedReceipt = (data: typeof receiptData) => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Izin jendela terblokir. Harap aktifkan jendela popup untuk koperasi ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const isWithdrawal = data.items ? data.items.some(item => item.jumlah < 0) : false;
    
    const totalSimpanan = data.items ? data.items.reduce((sum, item) => sum + item.jumlah, 0) : 0;
    const totalAngsuran = data.angsuran ? data.angsuran.jumlahBayar : 0;
    
    // For withdrawals, totalAmount is the absolute sum of withdrawn funds
    const totalAmount = isWithdrawal ? Math.abs(totalSimpanan) : (totalSimpanan + totalAngsuran);
    const nominalTerbilang = terbilang(totalAmount) + " Rupiah";

    const savingsRows = data.items ? data.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9px; margin-top: 4px;">
        <span>Simpanan ${item.jenis} ${item.jumlah < 0 ? '(Penarikan)' : ''}</span>
        <span>${formatRupiah(Math.abs(item.jumlah))}</span>
      </div>
      ${item.keterangan ? `<div style="font-size: 8px; font-style: italic; color: #444; margin-left: 10px; margin-bottom: 4px;">${item.keterangan}</div>` : ''}
    `).join('') : '';

    const angsuranSection = data.angsuran ? `
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9px; margin-top: 4px;">
        <span>Angsuran Bulan Ke-${data.angsuran.bulanKe}</span>
        <span>${formatRupiah(data.angsuran.jumlahBayar)}</span>
      </div>
      <div style="font-size: 7.5px; font-style: italic; color: #444; margin-left: 10px;">Kontrak: #${data.angsuran.pinjamanId.substring(0, 8)}</div>
      ${data.angsuran.pokokBayar !== undefined ? `
      <div style="display: flex; justify-content: space-between; font-size: 8px; color: #333; margin-left: 10px;">
        <span>- Pokok Pinjaman</span>
        <span>${formatRupiah(data.angsuran.pokokBayar)}</span>
      </div>` : ''}
      ${data.angsuran.jasaBayar !== undefined ? `
      <div style="display: flex; justify-content: space-between; font-size: 8px; color: #b45309; margin-left: 10px;">
        <span>- Jasa Pinjaman</span>
        <span>${formatRupiah(data.angsuran.jasaBayar)}</span>
      </div>` : ''}
      ${data.angsuran.keterangan ? `<div style="font-size: 8px; font-style: italic; color: #444; margin-left: 10px; margin-bottom: 4px;">${data.angsuran.keterangan}</div>` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #b91c1c; margin-top: 2px;">
        <span>Sisa Pokok</span>
        <span>${formatRupiah(Math.max(0, data.angsuran.remaining))}</span>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${isWithdrawal ? 'STRUK_KAS_KELUAR' : 'STRUK_KAS_MASUK'}_${data.txId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            @page {
              size: 80mm auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 80mm;
              background-color: #fff;
              color: #000;
              font-family: 'Courier Prime', monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 3mm;
              box-sizing: border-box;
            }
            .receipt {
              width: 100%;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .header img {
              max-height: 40px;
              max-width: 40px;
              margin-bottom: 4px;
              border-radius: 50%;
              object-fit: cover;
              vertical-align: middle;
            }
            .header h3 {
              margin: 0;
              font-size: 12px;
              font-weight: bold;
            }
            .header p {
              margin: 2px 0;
              font-size: 8px;
            }
            .title {
              text-align: center;
              font-weight: bold;
              font-size: 10px;
              margin: 8px 0;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin-bottom: 2px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              margin-top: 4px;
            }
            @media print {
              body { padding: 3mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 40px; max-width: 40px; margin-bottom: 4px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />` 
                : `<span style="font-size: 18px; display: block; margin-bottom: 2px;">${setup?.logoUrl || '🌱'}</span>`}
              <h3>${kopName.toUpperCase()}</h3>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.slogan || 'Pusat Simpan Pinjam Sejahtera'}</p>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.alamatKantor || ''}</p>
            </div>
            <div class="title">${isWithdrawal ? 'Struk Bukti Kas Keluar (Penarikan)' : 'Struk Bukti Kas Masuk'}</div>
            <div class="row"><span>Resi No:</span> <b>${data.txId}</b></div>
            <div class="row"><span>Waktu:</span> <b>${data.tanggal}</b></div>
            <div class="row"><span>Anggota:</span> <b>${data.member.nama}</b></div>
            <div class="row"><span>No. Anggota:</span> <b>${data.member.noAnggota}</b></div>
            <div class="divider"></div>
            
            ${savingsRows}
            ${totalSimpanan > 0 && data.angsuran ? '<div class="divider"></div>' : ''}
            ${angsuranSection}
            
            <div class="divider"></div>
            <div class="total"><span>${isWithdrawal ? 'TOTAL AMBIL:' : 'TOTAL TERIMA:'}</span> <span>${formatRupiah(totalAmount)}</span></div>
            <div style="font-size: 8px; margin-top: 6px; text-align: center; font-style: italic; line-height: 1.2;">Terbilang: "${nominalTerbilang}"</div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 8px; text-align: center;">
              <div style="width: 45%;">
                <p>${isWithdrawal ? 'Penerima / Anggota' : 'Penyetor'}</p>
                <div style="height: 25px;"></div>
                <p><b>(${data.member.nama})</b></p>
              </div>
              <div style="width: 45%;">
                <p>Bendahara Koperasi</p>
                <div style="height: 25px;"></div>
                <p><b>(Anggi Anggraeni)</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Installment Thermal Printer
  const handlePrintSingle = (a: Angsuran) => {
    const member = members.find(m => m.id === a.anggotaId);
    const pContract = pinjaman.find(p => p.id === a.pinjamanId);
    const remaining = pContract ? calculateHistoricalLoanOutstanding(pContract, a, angsuran) : 0;
    const principalPaid = calculateAngsuranPrincipal(a, pContract);
    const interestPaid = calculateAngsuranInterest(a, pContract);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Izin jendela terblokir. Harap aktifkan jendela popup untuk koperasi ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
    const nominalTerbilang = terbilang(a.jumlahBayar) + " Rupiah";

    printWindow.document.write(`
      <html>
        <head>
          <title>STRUK_ANGSURAN_${a.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            @page {
              size: 80mm auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 80mm;
              background-color: #fff;
              color: #000;
              font-family: 'Courier Prime', monospace;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 3mm;
              box-sizing: border-box;
            }
            .receipt {
              width: 100%;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .header img {
              max-height: 40px;
              max-width: 40px;
              margin-bottom: 4px;
              border-radius: 50%;
              object-fit: cover;
              vertical-align: middle;
            }
            .header h3 {
              margin: 0;
              font-size: 12px;
              font-weight: bold;
            }
            .header p {
              margin: 2px 0;
              font-size: 8px;
            }
            .title {
              text-align: center;
              font-weight: bold;
              font-size: 10px;
              margin: 8px 0;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin-bottom: 2px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              margin-top: 4px;
            }
            @media print {
              body { padding: 3mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 40px; max-width: 40px; margin-bottom: 4px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />` 
                : `<span style="font-size: 18px; display: block; margin-bottom: 2px;">${setup?.logoUrl || '🌱'}</span>`}
              <h3>${kopName.toUpperCase()}</h3>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.slogan || 'Pusat Simpan Pinjam Sejahtera'}</p>
              <p style="font-size: 8px; margin: 2px 0;">${setup?.alamatKantor || ''}</p>
            </div>
            <div class="title">Bukti Angsuran Pinjaman</div>
            <div class="row"><span>Resi No:</span> <b>TX-${a.id.toUpperCase().substring(0, 8)}</b></div>
            <div class="row"><span>Waktu:</span> <b>${a.tanggal}</b></div>
            <div class="row"><span>Anggota:</span> <b>${member?.nama || 'N/A'}</b></div>
            <div class="row"><span>Angsuran Ke:</span> <b>Bulan Ke-${a.bulanKe}</b></div>
            <div class="divider"></div>
            <div class="row"><span>Pokok Pinjaman:</span> <b>${formatRupiah(principalPaid)}</b></div>
            <div class="row"><span>Jasa Pinjaman:</span> <b>${formatRupiah(interestPaid)}</b></div>
            <div class="divider"></div>
            <div class="row"><span>Jumlah Bayar:</span> <b>${formatRupiah(a.jumlahBayar)}</b></div>
            <div class="row"><span>Sisa Piutang:</span> <b>${formatRupiah(remaining)}</b></div>
            <div class="divider"></div>
            <div class="total"><span>TOTAL BAYAR:</span> <span>${formatRupiah(a.jumlahBayar)}</span></div>
            <div style="font-size: 8px; margin-top: 6px; text-align: center; font-style: italic; line-height: 1.2;">Terbilang: "${nominalTerbilang}"</div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 8px; text-align: center;">
              <div style="width: 45%;">
                <p>Penyetor</p>
                <div style="height: 25px;"></div>
                <p><b>(${member?.nama || 'N/A'})</b></p>
              </div>
              <div style="width: 45%;">
                <p>Bendahara Koperasi</p>
                <div style="height: 25px;"></div>
                <p><b>(Anggi Anggraeni)</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print all installment history
  const handlePrintAllHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan.");
      return;
    }

    const tableRows = angsuran
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .map(a => {
        const m = members.find(mem => mem.id === a.anggotaId);
        const pContract = pinjaman.find(p => p.id === a.pinjamanId);
        const remaining = pContract ? calculateHistoricalLoanOutstanding(pContract, a, angsuran) : 0;
        const principalPaid = calculateAngsuranPrincipal(a, pContract);
        const interestPaid = calculateAngsuranInterest(a, pContract);
        return `
          <tr>
            <td><b>${m?.nama || 'N/A'}</b></td>
            <td>Bulan Ke-${a.bulanKe}</td>
            <td>${a.tanggal}</td>
            <td style="text-align: right; font-weight: 600;">${formatRupiah(principalPaid)}</td>
            <td style="text-align: right; color: #b45309; font-weight: 600;">${formatRupiah(interestPaid)}</td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">${formatRupiah(a.jumlahBayar)}</td>
            <td style="text-align: right; color: #b91c1c;">${formatRupiah(remaining)}</td>
            <td>${a.keterangan || '-'}</td>
          </tr>
        `;
      }).join('');

    const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";

    printWindow.document.write(`
      <html>
        <head>
          <title>DAFTAR_ANGSURAN_KOP</title>
          <style>
            body { font-family: sans-serif; padding: 25px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>${kopName.toUpperCase()}</h2>
          <p>Laporan Riwayat Pembayaran Angsuran Pinjaman</p>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Nama Anggota</th>
                <th>Angsuran Ke-</th>
                <th>Tanggal</th>
                <th style="text-align: right;">Pokok Pinjaman</th>
                <th style="text-align: right;">Jasa Pinjaman</th>
                <th style="text-align: right;">Jumlah Bayar</th>
                <th style="text-align: right;">Sisa Tagihan</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Simulated Push Notification
  const handlePushNotice = (nama: string, sisa: number, phone: string) => {
    alert(`NOTIFIKASI SIMULASI PUSH: Tagihan Pinjaman ${nama} tersisa: ${formatRupiah(sisa)}. Pengingat terkirim via WA ke ${phone}.`);
  };

  // Dividen Manasuka calculations
  const handleCalculateManasuka = () => {
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    const reports: Omit<ManasukaBungaLog, 'id'>[] = members.map(m => {
      const mS = simpanan.filter(s => s.anggotaId === m.id);
      const totalS = mS.reduce((acc, curr) => acc + curr.jumlah, 0);
      const jasaReward = totalS * (rate / 100);

      return {
        anggotaId: m.id,
        bulanTahun: `${targetBulan}-${targetTahun}`,
        totalSimpanan: totalS,
        bungaPersen: rate,
        jumlahApresiasi: Math.round(jasaReward),
        statusNotifikasi: 'Belum Kirim',
        tanggalKalkulasi: new Date().toISOString().substring(0, 10)
      };
    });

    setCalculatedLogs(reports);
    setLogsPosted(false);
  };

  const handlePostAllInterest = () => {
    if (calculatedLogs.length === 0) return;
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    
    calculatedLogs.forEach(log => {
      if (log.jumlahApresiasi <= 0) return;
      onAddSimpanan({
        anggotaId: log.anggotaId,
        tanggal: log.tanggalKalkulasi,
        jenis: 'Sukarela',
        jumlah: log.jumlahApresiasi,
        keterangan: `Pembagian Jasa Manasuka ${rate}% (${log.bulanTahun})`
      });
      onPostManasukaBunga(log, true);
    });

    setLogsPosted(true);
    alert(`Jasa Manasuka ${rate}% Berhasil Diposting ke Akun Tabungan masing-masing anggota!`);
  };

  const triggerWhatsAppRedirect = (member: Member, total: number, reward: number) => {
    let cleanPhone = member.noHp.trim();
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const rate = setup.jasaSimpananSukarelaPersen ?? 0.5;
    const message = `Halo ${member.nama},%0A%0APerhitungan Bunga Jasa Simpanan Manasuka ${rate}% untuk periode ${targetBulan}/${targetTahun} berhasil didistribusikan ke saldo tabungan Anda.%0A- Total Simpanan: Rp ${total.toLocaleString('id-ID')}%0A- Jasa Manasuka: *Rp ${reward.toLocaleString('id-ID')}*%0A%0ATerima kasih dari ${setup.namaKoperasi}.`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // List of available months for mutasi kas (Simpanan / Angsuran)
  const availableMonths = useMemo(() => {
    const setMonths = new Set<string>();
    const dataset = activeTab === 'simpanan' ? simpanan : (activeTab === 'angsuran' ? angsuran : []);
    dataset.forEach((item: any) => {
      if (item.tanggal && item.tanggal.length >= 7) {
        setMonths.add(item.tanggal.substring(0, 7));
      }
    });
    return Array.from(setMonths).sort().reverse();
  }, [simpanan, angsuran, activeTab]);

  const filteredHistory = useMemo(() => {
    if (activeTab === 'simpanan') {
      return simpanan.filter(s => {
        const mInfo = members.find(m => m.id === s.anggotaId);
        const matchAnggota = filterAnggotaOpt === '' || s.anggotaId === filterAnggotaOpt;
        const matchJenis = filterJenisOpt === '' || s.jenis === filterJenisOpt;
        const sMonth = s.tanggal ? s.tanggal.substring(0, 7) : '';
        const matchMonth = selectedMonthFilter === 'semua' || sMonth === selectedMonthFilter;
        let matchSearch = true;
        if (tableSearchTerm.trim()) {
          const q = tableSearchTerm.toLowerCase().trim();
          const namaMatch = mInfo ? mInfo.nama.toLowerCase().includes(q) : false;
          const noAnggotaMatch = mInfo ? mInfo.noAnggota.toLowerCase().includes(q) : false;
          const ketMatch = s.keterangan ? s.keterangan.toLowerCase().includes(q) : false;
          const txMatch = s.transaksiId ? s.transaksiId.toLowerCase().includes(q) : false;
          matchSearch = namaMatch || noAnggotaMatch || ketMatch || txMatch;
        }
        return matchAnggota && matchJenis && matchMonth && matchSearch;
      }).sort((a, b) => {
        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });
    } else {
      return angsuran.filter(a => {
        const pInfo = pinjaman.find(p => p.id === a.pinjamanId);
        const mInfo = members.find(m => m.id === (a.anggotaId || pInfo?.anggotaId));
        const matchAnggota = filterAnggotaOpt === '' || a.anggotaId === filterAnggotaOpt || (pInfo && pInfo.anggotaId === filterAnggotaOpt);
        const aMonth = a.tanggal ? a.tanggal.substring(0, 7) : '';
        const matchMonth = selectedMonthFilter === 'semua' || aMonth === selectedMonthFilter;
        let matchSearch = true;
        if (tableSearchTerm.trim()) {
          const q = tableSearchTerm.toLowerCase().trim();
          const namaMatch = mInfo ? mInfo.nama.toLowerCase().includes(q) : false;
          const noAnggotaMatch = mInfo ? mInfo.noAnggota.toLowerCase().includes(q) : false;
          const ketMatch = a.keterangan ? a.keterangan.toLowerCase().includes(q) : false;
          const txMatch = a.id ? a.id.toLowerCase().includes(q) : false;
          matchSearch = namaMatch || noAnggotaMatch || ketMatch || txMatch;
        }
        return matchAnggota && matchMonth && matchSearch;
      }).sort((a, b) => {
        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });
    }
  }, [simpanan, angsuran, pinjaman, members, activeTab, filterAnggotaOpt, filterJenisOpt, selectedMonthFilter, sortOrder, tableSearchTerm]);

  const tableSummary = useMemo(() => {
    if (activeTab === 'simpanan') {
      const totalNominal = filteredHistory.reduce((sum: number, item: any) => sum + (item.jumlah || 0), 0);
      const totalMasuk = filteredHistory.filter((item: any) => (item.jumlah || 0) > 0).reduce((sum: number, item: any) => sum + item.jumlah, 0);
      const totalKeluar = filteredHistory.filter((item: any) => (item.jumlah || 0) < 0).reduce((sum: number, item: any) => sum + Math.abs(item.jumlah), 0);
      return { count: filteredHistory.length, totalNominal, totalMasuk, totalKeluar, totalPokok: 0, totalJasa: 0 };
    } else if (activeTab === 'angsuran') {
      const totalBayar = filteredHistory.reduce((sum: number, item: any) => sum + (item.jumlahBayar || 0), 0);
      const totalPokok = filteredHistory.reduce((sum: number, item: any) => {
        const pContract = pinjaman.find(p => p.id === item.pinjamanId);
        return sum + calculateAngsuranPrincipal(item, pContract);
      }, 0);
      const totalJasa = filteredHistory.reduce((sum: number, item: any) => {
        const pContract = pinjaman.find(p => p.id === item.pinjamanId);
        return sum + calculateAngsuranInterest(item, pContract);
      }, 0);
      return { count: filteredHistory.length, totalBayar, totalNominal: totalBayar, totalMasuk: totalBayar, totalKeluar: 0, totalPokok, totalJasa };
    }
    return { count: filteredHistory.length, totalNominal: 0, totalMasuk: 0, totalKeluar: 0, totalPokok: 0, totalJasa: 0 };
  }, [filteredHistory, activeTab, pinjaman]);

  // Grouped by month summary & data
  const historyGroupedByMonth = useMemo(() => {
    const monthMap = new Map<string, any[]>();
    filteredHistory.forEach(item => {
      const ym = item.tanggal && item.tanggal.length >= 7 ? item.tanggal.substring(0, 7) : 'Lainnya';
      if (!monthMap.has(ym)) {
        monthMap.set(ym, []);
      }
      monthMap.get(ym)!.push(item);
    });

    const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => {
      return sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
    });

    return sortedMonthKeys.map(ym => {
      const items = monthMap.get(ym)!;
      let totalNominal = 0;
      let totalMasuk = 0;
      let totalKeluar = 0;
      let totalBayar = 0;
      let totalPokok = 0;
      let totalJasa = 0;

      if (activeTab === 'simpanan') {
        totalNominal = items.reduce((sum: number, it: any) => sum + (it.jumlah || 0), 0);
        totalMasuk = items.filter((it: any) => (it.jumlah || 0) > 0).reduce((sum: number, it: any) => sum + it.jumlah, 0);
        totalKeluar = items.filter((it: any) => (it.jumlah || 0) < 0).reduce((sum: number, it: any) => sum + Math.abs(it.jumlah), 0);
      } else if (activeTab === 'angsuran') {
        totalBayar = items.reduce((sum: number, it: any) => sum + (it.jumlahBayar || 0), 0);
        totalPokok = items.reduce((sum: number, it: any) => {
          const pContract = pinjaman.find(p => p.id === it.pinjamanId);
          return sum + calculateAngsuranPrincipal(it, pContract);
        }, 0);
        totalJasa = items.reduce((sum: number, it: any) => {
          const pContract = pinjaman.find(p => p.id === it.pinjamanId);
          return sum + calculateAngsuranInterest(it, pContract);
        }, 0);
      }

      return {
        monthKey: ym,
        monthLabel: ym === 'Lainnya' ? 'Lainnya' : formatYearMonthIndo(ym),
        items,
        count: items.length,
        totalNominal,
        totalMasuk,
        totalKeluar,
        totalBayar,
        totalPokok,
        totalJasa
      };
    });
  }, [filteredHistory, activeTab, pinjaman, sortOrder]);

  const renderTableHeader = () => (
    <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700 z-10">
      {isTableFullScreen ? (
        activeTab === 'simpanan' ? (
          <tr>
            <th className="px-3 py-3 w-12 text-center">No</th>
            <th className="px-4 py-3">Tanggal & Resi</th>
            <th className="px-4 py-3">Anggota</th>
            <th className="px-4 py-3">Jenis Setoran</th>
            <th className="px-4 py-3">Keterangan</th>
            <th className="px-4 py-3 text-right">Nominal</th>
            <th className="px-4 py-3 text-center w-40">Aksi</th>
          </tr>
        ) : (
          <tr>
            <th className="px-3 py-3 w-12 text-center">No</th>
            <th className="px-4 py-3">Tanggal & ID</th>
            <th className="px-4 py-3">Anggota</th>
            <th className="px-4 py-3">Kontrak Pinjaman</th>
            <th className="px-4 py-3 text-center">Angsuran Ke-</th>
            <th className="px-4 py-3">Keterangan</th>
            <th className="px-4 py-3 text-right">Pokok Pinjaman</th>
            <th className="px-4 py-3 text-right">Jasa Pinjaman</th>
            <th className="px-4 py-3 text-right">Jumlah Bayar</th>
            <th className="px-4 py-3 text-right">Sisa Tagihan</th>
            <th className="px-4 py-3 text-center w-36">Aksi</th>
          </tr>
        )
      ) : (
        activeTab === 'simpanan' ? (
          <tr>
            <th className="px-4 py-2">Anggota</th>
            <th className="px-4 py-2">Jenis Setoran</th>
            <th className="px-4 py-2">Jumlah</th>
            <th className="px-4 py-2 text-center">Aksi</th>
          </tr>
        ) : (
          <tr>
            <th className="px-4 py-2">Anggota / Kontrak</th>
            <th className="px-4 py-2">Angsuran Ke-</th>
            <th className="px-4 py-2 text-right">Pokok / Jasa</th>
            <th className="px-4 py-2 text-right">Jumlah Bayar</th>
            <th className="px-4 py-2 text-center">Aksi</th>
          </tr>
        )
      )}
    </thead>
  );

  const renderTransactionRow = (item: any, index: number) => {
    const m = members.find(mem => mem.id === item.anggotaId);
    
    if (activeTab === 'simpanan') {
      if (isTableFullScreen) {
        return (
          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
            <td className="px-3 py-3 text-center text-slate-400 font-sans text-[11px]">
              {index + 1}
            </td>
            <td className="px-4 py-3">
              <p className="font-bold text-slate-800 dark:text-slate-200 font-sans">{item.tanggal}</p>
              <span className="text-[10px] text-slate-400 font-mono">{item.transaksiId || item.id}</span>
            </td>
            <td className="px-4 py-3">
              <p className="font-sans font-bold text-slate-850 dark:text-slate-100">{m?.nama || 'N/A'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9.5px] font-mono">
                  {m?.noAnggota || item.anggotaId}
                </span>
                {m?.noHp && <span className="text-[9.5px] text-slate-400 font-sans">• {m.noHp}</span>}
              </div>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                item.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' :
                item.jenis === 'Wajib' ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-450 border border-amber-200 dark:border-amber-800' :
                'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
              }`}>
                {item.jenis}
              </span>
            </td>
            <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-350 max-w-[240px] truncate">
              {item.keterangan || <span className="text-slate-350 italic">-</span>}
            </td>
            <td className={`px-4 py-3 text-right font-bold text-sm ${item.jumlah < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {item.jumlah < 0 ? `-${formatRupiah(Math.abs(item.jumlah))}` : formatRupiah(item.jumlah)}
            </td>
            <td className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button 
                  onClick={() => {
                    const hasTxId = Boolean(item.transaksiId && item.transaksiId.trim() !== '');
                    const fullItems = hasTxId
                      ? simpanan.filter(s => s.transaksiId === item.transaksiId && s.anggotaId === item.anggotaId)
                      : [item];
                    setReceiptData({
                      member: m || { id: item.anggotaId, nama: 'Unknown', noAnggota: 'N/A', alamat: '', noHp: '', tanggalBergabung: '' },
                      items: (fullItems.length > 0 ? fullItems : [item]).map(s => ({
                        jenis: s.jenis as any,
                        jumlah: s.jumlah,
                        keterangan: s.keterangan || ''
                      })),
                      txId: item.transaksiId || `TX-${item.id.replace('s-', '')}`,
                      tanggal: item.tanggal
                    });
                  }}
                  className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                  title="Cetak Kuitansi"
                >
                  <Printer className="w-3 h-3" /> Struk
                </button>
                {onEditSimpanan && (
                  <button 
                    onClick={() => startEditSimpanan(item)}
                    className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                    title="Edit Catatan Simpanan"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                {onDeleteSimpanan && (
                  <button 
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        itemType: 'Catatan Simpanan',
                        itemName: `Simpanan ${item.jenis} - ${formatRupiah(item.jumlah)}`,
                        itemDetails: [
                          { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
                          { label: 'Tanggal Transaksi', value: item.tanggal },
                          { label: 'Jenis Simpanan', value: item.jenis },
                          { label: 'Nominal', value: formatRupiah(item.jumlah), isHighlight: true },
                          { label: 'Keterangan', value: item.keterangan || '-' }
                        ],
                        warningMessage: 'Menghapus catatan simpanan ini akan secara otomatis memperbarui saldo buku kas serta laporan neraca keuangan koperasi.',
                        onConfirm: () => {
                          onDeleteSimpanan(item.id);
                        }
                      });
                    }}
                    className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-rose-200 dark:border-rose-800"
                    title="Hapus Catatan Simpanan"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      }

      // Compact mode Simpanan
      return (
        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
          <td className="px-4 py-2.5">
            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{m?.nama || 'N/A'}</p>
            <span className="text-[9px] text-slate-400 font-sans">{item.tanggal}</span>
          </td>
          <td className="px-4 py-2.5">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
              item.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
              item.jenis === 'Wajib' ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-450' :
              'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
            }`}>
              {item.jenis}
            </span>
          </td>
          <td className={`px-4 py-2.5 font-bold font-mono ${item.jumlah < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-850 dark:text-slate-100'}`}>
            {item.jumlah < 0 ? `-${formatRupiah(Math.abs(item.jumlah))}` : formatRupiah(item.jumlah)}
          </td>
          <td className="px-4 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <button 
                onClick={() => {
                  const hasTxId = Boolean(item.transaksiId && item.transaksiId.trim() !== '');
                  const fullItems = hasTxId
                    ? simpanan.filter(s => s.transaksiId === item.transaksiId && s.anggotaId === item.anggotaId)
                    : [item];
                  setReceiptData({
                    member: m || { id: item.anggotaId, nama: 'Unknown', noAnggota: 'N/A', alamat: '', noHp: '', tanggalBergabung: '' },
                    items: (fullItems.length > 0 ? fullItems : [item]).map(s => ({
                      jenis: s.jenis as any,
                      jumlah: s.jumlah,
                      keterangan: s.keterangan || ''
                    })),
                    txId: item.transaksiId || `TX-${item.id.replace('s-', '')}`,
                    tanggal: item.tanggal
                  });
                }}
                className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                title="Cetak Kuitansi"
              >
                <Printer className="w-2.5 h-2.5" /> Struk
              </button>
              {onEditSimpanan && (
                <button 
                  onClick={() => startEditSimpanan(item)}
                  className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                  title="Edit Catatan Simpanan"
                >
                  <Pencil className="w-2.5 h-2.5" /> Edit
                </button>
              )}
              {onDeleteSimpanan && (
                <button 
                  onClick={() => {
                    setDeleteModalState({
                      isOpen: true,
                      itemType: 'Catatan Simpanan',
                      itemName: `Simpanan ${item.jenis} - ${formatRupiah(item.jumlah)}`,
                      itemDetails: [
                        { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
                        { label: 'Tanggal Transaksi', value: item.tanggal },
                        { label: 'Jenis Simpanan', value: item.jenis },
                        { label: 'Nominal', value: formatRupiah(item.jumlah), isHighlight: true },
                        { label: 'Keterangan', value: item.keterangan || '-' }
                      ],
                      warningMessage: 'Menghapus catatan simpanan ini akan secara otomatis memperbarui saldo buku kas serta laporan neraca keuangan koperasi.',
                      onConfirm: () => {
                        onDeleteSimpanan(item.id);
                      }
                    });
                  }}
                  className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                  title="Hapus Catatan Simpanan"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Hapus
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    } else {
      // Angsuran display
      const pContract = pinjaman.find(p => p.id === item.pinjamanId);
      const remaining = pContract ? calculateHistoricalLoanOutstanding(pContract, item, angsuran) : 0;
      const principalPaid = calculateAngsuranPrincipal(item, pContract);
      const interestPaid = calculateAngsuranInterest(item, pContract);
      
      if (isTableFullScreen) {
        return (
          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
            <td className="px-3 py-3 text-center text-slate-400 font-sans text-[11px]">
              {index + 1}
            </td>
            <td className="px-4 py-3">
              <p className="font-bold text-slate-800 dark:text-slate-200 font-sans">{item.tanggal}</p>
              <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
            </td>
            <td className="px-4 py-3">
              <p className="font-sans font-bold text-slate-850 dark:text-slate-100">{m?.nama || 'N/A'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9.5px] font-mono">
                  {m?.noAnggota || item.anggotaId}
                </span>
                {m?.noHp && <span className="text-[9.5px] text-slate-400 font-sans">• {m.noHp}</span>}
              </div>
            </td>
            <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">CTR-{item.pinjamanId?.substring(0,8).toUpperCase()}</span>
                  {onNavigateToPinjaman && (
                    <button
                      type="button"
                      onClick={() => onNavigateToPinjaman(item.pinjamanId, item.anggotaId, m?.nama)}
                      className="text-[10px] font-sans font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Buka & Cek Akad Kredit Pinjaman Anggota"
                    >
                      <HandCoins className="w-3 h-3 text-indigo-500" />
                      <span>Cek Akad Kredit Pinjaman</span>
                      <ArrowUpRight className="w-2.5 h-2.5 text-indigo-400" />
                    </button>
                  )}
                </div>
                {pContract && (
                  <span className="text-[10.5px] text-slate-400 font-sans">
                    Plafon: {formatRupiah(pContract.nominalPinjaman)} ({pContract.tenor} Bln)
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                Ke-{item.bulanKe}
              </span>
            </td>
            <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-350 max-w-[200px] truncate">
              {item.keterangan || <span className="text-slate-350 italic">-</span>}
            </td>
            <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-200 font-bold">
              {formatRupiah(principalPaid)}
            </td>
            <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400 font-bold">
              {formatRupiah(interestPaid)}
            </td>
            <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {formatRupiah(item.jumlahBayar)}
            </td>
            <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
              {formatRupiah(remaining)}
            </td>
            <td className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button 
                  onClick={() => setPreviewReceipt(item)}
                  className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                  title="Cetak Kuitansi Angsuran"
                >
                  <Printer className="w-3 h-3" /> Struk
                </button>
                {onEditAngsuran && (
                  <button 
                    onClick={() => startEditAngsuran(item)}
                    className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                    title="Edit Catatan Angsuran"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                {onDeleteAngsuran && (
                  <button 
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        itemType: 'Catatan Angsuran',
                        itemName: `Angsuran Ke-${item.bulanKe} - ${formatRupiah(item.jumlahBayar)}`,
                        itemDetails: [
                          { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
                          { label: 'Tanggal Bayar', value: item.tanggal },
                          { label: 'Angsuran Bulan Ke', value: String(item.bulanKe) },
                          { label: 'Jumlah Dibayar', value: formatRupiah(item.jumlahBayar), isHighlight: true },
                          { label: 'Pokok / Jasa', value: `Pokok: ${formatRupiah(principalPaid)} | Jasa: ${formatRupiah(interestPaid)}` },
                          { label: 'Keterangan', value: item.keterangan || '-' }
                        ],
                        warningMessage: 'Menghapus catatan angsuran ini akan mengembalikan sisa pokok pinjaman dan memperbarui saldo kas koperasi secara otomatis.',
                        onConfirm: () => {
                          onDeleteAngsuran(item.id);
                        }
                      });
                    }}
                    className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-350 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1 border border-rose-200 dark:border-rose-800"
                    title="Hapus Catatan Angsuran"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      }

      // Compact mode Angsuran
      return (
        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
          <td className="px-4 py-2.5">
            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{m?.nama || 'N/A'}</p>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-sans flex-wrap">
              <span>{item.tanggal}</span>
              <span>• CTR-{item.pinjamanId?.substring(0,6).toUpperCase()}</span>
              {onNavigateToPinjaman && (
                <button
                  type="button"
                  onClick={() => onNavigateToPinjaman(item.pinjamanId, item.anggotaId, m?.nama)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-0.5 ml-0.5"
                  title="Cek Akad Kredit Pinjaman"
                >
                  <HandCoins className="w-2.5 h-2.5" /> Akad
                </button>
              )}
            </div>
          </td>
          <td className="px-4 py-2.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
              Ke-{item.bulanKe}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-[10px]">
            <p className="text-slate-700 dark:text-slate-300 font-bold">{formatRupiah(principalPaid)}</p>
            <p className="text-amber-600 dark:text-amber-400 text-[9px]">Jasa: {formatRupiah(interestPaid)}</p>
          </td>
          <td className="px-4 py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            {formatRupiah(item.jumlahBayar)}
          </td>
          <td className="px-4 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <button 
                onClick={() => m && handlePushNotice(m.nama, remaining, m.noHp)}
                className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                title="Kirim Simulated WhatsApp"
              >
                🔔 Push
              </button>
              <button 
                onClick={() => setPreviewReceipt(item)}
                className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-1"
              >
                <Printer className="w-2.5 h-2.5" /> Cetak
              </button>
              {onEditAngsuran && (
                <button 
                  onClick={() => startEditAngsuran(item)}
                  className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                  title="Edit Catatan Angsuran"
                >
                  <Pencil className="w-2.5 h-2.5" /> Edit
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
                        { label: 'Pokok / Jasa', value: `Pokok: ${formatRupiah(principalPaid)} | Jasa: ${formatRupiah(interestPaid)}` },
                        { label: 'Keterangan', value: item.keterangan || '-' }
                      ],
                      warningMessage: 'Menghapus catatan angsuran ini akan mengembalikan sisa pokok pinjaman dan memperbarui saldo kas koperasi secara otomatis.',
                      onConfirm: () => {
                        onDeleteAngsuran(item.id);
                      }
                    });
                  }}
                  className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                  title="Hapus Catatan Angsuran"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Hapus
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Notifikasi Setoran Mandiri Anggota Menunggu Validasi */}
      {pembayaranPending && pembayaranPending.filter(p => p.status === 'Pending').length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-purple-500/10 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                <span>Ada {pembayaranPending.filter(p => p.status === 'Pending').length} Setoran Mandiri Anggota Menunggu Validasi!</span>
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  PERLU TINDAKAN
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-0.5">
                Anggota telah mengirimkan konfirmasi setoran simpanan/angsuran. Klik tombol di samping untuk memeriksa resi/bukti dan membukukan transaksi secara resmi ke kas koperasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pembayaran_pending');
              setPendingStatusFilter('Pending');
              setFilterAnggotaOpt('');
              setFilterJenisOpt('');
              setTableSearchTerm('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              activeTab === 'pembayaran_pending'
                ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{activeTab === 'pembayaran_pending' ? 'Sedang Ditampilkan di Bawah' : 'Tinjau & Validasi Sekarang'}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Combined Form (hidden in full screen mode) */}
        {!isTableFullScreen && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm self-start">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><HandCoins className="w-5 h-5"/></span>
                Manajemen Kas
              </h3>
              <button 
                onClick={() => { setIsManasukaModalOpen(true); handleCalculateManasuka(); }}
                className="text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0"/> Dividen Manasuka {setup.jasaSimpananSukarelaPersen}%
              </button>
            </div>

            {/* Form Mode Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-4 text-[11px] font-bold gap-1 font-sans">
              <button
                type="button"
                onClick={() => setFormMode('kas_masuk')}
                className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${formMode === 'kas_masuk' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-150/55 dark:border-slate-700/60' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Setoran Anggota
              </button>
              <button
                type="button"
                onClick={() => setFormMode('pendapatan')}
                className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${formMode === 'pendapatan' ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-150/55 dark:border-slate-700/60' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Pendapatan Kas
              </button>
            </div>

          {formMode === 'pendapatan' ? (
            <form onSubmit={handleIncomeSubmit} className="space-y-4 text-sm">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-xl text-teal-800 dark:text-teal-300 text-xs font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <span>Pencatatan pendapatan operasional, laba unit usaha warung, jasa pinjaman, atau provisi ke dalam Kas Masuk koperasi.</span>
              </div>

              {/* Tanggal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL PENERIMAAN</label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-teal-600 font-semibold"
                  value={incTanggal}
                  onChange={(e) => setIncTanggal(e.target.value)}
                  required
                />
              </div>

              {/* Sumber Pendapatan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">SUMBER PENDAPATAN</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-teal-600 font-semibold cursor-pointer"
                  value={incSumber}
                  onChange={(e) => setIncSumber(e.target.value)}
                  required
                >
                  <option value="warung">🏪 Laba Toko / Warung Koperasi</option>
                  <option value="jasa">📈 Pendapatan Jasa Pinjaman / Bunga</option>
                  <option value="provisi">📄 Pendapatan Biaya Provisi & Administrasi</option>
                  <option value="bunga_bank">🏦 Pendapatan Bunga Rekening Bank</option>
                  <option value="denda">⚠️ Uang Denda Keterlambatan</option>
                  <option value="lain_lain">📦 Pendapatan Operasional Lainnya</option>
                </select>
              </div>

              {/* Nominal */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NOMINAL PENDAPATAN (RP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-teal-600"
                    value={incNominal}
                    onChange={(e) => setIncNominal(formatInputRupiah(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">KETERANGAN / CATATAN TRANSAKSI</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerimaan laba kas warung minggu ini..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-teal-600"
                  value={incKeterangan}
                  onChange={(e) => setIncKeterangan(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer shadow-sm active:scale-95 duration-100 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Simpan Pendapatan ke Kas Masuk
              </button>
            </form>
          ) : (
            <form onSubmit={handleUnifiedSubmit} className="space-y-4 text-sm">
              {/* 1. Member Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PILIH ANGGOTA KOPERASI</label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ketik untuk filter listbox ID / Nama Anggota..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                      value={formMemberSearch}
                      onChange={(e) => setFormMemberSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-600 font-semibold"
                    value={anggotaId}
                    onChange={(e) => setAnggotaId(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Anggota ({formFilteredMembers.length}) --</option>
                    {formFilteredMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.nama} ({m.noAnggota})</option>
                    ))}
                  </select>
                </div>
              </div>

            {/* 2. Transaction Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL TRANSAKSI</label>
              <input 
                type="date"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-semibold"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            {/* 3. SIMPANAN (Savings Block) */}
            <div className="space-y-3 p-4 bg-emerald-50/25 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2 border-b border-emerald-100/50 dark:border-emerald-900/50 pb-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 tracking-wider block uppercase">Setoran Simpanan Anggota</span>
              </div>
              
              <div className="space-y-2">
                {/* Pokok */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Pokok</span>
                    {hasPokokPaid ? (
                      <span className="text-[9px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded">Sudah Pernah Bayar (0)</span>
                    ) : (
                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 rounded">Sekali Saja (50.000)</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      className={`w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono ${
                        hasPokokPaid ? 'opacity-55 bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-400' : ''
                      }`}
                      value={jumlahPokok}
                      onChange={(e) => setJumlahPokok(formatInputRupiah(e.target.value))}
                      disabled={hasPokokPaid}
                    />
                  </div>
                </div>

                {/* Wajib */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Wajib</span>
                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 rounded">Rutin Bulanan (50.000)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                      value={jumlahWajib}
                      onChange={(e) => setJumlahWajib(formatInputRupiah(e.target.value))}
                    />
                  </div>
                </div>

                {/* Sukarela */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Simpanan Sukarela</span>
                    <span className="text-[9px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950/40 px-1.5 rounded">Bebas / Fleksibel</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      placeholder="Masukkan Simpanan Sukarela..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                      value={jumlahSukarela}
                      onChange={(e) => setJumlahSukarela(formatInputRupiah(e.target.value))}
                    />
                  </div>
                </div>

                {/* Notes Simpanan */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Catatan Penerimaan Simpanan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Titipan setoran bulan Juni"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    value={keteranganSimpanan}
                    onChange={(e) => setKeteranganSimpanan(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 4. ANGSURAN (Installment Block - Shown ONLY when the member has an active loan) */}
            {anggotaId ? (
              activeLoanContract ? (
                <div className="space-y-3 p-4 bg-indigo-50/25 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between border-b border-indigo-100/50 dark:border-indigo-900/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 tracking-wider block uppercase">Pembayaran Angsuran</span>
                    </div>
                    {/* Toggle Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={includeInstallment}
                        onChange={(e) => setIncludeInstallment(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">Aktif</span>
                    </label>
                  </div>

                  {includeInstallment ? (
                    <div className="space-y-3">
                      {/* Tipe Pembayaran Angsuran */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tipe Bayar Angsuran</label>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                          <button
                            type="button"
                            onClick={() => {
                              setPayOption('rutin');
                              setCustomAmount('');
                              setNotes('');
                            }}
                            className={`py-1.5 px-1.5 text-[10px] font-bold rounded-md transition cursor-pointer text-center ${
                              payOption === 'rutin'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            1 Bulan Rutin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPayOption('dua_bulan');
                            }}
                            className={`py-1.5 px-1.5 text-[10px] font-bold rounded-md transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                              payOption === 'dua_bulan'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100'
                            }`}
                          >
                            <span>⚡ 2 Bulan Sekaligus</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPayOption('lunas');
                              setCustomAmount(formatInputRupiah(String(activeLoanContract.nominalBayarLunas)));
                              setNotes(`Pelunasan Lunas Pinjaman (Sisa Pokok + Jasa Bulan Berjalan)`);
                            }}
                            className={`py-1.5 px-1.5 text-[10px] font-bold rounded-md transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                              payOption === 'lunas'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                            }`}
                          >
                            <span>Bayar Lunas</span>
                          </button>
                        </div>
                      </div>

                      {/* Active contract summary */}
                      <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-indigo-50 dark:border-indigo-905 text-[10px] font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Total Pinjaman:</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400">{formatRupiah(activeLoanContract.contract.nominalPinjaman)} ({activeLoanContract.contract.tenor} Bulan)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Angsuran Pokok Rutin:</span>
                          <span className="font-bold text-indigo-600">{formatRupiah(activeLoanContract.contract.angsuranPokokPerBulan || Math.round(activeLoanContract.contract.nominalPinjaman / activeLoanContract.contract.tenor))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Terbayar:</span>
                          <span className="font-bold text-emerald-600">{formatRupiah(activeLoanContract.totalTerbayar)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                          <span>Sisa Pinjaman Pokok:</span>
                          <span className="font-bold text-rose-600">{formatRupiah(activeLoanContract.sisaPokok)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jasa Pinjaman Standar (1.5%):</span>
                          <span className="font-bold text-amber-600">{formatRupiah(Math.round(activeLoanContract.contract.nominalPinjaman * 0.015))}</span>
                        </div>
                        {payOption === 'lunas' && (
                          <div className="flex justify-between pt-1.5 border-t border-dashed font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded">
                            <span>Estimasi Total Pelunasan:</span>
                            <span className="text-xs font-black">{formatRupiah(activeLoanContract.sisaPokok + Math.round(activeLoanContract.contract.nominalPinjaman * 0.015))}</span>
                          </div>
                        )}
                        {payOption === 'dua_bulan' && (
                          <div className="flex justify-between pt-1.5 border-t border-dashed font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded">
                            <span>Estimasi Total 2x Angsuran:</span>
                            <span className="text-xs font-black">
                              {formatRupiah(
                                ((activeLoanContract.contract.angsuranPokokPerBulan || Math.round(activeLoanContract.contract.nominalPinjaman / activeLoanContract.contract.tenor)) +
                                Math.round(activeLoanContract.contract.nominalPinjaman * 0.015)) * 2
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2 Bulan Sekaligus Breakdown Preview Card */}
                      {payOption === 'dua_bulan' && (
                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Skema Pembayaran 2 Kali Angsuran Sekaligus
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono text-[10px] font-bold">
                              2 Record Terpisah
                            </span>
                          </div>
                          <p className="text-[10.5px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                            Mencatat pelunasan tunggakan bulan kemarin sekaligus setoran bulan berjalan. Sistem akan otomatis membuat <b>dua baris angsuran terpisah</b>:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                              <div className="font-extrabold text-amber-700 dark:text-amber-400 mb-1 border-b border-amber-100 dark:border-amber-950 pb-1">
                                1. Bulan Ke-{bulanKe} (Tunggakan)
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                                <div className="flex justify-between">
                                  <span>Pokok:</span>
                                  <span className="font-bold">{formatRupiah(Math.round(parseInputRupiah(angsuranPokok) / 2))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Jasa:</span>
                                  <span className="font-bold">{formatRupiah(Math.round(parseInputRupiah(angsuranJasa) / 2))}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-800 pt-0.5 text-slate-800 dark:text-slate-100">
                                  <span>Subtotal:</span>
                                  <span className="text-amber-700 dark:text-amber-300">{formatRupiah(Math.round((parseInputRupiah(angsuranPokok) + parseInputRupiah(angsuranJasa)) / 2))}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                              <div className="font-extrabold text-indigo-700 dark:text-indigo-400 mb-1 border-b border-indigo-100 dark:border-indigo-950 pb-1">
                                2. Bulan Ke-{bulanKe + 1} (Berjalan)
                              </div>
                              <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                                <div className="flex justify-between">
                                  <span>Pokok:</span>
                                  <span className="font-bold">{formatRupiah(parseInputRupiah(angsuranPokok) - Math.round(parseInputRupiah(angsuranPokok) / 2))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Jasa:</span>
                                  <span className="font-bold">{formatRupiah(parseInputRupiah(angsuranJasa) - Math.round(parseInputRupiah(angsuranJasa) / 2))}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-800 pt-0.5 text-slate-800 dark:text-slate-100">
                                  <span>Subtotal:</span>
                                  <span className="text-indigo-700 dark:text-indigo-300">{formatRupiah((parseInputRupiah(angsuranPokok) + parseInputRupiah(angsuranJasa)) - Math.round((parseInputRupiah(angsuranPokok) + parseInputRupiah(angsuranJasa)) / 2))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 1. INPUT MANUAL POKOK PINJAMAN */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Pokok Angsuran (Rp)</span>
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">Manual</span>
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setAngsuranPokok(formatInputRupiah(String(activeLoanContract.contract.angsuranPokokPerBulan || Math.round(activeLoanContract.contract.nominalPinjaman / activeLoanContract.contract.tenor))))}
                              className="text-[9px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline font-medium cursor-pointer"
                            >
                              Pokok Rutin
                            </button>
                            <span className="text-slate-300 text-[9px]">•</span>
                            <button
                              type="button"
                              onClick={() => setAngsuranPokok(formatInputRupiah(String(activeLoanContract.sisaPokok)))}
                              className="text-[9px] text-rose-600 hover:text-rose-800 dark:text-rose-400 underline font-medium cursor-pointer"
                            >
                              Sisa Pokok ({formatRupiah(activeLoanContract.sisaPokok)})
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                          <input 
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg font-mono font-bold text-slate-850 dark:text-slate-200 border-indigo-200 dark:border-indigo-800 focus:outline-indigo-600"
                            value={angsuranPokok}
                            onChange={(e) => setAngsuranPokok(formatInputRupiah(e.target.value))}
                            required
                          />
                        </div>
                      </div>

                      {/* 2. INPUT MANUAL JASA PINJAMAN (Default 1.5% dari Total Pinjaman) */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span>Jasa Pinjaman (Rp)</span>
                            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">Default 1.5% Total Pinjaman</span>
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setAngsuranJasa(formatInputRupiah(String(Math.round(activeLoanContract.contract.nominalPinjaman * 0.015))))}
                              className="text-[9px] text-amber-600 hover:text-amber-800 dark:text-amber-400 underline font-medium cursor-pointer"
                            >
                              Reset 1.5% ({formatRupiah(Math.round(activeLoanContract.contract.nominalPinjaman * 0.015))})
                            </button>
                            <span className="text-slate-300 text-[9px]">•</span>
                            <button
                              type="button"
                              onClick={() => setAngsuranJasa('0')}
                              className="text-[9px] text-slate-500 hover:text-slate-700 dark:text-slate-400 underline font-medium cursor-pointer"
                            >
                              Rp 0
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                          <input 
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg font-mono font-bold text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 focus:outline-amber-600"
                            value={angsuranJasa}
                            onChange={(e) => setAngsuranJasa(formatInputRupiah(e.target.value))}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 italic">
                          * Jasa pinjaman standar: {formatRupiah(activeLoanContract.jasaBulanBerjalan)}
                        </p>
                      </div>

                      {/* 3. TOTAL BAYAR ANGSURAN (POKOK + JASA) & INFO SISA PINJAMAN */}
                      <div className="p-3 bg-gradient-to-br from-indigo-50/90 to-amber-50/60 dark:from-indigo-950/40 dark:to-amber-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-950 dark:text-indigo-200 block uppercase">Total Bayar Angsuran</span>
                            <span className="text-[9.5px] text-slate-600 dark:text-slate-400 font-mono">
                              Pokok {formatRupiah(parseInputRupiah(angsuranPokok))} + Jasa {formatRupiah(parseInputRupiah(angsuranJasa))}
                            </span>
                          </div>
                          <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">
                            {formatRupiah(parseInputRupiah(angsuranPokok) + parseInputRupiah(angsuranJasa))}
                          </span>
                        </div>

                        {/* Sisa Pinjaman Setelah Pembayaran Bulan Ini */}
                        <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Sisa Pinjaman Pokok Setelah Bayar:</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatRupiah(Math.max(0, activeLoanContract.sisaPokok - parseInputRupiah(angsuranPokok)))}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                          💡 <b>Aturan Koperasi:</b> Jasa pinjaman didahulukan ({formatRupiah(parseInputRupiah(angsuranJasa))}), sisa pembayaran ({formatRupiah(parseInputRupiah(angsuranPokok))}) memotong sisa pokok pinjaman terakhir.
                        </p>
                      </div>

                      {/* Real-time Mismatch Alert Banner & Smart 2-Month Detection */}
                      {(() => {
                        const nomPinjaman = activeLoanContract.contract.nominalPinjaman || 0;
                        const isDuaBulan = payOption === 'dua_bulan';
                        const multiplier = isDuaBulan ? 2 : 1;
                        const defPokok = payOption === 'lunas'
                          ? activeLoanContract.sisaPokok
                          : Math.min(
                              activeLoanContract.sisaPokok,
                              (activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1))) * multiplier
                            );
                        const defJasa = (activeLoanContract.jasaBulanBerjalan > 0
                          ? activeLoanContract.jasaBulanBerjalan
                          : Math.round(nomPinjaman * (activeLoanContract.contract.bungaFlatPersen ? activeLoanContract.contract.bungaFlatPersen / 100 : 0.015))) * multiplier;
                        const defTotal = defPokok + defJasa;
                        const currPokok = parseInputRupiah(angsuranPokok);
                        const currJasa = parseInputRupiah(angsuranJasa);
                        const currTotal = currPokok + currJasa;

                        // Smart detection for 2 months when in 'rutin' mode
                        const singlePokok = activeLoanContract.contract.angsuranPokokPerBulan || Math.round(nomPinjaman / (activeLoanContract.contract.tenor || 1));
                        const singleJasa = activeLoanContract.jasaBulanBerjalan > 0 ? activeLoanContract.jasaBulanBerjalan : Math.round(nomPinjaman * 0.015);
                        const singleTotal = singlePokok + singleJasa;
                        const isTwoMonthsAmount = payOption === 'rutin' && singleTotal > 0 && currTotal >= singleTotal * 1.75 && currTotal <= singleTotal * 2.25;

                        const hasMismatch = (currPokok > 0 || currJasa > 0) && (currPokok !== defPokok || currJasa !== defJasa);

                        return (
                          <div className="space-y-2">
                            {isTwoMonthsAmount && (
                              <div className="p-3 bg-emerald-50/95 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                                  <Info className="w-4 h-4 shrink-0 text-emerald-600" />
                                  <span className="text-[11px] leading-snug">
                                    Terdeteksi nominal <b>2 kali angsuran</b> ({formatRupiah(currTotal)}). Ingin mencatatnya sebagai 2 baris angsuran terpisah (Bulan ke-{bulanKe} & ke-{bulanKe + 1})?
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPayOption('dua_bulan')}
                                  className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer shrink-0 transition"
                                >
                                  ⚡ Catat 2 Kali Angsuran
                                </button>
                              </div>
                            )}

                            {hasMismatch && !isTwoMonthsAmount && (
                              <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2 text-xs shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Peringatan: Nominal Tidak Sesuai Tagihan Standar Akad {isDuaBulan ? '(2 Bulan)' : ''}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAngsuranPokok(formatInputRupiah(String(defPokok)));
                                      setAngsuranJasa(formatInputRupiah(String(defJasa)));
                                    }}
                                    className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/90 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 px-2 py-0.5 rounded-lg transition cursor-pointer shrink-0 shadow-2xs"
                                  >
                                    Sesuaikan ke Standar
                                  </button>
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                                  Jumlah yang diinput berbeda dari jadwal akad kredit {isDuaBulan ? 'untuk 2 bulan angsuran' : ''}. Sistem akan meminta konfirmasi peringatan sebelum menyimpan transaksi.
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono bg-white/80 dark:bg-slate-900/70 p-2 rounded-lg border border-amber-200/80 dark:border-amber-900/40">
                                  <div>
                                    <span className="text-slate-400 block text-[9px] font-sans">Pokok Seharusnya</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatRupiah(defPokok)}</span>
                                    <span className={`block text-[9px] ${currPokok < defPokok ? 'text-rose-600 font-bold' : currPokok > defPokok ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                      {currPokok < defPokok ? `(-${formatRupiah(defPokok - currPokok)})` : currPokok > defPokok ? `(+${formatRupiah(currPokok - defPokok)})` : 'Sesuai'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px] font-sans">Jasa Seharusnya</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatRupiah(defJasa)}</span>
                                    <span className={`block text-[9px] ${currJasa < defJasa ? 'text-rose-600 font-bold' : currJasa > defJasa ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                      {currJasa < defJasa ? `(-${formatRupiah(defJasa - currJasa)})` : currJasa > defJasa ? `(+${formatRupiah(currJasa - defJasa)})` : 'Sesuai'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px] font-sans">Total Standar</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400">{formatRupiah(defTotal)}</span>
                                    <span className={`block text-[9px] ${currTotal < defTotal ? 'text-rose-600 font-bold' : currTotal > defTotal ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                      {currTotal < defTotal ? `(Kurang ${formatRupiah(defTotal - currTotal)})` : currTotal > defTotal ? `(Lebih ${formatRupiah(currTotal - defTotal)})` : 'Sesuai'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Angsuran Ke & Notes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Angsuran Ke-</label>
                          <input 
                            type="number"
                            min={1}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            value={bulanKe}
                            onChange={(e) => setBulanKe(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Catatan Pembayaran</label>
                          <input 
                            type="text"
                            placeholder="Misal: Angsuran bulanan / Pelunasan"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1 text-center font-medium">Pembayaran angsuran diabaikan untuk transaksi ini</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-xs font-medium">
                  <Info className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Anggota tidak memiliki kontrak pinjaman aktif (Form angsuran disembunyikan).</span>
                </div>
              )
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                Pilih anggota untuk memuat rincian transaksi & pinjaman aktif.
              </div>
            )}

            {/* Submit */}
            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer shadow-sm active:scale-95 duration-100"
            >
              Bukukan Transaksi Kas Masuk
            </button>
          </form>
          )}
        </div>
        )}

        {/* RIGHT COLUMN: Audit Trails & History */}
        <div className={`${isTableFullScreen ? 'col-span-12 w-full min-h-[calc(100vh-190px)]' : 'lg:col-span-7 min-h-[480px]'} bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col`}>
          {/* Header tabs toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex-wrap">
              <button 
                onClick={() => { setActiveTab('simpanan'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'simpanan' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Data Mutasi Simpanan
              </button>
              <button 
                onClick={() => { setActiveTab('angsuran'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'angsuran' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Data Mutasi Angsuran
              </button>
              <button 
                onClick={() => { setActiveTab('pendapatan'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'pendapatan' 
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Pendapatan Kas ({income.length})
              </button>
              <button 
                onClick={() => { setActiveTab('rekap_bulanan'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'rekap_bulanan' 
                    ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Rekap Bulanan
              </button>
              <button 
                onClick={() => { setActiveTab('pembayaran_pending'); setFilterJenisOpt(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'pembayaran_pending' 
                    ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Setoran Mandiri</span>
                {pembayaranPending.filter(p => p.status === 'Pending').length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                    {pembayaranPending.filter(p => p.status === 'Pending').length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'rekap_bulanan' && (
                <>
                  <button
                    onClick={() => handlePrintRekapMasuk()}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border border-slate-250 dark:border-slate-700 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Rekap
                  </button>
                  <button
                    onClick={handleExportExcelRekap}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                </>
              )}
              {activeTab === 'angsuran' && angsuran.length > 0 && (
                <button
                  onClick={handlePrintAllHistory}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border border-slate-250 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Semua Angsuran
                </button>
              )}

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                onClick={() => setIsTableFullScreen(!isTableFullScreen)}
                title={isTableFullScreen ? "Kembali ke mode berdampingan" : "Tampilkan mutasi transaksi layar penuh"}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer shadow-xs ${
                  isTableFullScreen
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {isTableFullScreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mode Berdampingan</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tampilkan Full Layar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Full Screen Mode Banner */}
          {isTableFullScreen && (
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-indigo-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px] uppercase tracking-wider">
                  Mode Layar Penuh Aktif
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Total: {tableSummary.count} Data
                </span>
                {activeTab === 'simpanan' && (
                  <span className="text-slate-600 dark:text-slate-350 flex items-center gap-2 font-medium flex-wrap">
                    <span>• Bersih: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatRupiah(tableSummary.totalNominal)}</strong></span>
                    <span>• Masuk: <strong className="text-teal-700 dark:text-teal-400 font-mono">{formatRupiah(tableSummary.totalMasuk)}</strong></span>
                    {tableSummary.totalKeluar > 0 && (
                      <span>• Penarikan: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatRupiah(tableSummary.totalKeluar)}</strong></span>
                    )}
                  </span>
                )}
                {activeTab === 'angsuran' && (
                  <span className="text-slate-600 dark:text-slate-350 flex items-center gap-2 font-medium flex-wrap">
                    <span>• Total Bayar: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatRupiah(tableSummary.totalBayar || 0)}</strong></span>
                    <span>• Pokok: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatRupiah(tableSummary.totalPokok || 0)}</strong></span>
                    <span>• Jasa: <strong className="text-amber-700 dark:text-amber-400 font-mono">{formatRupiah(tableSummary.totalJasa || 0)}</strong></span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsTableFullScreen(false)}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap"
              >
                + Buka Formulir Kas
              </button>
            </div>
          )}

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cari Transaksi / Anggota</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ID / Nama / Ket..."
                  className="w-full pl-8 pr-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filter Listbox Anggota</span>
              <select 
                value={filterAnggotaOpt} 
                onChange={(e) => setFilterAnggotaOpt(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="">-- Semua Anggota --</option>
                {sortedMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.nama} ({m.noAnggota})</option>
                ))}
              </select>
            </div>

            {activeTab === 'simpanan' ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Filter Jenis Simpanan</span>
                <select 
                  value={filterJenisOpt} 
                  onChange={(e) => setFilterJenisOpt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <option value="">-- Semua Jenis --</option>
                  <option value="Pokok">Pokok</option>
                  <option value="Wajib">Wajib</option>
                  <option value="Sukarela">Sukarela</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Panduan Angsuran</span>
                <div className="px-3 py-1.5 border bg-slate-50 dark:bg-slate-900/50 rounded-lg text-[10.5px] text-slate-500 font-medium truncate">
                  Riwayat pembayaran tercatat sah
                </div>
              </div>
            )}

            {/* Filter & Sortir Bulan */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Sortir / Filter Bulan</span>
                {selectedMonthFilter !== 'semua' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('semua')}
                    className="text-[9.5px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <select 
                  value={selectedMonthFilter} 
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  title="Filter transaksi berdasarkan bulan"
                >
                  <option value="semua">🗓️ Semua Bulan</option>
                  {availableMonths.map(ym => {
                    const countInMonth = (activeTab === 'simpanan' ? simpanan : angsuran)
                      .filter((item: any) => item.tanggal && item.tanggal.startsWith(ym)).length;
                    return (
                      <option key={ym} value={ym}>
                        {formatYearMonthIndo(ym)} ({countInMonth})
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                    sortOrder === 'desc'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  }`}
                  title={sortOrder === 'desc' ? "Urutan: Tanggal Terbaru ke Terlama (Klik untuk Terlama)" : "Urutan: Tanggal Terlama ke Terbaru (Klik untuk Terbaru)"}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] ml-1 hidden xl:inline">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly / Active Filter Info Bar (for simpanan & angsuran) */}
          {(activeTab === 'simpanan' || activeTab === 'angsuran') && (
            <div className="mb-3.5 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Periode:
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 font-sans text-xs">
                      {selectedMonthFilter === 'semua' ? 'Semua Bulan (Kumulatif)' : formatYearMonthIndo(selectedMonthFilter)}
                    </span>
                    {selectedMonthFilter !== 'semua' && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold rounded-full">
                        Filter Aktif
                      </span>
                    )}
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      • Urutan: <strong>{sortOrder === 'desc' ? 'Terbaru ke Terlama' : 'Terlama ke Terbaru'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle: Tabel vs Per Bulan */}
                <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-300/50 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode('table')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      historyViewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 shadow-2xs text-emerald-700 dark:text-emerald-300 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Tampilan Tabel Standar"
                  >
                    Tabel
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode('grouped_month')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      historyViewMode === 'grouped_month'
                        ? 'bg-white dark:bg-slate-700 shadow-2xs text-emerald-700 dark:text-emerald-300 font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Tampilan Dikelompokkan Per Bulan"
                  >
                    <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Per Bulan</span>
                  </button>
                </div>

                {selectedMonthFilter !== 'semua' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('semua')}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1 transition cursor-pointer"
                    title="Reset filter bulan ke semua bulan"
                  >
                    <span>✕ Semua Bulan</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Data List Table container */}
          {activeTab === 'pendapatan' ? (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-1">
              {/* Income Header Bar & Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-teal-50 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-200 dark:border-teal-900/50">
                  <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Total Pendapatan Terdata</div>
                  <div className="text-base font-extrabold text-teal-800 dark:text-teal-200 font-mono mt-0.5">
                    {formatRupiah((income || []).reduce((sum, item) => sum + item.nominal, 0))}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pendapatan Bulan Terpilih</div>
                  <div className="text-base font-extrabold text-blue-800 dark:text-blue-200 font-mono mt-0.5">
                    {formatRupiah(
                      (income || [])
                        .filter(i => selectedMonthFilter === 'semua' || i.tanggal.startsWith(selectedMonthFilter))
                        .reduce((sum, item) => sum + item.nominal, 0)
                    )}
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Jumlah Transaksi</div>
                    <div className="text-base font-extrabold text-emerald-800 dark:text-emerald-200 font-mono mt-0.5">
                      {(income || []).filter(i => selectedMonthFilter === 'semua' || i.tanggal.startsWith(selectedMonthFilter)).length} Entri
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormMode('pendapatan')}
                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Catat Baru
                  </button>
                </div>
              </div>

              {/* Income Table */}
              {(() => {
                const q = tableSearchTerm.trim().toLowerCase();
                const filteredIncome = (income || [])
                  .filter(item => {
                    const matchMonth = selectedMonthFilter === 'semua' || item.tanggal.startsWith(selectedMonthFilter);
                    const matchSearch = !q || 
                      item.sumber.toLowerCase().includes(q) || 
                      (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
                      String(item.nominal).includes(q);
                    return matchMonth && matchSearch;
                  })
                  .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

                const sourceLabels: Record<string, string> = {
                  warung: 'Laba Warung Toko',
                  jasa: 'Pendapatan Jasa Pinjaman',
                  provisi: 'Biaya Provisi & Adm',
                  bunga_bank: 'Bunga Simpanan Bank',
                  denda: 'Denda Keterlambatan',
                  lain_lain: 'Pendapatan Lain-lain'
                };

                if (filteredIncome.length === 0) {
                  return (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <TrendingUp className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Tidak ada catatan pendapatan yang sesuai filter</p>
                      <button
                        type="button"
                        onClick={() => setFormMode('pendapatan')}
                        className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pendapatan Sekarang
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2.5 w-10 text-center">No</th>
                          <th className="px-3 py-2.5 w-28">Tanggal</th>
                          <th className="px-3 py-2.5 w-48">Sumber Pendapatan</th>
                          <th className="px-3 py-2.5">Keterangan</th>
                          <th className="px-3 py-2.5 w-32 text-right">Nominal (Rp)</th>
                          <th className="px-3 py-2.5 w-16 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                        {filteredIncome.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800 transition">
                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">{item.tanggal}</td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                {sourceLabels[item.sumber] || item.sumber}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{item.keterangan || '-'}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                              {formatRupiah(item.nominal)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {onDeleteIncome && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteModalState({
                                      isOpen: true,
                                      itemType: 'Catatan Pendapatan',
                                      itemName: `${sourceLabels[item.sumber] || item.sumber} (${formatRupiah(item.nominal)})`,
                                      itemDetails: [
                                        { label: 'Tanggal', value: item.tanggal },
                                        { label: 'Sumber', value: sourceLabels[item.sumber] || item.sumber },
                                        { label: 'Nominal', value: formatRupiah(item.nominal), isHighlight: true },
                                        { label: 'Keterangan', value: item.keterangan || '-' }
                                      ],
                                      warningMessage: 'Menghapus catatan ini akan memperbarui total kas masuk dan saldo koperasi secara otomatis.',
                                      onConfirm: () => onDeleteIncome(item.id)
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                  title="Hapus Pendapatan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          ) : activeTab === 'rekap_bulanan' ? (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-1">
              {/* Summary Cards */}
              {(() => {
                const targetInflows = selectedMonthFilter === 'semua'
                  ? allInflows
                  : allInflows.filter(i => i.tanggal.startsWith(selectedMonthFilter));

                const totKasMasuk = targetInflows.reduce((sum, item) => sum + item.nominal, 0);
                const totSimpWajib = targetInflows.filter(i => i.kategori === 'Simpanan Wajib').reduce((sum, item) => sum + item.nominal, 0);
                const totAngsuran = targetInflows.filter(i => i.kategori === 'Angsuran Pinjaman').reduce((sum, item) => sum + item.nominal, 0);
                const totPendapatan = targetInflows.filter(i => i.kategori === 'Pendapatan Koperasi').reduce((sum, item) => sum + item.nominal, 0);
                const totSimpLain = targetInflows.filter(i => i.kategori === 'Simpanan Pokok' || i.kategori === 'Simpanan Sukarela').reduce((sum, item) => sum + item.nominal, 0);

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-3 rounded-xl shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Total Kas Masuk</div>
                        <div className="text-base sm:text-lg font-extrabold font-mono mt-0.5">{formatRupiah(totKasMasuk)}</div>
                        <div className="text-[10px] text-emerald-200 mt-1 font-sans">{targetInflows.length} Transaksi Masuk</div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Simpanan Wajib</div>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{formatRupiah(totSimpWajib)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Pokok & Suka: {formatRupiah(totSimpLain)}</div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Angsuran Pinjaman</div>
                        <div className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{formatRupiah(totAngsuran)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Pokok & Jasa Bunga</div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendapatan Koperasi</div>
                        <div className="text-sm sm:text-base font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-0.5">{formatRupiah(totPendapatan)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Warung & Provisi</div>
                      </div>
                    </div>

                    {/* Table 1: Rekapitulasi Per Bulan (Monthly Grouped Breakdown) */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tabel Rekapitulasi Kas Masuk Per Bulan</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Total {monthlyInflowSummary.length} Periode Bulan
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-3 py-2">Bulan Periode</th>
                              <th className="px-3 py-2 text-right">Simpanan Wajib</th>
                              <th className="px-3 py-2 text-right">Simp. Pokok & Sukarela</th>
                              <th className="px-3 py-2 text-right">Angsuran Pokok</th>
                              <th className="px-3 py-2 text-right">Jasa Bunga</th>
                              <th className="px-3 py-2 text-right">Pendapatan Usaha</th>
                              <th className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">Total Kas Masuk</th>
                              <th className="px-3 py-2 text-center w-20">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {monthlyInflowSummary.map((m) => (
                              <tr 
                                key={m.ym} 
                                className={`hover:bg-slate-50 dark:hover:bg-slate-750 transition ${selectedMonthFilter === m.ym ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-bold' : ''}`}
                              >
                                <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>{formatYearMonthIndo(m.ym)}</span>
                                  {selectedMonthFilter === m.ym && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-600 text-white font-bold">Aktif</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{formatRupiah(m.simpananWajib)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{formatRupiah(m.simpananPokok + m.simpananSukarela)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">{formatRupiah(m.angsuranPokok)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatRupiah(m.angsuranJasa)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-teal-600 dark:text-teal-400">{formatRupiah(m.pendapatanKoperasi)}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                                  {formatRupiah(m.totalKasMasuk)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMonthFilter(selectedMonthFilter === m.ym ? 'semua' : m.ym)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    {selectedMonthFilter === m.ym ? 'Tampilkan Semua' : 'Filter Rincian'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table 2: Rincian Mutasi Transaksi Kas Masuk */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-2">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                          <span>Rincian Transaksi Kas Masuk ({targetInflows.length} item)</span>
                        </div>
                        {selectedMonthFilter !== 'semua' && (
                          <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                            Periode: {formatYearMonthIndo(selectedMonthFilter)}
                          </span>
                        )}
                      </div>

                      <div className="overflow-x-auto max-h-[360px]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-850">
                            <tr>
                              <th className="px-3 py-2 w-10 text-center">No</th>
                              <th className="px-3 py-2 w-24">Tanggal</th>
                              <th className="px-3 py-2 w-36">Kategori</th>
                              <th className="px-3 py-2 w-48">Penyetor / Sumber</th>
                              <th className="px-3 py-2">Keterangan</th>
                              <th className="px-3 py-2 w-32 text-right">Nominal (Rp)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {targetInflows.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                                <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{item.tanggal}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.kategori === 'Simpanan Wajib' 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                      : item.kategori === 'Angsuran Pinjaman'
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                      : item.kategori === 'Pendapatan Koperasi'
                                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}>
                                    {item.kategori}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{item.penyetor}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.keterangan}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {formatRupiah(item.nominal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : activeTab === 'pembayaran_pending' ? (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-1">
              {/* Status Filter Chips & Quick Controls */}
              {(() => {
                const allCount = pembayaranPending.length;
                const pendingCount = pembayaranPending.filter(p => p.status === 'Pending').length;
                const approvedCount = pembayaranPending.filter(p => p.status === 'Disetujui').length;
                const rejectedCount = pembayaranPending.filter(p => p.status === 'Ditolak').length;

                const q = tableSearchTerm.trim().toLowerCase();
                const filteredPending = pembayaranPending.filter(p => {
                  const matchAnggota = filterAnggotaOpt === '' || p.anggotaId === filterAnggotaOpt;
                  const matchStatus = pendingStatusFilter === 'Semua' || p.status === pendingStatusFilter;
                  const matchSearch = q === '' || 
                    (p.namaAnggota && p.namaAnggota.toLowerCase().includes(q)) || 
                    (p.anggotaId && p.anggotaId.toLowerCase().includes(q)) || 
                    (p.id && p.id.toLowerCase().includes(q)) ||
                    (p.jenis && p.jenis.toLowerCase().includes(q));
                  return matchAnggota && matchStatus && matchSearch;
                });

                return (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
                          <button
                            type="button"
                            onClick={() => setPendingStatusFilter('Semua')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              pendingStatusFilter === 'Semua'
                                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Semua ({allCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStatusFilter('Pending')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              pendingStatusFilter === 'Pending'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50'
                            }`}
                          >
                            <span>Menunggu Validasi</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-600/30 font-black">
                              {pendingCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStatusFilter('Disetujui')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              pendingStatusFilter === 'Disetujui'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50'
                            }`}
                          >
                            <span>Disetujui</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600/30 font-black">
                              {approvedCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStatusFilter('Ditolak')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              pendingStatusFilter === 'Ditolak'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50'
                            }`}
                          >
                            <span>Ditolak</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600/30 font-black">
                              {rejectedCount}
                            </span>
                          </button>
                        </div>

                        {(filterAnggotaOpt || pendingStatusFilter !== 'Semua' || tableSearchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingStatusFilter('Semua');
                              setFilterAnggotaOpt('');
                              setTableSearchTerm('');
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                          >
                            Reset Semua Filter
                          </button>
                        )}
                      </div>

                      {/* Active filter notification badge if filtering by member */}
                      {filterAnggotaOpt && (
                        <div className="flex items-center justify-between text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-850">
                          <span>
                            Menyaring khusus anggota: <b>{members.find(m => m.id === filterAnggotaOpt)?.nama || filterAnggotaOpt}</b>
                          </span>
                          <button
                            type="button"
                            onClick={() => setFilterAnggotaOpt('')}
                            className="text-[10px] font-bold underline hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-2"
                          >
                            Tampilkan Semua Anggota
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pending Items List */}
                    {filteredPending.length === 0 ? (
                      <div className="text-center py-12 px-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-slate-400 text-xs font-semibold italic">
                          Tidak ada catatan setoran mandiri anggota yang sesuai kriteria filter saat ini.
                        </p>
                        {(filterAnggotaOpt || pendingStatusFilter !== 'Semua' || tableSearchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingStatusFilter('Semua');
                              setFilterAnggotaOpt('');
                              setTableSearchTerm('');
                            }}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition"
                          >
                            Tampilkan Seluruh Riwayat Setoran Mandiri
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredPending
                        .slice()
                        .reverse()
                        .map((p) => (
                          <div
                            key={p.id}
                            className="p-4 border border-slate-150 dark:border-slate-700/60 rounded-2xl bg-white dark:bg-slate-900/70 shadow-xs space-y-3 text-xs"
                          >
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                                  <span>{p.namaAnggota}</span>
                                  <span className="font-sans text-[10px] text-slate-400 font-normal">
                                    (ID: {members.find(m => m.id === p.anggotaId)?.noAnggota || p.anggotaId})
                                  </span>
                                </p>
                                <p className="text-[10.5px] text-slate-400 mt-0.5">
                                  Tanggal Bayar: <span className="font-medium text-slate-600 dark:text-slate-350">{p.tanggal}</span> • Ref: {p.id}
                                </p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide uppercase border ${
                                p.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse' :
                                p.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                'bg-rose-50 text-rose-700 border-rose-300'
                              }`}>
                                {p.status === 'Pending' ? 'Menunggu Validasi' : p.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 font-mono text-[11px] bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                              <div>
                                <span className="text-slate-400 font-sans text-[10px] block">Tujuan / Jenis Setoran:</span>
                                <p className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs">{p.jenis}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-sans text-[10px] block">Nominal Setoran:</span>
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{formatRupiah(p.jumlah)}</p>
                              </div>
                              {p.jenis === 'Angsuran' && (
                                <div className="col-span-2 pt-1.5 border-t border-slate-150 dark:border-slate-800/50">
                                  <span className="text-slate-400 font-sans text-[10px] block">Kontrak & Bulan Ke:</span>
                                  <p className="font-bold text-slate-700 dark:text-slate-300">
                                    CTR-{p.pinjamanId?.substring(0,8).toUpperCase()} - Angsuran Ke-{p.bulanKe}
                                  </p>
                                </div>
                              )}
                              {p.jenis === 'Simpanan Wajib & Angsuran' && (
                                <div className="col-span-2 pt-1.5 border-t border-slate-150 dark:border-slate-800/50 grid grid-cols-2 gap-2 text-[10px]">
                                  <div>
                                    <span className="text-slate-400 font-sans block">Simpanan Wajib:</span>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.jumlahSimpananWajib || 0)}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-sans block">Angsuran Ke-{p.bulanKe}:</span>
                                    <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                      {formatRupiah(p.jumlahAngsuran || 0)} {p.pinjamanId ? `(CTR-${p.pinjamanId.substring(0,6).toUpperCase()})` : ''}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {p.jenis === 'Simpanan Pokok & Wajib' && (
                                <div className="col-span-2 pt-1.5 border-t border-slate-150 dark:border-slate-800/50 grid grid-cols-2 gap-2 text-[10px]">
                                  <div>
                                    <span className="text-slate-400 font-sans block">Simpanan Pokok:</span>
                                    <p className="font-bold text-amber-600 dark:text-amber-400">{formatRupiah(p.jumlahSimpananPokok || (p.jumlah - (p.jumlahSimpananWajib || 0)))}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-sans block">Simpanan Wajib:</span>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.jumlahSimpananWajib || 0)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {p.keterangan && (
                              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed italic border border-slate-100 dark:border-slate-800 text-[11px]">
                                Catatan Anggota: "{p.keterangan}"
                              </div>
                            )}

                            {p.buktiTransferUrl && (
                              <div className="space-y-1.5">
                                <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">Bukti Transfer / Resi:</span>
                                <div className="inline-block relative group">
                                  <img
                                    src={p.buktiTransferUrl}
                                    alt="Bukti Transfer"
                                    className="max-h-[160px] rounded-xl border border-slate-200 dark:border-slate-700 object-contain cursor-zoom-in group-hover:opacity-90 transition"
                                    referrerPolicy="no-referrer"
                                    onClick={() => setPreviewBuktiModal({
                                      url: p.buktiTransferUrl!,
                                      title: `Bukti Transfer: ${p.namaAnggota} - ${formatRupiah(p.jumlah)}`
                                    })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewBuktiModal({
                                      url: p.buktiTransferUrl!,
                                      title: `Bukti Transfer: ${p.namaAnggota} - ${formatRupiah(p.jumlah)}`
                                    })}
                                    className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    Perbesar
                                  </button>
                                </div>
                              </div>
                            )}

                            {p.status === 'Pending' ? (
                              <div className="space-y-2.5 pt-2.5 border-t border-slate-150 dark:border-slate-800">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Catatan Validasi Pengurus</label>
                                  <input
                                    type="text"
                                    placeholder="Tulis catatan (misal: Transfer BCA / Mandiri berhasil diverifikasi)"
                                    value={validationComments[p.id] || ''}
                                    onChange={(e) => setValidationComments(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onRejectPembayaranPending) {
                                        await onRejectPembayaranPending(p.id, validationComments[p.id]);
                                        setValidationComments(prev => {
                                          const next = { ...prev };
                                          delete next[p.id];
                                          return next;
                                        });
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 cursor-pointer flex items-center gap-1.5 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Tolak Setoran
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onApprovePembayaranPending) {
                                        const comment = validationComments[p.id];
                                        await onApprovePembayaranPending(p.id, comment);
                                        setValidationComments(prev => {
                                          const next = { ...prev };
                                          delete next[p.id];
                                          return next;
                                        });

                                        // Auto trigger WA thank-you message with updated Member Ledger Resume
                                        const m = members.find(mem => mem.id === p.anggotaId);
                                        if (m && m.noHp) {
                                          const baseResume = calculateMemberLedgerResume(p.anggotaId, simpanan, pinjaman, angsuran);
                                          const updatedResume = { ...baseResume };
                                          if (p.jenis === 'Simpanan Wajib') {
                                            updatedResume.simpananWajib += p.jumlah;
                                            updatedResume.totalSimpanan = (updatedResume.totalSimpanan || 0) + p.jumlah;
                                          } else if (p.jenis === 'Simpanan Pokok') {
                                            updatedResume.simpananPokok += p.jumlah;
                                            updatedResume.totalSimpanan = (updatedResume.totalSimpanan || 0) + p.jumlah;
                                          } else if (p.jenis === 'Simpanan Pokok & Wajib') {
                                            const spNom = (p.jumlahSimpananPokok && p.jumlahSimpananPokok > 0) ? p.jumlahSimpananPokok : Math.max(0, p.jumlah - (p.jumlahSimpananWajib || 0));
                                            const swNom = p.jumlahSimpananWajib || 0;
                                            updatedResume.simpananPokok += spNom;
                                            updatedResume.simpananWajib += swNom;
                                            updatedResume.totalSimpanan = (updatedResume.totalSimpanan || 0) + spNom + swNom;
                                          } else if (p.jenis === 'Simpanan Wajib & Angsuran') {
                                            const swNom = p.jumlahSimpananWajib || 0;
                                            const angNom = p.jumlahAngsuran || 0;
                                            updatedResume.simpananWajib += swNom;
                                            updatedResume.totalSimpanan = (updatedResume.totalSimpanan || 0) + swNom;
                                            updatedResume.sisaPinjaman = Math.max(0, updatedResume.sisaPinjaman - angNom);
                                          } else if (p.jenis === 'Angsuran') {
                                            updatedResume.sisaPinjaman = Math.max(0, updatedResume.sisaPinjaman - p.jumlah);
                                          }

                                          const url = createWhatsAppThankYouUrl(
                                            m.noHp,
                                            m.nama,
                                            m.noAnggota,
                                            setup.namaKoperasi,
                                            p.jenis,
                                            p.jumlah,
                                            p.tanggal,
                                            p.id,
                                            comment || p.keterangan || 'Pembayaran telah disetujui & dibukukan.',
                                            updatedResume,
                                            m.id
                                          );
                                          window.open(url, '_blank');
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Setujui & Masukkan ke Kas
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                                {p.catatanPengurus && (
                                  <div className="p-2.5 bg-slate-100/70 dark:bg-slate-950/70 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800 text-[10.5px]">
                                    <span className="font-bold text-slate-500 block">Tanggapan Pengurus:</span>
                                    <p className="text-slate-750 dark:text-slate-300 font-medium">{p.catatanPengurus}</p>
                                  </div>
                                )}
                                {p.status === 'Disetujui' && (
                                  <div className="flex justify-between items-center pt-1 flex-wrap gap-2">
                                    <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Setoran Sah Dibukukan
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const m = members.find(mem => mem.id === p.anggotaId);
                                          const memberObj = m || { id: p.anggotaId, nama: p.namaAnggota || 'Anggota', noAnggota: 'N/A', alamat: '', noHp: '', tanggalBergabung: '' };

                                          const items: { jenis: 'Pokok' | 'Wajib' | 'Sukarela'; jumlah: number; keterangan: string }[] = [];
                                          if (p.jenis === 'Simpanan Wajib') {
                                            items.push({ jenis: 'Wajib', jumlah: p.jumlah, keterangan: p.keterangan || 'Setoran Simpanan Wajib Mandiri' });
                                          } else if (p.jenis === 'Simpanan Pokok') {
                                            items.push({ jenis: 'Pokok', jumlah: p.jumlah, keterangan: p.keterangan || 'Setoran Simpanan Pokok Mandiri' });
                                          } else if (p.jenis === 'Simpanan Pokok & Wajib') {
                                            const spNominal = (p.jumlahSimpananPokok && p.jumlahSimpananPokok > 0) 
                                              ? p.jumlahSimpananPokok 
                                              : Math.max(0, p.jumlah - (p.jumlahSimpananWajib || 0));
                                            if (spNominal > 0) {
                                              items.push({ jenis: 'Pokok', jumlah: spNominal, keterangan: p.keterangan || 'Setoran Simpanan Pokok Mandiri' });
                                            }
                                            if (p.jumlahSimpananWajib && p.jumlahSimpananWajib > 0) {
                                              items.push({ jenis: 'Wajib', jumlah: p.jumlahSimpananWajib, keterangan: p.keterangan || 'Setoran Simpanan Wajib Mandiri' });
                                            }
                                          } else if (p.jenis === 'Simpanan Wajib & Angsuran') {
                                            if (p.jumlahSimpananWajib && p.jumlahSimpananWajib > 0) {
                                              items.push({ jenis: 'Wajib', jumlah: p.jumlahSimpananWajib, keterangan: p.keterangan || 'Setoran Simpanan Wajib Mandiri' });
                                            }
                                          }

                                          let angsuranData: any = undefined;
                                          if (p.jenis === 'Angsuran' || p.jenis === 'Simpanan Wajib & Angsuran') {
                                            const loanObj = pinjaman.find(l => l.id === p.pinjamanId);
                                            const loanAngsuran = angsuran.filter(a => a.pinjamanId === p.pinjamanId);
                                            const remaining = loanObj ? calculateLoanOutstanding(loanObj, loanAngsuran) : 0;
                                            const amt = p.jenis === 'Angsuran' ? p.jumlah : (p.jumlahAngsuran || 0);
                                            if (amt > 0) {
                                              angsuranData = {
                                                pinjamanId: p.pinjamanId || 'PINJ',
                                                bulanKe: p.bulanKe || 1,
                                                jumlahBayar: amt,
                                                remaining: Math.max(0, remaining),
                                                keterangan: p.keterangan || 'Angsuran Mandiri'
                                              };
                                            }
                                          }

                                          setReceiptData({
                                            member: memberObj,
                                            items: items.length > 0 ? items : (p.jenis.toLowerCase().includes('simpanan') ? [{ jenis: 'Wajib', jumlah: p.jumlah, keterangan: p.keterangan || '' }] : undefined),
                                            angsuran: angsuranData,
                                            txId: `TX-${p.id.replace('pay-', '')}`,
                                            tanggal: p.tanggal
                                          });
                                        }}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                        title="Cetak Kuitansi Setoran Mandiri"
                                      >
                                        <Printer className="w-3 h-3" /> Cetak Struk
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const m = members.find(mem => mem.id === p.anggotaId);
                                          if (m && m.noHp) {
                                            const resume = calculateMemberLedgerResume(p.anggotaId, simpanan, pinjaman, angsuran);
                                            const url = createWhatsAppThankYouUrl(
                                              m.noHp,
                                              m.nama,
                                              m.noAnggota,
                                              setup.namaKoperasi,
                                              p.jenis,
                                              p.jumlah,
                                              p.tanggal,
                                              p.id,
                                              p.catatanPengurus || p.keterangan,
                                              resume,
                                              p.anggotaId
                                            );
                                            window.open(url, '_blank');
                                          } else {
                                            alert('Nomor HP/WhatsApp anggota tidak ditemukan.');
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <MessageSquare className="w-3 h-3" /> Kirim WA Terima Kasih
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </>
                );
              })()}
            </div>
          ) : historyViewMode === 'grouped_month' ? (
            <div className={`space-y-4 flex-1 overflow-y-auto ${isTableFullScreen ? 'min-h-[calc(100vh-340px)] w-full' : 'max-h-[520px]'} pr-1`}>
              {historyGroupedByMonth.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold italic">
                    Tidak ada catatan transaksi ditemukan yang sesuai filter
                  </p>
                  {(filterAnggotaOpt || filterJenisOpt || selectedMonthFilter !== 'semua' || tableSearchTerm) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterAnggotaOpt('');
                        setFilterJenisOpt('');
                        setSelectedMonthFilter('semua');
                        setTableSearchTerm('');
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition"
                    >
                      Reset Semua Filter
                    </button>
                  )}
                </div>
              ) : (
                historyGroupedByMonth.map((group) => (
                  <div key={group.monthKey} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs overflow-hidden">
                    {/* Month Group Header */}
                    <div className="p-3 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/40 dark:from-slate-800 dark:via-slate-850 dark:to-emerald-950/20 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                            <span>{group.monthLabel}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-sans">
                              {group.count} Transaksi
                            </span>
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        {activeTab === 'simpanan' ? (
                          <>
                            <div className="text-right">
                              <span className="text-[9px] text-teal-600 dark:text-teal-400 uppercase block font-sans font-bold">Masuk</span>
                              <span className="font-bold text-teal-700 dark:text-teal-400">{formatRupiah(group.totalMasuk)}</span>
                            </div>
                            {group.totalKeluar > 0 && (
                              <div className="text-right">
                                <span className="text-[9px] text-rose-500 uppercase block font-sans font-bold">Tarik</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">-{formatRupiah(group.totalKeluar)}</span>
                              </div>
                            )}
                            <div className="text-right bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <span className="text-[9px] text-emerald-800 dark:text-emerald-300 uppercase block font-sans font-bold">Bersih</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatRupiah(group.totalNominal)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-right hidden sm:block">
                              <span className="text-[9px] text-slate-500 uppercase block font-sans font-bold">Pokok</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{formatRupiah(group.totalPokok)}</span>
                            </div>
                            <div className="text-right hidden sm:block">
                              <span className="text-[9px] text-amber-600 uppercase block font-sans font-bold">Jasa</span>
                              <span className="font-bold text-amber-700 dark:text-amber-400">{formatRupiah(group.totalJasa)}</span>
                            </div>
                            <div className="text-right bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <span className="text-[9px] text-emerald-800 dark:text-emerald-300 uppercase block font-sans font-bold">Total Bayar</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatRupiah(group.totalBayar)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Table for this Month Group */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
                        {renderTableHeader()}
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-xs">
                          {group.items.map((item, index) => renderTransactionRow(item, index))}
                        </tbody>
                        <tfoot className="bg-slate-50/90 dark:bg-slate-900/90 font-mono text-xs font-bold border-t border-slate-200 dark:border-slate-700">
                          {isTableFullScreen ? (
                            activeTab === 'simpanan' ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-2.5 text-right font-sans uppercase text-[10px] tracking-wider text-slate-500 font-bold">
                                  Subtotal {group.monthLabel}:
                                </td>
                                <td className="px-4 py-2.5 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">
                                  {formatRupiah(group.totalNominal)}
                                </td>
                                <td className="px-4 py-2.5"></td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-2.5 text-right font-sans uppercase text-[10px] tracking-wider text-slate-500 font-bold">
                                  Subtotal {group.monthLabel}:
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-200">
                                  {formatRupiah(group.totalPokok)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-amber-700 dark:text-amber-400">
                                  {formatRupiah(group.totalJasa)}
                                </td>
                                <td className="px-4 py-2.5 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">
                                  {formatRupiah(group.totalBayar)}
                                </td>
                                <td colSpan={2} className="px-4 py-2.5"></td>
                              </tr>
                            )
                          ) : (
                            activeTab === 'simpanan' ? (
                              <tr>
                                <td colSpan={2} className="px-4 py-2 text-right font-sans uppercase text-[9.5px] tracking-wider text-slate-500 font-bold">
                                  Subtotal {group.monthLabel}:
                                </td>
                                <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                                  {formatRupiah(group.totalNominal)}
                                </td>
                                <td className="px-4 py-2"></td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right font-sans uppercase text-[9.5px] tracking-wider text-slate-500 font-bold">
                                  Subtotal {group.monthLabel}:
                                </td>
                                <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                                  {formatRupiah(group.totalBayar)}
                                </td>
                                <td className="px-4 py-2"></td>
                              </tr>
                            )
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))
              )}

              {/* Total Rekapitulasi Bar at bottom of grouped list */}
              {filteredHistory.length > 0 && (
                <div className="p-3 bg-slate-900 dark:bg-slate-950 text-white rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono shadow-md">
                  <span className="font-sans font-bold text-[11px] text-slate-300">
                    TOTAL KESELURUHAN DITAMPILKAN ({tableSummary.count} Data):
                  </span>
                  <div className="flex items-center gap-3">
                    {activeTab === 'simpanan' ? (
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {formatRupiah(tableSummary.totalNominal)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">Pokok: {formatRupiah(tableSummary.totalPokok || 0)}</span>
                        <span className="text-amber-400 text-[11px]">Jasa: {formatRupiah(tableSummary.totalJasa || 0)}</span>
                        <span className="font-extrabold text-emerald-400 text-sm">Bayar: {formatRupiah(tableSummary.totalBayar || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`overflow-x-auto flex-1 ${isTableFullScreen ? 'min-h-[calc(100vh-340px)] w-full' : 'max-h-[420px]'}`}>
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
                {renderTableHeader()}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-mono text-xs">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={isTableFullScreen ? (activeTab === 'simpanan' ? 7 : 11) : (activeTab === 'simpanan' ? 4 : 5)} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500 italic">
                        Tidak ada catatan transaksi ditemukan yang sesuai filter
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item: any, index: number) => renderTransactionRow(item, index))
                  )}
                </tbody>
                {filteredHistory.length > 0 && (
                  <tfoot className="bg-slate-50/95 dark:bg-slate-900/95 font-mono text-xs font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                    {isTableFullScreen ? (
                      activeTab === 'simpanan' ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-500 font-bold">
                            TOTAL REKAPITULASI ({tableSummary.count} Data):
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">
                            {formatRupiah(tableSummary.totalNominal)}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-right font-sans uppercase text-[10px] tracking-wider text-slate-500 font-bold">
                            TOTAL REKAPITULASI ({tableSummary.count} Data):
                          </td>
                          <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-200">
                            {formatRupiah(tableSummary.totalPokok || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
                            {formatRupiah(tableSummary.totalJasa || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">
                            {formatRupiah(tableSummary.totalBayar || 0)}
                          </td>
                          <td colSpan={2} className="px-4 py-3"></td>
                        </tr>
                      )
                    ) : (
                      activeTab === 'simpanan' ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-right font-sans uppercase text-[9.5px] tracking-wider text-slate-500 font-bold">
                            TOTAL:
                          </td>
                          <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                            {formatRupiah(tableSummary.totalNominal)}
                          </td>
                          <td className="px-4 py-2"></td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-sans uppercase text-[9.5px] tracking-wider text-slate-500 font-bold">
                            TOTAL:
                          </td>
                          <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                            {formatRupiah(tableSummary.totalBayar || 0)}
                          </td>
                          <td className="px-4 py-2"></td>
                        </tr>
                      )
                    )}
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDIT ANGSURAN */}
      <AnimatePresence>
        {editingAngsuran && (() => {
          const editMember = members.find(m => m.id === editingAngsuran.anggotaId);
          const editContract = pinjaman.find(p => p.id === editingAngsuran.pinjamanId);
          const currentTotalBayar = parseInputRupiah(editAngsuranPokok) + parseInputRupiah(editAngsuranJasa);
          const defaultPokok = editContract ? (editContract.angsuranPokokPerBulan || Math.round(editContract.nominalPinjaman / editContract.tenor)) : 0;
          const defaultJasa = editContract ? (editContract.jasaPerBulan || Math.round(editContract.nominalPinjaman * ((editContract.bungaFlatPersen || 1.5) / 100))) : 0;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 p-6 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <Pencil className="w-4 h-4" /> Edit Data Mutasi Angsuran
                  </h3>
                  <button onClick={() => setEditingAngsuran(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"><X className="w-4 h-4" /></button>
                </div>

                {/* Contract & Member Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nama Anggota:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{editMember?.nama || 'Unknown'} ({editMember?.noAnggota || '-'})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Kontrak Pinjaman:</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">CTR-{editingAngsuran.pinjamanId?.substring(0,8).toUpperCase()}</span>
                  </div>
                  {editContract && (
                    <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-1">
                      <span>Plafond: {formatRupiah(editContract.nominalPinjaman)}</span>
                      <span>Tenor: {editContract.tenor} Bulan ({editContract.bungaFlatPersen || 1.5}% Jasa)</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveEditAngsuran} className="space-y-4 text-sm text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Transaction Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL PEMBAYARAN</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-700 font-semibold"
                        value={editAngsuranTanggal}
                        onChange={(e) => setEditAngsuranTanggal(e.target.value)}
                        required
                      />
                    </div>

                    {/* Installment Month Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ANGSURAN BULAN KE-</label>
                      <input 
                        type="number"
                        min={1}
                        max={editContract?.tenor ? editContract.tenor + 12 : 60}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-700 font-bold"
                        value={editAngsuranBulanKe}
                        onChange={(e) => setEditAngsuranBulanKe(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  {/* Pokok Angsuran (Manual) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">POKOK ANGSURAN PINJAMAN (Rp)</label>
                      {editContract && (
                        <button
                          type="button"
                          onClick={() => setEditAngsuranPokok(formatInputRupiah(String(defaultPokok)))}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                        >
                          Isi Pokok Standar ({formatRupiah(defaultPokok)})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-medium font-mono">Rp</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-indigo-600"
                        value={editAngsuranPokok}
                        onChange={(e) => setEditAngsuranPokok(formatInputRupiah(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  {/* Jasa Pinjaman (Manual) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">JASA PINJAMAN (Rp)</label>
                      <div className="flex gap-2">
                        {editContract && (
                          <button
                            type="button"
                            onClick={() => setEditAngsuranJasa(formatInputRupiah(String(defaultJasa)))}
                            className="text-[10px] text-amber-600 hover:text-amber-800 font-bold cursor-pointer"
                          >
                            Jasa 1.5% ({formatRupiah(defaultJasa)})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditAngsuranJasa('0')}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                        >
                          Rp 0 (Bebas Jasa)
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-amber-500 font-medium font-mono">Rp</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-indigo-600"
                        value={editAngsuranJasa}
                        onChange={(e) => setEditAngsuranJasa(formatInputRupiah(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  {/* Live Calculated Total */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Total Jumlah Bayar (Pokok + Jasa)</span>
                      <span className="text-[11px] text-slate-500 font-sans">Akan tercatat sebagai kas masuk & kuitansi</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-350">{formatRupiah(currentTotalBayar)}</span>
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">CATATAN / KETERANGAN</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Angsuran bulanan ke-5"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-600 font-medium"
                      value={editAngsuranKeterangan}
                      onChange={(e) => setEditAngsuranKeterangan(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="button"
                      onClick={() => setEditingAngsuran(null)}
                      className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer transition"
                    >
                      Simpan Perubahan Angsuran
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL EDIT SIMPANAN */}
      <AnimatePresence>
        {editingSimpanan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-150 dark:border-slate-800 p-6 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <Pencil className="w-4 h-4" /> Edit Data Mutasi Simpanan
                </h3>
                <button onClick={() => setEditingSimpanan(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveEditSimpanan} className="space-y-4 text-sm text-left">
                {/* Member Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ANGGOTA KOPERASI</label>
                  <select 
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-600 font-semibold"
                    value={editAnggotaId}
                    onChange={(e) => setEditAnggotaId(e.target.value)}
                    required
                  >
                    <option value="">-- Cari Nama / ID Anggota --</option>
                    {sortedMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.nama} ({m.noAnggota})</option>
                    ))}
                  </select>
                </div>

                {/* Transaction Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL TRANSAKSI</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-700 font-semibold"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    required
                  />
                </div>

                {/* Savings Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">JENIS SIMPANAN</label>
                  <select 
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-750 font-semibold"
                    value={editJenis}
                    onChange={(e) => setEditJenis(e.target.value as any)}
                    required
                  >
                    <option value="Pokok">Pokok</option>
                    <option value="Wajib">Wajib</option>
                    <option value="Sukarela">Sukarela</option>
                  </select>
                </div>

                {/* Transaction Type: Setoran / Penarikan */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TIPE TRANSAKSI</label>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setEditIsPenarikan(false)}
                      className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${!editIsPenarikan ? 'bg-white dark:bg-slate-800 text-emerald-750 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
                    >
                      Setoran (Kas Masuk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsPenarikan(true)}
                      className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${editIsPenarikan ? 'bg-white dark:bg-slate-800 text-red-650 dark:text-red-400 shadow-xs' : 'text-slate-500'}`}
                    >
                      Penarikan (Kas Keluar)
                    </button>
                  </div>
                </div>

                {/* Amount (Jumlah) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NOMINAL TRANSAKSI (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-medium font-mono">Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      placeholder="Masukkan nominal..."
                      className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-indigo-600"
                      value={editJumlah}
                      onChange={(e) => setEditJumlah(formatInputRupiah(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">CATATAN / KETERANGAN</label>
                  <input 
                    type="text"
                    placeholder="Masukkan catatan..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-indigo-600 font-semibold"
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setEditingSimpanan(null)}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer transition"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: PREVIEW KUITANSI KAS MASUK SYSTEM */}
      <AnimatePresence>
        {receiptData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4"
            >
              {/* Close Button X */}
              <button 
                onClick={() => setReceiptData(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-50"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border border-slate-200 dark:border-slate-850 bg-amber-50/5 dark:bg-slate-950/40 p-5 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 shadow-inner relative space-y-4 overflow-y-auto flex-1">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                    <img src={setup.logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-full mx-auto mb-1.5 border border-slate-200 dark:border-slate-800" />
                  ) : (
                    <span className="text-2xl block mb-1 text-center">{setup.logoUrl || '🌱'}</span>
                  )}
                  <h4 className="font-sans font-bold text-base tracking-tight">{setup.namaKoperasi}</h4>
                  <p className="text-[9px] font-sans text-slate-500 uppercase tracking-wider mt-0.5">{setup.slogan}</p>
                </div>
                <div className="space-y-1 py-1 text-[10px]">
                  <div className="flex justify-between"><span>RESI NO:</span><span className="font-bold">{receiptData.txId}</span></div>
                  <div className="flex justify-between"><span>WAKTU TRANSAKSI:</span><span>{receiptData.tanggal} {getTransactionTime(receiptData.txId)}</span></div>
                  <div className="flex justify-between"><span>ANGGOTA:</span><span className="font-semibold">{receiptData.member.nama}</span></div>
                  <div className="flex justify-between"><span>ID ANGGOTA:</span><span>{receiptData.member.noAnggota}</span></div>
                </div>
                <div className="space-y-2 py-2 border-t border-b border-dashed border-slate-300">
                  <div className="grid grid-cols-12 font-bold text-[10px] text-slate-400 pb-1">
                    <span className="col-span-7 font-semibold">Rincian Transaksi</span>
                    <span className="col-span-5 text-right font-semibold">Jumlah</span>
                  </div>
                  
                  {/* Savings Items */}
                  {receiptData.items && receiptData.items.map((item, id) => (
                    <div key={`sav-${id}`} className="grid grid-cols-12 py-1 text-[11px]">
                      <div className="col-span-7">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Simpanan {item.jenis}</span>
                        {item.keterangan && <p className="text-[9px] text-slate-400 italic font-sans leading-none">{item.keterangan}</p>}
                      </div>
                      <span className="col-span-5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatRupiah(item.jumlah)}
                      </span>
                    </div>
                  ))}

                  {/* Installment Item */}
                  {receiptData.angsuran && (
                    <div className="py-1 text-[11px] border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5 space-y-1">
                      {receiptData.angsuran.angsuranList && receiptData.angsuran.angsuranList.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center justify-between">
                            <span>Pembayaran 2 Bulan Sekaligus:</span>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">2 Transaksi Terpisah</span>
                          </div>
                          {receiptData.angsuran.angsuranList.map((sub, sIdx) => (
                            <div key={`sub-ang-${sIdx}`} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                                  Angsuran Ke-{sub.bulanKe} {sIdx === 0 ? '(Tunggakan Kemarin)' : '(Bulan Berjalan)'}
                                </span>
                                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                  {formatRupiah(sub.jumlahBayar)}
                                </span>
                              </div>
                              <div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 pl-1 border-l-2 border-indigo-300 dark:border-indigo-700">
                                <div className="flex justify-between">
                                  <span>- Pokok:</span>
                                  <span className="font-mono font-medium">{formatRupiah(sub.pokokBayar)}</span>
                                </div>
                                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                                  <span>- Jasa:</span>
                                  <span className="font-mono font-medium">{formatRupiah(sub.jasaBayar)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-12">
                            <div className="col-span-7">
                              <span className="font-bold text-indigo-700 dark:text-indigo-400">Angsuran Ke-{receiptData.angsuran.bulanKe}</span>
                              <p className="text-[9px] text-slate-400 italic font-sans leading-none">Kontrak: #{receiptData.angsuran.pinjamanId.substring(0, 8)}</p>
                              {receiptData.angsuran.keterangan && <p className="text-[9px] text-slate-400 italic font-sans leading-none mt-0.5">{receiptData.angsuran.keterangan}</p>}
                            </div>
                            <span className="col-span-5 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              {formatRupiah(receiptData.angsuran.jumlahBayar)}
                            </span>
                          </div>
                          {(receiptData.angsuran.pokokBayar !== undefined || receiptData.angsuran.jasaBayar !== undefined) && (
                            <div className="pl-2 border-l-2 border-indigo-200 dark:border-indigo-800 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400">
                              {receiptData.angsuran.pokokBayar !== undefined && (
                                <div className="flex justify-between">
                                  <span>- Pokok Pinjaman:</span>
                                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(receiptData.angsuran.pokokBayar)}</span>
                                </div>
                              )}
                              {receiptData.angsuran.jasaBayar !== undefined && (
                                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                                  <span>- Jasa Pinjaman:</span>
                                  <span className="font-mono font-semibold">{formatRupiah(receiptData.angsuran.jasaBayar)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 py-1 text-[11.5px]">
                  {receiptData.angsuran && (
                    <div className="flex justify-between text-rose-600 font-semibold mb-1">
                      <span>SISA PIUTANG KONTRAK:</span>
                      <span className="font-bold font-mono">{formatRupiah(Math.max(0, receiptData.angsuran.remaining))}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 font-bold text-xs border-t border-dashed border-slate-300 mt-2">
                    <span className="text-slate-700 dark:text-slate-300 text-sm">TOTAL KAS MASUK:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-base font-mono font-extrabold">
                      {formatRupiah(
                        (receiptData.items ? receiptData.items.reduce((s, c) => s + c.jumlah, 0) : 0) +
                        (receiptData.angsuran ? receiptData.angsuran.jumlahBayar : 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-sans italic text-center leading-normal border-t border-dashed border-slate-200 pt-2">
                  Kuitansi transaksi kas masuk sah. Terbilang:<br />
                  <span className="font-bold text-[9.5px] not-italic text-slate-600 dark:text-slate-350 font-sans">
                    "{terbilang((receiptData.items ? receiptData.items.reduce((s, c) => s + c.jumlah, 0) : 0) + (receiptData.angsuran ? receiptData.angsuran.jumlahBayar : 0)) + " Rupiah"}"
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button 
                  onClick={() => {
                    const total = (receiptData.items ? receiptData.items.reduce((s, c) => s + c.jumlah, 0) : 0) +
                                  (receiptData.angsuran ? receiptData.angsuran.jumlahBayar : 0);
                    const jenisList = [
                      ...(receiptData.items || []).map(i => `Simpanan ${i.jenis}`),
                      ...(receiptData.angsuran ? [`Angsuran Ke-${receiptData.angsuran.bulanKe}`] : [])
                    ].join(', ');
                    
                    const resume = calculateMemberLedgerResume(receiptData.member.id, simpanan, pinjaman, angsuran);
                    const url = createWhatsAppThankYouUrl(
                      receiptData.member.noHp,
                      receiptData.member.nama,
                      receiptData.member.noAnggota,
                      setup.namaKoperasi,
                      jenisList || 'Pembayaran Kas Masuk',
                      total,
                      receiptData.tanggal,
                      receiptData.txId,
                      receiptData.angsuran?.keterangan || (receiptData.items?.[0]?.keterangan),
                      resume,
                      receiptData.member.id
                    );
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg cursor-pointer transition text-center flex items-center justify-center gap-1.5 shadow"
                  title="Kirim Ucapan Terima Kasih via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WA Terima Kasih
                </button>
                <button 
                  onClick={() => handlePrintUnifiedReceipt(receiptData)}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-3 rounded-lg cursor-pointer transition text-center flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak PDF
                </button>
                <button 
                  onClick={() => setReceiptData(null)}
                  className="px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 rounded-lg cursor-pointer transition text-center"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PREVIEW KUITANSI ANGSURAN */}
      <AnimatePresence>
        {previewReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-150 dark:border-slate-800 p-6 flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-350 px-2.5 py-1 rounded-lg">Pratinjau Kuitansi Angsuran</h3>
                <button onClick={() => setPreviewReceipt(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="border border-slate-200 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-350 relative text-left whitespace-normal break-words shadow-inner">
                <p className="text-center font-bold text-base">{setup.namaKoperasi}</p>
                <p className="text-center text-[9px] text-slate-400 border-b border-slate-200 pb-2 mb-2">{setup.slogan}</p>
                
                <div className="space-y-1 text-[10px]">
                  <div>Tgl Bayar: <b>{previewReceipt.tanggal}</b></div>
                  <div>Kontrak Pinjaman: <b>#{previewReceipt.pinjamanId}</b></div>
                  <div>Pembayaran Angsuran: <b>Bulan Ke-{previewReceipt.bulanKe}</b></div>
                  <div className="border-t border-dashed my-2"></div>
                  {(() => {
                    const pContract = pinjaman.find(p => p.id === previewReceipt.pinjamanId);
                    const principal = calculateAngsuranPrincipal(previewReceipt, pContract);
                    const interest = calculateAngsuranInterest(previewReceipt, pContract);
                    const remaining = pContract ? calculateHistoricalLoanOutstanding(pContract, previewReceipt, angsuran) : 0;
                    return (
                      <div className="space-y-1.5 py-1 text-[11px]">
                        <div className="flex justify-between">
                          <span>Pokok Pinjaman:</span>
                          <span className="font-bold font-mono">{formatRupiah(principal)}</span>
                        </div>
                        <div className="flex justify-between text-amber-700 dark:text-amber-400">
                          <span>Jasa Pinjaman:</span>
                          <span className="font-bold font-mono">{formatRupiah(interest)}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 dark:text-white font-bold text-sm border-t border-dashed pt-2 mt-1">
                          <span>JUMLAH BAYAR:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono">{formatRupiah(previewReceipt.jumlahBayar)}</span>
                        </div>
                        {pContract && (
                          <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold text-xs pt-1">
                            <span>SISA POKOK PINJAMAN:</span>
                            <span className="font-mono">{formatRupiah(remaining)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => {
                    const m = members.find(mem => mem.id === previewReceipt.anggotaId);
                    if (m) {
                      const resume = calculateMemberLedgerResume(previewReceipt.anggotaId, simpanan, pinjaman, angsuran);
                      const url = createWhatsAppThankYouUrl(
                        m.noHp,
                        m.nama,
                        m.noAnggota,
                        setup.namaKoperasi,
                        `Angsuran Pinjaman Bulan Ke-${previewReceipt.bulanKe}`,
                        previewReceipt.jumlahBayar,
                        previewReceipt.tanggal,
                        `CTR-${previewReceipt.pinjamanId.substring(0,8)}`,
                        previewReceipt.keterangan,
                        resume,
                        previewReceipt.anggotaId
                      );
                      window.open(url, '_blank');
                    } else {
                      alert('Data anggota tidak ditemukan!');
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow cursor-pointer"
                  title="Kirim Ucapan Terima Kasih via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WA Terima Kasih
                </button>
                <button 
                  onClick={() => {
                    handlePrintSingle(previewReceipt);
                    setPreviewReceipt(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button 
                  onClick={() => setPreviewReceipt(null)}
                  className="px-3.5 py-2 border dark:border-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DIVIDEN JASA MANASUKA POPUP */}
      <AnimatePresence>
        {isManasukaModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  Kalkulator Jasa Dividen Simpanan Manasuka ({setup.jasaSimpananSukarelaPersen}%)
                </h3>
                <button onClick={() => setIsManasukaModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              {/* Toolbar */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b flex flex-wrap gap-4 items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <select value={targetBulan} onChange={(e) => setTargetBulan(e.target.value)} className="p-1.5 border rounded bg-white text-slate-700 font-bold">
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                  </select>
                  <select value={targetTahun} onChange={(e) => setTargetTahun(e.target.value)} className="p-1.5 border rounded bg-white text-slate-700 font-bold">
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                  <button onClick={handleCalculateManasuka} className="bg-slate-800 hover:bg-slate-900 text-white font-bold p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer shadow">
                    Kalkulasi Jasa
                  </button>
                </div>
                
                <button 
                  onClick={handlePostAllInterest}
                  disabled={calculatedLogs.length === 0 || logsPosted}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg cursor-pointer shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5"/> Posting & Distribusikan Bunga
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-4 py-2">ID Anggota</th>
                      <th className="px-4 py-2">Nama</th>
                      <th className="px-4 py-2">Total Tabungan</th>
                      <th className="px-4 py-2">Dividen ({setup.jasaSimpananSukarelaPersen}%)</th>
                      <th className="px-4 py-2 text-center">WA Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-mono">
                    {calculatedLogs.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Silakan klik 'Kalkulasi Jasa' di atas.</td></tr>
                    ) : (
                      calculatedLogs.map((log, id) => {
                        const m = members.find(mem => mem.id === log.anggotaId);
                        return (
                          <tr key={id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{m?.noAnggota}</td>
                            <td className="px-4 py-2 font-sans">{m?.nama}</td>
                            <td className="px-4 py-2">{formatRupiah(log.totalSimpanan)}</td>
                            <td className="px-4 py-2 font-bold text-emerald-600">{formatRupiah(log.jumlahApresiasi)}</td>
                            <td className="px-4 py-2 text-center">
                              <button 
                                onClick={() => m && triggerWhatsAppRedirect(m, log.totalSimpanan, log.jumlahApresiasi)}
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white font-sans text-[10px] rounded"
                              >
                                Kirim WA
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: WARNING MODAL FOR INSTALLMENT MISMATCH BEFORE SAVING */}
      <AnimatePresence>
        {showInstallmentMismatchModal && installmentMismatchInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-700/80 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-start gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl shrink-0 backdrop-blur-xs">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-extrabold text-base tracking-tight leading-tight">
                    Peringatan: Jumlah Angsuran Tidak Sesuai Standar Akad
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5 leading-snug">
                    Nominal pokok atau jasa yang diinput berbeda dari jumlah yang seharusnya dibayar berdasarkan perjanjian pinjaman.
                  </p>
                </div>
                <button 
                  onClick={() => setShowInstallmentMismatchModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Member & Loan info */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block uppercase tracking-wider">Anggota Peminjam</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-100">{installmentMismatchInfo.memberNama}</span>
                    <span className="text-slate-500 font-mono text-[11px] ml-1.5">({installmentMismatchInfo.memberNo})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tagihan Angsuran</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">Bulan Ke-{installmentMismatchInfo.bulanKe}</span>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3.5 py-2.5">Komponen</th>
                        <th className="px-3 py-2.5 text-right">Standar Akad</th>
                        <th className="px-3 py-2.5 text-right">Input Anda</th>
                        <th className="px-3.5 py-2.5 text-right">Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-mono text-[11.5px]">
                      {/* Pokok */}
                      <tr className={installmentMismatchInfo.diffPokok !== 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                        <td className="px-3.5 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">
                          Angsuran Pokok
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatRupiah(installmentMismatchInfo.expectedPokok)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-850 dark:text-slate-100">
                          {formatRupiah(installmentMismatchInfo.inputPokok)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-bold">
                          {installmentMismatchInfo.diffPokok === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Sesuai</span>
                          ) : installmentMismatchInfo.diffPokok > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+{formatRupiah(installmentMismatchInfo.diffPokok)}</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">-{formatRupiah(Math.abs(installmentMismatchInfo.diffPokok))}</span>
                          )}
                        </td>
                      </tr>

                      {/* Jasa */}
                      <tr className={installmentMismatchInfo.diffJasa !== 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                        <td className="px-3.5 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">
                          Jasa Pinjaman (Bunga)
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatRupiah(installmentMismatchInfo.expectedJasa)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-850 dark:text-slate-100">
                          {formatRupiah(installmentMismatchInfo.inputJasa)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-bold">
                          {installmentMismatchInfo.diffJasa === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Sesuai</span>
                          ) : installmentMismatchInfo.diffJasa > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+{formatRupiah(installmentMismatchInfo.diffJasa)}</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">-{formatRupiah(Math.abs(installmentMismatchInfo.diffJasa))}</span>
                          )}
                        </td>
                      </tr>

                      {/* Total */}
                      <tr className="bg-slate-50 dark:bg-slate-850/80 font-bold border-t border-slate-200 dark:border-slate-700">
                        <td className="px-3.5 py-2.5 font-sans text-slate-900 dark:text-white">
                          Total Pembayaran
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                          {formatRupiah(installmentMismatchInfo.expectedTotal)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-400">
                          {formatRupiah(installmentMismatchInfo.inputTotal)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          {installmentMismatchInfo.diffTotal === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Sesuai</span>
                          ) : installmentMismatchInfo.diffTotal > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs">+{formatRupiah(installmentMismatchInfo.diffTotal)} (Lebih)</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 text-xs">-{formatRupiah(Math.abs(installmentMismatchInfo.diffTotal))} (Kurang)</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Impact notes */}
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>Sisa Pokok Pinjaman Saat Ini:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatRupiah(installmentMismatchInfo.sisaPokokSaatIni)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>Estimasi Sisa Pokok Setelah Bayar:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatRupiah(installmentMismatchInfo.sisaPokokSetelahBayar)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 italic leading-relaxed">
                    💡 Pilih <b>"Sesuaikan ke Standar Tagihan"</b> untuk mengembalikan angka ke standar akad, atau pilih <b>"Ya, Tetap Simpan Transaksi Ini"</b> jika anggota memang membayar secara khusus/kustom.
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstallmentMismatchModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition text-center"
                >
                  Koreksi / Periksa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAngsuranPokok(formatInputRupiah(String(installmentMismatchInfo.expectedPokok)));
                    setAngsuranJasa(formatInputRupiah(String(installmentMismatchInfo.expectedJasa)));
                    setShowInstallmentMismatchModal(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-xs rounded-xl cursor-pointer transition text-center"
                >
                  Sesuaikan Standar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallmentMismatchModal(false);
                    handleUnifiedSubmit(undefined, true);
                  }}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer transition text-center shadow-md shadow-amber-600/20"
                >
                  Ya, Tetap Simpan Transaksi
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Modal Preview Bukti Transfer */}
        {previewBuktiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate pr-2">
                  {previewBuktiModal.title || 'Bukti Transfer / Resi Setoran'}
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewBuktiModal(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950/20 max-h-[70vh]">
                <img
                  src={previewBuktiModal.url}
                  alt="Bukti Transfer"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewBuktiModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
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
  );
}
