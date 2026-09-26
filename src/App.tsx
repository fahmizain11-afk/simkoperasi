import React, { useState, useEffect, useMemo } from 'react';
import { sortMembersNaturally, calculateLoanOutstanding, calculateAngsuranPrincipal, calculateAngsuranInterest, calculateKasKoperasi } from './utils/finance';
import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, ManasukaBungaLog, Pembelian, PiutangWarung, Pengumuman, PengajuanPinjaman, WarungBarang, PengurusPengawas, GaleriKoperasi, RekeningNeraca, PembayaranPending, UserAccount, SecurityLog, ItemAnggaranRAPBK, RAPBKSetting, WhatsAppLog, SHUDistribution } from './types';
import { initialMembers, initialSimpanan, initialPinjaman, initialAngsuran, initialPendapatan, initialBeban, initialSetup, initialPembelian, initialPiutangWarung, initialAnnouncements, initialPengajuanPinjaman, initialWarungBarang, initialPengurusPengawas, initialGaleriKoperasi, initialRekeningNeraca, initialPembayaranPending, initialUserAccounts, initialSecurityLogs, initialRAPBKSettings, initialAnggaranRAPBK, initialWhatsAppLogs } from './dummyData';
import { 
  fetchKoperasiSetup, 
  saveKoperasiSetup, 
  fetchCollection, 
  saveCollectionItem, 
  deleteCollectionItem, 
  seedCollection,
  clearCollection,
  subscribeCollection
} from './utils/firebaseStorage';
import { LoginScreen, ProfilKoperasiView } from './components/AdminViews';
import { ArusKasView } from './components/ArusKasView';
import { AnggotaView, PinjamanView } from './components/CoreViews';
import { KasMasukView } from './components/KasMasukView';
import { KasKeluarView } from './components/KasKeluarView';
import { DashboardView, LaporanView } from './components/LaporanViews';
import { PembelianView } from './components/PembelianView';
import { PengingatView } from './components/PengingatView';
import { PengumumanView } from './components/PengumumanView';
import { PortalKoperasi, MemberDashboardView } from './components/PortalKoperasi';
import { AdminWarungView } from './components/AdminWarungView';
import { AdminPengurusView } from './components/AdminPengurusView';
import { AdminGaleriView } from './components/AdminGaleriView';
import { AdminUserManagementView } from './components/AdminUserManagementView';
import { AdminSecurityLogsView } from './components/AdminSecurityLogsView';
import { AdminAnggaranView } from './components/AdminAnggaranView';
import { CatatanKhususPengurusView } from './components/CatatanKhususPengurusView';
import { CalculatorPopup } from './components/CalculatorPopup';
import { SplashScreen } from './components/SplashScreen';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { IdleTimeoutHandler } from './components/IdleTimeoutHandler';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Building, LayoutDashboard, Users, Wallet, HandCoins, CheckCircle2, 
  TrendingUp, TrendingDown, Scale, Sun, Moon, LogOut, HeartHandshake, UserCog, Menu, X, ShoppingCart, Lock, Bell, Megaphone,
  Eye, EyeOff, Store, Image as ImageIcon, KeyRound, ShieldCheck, Calculator, Search, LogIn, Globe, Target,
  FileSpreadsheet
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

  const [userRole, setUserRole] = useState<'admin' | 'pengawas' | 'karyawan_warung' | 'member' | null>(() => {
    const active = localStorage.getItem('koperasi_session_active') === 'true';
    if (!active) return null;
    return (localStorage.getItem('koperasi_user_role') as 'admin' | 'pengawas' | 'karyawan_warung' | 'member') || 'admin';
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

  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(() => {
    const accStr = localStorage.getItem('koperasi_logged_user_account');
    if (accStr) {
      try {
        return JSON.parse(accStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Idle timeout notification state
  const [idleLogoutNotice, setIdleLogoutNotice] = useState<string | null>(() => {
    return sessionStorage.getItem('koperasi_idle_notice') || null;
  });

  useEffect(() => {
    if (idleLogoutNotice) {
      const timer = setTimeout(() => {
        setIdleLogoutNotice(null);
        try {
          sessionStorage.removeItem('koperasi_idle_notice');
        } catch (e) {}
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [idleLogoutNotice]);

  const handleLoginSuccess = (role: 'admin' | 'pengawas' | 'karyawan_warung' | 'member', member?: Member, userAcc?: UserAccount) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setIdleLogoutNotice(null);
    try {
      sessionStorage.removeItem('koperasi_idle_notice');
      localStorage.setItem('koperasi_last_active_time', String(Date.now()));
    } catch (e) {}
    localStorage.setItem('koperasi_session_active', 'true');
    localStorage.setItem('koperasi_user_role', role);

    if (userAcc) {
      setCurrentUserAccount(userAcc);
      localStorage.setItem('koperasi_logged_user_account', JSON.stringify(userAcc));
    } else {
      setCurrentUserAccount(null);
      localStorage.removeItem('koperasi_logged_user_account');
    }

    if (role === 'member' && member) {
      setLoggedMember(member);
      localStorage.setItem('koperasi_logged_member', JSON.stringify(member));

      // Record member login security log
      const memName = member.nama || userAcc?.nama || 'Anggota Koperasi';
      const memNo = member.noAnggota || userAcc?.username || '-';
      handleAddSecurityLog({
        userId: member.id || userAcc?.id || 'member',
        userNama: memName,
        role: 'member',
        action: 'LOGIN_PORTAL_ANGGOTA',
        category: 'Autentikasi',
        severity: 'info',
        status: 'SUCCESS',
        description: `Anggota ${memName} (No. Anggota: ${memNo}) berhasil login ke Portal Layanan Mandiri Koperasi.`,
        ipAddress: '182.253.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
        userAgent: navigator.userAgent || 'Mozilla/5.0 (Mobile/Web Browser)',
        metadata: {
          noAnggota: memNo,
          anggotaId: member.id || userAcc?.anggotaId,
          loginMethod: 'Portal Mandiri Koperasi'
        }
      });
      navigate('/member');
    } else {
      setLoggedMember(null);
      localStorage.removeItem('koperasi_logged_member');
      if (role === 'karyawan_warung') {
        navigate('/aruskas');
      } else {
        navigate('/admin');
      }
    }
  };

  const handleLogout = (reason?: string | React.MouseEvent) => {
    const isIdle = typeof reason === 'string' && reason === 'idle';
    if (isIdle) {
      const noticeText = 'Sesi Anda telah berakhir otomatis ke Portal Utama karena tidak ada aktivitas (idle) selama 2 menit demi menjaga keamanan akun dan transaksi koperasi.';
      setIdleLogoutNotice(noticeText);
      try {
        sessionStorage.setItem('koperasi_idle_notice', noticeText);
      } catch (e) {}

      // Add security audit log
      if (isLoggedIn) {
        const uId = loggedMember?.id || currentUserAccount?.id || 'active-user';
        const uName = loggedMember?.nama || currentUserAccount?.nama || (userRole ? userRole.toUpperCase() : 'Pengguna');
        handleAddSecurityLog({
          userId: uId,
          userNama: uName,
          role: userRole || 'admin',
          action: 'LOGOUT_IDLE_TIMEOUT',
          category: 'Autentikasi',
          severity: 'warning',
          status: 'SUCCESS',
          description: `Sesi ${uName} otomatis ditutup dan dialihkan ke Portal Utama karena tidak ada aktivitas (idle) selama 2 menit.`,
          ipAddress: '182.253.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
          userAgent: navigator.userAgent || 'Mozilla/5.0',
          metadata: {
            timeoutMinutes: 2,
            logoutReason: 'idle_inactivity'
          }
        });
      }
    } else {
      setIdleLogoutNotice(null);
      try {
        sessionStorage.removeItem('koperasi_idle_notice');
      } catch (e) {}
    }

    setIsLoggedIn(false);
    setUserRole(null);
    setLoggedMember(null);
    setCurrentUserAccount(null);
    localStorage.removeItem('koperasi_session_active');
    localStorage.removeItem('koperasi_user_role');
    localStorage.removeItem('koperasi_logged_member');
    localStorage.removeItem('koperasi_logged_user_account');
    localStorage.removeItem('koperasi_last_active_time');
    sessionStorage.removeItem('koperasi_session_active');
    navigate('/portal');
  };

  // Helper to safely load cached data or use fallback
  const getStoredOrFallback = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  // Safe localStorage writer to prevent QuotaExceededError crashes
  const safeSetItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Gagal menyimpan cache ${key}:`, e);
    }
  };

  // Centralised Financial Stores connected to Cloud Firestore (with LocalStorage fallback)
  const [setup, setSetup] = useState<KoperasiSetup>(() => getStoredOrFallback('kop_setup', initialSetup));

  // Dynamic branding color application effect
  useEffect(() => {
    const selectedColor = setup?.warnaUtama || 'emerald';
    const palette = (COLOR_PALETTES as any)[selectedColor] || COLOR_PALETTES.emerald;
    Object.entries(palette).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--brand-${shade}`, hex as string);
    });
  }, [setup?.warnaUtama]);

  // Dynamic branding title & favicon effect
  useEffect(() => {
    const appName = setup?.namaKoperasi || "Koperasi Dana Segar";
    document.title = `${appName} - Sistem Simpan Pinjam & Akuntansi`;

    const faviconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (faviconEl) {
      if (setup?.logoUrl && (setup.logoUrl.startsWith('http') || setup.logoUrl.startsWith('data:image'))) {
        faviconEl.href = setup.logoUrl;
      } else if (setup?.logoUrl && setup.logoUrl !== '🌱' && setup.logoUrl.trim().length <= 4) {
        const svgUri = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">${encodeURIComponent(setup.logoUrl)}</text></svg>`;
        faviconEl.href = svgUri;
      } else {
        faviconEl.href = '/favicon.svg';
      }
    }
  }, [setup?.namaKoperasi, setup?.logoUrl]);

  const [members, setMembers] = useState<Member[]>(() => getStoredOrFallback('kop_members', initialMembers));
  const [simpanan, setSimpanan] = useState<Simpanan[]>(() => getStoredOrFallback('kop_simpanan', initialSimpanan));
  const [pinjaman, setPinjaman] = useState<Pinjaman[]>(() => getStoredOrFallback('kop_pinjaman', initialPinjaman));
  const [angsuran, setAngsuran] = useState<Angsuran[]>(() => getStoredOrFallback('kop_angsuran', initialAngsuran));
  const [income, setIncome] = useState<PendapatanLain[]>(() => getStoredOrFallback('kop_income', initialPendapatan));
  const [expenses, setExpenses] = useState<BebanKoperasi[]>(() => getStoredOrFallback('kop_expenses', initialBeban));
  const [pembelian, setPembelian] = useState<Pembelian[]>(() => getStoredOrFallback('kop_pembelian', initialPembelian));
  const [piutangWarung, setPiutangWarung] = useState<PiutangWarung[]>(() => getStoredOrFallback('kop_piutang_warung', initialPiutangWarung));
  const [announcements, setAnnouncements] = useState<Pengumuman[]>(() => getStoredOrFallback('kop_announcements', initialAnnouncements));
  const [pengajuanPinjaman, setPengajuanPinjaman] = useState<PengajuanPinjaman[]>(() => getStoredOrFallback('kop_pengajuan_pinjaman', initialPengajuanPinjaman));
  const [pembayaranPending, setPembayaranPending] = useState<PembayaranPending[]>(() => getStoredOrFallback('kop_pembayaran_pending', initialPembayaranPending));
  const [warungBarang, setWarungBarang] = useState<WarungBarang[]>(() => getStoredOrFallback('kop_warung_barang', initialWarungBarang));
  const [pengurusPengawas, setPengurusPengawas] = useState<PengurusPengawas[]>(() => getStoredOrFallback('kop_pengurus_pengawas', initialPengurusPengawas));
  const [galeriKoperasi, setGaleriKoperasi] = useState<GaleriKoperasi[]>(() => getStoredOrFallback('kop_galeri_koperasi', initialGaleriKoperasi));
  const [rekening, setRekening] = useState<RekeningNeraca[]>(() => getStoredOrFallback('kop_rekening', initialRekeningNeraca));
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => getStoredOrFallback('kop_user_accounts', initialUserAccounts));
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>(() => getStoredOrFallback('kop_security_logs', initialSecurityLogs));
  const [anggaranRAPBK, setAnggaranRAPBK] = useState<ItemAnggaranRAPBK[]>(() => getStoredOrFallback('kop_anggaran_rapbk', initialAnggaranRAPBK));
  const [rapbkSettings, setRAPBKSettings] = useState<RAPBKSetting[]>(() => getStoredOrFallback('kop_rapbk_settings', initialRAPBKSettings));
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppLog[]>(() => getStoredOrFallback('kop_whatsapp_logs', initialWhatsAppLogs));
  const [shuDistributions, setShuDistributions] = useState<SHUDistribution[]>(() => {
    try {
      const saved = localStorage.getItem('koperasi_shu_distributions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleAddSHUDistribution = (dist: SHUDistribution) => {
    setShuDistributions(prev => {
      const updated = [dist, ...prev];
      try {
        localStorage.setItem('koperasi_shu_distributions', JSON.stringify(updated));
      } catch (err) {
        console.error("Gagal menyimpan distribusi SHU ke local storage", err);
      }
      return updated;
    });
  };

  const sortedMembers = useMemo(() => sortMembersNaturally(members), [members]);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Firestore & local storage loader effect
  useEffect(() => {
    let isCancelled = false;

    // Hard fallback safety to ensure loading state resolves even if Firestore connection hangs
    const safetyLoadingTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsDbLoading(false);
      }
    }, 3000);

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
          await seedCollection<UserAccount>('user_accounts', initialUserAccounts);
          await seedCollection<SecurityLog>('security_logs', initialSecurityLogs);
          await seedCollection<ItemAnggaranRAPBK>('anggaran_rapbk', initialAnggaranRAPBK);
          await seedCollection<RAPBKSetting>('rapbk_settings', initialRAPBKSettings);
          await seedCollection<WhatsAppLog>('whatsapp_logs', initialWhatsAppLogs);

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
          setUserAccounts(initialUserAccounts);
          setSecurityLogs(initialSecurityLogs);
          setAnggaranRAPBK(initialAnggaranRAPBK);
          setRAPBKSettings(initialRAPBKSettings);
          setWhatsAppLogs(initialWhatsAppLogs);
        } else {
          console.log("Found existing cloud data. Loading all cooperative records...");
          const [dbMembers, dbSimpanan, dbPinjaman, dbAngsuran, dbIncome, dbExpenses, dbPembelian, dbPiutang, dbAnnouncements, dbPengajuan, dbWarungBarang, dbPengurus, dbGaleri, dbRekening, dbPembayaran, dbUserAccounts, dbSecurityLogs, dbAnggaran, dbRAPBKSettings, dbWhatsAppLogs] = await Promise.all([
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
            fetchCollection<PembayaranPending>('pembayaran_pending'),
            fetchCollection<UserAccount>('user_accounts'),
            fetchCollection<SecurityLog>('security_logs'),
            fetchCollection<ItemAnggaranRAPBK>('anggaran_rapbk'),
            fetchCollection<RAPBKSetting>('rapbk_settings'),
            fetchCollection<WhatsAppLog>('whatsapp_logs')
          ]);

          setSetup(dbSetup);
          setMembers(dbMembers && dbMembers.length > 0 ? dbMembers : (members.length > 0 ? members : initialMembers));
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
          
          const localSavedUsers = localStorage.getItem('kop_user_accounts');
          let initialAccountsList: UserAccount[] = [];
          if (dbUserAccounts && dbUserAccounts.length > 0) {
            initialAccountsList = dbUserAccounts;
          } else if (localSavedUsers) {
            try {
              initialAccountsList = JSON.parse(localSavedUsers);
            } catch (e) {
              initialAccountsList = initialUserAccounts;
            }
          } else {
            initialAccountsList = initialUserAccounts;
          }

            // Ensure the main admin account is ALWAYS present in userAccounts so it is visible in the user list & password change works
            const hasAdmin = initialAccountsList.some((u: UserAccount) => u.username.toLowerCase() === 'admin' || u.role === 'admin');
            if (!hasAdmin) {
              const defaultAdmin: UserAccount = {
                id: 'usr-admin-1',
                username: 'admin',
                password: 'd4n45egar',
                role: 'admin',
                nama: 'Pengurus Utama / Admin',
                posisiJabatan: 'Ketua & System Admin',
                isActive: true,
                createdAt: new Date().toISOString().substring(0, 10)
              };
              initialAccountsList = [defaultAdmin, ...initialAccountsList];
              saveCollectionItem<UserAccount>('user_accounts', defaultAdmin).catch(err => console.warn(err));
            }
            setUserAccounts(initialAccountsList);

            setSecurityLogs(dbSecurityLogs && dbSecurityLogs.length > 0 ? dbSecurityLogs : initialSecurityLogs);
            
            const rawRekening = dbRekening && dbRekening.length > 0 ? dbRekening : initialRekeningNeraca;
            const filteredRek = rawRekening.filter(r => !['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode));
            setRekening(filteredRek);

            setAnggaranRAPBK(dbAnggaran && dbAnggaran.length > 0 ? dbAnggaran : initialAnggaranRAPBK);
            setRAPBKSettings(dbRAPBKSettings && dbRAPBKSettings.length > 0 ? dbRAPBKSettings : initialRAPBKSettings);
            setWhatsAppLogs(dbWhatsAppLogs && dbWhatsAppLogs.length > 0 ? dbWhatsAppLogs : initialWhatsAppLogs);

            // Clean up from Firestore if they were loaded from database
            if (dbRekening && dbRekening.length > 0) {
              const toDelete = dbRekening.filter(r => ['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode));
              if (toDelete.length > 0) {
                Promise.all(toDelete.map(r => deleteCollectionItem('rekening', r.id).catch(e => console.error(e))));
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
        const dataSecurityLogs = localStorage.getItem('kop_security_logs');
        const dataUserAccounts = localStorage.getItem('kop_user_accounts');
        const dataAnggaran = localStorage.getItem('kop_anggaran_rapbk');
        const dataRAPBKSettings = localStorage.getItem('kop_rapbk_settings');
        const dataWhatsAppLogs = localStorage.getItem('kop_whatsapp_logs');

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
        if (dataSecurityLogs) setSecurityLogs(JSON.parse(dataSecurityLogs));
        if (dataUserAccounts) setUserAccounts(JSON.parse(dataUserAccounts));
        if (dataAnggaran) setAnggaranRAPBK(JSON.parse(dataAnggaran));
        if (dataRAPBKSettings) setRAPBKSettings(JSON.parse(dataRAPBKSettings));
        if (dataWhatsAppLogs) setWhatsAppLogs(JSON.parse(dataWhatsAppLogs));
        if (dataRekening) {
          const parsed = JSON.parse(dataRekening) as RekeningNeraca[];
          setRekening(parsed.filter(r => !['1201', '1202', '1203', '1204', '2201', '3105'].includes(r.kode)));
        }
      } finally {
        clearTimeout(safetyLoadingTimer);
        setIsDbLoading(false);
      }
    }
    initAndSyncDatabase();

    return () => {
      isCancelled = true;
      clearTimeout(safetyLoadingTimer);
    };
  }, []);

  // Real-time synchronization for dynamic member activities (Setoran Mandiri & Pengajuan Pinjaman)
  // Ensures payments submitted by members on mobile/portal immediately appear on pengurus screens
  useEffect(() => {
    if (isDbLoading) return;

    const unsubPembayaran = subscribeCollection<PembayaranPending>('pembayaran_pending', (items) => {
      if (items && Array.isArray(items)) {
        setPembayaranPending(items);
        try {
          localStorage.setItem('kop_pembayaran_pending', JSON.stringify(items));
        } catch (e) {}
      }
    });

    const unsubPengajuan = subscribeCollection<PengajuanPinjaman>('pengajuan_pinjaman', (items) => {
      if (items && Array.isArray(items)) {
        setPengajuanPinjaman(items);
        try {
          localStorage.setItem('kop_pengajuan_pinjaman', JSON.stringify(items));
        } catch (e) {}
      }
    });

    return () => {
      unsubPembayaran();
      unsubPengajuan();
    };
  }, [isDbLoading]);

  // Sync to localStorage as progressive web offline backup safely
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_setup', setup); }, [setup, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_members', members); }, [members, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_simpanan', simpanan); }, [simpanan, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_pinjaman', pinjaman); }, [pinjaman, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_angsuran', angsuran); }, [angsuran, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_income', income); }, [income, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_expenses', expenses); }, [expenses, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_pembelian', pembelian); }, [pembelian, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_piutang_warung', piutangWarung); }, [piutangWarung, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_announcements', announcements); }, [announcements, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_pengajuan_pinjaman', pengajuanPinjaman); }, [pengajuanPinjaman, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_pembayaran_pending', pembayaranPending); }, [pembayaranPending, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_warung_barang', warungBarang); }, [warungBarang, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_pengurus_pengawas', pengurusPengawas); }, [pengurusPengawas, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_galeri_koperasi', galeriKoperasi); }, [galeriKoperasi, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_rekening', rekening); }, [rekening, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_security_logs', securityLogs); }, [securityLogs, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_user_accounts', userAccounts); }, [userAccounts, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_anggaran_rapbk', anggaranRAPBK); }, [anggaranRAPBK, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_rapbk_settings', rapbkSettings); }, [rapbkSettings, isDbLoading]);
  useEffect(() => { if (!isDbLoading) safeSetItem('kop_whatsapp_logs', whatsAppLogs); }, [whatsAppLogs, isDbLoading]);

  // Multi-Page Routing Hooks
  const location = useLocation();
  const navigate = useNavigate();

  type TabId = 'dashboard' | 'anggota' | 'kasmasuk' | 'kaskeluar' | 'pinjaman' | 'aruskas' | 'pembelian' | 'laporan' | 'anggaran' | 'catatan_pengurus' | 'profil' | 'pengingat' | 'pengumuman' | 'warung' | 'pengurus' | 'galeri' | 'user_mgmt' | 'security_logs';

  const getActiveTabFromPath = (pathname: string): TabId => {
    const p = pathname.toLowerCase();
    if (p.startsWith('/anggota')) return 'anggota';
    if (p.startsWith('/kaskeluar') || p.startsWith('/beban')) return 'kaskeluar';
    if (p.startsWith('/kasmasuk') || p.startsWith('/simpanan')) return 'kasmasuk';
    if (p.startsWith('/pinjaman')) return 'pinjaman';
    if (p.startsWith('/pengingat')) return 'pengingat';
    if (p.startsWith('/warung')) return 'warung';
    if (p.startsWith('/pembelian')) return 'pembelian';
    if (p.startsWith('/aruskas')) return 'aruskas';
    if (p.startsWith('/laporan')) return 'laporan';
    if (p.startsWith('/anggaran') || p.startsWith('/rapbk')) return 'anggaran';
    if (p.startsWith('/catatan-pengurus') || p.startsWith('/catatan_pengurus') || p.startsWith('/catatan') || p.startsWith('/spreadsheet')) return 'catatan_pengurus';
    if (p.startsWith('/pengurus')) return 'pengurus';
    if (p.startsWith('/pengumuman')) return 'pengumuman';
    if (p.startsWith('/galeri')) return 'galeri';
    if (p.startsWith('/pengaturan') || p.startsWith('/konfigurasi') || p.startsWith('/admin/profil')) return 'profil';
    if (p.startsWith('/user-mgmt') || p.startsWith('/users')) return 'user_mgmt';
    if (p.startsWith('/security-logs') || p.startsWith('/logs')) return 'security_logs';
    return 'dashboard';
  };

  const activeTab = getActiveTabFromPath(location.pathname);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Global search shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Kas Masuk deep link states
  const [kasMasukInitialTab, setKasMasukInitialTab] = useState<'simpanan' | 'angsuran' | 'pembayaran_pending'>('simpanan');
  const [kasMasukInitialSearch, setKasMasukInitialSearch] = useState<string>('');
  const [kasMasukInitialAnggota, setKasMasukInitialAnggota] = useState<string>('');

  // Pinjaman deep link states
  const [pinjamanInitialSearch, setPinjamanInitialSearch] = useState<string>('');
  const [pinjamanInitialAnggota, setPinjamanInitialAnggota] = useState<string>('');
  const [pinjamanInitialId, setPinjamanInitialId] = useState<string>('');
  const [kasKeluarInitialTab, setKasKeluarInitialTab] = useState<'beban' | 'pinjaman' | 'penarikan_simpanan' | 'pembelian' | 'rekap_bulanan'>('beban');

  const handleNavigateToAngsuran = (angsuranId?: string, memberId?: string, query?: string) => {
    setKasMasukInitialTab('angsuran');
    if (query) {
      setKasMasukInitialSearch(query);
    } else if (memberId) {
      const mem = sortedMembers.find(m => m.id === memberId);
      if (mem) {
        setKasMasukInitialSearch(mem.nama);
      }
    }
    if (memberId) {
      setKasMasukInitialAnggota(memberId);
    }
    navigate('/kasmasuk');
  };

  const handleNavigateToPinjaman = (pinjamanId?: string, memberId?: string, query?: string) => {
    if (query) {
      setPinjamanInitialSearch(query);
    } else if (memberId) {
      const mem = sortedMembers.find(m => m.id === memberId);
      if (mem) {
        setPinjamanInitialSearch(mem.nama);
      }
    } else if (pinjamanId) {
      setPinjamanInitialSearch(pinjamanId);
    }
    if (memberId) {
      setPinjamanInitialAnggota(memberId);
    } else {
      setPinjamanInitialAnggota('');
    }
    if (pinjamanId) {
      setPinjamanInitialId(pinjamanId);
    } else {
      setPinjamanInitialId('');
    }
    setKasKeluarInitialTab('pinjaman');
    navigate('/kaskeluar');
  };

  const handleGlobalNavigate = (tabId: string, params?: { query?: string; memberId?: string; pinjamanId?: string }) => {
    if (tabId === 'pinjaman') {
      handleNavigateToPinjaman(params?.pinjamanId, params?.memberId, params?.query);
    } else if (tabId === 'kasmasuk' || tabId === 'angsuran') {
      handleNavigateToAngsuran(undefined, params?.memberId, params?.query);
    } else if (tabId === 'simpanan') {
      setKasMasukInitialTab('simpanan');
      if (params?.query) setKasMasukInitialSearch(params.query);
      if (params?.memberId) setKasMasukInitialAnggota(params.memberId);
      navigate('/simpanan');
    } else {
      handleNavigation(tabId as any);
    }
  };

  // Security Log Handlers
  const handleAddSecurityLog = async (logData: Omit<SecurityLog, 'id' | 'timestamp'>) => {
    const newLog: SecurityLog = {
      ...logData,
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    setSecurityLogs(prev => [newLog, ...prev]);
    await saveCollectionItem<SecurityLog>('security_logs', newLog);
  };

  const handleClearSecurityLogs = async (olderThanDays?: number) => {
    if (olderThanDays && olderThanDays > 0) {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 3600 * 1000);
      const toKeep = securityLogs.filter(l => new Date(l.timestamp).getTime() >= cutoffTime);
      const toDelete = securityLogs.filter(l => new Date(l.timestamp).getTime() < cutoffTime);
      setSecurityLogs(toKeep);
      for (const item of toDelete) {
        await deleteCollectionItem('security_logs', item.id);
      }
    } else {
      setSecurityLogs([]);
      await clearCollection('security_logs');
    }
  };

  // Authoritative real-time available cash balance (matching Neraca Saldo exactly)
  const availableCash = useMemo(() => {
    return calculateKasKoperasi(setup, simpanan, pinjaman, angsuran, income, expenses, pembelian, piutangWarung);
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

  // Count of pending payments submitted by members waiting for admin approval
  const pendingPembayaranCount = useMemo(() => {
    return (pembayaranPending || []).filter(p => p.status === 'Pending').length;
  }, [pembayaranPending]);

  // Count of pending loan applications waiting for admin approval
  const pendingPengajuanCount = useMemo(() => {
    return (pengajuanPinjaman || []).filter(p => p.status === 'Pending').length;
  }, [pengajuanPinjaman]);

  // Password protection states for Profil Koperasi
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showModalPassword, setShowModalPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  const handleNavigation = (tabId: TabId, subTab?: string, filterAnggota?: string) => {
    if (userRole === 'karyawan_warung' && tabId !== 'kasmasuk' && tabId !== 'kaskeluar' && tabId !== 'warung') {
      navigate('/warung');
      return;
    }
    if (userRole === 'pengawas' && tabId !== 'dashboard' && tabId !== 'laporan') {
      navigate('/admin');
      return;
    }
    if (tabId === 'kasmasuk') {
      if (subTab === 'pembayaran_pending' || subTab === 'angsuran' || subTab === 'simpanan' || subTab === 'pendapatan' || subTab === 'rekap_bulanan') {
        setKasMasukInitialTab(subTab as any);
      }
      if (filterAnggota !== undefined) {
        setKasMasukInitialAnggota(filterAnggota);
      }
      navigate('/kasmasuk');
      return;
    }
    if (tabId === 'kaskeluar') {
      if (subTab === 'pinjaman' || subTab === 'beban' || subTab === 'penarikan_simpanan' || subTab === 'pembelian' || subTab === 'rekap_bulanan') {
        setKasKeluarInitialTab(subTab as any);
      }
      navigate('/kaskeluar');
      return;
    }
    if (tabId === 'pinjaman') {
      setKasKeluarInitialTab('pinjaman');
      navigate('/kaskeluar');
      return;
    }
    if (tabId === 'aruskas') {
      navigate('/laporan');
      return;
    }
    if (tabId === 'pengurus') {
      navigate('/pengaturan');
      return;
    }
    if (tabId === 'dashboard') {
      navigate('/admin');
    } else if (tabId === 'profil') {
      navigate('/pengaturan');
    } else if (tabId === 'user_mgmt') {
      navigate('/user-mgmt');
    } else if (tabId === 'security_logs') {
      navigate('/security-logs');
    } else if (tabId === 'catatan_pengurus') {
      navigate('/catatan-pengurus');
    } else {
      navigate(`/${tabId}`);
    }
  };

  // Enforce role restrictions for karyawan_warung & pengawas
  useEffect(() => {
    if (userRole === 'karyawan_warung' && activeTab !== 'kasmasuk' && activeTab !== 'kaskeluar' && activeTab !== 'warung') {
      navigate('/warung');
    }
    if (userRole === 'pengawas' && activeTab !== 'dashboard' && activeTab !== 'laporan') {
      navigate('/admin');
    }
  }, [userRole, activeTab]);

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

  // Mutators for RAPBK (Module #4)
  const handleAddOrUpdateAnggaranItem = async (item: ItemAnggaranRAPBK) => {
    setAnggaranRAPBK(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    await saveCollectionItem<ItemAnggaranRAPBK>('anggaran_rapbk', item);
  };

  const handleDeleteAnggaranItem = async (id: string) => {
    setAnggaranRAPBK(prev => prev.filter(i => i.id !== id));
    await deleteCollectionItem('anggaran_rapbk', id);
  };

  const handleUpdateRAPBKSetting = async (setting: RAPBKSetting) => {
    setRAPBKSettings(prev => {
      const idx = prev.findIndex(s => s.id === setting.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = setting;
        return next;
      }
      return [...prev, setting];
    });
    await saveCollectionItem<RAPBKSetting>('rapbk_settings', setting);
  };

  const handleLoadStandardRAPBKTemplate = async (year: number) => {
    const existing = anggaranRAPBK.filter(i => i.tahunBuku === year);
    if (existing.length > 0 && !window.confirm(`Sudah ada ${existing.length} item anggaran untuk tahun ${year}. Apakah Anda yakin ingin menimpa/memuat template standar?`)) {
      return;
    }
    const templateItems = initialAnggaranRAPBK.map((item, idx) => ({
      ...item,
      id: `rapbk-${year}-${idx + 1}`,
      tahunBuku: year
    }));
    setAnggaranRAPBK(prev => {
      const withoutThisYear = prev.filter(i => i.tahunBuku !== year);
      return [...withoutThisYear, ...templateItems];
    });
    for (const itm of templateItems) {
      await saveCollectionItem<ItemAnggaranRAPBK>('anggaran_rapbk', itm);
    }
  };

  // Mutators for WhatsApp Logs (Module #1)
  const handleSaveWhatsAppLog = async (log: WhatsAppLog) => {
    setWhatsAppLogs(prev => [log, ...prev]);
    await saveCollectionItem<WhatsAppLog>('whatsapp_logs', log);
  };

  const handleDeleteWhatsAppLog = async (id: string) => {
    setWhatsAppLogs(prev => prev.filter(l => l.id !== id));
    await deleteCollectionItem('whatsapp_logs', id);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'D4nasegar') {
      sessionStorage.setItem('kop_profil_verified', 'true');
      setShowPasswordModal(false);
      if (pendingTab) {
        handleNavigation(pendingTab);
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

    // Auto-create user login account if not exists
    const uname = item.noAnggota || item.noHp || `user_${Date.now()}`;
    const existingUserAcc = userAccounts.find(u => u.anggotaId === id || u.username.toLowerCase() === uname.toLowerCase());
    if (!existingUserAcc) {
      const newUserAcc: UserAccount = {
        id: `usr-${Date.now()}`,
        username: uname,
        password: '123456',
        nama: item.nama,
        role: 'member',
        posisiJabatan: 'Anggota Koperasi',
        anggotaId: id,
        isActive: true,
        createdAt: new Date().toISOString().substring(0, 10)
      };
      setUserAccounts(prev => [...prev, newUserAcc]);
      await saveCollectionItem<UserAccount>('user_accounts', newUserAcc);
    }
  };

  const handleBatchAddMembers = async (newMembersList: Omit<Member, 'id'>[]) => {
    const updatedMembersList = [...members];
    const itemsToSave: Member[] = [];

    for (let idx = 0; idx < newMembersList.length; idx++) {
      const m = newMembersList[idx];
      const trimmedNo = m.noAnggota ? m.noAnggota.trim().toLowerCase() : '';
      const existingIndex = trimmedNo 
        ? updatedMembersList.findIndex(ex => ex.noAnggota && ex.noAnggota.trim().toLowerCase() === trimmedNo)
        : -1;

      if (existingIndex !== -1) {
        const existing = updatedMembersList[existingIndex];
        const replacedMember: Member = {
          ...existing,
          ...m,
          id: existing.id,
          fotoUrl: m.fotoUrl || existing.fotoUrl || '',
          isVerified: existing.isVerified !== undefined ? existing.isVerified : true,
        };
        updatedMembersList[existingIndex] = replacedMember;
        itemsToSave.push(replacedMember);
      } else {
        const freshMember: Member = {
          ...m,
          id: `m-${Date.now()}-${idx}`
        };
        updatedMembersList.push(freshMember);
        itemsToSave.push(freshMember);
      }
    }

    setMembers(updatedMembersList);
    for (const item of itemsToSave) {
      await saveCollectionItem<Member>('members', item);
    }
  };

  const handleEditMember = async (updatedM: Member) => {
    setMembers(prev => prev.map(m => m.id === updatedM.id ? updatedM : m));
    await saveCollectionItem<Member>('members', updatedM);

    // Sync related user account if name changed
    const relatedUserAcc = userAccounts.find(u => u.anggotaId === updatedM.id || u.username === updatedM.noAnggota);
    if (relatedUserAcc && relatedUserAcc.nama !== updatedM.nama) {
      const updatedAcc = { ...relatedUserAcc, nama: updatedM.nama };
      setUserAccounts(prev => prev.map(u => u.id === updatedAcc.id ? updatedAcc : u));
      await saveCollectionItem<UserAccount>('user_accounts', updatedAcc);
    }
  };

  const handleDeleteMember = async (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setSimpanan(prev => prev.filter(s => s.anggotaId !== id));
    setPinjaman(prev => prev.filter(p => p.anggotaId !== id));
    setAngsuran(prev => prev.filter(a => a.anggotaId !== id));
    setUserAccounts(prev => prev.filter(u => u.anggotaId !== id));

    await deleteCollectionItem('members', id);
  };

  const handleAddSimpanan = async (newS: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => {
    if (Array.isArray(newS)) {
      const freshSavings = newS.map((s, idx) => ({ ...s, id: `s-${Date.now()}-${idx}` }));
      setSimpanan(prev => [...prev, ...freshSavings]);
      for (const item of freshSavings) {
        await saveCollectionItem<Simpanan>('simpanan', item);
      }
    } else {
      const item: Simpanan = { ...newS, id: `s-${Date.now()}` };
      setSimpanan(prev => [...prev, item]);
      await saveCollectionItem<Simpanan>('simpanan', item);
    }
  };

  const handleAddPinjaman = async (newP: Omit<Pinjaman, 'id'>) => {
    const id = `p-${Date.now()}`;
    const item: Pinjaman = { ...newP, id };
    setPinjaman(prev => [...prev, item]);
    await saveCollectionItem<Pinjaman>('pinjaman', item);
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
    // Check if member already has a pending loan proposal (status === 'Pending') to prevent double entry
    const existingPending = pengajuanPinjaman.find(p => p.anggotaId === newPengajuan.anggotaId && p.status === 'Pending');
    if (existingPending) {
      throw new Error(`Anda sudah memiliki usulan pinjaman aktif yang sedang ditinjau pengurus (ID: ${existingPending.id}, Diajukan: ${existingPending.tanggalPengajuan}). Pengajuan ganda dicegah agar tidak terjadi data double.`);
    }

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

    // Record member activity log
    const memberObj = members.find(m => m.id === newPengajuan.anggotaId);
    await handleAddSecurityLog({
      userId: newPengajuan.anggotaId,
      userNama: memberObj?.nama || 'Anggota Koperasi',
      role: 'member',
      action: 'PENGAJUAN_PINJAMAN_ONLINE',
      category: 'Data Finansial',
      severity: 'info',
      status: 'SUCCESS',
      description: `Anggota ${memberObj?.nama || ''} (No. ${memberObj?.noAnggota || '-'}) mengajukan pinjaman baru sebesar Rp ${newPengajuan.nominalPinjaman.toLocaleString('id-ID')} dengan tenor ${newPengajuan.tenor} bulan. Alasan: ${newPengajuan.alasanPengajuan || 'Kebutuhan Anggota'}.`,
      ipAddress: '182.253.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
      userAgent: navigator.userAgent || 'Mozilla/5.0 (Mobile/Web Browser)',
      metadata: {
        noAnggota: memberObj?.noAnggota,
        pengajuanId: id,
        nominal: newPengajuan.nominalPinjaman,
        tenorBulan: newPengajuan.tenor,
        alasan: newPengajuan.alasanPengajuan
      }
    });

    return item;
  };

  const handleApprovePengajuanPinjaman = async (
    id: string, 
    catatan: string, 
    customNominal?: number, 
    isPartial?: boolean
  ) => {
    const updatedList = pengajuanPinjaman.map(p => {
      if (p.id === id) {
        const approvedNominal = customNominal !== undefined && customNominal > 0 ? customNominal : p.nominalPinjaman;
        const provisi = (approvedNominal * p.biayaProvisiPersen) / 100;
        const diterima = approvedNominal - provisi;
        const isPartiallyApproved = isPartial || (customNominal !== undefined && customNominal > 0 && customNominal < p.nominalPinjaman);

        const updated: PengajuanPinjaman = { 
          ...p, 
          status: isPartiallyApproved ? 'Disetujui Sebagian' : 'Disetujui', 
          catatanPengurus: catatan,
          nominalPengajuanAwal: p.nominalPengajuanAwal || p.nominalPinjaman,
          nominalDisetujui: approvedNominal,
          nominalPinjaman: approvedNominal,
          provisiDipotong: provisi,
          jumlahDiterima: diterima,
          tanggalDiproses: new Date().toISOString().split('T')[0]
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
          status: 'Belum Lunas',
          angsuranPokokPerBulan,
          jasaPerBulan,
          totalAngsuranPerBulan,
          totalWajibBayar,
          keterangan: isPartiallyApproved 
            ? `Disetujui sebagian (Rp ${approvedNominal.toLocaleString('id-ID')} dari pengajuan Rp ${(p.nominalPengajuanAwal || p.nominalPinjaman).toLocaleString('id-ID')})` 
            : undefined
        };
        setPinjaman(prev => [...prev, newPinjaman]);
        saveCollectionItem<Pinjaman>('pinjaman', newPinjaman);

        const memberObj = members.find(m => m.id === p.anggotaId);
        handleAddSecurityLog({
          userId: currentUserAccount?.id || 'admin-system',
          userNama: currentUserAccount?.nama || 'Administrator',
          role: 'admin',
          action: isPartiallyApproved ? 'PENGAJUAN_PINJAMAN_DISETUJUI_SEBAGIAN' : 'PENGAJUAN_PINJAMAN_DISETUJUI',
          category: 'Data Finansial',
          severity: 'info',
          status: 'SUCCESS',
          description: isPartiallyApproved 
            ? `Pengajuan pinjaman anggota ${memberObj?.nama || ''} (${memberObj?.noAnggota || '-'}) disetujui sebagian sebesar Rp ${approvedNominal.toLocaleString('id-ID')} (pengajuan awal Rp ${(p.nominalPengajuanAwal || p.nominalPinjaman).toLocaleString('id-ID')}). Catatan: ${catatan || '-'}`
            : `Pengajuan pinjaman anggota ${memberObj?.nama || ''} (${memberObj?.noAnggota || '-'}) disetujui penuh sebesar Rp ${approvedNominal.toLocaleString('id-ID')}. Catatan: ${catatan || '-'}`,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent || 'Web Browser',
          metadata: {
            pengajuanId: id,
            nominalAwal: p.nominalPengajuanAwal || p.nominalPinjaman,
            nominalDisetujui: approvedNominal,
            status: isPartiallyApproved ? 'Disetujui Sebagian' : 'Disetujui',
            catatan
          }
        });

        return updated;
      }
      return p;
    });
    setPengajuanPinjaman(updatedList);
  };

  const handleRejectPengajuanPinjaman = async (id: string, catatan: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setPengajuanPinjaman(prev => prev.map(p => {
      if (p.id === id) {
        const updated: PengajuanPinjaman = { 
          ...p, 
          status: 'Ditolak', 
          catatanPengurus: catatan,
          tanggalDiproses: todayStr 
        };
        saveCollectionItem<PengajuanPinjaman>('pengajuan_pinjaman', updated);

        const memberObj = members.find(m => m.id === p.anggotaId);
        handleAddSecurityLog({
          userId: currentUserAccount?.id || 'admin-system',
          userNama: currentUserAccount?.nama || 'Administrator',
          role: 'admin',
          action: 'PENGAJUAN_PINJAMAN_DITOLAK',
          category: 'Data Finansial',
          severity: 'warning',
          status: 'SUCCESS',
          description: `Pengajuan pinjaman anggota ${memberObj?.nama || ''} (${memberObj?.noAnggota || '-'}) sebesar Rp ${p.nominalPinjaman.toLocaleString('id-ID')} ditolak. Alasan: ${catatan || '-'}`,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent || 'Web Browser',
          metadata: {
            pengajuanId: id,
            nominal: p.nominalPinjaman,
            status: 'Ditolak',
            catatan
          }
        });

        return updated;
      }
      return p;
    }));
  };

  const handleAddPembayaranPending = async (newPayment: Omit<PembayaranPending, 'id' | 'status'>) => {
    // Check if an identical pending payment already exists to prevent duplicate entries
    const isDuplicate = pembayaranPending.some(p => 
      p.status === 'Pending' &&
      p.anggotaId === newPayment.anggotaId &&
      p.jenis === newPayment.jenis &&
      p.jumlah === newPayment.jumlah &&
      p.tanggal === newPayment.tanggal &&
      (p.pinjamanId === newPayment.pinjamanId || !p.pinjamanId)
    );
    if (isDuplicate) {
      throw new Error(`Konfirmasi pembayaran serupa (${newPayment.jenis} sebesar Rp ${newPayment.jumlah.toLocaleString('id-ID')}) sudah pernah dikirimkan pada tanggal ${newPayment.tanggal} dan saat ini berstatus PENDING. Mohon tunggu verifikasi pengurus.`);
    }

    const id = `pay-${Date.now()}`;
    const item: PembayaranPending = {
      ...newPayment,
      id,
      status: 'Pending'
    };

    // Update state immediately for instant feedback
    setPembayaranPending(prev => {
      const updated = [...prev, item];
      try {
        localStorage.setItem('kop_pembayaran_pending', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Save to Firestore cloud database
    try {
      await saveCollectionItem<PembayaranPending>('pembayaran_pending', item);
    } catch (saveErr) {
      console.warn("Gagal menyimpan pembayaran pending ke cloud, disimpan di lokal:", saveErr);
    }

    // Record member activity log
    const memberObj = members.find(m => m.id === newPayment.anggotaId);
    await handleAddSecurityLog({
      userId: newPayment.anggotaId,
      userNama: memberObj?.nama || 'Anggota Koperasi',
      role: 'member',
      action: 'KONFIRMASI_PEMBAYARAN_MANDIRI',
      category: 'Data Finansial',
      severity: 'info',
      status: 'SUCCESS',
      description: `Anggota ${memberObj?.nama || ''} (No. ${memberObj?.noAnggota || '-'}) mengonfirmasi pembayaran ${newPayment.jenis} sebesar Rp ${newPayment.jumlah.toLocaleString('id-ID')}${newPayment.keterangan ? ` (${newPayment.keterangan})` : ''}.`,
      ipAddress: '182.253.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
      userAgent: navigator.userAgent || 'Mozilla/5.0 (Mobile/Web Browser)',
      metadata: {
        noAnggota: memberObj?.noAnggota,
        pembayaranId: id,
        jenisPembayaran: newPayment.jenis,
        nominal: newPayment.jumlah,
        keterangan: newPayment.keterangan
      }
    });

    return item;
  };

  const handleApprovePembayaranPending = async (id: string, catatan?: string) => {
    const p = pembayaranPending.find(item => item.id === id);
    if (!p) return;

    const updated: PembayaranPending = {
      ...p,
      status: 'Disetujui' as const,
      catatanPengurus: catatan || 'Disetujui oleh pengurus.'
    };

    setPembayaranPending(prev => {
      const next = prev.map(item => item.id === id ? updated : item);
      try {
        localStorage.setItem('kop_pembayaran_pending', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      await saveCollectionItem<PembayaranPending>('pembayaran_pending', updated);
    } catch (err) {
      console.warn("Failed to update status in cloud:", err);
    }

    // Process actual ledger entry based on payment type outside the state setter
    const txId = `TX-${p.id}`;
    if (p.jenis === 'Simpanan Wajib') {
      await handleAddSimpanan({
        anggotaId: p.anggotaId,
        tanggal: p.tanggal,
        jenis: 'Wajib',
        jumlah: p.jumlah,
        keterangan: p.keterangan || 'Setoran Simpanan Wajib mandiri divalidasi',
        transaksiId: txId
      });
    } else if (p.jenis === 'Angsuran') {
      const pinj = pinjaman.find(loan => loan.id === p.pinjamanId);
      let markAsLunas = false;

      if (pinj) {
        const related = angsuran.filter(a => a.pinjamanId === p.pinjamanId);
        const sisaPokok = calculateLoanOutstanding(pinj, related);
        const regPokok = pinj.angsuranPokokPerBulan || Math.round(pinj.nominalPinjaman / (pinj.tenor || 1));
        const monthlyInterest = pinj.jasaPerBulan > 0 
          ? pinj.jasaPerBulan 
          : Math.round(pinj.nominalPinjaman * (pinj.bungaFlatPersen ? pinj.bungaFlatPersen / 100 : 0.015));
        const totalMonthly = regPokok + monthlyInterest;

        // Deteksi jika pembayaran mencakup 2 bulan sekaligus (tunggakan + berjalan)
        const isTwoMonths = (
          (totalMonthly > 0 && p.jumlah >= totalMonthly * 1.75 && p.jumlah <= totalMonthly * 2.25) ||
          Boolean(p.keterangan?.toLowerCase().includes('2 bulan') || p.keterangan?.toLowerCase().includes('2 kali') || p.keterangan?.toLowerCase().includes('dua bulan'))
        );

        if (isTwoMonths) {
          const bKe = p.bulanKe || 1;
          const items: Omit<Angsuran, 'id'>[] = [
            {
              pinjamanId: p.pinjamanId!,
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              pokokBayar: regPokok,
              jasaBayar: monthlyInterest,
              jumlahBayar: regPokok + monthlyInterest,
              bulanKe: bKe,
              keterangan: p.keterangan 
                ? `${p.keterangan} (Angsuran Ke-${bKe} - Tunggakan Bulan Kemarin)` 
                : `Angsuran ke-${bKe} (Pelunasan Tunggakan Bulan Kemarin) divalidasi`
            },
            {
              pinjamanId: p.pinjamanId!,
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              pokokBayar: regPokok,
              jasaBayar: monthlyInterest,
              jumlahBayar: regPokok + monthlyInterest,
              bulanKe: bKe + 1,
              keterangan: p.keterangan 
                ? `${p.keterangan} (Angsuran Ke-${bKe + 1} - Bulan Berjalan)` 
                : `Angsuran ke-${bKe + 1} (Bulan Berjalan) divalidasi`
            }
          ];
          markAsLunas = (regPokok * 2 >= sisaPokok) || Boolean(p.keterangan?.toLowerCase().includes('lunas'));
          await handleAddAngsuran(items, markAsLunas);
        } else {
          const jasaBayar = Math.min(p.jumlah, monthlyInterest);
          const pokokBayar = Math.max(0, p.jumlah - jasaBayar);
          markAsLunas = (pokokBayar >= sisaPokok) || Boolean(p.keterangan?.toLowerCase().includes('lunas'));

          await handleAddAngsuran({
            pinjamanId: p.pinjamanId!,
            anggotaId: p.anggotaId,
            tanggal: p.tanggal,
            pokokBayar,
            jasaBayar,
            jumlahBayar: p.jumlah,
            bulanKe: p.bulanKe || 1,
            keterangan: p.keterangan || `Angsuran ke-${p.bulanKe} mandiri divalidasi`
          }, markAsLunas);
        }
      }
    } else if (p.jenis === 'Simpanan Wajib & Angsuran') {
      if (p.jumlahSimpananWajib && p.jumlahSimpananWajib > 0) {
        await handleAddSimpanan({
          anggotaId: p.anggotaId,
          tanggal: p.tanggal,
          jenis: 'Wajib',
          jumlah: p.jumlahSimpananWajib,
          keterangan: p.keterangan || 'Setoran Simpanan Wajib mandiri (gabungan) divalidasi',
          transaksiId: txId
        });
      }
      if (p.jumlahAngsuran && p.jumlahAngsuran > 0 && p.pinjamanId) {
        const pinj = pinjaman.find(loan => loan.id === p.pinjamanId);
        let markAsLunas = false;

        if (pinj) {
          const related = angsuran.filter(a => a.pinjamanId === p.pinjamanId);
          const sisaPokok = calculateLoanOutstanding(pinj, related);
          const regPokok = pinj.angsuranPokokPerBulan || Math.round(pinj.nominalPinjaman / (pinj.tenor || 1));
          const monthlyInterest = pinj.jasaPerBulan > 0 
            ? pinj.jasaPerBulan 
            : Math.round(pinj.nominalPinjaman * (pinj.bungaFlatPersen ? pinj.bungaFlatPersen / 100 : 0.015));
          const totalMonthly = regPokok + monthlyInterest;

          const isTwoMonths = (
            (totalMonthly > 0 && p.jumlahAngsuran >= totalMonthly * 1.75 && p.jumlahAngsuran <= totalMonthly * 2.25) ||
            Boolean(p.keterangan?.toLowerCase().includes('2 bulan') || p.keterangan?.toLowerCase().includes('2 kali') || p.keterangan?.toLowerCase().includes('dua bulan'))
          );

          if (isTwoMonths) {
            const bKe = p.bulanKe || 1;
            const items: Omit<Angsuran, 'id'>[] = [
              {
                pinjamanId: p.pinjamanId,
                anggotaId: p.anggotaId,
                tanggal: p.tanggal,
                pokokBayar: regPokok,
                jasaBayar: monthlyInterest,
                jumlahBayar: regPokok + monthlyInterest,
                bulanKe: bKe,
                keterangan: p.keterangan 
                  ? `${p.keterangan} (Angsuran Ke-${bKe} - Tunggakan Bulan Kemarin)` 
                  : `Angsuran ke-${bKe} (Tunggakan Bulan Kemarin) mandiri (gabungan) divalidasi`
              },
              {
                pinjamanId: p.pinjamanId,
                anggotaId: p.anggotaId,
                tanggal: p.tanggal,
                pokokBayar: regPokok,
                jasaBayar: monthlyInterest,
                jumlahBayar: regPokok + monthlyInterest,
                bulanKe: bKe + 1,
                keterangan: p.keterangan 
                  ? `${p.keterangan} (Angsuran Ke-${bKe + 1} - Bulan Berjalan)` 
                  : `Angsuran ke-${bKe + 1} (Bulan Berjalan) mandiri (gabungan) divalidasi`
              }
            ];
            markAsLunas = (regPokok * 2 >= sisaPokok) || Boolean(p.keterangan?.toLowerCase().includes('lunas'));
            await handleAddAngsuran(items, markAsLunas);
          } else {
            const jasaBayar = Math.min(p.jumlahAngsuran, monthlyInterest);
            const pokokBayar = Math.max(0, p.jumlahAngsuran - jasaBayar);
            markAsLunas = (pokokBayar >= sisaPokok) || Boolean(p.keterangan?.toLowerCase().includes('lunas'));

            await handleAddAngsuran({
              pinjamanId: p.pinjamanId,
              anggotaId: p.anggotaId,
              tanggal: p.tanggal,
              pokokBayar,
              jasaBayar,
              jumlahBayar: p.jumlahAngsuran,
              bulanKe: p.bulanKe || 1,
              keterangan: p.keterangan || `Angsuran ke-${p.bulanKe} mandiri (gabungan) divalidasi`
            }, markAsLunas);
          }
        }
      }
    } else if (p.jenis === 'Simpanan Pokok & Wajib') {
      const spNominal = (p.jumlahSimpananPokok && p.jumlahSimpananPokok > 0) 
        ? p.jumlahSimpananPokok 
        : Math.max(0, p.jumlah - (p.jumlahSimpananWajib || 0));
      if (spNominal > 0) {
        await handleAddSimpanan({
          anggotaId: p.anggotaId,
          tanggal: p.tanggal,
          jenis: 'Pokok',
          jumlah: spNominal,
          keterangan: p.keterangan || 'Setoran Simpanan Pokok mandiri divalidasi',
          transaksiId: txId
        });
      }
      if (p.jumlahSimpananWajib && p.jumlahSimpananWajib > 0) {
        await handleAddSimpanan({
          anggotaId: p.anggotaId,
          tanggal: p.tanggal,
          jenis: 'Wajib',
          jumlah: p.jumlahSimpananWajib,
          keterangan: p.keterangan || 'Setoran Simpanan Wajib mandiri (gabungan Pokok+Wajib) divalidasi',
          transaksiId: txId
        });
      }
    } else if (p.jenis === 'Simpanan Pokok') {
      await handleAddSimpanan({
        anggotaId: p.anggotaId,
        tanggal: p.tanggal,
        jenis: 'Pokok',
        jumlah: p.jumlah,
        keterangan: p.keterangan || 'Setoran Simpanan Pokok mandiri divalidasi',
        transaksiId: txId
      });
    } else if (p.jenis === 'Pelunasan Hutang Warung') {
      await handleAddPiutang({
        anggotaId: p.anggotaId,
        tanggal: p.tanggal,
        jenis: 'pelunasan',
        nominal: p.jumlah,
        keterangan: p.keterangan || 'Pelunasan hutang toko/warung mandiri anggota divalidasi'
      });
    }
  };

  const handleRejectPembayaranPending = async (id: string, catatan?: string) => {
    setPembayaranPending(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          const updated: PembayaranPending = {
            ...p,
            status: 'Ditolak' as const,
            catatanPengurus: catatan || 'Ditolak oleh pengurus.'
          };
          saveCollectionItem<PembayaranPending>('pembayaran_pending', updated).catch(e => console.warn(e));
          return updated;
        }
        return p;
      });
      try {
        localStorage.setItem('kop_pembayaran_pending', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleAddAngsuran = async (newA: Omit<Angsuran, 'id'> | Omit<Angsuran, 'id'>[], markAsLunas: boolean) => {
    const itemsToAdd: Omit<Angsuran, 'id'>[] = Array.isArray(newA) ? newA : [newA];
    if (itemsToAdd.length === 0) return;

    const baseTime = Date.now();
    const createdItems: Angsuran[] = itemsToAdd.map((item, idx) => ({
      ...item,
      id: `a-${baseTime}-${idx}-${Math.random().toString(36).substring(2, 7)}`
    }));

    const updatedAngsuranList = [...angsuran, ...createdItems];
    setAngsuran(updatedAngsuranList);
    for (const item of createdItems) {
      await saveCollectionItem<Angsuran>('angsuran', item);
    }

    // Re-evaluate Pinjaman status: jika sisa pinjaman 0 maka status jadi Lunas
    const targetLoanId = itemsToAdd[0]?.pinjamanId;
    const targetLoan = pinjaman.find(p => p.id === targetLoanId);
    if (targetLoan) {
      const allRepaysForLoan = updatedAngsuranList.filter(a => a.pinjamanId === targetLoan.id);
      const remainingPrincipal = calculateLoanOutstanding(targetLoan, allRepaysForLoan);
      const shouldBeLunas = markAsLunas || remainingPrincipal <= 0;
      const newStatus = shouldBeLunas ? 'Lunas' : 'Belum Lunas';

      if (targetLoan.status !== newStatus) {
        const updated = { ...targetLoan, status: newStatus as 'Lunas' | 'Belum Lunas' };
        setPinjaman(prev => prev.map(p => p.id === targetLoanId ? updated : p));
        await saveCollectionItem<Pinjaman>('pinjaman', updated);
      }
    }
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
      // Optimistically update local state
      const remainingAngsuran = angsuran.filter(a => a.id !== id);
      setAngsuran(remainingAngsuran);
      
      // Perform database deletion
      await deleteCollectionItem('angsuran', id);
      console.log("handleDeleteAngsuran: Database deletion successful for ID:", id);

      // Re-evaluate Pinjaman status based on remaining loan balance
      const relatedPinjaman = pinjaman.find(p => p.id === target.pinjamanId);
      if (relatedPinjaman) {
        const remainingRepaysForP = remainingAngsuran.filter(a => a.pinjamanId === relatedPinjaman.id);
        const remainingPrincipal = calculateLoanOutstanding(relatedPinjaman, remainingRepaysForP);
        const newStatus = remainingPrincipal <= 0 ? 'Lunas' : 'Belum Lunas';

        if (relatedPinjaman.status !== newStatus) {
          const updated = { ...relatedPinjaman, status: newStatus as 'Lunas' | 'Belum Lunas' };
          setPinjaman(prev => prev.map(p => p.id === target.pinjamanId ? updated : p));
          await saveCollectionItem<Pinjaman>('pinjaman', updated);
          console.log("handleDeleteAngsuran: Related loan status updated to:", newStatus);
        }
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

  const handleEditAngsuran = async (updated: Angsuran) => {
    console.log("handleEditAngsuran triggered for:", updated);
    const original = angsuran.find(a => a.id === updated.id);
    if (!original) {
      console.warn("handleEditAngsuran: Original installment not found for ID:", updated.id);
      alert("Catatan angsuran tidak ditemukan.");
      return;
    }

    try {
      // Optimistically update local state
      const updatedList = angsuran.map(a => a.id === updated.id ? updated : a);
      setAngsuran(updatedList);
      
      // Save to DB
      await saveCollectionItem<Angsuran>('angsuran', updated);
      console.log("handleEditAngsuran: Database update successful for ID:", updated.id);

      // Re-evaluate Pinjaman status (Lunas / Belum Lunas) based on remaining principal: jika sisa pinjaman 0 maka status jadi Lunas
      const relatedPinjaman = pinjaman.find(p => p.id === updated.pinjamanId);
      if (relatedPinjaman) {
        const allRepays = updatedList.filter(a => a.pinjamanId === relatedPinjaman.id);
        const remainingPrincipal = calculateLoanOutstanding(relatedPinjaman, allRepays);
        const newStatus = remainingPrincipal <= 0 ? 'Lunas' : 'Belum Lunas';
        if (relatedPinjaman.status !== newStatus) {
          const updatedPinjaman = { ...relatedPinjaman, status: newStatus as 'Lunas' | 'Belum Lunas' };
          setPinjaman(prev => prev.map(p => p.id === relatedPinjaman.id ? updatedPinjaman : p));
          await saveCollectionItem<Pinjaman>('pinjaman', updatedPinjaman);
        }
      }

      alert("Catatan angsuran berhasil diperbarui.");
    } catch (error) {
      console.error("handleEditAngsuran failed:", error);
      // Rollback
      setAngsuran(prev => prev.map(a => a.id === updated.id ? original : a));
      alert(`Gagal memperbarui angsuran: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddIncome = async (newI: Omit<PendapatanLain, 'id'>) => {
    const id = `pe-${Date.now()}`;
    const item: PendapatanLain = { ...newI, id };
    setIncome(prev => [...prev, item]);
    await saveCollectionItem<PendapatanLain>('income', item);
  };

  const handleAddExpense = async (newE: Omit<BebanKoperasi, 'id'>) => {
    const id = `b-${Date.now()}`;
    const item: BebanKoperasi = { ...newE, id };
    setExpenses(prev => [...prev, item]);
    await saveCollectionItem<BebanKoperasi>('expenses', item);
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
      const updatedSetup = { ...setup, kasAwal: 0 };
      setSetup(updatedSetup);
      await saveKoperasiSetup(updatedSetup);

      await clearCollection('income');
      await clearCollection('expenses');
      setIncome([]);
      setExpenses([]);
    } catch (err) {
      console.error("Gagal mengosongkan data kas:", err);
    }
  };

  const handleAddPembelian = async (newP: Omit<Pembelian, 'id'>) => {
    const id = `pem-${Date.now()}`;
    const item: Pembelian = { ...newP, id };
    setPembelian(prev => [...prev, item]);
    await saveCollectionItem<Pembelian>('pembelian', item);
  };

  const handleDeletePembelian = async (id: string) => {
    setPembelian(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('pembelian', id);
  };

  const handleAddPiutang = async (newP: Omit<PiutangWarung, 'id'>) => {
    const id = `pw-${Date.now()}`;
    const item: PiutangWarung = { ...newP, id };
    setPiutangWarung(prev => [...prev, item]);
    await saveCollectionItem<PiutangWarung>('piutang_warung', item);
  };

  const handleDeletePiutang = async (id: string) => {
    setPiutangWarung(prev => prev.filter(p => p.id !== id));
    await deleteCollectionItem('piutang_warung', id);
  };

  const handleUpdateSetup = async (newSetup: KoperasiSetup) => {
    setSetup(newSetup);
    await saveKoperasiSetup(newSetup);
  };

  const handleAddUserAccount = async (account: Omit<UserAccount, 'id'>) => {
    const newAcc: UserAccount = {
      ...account,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    setUserAccounts(prev => {
      const updated = [...prev.filter(u => u.username.toLowerCase() !== newAcc.username.toLowerCase()), newAcc];
      localStorage.setItem('kop_user_accounts', JSON.stringify(updated));
      return updated;
    });
    try {
      await saveCollectionItem<UserAccount>('user_accounts', newAcc);
    } catch (err) {
      console.warn("Gagal menyimpan akun ke cloud. Disimpan secara lokal.", err);
    }
  };

  const handleBatchAddUserAccounts = async (accountsToCreate: Omit<UserAccount, 'id'>[], accountsToUpdate: UserAccount[]) => {
    const createdWithIds: UserAccount[] = accountsToCreate.map((acc, idx) => ({
      ...acc,
      id: `usr-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
    }));

    setUserAccounts(prev => {
      let next = [...prev];
      for (const updated of accountsToUpdate) {
        next = next.map(u => u.id === updated.id ? updated : u);
      }
      for (const created of createdWithIds) {
        next = next.filter(u => u.username.toLowerCase() !== created.username.toLowerCase());
        next.push(created);
      }
      localStorage.setItem('kop_user_accounts', JSON.stringify(next));
      return next;
    });

    // Save all to Firestore
    for (const acc of accountsToUpdate) {
      try {
        await saveCollectionItem<UserAccount>('user_accounts', acc);
      } catch (err) {
        console.warn("Gagal update user account di cloud:", err);
      }
    }
    for (const acc of createdWithIds) {
      try {
        await saveCollectionItem<UserAccount>('user_accounts', acc);
      } catch (err) {
        console.warn("Gagal save user account ke cloud:", err);
      }
    }
  };

  const handleUpdateUserAccount = async (account: UserAccount) => {
    setUserAccounts(prev => {
      const exists = prev.some(u => u.id === account.id || u.username.toLowerCase() === account.username.toLowerCase());
      const updated = exists 
        ? prev.map(u => (u.id === account.id || u.username.toLowerCase() === account.username.toLowerCase()) ? account : u)
        : [account, ...prev];
      localStorage.setItem('kop_user_accounts', JSON.stringify(updated));
      return updated;
    });

    if (currentUserAccount && (
      currentUserAccount.id === account.id || 
      currentUserAccount.username.toLowerCase() === account.username.toLowerCase() ||
      (currentUserAccount.role === 'admin' && account.role === 'admin')
    )) {
      const updatedCurr = { ...currentUserAccount, ...account };
      setCurrentUserAccount(updatedCurr);
      localStorage.setItem('koperasi_logged_user_account', JSON.stringify(updatedCurr));
    }

    try {
      await saveCollectionItem<UserAccount>('user_accounts', account);
    } catch (err) {
      console.warn("Gagal memperbarui akun di cloud. Diubah secara lokal.", err);
    }
  };

  const handleDeleteUserAccount = async (id: string) => {
    setUserAccounts(prev => {
      const updated = prev.filter(u => u.id !== id);
      localStorage.setItem('kop_user_accounts', JSON.stringify(updated));
      return updated;
    });
    try {
      await deleteCollectionItem('user_accounts', id);
    } catch (err) {
      console.warn("Gagal menghapus akun dari cloud. Dihapus secara lokal.", err);
    }
  };

  const handleDeleteAllNonAdminUsers = async () => {
    const nonAdminAccounts = userAccounts.filter(u => u.role !== 'admin' && u.username.toLowerCase() !== 'admin');
    if (nonAdminAccounts.length === 0) {
      alert("Tidak ada akun user (non-admin) yang dapat dihapus.");
      return;
    }

    const adminAccounts = userAccounts.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin');

    // Update local state and localStorage immediately
    setUserAccounts(adminAccounts);
    localStorage.setItem('kop_user_accounts', JSON.stringify(adminAccounts));

    // Delete non-admin accounts from Firestore
    try {
      for (const u of nonAdminAccounts) {
        await deleteCollectionItem('user_accounts', u.id);
      }
      
      // Log to security log
      const logEntry: Omit<SecurityLog, 'id'> = {
        timestamp: new Date().toISOString(),
        userId: currentUserAccount?.id || 'admin',
        userNama: currentUserAccount?.nama || 'Admin Koperasi',
        role: 'admin',
        action: 'Hapus Massal User Anggota (Kecuali Admin)',
        category: 'Manajemen Anggota',
        severity: 'danger',
        description: `Menghapus ${nonAdminAccounts.length} akun user anggota. Menyisakan ${adminAccounts.length} akun admin/pengurus.`,
        ipAddress: '127.0.0.1 (Web)',
        userAgent: navigator.userAgent,
        status: 'SUCCESS',
        metadata: {
          totalDeleted: nonAdminAccounts.length,
          remainingAdmins: adminAccounts.length
        }
      };
      await handleAddSecurityLog(logEntry);
    } catch (err) {
      console.warn("Sebagian akun user gagal dihapus dari cloud Firestore:", err);
    }
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
    const inputPin = window.prompt("Masukkan PIN Keamanan untuk mengosongkan semua data koperasi:");
    if (inputPin === null) return; // User canceled
    if (inputPin.trim() !== "010203") {
      alert("PIN Keamanan salah! Akses ditolak.");
      return;
    }

    if (!window.confirm("Apakah Anda benar-benar yakin ingin mengosongkan semua data transaksi & keuangan koperasi? Seluruh saldo, transaksi, simpanan, pinjaman, dan kas akan dikosongkan jadi 0 Rupiah.\n\nCatatan: DATA ANGGOTA TIDAK AKAN DIHAPUS dan tetap dipertahankan. Lanjutkan?")) {
      return;
    }

    // Keep members intact
    const currentMembers = [...members];

    localStorage.clear();

    try {
      if (currentMembers.length > 0) {
        localStorage.setItem('koperasi_members', JSON.stringify(currentMembers));
      }
    } catch (e) {
      console.error("Gagal simpan backup members ke local storage:", e);
    }

    const resetSetup: KoperasiSetup = {
      ...setup,
      kasAwal: 0,
      piutangAwal: 0,
      persediaanWarungAwal: 0,
      inventarisAwal: 0,
      akumulasiPenyusutanAwal: 0,
      simpananPokokAwal: 0,
      simpananWajibAwal: 0,
      simpananSukarelaAwal: 0,
      modalAwal: 0,
      danaCadanganAwal: 0,
    };

    setSetup(resetSetup);
    // DO NOT CLEAR MEMBERS! Keep members
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
    setPembayaranPending([]);

    // Clear all Firestore collections EXCEPT members
    try {
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
      await clearCollection('pembayaran_pending');
      
      // Also reset/update the setup profile configuration in the cloud
      await saveKoperasiSetup(resetSetup);
      
      alert("Seluruh data transaksi & keuangan koperasi berhasil dikosongkan jadi 0 Rupiah! Data anggota tetap dipertahankan.");
    } catch (err) {
      console.error("Gagal membersihkan koleksi Cloud Firestore saat reset:", err);
      alert("Gagal mengosongkan beberapa koleksi di Cloud Firestore. Silakan coba lagi.");
    }
  };

  // Initial Splash Screen
  if (showSplash) {
    return (
      <SplashScreen
        setup={setup}
        isLoading={isDbLoading}
        minimumDuration={1200}
        onFinish={() => {
          setShowSplash(false);
        }}
      />
    );
  }

  const renderPortalPage = (section: 'home' | 'profile' | 'finance' | 'register' | 'login' | 'simulation') => (
    <PortalKoperasi
      setup={setup}
      members={sortedMembers}
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
      userAccounts={userAccounts}
      rekening={rekening}
      onAddMember={handleAddMember}
      onAddExpense={handleAddExpense}
      onLoginSuccess={handleLoginSuccess}
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
      initialSection={section}
      onNavigateSection={(sec) => {
        if (sec === 'home') navigate('/portal');
        else if (sec === 'profile') navigate('/portal/profil');
        else if (sec === 'finance') navigate('/portal/keuangan');
        else if (sec === 'register') navigate('/portal/pendaftaran');
        else if (sec === 'simulation') navigate('/portal/simulasi');
        else if (sec === 'login') navigate('/portal/login');
      }}
    />
  );

  const renderMemberPage = () => {
    if (!isLoggedIn || userRole !== 'member') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-850 p-8 rounded-2xl border border-slate-750 shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Portal Anggota Terproteksi</h2>
              <p className="text-xs text-slate-400 mt-2">
                Silakan masuk terlebih dahulu untuk mengakses saldo simpanan, tagihan pinjaman, dan transaksi Anda.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Masuk ke Akun Anggota
              </button>
              <button
                onClick={() => navigate('/portal')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Kembali ke Portal Publik
              </button>
            </div>
          </div>
        </div>
      );
    }

    const activeMember = (loggedMember ? sortedMembers.find(m => m.id === loggedMember.id) : null)
      || loggedMember
      || (currentUserAccount?.anggotaId ? sortedMembers.find(m => m.id === currentUserAccount.anggotaId) : null)
      || (currentUserAccount?.username ? sortedMembers.find(m => m.noAnggota.trim().toLowerCase() === currentUserAccount.username.trim().toLowerCase()) : null)
      || sortedMembers[0];

    if (activeMember) {
      return (
        <MemberDashboardView
          member={activeMember}
          setup={setup}
          members={sortedMembers}
          simpanan={simpanan}
          pinjaman={pinjaman}
          angsuran={angsuran}
          income={income}
          expenses={expenses}
          pembelian={pembelian}
          piutangWarung={piutangWarung}
          announcements={announcements}
          pengajuanPinjaman={pengajuanPinjaman}
          pembayaranPending={pembayaranPending}
          galeriKoperasi={galeriKoperasi}
          userAccounts={userAccounts}
          onUpdateUserAccount={handleUpdateUserAccount}
          onUpdateMember={handleEditMember}
          onAddPengajuanPinjaman={handleAddPengajuanPinjaman}
          onAddPembayaranPending={handleAddPembayaranPending}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">Memuat Kabinet Anggota...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Menghubungkan ke data profil anggota koperasi. Jika membutuhkan waktu lama, silakan tekan tombol di bawah.
        </p>
        <button 
          onClick={handleLogout}
          className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-lg transition cursor-pointer"
        >
          Logout & Kembali
        </button>
      </div>
    );
  };

  interface NavItem {
    id: TabId;
    label: string;
    icon: React.ComponentType<any>;
  }

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'anggota', label: 'Data Keanggotaan', icon: Users },
    { id: 'kasmasuk', label: 'Kas Masuk', icon: TrendingUp },
    { id: 'kaskeluar', label: 'Kas Keluar', icon: TrendingDown },
    { id: 'pengingat', label: 'Jadwal dan Tagihan', icon: Bell },
    { id: 'warung', label: 'Unit Usaha Warung & POS', icon: Store },
    { id: 'pembelian', label: 'Inventaris', icon: ShoppingCart },
    { id: 'laporan', label: 'Laporan Keuangan', icon: Scale },
    { id: 'anggaran', label: 'Rencana Anggaran (RAPBK)', icon: Target },
    { id: 'catatan_pengurus', label: 'Catatan Khusus Pengurus', icon: FileSpreadsheet },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { id: 'profil', label: 'Profil dan Konfigurasi', icon: UserCog },
    { id: 'user_mgmt', label: 'Pengaturan Akun dan Akses', icon: KeyRound },
    { id: 'security_logs', label: 'Log Keamanan Sistem', icon: ShieldCheck },
  ];

  const navItems = userRole === 'karyawan_warung'
    ? allNavItems.filter(item => item.id === 'kasmasuk' || item.id === 'kaskeluar' || item.id === 'warung')
    : userRole === 'pengawas'
    ? allNavItems.filter(item => item.id === 'dashboard' || item.id === 'laporan')
    : allNavItems;

  const renderAdminLayout = (childComponent: React.ReactNode, currentTabId: TabId) => {
    if (!isLoggedIn || userRole === 'member') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-850 p-8 rounded-2xl border border-slate-750 shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Akses Sistem Administrasi Terproteksi</h2>
              <p className="text-xs text-slate-400 mt-2">
                Halaman <strong>/{currentTabId}</strong> memerlukan hak akses Pengurus, Pengawas, atau Karyawan Koperasi.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Masuk ke Akun Admin / Pengurus
              </button>
              <button
                onClick={() => navigate('/portal')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Kembali ke Portal Publik
              </button>
            </div>
          </div>
        </div>
      );
    }

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
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-[11px] transition duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-950 text-white shadow-sm font-bold' 
                    : 'text-emerald-100 hover:bg-emerald-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-300/85'}`}/>
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.id === 'kasmasuk' && pendingPembayaranCount > 0 && (
                    <span 
                      title={`${pendingPembayaranCount} setoran mandiri anggota perlu validasi`}
                      className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse"
                    >
                      {pendingPembayaranCount}
                    </span>
                  )}
                  {item.id === 'pinjaman' && pendingPengajuanCount > 0 && (
                    <span 
                      title={`${pendingPengajuanCount} pengajuan pinjaman perlu ditinjau`}
                      className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse"
                    >
                      {pendingPengajuanCount}
                    </span>
                  )}
                  {item.id === 'pengingat' && dueLoansCount > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {dueLoansCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer User Summary */}
        <div className="p-4 bg-emerald-950 border-t border-emerald-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${userRole === 'karyawan_warung' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'} flex items-center justify-center font-bold text-xs select-none shadow`}>
              {currentUserAccount ? getInitials(currentUserAccount.nama) : (userRole === 'karyawan_warung' ? 'KW' : 'AD')}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate leading-tight">
                {currentUserAccount?.nama || (userRole === 'karyawan_warung' ? 'Karyawan Warung' : 'Admin Utama')}
              </p>
              <p className="text-[9px] text-emerald-300 truncate mt-0.5">
                {currentUserAccount?.posisiJabatan || (userRole === 'karyawan_warung' ? 'Kasir / Staf Warung' : 'Pengurus & Admin')}
              </p>
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
            <span className="text-emerald-600 dark:text-emerald-450 font-bold select-none uppercase tracking-wide text-[10px]">
              {userRole === 'karyawan_warung' ? 'Kasir Warung Overview' : 'Real-time Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <PWAInstallButton variant="navbar" appName={setup.namaKoperasi || "Koperasi Dana Segar"} />

            {userRole === 'karyawan_warung' && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-full text-[10px] font-black border border-amber-300 dark:border-amber-800 shrink-0">
                <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Akses Karyawan Warung
              </span>
            )}

            {/* Active Global Search Bar */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="relative hidden md:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-900 border border-slate-250 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-lg py-1 pl-8 pr-2.5 text-[11px] text-slate-500 dark:text-slate-400 w-48 text-left transition cursor-pointer shadow-2xs group"
              title="Cari data di seluruh koperasi (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
              <span className="truncate group-hover:text-slate-800 dark:group-hover:text-slate-200">Cari data...</span>
              <kbd className="ml-auto font-mono text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Cari data"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Calculator Quick Toggle */}
            <button 
              onClick={() => setIsCalculatorOpen(prev => !prev)}
              title="Kalkulator Koperasi (Popup 600x300 px - Tidak Menutup Menu)"
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                isCalculatorOpen 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline text-[11px]">Kalkulator</span>
            </button>

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
            {userRole === 'karyawan_warung' ? (
              <button 
                onClick={() => handleNavigation('kaskeluar')}
                className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95"
              >
                <span>+ Kas Keluar</span>
              </button>
            ) : userRole === 'pengawas' ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pengawas</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {pendingPembayaranCount > 0 && (
                  <button 
                    onClick={() => handleNavigation('kasmasuk', 'pembayaran_pending')}
                    title={`${pendingPembayaranCount} setoran mandiri anggota menunggu validasi kasir/pengurus`}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Validasi Setoran</span>
                    <span className="bg-amber-700 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                      {pendingPembayaranCount}
                    </span>
                  </button>
                )}
                <button 
                  onClick={() => handleNavigation('kasmasuk')}
                  className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition cursor-pointer active:scale-95"
                >
                  <span>+ Kas Masuk</span>
                </button>
              </div>
            )}

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
                        <button
                          key={item.id}
                          onClick={() => {
                            handleNavigation(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            isActive 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold' 
                              : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}/>
                            <span className="truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.id === 'kasmasuk' && pendingPembayaranCount > 0 && (
                              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                                {pendingPembayaranCount}
                              </span>
                            )}
                            {item.id === 'pinjaman' && pendingPengajuanCount > 0 && (
                              <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                                {pendingPengajuanCount}
                              </span>
                            )}
                            {item.id === 'pengingat' && dueLoansCount > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
                                {dueLoansCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <span>{isDarkMode ? 'Mode Gelap' : 'Mode Terang'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-xs cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>

                  <PWAInstallButton variant="drawer" appName={setup.namaKoperasi || "Koperasi Dana Segar"} />

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
              key={currentTabId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.28 }}
              className="h-full"
            >
              {childComponent}
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
      </AnimatePresence>

      {/* Floating Popup Calculator (400x200 px) - Does NOT close active menu */}
      <CalculatorPopup 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />

      {/* Global Interactive Search Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigate={handleGlobalNavigate}
        members={members}
        simpanan={simpanan}
        pinjaman={pinjaman}
        angsuran={angsuran}
        income={income}
        expenses={expenses}
        pembelian={pembelian}
        piutangWarung={piutangWarung}
        warungBarang={warungBarang}
        announcements={announcements}
        navItems={navItems}
        isDarkMode={isDarkMode}
      />
    </div>
    );
  };

  return (
    <>
      {/* 📡 Offline & Online Fast Caching Connectivity Status Bar */}
      <OfflineIndicator isDarkMode={isDarkMode} />

      {/* ⏱️ Auto Logout When Idle for 2 Minutes (Logout ke Portal Utama) */}
      <IdleTimeoutHandler
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        timeoutMinutes={2}
        warningSeconds={20}
        userName={loggedMember?.nama || currentUserAccount?.nama || (userRole ? userRole.toUpperCase() : undefined)}
        userRole={userRole}
      />

      {/* 🔒 Sesi Berakhir Otomatis Notification Banner */}
      <AnimatePresence>
        {idleLogoutNotice && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-9999 max-w-lg w-[94%] bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-amber-400/40"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-5 h-5 text-amber-100" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                  <span>Sesi Berakhir Otomatis</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-medium">Idle 2 Menit</span>
                </p>
                <p className="text-amber-100/90 mt-0.5 leading-snug">
                  {idleLogoutNotice}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIdleLogoutNotice(null);
                try {
                  sessionStorage.removeItem('koperasi_idle_notice');
                } catch (e) {}
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer shrink-0"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        {/* Root & Public Portal Independent Multi-Page Routes */}
        <Route path="/" element={renderPortalPage('home')} />
        <Route path="/profil" element={renderPortalPage('profile')} />
        <Route path="/keuangan" element={renderPortalPage('finance')} />
        <Route path="/pendaftaran" element={renderPortalPage('register')} />
        <Route path="/simulasi" element={renderPortalPage('simulation')} />
        <Route path="/login" element={renderPortalPage('login')} />

        {/* Public Route Aliases & Redirects */}
        <Route path="/portal" element={<Navigate to="/" replace />} />
        <Route path="/portal/beranda" element={<Navigate to="/" replace />} />
        <Route path="/beranda" element={<Navigate to="/" replace />} />
        <Route path="/portal/profil" element={<Navigate to="/profil" replace />} />
        <Route path="/profil-koperasi" element={<Navigate to="/profil" replace />} />
        <Route path="/visi-misi" element={<Navigate to="/profil" replace />} />
        <Route path="/portal/keuangan" element={<Navigate to="/keuangan" replace />} />
        <Route path="/ikhtisar-keuangan" element={<Navigate to="/keuangan" replace />} />
        <Route path="/portal/pendaftaran" element={<Navigate to="/pendaftaran" replace />} />
        <Route path="/register" element={<Navigate to="/pendaftaran" replace />} />
        <Route path="/portal/simulasi" element={<Navigate to="/simulasi" replace />} />
        <Route path="/simulasi-pinjaman" element={<Navigate to="/simulasi" replace />} />
        <Route path="/portal/login" element={<Navigate to="/login" replace />} />
        <Route path="/masuk" element={<Navigate to="/login" replace />} />

      {/* Member Self-Service Dashboard Routes */}
      <Route path="/member" element={renderMemberPage()} />
      <Route path="/member-dashboard" element={renderMemberPage()} />

      {/* Admin Executive & Module Management Routes */}
      <Route
        path="/admin"
        element={renderAdminLayout(
          <DashboardView 
            members={sortedMembers} 
            simpanan={simpanan} 
            pinjaman={pinjaman} 
            angsuran={angsuran} 
            income={income} 
            expenses={expenses} 
            setup={setup}
            announcements={announcements}
            pembelian={pembelian}
            piutangWarung={piutangWarung}
            pembayaranPending={pembayaranPending}
            pengajuanPinjaman={pengajuanPinjaman}
            userRole={userRole}
            onNavigateTab={handleNavigation}
          />,
          'dashboard'
        )}
      />
      <Route
        path="/dashboard"
        element={renderAdminLayout(
          <DashboardView 
            members={sortedMembers} 
            simpanan={simpanan} 
            pinjaman={pinjaman} 
            angsuran={angsuran} 
            income={income} 
            expenses={expenses} 
            setup={setup}
            announcements={announcements}
            pembelian={pembelian}
            piutangWarung={piutangWarung}
            pembayaranPending={pembayaranPending}
            pengajuanPinjaman={pengajuanPinjaman}
            userRole={userRole}
            onNavigateTab={handleNavigation}
          />,
          'dashboard'
        )}
      />

      {/* Anggota */}
      <Route
        path="/anggota"
        element={renderAdminLayout(
          <AnggotaView 
            setup={setup}
            pengurusPengawas={pengurusPengawas}
            members={sortedMembers} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
            onAddMember={handleAddMember} onBatchAddMembers={handleBatchAddMembers} onEditMember={handleEditMember} onDeleteMember={handleDeleteMember}
            onDeleteAngsuran={handleDeleteAngsuran}
            onDeleteSimpanan={handleDeleteSimpanan}
            onEditSimpanan={handleEditSimpanan}
          />,
          'anggota'
        )}
      />

      {/* Kas Masuk & Simpanan */}
      <Route
        path="/kasmasuk"
        element={renderAdminLayout(
          <KasMasukView 
            setup={setup}
            members={sortedMembers} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
            income={income}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
            pembayaranPending={pembayaranPending}
            onApprovePembayaranPending={handleApprovePembayaranPending}
            onRejectPembayaranPending={handleRejectPembayaranPending}
            onAddSimpanan={handleAddSimpanan}
            onPostManasukaBunga={handlePostManasukaBunga}
            onAddAngsuran={handleAddAngsuran}
            onDeleteAngsuran={handleDeleteAngsuran}
            onDeleteSimpanan={handleDeleteSimpanan}
            onEditSimpanan={handleEditSimpanan}
            onEditAngsuran={handleEditAngsuran}
            availableCash={availableCash}
            initialActiveTab={kasMasukInitialTab}
            initialSearchTerm={kasMasukInitialSearch}
            initialAnggotaId={kasMasukInitialAnggota}
            onNavigateToPinjaman={handleNavigateToPinjaman}
            isDarkMode={isDarkMode}
          />,
          'kasmasuk'
        )}
      />
      <Route
        path="/simpanan"
        element={renderAdminLayout(
          <KasMasukView 
            setup={setup}
            members={sortedMembers} simpanan={simpanan} pinjaman={pinjaman} angsuran={angsuran}
            income={income}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
            pembayaranPending={pembayaranPending}
            onApprovePembayaranPending={handleApprovePembayaranPending}
            onRejectPembayaranPending={handleRejectPembayaranPending}
            onAddSimpanan={handleAddSimpanan}
            onPostManasukaBunga={handlePostManasukaBunga}
            onAddAngsuran={handleAddAngsuran}
            onDeleteAngsuran={handleDeleteAngsuran}
            onDeleteSimpanan={handleDeleteSimpanan}
            onEditSimpanan={handleEditSimpanan}
            onEditAngsuran={handleEditAngsuran}
            availableCash={availableCash}
            initialActiveTab={'simpanan'}
            initialSearchTerm={kasMasukInitialSearch}
            initialAnggotaId={kasMasukInitialAnggota}
            onNavigateToPinjaman={handleNavigateToPinjaman}
            isDarkMode={isDarkMode}
          />,
          'kasmasuk'
        )}
      />

      {/* Kas Keluar */}
      <Route
        path="/kaskeluar"
        element={renderAdminLayout(
          <KasKeluarView
            setup={setup}
            pengurusPengawas={pengurusPengawas}
            members={sortedMembers}
            expenses={expenses}
            pinjaman={pinjaman}
            angsuran={angsuran}
            simpanan={simpanan}
            pembelian={pembelian}
            piutangWarung={piutangWarung}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddPinjaman={handleAddPinjaman}
            onEditPinjaman={handleEditPinjaman}
            onDeletePinjaman={handleDeletePinjaman}
            pengajuanPinjaman={pengajuanPinjaman}
            onApprovePengajuanPinjaman={handleApprovePengajuanPinjaman}
            onRejectPengajuanPinjaman={handleRejectPengajuanPinjaman}
            onAddSimpanan={handleAddSimpanan}
            onAddPembelian={handleAddPembelian}
            onDeletePembelian={handleDeletePembelian}
            availableCash={availableCash}
            initialActiveTab={kasKeluarInitialTab}
            initialLoanSearchTerm={pinjamanInitialSearch}
            initialLoanAnggotaId={pinjamanInitialAnggota}
            initialLoanId={pinjamanInitialId}
            onNavigateToAngsuran={handleNavigateToAngsuran}
            isDarkMode={isDarkMode}
          />,
          'kaskeluar'
        )}
      />
      <Route
        path="/beban"
        element={<Navigate to="/kaskeluar" replace />}
      />

      {/* Pinjaman -> Sub-menu / tab pada Kas Keluar */}
      <Route
        path="/pinjaman"
        element={<Navigate to="/kaskeluar" replace />}
      />

      {/* Jadwal & Tagihan */}
      <Route
        path="/pengingat"
        element={renderAdminLayout(
          <PengingatView 
            members={sortedMembers}
            simpanan={simpanan}
            pinjaman={pinjaman}
            angsuran={angsuran}
            piutangWarung={piutangWarung}
            setup={setup}
            whatsAppLogs={whatsAppLogs}
            onSaveWhatsAppLog={handleSaveWhatsAppLog}
            onDeleteWhatsAppLog={handleDeleteWhatsAppLog}
            onNavigateToPinjaman={handleNavigateToPinjaman}
          />,
          'pengingat'
        )}
      />

      {/* Unit Usaha Warung */}
      <Route
        path="/warung"
        element={renderAdminLayout(
          <AdminWarungView 
            warungBarang={warungBarang}
            members={sortedMembers}
            piutangWarung={piutangWarung}
            onAddBarang={handleAddBarang}
            onEditBarang={handleEditBarang}
            onDeleteBarang={handleDeleteBarang}
            onAddPiutang={handleAddPiutang}
            onDeletePiutang={handleDeletePiutang}
            pembelian={pembelian}
            onAddPembelian={handleAddPembelian}
            onDeletePembelian={handleDeletePembelian}
            income={income}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
            simpanan={simpanan}
            pinjaman={pinjaman}
            angsuran={angsuran}
            setup={setup}
            currentUserAccount={currentUserAccount}
          />,
          'warung'
        )}
      />

      {/* Pembelian & Inventaris */}
      <Route
        path="/pembelian"
        element={renderAdminLayout(
          <PembelianView 
            setup={setup}
            pembelian={pembelian}
            onAddPembelian={handleAddPembelian}
            onDeletePembelian={handleDeletePembelian}
          />,
          'pembelian'
        )}
      />

      {/* Arus Kas & Buku Besar -> Dihapus dari navigasi */}
      <Route
        path="/aruskas"
        element={<Navigate to="/kaskeluar" replace />}
      />
      <Route
        path="/bukubesar"
        element={<Navigate to="/laporan" replace />}
      />

      {/* Laporan & SHU */}
      <Route
        path="/laporan"
        element={renderAdminLayout(
          <LaporanView 
            members={sortedMembers} simpanan={simpanan} pinjaman={pinjaman} 
            angsuran={angsuran} income={income} expenses={expenses}
            pembelian={pembelian} piutangWarung={piutangWarung}
            setup={setup}
            rekening={rekening}
            onSaveRekening={handleSaveRekening}
            onDeleteRekening={handleDeleteRekening}
            onDeleteAngsuran={handleDeleteAngsuran}
            onDeleteSimpanan={handleDeleteSimpanan}
            onEditSimpanan={handleEditSimpanan}
            onEditAngsuran={handleEditAngsuran}
            onUpdateSetup={handleUpdateSetup}
            onNavigateToAngsuran={handleNavigateToAngsuran}
            onNavigateToPinjaman={handleNavigateToPinjaman}
            userRole={userRole}
            shuDistributions={shuDistributions}
            onAddSHUDistribution={handleAddSHUDistribution}
          />,
          'laporan'
        )}
      />

      {/* Rencana Anggaran (RAPBK) */}
      <Route
        path="/anggaran"
        element={renderAdminLayout(
          <AdminAnggaranView 
            setup={setup}
            anggaranList={anggaranRAPBK}
            rapbkSettings={rapbkSettings}
            income={income}
            expenses={expenses}
            pinjaman={pinjaman}
            angsuran={angsuran}
            pembelian={pembelian}
            piutangWarung={piutangWarung}
            members={sortedMembers}
            onAddOrUpdateItem={handleAddOrUpdateAnggaranItem}
            onDeleteItem={handleDeleteAnggaranItem}
            onUpdateSetting={handleUpdateRAPBKSetting}
            onLoadStandardTemplate={handleLoadStandardRAPBKTemplate}
            isDarkMode={isDarkMode}
          />,
          'anggaran'
        )}
      />
      <Route
        path="/rapbk"
        element={<Navigate to="/anggaran" replace />}
      />

      {/* Catatan Khusus Pengurus (Spreadsheet Excel) */}
      <Route
        path="/catatan-pengurus"
        element={renderAdminLayout(
          <CatatanKhususPengurusView 
            setup={setup}
            availableCash={availableCash}
            currentUserAccount={currentUserAccount}
            isDarkMode={isDarkMode}
          />,
          'catatan_pengurus'
        )}
      />
      <Route
        path="/catatan_pengurus"
        element={<Navigate to="/catatan-pengurus" replace />}
      />
      <Route
        path="/catatan"
        element={<Navigate to="/catatan-pengurus" replace />}
      />
      <Route
        path="/spreadsheet"
        element={<Navigate to="/catatan-pengurus" replace />}
      />

      {/* Pengurus & Pengawas -> Dipindahkan ke dalam Profil & Konfigurasi */}
      <Route
        path="/pengurus"
        element={<Navigate to="/pengaturan" replace />}
      />

      {/* Pengumuman */}
      <Route
        path="/pengumuman"
        element={renderAdminLayout(
          <PengumumanView 
            setup={setup}
            announcements={announcements}
            onAddAnnouncement={handleAddAnnouncement}
            onEditAnnouncement={handleEditAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
          />,
          'pengumuman'
        )}
      />

      {/* Galeri Koperasi */}
      <Route
        path="/galeri"
        element={renderAdminLayout(
          <AdminGaleriView 
            galeriKoperasi={galeriKoperasi}
            onAddGaleri={handleAddGaleri}
            onEditGaleri={handleEditGaleri}
            onDeleteGaleri={handleDeleteGaleri}
          />,
          'galeri'
        )}
      />

      {/* Profil & Konfigurasi Koperasi (Admin) */}
      <Route
        path="/pengaturan"
        element={renderAdminLayout(
          <ProfilKoperasiView 
            setup={setup} 
            onUpdateSetup={handleUpdateSetup} 
            onResetData={handleResetData}
            onSyncFromFirebase={handleSyncFromFirebase}
            onImportDatabase={handleImportDatabase}
            members={sortedMembers}
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
            onAddPerson={handleAddPerson}
            onEditPerson={handleEditPerson}
            onDeletePerson={handleDeletePerson}
            galeriKoperasi={galeriKoperasi}
          />,
          'profil'
        )}
      />
      <Route
        path="/konfigurasi"
        element={<Navigate to="/pengaturan" replace />}
      />
      <Route
        path="/admin/profil"
        element={<Navigate to="/pengaturan" replace />}
      />

      {/* User & Access Management */}
      <Route
        path="/user-mgmt"
        element={renderAdminLayout(
          <AdminUserManagementView
            setup={setup}
            userAccounts={userAccounts}
            currentUserAccount={currentUserAccount}
            members={sortedMembers}
            onAddUserAccount={handleAddUserAccount}
            onBatchAddUserAccounts={handleBatchAddUserAccounts}
            onUpdateUserAccount={handleUpdateUserAccount}
            onDeleteUserAccount={handleDeleteUserAccount}
            onDeleteAllNonAdminUsers={handleDeleteAllNonAdminUsers}
          />,
          'user_mgmt'
        )}
      />
      <Route
        path="/users"
        element={renderAdminLayout(
          <AdminUserManagementView
            setup={setup}
            userAccounts={userAccounts}
            currentUserAccount={currentUserAccount}
            members={sortedMembers}
            onAddUserAccount={handleAddUserAccount}
            onBatchAddUserAccounts={handleBatchAddUserAccounts}
            onUpdateUserAccount={handleUpdateUserAccount}
            onDeleteUserAccount={handleDeleteUserAccount}
            onDeleteAllNonAdminUsers={handleDeleteAllNonAdminUsers}
          />,
          'user_mgmt'
        )}
      />

      {/* Security Logs */}
      <Route
        path="/security-logs"
        element={renderAdminLayout(
          <AdminSecurityLogsView
            setup={setup}
            securityLogs={securityLogs}
            members={sortedMembers}
            userAccounts={userAccounts}
            onAddSecurityLog={handleAddSecurityLog}
            onClearSecurityLogs={handleClearSecurityLogs}
          />,
          'security_logs'
        )}
      />
      <Route
        path="/logs"
        element={renderAdminLayout(
          <AdminSecurityLogsView
            setup={setup}
            securityLogs={securityLogs}
            members={sortedMembers}
            userAccounts={userAccounts}
            onAddSecurityLog={handleAddSecurityLog}
            onClearSecurityLogs={handleClearSecurityLogs}
          />,
          'security_logs'
        )}
      />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
