import React, { useState, useEffect, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, ManasukaBungaLog, Pembelian, PiutangWarung, Pengumuman, PengajuanPinjaman, WarungBarang, PengurusPengawas, GaleriKoperasi, RekeningNeraca, PembayaranPending } from './types';
import { initialMembers, initialSimpanan, initialPinjaman, initialAngsuran, initialPendapatan, initialBeban, initialSetup, initialPembelian, initialPiutangWarung, initialAnnouncements, initialPengajuanPinjaman, initialWarungBarang, initialPengurusPengawas, initialGaleriKoperasi, initialRekeningNeraca, initialPembayaranPending } from './dummyData';
import { 
  fetchKoperasiSetup, 
  saveKoperasiSetup, 
  fetchCollection, 
  saveCollectionItem, 
  deleteCollectionItem, 
  seedCollection,
  clearCollection
} from './utils/firebaseStorage';
import { LoginScreen, ArusKasView, ProfilKoperasiView } from './components/AdminViews';
import { AnggotaView, PinjamanView } from './components/CoreViews';
import { KasMasukView } from './components/KasMasukView';
import { DashboardView, LaporanView } from './components/LaporanViews';
import { PembelianView } from './components/PembelianView';
import { PengingatView } from './components/PengingatView';
import { PengumumanView } from './components/PengumumanView';
import { PortalKoperasi, MemberDashboardView } from './components/PortalKoperasi';
import { AdminWarungView } from './components/AdminWarungView';
import { AdminPengurusView } from './components/AdminPengurusView';
import { AdminGaleriView } from './components/AdminGaleriView';
import { formatRupiah } from './utils/finance';
import { 
  Building, LayoutDashboard, Users, Wallet, HandCoins, CheckCircle2, Check,
  TrendingUp, Scale, Sun, Moon, LogOut, HeartHandshake, UserCog, Menu, X, ShoppingCart, Lock, Bell, Megaphone,
  Eye, EyeOff, Store, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLOR_PALETTES = {
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22'
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b'
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065'
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e'
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519'
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  }
};

