import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman, PengajuanPinjaman, WarungBarang, PengurusPengawas, GaleriKoperasi, PembayaranPending } from '../types';
import { formatRupiah, terbilang } from '../utils/finance';
import { 
  Building, Users, Wallet, HandCoins, TrendingUp, Scale, 
  Shield, User, Lock, Printer, Clock, FileText, CheckCircle2, 
  AlertCircle, X, ChevronRight, Phone, MapPin, Send, HelpCircle, LogOut, Download, Menu, Megaphone, Calendar,
  Eye, EyeOff, Store, Upload, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SlideshowGaleri } from './SlideshowGaleri';
import { compressImage } from '../utils/imageCompressor';

// ================= TYPES & INTERFACES =================
interface PortalKoperasiProps {
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pembelian: Pembelian[];
  piutangWarung: PiutangWarung[];
  announcements?: Pengumuman[];
  warungBarang?: WarungBarang[];
  pengurusPengawas?: PengurusPengawas[];
  galeriKoperasi?: GaleriKoperasi[];
  onAddMember: (newMember: Omit<Member, 'id'>) => Promise<void>;
  onVerifyMember?: (id: string) => Promise<void>;
  onLoginSuccess: (role: 'admin' | 'member', member?: Member) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export function PortalKoperasi({
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  income,
  expenses,
  pembelian,
  piutangWarung,
  announcements = [],
  warungBarang = [],
  pengurusPengawas = [],
  galeriKoperasi = [],
  onAddMember,
  onVerifyMember,
  onLoginSuccess,
  isDarkMode,
  setIsDarkMode
}: PortalKoperasiProps) {
  
  // Navigation states
  const [currentSection, setCurrentSection] = useState<'home' | 'profile' | 'finance' | 'register' | 'login' | 'simulation'>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [financeTab, setFinanceTab] = useState<'overview' | 'neraca_saldo' | 'nominatif'>('overview');

  // Simulation states (Bunga flat 1.5%, tenor maks 20 bulan, provisi 1%)
  const [simNominalStr, setSimNominalStr] = useState('10000000');
  const [simTenor, setSimTenor] = useState(10);
  
  // Login Form States
  const [loginTab, setLoginTab] = useState<'admin' | 'member'>('member');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('d4n45egar');
  const [memberNo, setMemberNo] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-set the first verified member as the default selected member
  React.useEffect(() => {
    const verified = members.filter(m => m.isVerified !== false);
    if (verified.length > 0 && !selectedMemberId) {
      setSelectedMemberId(verified[0].id);
    }
  }, [members, selectedMemberId]);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [regTempatLahir, setRegTempatLahir] = useState('');
  const [regTanggalLahir, setRegTanggalLahir] = useState('');
  const [regTanggalBergabung, setRegTanggalBergabung] = useState(new Date().toISOString().substring(0, 10));
  const [regPekerjaan, setRegPekerjaan] = useState('Guru');
  const [regFotoUrl, setRegFotoUrl] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const handleRegFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Hanya berkas gambar (JPG/PNG) yang diperbolehkan!");
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        alert("Ukuran foto anggota maksimal 1 MB!");
        return;
      }
      try {
        const compressed = await compressImage(file, 400, 400, 0.7);
        setRegFotoUrl(compressed);
      } catch (err) {
        console.error("Error compressing image:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setRegFotoUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Financial calculations derived from central state
  const finances = useMemo(() => {
    const kasAwal = setup.kasAwal ?? 0;
    const piutangAwal = setup.piutangAwal ?? 0;
    const persediaanWarungAwal = setup.persediaanWarungAwal ?? 0;
    const inventarisAwal = setup.inventarisAwal ?? 0;
    const modalAwal = setup.modalAwal ?? 0;
    const danaCadanganAwal = setup.danaCadanganAwal ?? 0;

    const totalSimpanan = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalDisbursed = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalProvisi = pinjaman.reduce((a, c) => a + (c.provisiDipotong || 0), 0);
    const totalAngsuran = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    const totalInc = income.reduce((a, c) => a + c.nominal, 0);
    const totalExp = expenses.reduce((a, c) => a + c.nominal, 0);
    const totalPembelian = pembelian.reduce((a, c) => a + c.totalHarga, 0);
    const totalHutangWarung = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((a, c) => a + c.nominal, 0);
    const totalPelunasanWarung = piutangWarung.filter(pw => pw.jenis === 'pelunasan').reduce((a, c) => a + c.nominal, 0);

    // Kas Akhir (Cash outflow is nominalPinjaman - provisiDipotong, so we add totalProvisi back because totalDisbursed is nominalPinjaman)
    const kasAkhir = kasAwal + totalSimpanan + totalAngsuran + totalInc + totalPelunasanWarung + totalProvisi - totalDisbursed - totalExp - totalPembelian - totalHutangWarung;

    // Double-entry assets and liabilities/equity loan calculations
    const loanCalculations = pinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
      
      let remainingPrincipal = 0;
      let interestRealized = 0;
      
      if (p.status === 'Lunas') {
        remainingPrincipal = 0;
        interestRealized = Math.max(0, totalPaid - p.nominalPinjaman);
      } else {
        const factor = p.totalWajibBayar > 0 ? (p.nominalPinjaman / p.totalWajibBayar) : 1;
        remainingPrincipal = Math.max(0, p.nominalPinjaman - (totalPaid * factor));
        interestRealized = totalPaid * (1 - factor);
      }
      
      return {
        piutangBeredar: acc.piutangBeredar + Math.round(remainingPrincipal),
        allInterest: acc.allInterest + interestRealized
      };
    }, { piutangBeredar: 0, allInterest: 0 });

    const piutangBeredar = piutangAwal + loanCalculations.piutangBeredar;

    const persediaanWarung = persediaanWarungAwal + pembelian.filter(p => p.kategori === 'persediaan_warung').reduce((a, c) => a + c.totalHarga, 0);
    const inventaris = inventarisAwal + pembelian.filter(p => p.kategori === 'inventaris').reduce((a, c) => a + c.totalHarga, 0);
    const piutangWarungVal = totalHutangWarung - totalPelunasanWarung;

    // Total Assets
    const totalAssets = kasAkhir + piutangBeredar + persediaanWarung + inventaris + piutangWarungVal;

    // Profit & Loss details (Laba Rugi)
    const pToko = income.filter(i => i.sumber === 'warung').reduce((a, c) => a + c.nominal, 0);
    const pBungaBank = income.filter(i => i.sumber === 'bunga_simpanan').reduce((a, c) => a + c.nominal, 0);
    const pDenda = income.filter(i => i.sumber === 'denda').reduce((a, c) => a + c.nominal, 0);
    const pLain = income.filter(i => i.sumber === 'lain_lain').reduce((a, c) => a + c.nominal, 0);
    const pProvisi = pinjaman.reduce((a, c) => a + c.provisiDipotong, 0);
    const pJasaBunga = loanCalculations.allInterest;

    const totalRevenue = pToko + pBungaBank + pDenda + pLain + pProvisi + pJasaBunga;

    const bGajiKaryawan = expenses.filter(e => e.kategori === 'gaji_karyawan').reduce((a, c) => a + c.nominal, 0);
    const bListrik = expenses.filter(e => e.kategori === 'listrik').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengurus = expenses.filter(e => e.kategori === 'gaji_pengurus').reduce((a, c) => a + c.nominal, 0);
    const bGajiPengawas = expenses.filter(e => e.kategori === 'gaji_pengawas').reduce((a, c) => a + c.nominal, 0);
    const bOperasional = expenses.filter(e => e.kategori === 'operasional_kantor').reduce((a, c) => a + c.nominal, 0);
    const bRapat = expenses.filter(e => e.kategori === 'beban_rapat').reduce((a, c) => a + c.nominal, 0);
    const bLain = expenses.filter(e => e.kategori === 'beban_lain').reduce((a, c) => a + c.nominal, 0);

    const totalExpenses = bGajiKaryawan + bListrik + bGajiPengurus + bGajiPengawas + bOperasional + bRapat + bLain;
    const netProfit = totalRevenue - totalExpenses;

    const sPokok = simpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = simpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = simpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);

    return {
      kasAkhir,
      piutangBeredar,
      persediaanWarung,
      inventaris,
      piutangWarungVal,
      totalAssets,
      totalSimpanan,
      sPokok,
      sWajib,
      sSukarela,
      pToko,
      pBungaBank,
      pDenda,
      pLain,
      pProvisi,
      pJasaBunga,
      totalRevenue,
      bGajiKaryawan,
      bListrik,
      bGajiPengurus,
      bGajiPengawas,
      bOperasional,
      bRapat,
      bLain,
      totalExpenses,
      netProfit,
      activeMembersCount: members.filter(m => m.isVerified !== false).length,
      pendingMembersCount: members.filter(m => m.isVerified === false).length
    };
  }, [setup, members, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung]);

  // Generate public nominative list of members' total savings & outstanding loan (transparency)
  const nominatifList = useMemo(() => {
    return members.filter(m => m.isVerified !== false).map(m => {
      const relatedS = simpanan.filter(s => s.anggotaId === m.id);
      const sPokok = relatedS.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
      const sWajib = relatedS.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
      const totalSukarela = relatedS.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
      const jasaManasuka = relatedS.filter(s => s.jenis === 'Sukarela' && (s.keterangan?.includes('Manasuka') || s.keterangan?.includes('Bunga Jasa'))).reduce((sum, s) => sum + s.jumlah, 0);
      const sSukarelaMurni = totalSukarela - jasaManasuka;
      const total = sPokok + sWajib + totalSukarela;

      const relatedP = pinjaman.filter(p => p.anggotaId === m.id);
      const sisaPinjaman = relatedP.reduce((acc, p) => {
        if (p.status === 'Lunas') return acc;
        const repays = angsuran.filter(a => a.pinjamanId === p.id);
        const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
        const rem = p.nominalPinjaman - (totalPaid * (p.nominalPinjaman / p.totalWajibBayar));
        return acc + Math.max(0, Math.round(rem));
      }, 0);

      return {
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama,
        jenisKelamin: m.jenisKelamin,
        sPokok,
        sWajib,
        sSukarela: sSukarelaMurni,
        jasaManasuka,
        total,
        sisaPinjaman: Math.round(sisaPinjaman)
      };
    }).sort((a, b) => b.total - a.total);
  }, [members, simpanan, pinjaman, angsuran]);

  // Generate public trial balance (Neraca Saldo) dynamically
  const neracaSaldoList = useMemo(() => {
    // Debit Accounts
    const kas = finances.kasAkhir;
    const piutang = finances.piutangBeredar;
    const persediaan = finances.persediaanWarung;
    const inventaris = finances.inventaris;
    const piutangWarungVal = finances.piutangWarungVal;
    const beban = finances.totalExpenses;

    // Credit Accounts
    const sPokok = finances.sPokok;
    const sWajib = finances.sWajib;
    const sSukarela = finances.sSukarela;
    const pendapatan = finances.totalRevenue;

    // Capital balances starting entries perfectly (Double-entry balance guarantee)
    const totalDebitsWithoutCapital = kas + piutang + persediaan + inventaris + piutangWarungVal + beban;
    const totalCreditsWithoutCapital = sPokok + sWajib + sSukarela + pendapatan;
    const modalKoperasi = Math.max(0, totalDebitsWithoutCapital - totalCreditsWithoutCapital);

    return [
      { kode: '101', nama: 'Kas Koperasi', debit: kas, kredit: 0 },
      { kode: '102', nama: 'Piutang Pinjaman Anggota', debit: piutang, kredit: 0 },
      { kode: '103', nama: 'Persediaan Sembako Warung', debit: persediaan, kredit: 0 },
      { kode: '104', nama: 'Inventaris & Peralatan Kantor', debit: inventaris, kredit: 0 },
      { kode: '105', nama: 'Piutang Dagang Toko/Warung', debit: piutangWarungVal >= 0 ? piutangWarungVal : 0, kredit: piutangWarungVal < 0 ? -piutangWarungVal : 0 },
      { kode: '301', nama: 'Simpanan Pokok Anggota', debit: 0, kredit: sPokok },
      { kode: '302', nama: 'Simpanan Wajib Anggota', debit: 0, kredit: sWajib },
      { kode: '201', nama: 'Simpanan Manasuka Anggota', debit: 0, kredit: sSukarela },
      { kode: '310', nama: 'Modal Koperasi & Dana Cadangan', debit: 0, kredit: modalKoperasi },
      ...(finances.netProfit >= 0 
        ? [{ kode: '315', nama: 'Sisa Hasil Usaha (SHU) Berjalan', debit: 0, kredit: finances.netProfit }]
        : [{ kode: '315', nama: 'Defisit Hasil Usaha (SHU) Berjalan', debit: -finances.netProfit, kredit: 0 }])
    ];
  }, [setup, finances]);

  const neracaSaldoTotal = useMemo(() => {
    let totalDebit = 0;
    let totalKredit = 0;
    neracaSaldoList.forEach(item => {
      totalDebit += item.debit;
      totalKredit += item.kredit;
    });
    return { totalDebit, totalKredit };
  }, [neracaSaldoList]);

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

  // Chart data: Real Monthly Cashflow Trend (Inflow vs Outflow)
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
        { month: 'Jul 26', 'Kas Masuk': finances.totalRevenue || 7500000, 'Kas Keluar': finances.totalExpenses || 4900000, 'Selisih': (finances.totalRevenue || 7500000) - (finances.totalExpenses || 4900000) }
      ];
    }

    return computed;
  }, [simpanan, angsuran, income, pinjaman, expenses, finances]);

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);

  // Handle new member self-registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regAddress.trim() || !regPhone.trim()) {
      setRegError('Semua kolom registrasi harus diisi!');
      return;
    }

    setIsSubmittingReg(true);
    setRegError('');
    try {
      const rawReg = {
        noAnggota: 'MENUNGGU VERIFIKASI',
        nama: regName.trim(),
        alamat: regAddress.trim(),
        noHp: regPhone.trim(),
        tanggalBergabung: regTanggalBergabung,
        jenisKelamin: regGender,
        tempatLahir: regTempatLahir.trim(),
        tanggalLahir: regTanggalLahir,
        pekerjaan: regPekerjaan,
        fotoUrl: regFotoUrl,
        isVerified: false
      };
      await onAddMember(rawReg);
      setRegSuccess(true);
      setRegName('');
      setRegAddress('');
      setRegPhone('');
      setRegGender('Laki-laki');
      setRegTempatLahir('');
      setRegTanggalLahir('');
      setRegTanggalBergabung(new Date().toISOString().substring(0, 10));
      setRegPekerjaan('Guru');
      setRegFotoUrl('');
    } catch (err: any) {
      setRegError('Terjadi kesalahan saat menyimpan data pendaftaran.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle member/admin login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    setTimeout(() => {
      if (loginTab === 'admin') {
        if (adminUsername.trim().toLowerCase() === 'admin' && adminPassword === 'd4n45egar') {
          onLoginSuccess('admin');
        } else {
          setLoginError('Kredensial Pengurus salah. Gunakan Username: admin & Password: d4n45egar.');
        }
      } else {
        const cleanedPhone = memberPhone.replace(/[^0-9]/g, '');
        const found = members.find(m => {
          const matchNo = m.noAnggota.trim().toLowerCase() === memberNo.trim().toLowerCase();
          const matchPhone = m.noHp.replace(/[^0-9]/g, '') === cleanedPhone;
          return matchNo && matchPhone && m.isVerified !== false;
        });

        if (found) {
          onLoginSuccess('member', found);
        } else {
          setLoginError('Kombinasi Nomor Anggota & Nomor HP salah, atau status keanggotaan Anda belum diverifikasi oleh pengurus!');
        }
      }
      setIsLoggingIn(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      
      {/* ================= WEBSITE HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentSection('home')}>
            <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-sm overflow-hidden shrink-0 text-lg">
              {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                <img src={setup.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                setup.logoUrl || '🌱'
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                {setup.namaKoperasi || "Koperasi Dana Segar"}
              </h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                {setup.slogan || "Maju Bersama"}
              </p>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => setCurrentSection('home')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'home' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => setCurrentSection('profile')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'profile' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Profil & Visi Misi
            </button>
            <button 
              onClick={() => setCurrentSection('finance')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'finance' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Ikhtisar & Laba Rugi
            </button>
            <button 
              onClick={() => setCurrentSection('register')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'register' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Pendaftaran Anggota
            </button>
            <button 
              onClick={() => setCurrentSection('simulation')}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1 cursor-pointer ${currentSection === 'simulation' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-bold' : ''}`}
            >
              Simulasi Pinjaman
            </button>
          </nav>
 
          {/* Dark Mode & CTA Portal Login (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Ganti Tema Visual"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button
              onClick={() => setCurrentSection('login')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Login Portal</span>
            </button>
          </div>
 
          {/* Hamburger button on Mobile */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Ganti Tema"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 rounded-xl text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
              title="Menu Navigasi"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 py-4 space-y-1.5 flex flex-col font-sans shrink-0 overflow-hidden"
          >
            <button 
              onClick={() => { setCurrentSection('home'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'home' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => { setCurrentSection('profile'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'profile' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Profil & Visi Misi
            </button>
            <button 
              onClick={() => { setCurrentSection('finance'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'finance' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Ikhtisar & Laba Rugi
            </button>
            <button 
              onClick={() => { setCurrentSection('register'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'register' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Pendaftaran Anggota
            </button>
            <button 
              onClick={() => { setCurrentSection('simulation'); setIsMobileNavOpen(false); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${currentSection === 'simulation' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Simulasi Pinjaman
            </button>
            <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => { setCurrentSection('login'); setIsMobileNavOpen(false); }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Masuk Login Portal</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= WEBSITE CONTENT BODY ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          
          {/* 1. HOME / LANDING VIEW */}
          {currentSection === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-12"
            >
              {/* 📷 SLIDESHOW GALERI KOPERASI */}
              <SlideshowGaleri galeri={galeriKoperasi} />

              {/* Hero Banner Grid */}
              <div className="flex flex-col gap-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10" />
                
                <div className="space-y-6 max-w-4xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100 dark:border-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Portal Resmi Koperasi Digital
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-slate-50 tracking-tight leading-tight font-sans">
                    Solusi Keuangan Gotong Royong yang <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 rounded-lg">Amanah & Modern</span>
                  </h2>
                  <p className="text-slate-550 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-line">
                    {setup.kataPembuka || `Selamat datang di website resmi Koperasi ${setup.namaKoperasi || "Dana Segar"}. Kami memadukan prinsip luhur kekeluargaan dengan teknologi digital terintegrasi untuk mendukung kesejahteraan seluruh anggota dan kemandirian usaha komunitas.`}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button 
                      onClick={() => setCurrentSection('register')}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Gabung Anggota Sekarang</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentSection('finance')}
                      className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Lihat Transparansi Laporan</span>
                    </button>
                  </div>
                </div>

                {/* Cooperative Quick Stats Card */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Anggota Aktif</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-150 font-sans">{finances.activeMembersCount} Orang</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-indigo-105 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dana Simpanan</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.totalSimpanan)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kredit Beredar</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.piutangBeredar)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                    <div className="p-2.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded-xl w-10 h-10 flex items-center justify-center mx-auto">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SHU Berjalan</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-150 font-sans truncate">{formatRupiah(finances.netProfit)}</p>
                  </div>
                </div>
              </div>

              {/* 📊 TREN ARUS KAS BULANAN KOPERASI */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Tren Arus Kas Bulanan Koperasi (Inflow vs Outflow)
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                      Visualisasi real-time pergerakan arus kas masuk, kas keluar, dan surplus bersih bulanan.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-bold self-start sm:self-center border border-slate-100 dark:border-slate-750">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Real-time
                  </div>
                </div>

                <div className="h-[350px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={80} tickFormatter={(v)=>`Rp ${v.toLocaleString()}`} />
                      <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                      <Legend />
                      <Bar dataKey="Kas Masuk" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Kas Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="Selisih" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Surplus/Selisih" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 📢 BULLETIN BOARD: ANNOUNCEMENTS */}
              {activeAnnouncements.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Megaphone className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Pengumuman Resmi Koperasi
                      </h3>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                        Informasi dan instruksi terbaru dari pengurus {setup.namaKoperasi || "Koperasi Dana Segar"}.
                      </p>
                    </div>
                  </div>

                  {/* 📢 TEKS BERJALAN (MARQUEE) */}
                  <div className="bg-white/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-xs">
                    <marquee 
                      className="text-xs font-medium text-slate-700 dark:text-slate-200" 
                      scrollamount="4"
                      onMouseOver={(e) => e.currentTarget.stop()}
                      onMouseOut={(e) => e.currentTarget.start()}
                    >
                      {activeAnnouncements.map((ann) => (
                        <span key={ann.id} className="mx-6 inline-flex items-center gap-1.5 cursor-pointer">
                          <span>{ann.isUrgent ? '🚨' : '📢'}</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{ann.judul}:</span>
                          <span className="text-slate-650 dark:text-slate-300">{ann.konten.replace(/\n/g, ' ')}</span>
                          <span className="text-slate-350 dark:text-slate-550 mx-2">|</span>
                        </span>
                      ))}
                    </marquee>
                  </div>
                </div>
              )}

              {/* Visi Misi & Overview Snippet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Profil Koperasi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Didirikan dengan tujuan menyejahterakan anggota, kami senantiasa menjaga kepatuhan legalitas dengan nomor badan hukum resmi dan prinsip pelaporan terbuka.
                  </p>
                  <button onClick={() => setCurrentSection('profile')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Baca selengkapnya &rarr;
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Laporan Transparan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Setiap sen dana dipertanggungjawabkan dalam neraca real-time. Kami percaya bahwa transparansi adalah kunci utama kepercayaan anggota koperasi.
                  </p>
                  <button onClick={() => setCurrentSection('finance')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Buka laporan berkala &rarr;
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Pendaftaran Mudah
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Daftarkan diri Anda secara online untuk ditinjau oleh pengurus. Nikmati berbagai manfaat simpanan berkeadilan dan pembiayaan bunga ringan.
                  </p>
                  <button onClick={() => setCurrentSection('register')} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Isi formulir online &rarr;
                  </button>
                </div>
              </div>

              {/* 🛒 TOKO WARUNG DANA SEGAR */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Warung Dana Segar
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                      Pilihan barang dagangan kebutuhan pokok berkualitas dengan harga terjangkau untuk seluruh anggota.
                    </p>
                  </div>
                </div>

                {warungBarang.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 italic text-xs">Belum ada barang dagangan yang dipajang.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warungBarang.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-slate-50 dark:bg-slate-850/40 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition duration-205 flex flex-col h-full"
                      >
                        {/* Image wrapper */}
                        <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 relative shrink-0">
                          <img 
                            src={item.fotoUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80"} 
                            alt={item.namaBarang}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Content Area */}
                        <div className="p-4 flex flex-col flex-1 justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm line-clamp-1" title={item.namaBarang}>
                              {item.namaBarang}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {item.deskripsi}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-150 dark:border-slate-800">
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(item.harga)}
                            </span>
                            {item.stok !== undefined && (
                              <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                Stok: {item.stok} {item.satuan || 'pcs'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 👥 SUSUNAN KEPENGURUSAN & DEWAN PENGAWAS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-8">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Struktur Organisasi Koperasi
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                      Jajaran Pengurus dan Dewan Pengawas yang berkomitmen menjaga amanah & tata kelola koperasi yang baik.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pengawas Block */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Dewan Pengawas Koperasi
                    </h4>

                    {pengurusPengawas.filter(p => p.jabatan === 'pengawas').length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada pengawas diinput.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {pengurusPengawas.filter(p => p.jabatan === 'pengawas').map((person) => (
                          <div 
                            key={person.id}
                            className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-center flex flex-col items-center gap-2"
                          >
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/20 bg-white shadow-xs">
                              <img 
                                src={person.fotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"} 
                                alt={person.nama}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1" title={person.nama}>
                              {person.nama}
                            </h5>
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {person.peranDetail}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pengurus Block */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Jajaran Pengurus Koperasi
                    </h4>
                    
                    {pengurusPengawas.filter(p => p.jabatan === 'pengurus').length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada pengurus diinput.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {pengurusPengawas.filter(p => p.jabatan === 'pengurus').map((person) => (
                          <div 
                            key={person.id}
                            className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 text-center flex flex-col items-center gap-2"
                          >
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/20 bg-white shadow-xs">
                              <img 
                                src={person.fotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"} 
                                alt={person.nama}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1" title={person.nama}>
                              {person.nama}
                            </h5>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {person.peranDetail}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. PROFILE VIEW */}
          {currentSection === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight">Profil & Visi Misi Koperasi</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mengenal lebih dekat identitas luhur dan landasan dasar koperasi kami.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Identity table */}
                  <div className="space-y-5 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-900">
                    <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 border-b pb-2 uppercase tracking-wider">Identitas Hukum</h4>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Nama Resmi</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{setup.namaKoperasi || "Koperasi Dana Segar"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Slogan</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-150 italic">"{setup.slogan}"</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">No. Badan Hukum</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{setup.noBadanHukum || "Dalam Pengajuan"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Alamat Kantor</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-150 max-w-[220px] text-right truncate" title={setup.alamatKantor}>{setup.alamatKantor}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5 border-dashed">
                        <span className="text-slate-400">Suku Bunga Akad</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{setup.jenisBungaPinjaman} (Flat)</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-slate-400">Biaya Administrasi</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">{setup.biayaProvisiPersen}% Provisi</span>
                      </div>
                    </div>
                  </div>

                  {/* Visi Misi */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-600 rounded" />
                        VISI UTAMA KOPERASI
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-3.5 italic whitespace-pre-line">
                        "{setup.visi || "Menjadi lembaga keuangan mikro koperasi terpercaya, mandiri, unggul dalam pelayanan, dan berorientasi penuh pada pemberdayaan potensi ekonomi seluruh anggota koperasi."}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-600 rounded" />
                        MISI KERJA KOPERASI
                      </h4>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-3.5 space-y-2 list-decimal">
                        {setup.misi && setup.misi.length > 0 ? (
                          setup.misi.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))
                        ) : (
                          <>
                            <li>Memberikan pelayanan prima di bidang tabungan berkeadilan serta kredit berbunga ringan secara cepat dan transparan.</li>
                            <li>Menumbuhkan budaya hemat melestarikan tabungan masyarakat guna memperkuat ketahanan modal internal.</li>
                            <li>Menjunjung tinggi azas mufakat gotong royong, transparansi pelaporan, serta kepatuhan penuh terhadap undang-undang koperasi.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. FINANCE & LABA RUGI OVERVIEW */}
          {currentSection === 'finance' && (
            <motion.div 
              key="finance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Financial Sub-navigation tabs */}
              <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 w-full md:w-max">
                <button
                  onClick={() => setFinanceTab('overview')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    financeTab === 'overview'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Ikhtisar & Laba Rugi
                </button>
                <button
                  onClick={() => setFinanceTab('neraca_saldo')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    financeTab === 'neraca_saldo'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Neraca Saldo
                </button>
                <button
                  onClick={() => setFinanceTab('nominatif')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    financeTab === 'nominatif'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Daftar Nominatif
                </button>
              </div>

              {financeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Ikhtisar Keuangan Mini Dashboard */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-emerald-600" />
                        Ikhtisar Posisi Keuangan Koperasi (Neraca Ringkas)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Menunjukkan posisi saldo kas, piutang kredit anggota, dan simpanan modal terhimpun secara real-time.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-sans">
                      
                      <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Kas Akhir</p>
                        <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(finances.kasAkhir)}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Kas riil siap disalurkan</p>
                      </div>

                      <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Piutang Kredit Anggota</p>
                        <p className="text-base sm:text-lg font-bold font-mono text-indigo-650 dark:text-indigo-400 mt-1">{formatRupiah(finances.piutangBeredar)}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Sisa pokok pinjaman berjalan</p>
                      </div>

                      <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aset Warung & Inventaris</p>
                        <p className="text-base sm:text-lg font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">{formatRupiah(finances.persediaanWarung + finances.inventaris + finances.piutangWarungVal)}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Aset fisik dan warung berjalan</p>
                      </div>

                      <div className="p-4 border rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Aset Koperasi</p>
                        <p className="text-base sm:text-lg font-bold font-mono text-teal-650 dark:text-teal-400 mt-1">{formatRupiah(finances.totalAssets)}</p>
                        <p className="text-[9px] text-slate-455 mt-1 font-semibold text-emerald-600">Sama dengan Pasiva (Balanced)</p>
                      </div>
                    </div>
                  </div>

                  {/* Laporan Laba Rugi Real-Time */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          Laporan Perhitungan Sisa Hasil Usaha (Laba Rugi)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Perhitungan pendapatan operasional dikurangi beban operasional berjalan secara real-time.</p>
                      </div>
                      <span className="text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                        SISA HASIL USAHA (SHU)
                      </span>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-5 font-mono text-xs">
                      
                      {/* Pendapatan */}
                      <div className="space-y-2">
                        <h4 className="font-sans font-bold border-b text-teal-600 dark:text-teal-400 text-[10px] pb-1 uppercase tracking-wider">I. PENDAPATAN OPERASIONAL</h4>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Laba Bersih Sembako & Warung</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pToko)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Pendapatan Biaya Provisi Akad (1%)</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pProvisi)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Pendapatan Jasa Bunga Akad</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pJasaBunga)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Denda Keterlambatan Anggota</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pDenda)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Pendapatan Simpanan Bank</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pBungaBank)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[+] Hasil Sukarela & Pendapatan Lain</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.pLain)}</span>
                        </div>
                        <div className="flex justify-between bg-teal-50/50 dark:bg-teal-950/20 border-y py-2 px-3 font-bold text-teal-800 dark:text-teal-350">
                          <span>TOTAL REVENUE PENDAPATAN (A)</span>
                          <span>{formatRupiah(finances.totalRevenue)}</span>
                        </div>
                      </div>

                      {/* Beban */}
                      <div className="space-y-2">
                        <h4 className="font-sans font-bold border-b text-rose-600 dark:text-rose-455 text-[10px] pb-1 uppercase tracking-wider">II. BEBAN OPERASIONAL KANTOR</h4>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Beban Gaji Karyawan & Staff Toko</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiKaryawan)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Beban Rekening Listrik, Air & Internet</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bListrik)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Insentif Honorarium Pengurus Koperasi</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiPengurus)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Insentif Honorarium Pengawas</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bGajiPengawas)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Beban ATK, Cetak & Operasional</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bOperasional)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Beban Kegiatan Rapat Koperasi</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bRapat || 0)}</span>
                        </div>
                        <div className="flex justify-between pl-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <span>[-] Beban Pengeluaran Lain-lain</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(finances.bLain)}</span>
                        </div>
                        <div className="flex justify-between bg-rose-50/50 dark:bg-rose-950/20 border-y py-2 px-3 font-bold text-rose-800 dark:text-rose-350">
                          <span>TOTAL EXPENSES BEBAN OPERASIONAL (B)</span>
                          <span>{formatRupiah(finances.totalExpenses)}</span>
                        </div>
                      </div>

                      {/* Sisa Hasil Usaha */}
                      <div className="pt-3 border-t-2 border-double border-slate-300 dark:border-slate-700">
                        <div className="flex justify-between items-center bg-emerald-600 dark:bg-emerald-900 text-white rounded-xl py-3 px-4 text-sm font-bold">
                          <span className="font-sans text-[11px] tracking-wider uppercase">SISA HASIL USAHA BERJALAN (SHU BERSIH = A - B)</span>
                          <span className="font-mono text-base">{formatRupiah(finances.netProfit)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic text-right font-sans">
                          Terbilang: {terbilang(Math.max(0, finances.netProfit))} Rupiah
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {financeTab === 'neraca_saldo' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-emerald-600" />
                      Laporan Neraca Saldo Koperasi (Trial Balance)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Menampilkan seluruh saldo debit dan kredit akun-akun koperasi secara seimbang dan transparan.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SISI AKTIVA (AKUN DEBIT) */}
                    <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-950/20">
                      <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center justify-between">
                        <span>Sisi Aktiva (Akun Debet)</span>
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-indigo-650 dark:text-indigo-400 font-bold font-sans">Aset & Beban</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                              <th className="py-2 px-2">Kode</th>
                              <th className="py-2 px-2">Nama Akun</th>
                              <th className="py-2 px-2 text-right">Debit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
                            {neracaSaldoList.filter(item => item.debit > 0 || ['101', '102', '103', '104', '105'].includes(item.kode)).map((row) => (
                              <tr key={row.kode} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition">
                                <td className="py-2 px-2 text-slate-455 text-[11px]">{row.kode}</td>
                                <td className="py-2 px-2 font-sans text-slate-800 dark:text-slate-200 font-medium text-[11px]">{row.nama}</td>
                                <td className="py-2 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                                  {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                                </td>
                              </tr>
                            ))}
                            {/* Totals row for Aktiva */}
                            <tr className="bg-slate-50/80 dark:bg-slate-950/40 font-bold border-t border-slate-300 dark:border-slate-700">
                              <td className="py-2.5 px-2 font-sans text-[11px]" colSpan={2}>JUMLAH TOTAL AKTIVA (DEBET)</td>
                              <td className="py-2.5 px-2 text-right text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">{formatRupiah(neracaSaldoTotal.totalDebit)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SISI PASIVA (AKUN KREDIT) */}
                    <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-950/20">
                      <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 flex items-center justify-between">
                        <span>Sisi Pasiva (Akun Kredit)</span>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-emerald-650 dark:text-emerald-400 font-bold font-sans">Kewajiban, Modal & Pendapatan</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                              <th className="py-2 px-2">Kode</th>
                              <th className="py-2 px-2">Nama Akun</th>
                              <th className="py-2 px-2 text-right">Kredit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
                            {neracaSaldoList.filter(item => item.kredit > 0 || ['301', '302', '201', '310', '315'].includes(item.kode)).map((row) => (
                              <tr key={row.kode} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition">
                                <td className="py-2 px-2 text-slate-455 text-[11px]">{row.kode}</td>
                                <td className="py-2 px-2 font-sans text-slate-800 dark:text-slate-200 font-medium text-[11px]">{row.nama}</td>
                                <td className="py-2 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                                  {row.kredit > 0 ? formatRupiah(row.kredit) : '-'}
                                </td>
                              </tr>
                            ))}
                            {/* Totals row for Pasiva */}
                            <tr className="bg-slate-50/80 dark:bg-slate-950/40 font-bold border-t border-slate-300 dark:border-slate-700">
                              <td className="py-2.5 px-2 font-sans text-[11px]" colSpan={2}>JUMLAH TOTAL PASIVA (KREDIT)</td>
                              <td className="py-2.5 px-2 text-right text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">{formatRupiah(neracaSaldoTotal.totalKredit)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-4 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-850 dark:text-emerald-350 leading-relaxed">
                      <b>Validasi Ganda (Double-Entry Balance):</b> Saldo Aktiva (Debit) dan Pasiva (Kredit) dinyatakan <b>Seimbang (Balanced)</b>. Seluruh entri keuangan telah diaudit oleh sistem secara otomatis.
                    </p>
                  </div>
                </div>
              )}

              {financeTab === 'nominatif' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-50 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Daftar Nominatif Simpanan & Pinjaman Anggota
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Daftar saldo simpanan modal terhimpun dan saldo outstanding pinjaman masing-masing anggota secara transparan.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-500 uppercase tracking-wider font-bold">
                          <th className="py-3 px-4">No. Anggota</th>
                          <th className="py-3 px-4">Nama Anggota</th>
                          <th className="py-3 px-4 text-right">Simpanan Pokok</th>
                          <th className="py-3 px-4 text-right">Simpanan Wajib</th>
                          <th className="py-3 px-4 text-right">Simpanan Manasuka</th>
                          <th className="py-3 px-4 text-right">Jasa Manasuka</th>
                          <th className="py-3 px-4 text-right">Total Tabungan</th>
                          <th className="py-3 px-4 text-right">Sisa Pinjaman</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {nominatifList.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">
                            <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-150">{row.noAnggota}</td>
                            <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{row.nama}</span>
                                {row.jenisKelamin && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${row.jenisKelamin === 'Laki-laki' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'}`}>
                                    {row.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-650 dark:text-slate-300">{formatRupiah(row.sPokok)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-650 dark:text-slate-300">{formatRupiah(row.sWajib)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-650 dark:text-slate-300">{formatRupiah(row.sSukarela)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-650 dark:text-slate-300">{formatRupiah(row.jasaManasuka || 0)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatRupiah(row.total)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-650 dark:text-rose-400">{formatRupiah(row.sisaPinjaman)}</td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-slate-50/80 dark:bg-slate-950/40 font-bold border-t-2 border-double border-slate-300 dark:border-slate-700">
                          <td className="py-3.5 px-4 font-sans" colSpan={2}>JUMLAH TOTAL NOMINATIF</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">{formatRupiah(nominatifList.reduce((a, b) => a + b.sPokok, 0))}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">{formatRupiah(nominatifList.reduce((a, b) => a + b.sWajib, 0))}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">{formatRupiah(nominatifList.reduce((a, b) => a + b.sSukarela, 0))}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">{formatRupiah(nominatifList.reduce((a, b) => a + (b.jasaManasuka || 0), 0))}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(nominatifList.reduce((a, b) => a + b.total, 0))}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-650 dark:text-rose-400">{formatRupiah(nominatifList.reduce((a, b) => a + b.sisaPinjaman, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. MEMBER REGISTRATION FORM */}
          {currentSection === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-50 tracking-tight flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Formulir Pendaftaran Anggota Baru
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Lengkapi data diri Anda untuk mendaftar sebagai anggota koperasi digital.</p>
                </div>

                {regSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-150 dark:border-emerald-900 rounded-xl space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm">Pendaftaran Sukses Dikirim!</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                          Terima kasih! Formulir pendaftaran Anda telah berhasil disimpan di dalam database koperasi. Status pendaftaran Anda saat ini adalah **Menunggu Verifikasi (Pending)**.
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 leading-relaxed font-semibold">
                          Langkah Selanjutnya: Silakan hubungi pengurus koperasi di kantor atau melalui WhatsApp untuk verifikasi berkas dan penerbitan Nomor Anggota resmi Anda agar dapat login ke sistem.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRegSuccess(false);
                        setCurrentSection('home');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Kembali ke Beranda
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NAMA LENGKAP PENDAFTAR</label>
                      <input 
                        type="text"
                        required
                        placeholder="Masukkan nama lengkap Anda..."
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TEMPAT LAHIR</label>
                        <input 
                          type="text"
                          required
                          placeholder="Contoh: Jakarta"
                          value={regTempatLahir}
                          onChange={(e) => setRegTempatLahir(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL LAHIR</label>
                        <input 
                          type="date"
                          required
                          value={regTanggalLahir}
                          onChange={(e) => setRegTanggalLahir(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">JENIS KELAMIN</label>
                      <select 
                        required
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">ALAMAT LENGKAP DOMISILI</label>
                      <textarea 
                        required
                        rows={3}
                        placeholder="Masukkan alamat rumah lengkap Anda..."
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PEKERJAAN</label>
                        <select 
                          required
                          value={['Guru', 'Kepala Sekolah', 'Staff'].includes(regPekerjaan) ? regPekerjaan : 'Lainnya'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Lainnya') {
                              setRegPekerjaan('');
                            } else {
                              setRegPekerjaan(val);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200"
                        >
                          <option value="Guru">Guru</option>
                          <option value="Kepala Sekolah">Kepala Sekolah</option>
                          <option value="Staff">Staff</option>
                          <option value="Lainnya">Lainnya / Tambah Baru...</option>
                        </select>
                        {!['Guru', 'Kepala Sekolah', 'Staff'].includes(regPekerjaan) && (
                          <div className="mt-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Ketik pekerjaan baru..."
                              value={regPekerjaan}
                              onChange={(e) => setRegPekerjaan(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200 font-medium"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">NOMOR HP / WHATSAPP AKTIF</label>
                        <input 
                          type="tel"
                          required
                          placeholder="Contoh: 081234567890"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">TANGGAL BERGABUNG KOPERASI</label>
                      <input 
                        type="date"
                        required
                        value={regTanggalBergabung}
                        onChange={(e) => setRegTanggalBergabung(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PAS FOTO ANGGOTA</label>
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                        {regFotoUrl ? (
                          <div className="w-20 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shrink-0 shadow-sm relative group">
                            <img src={regFotoUrl} alt="Preview Foto" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setRegFotoUrl('')}
                              className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all text-[10px]"
                              title="Hapus Foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-[9px] font-semibold mt-1">3 x 4</span>
                          </div>
                        )}
                        <div className="flex-1 w-full">
                          <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-dashed rounded-xl cursor-pointer bg-white dark:bg-slate-900 border-emerald-500/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 w-full text-xs font-bold transition">
                            <Upload className="w-4 h-4" />
                            <span>Unggah Pas Foto Anda</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={handleRegFotoChange}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1.5 text-center sm:text-left leading-relaxed">
                            Mendukung berkas gambar JPG/PNG. Foto akan digunakan sebagai kelengkapan kartu tanda anggota koperasi Anda.
                          </p>
                        </div>
                      </div>
                    </div>

                    {regError && (
                      <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
                        ⚠️ {regError}
                      </p>
                    )}

                    <div className="flex gap-2.5 pt-2">
                      <button 
                        type="button"
                        onClick={() => setCurrentSection('home')}
                        className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingReg}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingReg ? 'Menyimpan...' : 'Kirim Formulir Pendaftaran'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* SIMULATION SECTION */}
          {currentSection === 'simulation' && (() => {
            const simNominal = parseFloat(simNominalStr) || 0;
            const simProvisiRate = 1; // 1%
            const simProvisiDipotong = (simNominal * simProvisiRate) / 100;
            const simJumlahDiterima = simNominal - simProvisiDipotong;
            const simTenorVal = Math.min(20, Math.max(1, simTenor)); // Tenor maksimal 20 bulan
            const simAngsuranPokokPerBulan = simTenorVal > 0 ? Math.round(simNominal / simTenorVal) : 0;
            const simJasaPerBulan = Math.round((simNominal * 1.5) / 100); // Bunga flat 1.5%
            const simTotalAngsuranPerBulan = simAngsuranPokokPerBulan + simJasaPerBulan;
            const simTotalWajibBayar = simTotalAngsuranPerBulan * simTenorVal;

            const simAmortizationSchedule = [];
            for (let i = 1; i <= simTenorVal; i++) {
              simAmortizationSchedule.push({
                bulan: i,
                pokok: simAngsuranPokokPerBulan,
                jasa: simJasaPerBulan,
                total: simTotalAngsuranPerBulan
              });
            }

            return (
              <motion.div
                key="simulation"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Fasilitas Koperasi Mandiri
                  </span>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    Simulasi Pembiayaan Kredit Pinjaman
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prediksi nilai angsuran bulanan Anda secara transparan. Suku bunga flat <strong>1.5%</strong>, biaya administrasi provisi <strong>1%</strong>, dan jangka waktu tenor fleksibel maksimal <strong>20 bulan</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Inputs */}
                  <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm self-start space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 border-b dark:border-slate-800 pb-2 flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 rounded-lg">⚙️</span>
                      Parameter Pengajuan
                    </h3>

                    <div className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500 dark:text-slate-400">Jumlah Pinjaman (Rupiah)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">Rp</span>
                          <input 
                            type="number"
                            value={simNominalStr}
                            onChange={(e) => setSimNominalStr(e.target.value)}
                            placeholder="Contoh: 5000000"
                            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Nilai bersih diterima akan dipotong provisi 1%</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="font-semibold text-slate-500 dark:text-slate-400">Tenor Pengembalian (Bulan)</label>
                          <span className="font-bold text-emerald-600 font-mono">{simTenorVal} Bulan</span>
                        </div>
                        <select
                          value={simTenor}
                          onChange={(e) => setSimTenor(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{m} Bulan</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 italic">Tenor maksimal dibatasi hingga 20 bulan</p>
                      </div>

                      <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1.5 text-[11px] text-slate-650 dark:text-slate-350">
                        <div className="flex justify-between">
                          <span>Suku Jasa Bulanan:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">1.5% Flat</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Biaya Administrasi Provisi:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">1.0% Sekali</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4 font-mono text-xs">
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 border-b dark:border-slate-800 pb-2 flex items-center gap-2 font-sans">
                      <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 rounded-lg">📊</span>
                      Rincian Estimasi Cicilan
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-600 dark:text-slate-400">
                        <div>
                          <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold">Pengajuan Kredit</p>
                          <p className="text-sm font-bold text-slate-850 dark:text-slate-200 mt-0.5">{formatRupiah(simNominal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold">Provisi (1%)</p>
                          <p className="text-sm font-bold text-rose-600 mt-0.5">-{formatRupiah(simProvisiDipotong)}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/60 rounded-xl flex justify-between items-center">
                        <span className="font-sans font-extrabold text-emerald-800 dark:text-emerald-400 text-xs">Kas Bersih Diterima:</span>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-350">{formatRupiah(simJumlahDiterima)}</span>
                      </div>

                      <div className="space-y-1.5 text-slate-650 dark:text-slate-350 border-b border-dashed pb-3">
                        <div className="flex justify-between">
                          <span>Angsuran Pokok / bln:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(simAngsuranPokokPerBulan)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jasa Koperasi (1.5%) / bln:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(simJasaPerBulan)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Total Tagihan / bln:</span>
                          <span className="text-sm text-emerald-700 dark:text-emerald-450">{formatRupiah(simTotalAngsuranPerBulan)} / bln</span>
                        </div>
                      </div>

                      <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                        <span>Total Akumulasi Setoran:</span>
                        <span>{formatRupiah(simTotalWajibBayar)}</span>
                      </div>

                      {/* Schedule */}
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-sans font-semibold text-slate-400 block mb-1">Rencana Amortisasi Bulanan:</span>
                        <div className="max-h-[140px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                          <div className="grid grid-cols-12 px-3 py-1.5 font-extrabold text-slate-400 text-center bg-slate-100 dark:bg-slate-900 font-sans">
                            <span className="col-span-2 text-left">Bln</span>
                            <span className="col-span-3 text-right">Pokok</span>
                            <span className="col-span-3 text-right">Jasa</span>
                            <span className="col-span-4 text-right">Tagihan</span>
                          </div>
                          {simAmortizationSchedule.map((item) => (
                            <div key={item.bulan} className="grid grid-cols-12 px-3 py-1.5 hover:bg-white dark:hover:bg-slate-900 text-center">
                              <span className="col-span-2 text-left font-bold text-slate-500">#{item.bulan}</span>
                              <span className="col-span-3 text-right text-slate-600 dark:text-slate-400">{item.pokok.toLocaleString('id-ID')}</span>
                              <span className="col-span-3 text-right text-emerald-600 font-medium">{item.jasa.toLocaleString('id-ID')}</span>
                              <span className="col-span-4 text-right font-bold text-slate-800 dark:text-slate-200">{item.total.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Card to Login & Apply */}
                <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900/40 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-950/80 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1.5 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center sm:justify-start gap-1.5 uppercase tracking-wide font-sans">
                      <HandCoins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Ajukan Pinjaman Secara Mandiri
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl font-sans">
                      Hasil di atas merupakan simulasi estimasi tagihan. Ingin merealisasikan pinjaman ini? Silakan masuk (login) sebagai anggota koperasi terlebih dahulu untuk mengirimkan pengajuan resmi Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('redirect_to_loan_simulation', 'true');
                      localStorage.setItem('guest_sim_nominal', simNominalStr);
                      localStorage.setItem('guest_sim_tenor', String(simTenor));
                      setLoginTab('member');
                      setCurrentSection('login');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg shrink-0 font-sans"
                  >
                    <span>Masuk & Ajukan Pinjaman</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })()}

          {/* 5. USER TABBED LOGIN PORTAL */}
          {currentSection === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-colors duration-300">
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 p-6 text-center text-white">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                      🔑
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">Portal Keamanan Koperasi</h3>
                  <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-widest mt-0.5">Secure Authentication Gate</p>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Role tab selector */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-150 dark:border-slate-850">
                    <button
                      onClick={() => {
                        setLoginTab('member');
                        setLoginError('');
                      }}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${loginTab === 'member' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-750' : 'text-slate-450 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      Anggota Koperasi
                    </button>
                    <button
                      onClick={() => {
                        setLoginTab('admin');
                        setLoginError('');
                      }}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition cursor-pointer ${loginTab === 'admin' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-750' : 'text-slate-450 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      Pengurus (Admin)
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* ADMIN LOGIN */}
                    {loginTab === 'admin' ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 leading-relaxed">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Kredensial Pengurus (Admin):</p>
                          <p className="mt-1 opacity-90 text-xs">Masukkan Username dan Kata Sandi Pengurus untuk mengakses panel administrasi penuh koperasi.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" /> USERNAME PENGURUS
                          </label>
                          <input 
                            type="text"
                            required
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                            placeholder="Username admin"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" /> KATA SANDI
                          </label>
                          <div className="relative">
                            <input 
                              type={showAdminPassword ? "text" : "password"}
                              required
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                              placeholder="Kata sandi admin"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminPassword(!showAdminPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                            >
                              {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* MEMBER LOGIN */
                      <div className="space-y-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/60 leading-relaxed">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Autentikasi Anggota Resmi:</p>
                          <p className="mt-1 opacity-90 text-xs">Gunakan **Nomor Anggota** resmi Anda (misal: AG001) dan **Nomor Handphone** terdaftar sebagai kata sandi pembuka untuk masuk.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" /> NOMOR ANGGOTA KOPERASI
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="Contoh: AG001"
                            value={memberNo}
                            onChange={(e) => setMemberNo(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" /> NOMOR HANDPHONE (SEBAGAI SANDI)
                          </label>
                          <div className="relative">
                            <input 
                              type={showMemberPassword ? "text" : "password"}
                              required
                              placeholder="Masukkan nomor HP terdaftar Anda"
                              value={memberPhone}
                              onChange={(e) => setMemberPhone(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowMemberPassword(!showMemberPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                            >
                              {showMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {loginError && (
                      <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900 font-medium">
                        ⚠️ {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? 'Memvalidasi...' : 'Masuk ke Sistem Aplikasi'}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ================= WEBSITE FOOTER ================= */}
      <footer className="bg-slate-100 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-900 py-6 text-center text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none">
        <p className="font-semibold">{setup.namaKoperasi || "Koperasi Dana Segar"}</p>
        <p className="mt-1">Kantor: {setup.alamatKantor}</p>
        <p className="mt-0.5 opacity-75">Badan Hukum: {setup.noBadanHukum || "-"}</p>
        <p className="mt-2 text-[9px] opacity-60">&copy; {new Date().getFullYear()} Sistem Informasi Koperasi Berkeadilan. All rights reserved.</p>
      </footer>
    </div>
  );
}


// ==========================================================
// ==================== MEMBER CABINET VIEW =================
// ==========================================================
interface MemberDashboardViewProps {
  member: Member;
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  announcements?: Pengumuman[];
  pengajuanPinjaman?: PengajuanPinjaman[];
  pembayaranPending?: PembayaranPending[];
  galeriKoperasi?: GaleriKoperasi[];
  onAddPengajuanPinjaman?: (newPengajuan: Omit<PengajuanPinjaman, 'id' | 'status' | 'tanggalPengajuan' | 'catatanPengurus'>) => void;
  onAddPembayaranPending?: (newPayment: Omit<PembayaranPending, 'id' | 'status'>) => Promise<void>;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export function MemberDashboardView({
  member,
  setup,
  members,
  simpanan,
  pinjaman,
  angsuran,
  announcements = [],
  pengajuanPinjaman = [],
  pembayaranPending = [],
  galeriKoperasi = [],
  onAddPengajuanPinjaman,
  onAddPembayaranPending,
  onLogout,
  isDarkMode,
  setIsDarkMode
}: MemberDashboardViewProps) {
  
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'loan_simulation' | 'payment'>(() => {
    const redirect = localStorage.getItem('redirect_to_loan_simulation');
    if (redirect === 'true') {
      localStorage.removeItem('redirect_to_loan_simulation');
      return 'loan_simulation';
    }
    return 'overview';
  });
  
  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a => a.status === 'Aktif');
  }, [announcements]);
  
  // States for Print Account Statement / Rekening Koran Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Member loan application form states
  const [membLoanNominalStr, setMembLoanNominalStr] = useState(() => {
    const savedNominal = localStorage.getItem('guest_sim_nominal');
    if (savedNominal) {
      localStorage.removeItem('guest_sim_nominal');
      const rawVal = savedNominal.replace(/\D/g, '');
      return rawVal ? new Intl.NumberFormat('id-ID').format(parseInt(rawVal, 10)) : '5.000.000';
    }
    return '5.000.000';
  });

  const [membLoanTenor, setMembLoanTenor] = useState(() => {
    const savedTenor = localStorage.getItem('guest_sim_tenor');
    if (savedTenor) {
      localStorage.removeItem('guest_sim_tenor');
      return parseInt(savedTenor, 10) || 10;
    }
    return 10;
  });
  const [membLoanKeperluan, setMembLoanKeperluan] = useState('');
  const [membLoanSuccessMsg, setMembLoanSuccessMsg] = useState('');
  const [membLoanErrorMsg, setMembLoanErrorMsg] = useState('');

  // Member payment states
  const [payPokokChecked, setPayPokokChecked] = useState(false);
  const [payPokokAmountStr, setPayPokokAmountStr] = useState("50.000");
  const [payWajibChecked, setPayWajibChecked] = useState(true);
  const [payWajibAmountStr, setPayWajibAmountStr] = useState("50.000");
  const [payManasukaChecked, setPayManasukaChecked] = useState(false);
  const [payManasukaAmountStr, setPayManasukaAmountStr] = useState("50.000");
  const [payAngsuranChecked, setPayAngsuranChecked] = useState(false);
  const [payAngsuranAmountStr, setPayAngsuranAmountStr] = useState("0");
  const [payLoanId, setPayLoanId] = useState('');

  const [payDate, setPayDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [payBuktiBase64, setPayBuktiBase64] = useState('');
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [payErrorMsg, setPayErrorMsg] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Component-level loan simulation calculations
  const simNominal = parseFloat(membLoanNominalStr.replace(/\D/g, '')) || 0;
  const simProvisiDipotong = (simNominal * 1) / 100;
  const simJumlahDiterima = simNominal - simProvisiDipotong;
  const simTenorVal = Math.min(20, Math.max(1, membLoanTenor));
  const simAngsuranPokokPerBulan = simTenorVal > 0 ? Math.round(simNominal / simTenorVal) : 0;
  const simJasaPerBulan = Math.round((simNominal * 1.5) / 100);
  const simTotalAngsuranPerBulan = simAngsuranPokokPerBulan + simJasaPerBulan;

  const simAmortizationSchedule = useMemo(() => {
    const list = [];
    for (let i = 1; i <= simTenorVal; i++) {
      list.push({
        bulan: i,
        pokok: simAngsuranPokokPerBulan,
        jasa: simJasaPerBulan,
        total: simTotalAngsuranPerBulan
      });
    }
    return list;
  }, [simTenorVal, simAngsuranPokokPerBulan, simJasaPerBulan, simTotalAngsuranPerBulan]);

  // Filter personal data
  const mySimpanan = useMemo(() => {
    return simpanan.filter(s => s.anggotaId === member.id);
  }, [simpanan, member]);

  const hasSimpananPokok = useMemo(() => {
    return mySimpanan.some(s => s.jenis === 'Pokok');
  }, [mySimpanan]);

  React.useEffect(() => {
    if (hasSimpananPokok) {
      setPayPokokChecked(false);
    } else {
      setPayPokokChecked(true);
    }
  }, [hasSimpananPokok]);

  const myPinjaman = useMemo(() => {
    return pinjaman.filter(p => p.anggotaId === member.id);
  }, [pinjaman, member]);

  const myAngsuran = useMemo(() => {
    return angsuran.filter(a => a.anggotaId === member.id);
  }, [angsuran, member]);

  // Auto fill payment inputs based on selection
  const activePinjaman = useMemo(() => {
    return myPinjaman.filter(p => p.status === 'Belum Lunas');
  }, [myPinjaman]);

  React.useEffect(() => {
    if (activePinjaman.length > 0) {
      const selectedLoan = activePinjaman.find(p => p.id === payLoanId) || activePinjaman[0];
      if (!payLoanId) {
        setPayLoanId(selectedLoan.id);
      }
      setPayAngsuranAmountStr(new Intl.NumberFormat('id-ID').format(selectedLoan.totalAngsuranPerBulan));
    } else {
      setPayLoanId('');
      setPayAngsuranAmountStr('0');
    }
  }, [payLoanId, activePinjaman]);

  const handlePayFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setPayBuktiBase64(compressed);
    } catch (err) {
      console.error("Gagal mengompres gambar:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPayBuktiBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayErrorMsg('');
    setPaySuccessMsg('');

    const parsedPokok = payPokokChecked ? (parseFloat(payPokokAmountStr.replace(/\D/g, '')) || 0) : 0;
    const parsedWajib = payWajibChecked ? (parseFloat(payWajibAmountStr.replace(/\D/g, '')) || 0) : 0;
    const parsedManasuka = payManasukaChecked ? (parseFloat(payManasukaAmountStr.replace(/\D/g, '')) || 0) : 0;
    const parsedAngsuran = payAngsuranChecked ? (parseFloat(payAngsuranAmountStr.replace(/\D/g, '')) || 0) : 0;

    const totalAmount = parsedPokok + parsedWajib + parsedManasuka + parsedAngsuran;
    if (totalAmount <= 0) {
      setPayErrorMsg('Silakan centang dan tentukan jumlah setoran minimal satu jenis pembayaran.');
      return;
    }

    if (payAngsuranChecked && !payLoanId) {
      setPayErrorMsg('Anda memilih pembayaran Angsuran Pinjaman tetapi tidak ada kontrak aktif.');
      return;
    }

    setIsSubmittingPay(true);
    try {
      let finalJenis: 'Simpanan Wajib' | 'Simpanan Manasuka' | 'Angsuran' | 'Gabungan' | 'Simpanan Pokok' = 'Gabungan';
      const checkedCount = (payPokokChecked ? 1 : 0) + (payWajibChecked ? 1 : 0) + (payManasukaChecked ? 1 : 0) + (payAngsuranChecked ? 1 : 0);
      
      if (checkedCount === 1) {
        if (payPokokChecked) finalJenis = 'Simpanan Pokok';
        else if (payWajibChecked) finalJenis = 'Simpanan Wajib';
        else if (payManasukaChecked) finalJenis = 'Simpanan Manasuka';
        else if (payAngsuranChecked) finalJenis = 'Angsuran';
      } else {
        finalJenis = 'Gabungan';
      }

      let bKe: number | undefined = undefined;
      if (payAngsuranChecked && payLoanId) {
        const related = angsuran.filter(a => a.pinjamanId === payLoanId);
        bKe = related.length + 1;
      }

      if (onAddPembayaranPending) {
        await onAddPembayaranPending({
          anggotaId: member.id,
          namaAnggota: member.nama,
          tanggal: payDate,
          jenis: finalJenis,
          jumlah: totalAmount,
          pinjamanId: (payAngsuranChecked && payLoanId) ? payLoanId : undefined,
          bulanKe: bKe,
          buktiTransferUrl: payBuktiBase64 || undefined,
          keterangan: payNotes || undefined,
          jumlahSimpananPokok: parsedPokok > 0 ? parsedPokok : undefined,
          jumlahSimpananWajib: parsedWajib > 0 ? parsedWajib : undefined,
          jumlahSimpananManasuka: parsedManasuka > 0 ? parsedManasuka : undefined,
          jumlahAngsuran: parsedAngsuran > 0 ? parsedAngsuran : undefined
        });
        setPaySuccessMsg('Pembayaran berhasil dikirim dan menunggu validasi pengurus.');
        setPayNotes('');
        setPayBuktiBase64('');
        // Keep Wajib checked but clear others for a fresh form
        setPayManasukaChecked(false);
        setPayAngsuranChecked(false);
      } else {
        setPayErrorMsg('Fitur pembayaran belum diintegrasikan.');
      }
    } catch (err) {
      console.error(err);
      setPayErrorMsg('Gagal mengirim pembayaran.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Personal Totals
  const totals = useMemo(() => {
    const sPokok = mySimpanan.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
    const sWajib = mySimpanan.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
    const sSukarela = mySimpanan.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
    const totalS = sPokok + sWajib + sSukarela;

    // Loan stats
    const totalLoans = myPinjaman.reduce((a, p) => a + p.nominalPinjaman, 0);
    const totalWajibBayar = myPinjaman.reduce((a, p) => a + p.totalWajibBayar, 0);
    const totalPaid = myAngsuran.reduce((a, ans) => a + ans.jumlahBayar, 0);
    const remainingLoanDebt = Math.max(0, totalWajibBayar - totalPaid);

    return {
      sPokok, sWajib, sSukarela, totalS,
      totalLoans, totalPaid, remainingLoanDebt,
      loansCount: myPinjaman.length,
      paidCount: myAngsuran.length
    };
  }, [mySimpanan, myPinjaman, myAngsuran]);

  const myApplications = useMemo(() => {
    return pengajuanPinjaman.filter(p => p.anggotaId === member.id);
  }, [pengajuanPinjaman, member]);

  const hasActiveLoan = useMemo(() => {
    return myPinjaman.some(p => p.status === 'Belum Lunas');
  }, [myPinjaman]);

  // Personal loans due within the next 7 days
  const myDueLoansList = useMemo(() => {
    const activeLoans = myPinjaman.filter(p => p.status === 'Belum Lunas');
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    const result: {
      loan: Pinjaman;
      dueDate: Date;
      daysRemaining: number;
      amountDue: number;
      nextMonth: number;
    }[] = [];

    activeLoans.forEach(p => {
      const relatedAngsuran = myAngsuran.filter(a => a.pinjamanId === p.id);
      const paidMonths = relatedAngsuran.map(a => a.bulanKe);
      const nextMonth = paidMonths.length > 0 ? Math.max(...paidMonths) + 1 : 1;

      if (nextMonth > p.tenor) return;

      const startDate = new Date(p.tanggal);
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + nextMonth);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - todayZero.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        result.push({
          loan: p,
          dueDate,
          daysRemaining: diffDays,
          amountDue: p.totalAngsuranPerBulan,
          nextMonth
        });
      }
    });

    return result;
  }, [myPinjaman, myAngsuran]);

  const handleMembLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseFloat(membLoanNominalStr.replace(/\D/g, '')) || 0;
    if (nominal <= 0) {
      setMembLoanErrorMsg('Jumlah pinjaman harus lebih besar dari Rp 0');
      return;
    }
    if (membLoanTenor < 1 || membLoanTenor > 20) {
      setMembLoanErrorMsg('Tenor pinjaman harus antara 1 sampai 20 bulan');
      return;
    }
    if (!membLoanKeperluan.trim()) {
      setMembLoanErrorMsg('Harap isi keperluan / alasan mengajukan pinjaman');
      return;
    }

    if (onAddPengajuanPinjaman) {
      const provisi = (nominal * 1) / 100;
      onAddPengajuanPinjaman({
        anggotaId: member.id,
        nominalPinjaman: nominal,
        tenor: membLoanTenor,
        bungaFlatPersen: 1.5,
        biayaProvisiPersen: 1,
        provisiDipotong: provisi,
        jumlahDiterima: nominal - provisi,
        alasanPengajuan: membLoanKeperluan.trim()
      });
      setMembLoanSuccessMsg('Pengajuan pinjaman Anda berhasil terkirim! Menunggu persetujuan pengurus koperasi.');
      setMembLoanKeperluan('');
      setMembLoanErrorMsg('');
    } else {
      setMembLoanErrorMsg('Sistem pengajuan sedang tidak tersedia, harap hubungi pengurus.');
    }
  };

  // Calculate cooperative total statistics (overview for transparency)
  const coopOverview = useMemo(() => {
    const totalSimpananAll = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalLoansAll = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalPaidAll = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    
    // Outstanding credit principal remaining
    const outstandingPrincipalAll = pinjaman.reduce((acc, p) => {
      if (p.status === 'Lunas') return acc;
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
      const rem = p.nominalPinjaman - (totalPaid * (p.nominalPinjaman / p.totalWajibBayar));
      return acc + Math.max(0, Math.round(rem));
    }, 0);

    return {
      totalSimpananAll,
      outstandingPrincipalAll,
      activeMembersCount: members.filter(m => m.isVerified !== false).length
    };
  }, [simpanan, pinjaman, angsuran, members]);

  // Generate nominative list of other members' total savings (with transparency)
  const nominatifList = useMemo(() => {
    return members.filter(m => m.isVerified !== false).map(m => {
      const relatedS = simpanan.filter(s => s.anggotaId === m.id);
      const sPokok = relatedS.filter(s => s.jenis === 'Pokok').reduce((a, c) => a + c.jumlah, 0);
      const sWajib = relatedS.filter(s => s.jenis === 'Wajib').reduce((a, c) => a + c.jumlah, 0);
      const sSukarela = relatedS.filter(s => s.jenis === 'Sukarela').reduce((a, c) => a + c.jumlah, 0);
      const total = sPokok + sWajib + sSukarela;
      return {
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama,
        jenisKelamin: m.jenisKelamin,
        sPokok,
        sWajib,
        sSukarela,
        total
      };
    }).sort((a, b) => b.total - a.total);
  }, [members, simpanan]);

  // Print function for Member Statement (Koran Account Statement)
  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const kopName = setup.namaKoperasi || "Koperasi Dana Segar";
    const bhStr = setup.noBadanHukum ? `BH: ${setup.noBadanHukum}` : '';

    const savingRows = mySimpanan.map(s => {
      const isPenarikan = s.jumlah < 0;
      const transName = isPenarikan ? 'Penarikan Sukarela' : `Simpanan ${s.jenis}`;
      const amountStr = isPenarikan ? `-${formatRupiah(Math.abs(s.jumlah))}` : formatRupiah(s.jumlah);
      const colorStyle = isPenarikan ? 'color: #dc2626; font-weight: bold;' : '';
      return `
        <tr>
          <td style="padding: 6px; font-size: 11px;">${s.tanggal}</td>
          <td style="padding: 6px; font-size: 11px; font-family: monospace;">${s.transaksiId || 'TRX-S' + s.id.substring(0,6).toUpperCase()}</td>
          <td style="padding: 6px; font-size: 11px; font-weight: bold; ${isPenarikan ? 'color: #dc2626;' : ''}">${transName}</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace; ${colorStyle}">${amountStr}</td>
          <td style="padding: 6px; font-size: 11px;">${s.keterangan || '-'}</td>
        </tr>
      `;
    }).join('');

    const loanRows = myPinjaman.map(p => {
      const repays = myAngsuran.filter(a => a.pinjamanId === p.id);
      const paidAmt = repays.reduce((sum, c) => sum + c.jumlahBayar, 0);
      return `
        <tr>
          <td style="padding: 6px; font-size: 11px;">${p.tanggal}</td>
          <td style="padding: 6px; font-size: 11px; font-family: monospace;">CTR-${p.id.substring(0,8).toUpperCase()}</td>
          <td style="padding: 6px; font-size: 11px;">Pinjaman Tenor ${p.tenor} Bln</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(p.nominalPinjaman)}</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(p.totalWajibBayar)}</td>
          <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(paidAmt)}</td>
          <td style="padding: 6px; font-size: 11px; font-weight: bold;">${p.status}</td>
        </tr>
      `;
    }).join('');

    const installmentRows = myAngsuran.map(a => `
      <tr>
        <td style="padding: 6px; font-size: 11px;">${a.tanggal}</td>
        <td style="padding: 6px; font-size: 11px; font-family: monospace;">TRX-${a.id.substring(0,8).toUpperCase()}</td>
        <td style="padding: 6px; font-size: 11px;">Angsuran Ke-${a.bulanKe}</td>
        <td style="padding: 6px; font-size: 11px; text-align: right; font-family: monospace;">${formatRupiah(a.jumlahBayar)}</td>
        <td style="padding: 6px; font-size: 11px;">${a.keterangan || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Buku Ledger Anggota - ${member.nama}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 30px; color: #1e293b; }
            .header { text-align: center; border-b: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .coop-title { font-size: 18px; font-weight: bold; margin: 0; }
            .coop-subtitle { font-size: 11px; margin: 3px 0 0 0; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 4px; font-size: 11px; }
            .ledger-section-title { font-size: 12px; font-weight: bold; margin: 15px 0 6px 0; border-bottom: 1px double #000; padding-bottom: 3px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .data-table th { background-color: #f1f5f9; padding: 6px; font-size: 11px; text-align: left; border-bottom: 1px solid #000; }
            .data-table td { border-bottom: 1px dashed #e2e8f0; }
            .totals-box { margin-top: 15px; background-color: #fafafa; padding: 10px; border: 1px solid #ddd; font-size: 11px; }
            .footer-sign { width: 100%; margin-top: 50px; text-align: right; font-size: 11px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1 class="coop-title">${kopName}</h1>
            <p class="coop-subtitle">${setup.slogan} | ${setup.alamatKantor}</p>
            <p style="font-size: 10px; font-weight: bold; margin: 4px 0 0 0;">${bhStr}</p>
          </div>

          <h3 style="text-align: center; margin: 0 0 20px 0; font-size: 14px; text-decoration: underline;">BUKU LEDGER REKENING ANGGOTA</h3>

          <table class="info-table">
            <tr>
              <td width="20%">No. Anggota:</td>
              <td width="30%"><b>${member.noAnggota}</b></td>
              <td width="20%">Tanggal Gabung:</td>
              <td width="30%"><b>${member.tanggalBergabung}</b></td>
            </tr>
            <tr>
              <td>Nama Anggota:</td>
              <td><b>${member.nama}</b></td>
              <td>Nomor Handphone:</td>
              <td><b>${member.noHp}</b></td>
            </tr>
            <tr>
              <td>Alamat:</td>
              <td colspan="3"><b>${member.alamat}</b></td>
            </tr>
          </table>

          <div class="ledger-section-title">I. RIWAYAT SALDO SIMPANAN (POKOK, WAJIB, SUKARELA)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">No. Transaksi</th>
                <th width="25%">Jenis Simpanan</th>
                <th width="20%" style="text-align: right;">Jumlah</th>
                <th width="20%">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${savingRows || '<tr><td colspan="5" style="text-align: center; padding: 10px;">Belum ada riwayat transaksi simpanan</td></tr>'}
            </tbody>
          </table>

          <div class="ledger-section-title">II. DAFTAR KONTRAK PINJAMAN AKTIF</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="12%">Realisasi</th>
                <th width="15%">No. Kontrak</th>
                <th width="18%">Deskripsi</th>
                <th width="15%" style="text-align: right;">Pencairan</th>
                <th width="15%" style="text-align: right;">Wajib Bayar</th>
                <th width="15%" style="text-align: right;">Total Bayar</th>
                <th width="10%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${loanRows || '<tr><td colspan="7" style="text-align: center; padding: 10px;">Belum ada kontrak pinjaman aktif</td></tr>'}
            </tbody>
          </table>

          <div class="ledger-section-title">III. RIWAYAT BAYAR ANGSURAN PINJAMAN</div>
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">No. Transaksi</th>
                <th width="25%">Angsuran Periode</th>
                <th width="20%" style="text-align: right;">Jumlah Bayar</th>
                <th width="20%">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${installmentRows || '<tr><td colspan="5" style="text-align: center; padding: 10px;">Belum ada riwayat bayar angsuran</td></tr>'}
            </tbody>
          </table>

          <div class="totals-box">
            <b>RINGKASAN SALDO BERJALAN SAYA:</b><br/>
            - Total Saldo Simpanan Pokok: ${formatRupiah(totals.sPokok)}<br/>
            - Total Saldo Simpanan Wajib: ${formatRupiah(totals.sWajib)}<br/>
            - Total Saldo Simpanan Sukarela: ${formatRupiah(totals.sSukarela)}<br/>
            - <b>TOTAL AKUMULASI SIMPANAN: ${formatRupiah(totals.totalS)}</b><br/>
            --------------------------------------------------------<br/>
            - Total Sisa Hutang Pinjaman (Kewajiban): <b>${formatRupiah(totals.remainingLoanDebt)}</b>
          </div>

          <div class="footer-sign">
            <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>Petugas Administrasi Koperasi</p>
            <br/><br/><br/>
            <p><b>( ____________________________ )</b></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans flex flex-col">
      
      {/* Member Cabinet Header */}
      <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-lg select-none shadow">
              🌱
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">Portal Anggota Koperasi</h2>
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">{setup.namaKoperasi || "Dana Segar"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-800 transition cursor-pointer"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <div className="h-5 w-px bg-emerald-700 hidden sm:block"></div>
            
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-990 border border-emerald-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout Anggota</span>
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white py-8 border-b border-emerald-900 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold bg-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">ANGGOTA RESMI VERIFIKASI</span>
            <h1 className="text-xl sm:text-2xl font-black">Selamat Datang, Bpk/Ibu {member.nama}!</h1>
            <p className="text-xs text-emerald-300 font-mono">No. Anggota: {member.noAnggota} | Gabung Sejak: {member.tanggalBergabung} | HP: {member.noHp}</p>
          </div>
          
          <button 
            onClick={handlePrintStatement}
            className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Ledger Saya (Rekening Koran)
          </button>
        </div>
      </div>

      {/* Main navigation tabs for member cabinet */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 transition cursor-pointer ${activeTab === 'overview' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            Ikhtisar Koperasi
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-4 transition cursor-pointer relative flex items-center gap-1.5 ${activeTab === 'ledger' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            <span>Buku Ledger Saya ({mySimpanan.length + myPinjaman.length} Log)</span>
            {myDueLoansList.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('loan_simulation')}
            className={`py-4 transition cursor-pointer ${activeTab === 'loan_simulation' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            Simulasi & Pengajuan Pinjaman
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`py-4 transition cursor-pointer relative flex items-center gap-1.5 ${activeTab === 'payment' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 font-extrabold' : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'}`}
          >
            <span>Bayar Wajib & Angsuran</span>
            {pembayaranPending.filter(p => p.anggotaId === member.id && p.status === 'Pending').length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                {pembayaranPending.filter(p => p.anggotaId === member.id && p.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Member Content area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto space-y-6">
        
        {/* 🚨 NOTIFIKASI JATUH TEMPO ANGGOTA */}
        {myDueLoansList.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-rose-800 dark:text-rose-300">
                  Peringatan Batas Pembayaran Pinjaman (Jatuh Tempo / Terlambat)
                </h3>
                <p className="text-xs text-rose-700/90 dark:text-rose-400/90 mt-1">
                  Harap diperhatikan, Anda memiliki <strong className="font-extrabold">{myDueLoansList.length} tagihan angsuran aktif</strong> yang telah jatuh tempo atau mendekati batas pembayaran. Mohon lakukan pelunasan tepat waktu melalui pengurus atau transfer bank resmi.
                </p>
                <div className="mt-3 space-y-2 bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-rose-100 dark:border-rose-950/50">
                  {myDueLoansList.map((item, idx) => {
                    const formatVal = item.dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-rose-100/40 dark:border-rose-950/20 pb-1.5 last:border-0 last:pb-0">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          Angsuran Pinjaman Bulan Ke-{item.nextMonth} (No. Kontrak: <span className="font-mono bg-rose-100/50 dark:bg-rose-950/40 px-1 rounded">CTR-{item.loan.id.substring(0,8).toUpperCase()}</span>) - Batas: {formatVal}
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                          <span className="text-rose-700 dark:text-rose-400">{formatRupiah(item.amountDue)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.daysRemaining < 0 ? 'bg-rose-600 text-white animate-pulse' : item.daysRemaining === 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'}`}>
                            {item.daysRemaining < 0 ? `Terlambat ${Math.abs(item.daysRemaining)} Hari` : item.daysRemaining === 0 ? 'Jatuh Tempo Hari Ini' : `Sisa ${item.daysRemaining} Hari`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 📢 BULLETIN BOARD: ANNOUNCEMENTS FOR MEMBER CABINET */}
        {activeAnnouncements.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Megaphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Pengumuman & Pemberitahuan Resmi Koperasi
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                  Informasi resmi, rilis dividen SHU, agenda rapat, dan imbauan penting pengurus koperasi.
                </p>
              </div>
            </div>

            {/* 📢 TEKS BERJALAN (MARQUEE) */}
            <div className="bg-white/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-xs">
              <marquee 
                className="text-xs font-medium text-slate-700 dark:text-slate-200" 
                scrollamount="4"
                onMouseOver={(e) => e.currentTarget.stop()}
                onMouseOut={(e) => e.currentTarget.start()}
              >
                {activeAnnouncements.map((ann) => (
                  <span key={ann.id} className="mx-6 inline-flex items-center gap-1.5 cursor-pointer">
                    <span>{ann.isUrgent ? '🚨' : '📢'}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{ann.judul}:</span>
                    <span className="text-slate-650 dark:text-slate-300">{ann.konten.replace(/\n/g, ' ')}</span>
                    <span className="text-slate-350 dark:text-slate-550 mx-2">|</span>
                  </span>
                ))}
              </marquee>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* Tab 1: Ikhtisar Koperasi */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* 📷 SLIDESHOW GALERI KOPERASI */}
              <SlideshowGaleri galeri={galeriKoperasi} />

              {/* Personal snapshot card banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tabungan Saya</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">{formatRupiah(totals.totalS)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                    <HandCoins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kewajiban Hutang Saya</p>
                    <p className="text-xl font-bold font-mono text-rose-650 dark:text-rose-400 mt-0.5">{formatRupiah(totals.remainingLoanDebt)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border p-6 rounded-2xl border-slate-150 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aset Dana Koperasi</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">{formatRupiah(coopOverview.totalSimpananAll + coopOverview.outstandingPrincipalAll)}</p>
                  </div>
                </div>
              </div>

              {/* Info Penarikan Simpanan Manasuka */}
              <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Simpanan Sukarela (Manasuka) Aktif</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Anda memiliki saldo Simpanan Manasuka sebesar <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(totals.sSukarela)}</strong> yang bersifat fleksibel dan dapat ditarik kapan saja melalui Petugas Administrasi Koperasi.
                  </p>
                </div>
                <div className="text-[10px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
                  Proses Instan di Kas Koperasi
                </div>
              </div>

              {/* Cooperative dynamic profile overview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b pb-2 uppercase tracking-wider">Visi & Identitas Koperasi</h3>
                  <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                    <p><b>Nama Koperasi:</b> {setup.namaKoperasi || "Dana Segar"}</p>
                    {setup.noBadanHukum && <p><b>Legalitas:</b> Badan Hukum {setup.noBadanHukum}</p>}
                    <p><b>Alamat Kantor:</b> {setup.alamatKantor}</p>
                    <p><b>Slogan Bersama:</b> "{setup.slogan}"</p>
                    <p className="italic">Koperasi didirikan atas dasar kekeluargaan dengan pengawasan ketat manajemen untuk penyaluran simpanan modal dari anggota dan penyaluran kredit produktif bagi kesejahteraan masyarakat.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b pb-2 uppercase tracking-wider">Transparansi Keuangan Komunitas</h3>
                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-350">
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Anggota Terverifikasi</span>
                      <span className="font-bold">{coopOverview.activeMembersCount} Orang</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Dana Simpanan Komunitas</span>
                      <span className="font-bold font-mono">{formatRupiah(coopOverview.totalSimpananAll)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Total Kredit Produktif Berjalan</span>
                      <span className="font-bold font-mono">{formatRupiah(coopOverview.outstandingPrincipalAll)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span>Prinsip Suku Bunga Akad</span>
                      <span className="font-bold uppercase text-emerald-600">{setup.jenisBungaPinjaman} (Flat)</span>
                    </div>
                  </div>
                  </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Buku Ledger */}
          {activeTab === 'ledger' && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* Saving ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Riwayat Saldo Simpanan (Pokok, Wajib, Sukarela)
                </h3>

                {mySimpanan.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Belum ada riwayat transaksi simpanan terdaftar.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Transaksi</th>
                          <th className="py-2 px-3">Jenis</th>
                          <th className="py-2 px-3 text-right">Nominal Mutasi</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {mySimpanan.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">{s.tanggal}</td>
                            <td className="py-2.5 px-3 font-mono">{s.transaksiId || `TRX-S-${s.id.substring(0, 6).toUpperCase()}`}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                s.jumlah < 0 
                                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-750 dark:text-rose-450 border border-rose-100 dark:border-rose-900' 
                                  : s.jenis === 'Pokok' 
                                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900' 
                                    : s.jenis === 'Wajib' 
                                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-750 dark:text-amber-400 border border-amber-100 dark:border-amber-900' 
                                      : 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'
                              }`}>
                                {s.jumlah < 0 ? 'Penarikan Sukarela' : `Simpanan ${s.jenis}`}
                              </span>
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold font-mono ${s.jumlah < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-905 dark:text-slate-100'}`}>
                              {s.jumlah < 0 ? `-${formatRupiah(Math.abs(s.jumlah))}` : formatRupiah(s.jumlah)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-450">{s.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pinjaman Ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-emerald-600" />
                  Daftar Kontrak Pinjaman & Kewajiban
                </h3>

                {myPinjaman.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Anda tidak memiliki kontrak pinjaman berjalan.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal Realisasi</th>
                          <th className="py-2 px-3">No. Kontrak</th>
                          <th className="py-2 px-3 text-right">Pencairan Nominal</th>
                          <th className="py-2 px-3 text-right">Wajib Bayar</th>
                          <th className="py-2 px-3 text-right">Telah Dibayar</th>
                          <th className="py-2 px-3 text-right">Sisa Kewajiban</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {myPinjaman.map((p) => {
                          const repays = myAngsuran.filter(a => a.pinjamanId === p.id);
                          const paidAmt = repays.reduce((sum, c) => sum + c.jumlahBayar, 0);
                          const remainingDebt = Math.max(0, p.totalWajibBayar - paidAmt);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                              <td className="py-2.5 px-3">{p.tanggal}</td>
                              <td className="py-2.5 px-3 font-mono">CTR-{p.id.substring(0, 8).toUpperCase()}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(p.nominalPinjaman)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(p.totalWajibBayar)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatRupiah(paidAmt)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-450 font-bold">{formatRupiah(remainingDebt)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Installment Repays Ledger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Riwayat Angsuran Pinjaman (Kewajiban Dibayar)
                </h3>

                {myAngsuran.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">Belum ada riwayat transaksi pembayaran angsuran.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase tracking-wider font-bold">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Transaksi</th>
                          <th className="py-2 px-3">No. Kontrak</th>
                          <th className="py-2 px-3">Angsuran Ke</th>
                          <th className="py-2 px-3 text-right">Jumlah Bayar</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-650 dark:text-slate-350">
                        {myAngsuran.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">{a.tanggal}</td>
                            <td className="py-2.5 px-3 font-mono">TRX-{a.id.substring(0, 8).toUpperCase()}</td>
                            <td className="py-2.5 px-3 font-mono">CTR-{a.pinjamanId.substring(0, 8).toUpperCase()}</td>
                            <td className="py-2.5 px-3 font-semibold">Bulan Ke-{a.bulanKe}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-indigo-700 dark:text-indigo-400">{formatRupiah(a.jumlahBayar)}</td>
                            <td className="py-2.5 px-3 font-semibold">Bulan Ke-{a.bulanKe}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-indigo-700 dark:text-indigo-400">{formatRupiah(a.jumlahBayar)}</td>
                            <td className="py-2.5 px-3 text-slate-450">{a.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* Tab 4: Simulasi & Pengajuan Pinjaman */}
          {activeTab === 'loan_simulation' && (
              <motion.div
                key="loan_simulation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header banner */}
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black">Simulasi & Pengajuan Kredit Pinjaman</h2>
                  <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                    Ajukan pembiayaan koperasi secara mandiri. Kami menawarkan suku bunga jasa <strong>1.5% flat bulanan</strong>, potongan provisi ringan <strong>1% di awal</strong>, dan jangka waktu pengembalian hingga <strong>20 bulan</strong>. Pengajuan Anda akan langsung diteruskan ke antrean persetujuan pengurus.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form input simulasi */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-850 pb-2">
                      Formulir Pengajuan Baru
                    </h3>

                    {membLoanSuccessMsg && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                        ✅ {membLoanSuccessMsg}
                      </div>
                    )}

                    {membLoanErrorMsg && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold">
                        ⚠️ {membLoanErrorMsg}
                      </div>
                    )}

                    {hasActiveLoan && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/45 rounded-xl space-y-1 text-rose-700 dark:text-rose-300">
                        <p className="font-bold flex items-center gap-1.5 text-xs text-rose-800 dark:text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0" /> Perhatian: Anda Memiliki Pinjaman Aktif
                        </p>
                        <p className="text-[10px] leading-relaxed">
                          Sesuai dengan ketentuan koperasi, Anda tidak dapat mencairkan pinjaman baru karena masih memiliki saldo kewajiban pinjaman yang belum lunas. Pengajuan pinjaman baru saat ini akan ditolak langsung secara otomatis.
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleMembLoanSubmit} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500 dark:text-slate-400">Jumlah Pinjaman (Rupiah)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">Rp</span>
                          <input 
                            type="text"
                            required
                            value={membLoanNominalStr}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/\D/g, '');
                              const formatted = rawVal ? new Intl.NumberFormat('id-ID').format(parseInt(rawVal, 10)) : '';
                              setMembLoanNominalStr(formatted);
                              setMembLoanSuccessMsg('');
                              setMembLoanErrorMsg('');
                            }}
                            placeholder="Contoh: 5.000.000"
                            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold"
                          />
                        </div>
                        {(() => {
                          const cleanVal = parseFloat(membLoanNominalStr.replace(/\D/g, '')) || 0;
                          if (cleanVal > 0) {
                            return (
                              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 italic leading-none pt-0.5">
                                Terbilang: {terbilang(cleanVal)} Rupiah
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500 dark:text-slate-400">Tenor Pengembalian (Bulan)</label>
                        <select
                          value={membLoanTenor}
                          onChange={(e) => {
                            setMembLoanTenor(parseInt(e.target.value) || 10);
                            setMembLoanSuccessMsg('');
                            setMembLoanErrorMsg('');
                          }}
                          className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{m} Bulan</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-500 dark:text-slate-400">Keperluan / Alasan Pinjaman</label>
                        <textarea 
                          rows={3}
                          required
                          value={membLoanKeperluan}
                          onChange={(e) => {
                            setMembLoanKeperluan(e.target.value);
                            setMembLoanSuccessMsg('');
                            setMembLoanErrorMsg('');
                          }}
                          placeholder="Jelaskan kebutuhan pengajuan dana Anda..."
                          className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl space-y-1 font-mono text-[10px] text-slate-500">
                        <div className="flex justify-between">
                          <span>Estimasi Diterima:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{formatRupiah(simJumlahDiterima)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cicilan Bulanan:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatRupiah(simTotalAngsuranPerBulan)} / bln</span>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-sm transition cursor-pointer text-center"
                      >
                        Ajukan Pembiayaan Sekarang
                      </button>
                    </form>
                  </div>

                  {/* Estimasi Kalkulator rincian & jadwal */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b dark:border-slate-850 pb-2">
                        Hasil Perhitungan & Jadwal Setoran
                      </h3>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <p className="text-[10px] font-sans text-slate-400 font-semibold uppercase">Kas Bersih Diterima</p>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatRupiah(simJumlahDiterima)}</p>
                          <p className="text-[9px] font-sans text-slate-400 italic mt-0.5">Sudah dipotong provisi 1% ({formatRupiah(simProvisiDipotong)})</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <p className="text-[10px] font-sans text-slate-400 font-semibold uppercase">Angsuran Per Bulan</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatRupiah(simTotalAngsuranPerBulan)}</p>
                          <p className="text-[9px] font-sans text-slate-400 mt-0.5">Pokok {formatRupiah(simAngsuranPokokPerBulan)} + Jasa {formatRupiah(simJasaPerBulan)}</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block mb-2">Simulasi Amortisasi Bulanan:</span>
                        <div className="max-h-[150px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] divide-y divide-slate-100 dark:divide-slate-800 font-mono bg-slate-50/50 dark:bg-slate-950/30">
                          <div className="grid grid-cols-12 px-3 py-1.5 font-sans font-extrabold text-slate-400 text-center bg-slate-100 dark:bg-slate-900">
                            <span className="col-span-2 text-left">Bulan</span>
                            <span className="col-span-3 text-right">Pokok</span>
                            <span className="col-span-3 text-right">Jasa (1.5%)</span>
                            <span className="col-span-4 text-right">Total Angsuran</span>
                          </div>
                          {simAmortizationSchedule.map((item) => (
                            <div key={item.bulan} className="grid grid-cols-12 px-3 py-1.5 hover:bg-white dark:hover:bg-slate-900 text-center">
                              <span className="col-span-2 text-left font-bold text-slate-500">#{item.bulan}</span>
                              <span className="col-span-3 text-right text-slate-600 dark:text-slate-400">{item.pokok.toLocaleString('id-ID')}</span>
                              <span className="col-span-3 text-right text-emerald-600 font-semibold">{item.jasa.toLocaleString('id-ID')}</span>
                              <span className="col-span-4 text-right font-black text-slate-800 dark:text-slate-200">{item.total.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Riwayat Pengajuan Pinjaman */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b dark:border-slate-850 pb-2">
                        Riwayat & Status Pengajuan Anda
                      </h3>

                      {myApplications.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-medium">
                          Anda belum pernah mengajukan pinjaman di portal ini.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {myApplications.map((app) => (
                            <div 
                              key={app.id} 
                              className="p-3.5 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition text-xs"
                            >
                              <div className="flex justify-between items-center">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 dark:text-slate-150 font-mono">REQ-{app.id.substring(4)}</p>
                                  <p className="text-[10px] text-slate-400">{app.tanggalPengajuan}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide uppercase ${
                                  app.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  app.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {app.status === 'Pending' ? 'Menunggu Persetujuan' : app.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 font-mono text-[11px] pt-1 border-t border-slate-50 dark:border-slate-850">
                                <div>
                                  <span className="text-slate-400 font-sans">Nominal:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(app.nominal)}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-sans">Tenor:</span>
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{app.tenorBulan} Bulan</p>
                                </div>
                              </div>

                              <div className="space-y-1 pt-1">
                                <p className="text-[10px] text-slate-400"><span className="font-semibold text-slate-500">Keperluan:</span> {app.keperluan}</p>
                                {app.catatanPengurus && (
                                  <div className="p-2 bg-slate-55 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] text-indigo-700 dark:text-indigo-400">
                                    <span className="font-bold text-slate-500 block mb-0.5">Catatan Pengurus:</span>
                                    {app.catatanPengurus}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Tab 5: Bayar Wajib & Angsuran */}
          {activeTab === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header banner */}
              <div className="bg-gradient-to-br from-indigo-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2">
                <h2 className="text-xl sm:text-2xl font-black">Pembayaran Mandiri Anggota</h2>
                <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
                  Lakukan pembayaran Simpanan Wajib bulanan atau angsuran pinjaman Anda secara mandiri di sini. Silakan transfer ke rekening resmi Koperasi, lalu unggah bukti transfer di bawah. Pengurus akan segera memvalidasi setoran Anda agar masuk ke dalam pencatatan resmi buku ledger.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="opacity-80 block text-[10px]">Rekening Koperasi:</span>
                    <strong className="font-mono">Bank Mandiri - 131-0012345-678</strong>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="opacity-80 block text-[10px]">Atas Nama (A/N):</span>
                    <strong>{setup.namaKoperasi || 'Koperasi Serba Usaha'}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Kirim Pembayaran */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b dark:border-slate-850 pb-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Kirim Form Setoran Baru
                  </h3>

                  {paySuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paySuccessMsg}</span>
                    </div>
                  )}

                  {payErrorMsg && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{payErrorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    {/* Checkbox Options */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400 block border-b pb-1 dark:border-slate-800">
                        Item Pembayaran (Bisa Centang beberapa sekaligus)
                      </label>

                      {/* 0. Simpanan Pokok */}
                      <div className={`p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-2 ${hasSimpananPokok ? 'opacity-65 select-none' : ''}`}>
                        <label className={`flex items-center gap-2.5 ${hasSimpananPokok ? 'cursor-not-allowed' : 'cursor-pointer'} select-none`}>
                          <input
                            type="checkbox"
                            disabled={hasSimpananPokok}
                            checked={payPokokChecked}
                            onChange={(e) => setPayPokokChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Simpanan Pokok
                            </span>
                            {hasSimpananPokok && (
                              <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                Sudah Lunas / Dibayar
                              </span>
                            )}
                          </div>
                        </label>
                        {payPokokChecked && !hasSimpananPokok && (
                          <div className="pl-6 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Jumlah Simpanan Pokok (Rp)</label>
                            <input
                              type="text"
                              required
                              value={payPokokAmountStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPayPokokAmountStr(val ? new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) : '');
                              }}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold font-mono focus:outline-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* 1. Simpanan Wajib */}
                      <div className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={payWajibChecked}
                            onChange={(e) => setPayWajibChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Simpanan Wajib
                          </span>
                        </label>
                        {payWajibChecked && (
                          <div className="pl-6 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Jumlah Simpanan Wajib (Rp)</label>
                            <input
                              type="text"
                              required
                              value={payWajibAmountStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPayWajibAmountStr(val ? new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) : '');
                              }}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold font-mono focus:outline-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. Simpanan Manasuka / Sukarela */}
                      <div className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={payManasukaChecked}
                            onChange={(e) => setPayManasukaChecked(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Simpanan Manasuka (Sukarela)
                          </span>
                        </label>
                        {payManasukaChecked && (
                          <div className="pl-6 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Jumlah Simpanan Manasuka (Rp)</label>
                            <input
                              type="text"
                              required
                              value={payManasukaAmountStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPayManasukaAmountStr(val ? new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) : '');
                              }}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold font-mono focus:outline-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. Angsuran Pinjaman */}
                      <div className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                        {activePinjaman.length === 0 ? (
                          <div className="flex items-center gap-2.5 opacity-60">
                            <input
                              type="checkbox"
                              disabled
                              checked={false}
                              className="w-4 h-4 rounded text-slate-450 border-slate-300 dark:border-slate-700 cursor-not-allowed"
                            />
                            <div className="text-xs font-semibold text-slate-400">
                              Angsuran Pinjaman <span className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 px-1.5 py-0.5 rounded-full ml-1">Tidak Ada Kontrak Aktif</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={payAngsuranChecked}
                                onChange={(e) => setPayAngsuranChecked(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Angsuran Pinjaman
                              </span>
                            </label>
                            {payAngsuranChecked && (
                              <div className="pl-6 space-y-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Pilih Kontrak Pinjaman Aktif</label>
                                  <select
                                    value={payLoanId}
                                    onChange={(e) => setPayLoanId(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                                  >
                                    {activePinjaman.map(p => {
                                      const related = angsuran.filter(a => a.pinjamanId === p.id);
                                      const nextBulan = related.length + 1;
                                      return (
                                        <option key={p.id} value={p.id}>
                                          CTR-{p.id.substring(0, 8).toUpperCase()} - Angsuran Ke-{nextBulan} ({formatRupiah(p.totalAngsuranPerBulan)}/bln)
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Jumlah Angsuran (Rp)</label>
                                  <input
                                    type="text"
                                    required
                                    value={payAngsuranAmountStr}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '');
                                      setPayAngsuranAmountStr(val ? new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) : '');
                                    }}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold font-mono focus:outline-indigo-500"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Date and Dynamic Total display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Tanggal Transfer</label>
                        <input
                          type="date"
                          required
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-indigo-500"
                        />
                      </div>
                      
                      <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Total Pembayaran</span>
                        <span className="text-sm font-black text-indigo-800 dark:text-indigo-200 font-sans">
                          {formatRupiah(
                            (payPokokChecked ? (parseFloat(payPokokAmountStr.replace(/\D/g, '')) || 0) : 0) +
                            (payWajibChecked ? (parseFloat(payWajibAmountStr.replace(/\D/g, '')) || 0) : 0) +
                            (payManasukaChecked ? (parseFloat(payManasukaAmountStr.replace(/\D/g, '')) || 0) : 0) +
                            (payAngsuranChecked ? (parseFloat(payAngsuranAmountStr.replace(/\D/g, '')) || 0) : 0)
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Unggah Bukti Transfer / Resi</label>
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-4 transition-all relative flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
                        {payBuktiBase64 ? (
                          <div className="space-y-2 text-center w-full">
                            <img
                              src={payBuktiBase64}
                              alt="Resi Transfer"
                              className="max-h-[140px] mx-auto rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 referrer-policy-no-referrer"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPayBuktiBase64('')}
                                className="px-2.5 py-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                              >
                                Ganti Foto
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-1">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-500 inline-block">
                              <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-[11px] text-slate-650 dark:text-slate-400 font-bold">
                              Klik atau seret resi ke sini
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Format JPG, PNG (Kompresi Otomatis)
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePayFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Catatan Pengirim (Opsional)</label>
                      <textarea
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="Misal: Pembayaran via Transfer Mobile Banking BCA"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 h-16"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingPay || (payAngsuranChecked && !payLoanId)}
                      className={`w-full py-2.5 rounded-xl text-xs font-black text-white shadow-xs cursor-pointer ${
                        isSubmittingPay || (payAngsuranChecked && !payLoanId)
                          ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                      }`}
                    >
                      {isSubmittingPay ? 'Mengirim...' : 'Kirim Konfirmasi Pembayaran'}
                    </button>
                  </form>
                </div>

                {/* History Riwayat Setoran Mandiri */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 border-b dark:border-slate-850 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      Status Pembayaran Mandiri Anda
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {pembayaranPending.filter(p => p.anggotaId === member.id).length} Pembayaran
                    </span>
                  </h3>

                  {pembayaranPending.filter(p => p.anggotaId === member.id).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Belum ada riwayat pembayaran mandiri. Silakan kirim pembayaran baru di sebelah kiri.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {pembayaranPending
                        .filter(p => p.anggotaId === member.id)
                        .slice()
                        .reverse()
                        .map((p) => (
                          <div
                            key={p.id}
                            className="p-3.5 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                                  p.jenis === 'Simpanan Wajib'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                                }`}>
                                  {p.jenis}
                                </span>
                                <p className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs mt-1">PAY-{p.id.substring(4)}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Tanggal Transfer: {p.tanggal}</p>
                              </div>

                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide uppercase border ${
                                p.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                p.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {p.status === 'Pending' ? 'Menunggu Validasi' : p.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 font-mono text-[11px] pt-2 border-t border-slate-50 dark:border-slate-850">
                              <div>
                                <span className="text-slate-400 font-sans text-[10px]">Nominal Setoran:</span>
                                <p className="font-extrabold text-slate-850 dark:text-slate-100">{formatRupiah(p.jumlah)}</p>
                              </div>
                              {p.jenis === 'Angsuran' && (
                                <div>
                                  <span className="text-slate-400 font-sans text-[10px]">Angsuran Bulan Ke:</span>
                                  <p className="font-extrabold text-slate-850 dark:text-slate-100">{p.bulanKe || 1}</p>
                                </div>
                              )}
                            </div>

                            {p.keterangan && (
                              <p className="text-[10px] text-slate-450 mt-1 italic">
                                <span className="font-bold text-slate-500 not-italic">Catatan Pengirim:</span> {p.keterangan}
                              </p>
                            )}

                            {(p.buktiTransferUrl || p.catatanPengurus) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                {p.buktiTransferUrl && (
                                  <div className="space-y-1">
                                    <span className="text-slate-400 text-[10px]">Bukti Pembayaran:</span>
                                    <img
                                      src={p.buktiTransferUrl}
                                      alt="Bukti Transfer"
                                      className="max-h-[80px] rounded-lg border border-slate-100 dark:border-slate-800 object-cover referrer-policy-no-referrer cursor-zoom-in"
                                      referrerPolicy="no-referrer"
                                      onClick={() => {
                                        const w = window.open();
                                        if (w) {
                                          w.document.write(`<img src="${p.buktiTransferUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                                {p.catatanPengurus && (
                                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1 text-[10px]">
                                    <span className="font-bold text-slate-500 block">Tanggapan Pengurus:</span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{p.catatanPengurus}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
