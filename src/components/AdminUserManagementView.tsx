import React, { useState, useMemo } from 'react';
import { UserAccount, Member, KoperasiSetup } from '../types';
import { 
  KeyRound, Shield, UserCheck, Plus, Trash2, Edit3, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Search, UserPlus, Lock, RefreshCw, Sparkles, Building2,
  FileSpreadsheet, FileText, Copy, Printer, Users, Download, Zap, Check, X,
  AlertTriangle, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel, exportToPDF, sortMembersNaturally } from '../utils/finance';

interface AdminUserManagementViewProps {
  setup: KoperasiSetup;
  userAccounts: UserAccount[];
  currentUserAccount?: UserAccount | null;
  members: Member[];
  onAddUserAccount: (account: Omit<UserAccount, 'id'>) => Promise<void>;
  onBatchAddUserAccounts?: (accountsToCreate: Omit<UserAccount, 'id'>[], accountsToUpdate: UserAccount[]) => Promise<void>;
  onUpdateUserAccount: (account: UserAccount) => Promise<void>;
  onDeleteUserAccount: (id: string) => Promise<void>;
  onDeleteAllNonAdminUsers?: () => Promise<void>;
}

export function AdminUserManagementView({
  setup,
  userAccounts,
  currentUserAccount,
  members,
  onAddUserAccount,
  onBatchAddUserAccounts,
  onUpdateUserAccount,
  onDeleteUserAccount,
  onDeleteAllNonAdminUsers
}: AdminUserManagementViewProps) {
  // Admin password change states
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  const [showAdminConfirmPass, setShowAdminConfirmPass] = useState(false);
  const [adminPassMsg, setAdminPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingAdminPass, setIsUpdatingAdminPass] = useState(false);

  // Active admin account detection
  const activeAdminAccount = useMemo(() => {
    if (currentUserAccount) {
      const found = userAccounts.find(u => 
        (u.id && u.id === currentUserAccount.id) || 
        (u.username && u.username.toLowerCase() === currentUserAccount.username.toLowerCase())
      );
      if (found) return found;
    }
    return userAccounts.find(u => u.username.toLowerCase() === 'admin') 
      || userAccounts.find(u => u.role === 'admin') 
      || null;
  }, [currentUserAccount, userAccounts]);

  // User Accounts Management states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'member' | 'pengawas' | 'karyawan_warung' | 'admin' | 'all'>('member');
  const [showPasswords, setShowPasswords] = useState<{ [id: string]: boolean }>({});

  // Single Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Batch Generate Modal states
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchUsernameMode, setBatchUsernameMode] = useState<'noAnggota' | 'noHp'>('noAnggota');
  const [batchPasswordMode, setBatchPasswordMode] = useState<'fixed' | 'pin6' | 'sameAsUsername' | 'noHpLast6'>('fixed');
  const [batchFixedPassword, setBatchFixedPassword] = useState('123456');
  const [batchTargetOption, setBatchTargetOption] = useState<'unregistered' | 'all'>('unregistered');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState('');

  // Delete All Non-Admin Users Modal state
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSuccessToast, setDeleteSuccessToast] = useState('');

  // Print Cards Modal State
  const [isPrintCardsModalOpen, setIsPrintCardsModalOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  // Form states
  const [formRole, setFormRole] = useState<'admin' | 'pengawas' | 'karyawan_warung' | 'member'>('admin');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPosisiJabatan, setFormPosisiJabatan] = useState('Staff Pengurus');
  const [formAnggotaId, setFormAnggotaId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Quick password change for main admin
  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassMsg(null);

    if (!adminNewPass || adminNewPass.trim().length < 4) {
      setAdminPassMsg({ type: 'error', text: 'Password baru minimal 4 karakter!' });
      return;
    }

    if (adminNewPass !== adminConfirmPass) {
      setAdminPassMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }

    setIsUpdatingAdminPass(true);
    try {
      if (activeAdminAccount) {
        await onUpdateUserAccount({
          ...activeAdminAccount,
          password: adminNewPass.trim()
        });
      } else {
        await onAddUserAccount({
          username: 'admin',
          password: adminNewPass.trim(),
          role: 'admin',
          nama: 'Pengurus Utama / Admin',
          posisiJabatan: 'Ketua & System Admin',
          isActive: true,
          createdAt: new Date().toISOString().substring(0, 10)
        });
      }

      const targetName = activeAdminAccount?.username || 'admin';
      setAdminPassMsg({ 
        type: 'success', 
        text: `Password akun "${targetName}" berhasil diperbarui! Silakan gunakan password baru ini untuk login berikutnya.` 
      });
      setAdminCurrentPass('');
      setAdminNewPass('');
      setAdminConfirmPass('');
    } catch (err) {
      console.error("Gagal memperbarui password admin:", err);
      setAdminPassMsg({ type: 'error', text: 'Gagal memperbarui password admin. Silakan coba lagi.' });
    } finally {
      setIsUpdatingAdminPass(false);
    }
  };

  // Toggle password visibility in table
  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Open modal for new user
  const handleOpenNewModal = () => {
    setEditingUser(null);
    setFormRole('admin');
    setFormUsername('');
    setFormPassword('');
    setFormNama('');
    setFormPosisiJabatan('Pengurus / Pengawas');
    setFormAnggotaId('');
    setFormIsActive(true);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Open modal for edit user
  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFormRole(user.role);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormNama(user.nama);
    setFormPosisiJabatan(user.posisiJabatan || (user.role === 'admin' ? 'Pengurus' : 'Anggota'));
    setFormAnggotaId(user.anggotaId || '');
    setFormIsActive(user.isActive);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Submit form handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formUsername.trim()) {
      setFormError('Username wajib diisi!');
      return;
    }
    if (!formPassword.trim()) {
      setFormError('Password wajib diisi!');
      return;
    }
    if (!formNama.trim()) {
      setFormError('Nama Pengguna wajib diisi!');
      return;
    }

    // Check duplicate username if adding or changing username
    const exists = userAccounts.some(u => 
      u.username.trim().toLowerCase() === formUsername.trim().toLowerCase() &&
      (!editingUser || u.id !== editingUser.id)
    );
    if (exists) {
      setFormError('Username tersebut sudah digunakan oleh akun lain. Gunakan username unik.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (editingUser) {
        await onUpdateUserAccount({
          ...editingUser,
          role: formRole,
          username: formUsername.trim(),
          password: formPassword,
          nama: formNama.trim(),
          posisiJabatan: formPosisiJabatan.trim(),
          anggotaId: formRole === 'member' ? (formAnggotaId || undefined) : undefined,
          isActive: formIsActive
        });
        setFormSuccess('Akun pengguna berhasil diperbarui!');
      } else {
        await onAddUserAccount({
          role: formRole,
          username: formUsername.trim(),
          password: formPassword,
          nama: formNama.trim(),
          posisiJabatan: formPosisiJabatan.trim(),
          anggotaId: formRole === 'member' ? (formAnggotaId || undefined) : undefined,
          isActive: formIsActive,
          createdAt: new Date().toISOString().substring(0, 10)
        });
        setFormSuccess('Akun pengguna baru berhasil ditambahkan!');
      }

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setFormError('Terjadi kesalahan saat menyimpan data akun.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete user account
  const handleDeleteUser = async (user: UserAccount) => {
    if (user.username === 'admin') {
      alert('Akun admin utama sistem tidak boleh dihapus.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun user login "${user.username}" (${user.nama})?`)) {
      try {
        await onDeleteUserAccount(user.id);
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus akun.');
      }
    }
  };

  // Batch Generate User Accounts for All Members
  const handleBatchGenerateLogins = async () => {
    if (members.length === 0) {
      alert("Belum ada data anggota terdaftar. Tambahkan anggota terlebih dahulu di Menu Data Anggota.");
      return;
    }

    setIsBatchGenerating(true);
    setBatchSuccessMsg('');

    try {
      const accountsToCreate: Omit<UserAccount, 'id'>[] = [];
      const accountsToUpdate: UserAccount[] = [];
      let skippedCount = 0;

      for (const m of members) {
        // Determine Username
        let uname = m.noAnggota;
        if (batchUsernameMode === 'noHp' && m.noHp) {
          uname = m.noHp.replace(/\D/g, '');
        }
        if (!uname) uname = m.noAnggota;

        // Determine Password
        let pwd = batchFixedPassword.trim() || '123456';
        if (batchPasswordMode === 'pin6') {
          pwd = Math.floor(100000 + Math.random() * 900000).toString();
        } else if (batchPasswordMode === 'sameAsUsername') {
          pwd = uname;
        } else if (batchPasswordMode === 'noHpLast6') {
          const cleanHp = (m.noHp || '').replace(/\D/g, '');
          pwd = cleanHp.length >= 6 ? cleanHp.slice(-6) : '123456';
        }

        // Check if user account already exists for this member
        const existingAcc = userAccounts.find(u => u.anggotaId === m.id || u.username.toLowerCase() === uname.toLowerCase());

        if (existingAcc) {
          if (batchTargetOption === 'all') {
            accountsToUpdate.push({
              ...existingAcc,
              username: uname,
              password: pwd,
              nama: m.nama,
              anggotaId: m.id,
              role: 'member',
              posisiJabatan: 'Anggota',
              isActive: true
            });
          } else {
            skippedCount++;
          }
        } else {
          accountsToCreate.push({
            username: uname,
            password: pwd,
            nama: m.nama,
            role: 'member',
            posisiJabatan: 'Anggota',
            anggotaId: m.id,
            isActive: true,
            createdAt: new Date().toISOString().substring(0, 10)
          });
        }
      }

      if (onBatchAddUserAccounts) {
        await onBatchAddUserAccounts(accountsToCreate, accountsToUpdate);
      } else {
        // Fallback
        for (const upd of accountsToUpdate) {
          await onUpdateUserAccount(upd);
        }
        for (const crt of accountsToCreate) {
          await onAddUserAccount(crt);
        }
      }

      setBatchSuccessMsg(`Proses pembuatan selesai! ${accountsToCreate.length} akun baru dibuat, ${accountsToUpdate.length} akun diperbarui, ${skippedCount} akun dilewati.`);
    } catch (err) {
      console.error("Gagal generate user accounts batch:", err);
      alert("Terjadi kesalahan saat membuat akun user login.");
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Export User Logins to Excel
  const handleExportExcelLogins = () => {
    const memberUsers = userAccounts.filter(u => u.role === 'member');
    if (memberUsers.length === 0) {
      alert("Belum ada akun login anggota yang terdaftar. Silakan buat/generate terlebih dahulu.");
      return;
    }

    const dataToExport = memberUsers.map((u, idx) => {
      const member = members.find(m => m.id === u.anggotaId);
      return {
        'No': idx + 1,
        'No. Anggota': member?.noAnggota || u.username,
        'Nama Anggota': u.nama,
        'No. Handphone': member?.noHp || '-',
        'Username Login': u.username,
        'Password Login': u.password,
        'Status Akun': u.isActive ? 'Aktif' : 'Nonaktif',
        'Tanggal Dibuat': u.createdAt || '-'
      };
    });

    exportToExcel(
      dataToExport,
      "User Login Anggota",
      `Daftar_User_Login_Anggota_${setup.namaKoperasi.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}`,
      setup
    );
  };

  // Export User Logins to PDF
  const handleExportPDFLogins = () => {
    const memberUsers = userAccounts.filter(u => u.role === 'member');
    if (memberUsers.length === 0) {
      alert("Belum ada akun login anggota yang terdaftar.");
      return;
    }

    const columns = ['No', 'No. Anggota', 'Nama Anggota', 'No. HP', 'Username', 'Password', 'Status'];
    const rows = memberUsers.map((u, idx) => {
      const member = members.find(m => m.id === u.anggotaId);
      return [
        idx + 1,
        member?.noAnggota || u.username,
        u.nama,
        member?.noHp || '-',
        u.username,
        u.password,
        u.isActive ? 'Aktif' : 'Nonaktif'
      ];
    });

    exportToPDF(
      "DAFTAR KREDENSIAL USER LOGIN ANGGOTA",
      `Ringkasan Akses Login Portal Mandiri Anggota ${setup.namaKoperasi}`,
      columns,
      rows,
      `Daftar_User_Login_Anggota_${new Date().toISOString().substring(0, 10)}`,
      [{ label: 'Total Akun Login Anggota', value: `${memberUsers.length} Akun` }],
      setup
    );
  };

  // Copy Format to Clipboard
  const handleCopyClipboardLogins = () => {
    const memberUsers = userAccounts.filter(u => u.role === 'member');
    if (memberUsers.length === 0) {
      alert("Belum ada akun login anggota yang terdaftar.");
      return;
    }

    let text = `=========================================\n`;
    text += `DAFTAR USER LOGIN PORTAL ANGGOTA KOPERASI\n`;
    text += `${setup.namaKoperasi.toUpperCase()}\n`;
    text += `=========================================\n\n`;

    memberUsers.forEach((u, idx) => {
      const member = members.find(m => m.id === u.anggotaId);
      text += `${idx + 1}. ${u.nama}\n`;
      text += `   • No. Anggota : ${member?.noAnggota || u.username}\n`;
      text += `   • Username    : ${u.username}\n`;
      text += `   • Password    : ${u.password}\n`;
      text += `   • Status      : ${u.isActive ? 'Aktif' : 'Nonaktif'}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  // Non-admin & Admin users calculations
  const nonAdminUsers = useMemo(() => {
    return userAccounts.filter(u => u.role !== 'admin' && u.username.toLowerCase() !== 'admin');
  }, [userAccounts]);

  const adminUsers = useMemo(() => {
    return userAccounts.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin');
  }, [userAccounts]);

  // Handle Confirm Delete All Non-Admin Users
  const handleConfirmDeleteAllNonAdmin = async () => {
    if (nonAdminUsers.length === 0) {
      alert("Tidak ada akun user (non-admin) yang dapat dihapus.");
      setIsDeleteAllModalOpen(false);
      return;
    }

    setIsDeletingAll(true);
    try {
      if (onDeleteAllNonAdminUsers) {
        await onDeleteAllNonAdminUsers();
      } else {
        for (const u of nonAdminUsers) {
          await onDeleteUserAccount(u.id);
        }
      }
      setDeleteSuccessToast(`Berhasil menghapus ${nonAdminUsers.length} akun user anggota! Akun pengurus/admin tetap aman.`);
      setIsDeleteAllModalOpen(false);
      setDeleteConfirmText('');
      setTimeout(() => setDeleteSuccessToast(''), 4500);
    } catch (err) {
      console.error("Gagal menghapus akun user non-admin:", err);
      alert("Terjadi kesalahan saat menghapus akun user.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter & sort user accounts
  const filteredUsers = useMemo(() => {
    return userAccounts
      .filter(u => {
        const matchSearch = 
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.posisiJabatan && u.posisiJabatan.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchRole = roleFilter === 'all' || u.role === roleFilter;

        return matchSearch && matchRole;
      })
      .sort((a, b) => {
        if (a.role === 'member' && b.role !== 'member') return -1;
        if (a.role !== 'member' && b.role === 'member') return 1;
        if (a.role === 'pengawas' && b.role === 'admin') return -1;
        if (a.role === 'admin' && b.role === 'pengawas') return 1;
        if (a.role === 'karyawan_warung' && (b.role === 'admin' || b.role === 'pengawas')) return -1;
        if ((a.role === 'admin' || a.role === 'pengawas') && b.role === 'karyawan_warung') return 1;
        return a.nama.localeCompare(b.nama);
      });
  }, [userAccounts, searchTerm, roleFilter]);

  // Stat calculations
  const adminCount = useMemo(() => userAccounts.filter(u => u.role === 'admin').length, [userAccounts]);
  const pengawasCount = useMemo(() => userAccounts.filter(u => u.role === 'pengawas').length, [userAccounts]);
  const warungCount = useMemo(() => userAccounts.filter(u => u.role === 'karyawan_warung').length, [userAccounts]);
  const memberCount = useMemo(() => userAccounts.filter(u => u.role === 'member').length, [userAccounts]);
  const activeCount = useMemo(() => userAccounts.filter(u => u.isActive).length, [userAccounts]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Otorisasi & Kredensial Pengguna
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Pengaturan Akun & Hak Akses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Kelola kredensial login, hak akses pengurus (Ketua, Sekretaris, Bendahara, Pengawas), kasir warung, serta akun portal mandiri anggota koperasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBatchSuccessMsg('');
                setIsBatchModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Generate Akun Anggota</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Akun</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">{userAccounts.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pengurus / Admin</p>
            <p className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">{adminCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kasir Warung</p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">{warungCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Portal Anggota</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{memberCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Password Change Form for Main Admin */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Ganti Password Admin Saat Ini
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Ubah kata sandi login utama untuk akun pengurus/admin yang sedang aktif.
              </p>
            </div>

            {/* Current Active Account Card */}
            <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0 border border-purple-200 dark:border-purple-800">
                {activeAdminAccount?.nama ? activeAdminAccount.nama.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">
                    {activeAdminAccount?.nama || 'Admin Utama'}
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  @{activeAdminAccount?.username || 'admin'}
                </span>
              </div>
            </div>

            {adminPassMsg && (
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                adminPassMsg.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
              }`}>
                {adminPassMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
                <span className="leading-relaxed">{adminPassMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAdminPasswordChange} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 dark:text-slate-400">Password Baru</label>
                <div className="relative">
                  <input
                    type={showAdminNewPass ? "text" : "password"}
                    required
                    value={adminNewPass}
                    onChange={(e) => setAdminNewPass(e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminNewPass(prev => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title={showAdminNewPass ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showAdminNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 dark:text-slate-400">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showAdminConfirmPass ? "text" : "password"}
                    required
                    value={adminConfirmPass}
                    onChange={(e) => setAdminConfirmPass(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminConfirmPass(prev => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title={showAdminConfirmPass ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showAdminConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingAdminPass}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50 text-xs mt-4"
              >
                {isUpdatingAdminPass ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Simpan Perubahan Password</span>
              </button>
            </form>
          </div>
        </div>

        {/* User Accounts List Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Daftar Akun Login Koperasi
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-mono">
                  {filteredUsers.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola hak akses & kredensial login seluruh pengguna.
              </p>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcelLogins}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Ekspor Seluruh User Login ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDFLogins}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Ekspor Seluruh User Login ke PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleCopyClipboardLogins}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Salin Seluruh Kredensial Login"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Salin</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintCardsModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Cetak Kartu Akses Login Anggota"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, username, atau posisi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="member">Akun Anggota Koperasi ({memberCount})</option>
                <option value="pengawas">Badan Pengawas ({pengawasCount})</option>
                <option value="karyawan_warung">Kasir Warung ({warungCount})</option>
                <option value="admin">Pengurus / Admin ({adminCount})</option>
                <option value="all">Semua Akun ({userAccounts.length})</option>
              </select>

              {nonAdminUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setIsDeleteAllModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Reset/Hapus seluruh akun login anggota (Akun admin tetap aman)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset User</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto text-xs border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-2.5 px-3.5">Akun Pengguna</th>
                  <th className="py-2.5 px-3">Jabatan / Posisi</th>
                  <th className="py-2.5 px-3">Hak Akses</th>
                  <th className="py-2.5 px-3">Password</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      Tidak ada akun pengguna yang sesuai dengan kriteria pencarian/filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isVisible = showPasswords[u.id] || false;
                    const isCurrentUser = activeAdminAccount && (activeAdminAccount.id === u.id || activeAdminAccount.username.toLowerCase() === u.username.toLowerCase());
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              u.role === 'admin' 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : u.role === 'pengawas'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : u.role === 'karyawan_warung'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {u.nama ? u.nama.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {u.nama}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  @{u.username}
                                </span>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-[10px] text-slate-400">
                                  {u.isActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-medium inline-block">
                            {u.posisiJabatan || (u.role === 'admin' ? 'Pengurus' : u.role === 'pengawas' ? 'Pengawas Koperasi' : u.role === 'karyawan_warung' ? 'Kasir Warung' : 'Anggota')}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'admin' 
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                              : u.role === 'pengawas'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              : u.role === 'karyawan_warung'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {u.role === 'admin' ? 'Pengurus / Admin' : u.role === 'pengawas' ? 'Pengawas (Read-Only)' : u.role === 'karyawan_warung' ? 'Kasir Warung' : 'Anggota'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                              {isVisible ? u.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(u.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                              title={isVisible ? "Sembunyikan" : "Tampilkan"}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 bg-slate-50 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-200/80 dark:border-slate-700"
                              title="Edit Akun & Password"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.role === 'admin' && userAccounts.filter(x => x.role === 'admin').length <= 1}
                              className="p-1.5 bg-slate-50 text-slate-600 hover:text-rose-700 hover:bg-rose-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer border border-slate-200/80 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.role === 'admin' && userAccounts.filter(x => x.role === 'admin').length <= 1 ? "Admin utama tidak dapat dihapus" : "Hapus Akun"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL TAMBAH / EDIT USER LOGIN */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  {editingUser ? 'Edit User Login & Password' : 'Tambah User Login Baru'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-extrabold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Hak Akses / Peran Sistem</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole('admin');
                        if (formPosisiJabatan === 'Kasir Warung' || formPosisiJabatan === 'Pengawas Koperasi') setFormPosisiJabatan('Staff Pengurus');
                      }}
                      className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        formRole === 'admin'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Pengurus / Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole('pengawas');
                        setFormPosisiJabatan('Pengawas Koperasi');
                      }}
                      className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        formRole === 'pengawas'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Pengawas (Read-Only)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole('karyawan_warung');
                        setFormPosisiJabatan('Kasir Warung');
                      }}
                      className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        formRole === 'karyawan_warung'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Karyawan Warung
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole('member');
                        if (formPosisiJabatan === 'Kasir Warung' || formPosisiJabatan === 'Pengawas Koperasi') setFormPosisiJabatan('Anggota Koperasi');
                      }}
                      className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                        formRole === 'member'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      Anggota Koperasi
                    </button>
                  </div>
                </div>

                {formRole === 'pengawas' && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Akun Pengawas Koperasi memiliki hak akses pengawasan khusus (Hanya Lihat / Read-Only): Hanya dapat membuka menu Beranda dan Laporan Keuangan, tanpa izin untuk menambah, mengedit, atau menghapus data koperasi.</span>
                  </div>
                )}

                {formRole === 'karyawan_warung' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Akun Karyawan Warung hanya memiliki hak akses terbatas ke Menu Pendapatan dan Beban (serta Unit Usaha Warung) tanpa melihat/mengedit simpan pinjam anggota atau laporan keuangan pengurus.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Nama Lengkap Pengguna</label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Bpk. H. Ahmad Dahlan"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Posisi / Jabatan Kustom</label>
                  <input
                    type="text"
                    required
                    value={formPosisiJabatan}
                    onChange={(e) => setFormPosisiJabatan(e.target.value)}
                    placeholder="Contoh: Ketua, Bendahara, Kasir Warung, Staff..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(formRole === 'karyawan_warung'
                      ? ['Kasir Warung', 'Karyawan Toko', 'Petugas Penjualan', 'Admin Operasional Warung']
                      : ['Ketua Koperasi', 'Bendahara', 'Sekretaris', 'Kasir Utama', 'Pengawas', 'Staff', 'Anggota']
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormPosisiJabatan(preset)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300 transition"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {formRole === 'member' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Hubungkan dengan Anggota Terdaftar</label>
                    <select
                      value={formAnggotaId}
                      onChange={(e) => {
                        setFormAnggotaId(e.target.value);
                        const sel = members.find(m => m.id === e.target.value);
                        if (sel && !formNama) setFormNama(sel.nama);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Pilih Anggota (Opsional) --</option>
                      {sortMembersNaturally(members).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nama} ({m.noAnggota}) - {m.noHp}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Username Login</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Username..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Password Login</label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Password..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="user-active-toggle"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="user-active-toggle" className="font-bold text-slate-700 dark:text-slate-300">
                    Akun Login Aktif (Dapat digunakan untuk masuk portal)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                  >
                    {isSubmittingForm ? 'Menyimpan...' : 'Simpan Akun Login'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GENERATE USER LOGIN SEMUA ANGGOTA BATCH */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-2xl">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-850 dark:text-slate-100">
                      Generate User Login Otomatis (Semua Anggota)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Buat username & PIN/password sekaligus untuk seluruh anggota terdaftar.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-extrabold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Ringkasan */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Anggota</p>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{members.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Sudah Ada Akun</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {userAccounts.filter(u => u.role === 'member' && u.anggotaId).length}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Belum Memiliki Akun</p>
                  <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {members.filter(m => !userAccounts.some(u => u.anggotaId === m.id || u.username === m.noAnggota)).length}
                  </p>
                </div>
              </div>

              {batchSuccessMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-3">
                  <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{batchSuccessMsg}</span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800 flex flex-wrap gap-2">
                    <button
                      onClick={handleExportExcelLogins}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Download Excel Credentials</span>
                    </button>
                    <button
                      onClick={handleExportPDFLogins}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download PDF Report</span>
                    </button>
                    <button
                      onClick={handleCopyClipboardLogins}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kredensial WA</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Format Username */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Format Username Login</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBatchUsernameMode('noAnggota')}
                      className={`p-3 rounded-2xl border text-left font-bold transition cursor-pointer ${
                        batchUsernameMode === 'noAnggota'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-400/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-xs font-black">Nomor Anggota</p>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Contoh: ANG-001, ANG-002</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchUsernameMode('noHp')}
                      className={`p-3 rounded-2xl border text-left font-bold transition cursor-pointer ${
                        batchUsernameMode === 'noHp'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-400/20'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-xs font-black">Nomor HP Anggota</p>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Contoh: 08123456789</p>
                    </button>
                  </div>
                </div>

                {/* Format Password */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Format Password / PIN Initial</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchPasswordMode('fixed')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        batchPasswordMode === 'fixed'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-800 dark:text-indigo-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-[11px] font-bold">Password Default Sama</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Misal: 123456 (Dapat diganti)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchPasswordMode('pin6')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        batchPasswordMode === 'pin6'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-800 dark:text-indigo-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-[11px] font-bold">PIN 6-Digit Acak</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Acak PIN unik per anggota</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchPasswordMode('sameAsUsername')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        batchPasswordMode === 'sameAsUsername'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-800 dark:text-indigo-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-[11px] font-bold">Sama dengan Username</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Password = Username</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchPasswordMode('noHpLast6')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        batchPasswordMode === 'noHpLast6'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-800 dark:text-indigo-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      <p className="text-[11px] font-bold">6 Digit Terakhir No HP</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Mudah diingat anggota</p>
                    </button>
                  </div>

                  {batchPasswordMode === 'fixed' && (
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-500">Masukkan Custom Password Fixed:</label>
                      <input
                        type="text"
                        value={batchFixedPassword}
                        onChange={(e) => setBatchFixedPassword(e.target.value)}
                        placeholder="Contoh: 123456 atau 010203"
                        className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* Target Scope Option */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-extrabold text-slate-700 dark:text-slate-300">Cakupan Pembuatan</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="targetOpt"
                        checked={batchTargetOption === 'unregistered'}
                        onChange={() => setBatchTargetOption('unregistered')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Hanya Anggota Belum Punya Akun (Aman)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="targetOpt"
                        checked={batchTargetOption === 'all'}
                        onChange={() => setBatchTargetOption('all')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Semua Anggota (Reset Akun Lama)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleBatchGenerateLogins}
                  disabled={isBatchGenerating}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBatchGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Generate...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Mulai Generate Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CETAK KARTU AKSES LOGIN ANGGOTA */}
      <AnimatePresence>
        {isPrintCardsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-850 dark:text-slate-100">
                    Kartu Akses Login Portal Anggota ({userAccounts.filter(u => u.role === 'member').length} Anggota)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Sekarang</span>
                  </button>
                  <button 
                    onClick={() => setIsPrintCardsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-extrabold"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Grid of Access Slips */}
              <div className="overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border">
                {userAccounts.filter(u => u.role === 'member').length === 0 ? (
                  <p className="text-center text-slate-400 py-10 font-bold">
                    Belum ada akun login anggota yang terdaftar. Gunakan fitur "Generate Login Semua Anggota".
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userAccounts.filter(u => u.role === 'member').map((u) => {
                      const member = members.find(m => m.id === u.anggotaId);
                      return (
                        <div key={u.id} className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 p-4 rounded-2xl shadow-xs space-y-3 relative">
                          <div className="flex justify-between items-start border-b dark:border-slate-800 pb-2">
                            <div>
                              <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                {setup.namaKoperasi}
                              </p>
                              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5">
                                KARTU AKSES PORTAL ANGGOTA
                              </h4>
                            </div>
                            <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200">
                              {member?.noAnggota || u.username}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Anggota</p>
                              <p className="font-extrabold text-slate-800 dark:text-slate-100">{u.nama}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 font-mono">
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-sans font-bold">Username</p>
                                <p className="font-black text-indigo-700 dark:text-indigo-300">{u.username}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-sans font-bold">Password / PIN</p>
                                <p className="font-black text-emerald-700 dark:text-emerald-300">{u.password}</p>
                              </div>
                            </div>
                          </div>

                          <p className="text-[9px] text-slate-400 italic text-center border-t dark:border-slate-800 pt-2">
                            Simpan kredensial ini secara rahasia. Gunakan untuk login ke Portal Anggota.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy Toast Alert */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Seluruh kredensial login anggota berhasil disalin ke clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Success Toast */}
      <AnimatePresence>
        {deleteSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-rose-950 border border-rose-700 text-rose-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-rose-400" />
            <span>{deleteSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus Semua User (Kecuali Admin) */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                    Tindakan Keamanan & Reset User
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    Hapus Semua User Login Anggota?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Fitur ini akan menghapus seluruh akun login anggota biasa, sedangkan akun Admin & Pengurus akan <strong>tetap 100% aman dan dipertahankan</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  disabled={isDeletingAll}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scope Breakdown */}
              <div className="space-y-3">
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-800 dark:text-rose-300">
                    <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Akun yang akan dihapus ({nonAdminUsers.length} Akun):</span>
                  </div>
                  <ul className="text-[11px] text-rose-700 dark:text-rose-400 list-disc list-inside space-y-1 ml-1 leading-relaxed">
                    <li>Seluruh user login anggota portal ({nonAdminUsers.filter(u => u.role === 'member').length} akun).</li>
                    {nonAdminUsers.filter(u => u.role === 'karyawan_warung').length > 0 && (
                      <li>Akun staf kasir / karyawan warung ({nonAdminUsers.filter(u => u.role === 'karyawan_warung').length} akun).</li>
                    )}
                    <li>Data profil anggota di buku anggota <strong>TIDAK AKAN HILANG</strong>, hanya akses login yang direset.</li>
                  </ul>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Akun yang DIJAMIN AMAN & DIPERTAHANKAN ({adminUsers.length} Akun):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {adminUsers.map(admin => (
                      <span
                        key={admin.id}
                        className="text-[11px] font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs"
                      >
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>{admin.username}</span>
                        <span className="text-[10px] text-slate-400">({admin.posisiJabatan || admin.nama})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmation Input Safeguard */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Ketik <span className="font-mono font-black text-rose-600 uppercase">HAPUS SEMUA</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  placeholder="Ketik HAPUS SEMUA di sini..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isDeletingAll}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-wide"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  disabled={isDeletingAll}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAllNonAdmin}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'HAPUS SEMUA' || isDeletingAll || nonAdminUsers.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {isDeletingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang Menghapus ({nonAdminUsers.length})...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Ya, Hapus {nonAdminUsers.length} Akun User</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