function getInitials(name: string) {
  if (!name) return 'DS';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function App() {
  // Dark mode trigger state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('koperasi_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('koperasi_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Authenticated & Role State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('koperasi_session_active') === 'true';
  });

  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(() => {
    const active = localStorage.getItem('koperasi_session_active') === 'true';
    if (!active) return null;
    return (localStorage.getItem('koperasi_user_role') as 'admin' | 'member') || 'admin';
  });

  const [loggedMember, setLoggedMember] = useState<Member | null>(() => {
    const memStr = localStorage.getItem('koperasi_logged_member');
    if (memStr) {
      try {
        return JSON.parse(memStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (role: 'admin' | 'member', member?: Member) => {
    setIsLoggedIn(true);
    setUserRole(role);
    localStorage.setItem('koperasi_session_active', 'true');
    localStorage.setItem('koperasi_user_role', role);
    if (role === 'member' && member) {
      setLoggedMember(member);
      localStorage.setItem('koperasi_logged_member', JSON.stringify(member));
    } else {
      setLoggedMember(null);
      localStorage.removeItem('koperasi_logged_member');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setLoggedMember(null);
    localStorage.removeItem('koperasi_session_active');
    localStorage.removeItem('koperasi_user_role');
    localStorage.removeItem('koperasi_logged_member');
  };

  // Centralised Financial Stores connected to Cloud Firestore (with LocalStorage fallback)
  const [setup, setSetup] = useState<KoperasiSetup>(initialSetup);

  // Dynamic branding color application effect
  useEffect(() => {
    const selectedColor = setup?.warnaUtama || 'emerald';
    const palette = (COLOR_PALETTES as any)[selectedColor] || COLOR_PALETTES.emerald;
    Object.entries(palette).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--brand-${shade}`, hex as string);
    });
  }, [setup?.warnaUtama]);

  const [members, setMembers] = useState<Member[]>([]);
  const [simpanan, setSimpanan] = useState<Simpanan[]>([]);
  const [pinjaman, setPinjaman] = useState<Pinjaman[]>([]);
  const [angsuran, setAngsuran] = useState<Angsuran[]>([]);
  const [income, setIncome] = useState<PendapatanLain[]>([]);
  const [expenses, setExpenses] = useState<BebanKoperasi[]>([]);
  const [pembelian, setPembelian] = useState<Pembelian[]>([]);
  const [piutangWarung, setPiutangWarung] = useState<PiutangWarung[]>([]);
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [pengajuanPinjaman, setPengajuanPinjaman] = useState<PengajuanPinjaman[]>([]);
  const [pembayaranPending, setPembayaranPending] = useState<PembayaranPending[]>([]);
  const [warungBarang, setWarungBarang] = useState<WarungBarang[]>([]);
  const [pengurusPengawas, setPengurusPengawas] = useState<PengurusPengawas[]>([]);
  const [galeriKoperasi, setGaleriKoperasi] = useState<GaleriKoperasi[]>([]);
  const [rekening, setRekening] = useState<RekeningNeraca[]>([]);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  // Firestore & local storage loader effect
  useEffect(() => {
    async function initAndSyncDatabase() {
      setIsDbLoading(true);
      try {
        console.log("Checking cooperative setup in cloud database...");
        const dbSetup = await fetchKoperasiSetup();

        if (!dbSetup) {
          console.log("Database is empty. Seeding initial cooperative records...");
          await saveKoperasiSetup(initialSetup);
          await seedCollection<Member>('members', initialMembers);
          await seedCollection<Simpanan>('simpanan', initialSimpanan);
          await seedCollection<Pinjaman>('pinjaman', initialPinjaman);
          await seedCollection<Angsuran>('angsuran', initialAngsuran);
          await seedCollection<PendapatanLain>('income', initialPendapatan);
          await seedCollection<BebanKoperasi>('expenses', initialBeban);
          await seedCollection<Pembelian>('pembelian', initialPembelian);
          await seedCollection<PiutangWarung>('piutang_warung', initialPiutangWarung);
          await seedCollection<Pengumuman>('announcements', initialAnnouncements);
          await seedCollection<PengajuanPinjaman>('pengajuan_pinjaman', initialPengajuanPinjaman);
          await seedCollection<PembayaranPending>('pembayaran_pending', initialPembayaranPending);
          await seedCollection<WarungBarang>('warung_barang', initialWarungBarang);
          await seedCollection<PengurusPengawas>('pengurus_pengawas', initialPengurusPengawas);
          await seedCollection<GaleriKoperasi>('galeri_koperasi', initialGaleriKoperasi);
          await seedCollection<RekeningNeraca>('rekening', initialRekeningNeraca);

          setSetup(initialSetup);
          setMembers(initialMembers);
          setSimpanan(initialSimpanan);
          setPinjaman(initialPinjaman);
          setAngsuran(initialAngsuran);
          setIncome(initialPendapatan);
          setExpenses(initialBeban);
          setPembelian(initialPembelian);
          setPiutangWarung(initialPiutangWarung);
          setAnnouncements(initialAnnouncements);
          setPengajuanPinjaman(initialPengajuanPinjaman);
          setPembayaranPending(initialPembayaranPending);
          setWarungBarang(initialWarungBarang);
          setPengurusPengawas(initialPengurusPengawas);
          setGaleriKoperasi(initialGaleriKoperasi);
          setRekening(initialRekeningNeraca);
        } else {
          console.log("Found existing cloud data. Loading all cooperative records...");
          const [dbMembers, dbSimpanan, dbPinjaman, dbAngsuran, dbIncome, dbExpenses, dbPembelian, dbPiutang, dbAnnouncements, dbPengajuan, dbWarungBarang, dbPengurus, dbGaleri, dbRekening, dbPembayaran] = await Promise.all([
            fetchCollection<Member>('members'),
            fetchCollection<Simpanan>('simpanan'),
            fetchCollection<Pinjaman>('pinjaman'),
            fetchCollection<Angsuran>('angsuran'),
            fetchCollection<PendapatanLain>('income'),
            fetchCollection<BebanKoperasi>('expenses'),
            fetchCollection<Pembelian>('pembelian'),
            fetchCollection<PiutangWarung>('piutang_warung'),
            fetchCollection<Pengumuman>('announcements'),
            fetchCollection<PengajuanPinjaman>('pengajuan_pinjaman'),
            fetchCollection<WarungBarang>('warung_barang'),
            fetchCollection<PengurusPengawas>('pengurus_pengawas'),
            fetchCollection<GaleriKoperasi>('galeri_koperasi'),
            fetchCollection<RekeningNeraca>('rekening'),
            fetchCollection<PembayaranPending>('pembayaran_pending')
          ]);

          // Automatic cleanup of legacy dummy records on cold load
          const hasDummyMembers = dbMembers && dbMembers.some(m => m.id === 'm-1' || m.id === 'm-2' || m.id === 'm-3' || m.id === 'm-4' || m.id === 'm-5');
          if (hasDummyMembers) {
            console.log("Detected legacy dummy records in cloud. Cleansing Firestore database for real empty deployment...");
            try {
              await clearCollection('members');
              await clearCollection('simpanan');
              await clearCollection('pinjaman');
              await clearCollection('angsuran');
              await clearCollection('income');
              await clearCollection('expenses');
              await clearCollection('pembelian');
              await clearCollection('piutang_warung');
              await clearCollection('announcements');
              await clearCollection('pengajuan_pinjaman');
              await clearCollection('warung_barang');
              await clearCollection('pengurus_pengawas');
              await clearCollection('galeri_koperasi');
              await clearCollection('rekening');
            } catch (clearErr) {
              console.error("Error auto-clearing legacy dummy records:", clearErr);
            }

            setSetup(dbSetup);
            setMembers([]);
            setSimpanan([]);
            setPinjaman([]);
            setAngsuran([]);
            setIncome([]);
            setExpenses([]);
            setPembelian([]);
            setPiutangWarung([]);
            setAnnouncements([]);
            setPengajuanPinjaman([]);
            setWarungBarang(initialWarungBarang);
            setPengurusPengawas(initialPengurusPengawas);
            setGaleriKoperasi(initialGaleriKoperasi);
            setRekening([]);
          } else {
            setSetup(dbSetup);
            setMembers(dbMembers || []);
            setSimpanan(dbSimpanan || []);
            setPinjaman(dbPinjaman || []);
            setAngsuran(dbAngsuran || []);
            setIncome(dbIncome || []);
            setExpenses(dbExpenses || []);
            setPembelian(dbPembelian || []);
            setPiutangWarung(dbPiutang || []);
            setAnnouncements(dbAnnouncements || []);
            setPengajuanPinjaman(dbPengajuan || []);
            setPembayaranPending(dbPembayaran || []);
            setWarungBarang(dbWarungBarang && dbWarungBarang.length > 0 ? dbWarungBarang : initialWarungBarang);
            setPengurusPengawas(dbPengurus && dbPengurus.length > 0 ? dbPengurus : initialPengurusPengawas);
            setGaleriKoperasi(dbGaleri && dbGaleri.length > 0 ? dbGaleri : initialGaleriKoperasi);
            
            const rawRekening = dbRekening && dbRekening.length > 0 ? dbRekening : initialRekeningNeraca;
            const filteredRek = rawRekening.filter(r => !['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode));
            setRekening(filteredRek);

            // Clean up from Firestore if they were loaded from database
            if (dbRekening && dbRekening.length > 0) {
              const toDelete = dbRekening.filter(r => ['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode));
              if (toDelete.length > 0) {
                Promise.all(toDelete.map(r => deleteCollectionItem('rekening', r.id).catch(e => console.error(e))));
              }
            }
          }
        }
      } catch (err) {
        console.error("Cloud database syncing failed, utilizing local storage backup", err);
        const dataSetup = localStorage.getItem('kop_setup');
        const dataMembers = localStorage.getItem('kop_members');
        const dataSimpanan = localStorage.getItem('kop_simpanan');
        const dataPinjaman = localStorage.getItem('kop_pinjaman');
        const dataAngsuran = localStorage.getItem('kop_angsuran');
        const dataIncome = localStorage.getItem('kop_income');
        const dataExpenses = localStorage.getItem('kop_expenses');
        const dataPembelian = localStorage.getItem('kop_pembelian');
        const dataPiutang = localStorage.getItem('kop_piutang_warung');
        const dataAnnouncements = localStorage.getItem('kop_announcements');
        const dataPengajuan = localStorage.getItem('kop_pengajuan_pinjaman');
        const dataPembayaran = localStorage.getItem('kop_pembayaran_pending');
        const dataWarungBarang = localStorage.getItem('kop_warung_barang');
        const dataPengurus = localStorage.getItem('kop_pengurus_pengawas');
        const dataGaleri = localStorage.getItem('kop_galeri_koperasi');
        const dataRekening = localStorage.getItem('kop_rekening');

        if (dataSetup) setSetup(JSON.parse(dataSetup));
        if (dataMembers) setMembers(JSON.parse(dataMembers));
        if (dataSimpanan) setSimpanan(JSON.parse(dataSimpanan));
        if (dataPinjaman) setPinjaman(JSON.parse(dataPinjaman));
        if (dataAngsuran) setAngsuran(JSON.parse(dataAngsuran));
        if (dataIncome) setIncome(JSON.parse(dataIncome));
        if (dataExpenses) setExpenses(JSON.parse(dataExpenses));
        if (dataPembelian) setPembelian(JSON.parse(dataPembelian));
        if (dataPiutang) setPiutangWarung(JSON.parse(dataPiutang));
        if (dataAnnouncements) setAnnouncements(JSON.parse(dataAnnouncements));
        if (dataPengajuan) setPengajuanPinjaman(JSON.parse(dataPengajuan));
        if (dataPembayaran) setPembayaranPending(JSON.parse(dataPembayaran));
        if (dataWarungBarang) setWarungBarang(JSON.parse(dataWarungBarang));
        if (dataPengurus) setPengurusPengawas(JSON.parse(dataPengurus));
        if (dataGaleri) setGaleriKoperasi(JSON.parse(dataGaleri));
        if (dataRekening) {
          const parsed = JSON.parse(dataRekening) as RekeningNeraca[];
          setRekening(parsed.filter(r => !['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode)));
        }
      } finally {
        setIsDbLoading(false);
      }
    }
    initAndSyncDatabase();
  }, []);

  // Sync to localStorage as progressive web offline backup
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_setup', JSON.stringify(setup)); }, [setup, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_members', JSON.stringify(members)); }, [members, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_simpanan', JSON.stringify(simpanan)); }, [simpanan, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pinjaman', JSON.stringify(pinjaman)); }, [pinjaman, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_angsuran', JSON.stringify(angsuran)); }, [angsuran, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_income', JSON.stringify(income)); }, [income, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_expenses', JSON.stringify(expenses)); }, [expenses, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pembelian', JSON.stringify(pembelian)); }, [pembelian, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_piutang_warung', JSON.stringify(piutangWarung)); }, [piutangWarung, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_announcements', JSON.stringify(announcements)); }, [announcements, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pengajuan_pinjaman', JSON.stringify(pengajuanPinjaman)); }, [pengajuanPinjaman, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pembayaran_pending', JSON.stringify(pembayaranPending)); }, [pembayaranPending, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_warung_barang', JSON.stringify(warungBarang)); }, [warungBarang, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_pengurus_pengawas', JSON.stringify(pengurusPengawas)); }, [pengurusPengawas, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_galeri_koperasi', JSON.stringify(galeriKoperasi)); }, [galeriKoperasi, isDbLoading]);
  useEffect(() => { if (!isDbLoading) localStorage.setItem('kop_rekening', JSON.stringify(rekening)); }, [rekening, isDbLoading]);

  // Active Routing state
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman' | 'warung' | 'pengurus' | 'galeri'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authoritative real-time available cash balance
  const availableCash = useMemo(() => {
    const kasAwal = setup?.kasAwal ?? 0;
    const totalSimpananAll = simpanan.reduce((a, c) => a + c.jumlah, 0);
    const totalDisbursedAll = pinjaman.reduce((a, c) => a + c.nominalPinjaman, 0);
    const totalAngsuranAll = angsuran.reduce((a, c) => a + c.jumlahBayar, 0);
    const totalIncAll = income.reduce((a, c) => a + c.nominal, 0);
    const totalExpAll = expenses.reduce((a, c) => a + c.nominal, 0);

    const totalPembelianAll = pembelian.reduce((sum, p) => sum + p.totalHarga, 0);
    const totalHutangBaruWarung = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((sum, pw) => sum + pw.nominal, 0);
    const totalPelunasanWarung = piutangWarung.filter(pw => pw.jenis === 'pelunasan').reduce((sum, pw) => sum + pw.nominal, 0);
    const provisiRevenueAll = pinjaman.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);

    return kasAwal + totalSimpananAll + totalAngsuranAll + totalIncAll + totalPelunasanWarung + provisiRevenueAll - totalDisbursedAll - totalExpAll - totalPembelianAll - totalHutangBaruWarung;
  }, [setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung]);

  // Count of loans that will fall due within the next 7 days for admin badge
  const dueLoansCount = useMemo(() => {
    const activeLoans = pinjaman.filter(p => p.status === 'Belum Lunas');
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    let count = 0;
    activeLoans.forEach(p => {
      const m = members.find(mem => mem.id === p.anggotaId);
      if (!m) return;

      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === p.id);
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
        count++;
      }
    });

    return count;
  }, [pinjaman, members, angsuran]);

  // Password protection states for Profil Koperasi
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showModalPassword, setShowModalPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [pendingTab, setPendingTab] = useState<'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman' | 'warung' | 'pengurus' | 'galeri' | null>(null);

  // Success Popup state for all transaction types
  const [successPopup, setSuccessPopup] = useState<{
    isOpen: boolean;
    title: string;
    subTitle?: string;
    details?: { label: string; value: string | number; isCurrency?: boolean }[];
  } | null>(null);

  const triggerSuccessPopup = (
    title: string,
    subTitle?: string,
    details?: { label: string; value: string | number; isCurrency?: boolean }[]
  ) => {
    setSuccessPopup({
      isOpen: true,
      title,
      subTitle,
      details
    });
  };

  const handleNavigation = (tabId: 'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman' | 'warung' | 'pengurus' | 'galeri') => {
    setActiveTab(tabId);
  };

  // Mutators for warung_barang
  const handleAddBarang = async (newB: Omit<WarungBarang, 'id'>) => {
    const id = `wb-${Date.now()}`;
    const item: WarungBarang = { ...newB, id };
    setWarungBarang(prev => [...prev, item]);
    await saveCollectionItem<WarungBarang>('warung_barang', item);
  };

  const handleEditBarang = async (updatedB: WarungBarang) => {
    setWarungBarang(prev => prev.map(b => b.id === updatedB.id ? updatedB : b));
    await saveCollectionItem<WarungBarang>('warung_barang', updatedB);
  };

  const handleDeleteBarang = async (id: string) => {
    setWarungBarang(prev => prev.filter(b => b.id !== id));
    await deleteCollectionItem('warung_barang', id);
  };

  // Mutators for pengurus_pengawas
  const handleAddPerson = async (newP: Omit<PengurusPengawas, 'id'>) => {
    const id = `pp-${Date.now()}`;
    const item: PengurusPengawas = { ...newP, id };
    setPengurusPengawas(prev => [...prev, item]);
    await saveCollectionItem<PengurusPengawas>('pengurus_pengawas', item);
  };

  const handleEditPerson = async (updatedP: PengurusPengawas) => {
    setPengurusPengawas(prev => prev.map(p => p.id === updatedP.id ? updatedP : p));
    await saveCollectionItem<PengurusPengawas>('pengurus_pengawas', updatedP);
  };

  const handleDeletePerson = async (id: string) => {
    setPengurusPengawas(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pengurus_pengawas', id);
  };

  // Mutators for galeri_koperasi
  const handleAddGaleri = async (newG: Omit<GaleriKoperasi, 'id'>) => {
    const id = `gk-${Date.now()}`;
    const item: GaleriKoperasi = { ...newG, id };
    setGaleriKoperasi(prev => [...prev, item]);
    await saveCollectionItem<GaleriKoperasi>('galeri_koperasi', item);
  };

  const handleEditGaleri = async (updatedG: GaleriKoperasi) => {
    setGaleriKoperasi(prev => prev.map(g => g.id === updatedG.id ? updatedG : g));
    await saveCollectionItem<GaleriKoperasi>('galeri_koperasi', updatedG);
  };

  const handleDeleteGaleri = async (id: string) => {
    setGaleriKoperasi(prev => prev.filter(g => g.id !== id));
    await deleteCollectionItem('galeri_koperasi', id);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'D4nasegar') {
      sessionStorage.setItem('kop_profil_verified', 'true');
      setShowPasswordModal(false);
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    } else {
      setPasswordError('Password salah. Silakan coba lagi.');
    }
  };

  // Mutations writing instantly to UI (Optimistic) and saving to Firestore in background
  const handleAddMember = async (newM: Omit<Member, 'id'>) => {
    const id = `m-${Date.now()}`;
    const item: Member = { ...newM, id };
    setMembers(prev => [...prev, item]);
    await saveCollectionItem<Member>('members', item);
  };

  const handleEditMember = async (updatedM: Member) => {
    setMembers(prev => prev.map(m => m.id === updatedM.id ? updatedM : m));
    await saveCollectionItem<Member>('members', updatedM);
  };

  const handleDeleteMember = async (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setSimpanan(prev => prev.filter(s => s.anggotaId !== id));
    setPinjaman(prev => prev.filter(p => p.anggotaId !== id));
    setAngsuran(prev => prev.filter(a => a.anggotaId !== id));

    await deleteCollectionItem('members', id);
  };

  const handleAddSimpanan = async (newS: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => {
    if (Array.isArray(newS)) {
      const freshSavings = newS.map((s, idx) => ({ ...s, id: `s-${Date.now()}-${idx}` }));
      setSimpanan(prev => [...prev, ...freshSavings]);
      for (const item of freshSavings) {
        await saveCollectionItem<Simpanan>('simpanan', item);
      }
      const totalAmount = freshSavings.reduce((acc, s) => acc + s.jumlah, 0);
      const firstS = freshSavings[0];
      const m = members.find(m => m.id === firstS.anggotaId);
      triggerSuccessPopup(
        totalAmount >= 0 ? "Setor Simpanan Berhasil" : "Penarikan Simpanan Berhasil",
        totalAmount >= 0 ? "Simpanan koperasi berhasil disetor dan dibukukan" : "Penarikan simpanan berhasil dibukukan",
        [
          { label: "Nama Anggota", value: m?.nama || "Umum" },
          { label: "Total Transaksi", value: Math.abs(totalAmount), isCurrency: true },
          { label: "Tanggal", value: firstS.tanggal }
        ]
      );
    } else {
      const item: Simpanan = { ...newS, id: `s-${Date.now()}` };
      setSimpanan(prev => [...prev, item]);
      await saveCollectionItem<Simpanan>('simpanan', item);
      const m = members.find(m => m.id === newS.anggotaId);
      triggerSuccessPopup(
        item.jumlah >= 0 ? "Setor Simpanan Berhasil" : "Penarikan Simpanan Berhasil",
        item.jumlah >= 0 ? `Setoran Simpanan ${newS.jenis} berhasil dibukukan` : `Penarikan Simpanan ${newS.jenis} berhasil dibukukan`,
        [
          { label: "Nama Anggota", value: m?.nama || "Umum" },
          { label: "Jenis Simpanan", value: newS.jenis },
          { label: "Nominal", value: Math.abs(item.jumlah), isCurrency: true },
          { label: "Tanggal", value: item.tanggal }
        ]
      );
    }
  };

  const handleAddPinjaman = async (newP: Omit<Pinjaman, 'id'>) => {
    const id = `p-${Date.now()}`;
    const item: Pinjaman = { ...newP, id };
    setPinjaman(prev => [...prev, item]);
    await saveCollectionItem<Pinjaman>('pinjaman', item);
    const m = members.find(m => m.id === newP.anggotaId);
    triggerSuccessPopup(
      "Pencairan Pinjaman Berhasil",
      "Pemberian pinjaman koperasi telah disetujui dan dicairkan",
      [
        { label: "Nama Anggota", value: m?.nama || "Umum" },
        { label: "Nominal Pinjaman", value: newP.nominalPinjaman, isCurrency: true },
        { label: "Tenor", value: `${newP.tenor} Bulan` },
        { label: "Angsuran Bulanan", value: newP.totalAngsuranPerBulan, isCurrency: true }
      ]
    );
  };

  const handleEditPinjaman = async (updatedP: Pinjaman) => {
    setPinjaman(prev => prev.map(p => p.id === updatedP.id ? updatedP : p));
    await saveCollectionItem<Pinjaman>('pinjaman', updatedP);
  };

  const handleDeletePinjaman = async (id: string) => {
    setPinjaman(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pinjaman', id);
  };

  const handleAddPengajuanPinjaman = async (newPengajuan: Omit<PengajuanPinjaman, 'id' | 'status' | 'tanggalPengajuan' | 'catatanPengurus'>) => {
    const id = `req-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if member already has an active loan (status === 'Belum Lunas')
    const hasActiveLoan = pinjaman.some(p => p.anggotaId === newPengajuan.anggotaId && p.status === 'Belum Lunas');
    
    const item: PengajuanPinjaman = {
      ...newPengajuan,
      id,
      status: hasActiveLoan ? ('Ditolak' as const) : ('Pending' as const),
      tanggalPengajuan: todayStr,
      catatanPengurus: hasActiveLoan ? 'Ditolak otomatis oleh sistem: Anggota masih memiliki pinjaman aktif yang belum lunas.' : ''
    };
    setPengajuanPinjaman(prev => [...prev, item]);
    await saveCollectionItem<PengajuanPinjaman>('pengajuan_pinjaman', item);
  };

  const handleApprovePengajuanPinjaman = async (id: string, catatan: string, customNominal?: number) => {
    const updatedList = pengajuanPinjaman.map(p => {
      if (p.id === id) {
        const approvedNominal = customNominal !== undefined && customNominal > 0 ? customNominal : p.nominalPinjaman;
        const provisi = (approvedNominal * p.biayaProvisiPersen) / 100;
        const diterima = approvedNominal - provisi;

        const updated = { 
          ...p, 
          status: 'Disetujui' as const, 
          catatanPengurus: catatan,
          nominalPinjaman: approvedNominal,
          provisiDipotong: provisi,
          jumlahDiterima: diterima
        };
        saveCollectionItem<PengajuanPinjaman>('pengajuan_pinjaman', updated);
        
        // Auto create real active loan!
        const newLoanId = `p-${Date.now()}`;
        const todayStr = new Date().toISOString().split('T')[0];
        
        const angsuranPokokPerBulan = Math.round(approvedNominal / p.tenor);
        const jasaPerBulan = Math.round((approvedNominal * p.bungaFlatPersen) / 100);
        const totalAngsuranPerBulan = angsuranPokokPerBulan + jasaPerBulan;
        const totalWajibBayar = totalAngsuranPerBulan * p.tenor;

        const newPinjaman: Pinjaman = {
          id: newLoanId,
          anggotaId: p.anggotaId,
          tanggal: todayStr,
          nominalPinjaman: approvedNominal,
          tenor: p.tenor,
          bungaFlatPersen: p.bungaFlatPersen,
          biayaProvisiPersen: p.biayaProvisiPersen,
          provisiDipotong: provisi,
          jumlahDiterima: diterima,
          status: 'Belum Lunas' as const,
          angsuranPokokPerBulan,
          jasaPerBulan,
          totalAngsuranPerBulan,
          totalWajibBayar
        };
        setPinjaman(prev => [...prev, newPinjaman]);
        saveCollectionItem<Pinjaman>('pinjaman', newPinjaman);

        return updated;
      }
      return p;
    });
    setPengajuanPinjaman(updatedList);
  };

  const handleRejectPengajuanPinjaman = async (id: string, catatan: string) => {
    setPengajuanPinjaman(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, status: 'Ditolak' as const, catatanPengurus: catatan };
        saveCollectionItem<PengajuanPinjaman>('pengajuan_pinjaman', updated);
        return updated;
      }
      return p;
    }));
  };

  const handleAddPembayaranPending = async (newPayment: Omit<PembayaranPending, 'id' | 'status'>) => {
    const id = `pay-${Date.now()}`;
    const item: PembayaranPending = {
      ...newPayment,
      id,
      status: 'Pending'
    };
    setPembayaranPending(prev => [...prev, item]);
    await saveCollectionItem<PembayaranPending>('pembayaran_pending', item);
  };

  const handleApprovePembayaranPending = async (id: string, catatan?: string) => {
    setPembayaranPending(prev => prev.map(p => {
      if (p.id === id) {
        const updated: PembayaranPending = {
          ...p,
          status: 'Disetujui' as const,
          catatanPengurus: catatan || 'Disetujui oleh pengurus.'
        };
        saveCollectionItem<PembayaranPending>('pembayaran_pending', updated);

        // Process actual ledger entry based on payment type
        if (p.jenis === 'Simpanan Pokok') {
          handleAddSimpanan({
            anggotaId: p.anggotaId,
            tanggal: p.tanggal,
            jenis: 'Pokok',
            jumlah: p.jumlah,
            keterangan: p.keterangan || 'Setoran Simpanan Pokok mandiri divalidasi'
          });
        } else if (p.jenis === 'Simpanan Wajib') {
          handleAddSimpanan({
            anggotaId: p.anggotaId,
            tanggal: p.tanggal,
            jenis: 'Wajib',
            jumlah: p.jumlah,
            keterangan: p.keterangan || 'Setoran Simpanan Wajib mandiri divalidasi'
          });
        } else if (p.jenis === 'Simpanan Manasuka') {
          handleAddSimpanan({
            anggotaId: p.anggotaId,
            tanggal: p.tanggal,
            jenis: 'Sukarela',
            jumlah: p.jumlah,
            keterangan: p.keterangan || 'Setoran Simpanan Manasuka mandiri divalidasi'
          });
        } else if (p.jenis === 'Angsuran') {
          // Check if loan is lunas
          const pinj = pinjaman.find(loan => loan.id === p.pinjamanId);
          const related = angsuran.filter(a => a.pinjamanId === p.pinjamanId);
          const paidMonthsCount = related.length + 1;
          const markAsLunas = pinj ? paidMonthsCount >= pinj.tenor : false;

          handleAddAngsuran({
            pinjamanId: p.pinjamanId!,
            anggotaId: p.anggotaId,
            tanggal: p.tanggal,
            jumlahBayar: p.jumlah,
            bulanKe: p.bulanKe || 1,
            keterangan: p.keterangan || `Angsuran ke-${p.bulanKe} mandiri divalidasi`
          }, markAsLunas);
        } else if (p.jenis === 'Simpanan Wajib & Angsuran' || p.jenis === 'Gabungan') {
          // Process Simpanan Pokok part
          if (p.jumlahSimpananPokok && p.jumlahSimpananPokok > 0) {
            handleAddSimpanan({
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              jenis: 'Pokok',
              jumlah: p.jumlahSimpananPokok,
              keterangan: p.keterangan || 'Setoran Simpanan Pokok mandiri (gabungan) divalidasi'
            });
          }
          // Process Simpanan Wajib part
          if (p.jumlahSimpananWajib && p.jumlahSimpananWajib > 0) {
            handleAddSimpanan({
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              jenis: 'Wajib',
              jumlah: p.jumlahSimpananWajib,
              keterangan: p.keterangan || 'Setoran Simpanan Wajib mandiri (gabungan) divalidasi'
            });
          }
          // Process Simpanan Manasuka part
          if (p.jumlahSimpananManasuka && p.jumlahSimpananManasuka > 0) {
            handleAddSimpanan({
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              jenis: 'Sukarela',
              jumlah: p.jumlahSimpananManasuka,
              keterangan: p.keterangan || 'Setoran Simpanan Manasuka mandiri (gabungan) divalidasi'
            });
          }
          // Process Angsuran part
          if (p.jumlahAngsuran && p.jumlahAngsuran > 0 && p.pinjamanId) {
            const pinj = pinjaman.find(loan => loan.id === p.pinjamanId);
            const related = angsuran.filter(a => a.pinjamanId === p.pinjamanId);
            const paidMonthsCount = related.length + 1;
            const markAsLunas = pinj ? paidMonthsCount >= pinj.tenor : false;

            handleAddAngsuran({
              pinjamanId: p.pinjamanId,
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              jumlahBayar: p.jumlahAngsuran,
              bulanKe: p.bulanKe || 1,
              keterangan: p.keterangan || `Angsuran ke-${p.bulanKe} mandiri (gabungan) divalidasi`
            }, markAsLunas);
          }
        }

        return updated;
      }
      return p;
    }));
  };

  const handleRejectPembayaranPending = async (id: string, catatan?: string) => {
    setPembayaranPending(prev => prev.map(p => {
      if (p.id === id) {
        const updated: PembayaranPending = {
          ...p,
          status: 'Ditolak' as const,
          catatanPengurus: catatan || 'Ditolak oleh pengurus.'
        };
        saveCollectionItem<PembayaranPending>('pembayaran_pending', updated);
        return updated;
      }
      return p;
    }));
  };

  const handleAddAngsuran = async (newA: Omit<Angsuran, 'id'>, markAsLunas: boolean) => {
    const id = `a-${Date.now()}`;
    const item: Angsuran = { ...newA, id };
    setAngsuran(prev => [...prev, item]);
    await saveCollectionItem<Angsuran>('angsuran', item);

    if (markAsLunas) {
      setPinjaman(prev => prev.map(p => {
        if (p.id === newA.pinjamanId) {
          const updated = { ...p, status: 'Lunas' as const };
          saveCollectionItem<Pinjaman>('pinjaman', updated);
          return updated;
        }
        return p;
      }));
    }

    const m = members.find(m => m.id === newA.anggotaId);
    triggerSuccessPopup(
      "Pembayaran Angsuran Berhasil",
      `Pencatatan angsuran bulan ke-${newA.bulanKe} telah berhasil disimpan`,
      [
        { label: "Nama Anggota", value: m?.nama || "Umum" },
        { label: "Angsuran Bulan Ke", value: newA.bulanKe },
        { label: "Jumlah Bayar", value: newA.jumlahBayar, isCurrency: true },
        { label: "Status Pinjaman", value: markAsLunas ? "LUNAS" : "Belum Lunas" }
      ]
    );
  };

  const handleDeleteAngsuran = async (id: string) => {
    console.log("handleDeleteAngsuran triggered for ID:", id);
    const target = angsuran.find(a => a.id === id);
    if (!target) {
      console.warn("handleDeleteAngsuran: Target installment not found in state for ID:", id);
      alert("Catatan angsuran tidak ditemukan.");
      return;
    }

    try {
      // Optmistically update local state
      setAngsuran(prev => prev.filter(a => a.id !== id));
      
      // Perform database deletion
      await deleteCollectionItem('angsuran', id);
      console.log("handleDeleteAngsuran: Database deletion successful for ID:", id);

      // Revert Pinjaman status to 'Belum Lunas' if it was set to 'Lunas'
      const relatedPinjaman = pinjaman.find(p => p.id === target.pinjamanId);
      if (relatedPinjaman && relatedPinjaman.status === 'Lunas') {
        setPinjaman(prev => prev.map(p => {
          if (p.id === target.pinjamanId) {
            const updated = { ...p, status: 'Belum Lunas' as const };
            saveCollectionItem<Pinjaman>('pinjaman', updated);
            return updated;
          }
          return p;
        }));
        console.log("handleDeleteAngsuran: Related loan status reverted to Belum Lunas.");
      }
      
      alert("Catatan angsuran berhasil dihapus.");
    } catch (error) {
      console.error("handleDeleteAngsuran failed:", error);
      // Rollback local state
      setAngsuran(prev => {
        if (prev.some(a => a.id === id)) return prev;
        return [...prev, target].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      });
      alert(`Gagal menghapus angsuran: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteSimpanan = async (id: string) => {
    console.log("handleDeleteSimpanan triggered for ID:", id);
    const target = simpanan.find(s => s.id === id);
    if (!target) {
      console.warn("handleDeleteSimpanan: Target savings not found in state for ID:", id);
      alert("Catatan simpanan tidak ditemukan.");
      return;
    }

    try {
      // Optimistically update local state
      setSimpanan(prev => prev.filter(s => s.id !== id));
      
      // Perform database deletion
      await deleteCollectionItem('simpanan', id);
      console.log("handleDeleteSimpanan: Database deletion successful for ID:", id);
      
      alert("Catatan simpanan berhasil dihapus.");
    } catch (error) {
      console.error("handleDeleteSimpanan failed:", error);
      // Rollback local state
      setSimpanan(prev => {
        if (prev.some(s => s.id === id)) return prev;
        return [...prev, target].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      });
      alert(`Gagal menghapus simpanan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEditSimpanan = async (updated: Simpanan) => {
    console.log("handleEditSimpanan triggered for:", updated);
    const original = simpanan.find(s => s.id === updated.id);
    if (!original) {
      console.warn("handleEditSimpanan: Original savings not found for ID:", updated.id);
      alert("Catatan simpanan tidak ditemukan.");
      return;
    }

    try {
      // Optimistically update local state
      setSimpanan(prev => prev.map(s => s.id === updated.id ? updated : s));
      
      // Save to DB
      await saveCollectionItem<Simpanan>('simpanan', updated);
      console.log("handleEditSimpanan: Database update successful for ID:", updated.id);
      
      alert("Catatan simpanan berhasil diperbarui.");
    } catch (error) {
      console.error("handleEditSimpanan failed:", error);
      // Rollback
      setSimpanan(prev => prev.map(s => s.id === updated.id ? original : s));
      alert(`Gagal memperbarui simpanan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddIncome = async (newI: Omit<PendapatanLain, 'id'>) => {
    const id = `pe-${Date.now()}`;
    const item: PendapatanLain = { ...newI, id };
    setIncome(prev => [...prev, item]);
    await saveCollectionItem<PendapatanLain>('income', item);
    triggerSuccessPopup(
      "Pendapatan Lain Disimpan",
      "Pencatatan pendapatan/penerimaan kas berhasil dibukukan",
      [
        { label: "Uraian / Sumber", value: newI.keterangan },
        { label: "Nominal", value: newI.nominal, isCurrency: true },
        { label: "Tanggal", value: newI.tanggal }
      ]
    );
  };

  const handleAddExpense = async (newE: Omit<BebanKoperasi, 'id'>) => {
    const id = `b-${Date.now()}`;
    const item: BebanKoperasi = { ...newE, id };
    setExpenses(prev => [...prev, item]);
    await saveCollectionItem<BebanKoperasi>('expenses', item);
    triggerSuccessPopup(
      "Beban / Pengeluaran Disimpan",
      "Pencatatan beban/pengeluaran kas berhasil dibukukan",
      [
        { label: "Uraian Beban", value: newE.keterangan },
        { label: "Nominal", value: newE.nominal, isCurrency: true },
        { label: "Tanggal", value: newE.tanggal }
      ]
    );
  };

  const handleDeleteIncome = async (id: string) => {
    setIncome(prev => prev.filter(i => i.id !== id));
    await deleteCollectionItem('income', id);
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await deleteCollectionItem('expenses', id);
  };

  const handleSaveRekening = async (rek: RekeningNeraca) => {
    setRekening(prev => {
      const idx = prev.findIndex(item => item.id === rek.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = rek;
        return updated;
      }
      return [...prev, rek];
    });
    try {
      await saveCollectionItem<RekeningNeraca>('rekening', rek);
    } catch (err) {
      console.error("Error saving custom account to database:", err);
    }
  };

  const handleDeleteRekening = async (id: string) => {
    setRekening(prev => prev.filter(item => item.id !== id));
    try {
      await deleteCollectionItem('rekening', id);
    } catch (err) {
      console.error("Error deleting custom account from database:", err);
    }
  };

  const handleClearArusKas = async () => {
    try {
      await clearCollection('income');
      await clearCollection('expenses');
      setIncome([]);
      setExpenses([]);
    } catch (err) {
      console.error("Gagal mengosongkan data kas:", err);
    }
  };

  const handleAddPembelian = async (newP: Omit<Pembelian, 'id'>) => {
    if (newP.totalHarga > availableCash) {
      alert(`Transaksi gagal! Saldo kas tidak mencukupi untuk melakukan pembelian ini.\n\nSaldo Kas Saat Ini: ${formatRupiah(availableCash)}\nTotal Pembelian: ${formatRupiah(newP.totalHarga)}`);
      return;
    }
    const id = `pem-${Date.now()}`;
    const item: Pembelian = { ...newP, id };
    setPembelian(prev => [...prev, item]);
    await saveCollectionItem<Pembelian>('pembelian', item);
    triggerSuccessPopup(
      "Catatan Pembelian Disimpan",
      "Pencatatan pembelian aset/persediaan warung telah berhasil dibukukan",
      [
        { label: "Nama Barang", value: newP.namaBarang },
        { label: "Kategori POS", value: newP.kategori.replace('_', ' ').toUpperCase() },
        { label: "Kuantitas", value: newP.kuantitas },
        { label: "Total Pembelian", value: newP.totalHarga, isCurrency: true }
      ]
    );
  };

  const handleDeletePembelian = async (id: string) => {
    setPembelian(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pembelian', id);
  };

  const handleUpdatePembelian = async (id: string, updatedP: Omit<Pembelian, 'id'>) => {
    const item: Pembelian = { ...updatedP, id };
    setPembelian(prev => prev.map(p => p.id === id ? item : p));
    await saveCollectionItem<Pembelian>('pembelian', item);
    triggerSuccessPopup(
      "Catatan Pembelian Diperbarui",
      `Data pengadaan "${updatedP.namaBarang}" berhasil disimpan`,
      [
        { label: "Nama Barang", value: updatedP.namaBarang },
        { label: "Total Baru", value: updatedP.totalHarga, isCurrency: true },
        { label: "Tanggal", value: updatedP.tanggal }
      ]
    );
  };

  const handleAddPiutang = async (newP: Omit<PiutangWarung, 'id'>) => {
    const id = `pw-${Date.now()}`;
    const item: PiutangWarung = { ...newP, id };
    setPiutangWarung(prev => [...prev, item]);
    await saveCollectionItem<PiutangWarung>('piutang_warung', item);
    const m = members.find(m => m.id === newP.anggotaId);
    triggerSuccessPopup(
      newP.jenis === 'hutang_baru' ? "Pencatatan Belanja Kredit Berhasil" : "Pelunasan Piutang Berhasil",
      newP.jenis === 'hutang_baru' ? "Belanja kredit warung berhasil dicatat" : "Pelunasan piutang warung berhasil dicatat",
      [
        { label: "Nama Pelanggan", value: m?.nama || "Non-Anggota" },
        { label: "Nominal", value: newP.nominal, isCurrency: true },
        { label: "Tanggal", value: newP.tanggal }
      ]
    );
  };

  const handleDeletePiutang = async (id: string) => {
    setPiutangWarung(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('piutang_warung', id);
  };

  const handleUpdateSetup = async (newSetup: KoperasiSetup) => {
    setSetup(newSetup);
    await saveKoperasiSetup(newSetup);
  };

  const handleSyncFromFirebase = (newData: {
    setup?: KoperasiSetup;
    members?: Member[];
    simpanan?: Simpanan[];
    pinjaman?: Pinjaman[];
    angsuran?: Angsuran[];
    income?: PendapatanLain[];
    expenses?: BebanKoperasi[];
    pembelian?: Pembelian[];
    piutangWarung?: PiutangWarung[];
  }) => {
    if (newData.setup) setSetup(newData.setup);
    if (newData.members) setMembers(newData.members);
    if (newData.simpanan) setSimpanan(newData.simpanan);
    if (newData.pinjaman) setPinjaman(newData.pinjaman);
    if (newData.angsuran) setAngsuran(newData.angsuran);
    if (newData.income) setIncome(newData.income);
    if (newData.expenses) setExpenses(newData.expenses);
    if (newData.pembelian) setPembelian(newData.pembelian);
    if (newData.piutangWarung) setPiutangWarung(newData.piutangWarung);
  };

  const handleAddAnnouncement = async (item: Omit<Pengumuman, 'id'>) => {
    const id = `ann-${Date.now()}`;
    const newItem: Pengumuman = { ...item, id };
    setAnnouncements(prev => [newItem, ...prev]);
    try {
      await saveCollectionItem<Pengumuman>('announcements', newItem);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal menyimpan pengumuman ke cloud. Disimpan secara lokal.", err);
    }
  };

  const handleEditAnnouncement = async (item: Pengumuman) => {
    setAnnouncements(prev => prev.map(a => a.id === item.id ? item : a));
    try {
      await saveCollectionItem<Pengumuman>('announcements', item);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal mengubah pengumuman di cloud. Diubah secara lokal.", err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await deleteCollectionItem('announcements', id);
    } catch (err) {
      console.warn("Offline/Permission warning: Gagal menghapus pengumuman dari cloud. Dihapus secara lokal.", err);
    }
  };

  const handlePostManasukaBunga = (log: Omit<ManasukaBungaLog, 'id'>, autoPostSukarela: boolean) => {
    console.log("Manasuka dividend log registered:", log, autoPostSukarela);
  };

  const handleImportDatabase = async (dbData: any) => {
    const ensureId = (list: any[]) => {
      if (!Array.isArray(list)) return [];
      return list.map((item, idx) => ({
        ...item,
        id: item.id || `doc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
      }));
    };

    const newSetup = dbData.setup || initialSetup;
    const newMembers = ensureId(dbData.members);
    const newSimpanan = ensureId(dbData.simpanan);
    const newPinjaman = ensureId(dbData.pinjaman);
    const newAngsuran = ensureId(dbData.angsuran);
    const newIncome = ensureId(dbData.income);
    const newExpenses = ensureId(dbData.expenses);
    const newPembelian = ensureId(dbData.pembelian);
    const newPiutangWarung = ensureId(dbData.piutangWarung);
    const newAnnouncements = ensureId(dbData.announcements);
    const newPengajuanPinjaman = ensureId(dbData.pengajuanPinjaman);
    const newWarungBarang = ensureId(dbData.warungBarang);
    const newPengurusPengawas = ensureId(dbData.pengurusPengawas);
    const newGaleriKoperasi = ensureId(dbData.galeriKoperasi);

    // Update state variables (which also triggers useEffect saving to localStorage)
    setSetup(newSetup);
    setMembers(newMembers);
    setSimpanan(newSimpanan);
    setPinjaman(newPinjaman);
    setAngsuran(newAngsuran);
    setIncome(newIncome);
    setExpenses(newExpenses);
    setPembelian(newPembelian);
    setPiutangWarung(newPiutangWarung);
    setAnnouncements(newAnnouncements);
    setPengajuanPinjaman(newPengajuanPinjaman);
    setWarungBarang(newWarungBarang);
    setPengurusPengawas(newPengurusPengawas);
    setGaleriKoperasi(newGaleriKoperasi);

    try {
      // Clear Firestore collections to avoid duplication
      await clearCollection('members');
      await clearCollection('simpanan');
      await clearCollection('pinjaman');
      await clearCollection('angsuran');
      await clearCollection('income');
      await clearCollection('expenses');
      await clearCollection('pembelian');
      await clearCollection('piutang_warung');
      await clearCollection('announcements');
      await clearCollection('pengajuan_pinjaman');
      await clearCollection('warung_barang');
      await clearCollection('pengurus_pengawas');
      await clearCollection('galeri_koperasi');

      // Save Koperasi Setup info
      await saveKoperasiSetup(newSetup);

      // Batch write entities using seedCollection helper
      if (newMembers.length > 0) await seedCollection('members', newMembers);
      if (newSimpanan.length > 0) await seedCollection('simpanan', newSimpanan);
      if (newPinjaman.length > 0) await seedCollection('pinjaman', newPinjaman);
      if (newAngsuran.length > 0) await seedCollection('angsuran', newAngsuran);
      if (newIncome.length > 0) await seedCollection('income', newIncome);
      if (newExpenses.length > 0) await seedCollection('expenses', newExpenses);
      if (newPembelian.length > 0) await seedCollection('pembelian', newPembelian);
      if (newPiutangWarung.length > 0) await seedCollection('piutang_warung', newPiutangWarung);
      if (newAnnouncements.length > 0) await seedCollection('announcements', newAnnouncements);
      if (newPengajuanPinjaman.length > 0) await seedCollection('pengajuan_pinjaman', newPengajuanPinjaman);
      if (newWarungBarang.length > 0) await seedCollection('warung_barang', newWarungBarang);
      if (newPengurusPengawas.length > 0) await seedCollection('pengurus_pengawas', newPengurusPengawas);
      if (newGaleriKoperasi.length > 0) await seedCollection('galeri_koperasi', newGaleriKoperasi);

    } catch (err) {
      console.error("Gagal melakukan migrasi data ke Cloud Firestore:", err);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("Apakah Anda benar-benar yakin ingin mengosongkan semua data koperasi? Tindakan ini bersifat permanen dan tidak dapat dibatalkan!")) {
      return;
    }

    localStorage.clear();
    setSetup(initialSetup);
    setMembers([]);
    setSimpanan([]);
    setPinjaman([]);
    setAngsuran([]);
    setIncome([]);
    setExpenses([]);
    setPembelian([]);
    setPiutangWarung([]);
    setAnnouncements([]);
    setPengajuanPinjaman([]);
    setWarungBarang([]);
    setPengurusPengawas([]);
    setGaleriKoperasi([]);

    // Clear all Firestore collections to delete existing documents
    try {
      await clearCollection('members');
      await clearCollection('simpanan');
      await clearCollection('pinjaman');
      await clearCollection('angsuran');
      await clearCollection('income');
      await clearCollection('expenses');
      await clearCollection('pembelian');
      await clearCollection('piutang_warung');
      await clearCollection('announcements');
      await clearCollection('pengajuan_pinjaman');
      await clearCollection('warung_barang');
      await clearCollection('pengurus_pengawas');
      await clearCollection('galeri_koperasi');
      
      // Also reset/update the setup profile configuration in the cloud
      await saveKoperasiSetup(initialSetup);
      
      alert("Semua data koperasi berhasil dikosongkan secara permanen!");
    } catch (err) {
      console.error("Gagal membersihkan koleksi Cloud Firestore saat reset:", err);
      alert("Gagal mengosongkan beberapa koleksi di Cloud Firestore. Silakan coba lagi.");
    }
  };

  // Database loading spinner
  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 dark:border-emerald-500/10"></div>
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-sans font-semibold tracking-tight text-slate-700 dark:text-slate-300">Menghubungkan Database Cloud Koperasi...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Mengambil data simpan pinjam secara real-time</p>
      </div>
    );
  }

  // Auth gate check
  if (!isLoggedIn || userRole === null) {
    return (
      <PortalKoperasi
        setup={setup}
        members={members}
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        income={income}
        expenses={expenses}
        pembelian={pembelian}
        piutangWarung={piutangWarung}
        announcements={announcements}
        warungBarang={warungBarang}
        pengurusPengawas={pengurusPengawas}
        galeriKoperasi={galeriKoperasi}
        onAddMember={handleAddMember}
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  if (userRole === 'member' && loggedMember) {
    return (
      <MemberDashboardView
        member={loggedMember}
        setup={setup}
        members={members}
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        announcements={announcements}
        pengajuanPinjaman={pengajuanPinjaman}
        pembayaranPending={pembayaranPending}
        galeriKoperasi={galeriKoperasi}
        onAddPengajuanPinjaman={handleAddPengajuanPinjaman}
        onAddPembayaranPending={handleAddPembayaranPending}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  type TabId = 'dashboard' | 'anggota' | 'kasmasuk' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'profil' | 'pengingat' | 'pengumuman' | 'warung' | 'pengurus' | 'galeri';

  interface NavItem {
    id: TabId;
    label: string;
    icon: React.ComponentType<any>;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'anggota', label: 'Data Keanggotaan', icon: Users },
    { id: 'pengurus', label: 'Pengurus dan Pengawas', icon: Users },
    { id: 'kasmasuk', label: 'Buku Kas & Mutasi', icon: Wallet },
    { id: 'pinjaman', label: 'Akad dan Kredit Pinjaman', icon: HandCoins },
    { id: 'pengingat', label: 'Jadwal & Tagihan', icon: Bell },
    { id: 'warung', label: 'Unit Usaha Warung', icon: Store },
    { id: 'pembelian', label: 'Inventaris', icon: ShoppingCart },
    { id: 'aruskas', label: 'Pendapatan dan Beban', icon: TrendingUp },
    { id: 'pengumuman', label: 'Warta & Pengumuman', icon: Megaphone },
    { id: 'galeri', label: 'Galeri Koperasi', icon: ImageIcon },
    { id: 'laporan', label: 'Laporan Keuangan', icon: Scale },
    { id: 'profil', label: 'Profil dan Konfigurasi', icon: UserCog },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans">
      
      {/* Left Persistent Sidebar (Desktop View) */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col shrink-0 hidden lg:flex">
        {/* Branding Area */}
        <div className="p-5 border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-lg select-none shadow-sm overflow-hidden shrink-0">
              {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                <img src={setup.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                setup.logoUrl || '🌱'
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold leading-tight truncate text-sm tracking-wide">{setup.namaKoperasi || "Dana Segar"}</h1>
              <p className="text-[10px] text-emerald-300 font-medium uppercase tracking-widest truncate">{setup.slogan || "Koperasi Modern"}</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-3.5 space-y-0.5 text-xs overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                whileHover={{ scale: 1.02, x: 3, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-[11px] cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-950 text-white shadow-sm font-bold' 
                    : 'text-emerald-100 hover:bg-emerald-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-300/85'}`}/>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.id === 'pengingat' && dueLoansCount > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shrink-0">
                    {dueLoansCount}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer Admin Summary */}
        <div className="p-4 bg-emerald-950 border-t border-emerald-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs select-none shadow">
              {getInitials(setup.namaKoperasi)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate leading-tight">Admin Utama</p>
              <p className="text-[9px] text-emerald-400 truncate mt-0.5">admin@danasegar.com</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-emerald-400 hover:text-white p-1 rounded-sm transition cursor-pointer hover:bg-emerald-850/50"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-150 dark:border-slate-750 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg lg:hidden transition cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-5 h-5"/>
            </button>

            <span>{navItems.find(n => n.id === activeTab)?.label || "Dashboard Analitik"}</span>
            <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span className="text-emerald-600 dark:text-emerald-450 font-bold select-none uppercase tracking-wide text-[10px]">Real-time Overview</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Placeholder */}
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Cari data..." 
                disabled 
                className="bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-700 border rounded-lg py-1 pl-8 pr-3 text-[11px] w-48 outline-none" 
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-slate-450" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>

            {/* Theme switcher */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Ganti Tema Visual"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400"/> : <Moon className="w-4 h-4 text-emerald-800"/>}
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Quick Actions */}
            <button 
              onClick={() => handleNavigation('kasmasuk')}
              className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95"
            >
              <span>+ Kas Masuk</span>
            </button>

            {/* Logout Admin Button (Visible in header on all viewports) */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95 shrink-0"
              title="Keluar dari Sistem Administrasi"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Mobile drawer side panel overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              {/* black mask */}
              <div onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs"/>
              
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="absolute top-0 bottom-0 left-0 w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-5 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Navigasi Utama</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400">
                      <X className="w-5 h-5"/>
                    </button>
                  </div>
                  
                  <nav className="space-y-0.5 overflow-y-auto max-h-[70vh] pr-1">
                    {navItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => {
                            handleNavigation(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          whileHover={{ scale: 1.02, x: 3, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)" }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold' 
                              : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}/>
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.id === 'pengingat' && dueLoansCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                              {dueLoansCount}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar Admin
                  </button>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono space-y-0.5 select-none">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{setup.namaKoperasi || "Koperasi Dana Segar"}</p>
                    {setup.noBadanHukum && <p className="opacity-75">BH: {setup.noBadanHukum}</p>}
                  </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard/Tab Contents display panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-900/60">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.28 }}
              className="h-full"
            >
              {/* Router Render Tab view components */}
              {activeTab === 'dashboard' && (
                <DashboardView 
                  members={members} simpanan={simpanan} pinjaman={pinjaman} 
                  angsuran={angsuran} income={income} expenses={expenses} 
                  setup={setup}
                  announcements={announcements}
                  pembelian={pembelian}
                  piutangWarung={piutangWarung}
                />
              )}

              {activeTab === 'anggota' && (
                <AnggotaView 
                  setup={setup}
                  pengurusPengawas={pengurusPengawas}
                  members={members} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
                  onAddMember={handleAddMember} onEditMember={handleEditMember} onDeleteMember={handleDeleteMember}
                  onDeleteAngsuran={handleDeleteAngsuran}
                  onDeleteSimpanan={handleDeleteSimpanan}
                  onEditSimpanan={handleEditSimpanan}
                />
              )}

              {activeTab === 'kasmasuk' && (
                <KasMasukView 
                  setup={setup}
                  members={members} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
                  pembayaranPending={pembayaranPending}
                  onApprovePembayaranPending={handleApprovePembayaranPending}
                  onRejectPembayaranPending={handleRejectPembayaranPending}
                  onAddSimpanan={handleAddSimpanan}
                  onPostManasukaBunga={handlePostManasukaBunga}
                  onAddAngsuran={handleAddAngsuran}
                  onDeleteAngsuran={handleDeleteAngsuran}
                  onDeleteSimpanan={handleDeleteSimpanan}
                  onEditSimpanan={handleEditSimpanan}
                  availableCash={availableCash}
                />
              )}

              {activeTab === 'pinjaman' && (
                <PinjamanView 
                  setup={setup}
                  members={members} pinjaman={pinjaman} angsuran={angsuran}
                  pengajuanPinjaman={pengajuanPinjaman}
                  onApprovePengajuanPinjaman={handleApprovePengajuanPinjaman}
                  onRejectPengajuanPinjaman={handleRejectPengajuanPinjaman}
                  onAddPinjaman={handleAddPinjaman}
                  onEditPinjaman={handleEditPinjaman}
                  onDeletePinjaman={handleDeletePinjaman}
                  availableCash={availableCash}
                />
              )}

              {activeTab === 'pembelian' && (
                <PembelianView 
                  setup={setup}
                  pembelian={pembelian}
                  onAddPembelian={handleAddPembelian}
                  onDeletePembelian={handleDeletePembelian}
                  onUpdatePembelian={handleUpdatePembelian}
                  availableCash={availableCash}
                />
              )}

              {activeTab === 'aruskas' && (
                <ArusKasView 
                  income={income} expenses={expenses}
                  onAddIncome={handleAddIncome} onAddExpense={handleAddExpense}
                  onDeleteIncome={handleDeleteIncome} onDeleteExpense={handleDeleteExpense}
                  onClearArusKas={handleClearArusKas}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'laporan' && (
                <LaporanView 
                  members={members} simpanan={simpanan} pinjaman={pinjaman} 
                  angsuran={angsuran} income={income} expenses={expenses}
                  pembelian={pembelian} piutangWarung={piutangWarung}
                  setup={setup}
                  rekening={rekening}
                  onSaveRekening={handleSaveRekening}
                  onDeleteRekening={handleDeleteRekening}
                  onDeleteAngsuran={handleDeleteAngsuran}
                  onDeleteSimpanan={handleDeleteSimpanan}
                  onEditSimpanan={handleEditSimpanan}
                />
              )}

              {activeTab === 'pengingat' && (
                <PengingatView 
                  members={members}
                  simpanan={simpanan}
                  pinjaman={pinjaman}
                  angsuran={angsuran}
                  setup={setup}
                />
              )}

              {activeTab === 'pengumuman' && (
                <PengumumanView 
                  setup={setup}
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  onEditAnnouncement={handleEditAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                />
              )}

              {activeTab === 'profil' && (
                <ProfilKoperasiView 
                  setup={setup} 
                  onUpdateSetup={handleUpdateSetup} 
                  onResetData={handleResetData}
                  onSyncFromFirebase={handleSyncFromFirebase}
                  onImportDatabase={handleImportDatabase}
                  members={members}
                  simpanan={simpanan}
                  pinjaman={pinjaman}
                  angsuran={angsuran}
                  income={income}
                  expenses={expenses}
                  pembelian={pembelian}
                  piutangWarung={piutangWarung}
                  announcements={announcements}
                  pengajuanPinjaman={pengajuanPinjaman}
                  warungBarang={warungBarang}
                  pengurusPengawas={pengurusPengawas}
                  galeriKoperasi={galeriKoperasi}
                />
              )}

              {activeTab === 'warung' && (
                <AdminWarungView 
                  warungBarang={warungBarang}
                  members={members}
                  piutangWarung={piutangWarung}
                  onAddBarang={handleAddBarang}
                  onEditBarang={handleEditBarang}
                  onDeleteBarang={handleDeleteBarang}
                  onAddPiutang={handleAddPiutang}
                  onDeletePiutang={handleDeletePiutang}
                  pembelian={pembelian}
                  onAddPembelian={handleAddPembelian}
                  onDeletePembelian={handleDeletePembelian}
                  onUpdatePembelian={handleUpdatePembelian}
                  income={income}
                  onAddIncome={handleAddIncome}
                  onDeleteIncome={handleDeleteIncome}
                  availableCash={availableCash}
                />
              )}

              {activeTab === 'pengurus' && (
                <AdminPengurusView 
                  pengurusPengawas={pengurusPengawas}
                  onAddPerson={handleAddPerson}
                  onEditPerson={handleEditPerson}
                  onDeletePerson={handleDeletePerson}
                />
              )}

              {activeTab === 'galeri' && (
                <AdminGaleriView 
                  galeriKoperasi={galeriKoperasi}
                  onAddGaleri={handleAddGaleri}
                  onEditGaleri={handleEditGaleri}
                  onDeleteGaleri={handleDeleteGaleri}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Password Verification Modal for Profil Koperasi */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPasswordModal(false);
                setPendingTab(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/80 overflow-hidden z-10"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Verifikasi Keamanan</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Diperlukan password untuk melihat menu ini</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPendingTab(null);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleVerifyPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Password Profil Koperasi
                    </label>
                    <div className="relative">
                      <input 
                        type={showModalPassword ? "text" : "password"}
                        placeholder="Masukkan password..."
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setPasswordError('');
                        }}
                        autoFocus
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition font-sans placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                      >
                        {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-[10.5px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                        ⚠️ {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPendingTab(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer active:scale-98"
                    >
                      Verifikasi
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {/* Universal Success Popup Modal */}
        {successPopup && successPopup.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessPopup(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 font-sans text-xs"
            >
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
              
              <div className="p-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-950/40 animate-ping opacity-75" />
                  <div className="relative p-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800 shadow-sm">
                    <Check className="w-8 h-8" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50 tracking-tight">
                  {successPopup.title || "Transaksi Berhasil!"}
                </h3>
                {successPopup.subTitle && (
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                    {successPopup.subTitle}
                  </p>
                )}

                {successPopup.details && successPopup.details.length > 0 && (
                  <div className="w-full mt-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 space-y-2 text-left">
                    {successPopup.details.map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-4">
                        <span className="text-slate-450 dark:text-slate-500 font-medium">{detail.label}:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 break-all font-sans">
                          {detail.isCurrency && typeof detail.value === 'number' 
                            ? formatRupiah(detail.value) 
                            : detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setSuccessPopup(null)}
                  className="w-full mt-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center active:scale-98"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
