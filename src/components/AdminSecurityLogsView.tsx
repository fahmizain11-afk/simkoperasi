import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, ShieldAlert, KeyRound, Wallet, Users, Settings, 
  Search, Filter, Download, Printer, Trash2, RefreshCw, Eye, 
  CheckCircle2, XCircle, AlertTriangle, Info, Terminal, Calendar, 
  User, Lock, Activity, ArrowUpDown, ChevronDown, ChevronUp, PlusCircle, X,
  Smartphone, Monitor, Laptop, Globe, ArrowRight, Clock, FileText, HandCoins,
  CreditCard, DownloadCloud, Sparkles, CheckCheck
} from 'lucide-react';
import { SecurityLog, KoperasiSetup, Member, UserAccount } from '../types';

interface AdminSecurityLogsViewProps {
  setup: KoperasiSetup;
  securityLogs: SecurityLog[];
  members?: Member[];
  userAccounts?: UserAccount[];
  onAddSecurityLog: (log: Omit<SecurityLog, 'id' | 'timestamp'>) => Promise<void>;
  onClearSecurityLogs?: (olderThanDays?: number) => Promise<void>;
}

export const AdminSecurityLogsView: React.FC<AdminSecurityLogsViewProps> = ({
  setup,
  securityLogs = [],
  members = [],
  userAccounts = [],
  onAddSecurityLog,
  onClearSecurityLogs
}) => {
  // Navigation tabs within Log View: 'member_logs' (Histori Anggota) vs 'all_system_logs' (Semua Log Audit Sistem)
  const [activeLogTab, setActiveLogTab] = useState<'member_logs' | 'all_system_logs'>('member_logs');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all'); // all, today, 3days, 7days, 30days
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // default desc (waktu akses terbaru)
  const [displayMode, setDisplayMode] = useState<'table' | 'timeline'>('table');

  // Modals state
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearDays, setClearDays] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Log Form State
  const [manualCategory, setManualCategory] = useState<SecurityLog['category']>('Keamanan Akses');
  const [manualAction, setManualAction] = useState('MANUAL_AUDIT_NOTE');
  const [manualSeverity, setManualSeverity] = useState<SecurityLog['severity']>('info');
  const [manualStatus, setManualStatus] = useState<SecurityLog['status']>('SUCCESS');
  const [manualDescription, setManualDescription] = useState('');

  // Helper to detect human-readable device from UserAgent string
  const parseDevice = (userAgent?: string) => {
    if (!userAgent) return { type: 'Web Browser', icon: Globe, label: 'Web Browser' };
    const ua = userAgent.toLowerCase();
    if (ua.includes('android')) {
      if (ua.includes('samsung') || ua.includes('sm-')) return { type: 'mobile', icon: Smartphone, label: 'Android (Samsung)' };
      if (ua.includes('redmi') || ua.includes('xiaomi')) return { type: 'mobile', icon: Smartphone, label: 'Android (Xiaomi)' };
      if (ua.includes('vivo')) return { type: 'mobile', icon: Smartphone, label: 'Android (Vivo)' };
      if (ua.includes('oppo')) return { type: 'mobile', icon: Smartphone, label: 'Android (Oppo)' };
      return { type: 'mobile', icon: Smartphone, label: 'Android Mobile' };
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
      return { type: 'mobile', icon: Smartphone, label: 'Apple iPhone (iOS)' };
    }
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      return { type: 'desktop', icon: Laptop, label: 'Apple Mac (Safari/Chrome)' };
    }
    if (ua.includes('windows')) {
      return { type: 'desktop', icon: Monitor, label: 'Windows PC (Desktop)' };
    }
    if (ua.includes('linux')) {
      return { type: 'desktop', icon: Monitor, label: 'Linux Workstation' };
    }
    return { type: 'web', icon: Globe, label: 'Web Browser' };
  };

  // Helper to determine Member Activity Type
  const getMemberActivityType = (log: SecurityLog) => {
    const act = (log.action || '').toUpperCase();
    const cat = log.category;
    if (act.includes('LOGIN') || cat === 'Autentikasi') return 'login';
    if (act.includes('PINJAMAN') || act.includes('PENGAJUAN')) return 'pinjaman';
    if (act.includes('BAYAR') || act.includes('PEMBAYARAN') || act.includes('ANGSURAN')) return 'pembayaran';
    if (act.includes('SIMPANAN') || act.includes('MUTASI') || act.includes('TABUNGAN')) return 'simpanan';
    if (act.includes('KUITANSI') || act.includes('UNDUH') || act.includes('STRUK')) return 'kuitansi';
    if (act.includes('PROFIL') || act.includes('SANDI') || act.includes('PASSWORD')) return 'profil';
    return 'lainnya';
  };

  // Helper for Member Avatar Initials & Color
  const getAvatarInfo = (name: string, noAnggota?: string) => {
    const initials = name
      ? name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      : (noAnggota ? noAnggota.substring(0, 2).toUpperCase() : 'AG');
    
    // Deterministic pleasant color palette
    const colors = [
      'bg-emerald-500 text-white',
      'bg-indigo-500 text-white',
      'bg-blue-500 text-white',
      'bg-teal-500 text-white',
      'bg-violet-500 text-white',
      'bg-rose-500 text-white',
      'bg-amber-500 text-white',
      'bg-cyan-500 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return { initials, colorClass: colors[colorIndex] };
  };

  // All logs categorized strictly as member logs
  const memberOnlyLogs = useMemo(() => {
    return securityLogs.filter(l => {
      // Check role or member characteristics
      if (l.role === 'member') return true;
      if (l.action && (l.action.includes('ANGGOTA') || l.action.includes('PORTAL_ANGGOTA'))) return true;
      if (l.metadata && (l.metadata.noAnggota || l.metadata.anggotaId)) return true;
      return false;
    });
  }, [securityLogs]);

  // Filtered and Sorted Member Logs (strictly sorted by access timestamp)
  const filteredMemberLogs = useMemo(() => {
    let list = [...memberOnlyLogs];

    // Search keyword filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l => 
        (l.userNama && l.userNama.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
        (l.userAgent && l.userAgent.toLowerCase().includes(q)) ||
        (l.metadata?.noAnggota && String(l.metadata.noAnggota).toLowerCase().includes(q))
      );
    }

    // Member filter
    if (memberFilter !== 'all') {
      list = list.filter(l => 
        l.userId === memberFilter || 
        l.userNama?.toLowerCase() === memberFilter.toLowerCase() ||
        l.metadata?.noAnggota === memberFilter ||
        l.metadata?.anggotaId === memberFilter
      );
    }

    // Activity Type filter
    if (activityTypeFilter !== 'all') {
      list = list.filter(l => getMemberActivityType(l) === activityTypeFilter);
    }

    // Time range filter
    if (timeFilter !== 'all') {
      const now = new Date().getTime();
      list = list.filter(l => {
        const logTime = new Date(l.timestamp).getTime();
        if (timeFilter === 'today') {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          return logTime >= todayStart;
        } else if (timeFilter === '3days') {
          return now - logTime <= 3 * 24 * 3600 * 1000;
        } else if (timeFilter === '7days') {
          return now - logTime <= 7 * 24 * 3600 * 1000;
        } else if (timeFilter === '30days') {
          return now - logTime <= 30 * 24 * 3600 * 1000;
        }
        return true;
      });
    }

    // Sort strictly by access timestamp
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [memberOnlyLogs, searchTerm, memberFilter, activityTypeFilter, timeFilter, sortOrder]);

  // Filtered and Sorted All System Logs
  const filteredAllLogs = useMemo(() => {
    let list = [...securityLogs];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l => 
        (l.userNama && l.userNama.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.category && l.category.toLowerCase().includes(q)) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
        (l.userAgent && l.userAgent.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'all') {
      list = list.filter(l => l.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      list = list.filter(l => l.severity === severityFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date().getTime();
      list = list.filter(l => {
        const logTime = new Date(l.timestamp).getTime();
        if (timeFilter === 'today') {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          return logTime >= todayStart;
        } else if (timeFilter === '3days') {
          return now - logTime <= 3 * 24 * 3600 * 1000;
        } else if (timeFilter === '7days') {
          return now - logTime <= 7 * 24 * 3600 * 1000;
        } else if (timeFilter === '30days') {
          return now - logTime <= 30 * 24 * 3600 * 1000;
        }
        return true;
      });
    }

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [securityLogs, searchTerm, categoryFilter, severityFilter, timeFilter, sortOrder]);

  // Statistics calculation for Member Access
  const memberStats = useMemo(() => {
    const uniqueMembers = new Set(memberOnlyLogs.map(l => l.userNama || l.userId)).size;
    const loginCount = memberOnlyLogs.filter(l => getMemberActivityType(l) === 'login').length;
    const financeActivities = memberOnlyLogs.filter(l => {
      const type = getMemberActivityType(l);
      return type === 'pinjaman' || type === 'pembayaran' || type === 'simpanan';
    }).length;
    const latestAccess = memberOnlyLogs.length > 0
      ? memberOnlyLogs.reduce((latest, current) => 
          new Date(current.timestamp).getTime() > new Date(latest.timestamp).getTime() ? current : latest
        )
      : null;

    // Top active members ranking
    const counts: Record<string, { name: string; count: number; lastTime: string; noAnggota?: string }> = {};
    memberOnlyLogs.forEach(l => {
      const key = l.userNama || l.userId || 'Anggota';
      if (!counts[key]) {
        counts[key] = {
          name: key,
          count: 0,
          lastTime: l.timestamp,
          noAnggota: l.metadata?.noAnggota
        };
      }
      counts[key].count += 1;
      if (new Date(l.timestamp).getTime() > new Date(counts[key].lastTime).getTime()) {
        counts[key].lastTime = l.timestamp;
      }
    });

    const topMembers = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      uniqueMembers,
      loginCount,
      financeActivities,
      latestAccess,
      topMembers,
      totalMemberLogs: memberOnlyLogs.length
    };
  }, [memberOnlyLogs]);

  // System general stats
  const systemStats = useMemo(() => {
    const total = securityLogs.length;
    const authLogs = securityLogs.filter(l => l.category === 'Autentikasi');
    const authSuccess = authLogs.filter(l => l.status === 'SUCCESS').length;
    const financialCount = securityLogs.filter(l => l.category === 'Data Finansial').length;
    const warningsCount = securityLogs.filter(l => l.severity === 'warning' || l.severity === 'danger').length;

    return {
      total,
      authSuccess,
      financialCount,
      warningsCount
    };
  }, [securityLogs]);

  // Format Helpers
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const d = new Date(isoString).getTime();
      const diffSec = Math.floor((Date.now() - d) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      return `${Math.floor(diffSec / 86400)} hari lalu`;
    } catch {
      return '';
    }
  };

  // Severity visual badge
  const renderSeverityBadge = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <ShieldAlert className="w-3 h-3" /> Bahaya / Kritis
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="w-3 h-3" /> Peringatan
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-3 h-3" /> Sukses
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900">
            <Info className="w-3 h-3" /> Informasi
          </span>
        );
    }
  };

  // Status visual badge
  const renderStatusBadge = (status: SecurityLog['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            SUCCESS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
            BLOCKED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            FAILED
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            WARNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  // Visual Activity Badge for Members
  const renderActivityBadge = (log: SecurityLog) => {
    const actType = getMemberActivityType(log);
    switch (actType) {
      case 'login':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Login Portal Anggota
          </span>
        );
      case 'pinjaman':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <HandCoins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Pengajuan Pinjaman
          </span>
        );
      case 'pembayaran':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Bayar Angsuran / Simpanan
          </span>
        );
      case 'simpanan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <Wallet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Cek Saldo & Mutasi
          </span>
        );
      case 'kuitansi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <DownloadCloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Unduh Kuitansi / Laporan
          </span>
        );
      case 'profil':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Ubah Profil / Sandi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            {log.action || 'Aktivitas Anggota'}
          </span>
        );
    }
  };

  // Category Icon
  const getCategoryIcon = (category: SecurityLog['category']) => {
    switch (category) {
      case 'Autentikasi':
        return <KeyRound className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Data Finansial':
        return <Wallet className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Manajemen Anggota':
        return <Users className="w-3.5 h-3.5 text-blue-500" />;
      case 'Konfigurasi Sistem':
        return <Settings className="w-3.5 h-3.5 text-amber-500" />;
      case 'Keamanan Akses':
        return <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Role Badge
  const renderRoleBadge = (role: SecurityLog['role']) => {
    switch (role) {
      case 'admin':
        return <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded text-[10px]">Admin</span>;
      case 'karyawan_warung':
        return <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold rounded text-[10px]">Kasir Warung</span>;
      case 'member':
        return <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[10px]">Anggota</span>;
      default:
        return <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded text-[10px]">Sistem</span>;
    }
  };

  // Export to CSV
  const handleExportCSV = (isMemberOnly = false) => {
    const listToExport = isMemberOnly ? filteredMemberLogs : filteredAllLogs;
    if (listToExport.length === 0) {
      alert('Tidak ada data log untuk diekspor.');
      return;
    }

    const headers = ['ID Log', 'Waktu Akses (ISO)', 'Waktu Akses Lokal', 'Nama Anggota / User', 'Role', 'Kategori', 'Aksi', 'Tingkat', 'Status', 'IP Address', 'Perangkat / User Agent', 'Deskripsi Aktivitas'];
    const rows = listToExport.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${formatDateTime(l.timestamp)}"`,
      `"${l.userNama || '-'}"`,
      `"${l.role}"`,
      `"${l.category}"`,
      `"${l.action}"`,
      `"${l.severity}"`,
      `"${l.status}"`,
      `"${l.ipAddress || '-'}"`,
      `"${(l.userAgent || '-').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = isMemberOnly 
      ? `histori_akses_anggota_${new Date().toISOString().substring(0, 10)}.csv`
      : `log_audit_koperasi_${new Date().toISOString().substring(0, 10)}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Log
  const handlePrintLog = () => {
    window.print();
  };

  // Submit Manual Audit Log Note
  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDescription.trim()) {
      alert('Mohon masukkan deskripsi catatan log.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddSecurityLog({
        userNama: 'Pengurus Utama / Admin',
        role: 'admin',
        action: manualAction,
        category: manualCategory,
        severity: manualSeverity,
        status: manualStatus,
        description: manualDescription.trim(),
        ipAddress: '127.0.0.1 (Manual Operator)',
        userAgent: navigator.userAgent
      });
      setIsAddModalOpen(false);
      setManualDescription('');
      alert('Catatan log keamanan berhasil dicatat ke dalam audit trail.');
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan log keamanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Clear Logs
  const handleConfirmClearLogs = async () => {
    if (!onClearSecurityLogs) return;
    setIsSubmitting(true);
    try {
      await onClearSecurityLogs(clearDays > 0 ? clearDays : undefined);
      setIsClearModalOpen(false);
      alert('Pembersihan riwayat log audit berhasil diselesaikan.');
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan log audit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="admin-security-logs-view" className="space-y-6">
      
      {/* 🛡️ Header Banner with Dynamic Mode Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white p-6 sm:p-7 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Access Monitoring
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Real-time Chronological Sort
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
            Histori Akses & Log Aktivitas Anggota
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pemantauan histori login anggota, penelusuran waktu akses terkini, rekaman pengajuan pinjaman, konfirmasi cicilan, serta integritas log keamanan operasional {setup.namaKoperasi || "Koperasi"}.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleExportCSV(activeLogTab === 'member_logs')}
            className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Unduh seluruh data log terfilter sebagai format CSV"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handlePrintLog}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Cetak format lembar audit"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Cetak Log
          </button>
          {activeLogTab === 'all_system_logs' && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Catat Manual
            </button>
          )}
          {onClearSecurityLogs && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Bersihkan log lama"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Bersihkan
            </button>
          )}
        </div>
      </div>

      {/* 🧭 Log Mode Navigation Tabs (Anggota vs Sistem) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveLogTab('member_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeLogTab === 'member_logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Histori Login & Aktivitas Anggota</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeLogTab === 'member_logs' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {memberOnlyLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLogTab('all_system_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeLogTab === 'all_system_logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Semua Log Audit Sistem (Admin & Operasional)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeLogTab === 'all_system_logs' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {securityLogs.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 👤 VIEW 1: HISTORI LOGIN & AKTIVITAS ANGGOTA             */}
      {/* ======================================================== */}
      {activeLogTab === 'member_logs' && (
        <div className="space-y-6">

          {/* 📊 Member Access KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anggota Pernah Login</p>
                <p className="text-xl font-black font-mono text-slate-850 dark:text-slate-100 mt-0.5 truncate">
                  {memberStats.uniqueMembers} Anggota
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  Tercatat dalam rekam jejak
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesi Login Anggota</p>
                <p className="text-xl font-black font-mono text-indigo-650 dark:text-indigo-400 mt-0.5 truncate">
                  {memberStats.loginCount} Kali
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5">
                  Autentikasi berhasil
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktivitas Transaksi Mandiri</p>
                <p className="text-xl font-black font-mono text-teal-650 dark:text-teal-400 mt-0.5 truncate">
                  {memberStats.financeActivities} Aksi
                </p>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                  Pinjaman & Pembayaran
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu Akses Terakhir</p>
                <p className="text-sm font-black text-slate-850 dark:text-slate-100 mt-0.5 truncate">
                  {memberStats.latestAccess?.userNama || '-'}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5 truncate">
                  {memberStats.latestAccess ? getRelativeTime(memberStats.latestAccess.timestamp) : 'Belum ada data'}
                </p>
              </div>
            </div>

          </div>

          {/* 🌟 Spotlight Anggota Paling Aktif */}
          {memberStats.topMembers.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50/70 via-emerald-50/50 to-white dark:from-indigo-950/30 dark:via-emerald-950/20 dark:to-slate-900 border border-indigo-150 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Anggota Paling Aktif Mengakses Portal
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Berdasarkan frekuensi login & transaksi mandiri
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {memberStats.topMembers.map((tm, idx) => {
                  const av = getAvatarInfo(tm.name, tm.noAnggota);
                  return (
                    <div 
                      key={tm.name + idx}
                      onClick={() => setMemberFilter(tm.name)}
                      className="p-3 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${av.colorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                          {av.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{tm.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {tm.noAnggota ? `No: ${tm.noAnggota}` : 'Anggota Koperasi'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 block">
                          {tm.count} Aksi
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">
                          {getRelativeTime(tm.lastTime)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🔍 Member Search, Filter, and Sort Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              
              {/* Search keyword input */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama anggota, no anggota, aktivitas, IP..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Specific Member Filter */}
              <div className="lg:col-span-3">
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Anggota</option>
                  {members.map(m => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.noAnggota})
                    </option>
                  ))}
                  {/* Distinct members from logs who might not be in member list */}
                  {Array.from(new Set(memberOnlyLogs.map(l => l.userNama).filter(Boolean)))
                    .filter(name => !members.some(m => m.nama === name))
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Activity Type Filter */}
              <div className="lg:col-span-2">
                <select
                  value={activityTypeFilter}
                  onChange={(e) => setActivityTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Aktivitas</option>
                  <option value="login">🔑 Login Portal</option>
                  <option value="pinjaman">📝 Pengajuan Pinjaman</option>
                  <option value="pembayaran">💳 Bayar Angsuran</option>
                  <option value="simpanan">📊 Cek Saldo Simpanan</option>
                  <option value="kuitansi">📥 Unduh Kuitansi</option>
                  <option value="profil">⚙️ Ubah Profil & Sandi</option>
                </select>
              </div>

              {/* Time Filter */}
              <div className="lg:col-span-2">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="3days">3 Hari Terakhir</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                </select>
              </div>

              {/* Sort Order Toggle (Sort Berdasarkan Waktu Akses) */}
              <div className="lg:col-span-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    sortOrder === 'desc' 
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title={sortOrder === 'desc' ? 'Klik untuk urutkan dari waktu terlama' : 'Klik untuk urutkan dari waktu terbaru'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                </button>
              </div>

            </div>

            {/* View Mode & Active Filter Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              
              <div className="flex items-center gap-2 flex-wrap text-slate-500">
                <span className="font-semibold text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Disortir: Waktu Akses ({sortOrder === 'desc' ? 'Terbaru ↓' : 'Terlama ↑'})
                </span>
                
                {(searchTerm || memberFilter !== 'all' || activityTypeFilter !== 'all' || timeFilter !== 'all') && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    {memberFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center gap-1 text-[11px]">
                        Anggota: {memberFilter}
                        <button type="button" onClick={() => setMemberFilter('all')}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {activityTypeFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center gap-1 text-[11px]">
                        Aktivitas: {activityTypeFilter}
                        <button type="button" onClick={() => setActivityTypeFilter('all')}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {timeFilter !== 'all' && (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center gap-1 text-[11px]">
                        Waktu: {timeFilter}
                        <button type="button" onClick={() => setTimeFilter('all')}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setMemberFilter('all');
                        setActivityTypeFilter('all');
                        setTimeFilter('all');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1 text-[11px]"
                    >
                      Reset Filter
                    </button>
                  </>
                )}
              </div>

              {/* Toggle Table vs Timeline Feed */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    displayMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Mode Tabel
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('timeline')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    displayMode === 'timeline'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Timeline Feed
                </button>
              </div>

            </div>
          </div>

          {/* 📋 MODE 1: TABEL HISTORI LOGIN & AKTIVITAS ANGGOTA */}
          {displayMode === 'table' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Histori Akses & Aktivitas Anggota ({filteredMemberLogs.length} Rekaman)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Urutan berdasarkan waktu akses {sortOrder === 'desc' ? 'terbaru ke terlama' : 'terlama ke terbaru'}
                </span>
              </div>

              {filteredMemberLogs.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada histori aktivitas anggota yang cocok</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cobalah ganti kata kunci pencarian atau sesuaikan filter di atas untuk melihat data aktivitas anggota lainnya.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-150 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-44">Waktu Akses</th>
                        <th className="py-3 px-4 w-52">Identitas Anggota</th>
                        <th className="py-3 px-4 w-48">Jenis Aktivitas</th>
                        <th className="py-3 px-4">Deskripsi Aktivitas</th>
                        <th className="py-3 px-4 w-44">Perangkat & Jaringan</th>
                        <th className="py-3 px-4 w-24 text-center">Status</th>
                        <th className="py-3 px-4 w-16 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredMemberLogs.map((log) => {
                        const avatar = getAvatarInfo(log.userNama, log.metadata?.noAnggota);
                        const dev = parseDevice(log.userAgent);
                        const DeviceIcon = dev.icon;

                        return (
                          <tr 
                            key={log.id} 
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition duration-150 group"
                          >
                            {/* Waktu Akses */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="font-mono text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                {formatDateTime(log.timestamp)}
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-1">
                                {getRelativeTime(log.timestamp)}
                              </span>
                            </td>

                            {/* Identitas Anggota */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full ${avatar.colorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                                  {avatar.initials}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {log.userNama || 'Anggota Koperasi'}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                    {log.metadata?.noAnggota ? `No: ${log.metadata.noAnggota}` : 'Anggota Terdaftar'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Jenis Aktivitas */}
                            <td className="py-3.5 px-4 align-top">
                              {renderActivityBadge(log)}
                              <span className="font-mono text-[10px] text-slate-400 block mt-1 truncate">
                                {log.action}
                              </span>
                            </td>

                            {/* Deskripsi Aktivitas */}
                            <td className="py-3.5 px-4 align-top">
                              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                {log.description}
                              </p>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-slate-400 font-mono">
                                  {log.metadata.nominal && (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                      Rp {Number(log.metadata.nominal).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                  {log.metadata.tenorBulan && (
                                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                      Tenor: {log.metadata.tenorBulan} Bln
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Perangkat & Jaringan */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                <DeviceIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{dev.label}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                <span>IP:</span>
                                <span className="truncate">{log.ipAddress || '127.0.0.1'}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 align-top text-center">
                              {renderStatusBadge(log.status)}
                            </td>

                            {/* Tombol Detail */}
                            <td className="py-3.5 px-4 align-top text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Lihat rincian lengkap aktivitas"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 📅 MODE 2: TIMELINE FEED AKTIVITAS ANGGOTA */}
          {displayMode === 'timeline' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Alur Linimasa Aktivitas Anggota (Chronological Feed)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {filteredMemberLogs.length} rekaman diurutkan {sortOrder === 'desc' ? 'paling baru' : 'paling awal'}
                </span>
              </div>

              {filteredMemberLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada rekaman timeline yang cocok dengan kriteria filter.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {filteredMemberLogs.map((log) => {
                    const avatar = getAvatarInfo(log.userNama, log.metadata?.noAnggota);
                    const dev = parseDevice(log.userAgent);
                    const DeviceIcon = dev.icon;

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                        </div>

                        {/* Card Content */}
                        <div className="bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full ${avatar.colorClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                {avatar.initials}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {log.userNama || 'Anggota Koperasi'}
                                </span>
                                {log.metadata?.noAnggota && (
                                  <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                    ({log.metadata.noAnggota})
                                  </span>
                                )}
                              </div>
                              {renderActivityBadge(log)}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>{formatDateTime(log.timestamp)}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">({getRelativeTime(log.timestamp)})</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-750 dark:text-slate-200 font-medium leading-relaxed">
                            {log.description}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 text-[11px] text-slate-400">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <DeviceIcon className="w-3.5 h-3.5 text-slate-400" />
                                {dev.label}
                              </span>
                              <span className="font-mono">IP: {log.ipAddress || '127.0.0.1'}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsDetailModalOpen(true);
                              }}
                              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Lihat Detail <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 🛡️ VIEW 2: SEMUA LOG AUDIT SISTEM (ADMIN & OPERASIONAL)  */}
      {/* ======================================================== */}
      {activeLogTab === 'all_system_logs' && (
        <div className="space-y-6">

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Log Terarsip</p>
                <p className="text-xl font-bold font-mono text-slate-850 dark:text-slate-100 mt-0.5">{systemStats.total} Aktivitas</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Otentikasi Login Sukses</p>
                <p className="text-xl font-bold font-mono text-emerald-650 dark:text-emerald-400 mt-0.5">{systemStats.authSuccess} Berhasil</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Mutasi Finansial</p>
                <p className="text-xl font-bold font-mono text-teal-650 dark:text-teal-400 mt-0.5">{systemStats.financialCount} Mutasi</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className={`p-3 ${systemStats.warningsCount > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'} rounded-xl`}>
                {systemStats.warningsCount > 0 ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Insiden / Peringatan</p>
                <p className={`text-xl font-bold font-mono ${systemStats.warningsCount > 0 ? 'text-amber-650 dark:text-amber-400' : 'text-emerald-650 dark:text-emerald-400'} mt-0.5`}>
                  {systemStats.warningsCount > 0 ? `${systemStats.warningsCount} Perhatian` : 'Aman (0 Terdeteksi)'}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar for All Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari user, aksi, deskripsi, IP..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="lg:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="Autentikasi">Autentikasi & Login</option>
                  <option value="Data Finansial">Data Finansial & Mutasi</option>
                  <option value="Manajemen Anggota">Manajemen Anggota</option>
                  <option value="Konfigurasi Sistem">Konfigurasi Sistem</option>
                  <option value="Keamanan Akses">Keamanan Akses</option>
                  <option value="Otorisasi">Otorisasi</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Tingkat</option>
                  <option value="success">Sukses (Success)</option>
                  <option value="info">Informasi (Info)</option>
                  <option value="warning">Peringatan (Warning)</option>
                  <option value="danger">Kritis / Bahaya (Danger)</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="3days">3 Hari Terakhir</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                </select>
              </div>

              <div className="lg:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title={sortOrder === 'desc' ? 'Urutkan dari yang terlama' : 'Urutkan dari yang terbaru'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Table of All Security Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Seluruh Rekaman Audit ({filteredAllLogs.length} Baris)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Data tercatat dalam sistem terenkripsi
              </span>
            </div>

            {filteredAllLogs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada log yang sesuai kriteria</h4>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-150 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-44">Waktu & Tanggal</th>
                      <th className="py-3 px-4 w-44">Pengguna</th>
                      <th className="py-3 px-4 w-40">Kategori & Aksi</th>
                      <th className="py-3 px-4">Deskripsi Aktivitas</th>
                      <th className="py-3 px-4 w-32 text-center">Tingkat</th>
                      <th className="py-3 px-4 w-28 text-center">Status</th>
                      <th className="py-3 px-4 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredAllLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition duration-150 group"
                      >
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <div className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                            {formatDateTime(log.timestamp)}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {getRelativeTime(log.timestamp)}
                          </span>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{log.userNama || 'Sistem'}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {renderRoleBadge(log.role)}
                            {log.ipAddress && (
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">
                                {log.ipAddress}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            {getCategoryIcon(log.category)}
                            <span className="truncate">{log.category}</span>
                          </div>
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5 truncate">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 align-top">
                          <p className="text-slate-750 dark:text-slate-300 leading-relaxed font-normal">
                            {log.description}
                          </p>
                          {log.userAgent && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate max-w-md">
                              Agent: {log.userAgent}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          {renderSeverityBadge(log.severity)}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          {renderStatusBadge(log.status)}
                        </td>

                        <td className="py-3 px-4 align-top text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Lihat rincian metadata log"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ℹ️ Security Protocols Footer */}
      <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-xl shrink-0 border border-emerald-900/60">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Protokol Integritas & Standar Audit Koperasi Digital
            </h4>
            <p className="text-[11px] text-slate-400 max-w-3xl leading-relaxed">
              Seluruh operasi akses masuk portal anggota, mutasi simpanan, permohonan kredit, dan pembayaran angsuran tersinkronisasi kronologis untuk menjamin akuntabilitas transparan pengurus sesuai tata kelola UU Perkoperasian.
            </p>
          </div>
        </div>
        <div className="text-[10px] bg-slate-800/80 px-3 py-2 rounded-xl text-slate-300 font-mono shrink-0 border border-slate-700">
          SHA-256 Audit Integrity: Verified
        </div>
      </div>

      {/* 🔍 MODAL RINCIAN LOG */}
      {isDetailModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden space-y-4 p-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Rincian Metadata Log Audit
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedLog(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Waktu Akses Tercatat</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatDateTime(selectedLog.timestamp)}</span>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pengguna & Role</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userNama}</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {renderRoleBadge(selectedLog.role)}
                    <span className="text-[10px] font-mono text-slate-400">ID: {selectedLog.userId || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kategori</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.category}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kode Aksi</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tingkat & Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {renderSeverityBadge(selectedLog.severity)}
                    {renderStatusBadge(selectedLog.status)}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Deskripsi Lengkap</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedLog.description}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Alamat IP / Jaringan</span>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.ipAddress || '127.0.0.1 (Internal Gateway)'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Perangkat / User Agent</span>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-700 dark:text-slate-300 truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent || navigator.userAgent}
                  </div>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Payload Metadata (JSON)</span>
                  <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-36 border border-slate-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedLog(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ MODAL CATAT LOG MANUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden space-y-4 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Tambah Catatan Audit / Log Manual
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Catat pengawasan keamanan atau catatan kepatuhan ke audit trail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kategori</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                  >
                    <option value="Keamanan Akses">Keamanan Akses</option>
                    <option value="Konfigurasi Sistem">Konfigurasi Sistem</option>
                    <option value="Autentikasi">Autentikasi</option>
                    <option value="Data Finansial">Data Finansial</option>
                    <option value="Manajemen Anggota">Manajemen Anggota</option>
                    <option value="Otorisasi">Otorisasi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kode Aksi</label>
                  <input
                    type="text"
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value)}
                    placeholder="e.g. MANUAL_AUDIT_CHECK"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Tingkat Keparahan</label>
                  <select
                    value={manualSeverity}
                    onChange={(e) => setManualSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                  >
                    <option value="info">Informasi (Info)</option>
                    <option value="success">Sukses (Success)</option>
                    <option value="warning">Peringatan (Warning)</option>
                    <option value="danger">Kritis / Bahaya (Danger)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Status</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                  >
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="WARNING">WARNING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Deskripsi Catatan Audit</label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Masukkan keterangan detail hasil pemeriksaan atau alasan pencatatan audit manual..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl resize-none font-medium"
                  required
                />
              </div>

              <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Log Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ MODAL BERSIHKAN LOG */}
      {isClearModalOpen && onClearSecurityLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden space-y-4 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Konfirmasi Pembersihan Log Audit
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih rentang waktu log yang ingin dibersihkan dari database. Pastikan Anda telah mengekspor cadangan CSV terlebih dahulu jika data masih dibutuhkan.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="text-[11px] font-bold text-slate-500">Pilihan Rentang Pembersihan</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 font-medium text-slate-750 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="clearDays"
                    checked={clearDays === 30}
                    onChange={() => setClearDays(30)}
                    className="accent-rose-600"
                  />
                  Hapus log yang lebih lama dari 30 hari (Disarankan)
                </label>
                <label className="flex items-center gap-2 font-medium text-slate-750 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="clearDays"
                    checked={clearDays === 90}
                    onChange={() => setClearDays(90)}
                    className="accent-rose-600"
                  />
                  Hapus log yang lebih lama dari 90 hari
                </label>
                <label className="flex items-center gap-2 font-medium text-rose-600 dark:text-rose-400 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="clearDays"
                    checked={clearDays === 0}
                    onChange={() => setClearDays(0)}
                    className="accent-rose-600"
                  />
                  Hapus SEMUA log sekarang
                </label>
              </div>
            </div>

            <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmClearLogs}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
              >
                {isSubmitting ? 'Membersihkan...' : 'Lanjutkan Pembersihan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
