import React, { useState, useMemo, useEffect } from 'react';
import { 
  Member, 
  Simpanan, 
  Pinjaman, 
  Angsuran, 
  KoperasiSetup, 
  PiutangWarung, 
  WhatsAppLog 
} from '../types';
import { formatRupiah, terbilang } from '../utils/finance';
import { 
  Bell, MessageSquare, Send, Calendar, AlertCircle, CheckCircle2, 
  User, Wallet, Filter, Clock, ArrowUpRight, Search, Sparkles, 
  Check, ExternalLink, Share2, Settings2, RefreshCw, FileText,
  X, Copy, Store, Receipt, History, Printer, Trash2, ShieldCheck,
  CreditCard, Info, ChevronRight, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PengingatViewProps {
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  setup: KoperasiSetup;
  piutangWarung?: PiutangWarung[];
  whatsAppLogs?: WhatsAppLog[];
  onSaveWhatsAppLog?: (log: WhatsAppLog) => void;
  onDeleteWhatsAppLog?: (id: string) => void;
  onNavigateToPinjaman?: (pinjamanId?: string, memberId?: string, query?: string) => void;
}

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper function to safely parse member's join date
function parseMemberJoinDate(val?: string): Date | null {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim();
  
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

// Helper to calculate unpaid Simpanan Wajib months:
export function getMemberUnpaidWajibDetails(
  member: Member,
  simpananList: Simpanan[],
  targetMonth: number,
  targetYear: number,
  startMonth: number = 4, // Default: April (Bulan ke-4)
  expectedNominalPerMonth: number = 50000
): {
  unpaidMonths: { month: number; monthName: string; year: number }[];
  unpaidMonthsCount: number;
  unpaidMonthsString: string;
  isUnpaid: boolean;
} {
  let effectiveStartMonth = startMonth;

  if (member.tanggalBergabung) {
    const joinDate = parseMemberJoinDate(member.tanggalBergabung);
    if (joinDate) {
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;

      if (joinYear > targetYear) {
        return { unpaidMonths: [], unpaidMonthsCount: 0, unpaidMonthsString: '', isUnpaid: false };
      }

      if (joinYear === targetYear) {
        if (joinMonth > targetMonth) {
          return { unpaidMonths: [], unpaidMonthsCount: 0, unpaidMonthsString: '', isUnpaid: false };
        }
        if (joinMonth > startMonth) {
          effectiveStartMonth = joinMonth;
        } else {
          effectiveStartMonth = startMonth;
        }
      } else {
        effectiveStartMonth = startMonth;
      }
    }
  }

  const fromMonth = Math.min(effectiveStartMonth, targetMonth);
  const toMonth = Math.max(effectiveStartMonth, targetMonth);
  const nominalPerBulan = (expectedNominalPerMonth && expectedNominalPerMonth > 0) ? expectedNominalPerMonth : 50000;

  const memberWajibPayments = simpananList.filter(s => {
    if (s.anggotaId !== member.id || s.jenis !== 'Wajib') return false;
    if (!s.tanggal) return false;
    const sDate = new Date(s.tanggal);
    return sDate.getFullYear() === targetYear;
  });

  const totalPaidWajib = memberWajibPayments.reduce((sum, s) => sum + (Number(s.jumlah) || 0), 0);
  const monthsCoveredCount = Math.max(0, Math.floor(totalPaidWajib / nominalPerBulan));

  const unpaidMonths: { month: number; monthName: string; year: number }[] = [];

  for (let m = fromMonth; m <= toMonth; m++) {
    const monthIndexInRange = m - fromMonth;

    const paidInThisMonth = memberWajibPayments.some(s => {
      const sDate = new Date(s.tanggal);
      return (sDate.getMonth() + 1 === m) && (Number(s.jumlah) >= nominalPerBulan);
    });

    const isCoveredByCumulative = monthIndexInRange < monthsCoveredCount;

    if (!paidInThisMonth && !isCoveredByCumulative) {
      unpaidMonths.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        year: targetYear
      });
    }
  }

  const unpaidMonthsCount = unpaidMonths.length;
  const unpaidMonthsString = unpaidMonthsCount > 0
    ? `${unpaidMonths.map(u => u.monthName).join(', ')} ${targetYear}`
    : '';

  return {
    unpaidMonths,
    unpaidMonthsCount,
    unpaidMonthsString,
    isUnpaid: unpaidMonthsCount > 0
  };
}

