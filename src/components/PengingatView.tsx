import React, { useState, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, KoperasiSetup } from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  Bell, MessageSquare, Send, Calendar, AlertCircle, CheckCircle2, 
  User, Wallet, Filter, Clock, ArrowUpRight, Search, Sparkles, 
  Check, ExternalLink, Share2, Settings2, RefreshCw, FileText,
  X, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PengingatViewProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  setup: KoperasiSetup;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function PengingatView({ members, simpanan, pinjaman, angsuran, setup }: PengingatViewProps) {
  // Current Month/Year for default filters
  const today = new Date();
  const [targetMonth, setTargetMonth] = useState<number>(today.getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(today.getFullYear());
  const [expectedWajibNominal, setExpectedWajibNominal] = useState<number>(50000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tab control inside Pengingat
  const [subTab, setSubTab] = useState<'wajib' | 'pinjaman'>('wajib');

  // State for active editable reminder modal
  const [activeReminder, setActiveReminder] = useState<{ phone: string; message: string; name: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeReminder) {
      setCopied(false);
    }
  }, [activeReminder]);

  // Custom Templates states
  const defaultWajibTemplate = `Halo Kak *[Nama]*,

Kami dari *[NamaKoperasi]* ingin menginformasikan perihal kewajiban iuran bulanan Anda.

Tercatat Anda belum melakukan penyetoran *Simpanan Wajib* untuk periode *[Bulan] [Tahun]* sebesar *[Nominal]*.

Pembayaran dapat disetorkan langsung ke kantor koperasi atau ditransfer melalui rekening resmi koperasi.

Terima kasih atas partisipasi aktif Anda dalam memajukan koperasi kita bersama. 🙏🌱`;

  const defaultPinjamanTemplate = `Halo Kak *[Nama]*,

Kami dari bagian Keuangan *[NamaKoperasi]* ingin menginformasikan status angsuran pinjaman Anda.

Angsuran Bulan Ke-*[BulanKe]* sebesar *[Nominal]* dengan tanggal jatuh tempo *[TanggalJatuhTempo]* (*[StatusHari]*).

Mohon untuk melakukan pembayaran tepat waktu demi kenyamanan administrasi bersama.

Jika Anda sudah melakukan pembayaran, silakan abaikan pesan ini atau kirimkan bukti transfer Anda ke kami. Terima kasih banyak. 🙏💰`;

  const defaultAccumulatedTemplate = `Halo Kak *[Nama]*,

Kami dari *[NamaKoperasi]* ingin menginformasikan perihal kewajiban tagihan Anda yang diakumulasikan bulan ini.

Tercatat Anda memiliki tagihan tertunggak sebagai berikut:
1. *Simpanan Wajib* (Periode *[Bulan] [Tahun]*): *[NominalWajib]*
2. *Angsuran Pinjaman* (Bulan Ke-*[BulanKe]*): *[NominalPinjaman]*

*Total Tagihan Akumulasi*: *[NominalAkumulasi]*

Mohon untuk melakukan pembayaran tepat waktu demi kenyamanan administrasi bersama. Pembayaran dapat disetorkan langsung ke kantor koperasi atau ditransfer melalui rekening resmi koperasi. Terima kasih banyak. 🙏🌱💰`;

  const [wajibTemplate, setWajibTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_wajib') || defaultWajibTemplate;
  });

  const [pinjamanTemplate, setPinjamanTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_pinjaman') || defaultPinjamanTemplate;
  });

  const [accumulatedTemplate, setAccumulatedTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_accumulated') || defaultAccumulatedTemplate;
  });

  const [isEditingTemplates, setIsEditingTemplates] = useState<boolean>(false);

  // Helper: Reset templates
  const resetTemplates = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan template pesan ke pengaturan awal?")) {
      setWajibTemplate(defaultWajibTemplate);
      setPinjamanTemplate(defaultPinjamanTemplate);
      setAccumulatedTemplate(defaultAccumulatedTemplate);
      localStorage.removeItem('template_wa_wajib');
      localStorage.removeItem('template_wa_pinjaman');
      localStorage.removeItem('template_wa_accumulated');
    }
  };

  // Helper: Save templates
  const saveTemplates = () => {
    localStorage.setItem('template_wa_wajib', wajibTemplate);
    localStorage.setItem('template_wa_pinjaman', pinjamanTemplate);
    localStorage.setItem('template_wa_accumulated', accumulatedTemplate);
    setIsEditingTemplates(false);
    alert("Template pesan WhatsApp berhasil disimpan!");
  };

  // Helper: Get accumulated loan + wajib info if applicable
  const getMemberAccumulation = (memberId: string) => {
    // Find active loan
    const activeLoan = pinjaman.find(p => p.anggotaId === memberId && p.status === 'Belum Lunas');
    if (!activeLoan) return null;

    // Check if joined date is after target month/year to prevent incorrect due alerts
    const m = members.find(mem => mem.id === memberId);
    if (!m) return null;
    
    if (m.tanggalBergabung) {
      const joinDate = new Date(m.tanggalBergabung);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;
      if (targetYear < joinYear || (targetYear === joinYear && targetMonth < joinMonth)) {
        return null; // skipped because member hasn't joined yet
      }
    }

    // Check if unpaid simpanan wajib for targetMonth & targetYear
    const hasPaidWajib = simpanan.some(s => {
      if (s.anggotaId !== memberId || s.jenis !== 'Wajib') return false;
      const sDate = new Date(s.tanggal);
      return sDate.getMonth() + 1 === targetMonth && sDate.getFullYear() === targetYear;
    });

    if (hasPaidWajib) return null;

    // Unpaid angsuran info
    const relatedAngsuran = angsuran.filter(a => a.pinjamanId === activeLoan.id);
    const paidMonths = relatedAngsuran.map(a => a.bulanKe);
    const nextMonth = paidMonths.length > 0 ? Math.max(...paidMonths) + 1 : 1;

    if (nextMonth > activeLoan.tenor) return null;

    const amountDue = activeLoan.totalAngsuranPerBulan;
    const totalAccumulated = amountDue + expectedWajibNominal;

    // Next due date
    const startDate = new Date(activeLoan.tanggal);
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + nextMonth);
    dueDate.setHours(0, 0, 0, 0);
    const formattedDueDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Generate accumulated message
    let text = accumulatedTemplate;
    text = text.replace(/\[Nama\]/g, m.nama);
    text = text.replace(/\[NamaKoperasi\]/g, setup.namaKoperasi || "Koperasi Dana Segar");
    text = text.replace(/\[Bulan\]/g, MONTH_NAMES[targetMonth - 1]);
    text = text.replace(/\[Tahun\]/g, String(targetYear));
    text = text.replace(/\[NominalWajib\]/g, formatRupiah(expectedWajibNominal));
    text = text.replace(/\[NominalPinjaman\]/g, formatRupiah(amountDue));
    text = text.replace(/\[BulanKe\]/g, String(nextMonth));
    text = text.replace(/\[NominalAkumulasi\]/g, formatRupiah(totalAccumulated));
    text = text.replace(/\[TanggalJatuhTempo\]/g, formattedDueDate);

    return {
      loan: activeLoan,
      amountDue,
      expectedWajibNominal,
      totalAccumulated,
      nextMonth,
      formattedDueDate,
      message: text
    };
  };

  // Dynamic template replacement helper
  const formatTemplate = (template: string, data: {
    nama: string;
    namaKoperasi: string;
    bulan?: string;
    tahun?: string;
    nominal: string;
    bulanKe?: string;
    tanggalJatuhTempo?: string;
    statusHari?: string;
  }) => {
    let text = template;
    text = text.replace(/\[Nama\]/g, data.nama);
    text = text.replace(/\[NamaKoperasi\]/g, data.namaKoperasi);
    if (data.bulan) text = text.replace(/\[Bulan\]/g, data.bulan);
    if (data.tahun) text = text.replace(/\[Tahun\]/g, data.tahun);
    text = text.replace(/\[Nominal\]/g, data.nominal);
    if (data.bulanKe) text = text.replace(/\[BulanKe\]/g, data.bulanKe);
    if (data.tanggalJatuhTempo) text = text.replace(/\[TanggalJatuhTempo\]/g, data.tanggalJatuhTempo);
    if (data.statusHari) text = text.replace(/\[StatusHari\]/g, data.statusHari);
    return text;
  };

  // Helper to trigger WhatsApp
  const sendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let finalPhone = cleanPhone;
    if (finalPhone.startsWith('0')) {
      finalPhone = '62' + finalPhone.substring(1);
    }
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 1. Simpanan Wajib Due Detection List
  const unpaidWajibList = useMemo(() => {
    const result: {
      member: Member;
      bulan: string;
      tahun: number;
      nominal: number;
      messagePreview: string;
    }[] = [];

    members.forEach(m => {
      // Check if joined date is after target month/year to prevent incorrect due alerts
      if (m.tanggalBergabung) {
        const joinDate = new Date(m.tanggalBergabung);
        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth() + 1;
        if (targetYear < joinYear || (targetYear === joinYear && targetMonth < joinMonth)) {
          return; // skipped because member hasn't joined yet
        }
      }

      // Filter to see if they made a Wajib saving in this target month and year
      const hasPaid = simpanan.some(s => {
        if (s.anggotaId !== m.id || s.jenis !== 'Wajib') return false;
        const sDate = new Date(s.tanggal);
        return sDate.getMonth() + 1 === targetMonth && sDate.getFullYear() === targetYear;
      });

      if (!hasPaid) {
        // Prepare preview message
        const preview = formatTemplate(wajibTemplate, {
          nama: m.nama,
          namaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
          bulan: MONTH_NAMES[targetMonth - 1],
          tahun: targetYear,
          nominal: formatRupiah(expectedWajibNominal)
        });

        result.push({
          member: m,
          bulan: MONTH_NAMES[targetMonth - 1],
          tahun: targetYear,
          nominal: expectedWajibNominal,
          messagePreview: preview
        });
      }
    });

    return result;
  }, [members, simpanan, targetMonth, targetYear, expectedWajibNominal, wajibTemplate, setup]);

  // 2. Angsuran Pinjaman Due Detection List
  const unpaidPinjamanList = useMemo(() => {
    const result: {
      loan: Pinjaman;
      member: Member;
      dueDate: Date;
      daysRemaining: number;
      amountDue: number;
      nextMonth: number;
      statusLabel: string;
      statusColor: string;
      messagePreview: string;
    }[] = [];

    const activeLoans = pinjaman.filter(p => p.status === 'Belum Lunas');
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    activeLoans.forEach(p => {
      const m = members.find(mem => mem.id === p.anggotaId);
      if (!m) return;

      // Find paid installments
      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === p.id);
      const paidMonths = relatedAngsuran.map(a => a.bulanKe);
      const nextMonth = paidMonths.length > 0 ? Math.max(...paidMonths) + 1 : 1;

      if (nextMonth > p.tenor) return; // fully paid installments for now

      // Next due date
      const startDate = new Date(p.tanggal);
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + nextMonth);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - todayZero.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Build relative status label
      let statusLabel = '';
      let statusColor = '';
      let statusHari = '';

      if (diffDays === 0) {
        statusLabel = 'Jatuh Tempo HARI INI';
        statusColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold animate-pulse';
        statusHari = 'Jatuh Tempo Hari Ini';
      } else if (diffDays === 1) {
        statusLabel = 'Jatuh Tempo BESOK';
        statusColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold';
        statusHari = 'Jatuh Tempo Besok';
      } else if (diffDays < 0) {
        statusLabel = `Terlewat ${Math.abs(diffDays)} Hari`;
        statusColor = 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 font-mono';
        statusHari = `Terlewat ${Math.abs(diffDays)} hari dari batas tempo`;
      } else {
        statusLabel = `Sisa ${diffDays} Hari`;
        statusColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-mono';
        statusHari = `dalam ${diffDays} hari ke depan`;
      }

      const formattedDueDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const preview = formatTemplate(pinjamanTemplate, {
        nama: m.nama,
        namaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
        nominal: formatRupiah(p.totalAngsuranPerBulan),
        bulanKe: String(nextMonth),
        tanggalJatuhTempo: formattedDueDate,
        statusHari: statusHari
      });

      result.push({
        loan: p,
        member: m,
        dueDate,
        daysRemaining: diffDays,
        amountDue: p.totalAngsuranPerBulan,
        nextMonth,
        statusLabel,
        statusColor,
        messagePreview: preview
      });
    });

    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [members, pinjaman, angsuran, pinjamanTemplate, setup]);

  // Filtering based on Search Query
  const filteredWajibList = useMemo(() => {
    if (!searchQuery) return unpaidWajibList;
    const query = searchQuery.toLowerCase();
    return unpaidWajibList.filter(item => 
      item.member.nama.toLowerCase().includes(query) || 
      item.member.noAnggota.toLowerCase().includes(query)
    );
  }, [unpaidWajibList, searchQuery]);

  const filteredPinjamanList = useMemo(() => {
    if (!searchQuery) return unpaidPinjamanList;
    const query = searchQuery.toLowerCase();
    return unpaidPinjamanList.filter(item => 
      item.member.nama.toLowerCase().includes(query) || 
      item.member.noAnggota.toLowerCase().includes(query)
    );
  }, [unpaidPinjamanList, searchQuery]);

  // Statistics summaries
  const stats = useMemo(() => {
    const totalUnpaidWajibNominal = unpaidWajibList.length * expectedWajibNominal;
    const totalUnpaidPinjamanNominal = unpaidPinjamanList.reduce((acc, c) => acc + c.amountDue, 0);
    const overdueLoansCount = unpaidPinjamanList.filter(item => item.daysRemaining < 0).length;

    return {
      wajibCount: unpaidWajibList.length,
      wajibTotal: totalUnpaidWajibNominal,
      pinjamanCount: unpaidPinjamanList.length,
      pinjamanTotal: totalUnpaidPinjamanNominal,
      overdueCount: overdueLoansCount
    };
  }, [unpaidWajibList, unpaidPinjamanList, expectedWajibNominal]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-h-[calc(100vh-64px)] lg:max-h-screen">
      
      {/* Top Banner Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600 animate-bounce" />
            Pengingat Tagihan & Broadcast Anggota
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau dan kirim pengingat tagihan bulanan (Simpanan Wajib & Angsuran Aktif) langsung ke WhatsApp anggota Anda.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingTemplates(!isEditingTemplates)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition shadow-sm cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
            {isEditingTemplates ? "Tutup Edit Template" : "Atur Template Pesan"}
          </button>
        </div>
      </div>

      {/* Template Editor Drawer / Section */}
      <AnimatePresence>
        {isEditingTemplates && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-emerald-50/50 dark:bg-slate-900/40 border border-emerald-100 dark:border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-emerald-100/60 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Personalisasi Template Pengingat WhatsApp
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={resetTemplates}
                  className="px-3 py-1 text-[10.5px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 transition cursor-pointer"
                >
                  Reset Default
                </button>
                <button 
                  onClick={saveTemplates}
                  className="px-3 py-1 text-[10.5px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Simpan Template
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Template Simpanan Wajib</label>
                <textarea
                  rows={6}
                  value={wajibTemplate}
                  onChange={(e) => setWajibTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-white dark:bg-slate-950 border rounded-xl border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-300"
                  placeholder="Isi template..."
                />
                <div className="text-[10px] text-slate-400 leading-relaxed bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                  <span className="font-semibold block mb-1">Daftar Variabel (Dynamic Placeholder):</span>
                  <code>[Nama]</code>, <code>[NamaKoperasi]</code>, <code>[Bulan]</code>, <code>[Tahun]</code>, <code>[Nominal]</code>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Template Angsuran Pinjaman</label>
                <textarea
                  rows={6}
                  value={pinjamanTemplate}
                  onChange={(e) => setPinjamanTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-white dark:bg-slate-950 border rounded-xl border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-300"
                  placeholder="Isi template..."
                />
                <div className="text-[10px] text-slate-400 leading-relaxed bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                  <span className="font-semibold block mb-1">Daftar Variabel (Dynamic Placeholder):</span>
                  <code>[Nama]</code>, <code>[NamaKoperasi]</code>, <code>[BulanKe]</code>, <code>[Nominal]</code>, <code>[TanggalJatuhTempo]</code>, <code>[StatusHari]</code>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Template Akumulasi (SW + Pinjaman)</label>
                <textarea
                  rows={6}
                  value={accumulatedTemplate}
                  onChange={(e) => setAccumulatedTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-white dark:bg-slate-950 border rounded-xl border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-300"
                  placeholder="Isi template..."
                />
                <div className="text-[10px] text-slate-400 leading-relaxed bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                  <span className="font-semibold block mb-1">Daftar Variabel:</span>
                  <code>[Nama]</code>, <code>[NamaKoperasi]</code>, <code>[Bulan]</code>, <code>[Tahun]</code>, <code>[NominalWajib]</code>, <code>[NominalPinjaman]</code>, <code>[BulanKe]</code>, <code>[NominalAkumulasi]</code>, <code>[TanggalJatuhTempo]</code>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Unpaid Today */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-755 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans tracking-wider text-slate-400 dark:text-slate-500 font-bold">Menunggak SW (Bulan Ini)</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.wajibCount} Anggota</p>
            <p className="text-[10px] font-mono text-slate-400">{formatRupiah(stats.wajibTotal)} potensial</p>
          </div>
        </div>

        {/* Stat 2: Active Installments Due */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-755 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans tracking-wider text-slate-400 dark:text-slate-500 font-bold">Menunggu Angsuran</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.pinjamanCount} Akad</p>
            <p className="text-[10px] font-mono text-slate-400">{formatRupiah(stats.pinjamanTotal)} tertagih</p>
          </div>
        </div>

        {/* Stat 3: Overdue Loans */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-755 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans tracking-wider text-slate-400 dark:text-slate-500 font-bold">Terlewat Batas Tempo</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.overdueCount} Tagihan</p>
            <p className="text-[10px] text-slate-400 font-sans">Perlu segera di-WA</p>
          </div>
        </div>

        {/* Stat 4: Estimated Total Cash Recovery */}
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 text-white p-4 rounded-2xl border border-emerald-900 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-200 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans tracking-wider text-emerald-300 font-bold">Estimasi Total Tagihan</p>
            <p className="text-lg font-bold text-emerald-300">{formatRupiah(stats.wajibTotal + stats.pinjamanTotal)}</p>
            <p className="text-[10px] text-slate-300 font-sans">Seluruh potensi masuk kas</p>
          </div>
        </div>
      </div>

      {/* Control Filter Panel */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-755 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-emerald-600" /> Panel Kriteria Tagihan & Pencarian
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
          
          {/* Month selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-sans block">Periode Bulan Tagihan</label>
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-emerald-600"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-sans block">Tahun Tagihan</label>
            <select
              value={targetYear}
              onChange={(e) => setTargetYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-emerald-600"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Wajib Nominal setting */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-sans block">Jumlah Simpanan Wajib Bulanan</label>
            <input
              type="number"
              value={expectedWajibNominal}
              onChange={(e) => setExpectedWajibNominal(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200 font-bold focus:outline-emerald-600"
              placeholder="Nominal Wajib..."
            />
          </div>

          {/* General Search */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-sans block">Cari Anggota</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-emerald-600 font-sans"
                placeholder="Nama atau No Anggota..."
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Interactive Work Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-755 shadow-sm overflow-hidden">
        
        {/* Navigation Tabs for Wajib and Pinjaman */}
        <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 p-3 flex flex-wrap gap-2 justify-between items-center">
          <div className="flex gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setSubTab('wajib')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                subTab === 'wajib'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Simpanan Wajib Belum Terbayar ({filteredWajibList.length})
            </button>
            <button
              onClick={() => setSubTab('pinjaman')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                subTab === 'pinjaman'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Angsuran Jatuh Tempo ({filteredPinjamanList.length})
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 px-2 py-1 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800">
            {subTab === 'wajib' 
              ? `Periode: ${MONTH_NAMES[targetMonth - 1]} ${targetYear}` 
              : "Menampilkan semua akad pinjaman belum lunas"}
          </div>
        </div>

        {/* Dynamic content rendering with motion animation */}
        <div className="p-4 md:p-6 overflow-x-auto">
          
          <AnimatePresence mode="wait">
            {subTab === 'wajib' ? (
              <motion.div
                key="wajib-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {filteredWajibList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-pulse" />
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Hebat! Semua anggota tertib membayar</p>
                      <p className="text-xs text-slate-400 mt-1">Tidak ditemukan anggota yang menunggak Simpanan Wajib pada periode ini.</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">ID Anggota</th>
                        <th className="px-4 py-3">Nama Anggota</th>
                        <th className="px-4 py-3">No. WhatsApp</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3 text-right">Tagihan</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center w-36">Aksi Broadcast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                      {filteredWajibList.map((item, index) => {
                        const accumulation = getMemberAccumulation(item.member.id);
                        const displayNominal = accumulation ? accumulation.totalAccumulated : item.nominal;
                        const messageToUse = accumulation ? accumulation.message : item.messagePreview;

                        return (
                          <tr key={item.member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition duration-150">
                            <td className="px-4 py-3 text-center text-slate-400 font-bold font-mono">{index + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{item.member.noAnggota}</td>
                            <td className="px-4 py-3 font-sans text-slate-800 dark:text-slate-100 font-bold">
                              <div>
                                <p className="font-bold">{item.member.nama}</p>
                                {accumulation && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-sans font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-md mt-0.5 animate-pulse">
                                    ⚠️ Akumulasi Tagihan + Pinjaman
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{item.member.noHp}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-350">{item.bulan} {item.tahun}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {accumulation ? (
                                <div className="space-y-0.5">
                                  <p className="text-amber-600 dark:text-amber-400 font-extrabold">{formatRupiah(displayNominal)}</p>
                                  <p className="text-[9px] text-slate-400 font-normal">
                                    SW: {formatRupiah(item.nominal)} + Pinj: {formatRupiah(accumulation.amountDue)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">{formatRupiah(displayNominal)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide rounded-full bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/60">
                                Belum Bayar
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setActiveReminder({ phone: item.member.noHp, message: messageToUse, name: item.member.nama })}
                                className="px-3 py-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                                title="Kirim Pesan Pengingat ke WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                Kirim WA
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="pinjaman-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {filteredPinjamanList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-pulse" />
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada pinjaman jatuh tempo</p>
                      <p className="text-xs text-slate-400 mt-1">Seluruh anggota dengan akad pinjaman aktif terpantau tertib atau tidak ada tagihan saat ini.</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">ID Anggota</th>
                        <th className="px-4 py-3">Nama Anggota</th>
                        <th className="px-4 py-3">No. WhatsApp</th>
                        <th className="px-4 py-3 text-center">Angsuran Ke</th>
                        <th className="px-4 py-3">Tanggal Jatuh Tempo</th>
                        <th className="px-4 py-3 text-right">Nominal Tagihan</th>
                        <th className="px-4 py-3 text-center">Status Batas</th>
                        <th className="px-4 py-3 text-center w-36">Aksi Broadcast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                      {filteredPinjamanList.map((item, index) => {
                        const accumulation = getMemberAccumulation(item.member.id);
                        const displayNominal = accumulation ? accumulation.totalAccumulated : item.amountDue;
                        const messageToUse = accumulation ? accumulation.message : item.messagePreview;

                        return (
                          <tr key={item.loan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition duration-150">
                            <td className="px-4 py-3 text-center text-slate-400 font-bold font-mono">{index + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{item.member.noAnggota}</td>
                            <td className="px-4 py-3 font-sans text-slate-800 dark:text-slate-100 font-bold">
                              <div>
                                <p className="font-bold">{item.member.nama}</p>
                                {accumulation && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-sans font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-md mt-0.5 animate-pulse">
                                    ⚠️ Akumulasi Tagihan + SW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{item.member.noHp}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{item.nextMonth} dari {item.loan.tenor}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-350">
                              {item.dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {accumulation ? (
                                <div className="space-y-0.5">
                                  <p className="text-amber-600 dark:text-amber-400 font-extrabold">{formatRupiah(displayNominal)}</p>
                                  <p className="text-[9px] text-slate-400 font-normal">
                                    Pinj: {formatRupiah(item.amountDue)} + SW: {formatRupiah(accumulation.expectedWajibNominal)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">{formatRupiah(displayNominal)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 text-[9.5px] rounded-full uppercase tracking-wide ${item.statusColor}`}>
                                {item.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setActiveReminder({ phone: item.member.noHp, message: messageToUse, name: item.member.nama })}
                                className="px-3 py-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                                title="Kirim Pesan Pengingat ke WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                Kirim WA
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Send Confirmation Modal with Editable Message */}
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-150 dark:border-slate-800"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Edit Pesan Pengingat (WhatsApp)
                </h3>
                <button 
                  onClick={() => setActiveReminder(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-xs space-y-1">
                  <p className="text-slate-500 dark:text-slate-400">
                    Penerima: <span className="font-bold text-slate-800 dark:text-slate-100">{activeReminder.name}</span> ({activeReminder.phone})
                  </p>
                  <p className="text-slate-400 dark:text-slate-500">
                    Silakan sesuaikan isi pesan di bawah ini sebelum mengirim ke WhatsApp.
                  </p>
                </div>

                <textarea
                  rows={10}
                  value={activeReminder.message}
                  onChange={(e) => setActiveReminder({ ...activeReminder, message: e.target.value })}
                  className="w-full p-3.5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-300 leading-relaxed"
                />
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-xs font-semibold">
                <button 
                  onClick={() => setActiveReminder(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(activeReminder.message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`px-4 py-2 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                    copied 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Teks Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin Pesan
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    sendWhatsApp(activeReminder.phone, activeReminder.message);
                    setActiveReminder(null);
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim ke WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