export function PengingatView({ 
  members, 
  simpanan, 
  pinjaman, 
  angsuran, 
  setup, 
  piutangWarung = [], 
  whatsAppLogs = [],
  onSaveWhatsAppLog,
  onDeleteWhatsAppLog,
  onNavigateToPinjaman
}: PengingatViewProps) {
  const today = new Date();
  const [startFromMonth, setStartFromMonth] = useState<number>(4); // Default: April
  const [targetMonth, setTargetMonth] = useState<number>(today.getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(today.getFullYear());
  const [expectedWajibNominal, setExpectedWajibNominal] = useState<number>(setup.nominalSimpananWajib || 50000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tab control inside Pengingat & WhatsApp Center
  const [subTab, setSubTab] = useState<'wajib' | 'pinjaman' | 'warung' | 'gabungan' | 'kuitansi' | 'logs'>('wajib');

  // State for active editable reminder modal
  const [activeReminder, setActiveReminder] = useState<{ 
    phone: string; 
    message: string; 
    name: string;
    anggotaId?: string;
    jenisPesan?: WhatsAppLog['jenisPesan'];
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (activeReminder) {
      setCopied(false);
    }
  }, [activeReminder]);

  // Default Templates
  const defaultWajibTemplate = `Halo Bpk/Ibu *[Nama]*,

Kami dari *[NamaKoperasi]* ingin menginformasikan perihal kewajiban iuran bulanan Simpanan Wajib Anda.

Tercatat Anda memiliki tagihan *Simpanan Wajib* yang belum dibayar sebanyak *[JumlahBulan]* dengan rincian periode:
📌 *Bulan yang belum dibayar:* *[DaftarBulan]*
💰 *Total Nominal Tagihan:* *[Nominal]* (*[JumlahBulan]* × [NominalPerBulan])

Pembayaran dapat disetorkan langsung ke kantor koperasi atau ditransfer melalui rekening resmi koperasi.

Terima kasih atas partisipasi aktif Anda dalam memajukan koperasi kita bersama. 🙏🌱`;

  const defaultPinjamanTemplate = `Halo Bpk/Ibu *[Nama]*,

Kami dari bagian Keuangan *[NamaKoperasi]* ingin menginformasikan status angsuran pinjaman Anda.

Angsuran Bulan Ke-*[BulanKe]* sebesar *[Nominal]* dengan tanggal jatuh tempo *[TanggalJatuhTempo]* (*[StatusHari]*).

Mohon untuk melakukan pembayaran tepat waktu demi kenyamanan administrasi bersama.

Jika Anda sudah melakukan pembayaran, silakan abaikan pesan ini atau kirimkan bukti transfer Anda ke kami. Terima kasih banyak. 🙏💰`;

  const defaultWarungTemplate = `Halo Bpk/Ibu *[Nama]*,

Kami dari Unit Usaha Warung / Kantin *[NamaKoperasi]* ingin menginformasikan catatan saldo kasbon belanja Anda.

Tercatat sisa saldo piutang / kasbon belanja Anda per hari ini adalah sebesar *[Nominal]* (*[CatatanWarung]*).

Pembayaran kasbon dapat disetorkan langsung ke petugas kasir warung atau ditransfer ke rekening koperasi.

Terima kasih atas kerja sama dan kepercayaannya berbelanja di unit usaha koperasi kita bersama. 🙏🛒`;

  const defaultAccumulatedTemplate = `Halo Bpk/Ibu *[Nama]*,

Kami dari *[NamaKoperasi]* ingin menginformasikan perihal kewajiban tagihan Anda yang diakumulasikan bulan ini.

Tercatat Anda memiliki tagihan tertunggak sebagai berikut:
1. *Simpanan Wajib* (*[JumlahBulan]*: *[DaftarBulan]*): *[NominalWajib]* (*[JumlahBulan]* × [NominalPerBulan])
2. *Angsuran Pinjaman* (Bulan Ke-*[BulanKe]*): *[NominalPinjaman]*
3. *Kasbon Warung / Kantin*: *[NominalWarung]*

*Total Tagihan Akumulasi*: *[NominalAkumulasi]*

Mohon untuk melakukan pembayaran tepat waktu demi kenyamanan administrasi bersama. Pembayaran dapat disetorkan langsung ke kantor koperasi atau ditransfer melalui rekening resmi koperasi. Terima kasih banyak. 🙏🌱💰`;

  const [wajibTemplate, setWajibTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_wajib_v4') || defaultWajibTemplate;
  });

  const [pinjamanTemplate, setPinjamanTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_pinjaman_v4') || defaultPinjamanTemplate;
  });

  const [warungTemplate, setWarungTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_warung_v4') || defaultWarungTemplate;
  });

  const [accumulatedTemplate, setAccumulatedTemplate] = useState<string>(() => {
    return localStorage.getItem('template_wa_accumulated_v4') || defaultAccumulatedTemplate;
  });

  const [isEditingTemplates, setIsEditingTemplates] = useState<boolean>(false);

  // Helper: Reset templates
  const resetTemplates = () => {
    if (window.confirm("Kembalikan template pesan ke pengaturan default?")) {
      setWajibTemplate(defaultWajibTemplate);
      setPinjamanTemplate(defaultPinjamanTemplate);
      setWarungTemplate(defaultWarungTemplate);
      setAccumulatedTemplate(defaultAccumulatedTemplate);
      localStorage.removeItem('template_wa_wajib_v4');
      localStorage.removeItem('template_wa_pinjaman_v4');
      localStorage.removeItem('template_wa_warung_v4');
      localStorage.removeItem('template_wa_accumulated_v4');
    }
  };

  // Helper: Save templates
  const saveTemplates = () => {
    localStorage.setItem('template_wa_wajib_v4', wajibTemplate);
    localStorage.setItem('template_wa_pinjaman_v4', pinjamanTemplate);
    localStorage.setItem('template_wa_warung_v4', warungTemplate);
    localStorage.setItem('template_wa_accumulated_v4', accumulatedTemplate);
    setIsEditingTemplates(false);
    alert("Template pesan WhatsApp berhasil disimpan!");
  };

  // Dynamic template replacement helper
  const formatTemplate = (template: string, data: Record<string, string | undefined>) => {
    let text = template;
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined) {
        const regex = new RegExp(`\\[${key}\\]`, 'gi');
        text = text.replace(regex, val);
      }
    });
    return text;
  };

  // Helper to trigger WhatsApp & record log
  const sendWhatsApp = (phone: string, message: string, meta?: { name?: string; anggotaId?: string; jenisPesan?: WhatsAppLog['jenisPesan'] }) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let finalPhone = cleanPhone;
    if (finalPhone.startsWith('0')) {
      finalPhone = '62' + finalPhone.substring(1);
    }

    if (onSaveWhatsAppLog) {
      onSaveWhatsAppLog({
        id: `wa-log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        nomorHp: finalPhone,
        namaPenerima: meta?.name || 'Anggota Koperasi',
        anggotaId: meta?.anggotaId,
        jenisPesan: meta?.jenisPesan || 'Tagihan Simpanan Wajib',
        pesanText: message,
        status: 'Terkirim (wa.me)',
        adminSender: 'Pengurus Koperasi'
      });
    }

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyMessage = (text: string, meta?: { name?: string; anggotaId?: string; jenisPesan?: WhatsAppLog['jenisPesan']; phone?: string }) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (onSaveWhatsAppLog && meta) {
      onSaveWhatsAppLog({
        id: `wa-log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        nomorHp: meta.phone || '-',
        namaPenerima: meta.name || 'Anggota Koperasi',
        anggotaId: meta.anggotaId,
        jenisPesan: meta.jenisPesan || 'Tagihan Simpanan Wajib',
        pesanText: text,
        status: 'Tersalin ke Clipboard',
        adminSender: 'Pengurus Koperasi'
      });
    }
  };

  // 1. Simpanan Wajib Due Detection List (Accumulated from startFromMonth)
  const unpaidWajibList = useMemo(() => {
    const result: {
      member: Member;
      unpaidMonths: { month: number; monthName: string; year: number }[];
      unpaidMonthsCount: number;
      unpaidMonthsString: string;
      nominalPerBulan: number;
      totalNominal: number;
      messagePreview: string;
    }[] = [];

    members.forEach(m => {
      const wajibInfo = getMemberUnpaidWajibDetails(m, simpanan, targetMonth, targetYear, startFromMonth, expectedWajibNominal);
      if (wajibInfo.isUnpaid) {
        const totalNominal = wajibInfo.unpaidMonthsCount * expectedWajibNominal;

        const preview = formatTemplate(wajibTemplate, {
          Nama: m.nama,
          NamaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
          Bulan: MONTH_NAMES[targetMonth - 1],
          Tahun: String(targetYear),
          DaftarBulan: wajibInfo.unpaidMonthsString,
          JumlahBulan: `${wajibInfo.unpaidMonthsCount} Bulan`,
          NominalPerBulan: formatRupiah(expectedWajibNominal),
          Nominal: formatRupiah(totalNominal)
        });

        result.push({
          member: m,
          unpaidMonths: wajibInfo.unpaidMonths,
          unpaidMonthsCount: wajibInfo.unpaidMonthsCount,
          unpaidMonthsString: wajibInfo.unpaidMonthsString,
          nominalPerBulan: expectedWajibNominal,
          totalNominal,
          messagePreview: preview
        });
      }
    });

    return result;
  }, [members, simpanan, targetMonth, targetYear, startFromMonth, expectedWajibNominal, wajibTemplate, setup]);

  // 2. Angsuran Pinjaman Due Detection List (Akumulatif dari angsuran ke-1 sampai bulan berjalan)
  const unpaidPinjamanList = useMemo(() => {
    const result: {
      loan: Pinjaman;
      member: Member;
      nextMonth: number;
      lastMonth?: number;
      unpaidMonths: number[];
      unpaidCount: number;
      angsuranLabel: string;
      amountDue: number;
      dueDate: Date;
      formattedDueDate: string;
      daysRemaining: number;
      isOverdue: boolean;
      statusLabel: string;
      messagePreview: string;
    }[] = [];

    const activeLoans = pinjaman.filter(p => p.status === 'Belum Lunas');

    activeLoans.forEach(loan => {
      const mem = members.find(m => m.id === loan.anggotaId);
      if (!mem) return;

      const relatedAngsuran = angsuran.filter(a => a.pinjamanId === loan.id);
      const paidMonths = new Set(relatedAngsuran.map(a => a.bulanKe));

      const startDate = new Date(loan.tanggal);
      const getDueDate = (idx: number) => {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + idx);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      // Tentukan seluruh angsuran yang telah jatuh tempo dari angsuran ke-1 sampai bulan berjalan (targetMonth/targetYear)
      const unpaidMonthsUpToTarget: number[] = [];
      for (let m = 1; m <= loan.tenor; m++) {
        const d = getDueDate(m);
        const dYear = d.getFullYear();
        const dMonth = d.getMonth() + 1;
        const isDue = dYear < targetYear || (dYear === targetYear && dMonth <= targetMonth);
        if (isDue && !paidMonths.has(m)) {
          unpaidMonthsUpToTarget.push(m);
        }
      }

      let unpaidMonths: number[] = [];
      let primaryDueDate: Date;
      let diffDays = 0;
      let isOverdue = false;

      if (unpaidMonthsUpToTarget.length > 0) {
        // Ada angsuran tertunggak dari angsuran ke-1 s/d bulan berjalan
        unpaidMonths = unpaidMonthsUpToTarget;
        const firstUnpaid = unpaidMonths[0];
        primaryDueDate = getDueDate(firstUnpaid);

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const diffTime = primaryDueDate.getTime() - todayMidnight.getTime();
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = diffDays < 0;
      } else {
        // Jika belum ada yang tertunggak s/d bulan ini, cari angsuran berikutnya yang belum dibayar
        let nextM = 1;
        while (nextM <= loan.tenor && paidMonths.has(nextM)) nextM++;
        if (nextM > loan.tenor) return; // Pinjaman sudah lunas seluruhnya

        unpaidMonths = [nextM];
        primaryDueDate = getDueDate(nextM);

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const diffTime = primaryDueDate.getTime() - todayMidnight.getTime();
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = diffDays < 0;
      }

      const unpaidCount = unpaidMonths.length;
      // Nominal tagihan akumulatif = jumlah bulan belum bayar s/d bulan berjalan x angsuran per bulan
      const amountDue = unpaidCount * loan.totalAngsuranPerBulan;
      const firstMonth = unpaidMonths[0];
      const lastMonth = unpaidMonths[unpaidMonths.length - 1];

      let angsuranLabel = '';
      if (unpaidCount > 1) {
        angsuranLabel = `Bulan ke-${firstMonth} s/d ${lastMonth}`;
      } else {
        angsuranLabel = `Bulan ke-${firstMonth}`;
      }

      let statusLabel = '';
      let statusHari = '';
      if (diffDays < 0) {
        statusLabel = `Terlambat ${Math.abs(diffDays)} Hari`;
        statusHari = `Terlambat ${Math.abs(diffDays)} hari dari jadwal${unpaidCount > 1 ? ` (Akumulasi ${unpaidCount} Bulan)` : ''}`;
      } else if (diffDays === 0) {
        statusLabel = 'Jatuh Tempo Hari Ini';
        statusHari = `Jatuh tempo HARI INI${unpaidCount > 1 ? ` (${unpaidCount} Bulan)` : ''}`;
      } else if (diffDays <= 3) {
        statusLabel = `H-${diffDays} Jatuh Tempo`;
        statusHari = `Tersisa ${diffDays} hari lagi`;
      } else {
        statusLabel = `H-${diffDays} (Jadwal Aman)`;
        statusHari = `Tersisa ${diffDays} hari lagi`;
      }

      const formattedDueDate = primaryDueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      const preview = formatTemplate(pinjamanTemplate, {
        Nama: mem.nama,
        NamaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
        BulanKe: unpaidCount > 1 ? `${firstMonth} s/d ${lastMonth} (Akumulasi ${unpaidCount} Bulan)` : String(firstMonth),
        JumlahBulan: `${unpaidCount} Bulan`,
        NominalPerBulan: formatRupiah(loan.totalAngsuranPerBulan),
        Nominal: formatRupiah(amountDue),
        TanggalJatuhTempo: formattedDueDate,
        StatusHari: statusHari,
        RincianAngsuran: unpaidCount > 1 ? `${unpaidCount} Bulan × ${formatRupiah(loan.totalAngsuranPerBulan)} = ${formatRupiah(amountDue)}` : formatRupiah(amountDue)
      });

      result.push({
        loan,
        member: mem,
        nextMonth: firstMonth,
        lastMonth,
        unpaidMonths,
        unpaidCount,
        angsuranLabel,
        amountDue,
        dueDate: primaryDueDate,
        formattedDueDate,
        daysRemaining: diffDays,
        isOverdue,
        statusLabel,
        messagePreview: preview
      });
    });

    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [pinjaman, members, angsuran, pinjamanTemplate, setup, targetMonth, targetYear]);

  // 3. Tagihan Piutang Warung / Kasbon Anggota
  const unpaidWarungList = useMemo(() => {
    const result: {
      member: Member;
      totalPiutang: number;
      jumlahTransaksi: number;
      keteranganTransaksi: string;
      messagePreview: string;
    }[] = [];

    members.forEach(m => {
      const memberPiutang = piutangWarung.filter(pw => pw.anggotaId === m.id);
      if (memberPiutang.length === 0) return;

      const totalHutang = memberPiutang.filter(pw => pw.jenis === 'hutang_baru').reduce((s, pw) => s + pw.nominal, 0);
      const totalPelunasan = memberPiutang.filter(pw => pw.jenis === 'pelunasan').reduce((s, pw) => s + pw.nominal, 0);
      const sisaSaldo = totalHutang - totalPelunasan;

      if (sisaSaldo > 0) {
        const hutangRecords = memberPiutang.filter(pw => pw.jenis === 'hutang_baru');
        const ketStr = hutangRecords.map(h => h.keterangan || 'Belanja Warung').filter(Boolean).slice(0, 3).join(', ');

        const preview = formatTemplate(warungTemplate, {
          Nama: m.nama,
          NamaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
          Nominal: formatRupiah(sisaSaldo),
          CatatanWarung: ketStr ? `Item: ${ketStr}` : 'Kasbon Belanja'
        });

        result.push({
          member: m,
          totalPiutang: sisaSaldo,
          jumlahTransaksi: hutangRecords.length,
          keteranganTransaksi: ketStr || 'Belanja Sembako/Kantin',
          messagePreview: preview
        });
      }
    });

    return result.sort((a, b) => b.totalPiutang - a.totalPiutang);
  }, [members, piutangWarung, warungTemplate, setup]);

  // 4. Tagihan Gabungan Bulanan (Wajib + Pinjaman + Warung)
  const combinedList = useMemo(() => {
    const map = new Map<string, {
      member: Member;
      wajibNominal: number;
      wajibInfo: { count: number; str: string };
      loanNominal: number;
      loanNextMonth?: number;
      loanObj?: Pinjaman;
      warungNominal: number;
      totalAkumulasi: number;
      messagePreview: string;
    }>();

    members.forEach(m => {
      const wajib = getMemberUnpaidWajibDetails(m, simpanan, targetMonth, targetYear, startFromMonth, expectedWajibNominal);
      const wajibNominal = wajib.isUnpaid ? wajib.unpaidMonthsCount * expectedWajibNominal : 0;

      const activeLoan = pinjaman.find(p => p.anggotaId === m.id && p.status === 'Belum Lunas');
      let loanNominal = 0;
      let loanNextMonth = 1;
      let loanBulanKeStr = '';
      if (activeLoan) {
        const relatedA = angsuran.filter(a => a.pinjamanId === activeLoan.id);
        const paidM = new Set(relatedA.map(a => a.bulanKe));
        const startD = new Date(activeLoan.tanggal);
        
        const unpaidMonthsUpToTarget: number[] = [];
        for (let idx = 1; idx <= activeLoan.tenor; idx++) {
          const d = new Date(startD);
          d.setMonth(startD.getMonth() + idx);
          const dYear = d.getFullYear();
          const dMonth = d.getMonth() + 1;
          const isDue = dYear < targetYear || (dYear === targetYear && dMonth <= targetMonth);
          if (isDue && !paidM.has(idx)) {
            unpaidMonthsUpToTarget.push(idx);
          }
        }

        if (unpaidMonthsUpToTarget.length > 0) {
          const count = unpaidMonthsUpToTarget.length;
          loanNominal = count * activeLoan.totalAngsuranPerBulan;
          loanNextMonth = unpaidMonthsUpToTarget[0];
          loanBulanKeStr = count > 1 
            ? `${unpaidMonthsUpToTarget[0]} s/d ${unpaidMonthsUpToTarget[count - 1]} (${count} Bulan)` 
            : `${unpaidMonthsUpToTarget[0]}`;
        } else {
          let nextM = 1;
          while (nextM <= activeLoan.tenor && paidM.has(nextM)) nextM++;
          if (nextM <= activeLoan.tenor) {
            loanNominal = activeLoan.totalAngsuranPerBulan;
            loanNextMonth = nextM;
            loanBulanKeStr = `${nextM}`;
          }
        }
      }

      const memWarung = piutangWarung.filter(pw => pw.anggotaId === m.id);
      const totalHutang = memWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((s, pw) => s + pw.nominal, 0);
      const totalLunas = memWarung.filter(pw => pw.jenis === 'pelunasan').reduce((s, pw) => s + pw.nominal, 0);
      const warungNominal = Math.max(0, totalHutang - totalLunas);

      const totalAkumulasi = wajibNominal + loanNominal + warungNominal;

      if (totalAkumulasi > 0) {
        const preview = formatTemplate(accumulatedTemplate, {
          Nama: m.nama,
          NamaKoperasi: setup.namaKoperasi || "Koperasi Dana Segar",
          Bulan: MONTH_NAMES[targetMonth - 1],
          Tahun: String(targetYear),
          DaftarBulan: wajib.unpaidMonthsString || '-',
          JumlahBulan: wajib.unpaidMonthsCount ? `${wajib.unpaidMonthsCount} Bulan` : '0 Bulan',
          NominalPerBulan: formatRupiah(expectedWajibNominal),
          NominalWajib: formatRupiah(wajibNominal),
          NominalPinjaman: formatRupiah(loanNominal),
          BulanKe: loanBulanKeStr || String(loanNextMonth),
          NominalWarung: formatRupiah(warungNominal),
          NominalAkumulasi: formatRupiah(totalAkumulasi)
        });

        map.set(m.id, {
          member: m,
          wajibNominal,
          wajibInfo: { count: wajib.unpaidMonthsCount, str: wajib.unpaidMonthsString },
          loanNominal,
          loanNextMonth: activeLoan ? loanNextMonth : undefined,
          loanObj: activeLoan,
          warungNominal,
          totalAkumulasi,
          messagePreview: preview
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAkumulasi - a.totalAkumulasi);
  }, [members, simpanan, pinjaman, angsuran, piutangWarung, targetMonth, targetYear, startFromMonth, expectedWajibNominal, accumulatedTemplate, setup]);

  // 5. Generator Kuitansi Digital WhatsApp State
  const [kuitansiForm, setKuitansiForm] = useState<{
    jenis: 'Simpanan' | 'Angsuran' | 'Pencairan' | 'Warung' | 'Registrasi';
    selectedMemberId: string;
    nominal: number;
    keterangan: string;
    noKuitansi: string;
    tanggal: string;
  }>({
    jenis: 'Simpanan',
    selectedMemberId: members[0]?.id || '',
    nominal: 100000,
    keterangan: 'Setoran Simpanan Wajib & Sukarela',
    noKuitansi: `KWT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`,
    tanggal: today.toISOString().split('T')[0]
  });

  const selectedKuitansiMember = useMemo(() => {
    return members.find(m => m.id === kuitansiForm.selectedMemberId) || members[0];
  }, [members, kuitansiForm.selectedMemberId]);

  // Generated Digital WhatsApp Receipt Message
  const generatedReceiptWhatsAppText = useMemo(() => {
    if (!selectedKuitansiMember) return '';
    const kop = setup.namaKoperasi || "Koperasi Dana Segar";
    const noAnggota = selectedKuitansiMember.noAnggota || '-';
    const nominalRp = formatRupiah(kuitansiForm.nominal);
    const nominalTerbilang = terbilang(kuitansiForm.nominal) + " Rupiah";
    const tglFormatted = new Date(kuitansiForm.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let iconHeader = '🧾';
    if (kuitansiForm.jenis === 'Simpanan') iconHeader = '💰';
    if (kuitansiForm.jenis === 'Angsuran') iconHeader = '💳';
    if (kuitansiForm.jenis === 'Pencairan') iconHeader = '🤝';
    if (kuitansiForm.jenis === 'Warung') iconHeader = '🛒';

    return `${iconHeader} *KUITANSI DIGITAL RESMI ${kop.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📄 *No. Kuitansi:* \`${kuitansiForm.noKuitansi}\`
📅 *Tanggal:* ${tglFormatted}
👤 *Telah Diterima Dari:*
     *${selectedKuitansiMember.nama}*
     No. Anggota: *${noAnggota}*
💵 *Jumlah Pembayaran:*
     *${nominalRp}*
     (_${nominalTerbilang}_)
📝 *Untuk Keperluan:*
     ${kuitansiForm.keterangan}

✅ *STATUS:* *LUNAS & TERCATAT RESMI DI SISTEM*
━━━━━━━━━━━━━━━━━━━━
_Kuitansi digital ini merupakan bukti transaksi sah yang diterbitkan otomatis oleh sistem keuangan ${kop}._
_Simpan pesan ini sebagai bukti pembayaran Anda._
🙏 Terima Kasih atas partisipasi dan kepercayaannya.`;
  }, [kuitansiForm, selectedKuitansiMember, setup]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-emerald-300" />
                WhatsApp Gateway & Notifikasi Tagihan
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                {members.length} Anggota Aktif
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>WhatsApp Center & Kuitansi Digital</span>
              <span className="text-emerald-300 font-extrabold">{setup.namaKoperasi || "Koperasi Dana Segar"}</span>
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Otomatisasi pengiriman notifikasi pengingat iuran wajib, jatuh tempo kredit, kasbon warung, generator kuitansi pembayaran resmi ke WhatsApp, dan rekap log pengiriman.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsEditingTemplates(!isEditingTemplates)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isEditingTemplates ? 'Tutup Pengaturan Template' : 'Kustomisasi Template WA'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 border-t border-emerald-700/50 pt-3 text-xs">
          <button
            onClick={() => setSubTab('wajib')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'wajib'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Tagihan Simpanan Wajib ({unpaidWajibList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('pinjaman')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'pinjaman'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Angsuran Pinjaman ({unpaidPinjamanList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('warung')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'warung'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Piutang Warung / Kasbon ({unpaidWarungList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('gabungan')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'gabungan'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tagihan Terpadu ({combinedList.length})</span>
          </button>
          <button
            onClick={() => setSubTab('kuitansi')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'kuitansi'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Generator Kuitansi Digital WA</span>
          </button>
          <button
            onClick={() => setSubTab('logs')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'logs'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-emerald-100 hover:bg-emerald-700/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Log Pengiriman ({whatsAppLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TEMPLATE EDITOR EXPANDABLE PANEL */}
      <AnimatePresence>
        {isEditingTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-emerald-600" />
                  Pengaturan Format Template Pesan WhatsApp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gunakan token pengganti otomatis seperti: <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">[Nama]</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">[Nominal]</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">[DaftarBulan]</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">[TanggalJatuhTempo]</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetTemplates}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
                >
                  Reset Default
                </button>
                <button
                  onClick={saveTemplates}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Simpan Template
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Template Pengingat Simpanan Wajib</label>
                <textarea
                  rows={6}
                  value={wajibTemplate}
                  onChange={(e) => setWajibTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Template Angsuran Pinjaman</label>
                <textarea
                  rows={6}
                  value={pinjamanTemplate}
                  onChange={(e) => setPinjamanTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Template Tagihan Piutang Warung / Kasbon</label>
                <textarea
                  rows={6}
                  value={warungTemplate}
                  onChange={(e) => setWarungTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Template Tagihan Terpadu (Gabungan)</label>
                <textarea
                  rows={6}
                  value={accumulatedTemplate}
                  onChange={(e) => setAccumulatedTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-[11.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & CONTROL BAR (For Wajib, Pinjaman, Warung, Gabungan) */}
      {(subTab === 'wajib' || subTab === 'pinjaman' || subTab === 'warung' || subTab === 'gabungan') && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {(subTab === 'wajib' || subTab === 'pinjaman' || subTab === 'gabungan') && (
              <>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                  <span className="text-slate-500 font-medium">Bulan Berjalan / Target:</span>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(Number(e.target.value))}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                  <span className="text-slate-500 font-medium">Tahun:</span>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                  >
                    {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {subTab === 'wajib' && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-500 font-medium">Iuran/Bulan:</span>
                <input
                  type="number"
                  value={expectedWajibNominal}
                  onChange={(e) => setExpectedWajibNominal(Number(e.target.value))}
                  className="w-20 bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none text-right"
                />
              </div>
            )}

            {subTab === 'pinjaman' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] font-semibold">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Akumulasi: Angsuran ke-1 s/d {MONTH_NAMES[targetMonth - 1]} {targetYear}</span>
              </div>
            )}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 1: SIMPANAN WAJIB */}
      {subTab === 'wajib' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Daftar Tagihan Simpanan Wajib Tertunggak ({unpaidWajibList.length} Anggota)
            </h3>
            <span className="text-xs text-slate-500">
              Total Tunggakan: <strong className="text-slate-900 dark:text-white font-bold">{formatRupiah(unpaidWajibList.reduce((s, u) => s + u.totalNominal, 0))}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Anggota & No. HP</th>
                  <th className="p-3.5">Bulan Tertunggak</th>
                  <th className="p-3.5 text-center">Jml Bulan</th>
                  <th className="p-3.5 text-right">Total Tagihan</th>
                  <th className="p-3.5 text-center w-36">Aksi WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {unpaidWajibList.filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-200">Semua Anggota Telah Membayar Simpanan Wajib!</p>
                      <p className="text-[11px] text-slate-400 mt-1">Tidak ada tunggakan simpanan wajib s/d bulan {MONTH_NAMES[targetMonth - 1]} {targetYear}.</p>
                    </td>
                  </tr>
                ) : (
                  unpaidWajibList
                    .filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={item.member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{item.member.nama}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>No: {item.member.noAnggota}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.member.noHp || 'Tidak ada No. HP'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px]">
                            {item.unpaidMonthsString}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.unpaidMonthsCount} Bulan
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatRupiah(item.totalNominal)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCopyMessage(item.messagePreview, { name: item.member.nama, anggotaId: item.member.id, phone: item.member.noHp, jenisPesan: 'Tagihan Simpanan Wajib' })}
                              className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
                              title="Salin Teks Pesan"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveReminder({ phone: item.member.noHp, message: item.messagePreview, name: item.member.nama, anggotaId: item.member.id, jenisPesan: 'Tagihan Simpanan Wajib' })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim WA</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ANGSURAN PINJAMAN */}
      {subTab === 'pinjaman' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Jadwal Angsuran & Tagihan Jatuh Tempo ({unpaidPinjamanList.length} Debitur Aktif)
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500">
                Bulan Berjalan: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{MONTH_NAMES[targetMonth - 1]} {targetYear}</strong>
              </span>
              <span className="text-xs text-slate-500">
                Total Tagihan Akumulatif: <strong className="text-slate-900 dark:text-white font-bold">{formatRupiah(unpaidPinjamanList.reduce((s, u) => s + u.amountDue, 0))}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Debitur & No. HP</th>
                  <th className="p-3.5">Angsuran Ke</th>
                  <th className="p-3.5">Tanggal Jatuh Tempo</th>
                  <th className="p-3.5">Status Waktu</th>
                  <th className="p-3.5 text-right">Nominal Tagihan</th>
                  <th className="p-3.5 text-center w-36">Aksi WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {unpaidPinjamanList.filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-200">Tidak Ada Angsuran Pinjaman Tertunggak!</p>
                    </td>
                  </tr>
                ) : (
                  unpaidPinjamanList
                    .filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={item.loan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3.5">
                          {onNavigateToPinjaman ? (
                            <button
                              type="button"
                              onClick={() => onNavigateToPinjaman(item.loan.id, item.member.id, item.member.nama)}
                              className="text-left group cursor-pointer"
                              title={`Buka Akad Kredit Pinjaman - ${item.member.nama} (${item.loan.id})`}
                            >
                              <div className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-800 dark:group-hover:text-indigo-200 group-hover:underline flex items-center gap-1.5 transition-colors">
                                <span>{item.member.nama}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{item.member.noHp || '-'}</span>
                                <span className="text-[10px] text-indigo-500/90 dark:text-indigo-400/90 font-mono bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                                  Akad: {item.loan.id}
                                </span>
                              </div>
                            </button>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{item.member.nama}</div>
                              <div className="text-[11px] text-slate-500">{item.member.noHp || '-'}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.angsuranLabel}</span>
                            <span className="text-slate-400 font-normal">/ {item.loan.tenor}</span>
                            {item.unpaidCount > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Akumulasi {item.unpaidCount} Bln
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          <div>{item.formattedDueDate}</div>
                          {item.unpaidCount > 1 && (
                            <div className="text-[10px] text-slate-400">Jatuh tempo awal</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                              : item.daysRemaining <= 3
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          }`}>
                            {item.statusLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-white text-sm">
                          <div>{formatRupiah(item.amountDue)}</div>
                          {item.unpaidCount > 1 && (
                            <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                              {item.unpaidCount} × {formatRupiah(item.loan.totalAngsuranPerBulan)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCopyMessage(item.messagePreview, { name: item.member.nama, anggotaId: item.member.id, phone: item.member.noHp, jenisPesan: 'Tagihan Angsuran Pinjaman' })}
                              className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
                              title="Salin Teks Pesan"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveReminder({ phone: item.member.noHp, message: item.messagePreview, name: item.member.nama, anggotaId: item.member.id, jenisPesan: 'Tagihan Angsuran Pinjaman' })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim WA</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PIUTANG WARUNG / KASBON */}
      {subTab === 'warung' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              Daftar Tagihan Kasbon Warung & Kantin Koperasi ({unpaidWarungList.length} Anggota)
            </h3>
            <span className="text-xs text-slate-500">
              Total Kasbon Belum Lunas: <strong className="text-slate-900 dark:text-white font-bold">{formatRupiah(unpaidWarungList.reduce((s, u) => s + u.totalPiutang, 0))}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Anggota & No. HP</th>
                  <th className="p-3.5">Catatan Belanja / Item</th>
                  <th className="p-3.5 text-center">Frekuensi</th>
                  <th className="p-3.5 text-right">Saldo Kasbon</th>
                  <th className="p-3.5 text-center w-36">Aksi WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {unpaidWarungList.filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-200">Seluruh Piutang Warung Telah Lunas!</p>
                    </td>
                  </tr>
                ) : (
                  unpaidWarungList
                    .filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, idx) => (
                      <tr key={item.member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{item.member.nama}</div>
                          <div className="text-[11px] text-slate-500">{item.member.noHp || '-'}</div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium max-w-xs truncate">
                          {item.keteranganTransaksi}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {item.jumlahTransaksi}x Transaksi
                        </td>
                        <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatRupiah(item.totalPiutang)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCopyMessage(item.messagePreview, { name: item.member.nama, anggotaId: item.member.id, phone: item.member.noHp, jenisPesan: 'Tagihan Piutang Warung' })}
                              className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
                              title="Salin Pesan"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveReminder({ phone: item.member.noHp, message: item.messagePreview, name: item.member.nama, anggotaId: item.member.id, jenisPesan: 'Tagihan Piutang Warung' })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Kirim WA</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: TAGIHAN TERPADU (GABUNGAN) */}
      {subTab === 'gabungan' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Tagihan Terpadu (Simpanan Wajib + Pinjaman + Warung) ({combinedList.length} Anggota)
            </h3>
            <span className="text-xs text-slate-500">
              Total Tagihan Akumulasi: <strong className="text-slate-900 dark:text-white font-bold">{formatRupiah(combinedList.reduce((s, u) => s + u.totalAkumulasi, 0))}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Anggota & No. HP</th>
                  <th className="p-3.5 text-right">Simpanan Wajib</th>
                  <th className="p-3.5 text-right">Angsuran Pinjaman</th>
                  <th className="p-3.5 text-right">Kasbon Warung</th>
                  <th className="p-3.5 text-right">Total Akumulasi</th>
                  <th className="p-3.5 text-center w-36">Aksi WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {combinedList.filter(u => !searchQuery || u.member.nama.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
                  <tr key={item.member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                    <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3.5">
                      {item.loanObj && onNavigateToPinjaman ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToPinjaman(item.loanObj?.id, item.member.id, item.member.nama)}
                          className="text-left group cursor-pointer"
                          title={`Buka Akad Kredit Pinjaman - ${item.member.nama} (${item.loanObj.id})`}
                        >
                          <div className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-800 dark:group-hover:text-indigo-200 group-hover:underline flex items-center gap-1.5 transition-colors">
                            <span>{item.member.nama}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{item.member.noHp || '-'}</span>
                            <span className="text-[10px] text-indigo-500/90 dark:text-indigo-400/90 font-mono bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                              Akad: {item.loanObj.id}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.member.nama}</div>
                          <div className="text-[11px] text-slate-500">{item.member.noHp || '-'}</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatRupiah(item.wajibNominal)}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatRupiah(item.loanNominal)}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatRupiah(item.warungNominal)}
                    </td>
                    <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatRupiah(item.totalAkumulasi)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCopyMessage(item.messagePreview, { name: item.member.nama, anggotaId: item.member.id, phone: item.member.noHp, jenisPesan: 'Tagihan Gabungan' })}
                          className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
                          title="Salin Pesan"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveReminder({ phone: item.member.noHp, message: item.messagePreview, name: item.member.nama, anggotaId: item.member.id, jenisPesan: 'Tagihan Gabungan' })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim WA</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: GENERATOR KUITANSI DIGITAL WHATSAPP */}
      {subTab === 'kuitansi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Kuitansi Builder */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Form Generator Kuitansi WhatsApp
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                No: {kuitansiForm.noKuitansi}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Jenis Transaksi */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Jenis Transaksi Kuitansi</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'Simpanan', label: 'Simpanan', icon: Wallet },
                    { id: 'Angsuran', label: 'Angsuran', icon: CreditCard },
                    { id: 'Pencairan', label: 'Pencairan', icon: ArrowUpRight },
                    { id: 'Warung', label: 'Warung', icon: Store },
                    { id: 'Registrasi', label: 'Registrasi', icon: User }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        let defaultKet = 'Setoran Simpanan Wajib & Sukarela';
                        let defaultNom = 100000;
                        if (t.id === 'Angsuran') { defaultKet = 'Pembayaran Angsuran Pinjaman'; defaultNom = 500000; }
                        if (t.id === 'Pencairan') { defaultKet = 'Pencairan Pinjaman Kredit Anggota'; defaultNom = 2000000; }
                        if (t.id === 'Warung') { defaultKet = 'Pelunasan Kasbon Belanja Warung / Kantin'; defaultNom = 50000; }
                        if (t.id === 'Registrasi') { defaultKet = 'Biaya Administrasi & Simpanan Pokok Anggota Baru'; defaultNom = 100000; }

                        setKuitansiForm({
                          ...kuitansiForm,
                          jenis: t.id as any,
                          keterangan: defaultKet,
                          nominal: defaultNom
                        });
                      }}
                      className={`py-2 px-2 rounded-xl font-bold transition text-center flex flex-col items-center gap-1 ${
                        kuitansiForm.jenis === t.id 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      <span className="text-[10.5px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih Anggota */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Pilih Anggota Penerima Kuitansi</label>
                <select
                  value={kuitansiForm.selectedMemberId}
                  onChange={(e) => setKuitansiForm({ ...kuitansiForm, selectedMemberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nama} (No: {m.noAnggota}) - HP: {m.noHp || 'No HP (-) '}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nominal Pembayaran (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={kuitansiForm.nominal}
                      onChange={(e) => setKuitansiForm({ ...kuitansiForm, nominal: Number(e.target.value) })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={kuitansiForm.tanggal}
                    onChange={(e) => setKuitansiForm({ ...kuitansiForm, tanggal: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Terbilang Preview */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300">
                <strong>Terbilang:</strong> <em>"{terbilang(kuitansiForm.nominal)} Rupiah"</em>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Keterangan / Keperluan Pembayaran</label>
                <input
                  type="text"
                  value={kuitansiForm.keterangan}
                  onChange={(e) => setKuitansiForm({ ...kuitansiForm, keterangan: e.target.value })}
                  placeholder="contoh: Setoran Simpanan Wajib Bulan September 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    const newNo = `KWT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
                    setKuitansiForm({ ...kuitansiForm, noKuitansi: newNo });
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Ganti No. Kuitansi
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Preview: WhatsApp Message */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#0b141a] text-slate-100 rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    WA
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Pratinjau Kuitansi WhatsApp</h4>
                    <p className="text-[10px] text-emerald-400">Penerima: {selectedKuitansiMember?.nama || '-'}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                  Ready to Dispatch
                </span>
              </div>

              {/* Message Box Styled as WhatsApp Bubble */}
              <div className="bg-[#1f2c34] text-[#e9edef] p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-700/50 shadow-inner">
                {generatedReceiptWhatsAppText}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleCopyMessage(generatedReceiptWhatsAppText, {
                    name: selectedKuitansiMember?.nama,
                    anggotaId: selectedKuitansiMember?.id,
                    phone: selectedKuitansiMember?.noHp,
                    jenisPesan: kuitansiForm.jenis === 'Simpanan' ? 'Kuitansi Setoran Simpanan' : kuitansiForm.jenis === 'Angsuran' ? 'Kuitansi Angsuran' : kuitansiForm.jenis === 'Pencairan' ? 'Kuitansi Pencairan Pinjaman' : 'Kuitansi Pelunasan Warung'
                  })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Tersalin!' : 'Salin Kuitansi'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!selectedKuitansiMember?.noHp) {
                      alert("Nomor HP anggota tidak tersedia. Silakan lengkapi profil anggota terlebih dahulu.");
                      return;
                    }
                    sendWhatsApp(selectedKuitansiMember.noHp, generatedReceiptWhatsAppText, {
                      name: selectedKuitansiMember.nama,
                      anggotaId: selectedKuitansiMember.id,
                      jenisPesan: kuitansiForm.jenis === 'Simpanan' ? 'Kuitansi Setoran Simpanan' : kuitansiForm.jenis === 'Angsuran' ? 'Kuitansi Angsuran' : kuitansiForm.jenis === 'Pencairan' ? 'Kuitansi Pencairan Pinjaman' : 'Kuitansi Pelunasan Warung'
                    });
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Kuitansi ke WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: RIWAYAT & LOG PENGIRIMAN WHATSAPP GATEWAY */}
      {subTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Riwayat Pengiriman & Log Notifikasi WhatsApp Gateway ({whatsAppLogs.length} Pesan)
            </h3>
            <span className="text-xs text-slate-500">
              Mencatat seluruh notifikasi tagihan dan kuitansi yang pernah dikirim/disalin.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Waktu Pengiriman</th>
                  <th className="p-3.5">Penerima & No. HP</th>
                  <th className="p-3.5">Jenis Notifikasi</th>
                  <th className="p-3.5">Ringkasan Pesan</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {whatsAppLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-200">Belum Ada Riwayat Notifikasi</p>
                      <p className="text-[11px] text-slate-400 mt-1">Setiap pengiriman pesan atau kuitansi WhatsApp akan tercatat otomatis di sini.</p>
                    </td>
                  </tr>
                ) : (
                  whatsAppLogs.map((log, idx) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                      <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{log.namaPenerima}</div>
                        <div className="text-[11px] text-slate-500">{log.nomorHp}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          {log.jenisPesan}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]">
                        {log.pesanText}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 w-max mx-auto">
                          <CheckCheck className="w-3 h-3 text-emerald-500" />
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setActiveReminder({ phone: log.nomorHp, message: log.pesanText, name: log.namaPenerima, anggotaId: log.anggotaId, jenisPesan: log.jenisPesan })}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                            title="Kirim Ulang Pesan"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteWhatsAppLog && (
                            <button
                              onClick={() => onDeleteWhatsAppLog(log.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Hapus Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  Kirim Pesan WhatsApp ({activeReminder.jenisPesan || 'Tagihan'})
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
                    Anda dapat mengedit isi pesan di bawah ini sebelum dikirimkan ke nomor WhatsApp penerima.
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
                  onClick={() => handleCopyMessage(activeReminder.message, { name: activeReminder.name, anggotaId: activeReminder.anggotaId, phone: activeReminder.phone, jenisPesan: activeReminder.jenisPesan })}
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
                    sendWhatsApp(activeReminder.phone, activeReminder.message, {
                      name: activeReminder.name,
                      anggotaId: activeReminder.anggotaId,
                      jenisPesan: activeReminder.jenisPesan
                    });
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
