import React, { useState, useMemo } from 'react';
import { Member, Simpanan, Pinjaman, Angsuran, ManasukaBungaLog, KoperasiSetup, PengajuanPinjaman, PengurusPengawas } from '../types';
import { formatRupiah, terbilang, getTransactionTime } from '../utils/finance';
import { 
  Users, UserPlus, FileText, Wallet, CircleDollarSign, 
  HandCoins, Key, Calendar, Send, CheckCircle2, AlertCircle, Trash2, Edit, Search, Plus, Filter, Phone, ArrowUpRight, Receipt, Eye, X,
  Printer, Upload, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';

// ================= MEMBERS MANAGEMENT (MANAJEMEN ANGGOTA) =================
interface AnggotaProps {
  setup?: KoperasiSetup;
  pengurusPengawas?: PengurusPengawas[];
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  onAddMember: (m: Omit<Member, 'id'>) => void;
  onEditMember: (m: Member) => void;
  onDeleteMember: (id: string) => void;
  onDeleteAngsuran?: (id: string) => void;
  onDeleteSimpanan?: (id: string) => void;
  onEditSimpanan?: (updated: Simpanan) => void;
}

export function AnggotaView({ setup, pengurusPengawas, members, simpanan, pinjaman, angsuran, onAddMember, onEditMember, onDeleteMember, onDeleteAngsuran, onDeleteSimpanan, onEditSimpanan }: AnggotaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const namaKetua = useMemo(() => {
    const ketuaObj = (pengurusPengawas || []).find(p => 
      p.jabatan === 'pengurus' && 
      (p.peranDetail || '').toLowerCase().includes('ketua')
    );
    return ketuaObj ? ketuaObj.nama : 'H. Ahmad Sutejo, S.E.';
  }, [pengurusPengawas]);

  // New Member Form States
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [joined, setJoined] = useState(new Date().toISOString().substring(0,10));
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [pekerjaan, setPekerjaan] = useState('Guru');
  const [fotoUrl, setFotoUrl] = useState('');

  // Ledger detail member
  const [selectedLedgerMember, setSelectedLedgerMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [previewMemberCard, setPreviewMemberCard] = useState<Member | null>(null);
  const [verificationWA, setVerificationWA] = useState<{
    member: Member;
    nextCode: string;
    messageText: string;
  } | null>(null);

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
    if (window.confirm("Apakah Anda yakin ingin menghapus catatan simpanan ini? Tindakan ini akan menghapus data permanen dari database.")) {
      onDeleteSimpanan(id);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.noAnggota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.noHp.includes(searchTerm)
    );
  }, [members, searchTerm]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !noHp.trim()) return;
    
    // Generate simple incremental code
    const lastNum = members.length > 0 
      ? parseInt(members[members.length - 1].noAnggota.replace('AG', '')) 
      : 0;
    const nextCode = `AG${String(lastNum + 1).padStart(3, '0')}`;

    onAddMember({
      noAnggota: nextCode,
      nama,
      alamat: alamat || 'Alamat tidak diisikan',
      noHp,
      tanggalBergabung: joined,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      pekerjaan,
      fotoUrl
    });

    setNama('');
    setAlamat('');
    setNoHp('');
    setJenisKelamin('Laki-laki');
    setTempatLahir('');
    setTanggalLahir('');
    setPekerjaan('Guru');
    setFotoUrl('');
    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.nama.trim() || !editingMember.noHp.trim()) return;
    onEditMember(editingMember);
    setEditingMember(null);
  };

  const handleAddFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFotoUrl(compressed);
      } catch (err) {
        console.error("Error compressing image:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setFotoUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleEditFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingMember) {
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
        setEditingMember({ ...editingMember, fotoUrl: compressed });
      } catch (err) {
        console.error("Error compressing image:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setEditingMember({ ...editingMember, fotoUrl: event.target.result as string });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handlePrintLedger = (
    member: Member, 
    savings: Simpanan[], 
    loans: Pinjaman[], 
    fin: ReturnType<typeof getMemberFinancialInfo>
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Simpan Pinjam Dana Segar";
    const logoUrl = setup?.logoUrl;
    const slogan = setup?.slogan || "Membantu Kesejahteraan Anggota";
    const Alamat = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const bhId = setup?.noBadanHukum ? `Badan Hukum No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';

    const savingsRows = savings.map(s => {
      const isPenarikan = s.jumlah < 0;
      const transName = isPenarikan ? 'Penarikan Sukarela' : `Simpanan ${s.jenis}`;
      const amountStr = isPenarikan ? `-${formatRupiah(Math.abs(s.jumlah))}` : formatRupiah(s.jumlah);
      const colorStyle = isPenarikan ? 'color: #dc2626;' : 'color: #059669;';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${s.tanggal}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${transName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #4a5568;">${s.keterangan || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; ${colorStyle}">${amountStr}</td>
        </tr>
      `;
    }).join('');

    const loanRows = loans.map(p => {
      const pPaid = angsuran.filter(a => a.pinjamanId === p.id).reduce((acc, c) => acc + c.jumlahBayar, 0);
      const remaining = p.status === 'Lunas' ? 0 : Math.max(0, Math.round(p.nominalPinjaman - (pPaid * (p.nominalPinjaman / p.totalWajibBayar))));
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${p.tanggal}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">#${p.id.substring(0, 8)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${formatRupiah(p.nominalPinjaman)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.tenor} Bln</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; color: #0284c7;">${formatRupiah(pPaid)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; color: #e11d48;">${formatRupiah(remaining)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;"><span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; ${p.status === 'Lunas' ? 'background-color: #ecfdf5; color: #065f46;' : 'background-color: #fff1f2; color: #9f1239;'}">${p.status}</span></td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>LEDGER_${member.noAnggota}_${member.nama.toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              background-color: #fff;
              line-height: 1.5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 20px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header img {
              height: 60px;
              width: 60px;
              border-radius: 50%;
              object-fit: cover;
            }
            .header-info h1 {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .header-info p {
              margin: 2px 0 0 0;
              font-size: 11px;
              color: #475569;
            }
            .title {
              text-align: center;
              margin-bottom: 25px;
            }
            .title h2 {
              font-size: 16px;
              font-weight: 700;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #cbd5e1;
              display: inline-block;
              padding-bottom: 5px;
            }
            .profile-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .profile-item {
              display: flex;
            }
            .profile-label {
              width: 130px;
              font-weight: 600;
              color: #64748b;
            }
            .profile-value {
              font-weight: 700;
              color: #0f172a;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              margin-bottom: 35px;
            }
            .card {
              border: 1px solid #e2e8f0;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              background-color: #f8fafc;
            }
            .card p {
              margin: 0;
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .card h3 {
              margin: 8px 0 0 0;
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f172a;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 6px;
              margin-top: 30px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 25px;
            }
            th {
              background-color: #f1f5f9;
              padding: 8px;
              text-align: left;
              font-weight: 600;
              color: #475569;
              border-bottom: 1.5px solid #cbd5e1;
            }
            .no-data {
              padding: 15px;
              text-align: center;
              color: #94a3b8;
              font-style: italic;
              border-bottom: 1px solid #e2e8f0;
            }
            .footer-sig {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              font-size: 12px;
              text-align: center;
            }
            .sig-col {
              width: 220px;
            }
            .sig-space {
              height: 60px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            <div class="header">
              ${logoUrl && logoUrl.startsWith('data:image') 
                ? `<img src="${logoUrl}" />` 
                : `<span style="font-size: 32px; display: inline-block; vertical-align: middle;">🌱</span>`}
              <div class="header-info">
                <h1>${kopName}</h1>
                <p style="font-weight: bold; margin: 2px 0;">${bhId}</p>
                <p style="margin: 2px 0;">${slogan}</p>
                <p style="font-size: 9px; color: #64748b; margin: 2px 0;">${Alamat}</p>
              </div>
            </div>

            <div class="title">
              <h2>Buku Ledger Mutasi Anggota</h2>
            </div>

            <div class="profile-grid">
              <div>
                <div class="profile-item" style="margin-bottom: 8px;">
                  <span class="profile-label">No. Anggota</span>
                  <span class="profile-value">: ${member.noAnggota}</span>
                </div>
                <div class="profile-item" style="margin-bottom: 8px;">
                  <span class="profile-label">Nama Lengkap</span>
                  <span class="profile-value">: ${member.nama}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">No. Telepon</span>
                  <span class="profile-value">: ${member.noHp}</span>
                </div>
              </div>
              <div>
                <div class="profile-item" style="margin-bottom: 8px;">
                  <span class="profile-label">Tanggal Gabung</span>
                  <span class="profile-value">: ${member.tanggalBergabung}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Alamat Tinggal</span>
                  <span class="profile-value">: ${member.alamat || '-'}</span>
                </div>
              </div>
            </div>

            <div class="summary-cards">
              <div class="card">
                <p>Simpanan Pokok & Wajib</p>
                <h3>${formatRupiah(fin.totalPokok + fin.totalWajib)}</h3>
              </div>
              <div class="card">
                <p>Simpanan Sukarela</p>
                <h3 style="color: #059669;">${formatRupiah(fin.totalSukarela)}</h3>
              </div>
              <div class="card">
                <p>Pinjaman Aktif Beredar</p>
                <h3 style="color: #e11d48;">${formatRupiah(fin.totalPinjamanBeredar)}</h3>
              </div>
            </div>

            <div class="section-title">Histori Mutasi Tabungan / Simpanan</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 120px;">Tanggal</th>
                  <th style="width: 150px;">Jenis Tabungan</th>
                  <th>Keterangan</th>
                  <th style="text-align: right; width: 140px;">Jumlah Setor</th>
                </tr>
              </thead>
              <tbody>
                ${savingsRows || '<tr><td colspan="4" class="no-data">Belum ada mutasi tabungan terdaftar</td></tr>'}
              </tbody>
            </table>

            <div class="section-title">Histori Kontrak Pembiayaan / Pinjaman</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 110px;">Tgl Kontrak</th>
                  <th style="width: 100px;">No Kontrak</th>
                  <th style="text-align: right; width: 120px;">Plafond Pinjaman</th>
                  <th style="text-align: center; width: 85px;">Tenor</th>
                  <th style="text-align: right; width: 120px;">Terbayar</th>
                  <th style="text-align: right; width: 120px;">Sisa Piutang</th>
                  <th style="text-align: center; width: 80px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${loanRows || '<tr><td colspan="7" class="no-data">Belum ada kontrak pinjaman terdaftar</td></tr>'}
              </tbody>
            </table>

            <div style="font-size: 10px; color: #64748b; text-align: center; margin-top: 35px; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
              Laporan ledger ini dicetak dan disinkronisasi secara otoritatif pada ${new Date().toLocaleString('id-ID')}
            </div>

            <div class="footer-sig">
              <div class="sig-col">
                <p>Pemilik Rekening / Anggota</p>
                <div class="sig-space"></div>
                <p><b>( ${member.nama} )</b></p>
              </div>
              <div class="sig-col">
                <p>Petugas Administrasi Koperasi</p>
                <div class="sig-space"></div>
                <p><b>( ............................... )</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  };

  const handlePrintMemberCard = (member: Member) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }

    const kopName = setup?.namaKoperasi || "Koperasi Sekolah Abdi Negara";
    const logoUrl = setup?.logoUrl;
    const slogan = setup?.slogan || "Membantu Kesejahteraan Bersama";
    const alamat = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const bhId = setup?.noBadanHukum ? `BH No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';

    // Formatted dates
    const formatDateIndo = (dateStr?: string) => {
      if (!dateStr) return '-';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const formattedTtl = `${member.tempatLahir || '-'}${member.tanggalLahir ? `, ${formatDateIndo(member.tanggalLahir)}` : ''}`;
    const formattedJoinDate = formatDateIndo(member.tanggalBergabung);

    // Profile photo logic
    const photoImg = member.fotoUrl 
      ? `<img src="${member.fotoUrl}" class="photo" alt="Pas Foto" />`
      : `<div class="photo-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span>FOTO 3X4</span>
        </div>`;

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" class="card-logo" />`
      : `<div class="card-logo-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99z" />
          </svg>
        </div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>KARTU_ANGGOTA_${member.noAnggota}_${member.nama.toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600&display=swap');
            
            body {
              font-family: 'Inter', sans-serif;
              padding: 40px;
              background-color: #f1f5f9;
              color: #1e293b;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 30px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-btn {
              padding: 10px 24px;
              background-color: #059669;
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              transition: background-color 0.2s;
            }
            .print-btn:hover {
              background-color: #047857;
            }

            /* Container for Cards */
            .cards-container {
              display: flex;
              flex-direction: column;
              gap: 40px;
            }

            @media (min-width: 1024px) {
              .cards-container {
                flex-direction: row;
              }
            }

            /* ID Card CSS Standard */
            .id-card {
              width: 85.6mm;
              height: 53.98mm;
              border-radius: 4.2mm; /* ISO standard standard radius */
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
              font-size: 12px;
              background-color: #ffffff;
            }

            /* FRONT DESIGN */
            .card-front {
              background: ${setup?.kartuBgUrl ? `url('${setup.kartuBgUrl}') center center / cover no-repeat` : 'linear-gradient(135deg, #0b4f3c 0%, #063125 100%)'};
              color: ${setup?.kartuBgUrl ? '#1e293b' : '#ffffff'};
              padding: 3.5mm 4mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 0.5mm solid rgba(0,0,0,0.2);
            }

            ${setup?.kartuBgUrl ? `
            .card-front::after {
              display: none;
            }
            ` : `
            .card-front::after {
              content: '';
              position: absolute;
              bottom: -50px;
              right: -50px;
              width: 120px;
              height: 120px;
              background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
              border-radius: 50%;
            }
            `}

            /* FRONT HEADER */
            .card-header {
              display: flex;
              align-items: center;
              gap: 2.5mm;
              border-bottom: 0.3mm solid ${setup?.kartuBgUrl ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)'};
              padding-bottom: 1.5mm;
              height: 11mm;
            }

            .card-logo {
              width: 9mm;
              height: 9mm;
              border-radius: 50%;
              object-fit: cover;
              background-color: #ffffff;
              padding: 0.5mm;
              box-sizing: border-box;
              flex-shrink: 0;
            }

            .card-logo-placeholder {
              width: 9mm;
              height: 9mm;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.1);
              color: inherit;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .card-logo-placeholder svg {
              width: 5mm;
              height: 5mm;
            }

            .header-text {
              flex-grow: 1;
              min-w: 0;
            }

            .kop-name {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 8.5pt;
              font-weight: 700;
              color: inherit;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.2px;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .kop-sub {
              font-size: 5pt;
              color: ${setup?.kartuBgUrl ? '#475569' : '#34d399'};
              margin: 0;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            /* FRONT BODY */
            .card-body {
              display: flex;
              gap: 3.5mm;
              flex-grow: 1;
              padding-top: 2.5mm;
              height: 31mm;
              box-sizing: border-box;
            }

            /* Portrait photo box ratio standard 3x4 */
            .photo-box {
              width: 19.5mm;
              height: 26mm;
              border-radius: 1mm;
              border: 0.4mm solid rgba(255, 255, 255, 0.2);
              background-color: #f1f5f9;
              overflow: hidden;
              flex-shrink: 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
              position: relative;
            }

            .photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .photo-placeholder {
              width: 100%;
              height: 100%;
              background-color: #cbd5e1;
              color: #64748b;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 4pt;
              font-weight: 700;
              gap: 1mm;
            }

            .photo-placeholder svg {
              width: 6mm;
              height: 6mm;
              opacity: 0.7;
            }

            /* Metadata rows */
            .meta-details {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-width: 0;
            }

            .member-no-tag {
              background-color: ${setup?.kartuBgUrl ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.15)'};
              font-family: 'JetBrains Mono', monospace;
              font-size: 7.5pt;
              font-weight: 800;
              padding: 0.5mm 1.5mm;
              border-radius: 0.6mm;
              letter-spacing: 0.5px;
              color: ${setup?.kartuBgUrl ? '#1d4ed8' : '#34d399'};
              display: inline-block;
              width: fit-content;
              margin-bottom: 1.2mm;
              border: 0.2mm solid ${setup?.kartuBgUrl ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.25)'};
            }

            .member-name-print {
              font-size: 8.5pt;
              font-weight: 800;
              letter-spacing: -0.1px;
              color: inherit;
              text-transform: uppercase;
              margin-top: 0.5mm;
              margin-bottom: 1.5mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.1;
            }

            .member-fields {
              display: flex;
              flex-direction: column;
              gap: 0.8mm;
            }

            .field-row {
              display: flex;
              align-items: center;
              font-size: 6pt;
              line-height: 1.25;
              color: inherit;
            }

            .field-label {
              width: 17mm;
              flex-shrink: 0;
              font-weight: 700;
              color: ${setup?.kartuBgUrl ? '#475569' : '#a7f3d0'};
              text-transform: uppercase;
              font-size: 5pt;
              letter-spacing: 0.2px;
            }

            .field-colon {
              width: 1.5mm;
              flex-shrink: 0;
              font-weight: 700;
              color: inherit;
              opacity: 0.8;
            }

            .field-val {
              font-weight: 600;
              color: inherit;
              flex-grow: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            /* FRONT FOOTER */
            .card-footer {
              height: 4mm;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 5pt;
              color: inherit;
              opacity: 0.85;
              border-top: 0.2mm solid ${setup?.kartuBgUrl ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)'};
              padding-top: 1mm;
              box-sizing: border-box;
            }

            /* BACK DESIGN */
            .card-back {
              background-color: #fafafa;
              color: #334155;
              padding: 4mm 5mm;
              border: 0.5mm solid #cbd5e1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              width: 85.6mm;
              height: 53.98mm;
              border-radius: 4.2mm;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
            }

            .back-header {
              font-family: 'Space Grotesk', sans-serif;
              font-weight: 700;
              font-size: 7.5pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 0.4mm solid #e2e8f0;
              padding-bottom: 1mm;
              color: #047857;
            }

            .back-content {
              font-size: 5.5pt;
              line-height: 1.3;
              color: #475569;
              margin-top: 2mm;
            }

            .back-content ol {
              margin: 0;
              padding-left: 3.5mm;
            }

            .back-content li {
              margin-bottom: 0.6mm;
            }

            .back-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 1.5mm;
            }

            /* Mock Barcode */
            .barcode-box {
              width: 32mm;
              height: 7mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.5mm;
            }

            .barcode-lines {
              width: 100%;
              height: 5.5mm;
              background: repeating-linear-gradient(
                90deg,
                #000000,
                #000000 0.5mm,
                #ffffff 0.5mm,
                #ffffff 1mm,
                #000000 1mm,
                #000000 1.2mm,
                #ffffff 1.2mm,
                #ffffff 1.8mm,
                #000000 1.8mm,
                #000000 2mm
              );
            }

            .barcode-text {
              font-family: 'JetBrains Mono', monospace;
              font-size: 4.5pt;
              font-weight: 700;
              letter-spacing: 1px;
            }

            /* Signature section */
            .sig-box {
              text-align: center;
              font-size: 5.5pt;
              width: 30mm;
              line-height: 1.2;
            }

            .sig-title {
              font-weight: 500;
              color: #64748b;
            }

            .sig-space {
              height: 7mm;
            }

            .sig-name {
              font-weight: 700;
              text-decoration: underline;
              color: #1e293b;
            }

            /* Print layout overrides */
            @media print {
              body {
                padding: 0;
                background-color: transparent;
                gap: 0;
              }
              .no-print {
                display: none !important;
              }
              .cards-container {
                display: flex;
                flex-direction: row;
                gap: 10mm;
              }
              .id-card {
                box-shadow: none;
                border: 0.3mm solid #cbd5e1;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body onload="window.print()">
          <button class="print-btn no-print" onclick="window.print()">Cetak Kartu Sekarang</button>
          
          <div class="cards-container">
            <!-- FRONT CARD -->
            <div class="id-card card-front">
              <div class="card-header">
                ${logoHtml}
                <div class="header-text">
                  <h4 class="kop-name">${kopName}</h4>
                  <p class="kop-sub">${bhId} | ${slogan}</p>
                </div>
              </div>

              <div class="card-body">
                <div class="photo-box">
                  ${photoImg}
                </div>
                <div class="meta-details">
                  <span class="member-no-tag">${member.noAnggota}</span>
                  <div class="member-fields">
                    <div class="field-row">
                      <span class="field-label">Nama</span>
                      <span class="field-colon">:</span>
                      <span class="field-val" style="font-weight: 800; font-size: 7.5pt;" title="${member.nama}">${member.nama}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Alamat</span>
                      <span class="field-colon">:</span>
                      <span class="field-val" title="${member.alamat || '-'}">${member.alamat || '-'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">TTL</span>
                      <span class="field-colon">:</span>
                      <span class="field-val" title="${formattedTtl}">${formattedTtl}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Pekerjaan</span>
                      <span class="field-colon">:</span>
                      <span class="field-val">${member.pekerjaan || '-'}</span>
                    </div>
                    <div class="field-row">
                      <span class="field-label">Bergabung</span>
                      <span class="field-colon">:</span>
                      <span class="field-val">${formattedJoinDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <span>Bukti Keanggotaan Koperasi Resmi</span>
                <span>${alamat}</span>
              </div>
            </div>

            <!-- BACK CARD -->
            <div class="id-card card-back">
              <div>
                <div class="back-header">Syarat & Ketentuan Keanggotaan</div>
                <div class="back-content">
                  <ol>
                    <li>Kartu ini adalah kartu tanda pengenal sah Anggota ${kopName}.</li>
                    <li>Kartu wajib dibawa saat bertransaksi (Simpan/Pinjam/Warung) atau menghadiri rapat tahunan.</li>
                    <li>Segala bentuk penyalahgunaan kartu ini merupakan pelanggaran tata tertib koperasi.</li>
                    <li>Jika kartu hilang atau rusak, segera laporkan ke Pengurus Koperasi untuk penerbitan ulang.</li>
                    <li>Jika menemukan kartu ini, harap dikembalikan ke: ${alamat}.</li>
                  </ol>
                </div>
              </div>

              <div class="back-footer">
                <div class="barcode-box">
                  <div class="barcode-lines"></div>
                  <span class="barcode-text">${member.noAnggota}</span>
                </div>
                <div class="sig-box">
                  <span class="sig-title">Pengurus Koperasi,</span>
                  <div class="sig-space"></div>
                  <span class="sig-name">${namaKetua}</span>
                  <div style="font-size: 4.5pt; color: #64748b; margin-top: 0.5mm; font-weight: 500;">Ketua Koperasi</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper ledger calculations per member
  const getMemberFinancialInfo = (memberId: string) => {
    const listS = simpanan.filter(s => s.anggotaId === memberId);
    const listP = pinjaman.filter(p => p.anggotaId === memberId);
    
    const totalPokok = listS.filter(s => s.jenis === 'Pokok').reduce((a,c) => a + c.jumlah, 0);
    const totalWajib = listS.filter(s => s.jenis === 'Wajib').reduce((a,c) => a + c.jumlah, 0);
    const totalSukarela = listS.filter(s => s.jenis === 'Sukarela').reduce((a,c) => a + c.jumlah, 0);
    const grandSimpanan = totalPokok + totalWajib + totalSukarela;

    const activePinjaman = listP.filter(p => p.status === 'Belum Lunas');
    const totalPinjamanBeredar = activePinjaman.reduce((acc, p) => {
      const repays = angsuran.filter(a => a.pinjamanId === p.id);
      const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
      const remainingPrincipal = p.nominalPinjaman - (totalPaid * (p.nominalPinjaman / p.totalWajibBayar));
      return acc + Math.max(0, Math.round(remainingPrincipal));
    }, 0);

    return {
      totalPokok,
      totalWajib,
      totalSukarela,
      grandSimpanan,
      activePinjaman,
      totalPinjamanBeredar
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-4 h-4"/></span>
          <input 
            type="text"
            placeholder="Cari anggota berdasarkan nama, ID, atau No HP..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-800 dark:text-slate-200 border-slate-250 dark:border-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0 transition"
        >
          <UserPlus className="w-4 h-4"/> Daftarkan Anggota Baru
        </button>
      </div>

      {/* Grid List Members */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5">ID Anggota</th>
              <th className="px-6 py-3.5">Nama Lengkap</th>
              <th className="px-6 py-3.5">Jenis Kelamin</th>
              <th className="px-6 py-3.5">Alamat</th>
              <th className="px-6 py-3.5">No Handphone</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Total Simpanan</th>
              <th className="px-6 py-3.5 text-center">Aksi Registrasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-sans">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Belum ada anggota terdaftar dengan kriteria ini</td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const fin = getMemberFinancialInfo(m.id);
                const isPending = m.isVerified === false;
                const hasActiveLoan = pinjaman.some(p => p.anggotaId === m.id && p.status === 'Belum Lunas');
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {isPending ? (
                        <span className="text-amber-650 text-xs italic">[Belum Diverifikasi]</span>
                      ) : (
                        m.noAnggota
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {m.nama}
                          {m.jenisKelamin && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${m.jenisKelamin === 'Laki-laki' ? 'bg-sky-50 text-sky-700 border border-sky-150 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60' : 'bg-rose-50 text-rose-700 border border-rose-150 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900/60'}`}>
                              {m.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${
                        (m.jenisKelamin || 'Laki-laki') === 'Perempuan' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' 
                          : 'bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40'
                      }`}>
                        {m.jenisKelamin || 'Laki-laki'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 dark:text-slate-350 max-w-[200px] truncate" title={m.alamat}>
                        {m.alamat || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{m.noHp}</td>
                    <td className="px-6 py-4">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-full font-bold text-[10px]">
                          ⚠️ Pending Verifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-full font-bold text-[10px]">
                          ✓ Terverifikasi Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                        {formatRupiah(fin.grandSimpanan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isPending ? (
                          <button 
                            onClick={() => {
                              const verifiedCodes = members
                                .filter(x => x.isVerified !== false && x.noAnggota.startsWith('AG'))
                                .map(x => parseInt(x.noAnggota.replace('AG', '')))
                                .filter(x => !isNaN(x));
                              const lastNum = verifiedCodes.length > 0 ? Math.max(...verifiedCodes) : 0;
                              const nextCode = `AG${String(lastNum + 1).padStart(3, '0')}`;
                              
                              onEditMember({
                                ...m,
                                isVerified: true,
                                noAnggota: nextCode
                              });

                              const kopName = setup?.namaKoperasi || "Koperasi";
                              const defaultMsg = `Halo *${m.nama}*,\n\nPendaftaran Anda di *${kopName}* telah berhasil diverifikasi dan diaktifkan!\n\nBerikut rincian akun Anda untuk login ke portal anggota:\n- *Username (No. Anggota)*: ${nextCode}\n- *Password (No. HP)*: ${m.noHp}\n\n*PENTING*: Jangan berikan username dan password ini kepada siapapun demi keamanan akun Anda.\n\nNo. Anggota resmi ini juga digunakan untuk mempermudah pencatatan transaksi simpanan, pinjaman, dan warung.\n\nTerima kasih atas partisipasi Anda!\n\n_Pengurus Koperasi_`;

                              setVerificationWA({
                                member: m,
                                nextCode: nextCode,
                                messageText: defaultMsg
                              });
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            Verifikasi & Aktivasi
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => setSelectedLedgerMember(m)}
                              className="px-2.5 py-1 text-slate-500 bg-slate-100 dark:bg-slate-700/60 dark:text-slate-350 hover:bg-emerald-700 hover:text-white text-xs font-semibold rounded-lg transition"
                            >
                              Buku Ledger
                            </button>
                            <button 
                              onClick={() => setPreviewMemberCard(m)}
                              className="px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-450 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Cetak Kartu Tanda Anggota"
                            >
                              <Printer className="w-3.5 h-3.5"/> Kartu
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => setEditingMember(m)}
                          className="px-2.5 py-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/45 border border-emerald-150 dark:border-emerald-800 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5"/> Edit
                        </button>
                        <button 
                          disabled={hasActiveLoan}
                          onClick={() => {
                            setMemberToDelete(m);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            hasActiveLoan 
                              ? 'text-slate-350 dark:text-slate-600 cursor-not-allowed opacity-50' 
                              : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 animate-hover cursor-pointer'
                          }`}
                          title={hasActiveLoan ? "Anggota memiliki pinjaman aktif" : "Keluarkan Anggota"}
                        >
                          <Trash2 className="w-4 h-4"/>
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

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-lg w-full border border-slate-150 dark:border-slate-750 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Daftarkan Anggota Koperasi</h3>
              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase label-id">Nama Lengkap</label>
                  <input 
                    type="text" required placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                    value={nama} onChange={(e)=>setNama(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase label-id">Tempat Lahir</label>
                    <input 
                      type="text" required placeholder="Contoh: Jakarta"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                      value={tempatLahir} onChange={(e)=>setTempatLahir(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase label-id">Tanggal Lahir</label>
                    <input 
                      type="date" required
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                      value={tanggalLahir} onChange={(e)=>setTanggalLahir(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase label-id">Jenis Kelamin</label>
                  <select 
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                    value={jenisKelamin} onChange={(e)=>setJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase label-id">Alamat Tinggal</label>
                  <textarea 
                    placeholder="Alamat domisili sekarang..." rows={2} required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                    value={alamat} onChange={(e)=>setAlamat(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase label-id">Pekerjaan</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                      value={['Guru', 'Kepala Sekolah', 'Staff'].includes(pekerjaan) ? pekerjaan : 'Lainnya'} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Lainnya') {
                          setPekerjaan('');
                        } else {
                          setPekerjaan(val);
                        }
                      }}
                    >
                      <option value="Guru">Guru</option>
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Staff">Staff</option>
                      <option value="Lainnya">Lainnya / Tambah Baru...</option>
                    </select>
                    {!['Guru', 'Kepala Sekolah', 'Staff'].includes(pekerjaan) && (
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="Ketik pekerjaan baru..."
                          className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700 text-xs font-medium"
                          value={pekerjaan}
                          onChange={(e) => setPekerjaan(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase label-id">Nomor Handphone (WhatsApp)</label>
                    <input 
                      type="text" required placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                      value={noHp} onChange={(e)=>setNoHp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase label-id">Tanggal Bergabung</label>
                  <input 
                    type="date" required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                    value={joined} onChange={(e)=>setJoined(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase label-id">Pas Foto</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 w-full text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto</span>
                      <input 
                        type="file" accept="image/*" className="hidden"
                        onChange={handleAddFotoChange}
                      />
                    </label>
                  </div>
                </div>

                {fotoUrl && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-150 dark:border-slate-750">
                    <img src={fotoUrl} alt="Preview Foto" className="w-12 h-16 object-cover rounded-md border shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pas Foto Terunggah</p>
                      <p className="text-[10px] text-slate-400">Siap dicetak di kartu anggota</p>
                    </div>
                    <button 
                      type="button" onClick={()=>setFotoUrl('')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2.5 pt-3 justify-end border-t border-slate-100 dark:border-slate-750">
                  <button 
                    type="button" onClick={()=>setIsAddOpen(false)}
                    className="px-4 py-2 border text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-650 cursor-pointer text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer text-xs font-bold animate-hover"
                  >
                    Simpan Registrasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MEMBER MODAL */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-lg w-full border border-slate-150 dark:border-slate-750 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Koreksi Data Anggota</h3>
              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 label-id">Nama Lengkap</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    value={editingMember.nama} 
                    onChange={(e)=>setEditingMember({...editingMember, nama: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 label-id">Tempat Lahir</label>
                    <input 
                      type="text" required placeholder="Contoh: Jakarta"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      value={editingMember.tempatLahir || ''} 
                      onChange={(e)=>setEditingMember({...editingMember, tempatLahir: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 label-id">Tanggal Lahir</label>
                    <input 
                      type="date" required
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      value={editingMember.tanggalLahir || ''} 
                      onChange={(e)=>setEditingMember({...editingMember, tanggalLahir: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 label-id">Jenis Kelamin</label>
                  <select 
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700"
                    value={editingMember.jenisKelamin || 'Laki-laki'} 
                    onChange={(e)=>setEditingMember({...editingMember, jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan'})}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 label-id">Alamat Tinggal</label>
                  <textarea 
                    rows={2} required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    value={editingMember.alamat} 
                    onChange={(e)=>setEditingMember({...editingMember, alamat: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 label-id">Pekerjaan</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      value={['Guru', 'Kepala Sekolah', 'Staff'].includes(editingMember.pekerjaan || '') ? (editingMember.pekerjaan || 'Guru') : 'Lainnya'} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Lainnya') {
                          setEditingMember({...editingMember, pekerjaan: ''});
                        } else {
                          setEditingMember({...editingMember, pekerjaan: val});
                        }
                      }}
                    >
                      <option value="Guru">Guru</option>
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Staff">Staff</option>
                      <option value="Lainnya">Lainnya / Tambah Baru...</option>
                    </select>
                    {!['Guru', 'Kepala Sekolah', 'Staff'].includes(editingMember.pekerjaan || '') && (
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="Ketik pekerjaan baru..."
                          className="w-full px-3 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-emerald-700 text-xs font-medium"
                          value={editingMember.pekerjaan || ''}
                          onChange={(e) => setEditingMember({...editingMember, pekerjaan: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 label-id">Nomor Handphone (WhatsApp)</label>
                    <input 
                      type="text" required
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      value={editingMember.noHp} 
                      onChange={(e)=>setEditingMember({...editingMember, noHp: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 label-id">Tanggal Bergabung</label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    value={editingMember.tanggalBergabung} 
                    onChange={(e)=>setEditingMember({...editingMember, tanggalBergabung: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 label-id">Pas Foto</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 w-full text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ganti Foto</span>
                      <input 
                        type="file" accept="image/*" className="hidden"
                        onChange={handleEditFotoChange}
                      />
                    </label>
                  </div>
                </div>

                {editingMember.fotoUrl && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-150 dark:border-slate-750">
                    <img src={editingMember.fotoUrl} alt="Preview Foto" className="w-12 h-16 object-cover rounded-md border shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pas Foto Terunggah</p>
                      <p className="text-[10px] text-slate-400">Siap dicetak di kartu anggota</p>
                    </div>
                    <button 
                      type="button" onClick={()=>setEditingMember({...editingMember, fotoUrl: ''})}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-3 justify-end border-t border-slate-100 dark:border-slate-750">
                  <button 
                    type="button" onClick={()=>setEditingMember(null)}
                    className="px-4 py-2 border text-slate-500 bg-slate-150 rounded-lg hover:bg-slate-200 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                  >
                    Simpan Koreksi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEMBER LEDGER DRAWER DETAILED POPUP */}
      <AnimatePresence>
        {selectedLedgerMember && (() => {
          const lSState = simpanan.filter(s => s.anggotaId === selectedLedgerMember.id);
          const lPState = pinjaman.filter(p => p.anggotaId === selectedLedgerMember.id);
          const lAState = angsuran.filter(a => a.anggotaId === selectedLedgerMember.id);
          const fStat = getMemberFinancialInfo(selectedLedgerMember.id);

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full border border-slate-250 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header info */}
                <div className="bg-slate-900 text-white p-6 relative shrink-0">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button 
                      onClick={() => handlePrintLedger(selectedLedgerMember, lSState, lPState, fStat)}
                      className="bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-semibold font-mono px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Ledger
                    </button>
                    <button 
                      onClick={() => setSelectedLedgerMember(null)}
                      className="text-slate-400 hover:text-white font-mono bg-slate-800 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      ✕ Tutup Ledger
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedLedgerMember.fotoUrl ? (
                      <img src={selectedLedgerMember.fotoUrl} alt={selectedLedgerMember.nama} className="w-12 h-16 object-cover rounded-lg border border-slate-700 shadow-md flex-shrink-0" />
                    ) : (
                      <span className="text-3xl">🏛️</span>
                    )}
                    <div>
                      <h3 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
                        Ledger Bulanan & Mutasi Mutakhir Anggota
                        <span className="text-xs bg-emerald-700 text-white px-2.5 py-0.5 rounded-full font-bold">{selectedLedgerMember.noAnggota}</span>
                      </h3>
                      <p className="text-slate-400 text-sm mt-1 font-medium italic">
                        Pemilik Rekening: <span className="text-white font-semibold">{selectedLedgerMember.nama}</span> | 
                        Pekerjaan: <span className="text-white font-semibold">{selectedLedgerMember.pekerjaan || 'Guru'}</span> | 
                        Telepon: {selectedLedgerMember.noHp}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main scrollable body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Simpanan Pokok & Wajib</p>
                      <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {formatRupiah(fStat.totalPokok + fStat.totalWajib)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Simpanan Sukarela</p>
                      <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                        {formatRupiah(fStat.totalSukarela)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Pinjaman Aktif Beredar</p>
                      <p className="text-lg font-mono font-bold text-rose-700 dark:text-rose-450 mt-1">
                        {formatRupiah(fStat.totalPinjamanBeredar)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Mutasi Simpanan */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b pb-2 text-sm uppercase tracking-wide flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-600"/> Histori Rekaman Tabungan
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto border rounded-xl divide-y text-xs font-mono">
                        {lSState.length === 0 ? (
                          <p className="text-slate-400 italic p-4 text-center">Belum ada mutasi simpanan</p>
                        ) : (
                          lSState.map((s) => (
                            <div key={s.id} className="p-3 bg-slate-50/20 dark:bg-slate-900/10 flex justify-between items-center hover:bg-slate-100/30">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className={`font-semibold ${s.jumlah < 0 ? 'text-rose-600 dark:text-rose-450 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {s.jumlah < 0 ? 'Penarikan Sukarela' : s.jenis} ({s.tanggal})
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.keterangan}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`font-bold font-mono ${s.jumlah < 0 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600'}`}>
                                  {s.jumlah < 0 ? `-${formatRupiah(Math.abs(s.jumlah))}` : formatRupiah(s.jumlah)}
                                </span>
                                {(onEditSimpanan || onDeleteSimpanan) && (
                                  <div className="flex items-center gap-1.5 ml-2">
                                    {onEditSimpanan && (
                                      <button 
                                        onClick={() => startEditSimpanan(s)}
                                        title="Edit Transaksi"
                                        className="text-slate-400 hover:text-blue-600 p-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {onDeleteSimpanan && (
                                      <button 
                                        onClick={() => handleDeleteSimpClick(s.id)}
                                        title="Hapus Transaksi"
                                        className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Mutasi Pinjaman & Angsuran */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b pb-2 text-sm uppercase tracking-wide flex items-center gap-1.5">
                        <HandCoins className="w-4 h-4 text-rose-600"/> Histori Kontrak Pembiayaan
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto border rounded-xl divide-y text-xs font-mono">
                        {lPState.length === 0 ? (
                          <p className="text-slate-400 italic p-4 text-center">Belum memiliki kontrak pinjaman</p>
                        ) : (
                          lPState.map((p) => {
                            const pPaid = angsuran.filter(a => a.pinjamanId === p.id).reduce((acc, c) => acc + c.jumlahBayar, 0);
                            const remaining = p.status === 'Lunas' ? 0 : Math.max(0, Math.round(p.nominalPinjaman - (pPaid * (p.nominalPinjaman / p.totalWajibBayar))));
                            return (
                              <div key={p.id} className="p-3 bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-100/30">
                                <div className="flex justify-between items-center font-semibold">
                                  <span className="text-slate-700 dark:text-slate-200">Kontrak {p.tanggal} ({p.tenor} Bulan)</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{p.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-slate-500">
                                  <p>Plafond: {formatRupiah(p.nominalPinjaman)}</p>
                                  <p>Potongan Provisi (1%): {formatRupiah(p.provisiDipotong)}</p>
                                  <p className="font-semibold text-emerald-600">Terbayar: {formatRupiah(pPaid)}</p>
                                  <p className="font-semibold text-rose-650">Sisa Piutang: {formatRupiah(remaining)}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Histori Pembayaran Angsuran Pinjaman */}
                    <div className="space-y-2 lg:col-span-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 border-b pb-2 text-sm uppercase tracking-wide flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" /> Histori Pembayaran Angsuran Pembiayaan
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto border rounded-xl text-xs font-mono">
                        {lAState.length === 0 ? (
                          <p className="text-slate-400 italic p-4 text-center bg-slate-50/10 dark:bg-slate-900/10 rounded-xl">Belum ada riwayat pembayaran angsuran</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                  <th className="px-3 py-2">Tanggal</th>
                                  <th className="px-3 py-2">Kontrak Referensi</th>
                                  <th className="px-3 py-2 text-center">Angsuran Ke</th>
                                  <th className="px-3 py-2 text-right">Jumlah Bayar</th>
                                  <th className="px-3 py-2">Keterangan</th>
                                  {onDeleteAngsuran && <th className="px-3 py-2 text-center">Aksi</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 dark:divide-slate-750 text-slate-650 dark:text-slate-350">
                                {lAState.map((a) => {
                                  const relatedLoan = lPState.find(p => p.id === a.pinjamanId);
                                  const loanInfoStr = relatedLoan 
                                    ? `CTR-${relatedLoan.id.substring(0, 8).toUpperCase()} (Plafond ${formatRupiah(relatedLoan.nominalPinjaman)})` 
                                    : 'Kontrak Pinjaman';
                                  return (
                                    <tr key={a.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30">
                                      <td className="px-3 py-2">{a.tanggal}</td>
                                      <td className="px-3 py-2 font-semibold text-slate-750 dark:text-slate-250">{loanInfoStr}</td>
                                      <td className="px-3 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">Ke-{a.bulanKe}</td>
                                      <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">{formatRupiah(a.jumlahBayar)}</td>
                                      <td className="px-3 py-2 text-[10px] text-slate-450">{a.keterangan || '-'}</td>
                                      {onDeleteAngsuran && (
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => {
                                              if (window.confirm("Apakah Anda yakin ingin menghapus catatan angsuran ini? Tindakan ini akan menghapus data permanen dari database.")) {
                                                onDeleteAngsuran(a.id);
                                              }
                                            }}
                                            className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-350 rounded text-[9px] font-sans font-bold cursor-pointer transition flex items-center justify-center gap-0.5 mx-auto"
                                            title="Hapus Catatan Angsuran"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* CONFIRM MEMBER DELETION MODAL */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 p-6 flex flex-col space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/50 text-red-650 dark:text-red-400 rounded-full shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 text-left">
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100">Konfirmasi Hapus Anggota</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                    Apakah anda yakin menghapus anggota karena anggota keluar koperasi?
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p>Nama: <span className="font-bold text-slate-800 dark:text-slate-200">{memberToDelete.nama}</span></p>
                    <p>No Anggota: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{memberToDelete.noAnggota}</span></p>
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      ⚠️ Tindakan ini akan menghapus permanen seluruh riwayat simpanan dan pinjaman anggota tersebut.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition text-center font-sans"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    onDeleteMember(memberToDelete.id);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition text-center shadow-sm font-sans"
                >
                  Ya, Hapus Anggota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KTA PREVIEW MODAL */}
      <AnimatePresence>
        {previewMemberCard && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-50 dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100">
                    Pratinjau Kartu Tanda Anggota (KTA)
                  </h3>
                </div>
                <button 
                  onClick={() => setPreviewMemberCard(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid Cards Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center py-4">
                
                {/* DEPAN (FRONT) */}
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bagian Depan (Front)</span>
                  <div 
                    className="w-full max-w-[380px] aspect-[85.6/53.98] rounded-[15px] shadow-lg overflow-hidden border border-slate-250 flex flex-col justify-between p-[14px] relative select-none"
                    style={{
                      background: setup?.kartuBgUrl 
                        ? `url('${setup.kartuBgUrl}') center center / cover no-repeat` 
                        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                      color: '#000000',
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2.5 border-b border-black/15 pb-1.5 h-[42px]">
                      {setup?.logoUrl ? (
                        <img src={setup.logoUrl} className="w-[32px] h-[32px] rounded-full object-cover border border-black/10 p-[1px] bg-white flex-shrink-0" alt="Logo" />
                      ) : (
                        <div className="w-[32px] h-[32px] rounded-full bg-black/10 text-black flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-[18px] h-[18px]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-extrabold text-[10.5px] uppercase tracking-tight leading-tight truncate text-black">
                          {setup?.namaKoperasi || "Koperasi Sekolah Abdi Negara"}
                        </h4>
                        <p className="text-[6.5px] font-medium text-slate-700 uppercase tracking-wider truncate leading-none mt-0.5">
                          {setup?.noBadanHukum ? `BH No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna'} | {setup?.slogan || "Membantu Kesejahteraan Bersama"}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex gap-3 flex-grow pt-2 h-[110px] items-stretch">
                      {/* Photo */}
                      <div className="w-[74px] h-[98px] rounded-md border border-black/15 bg-slate-100 overflow-hidden flex-shrink-0 shadow-xs relative">
                        {previewMemberCard.fotoUrl ? (
                          <img src={previewMemberCard.fotoUrl} className="w-full h-full object-cover" alt="Foto" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 text-slate-550 flex flex-col items-center justify-center text-[5px] font-extrabold gap-0.5">
                            <Users className="w-[20px] h-[20px] opacity-70" />
                            <span>FOTO 3X4</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 text-left py-0.5">
                        <div className="space-y-1">
                          <span className="bg-blue-50 border border-blue-250 text-blue-700 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-[3px] tracking-wide inline-block leading-none">
                            {previewMemberCard.noAnggota}
                          </span>
                          <h4 className="font-extrabold text-[11px] text-slate-900 uppercase tracking-tight leading-tight truncate mt-0.5">
                            {previewMemberCard.nama}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-1 pb-1 mt-1 border-t border-black/5 pt-1">
                          <div className="flex items-center text-[7.5px] leading-none text-black">
                            <span className="w-[50px] flex-shrink-0 text-slate-700 font-bold text-[6.5px] uppercase tracking-wider">Pekerjaan</span>
                            <span className="w-2 flex-shrink-0 text-slate-500 font-bold text-center">:</span>
                            <span className="flex-1 min-w-0 font-extrabold text-slate-900 truncate">{previewMemberCard.pekerjaan || '-'}</span>
                          </div>
                          <div className="flex items-center text-[7.5px] leading-none text-black">
                            <span className="w-[50px] flex-shrink-0 text-slate-700 font-bold text-[6.5px] uppercase tracking-wider">TTL</span>
                            <span className="w-2 flex-shrink-0 text-slate-500 font-bold text-center">:</span>
                            <span className="flex-1 min-w-0 font-extrabold text-slate-900 truncate">
                              {previewMemberCard.tempatLahir || '-'}{previewMemberCard.tanggalLahir ? `, ${new Date(previewMemberCard.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center text-[7.5px] leading-none text-black">
                            <span className="w-[50px] flex-shrink-0 text-slate-700 font-bold text-[6.5px] uppercase tracking-wider">Bergabung</span>
                            <span className="w-2 flex-shrink-0 text-slate-500 font-bold text-center">:</span>
                            <span className="flex-1 min-w-0 font-extrabold text-slate-900 truncate">
                              {previewMemberCard.tanggalBergabung ? new Date(previewMemberCard.tanggalBergabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="h-[15px] flex items-center justify-between text-[5.5px] font-bold text-slate-600 border-t border-black/10 pt-1.5 leading-none">
                      <span>Bukti Keanggotaan Koperasi Resmi</span>
                      <span className="max-w-[180px] truncate">{setup?.alamatKantor || "Kantor Pusat Koperasi"}</span>
                    </div>
                  </div>
                </div>

                {/* BELAKANG (BACK) */}
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bagian Belakang (Back)</span>
                  <div 
                    className="w-full max-w-[380px] aspect-[85.6/53.98] rounded-[15px] bg-white shadow-lg overflow-hidden border border-slate-250 flex flex-col justify-between p-[14px] relative select-none text-left text-slate-800"
                  >
                    <div>
                      <div className="font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-200 pb-1 text-emerald-700">
                        Syarat & Ketentuan Keanggotaan
                      </div>
                      <div className="text-[6.5px] text-slate-600 leading-normal mt-1.5 pl-3">
                        <ol className="list-decimal space-y-0.5">
                          <li>Kartu ini adalah kartu tanda pengenal sah Anggota {setup?.namaKoperasi || "Koperasi Sekolah Abdi Negara"}.</li>
                          <li>Kartu wajib dibawa saat bertransaksi (Simpan/Pinjam/Warung) atau menghadiri rapat tahunan.</li>
                          <li>Segala bentuk penyalahgunaan kartu ini merupakan pelanggaran tata tertib koperasi.</li>
                          <li>Jika kartu hilang atau rusak, segera laporkan ke Pengurus Koperasi untuk penerbitan ulang.</li>
                          <li>Jika menemukan kartu ini, harap dikembalikan ke: {setup?.alamatKantor || "Kantor Pusat Koperasi"}.</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-150 pt-1">
                      {/* Barcode */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-[110px] h-[22px] flex flex-col justify-end"
                          style={{
                            background: `repeating-linear-gradient(90deg, #000, #000 1.5px, #fff 1.5px, #fff 3px, #000 3px, #000 4px, #fff 4px, #fff 5.5px)`
                          }}
                        />
                        <span className="font-mono text-[7px] font-bold tracking-widest text-slate-800">{previewMemberCard.noAnggota}</span>
                      </div>

                      {/* Signature */}
                      <div className="text-center w-[95px] text-[7px] leading-tight flex flex-col justify-end items-center">
                        <span className="text-slate-500 font-semibold">Pengurus Koperasi,</span>
                        <div className="h-[14px]" />
                        <span className="font-extrabold underline text-slate-800 truncate max-w-full">{namaKetua}</span>
                        <span className="text-slate-500 text-[6px] mt-0.5">Ketua Koperasi</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setPreviewMemberCard(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs py-3 rounded-xl cursor-pointer transition text-center"
                >
                  Tutup Pratinjau
                </button>
                <button 
                  onClick={() => {
                    handlePrintMemberCard(previewMemberCard);
                    setPreviewMemberCard(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition text-center shadow-md flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak Kartu Sekarang
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
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
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
              <form onSubmit={handleSaveEditSimpanan} className="p-6 space-y-4 text-xs text-left">
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

        {/* WhatsApp Verification Notification Modal */}
        {verificationWA && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans text-xs">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerificationWA(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Verifikasi & Notifikasi WA</h3>
                    <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Kirim No. Anggota resmi via WhatsApp</p>
                  </div>
                </div>
                <button 
                  onClick={() => setVerificationWA(null)}
                  className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-400 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 flex gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-full h-fit shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Aktivasi Anggota Berhasil!</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Anggota <strong>{verificationWA.member.nama}</strong> telah berhasil diaktifkan dengan No. Anggota: <strong>{verificationWA.nextCode}</strong>.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Nomor WhatsApp Anggota:</label>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100 font-mono font-bold">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{verificationWA.member.noHp}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Preview Pesan WA:</label>
                  <textarea 
                    rows={8}
                    value={verificationWA.messageText}
                    onChange={(e) => setVerificationWA({ ...verificationWA, messageText: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium leading-relaxed"
                    placeholder="Tulis pesan..."
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    *Anda dapat menyesuaikan kembali isi template pesan di atas sebelum dikirimkan.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setVerificationWA(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-center font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  {(() => {
                    const cleanPhone = verificationWA.member.noHp.replace(/\D/g, '');
                    let phone62 = cleanPhone;
                    if (cleanPhone.startsWith('0')) {
                      phone62 = '62' + cleanPhone.substring(1);
                    } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 0) {
                      phone62 = '62' + cleanPhone;
                    }
                    const waUrl = `https://wa.me/${phone62}?text=${encodeURIComponent(verificationWA.messageText)}`;
                    
                    return (
                      <a 
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setVerificationWA(null)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center gap-1.5 text-center text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Kirim via WhatsApp
                      </a>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================= SAVINGS & INTEREST (SIMPANAN & JASA MANASUKA) =================
interface SimpananProps {
  setup: KoperasiSetup;
  members: Member[];
  simpanan: Simpanan[];
  onAddSimpanan: (s: Omit<Simpanan, 'id'> | Omit<Simpanan, 'id'>[]) => void;
  onPostManasukaBunga: (logs: Omit<ManasukaBungaLog, 'id'>, autoPostSukarela: boolean) => void;
}

export function SimpananView({ setup, members, simpanan, onAddSimpanan, onPostManasukaBunga }: SimpananProps) {
  // Combined Form States
  const [anggotaId, setAnggotaId] = useState('');
  const [jumlahPokok, setJumlahPokok] = useState('50.000');
  const [jumlahWajib, setJumlahWajib] = useState('50.000');
  const [jumlahSukarela, setJumlahSukarela] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [keterangan, setKeterangan] = useState('');

  // Format / Parse helpers for numeric input separating with dots (Rupiah thousand separator format)
  const formatInputRupiah = (valStr: string) => {
    const clean = valStr.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('id-ID');
  };

  const parseInputRupiah = (valStr: string) => {
    const clean = (valStr || '').replace(/\./g, '');
    return parseFloat(clean) || 0;
  };

  const hasPokokPaid = useMemo(() => {
    if (!anggotaId) return false;
    const balance = simpanan
      .filter(s => s.anggotaId === anggotaId && s.jenis === 'Pokok')
      .reduce((sum, item) => sum + item.jumlah, 0);
    return balance > 0;
  }, [anggotaId, simpanan]);

  // Handle auto disabled status of Simpanan Pokok and defaults on select changes
  React.useEffect(() => {
    if (!anggotaId) {
      setJumlahPokok('50.000');
      setJumlahWajib('50.000');
      setJumlahSukarela('');
      return;
    }

    if (hasPokokPaid) {
      setJumlahPokok('0');
    } else {
      setJumlahPokok('50.000');
    }
    setJumlahWajib('50.000');
    setJumlahSukarela('');
  }, [anggotaId, hasPokokPaid]);

  // Jasa Manasuka Simulation Tab Tool
  const [isManasukaModalOpen, setIsManasukaModalOpen] = useState(false);
  const [targetBulan, setTargetBulan] = useState('06');
  const [targetTahun, setTargetTahun] = useState('2026');
  const [calculatedLogs, setCalculatedLogs] = useState<Omit<ManasukaBungaLog, 'id'>[]>([]);
  const [logsPosted, setLogsPosted] = useState(false);

  // WhatsApp Alert Dialog
  const [waTarget, setWaTarget] = useState<{ name: string; phone: string; total: number; reward: number } | null>(null);

  // Consolidated Receipt Modal State
  const [receiptData, setReceiptData] = useState<{
    member: Member;
    items: { jenis: 'Pokok' | 'Wajib' | 'Sukarela'; jumlah: number; keterangan: string }[];
    txId: string;
    tanggal: string;
  } | null>(null);

  const [filterAnggotaOpt, setFilterAnggotaOpt] = useState('');
  const [filterJenisOpt, setFilterJenisOpt] = useState('');

  const filteredHistory = useMemo(() => {
    return simpanan.filter(s => {
      const matchAnggota = filterAnggotaOpt === '' || s.anggotaId === filterAnggotaOpt;
      const matchJenis = filterJenisOpt === '' || s.jenis === filterJenisOpt;
      return matchAnggota && matchJenis;
    }).sort((a,b) => b.tanggal.localeCompare(a.tanggal));
  }, [simpanan, filterAnggotaOpt, filterJenisOpt]);

  const viewReceiptForTxId = (txId: string, itemFallback: Simpanan) => {
    const member = members.find(m => m.id === itemFallback.anggotaId);
    if (!member) return;

    // Filter all savings with this txId, or fallback to just itself if no txId
    let matchingItems = simpanan.filter(s => s.transaksiId === txId);
    if (matchingItems.length === 0) {
      matchingItems = [itemFallback];
    }

    setReceiptData({
      member,
      items: matchingItems.map(m => ({
        jenis: m.jenis,
        jumlah: m.jumlah,
        keterangan: m.keterangan || `Setoran Simpanan ${m.jenis}`
      })),
      txId,
      tanggal: itemFallback.tanggal
    });
  };

  const handlePrintSavingsReceipt = (data: {
    member: Member;
    items: { jenis: 'Pokok' | 'Wajib' | 'Sukarela'; jumlah: number; keterangan: string }[];
    txId: string;
    tanggal: string;
  }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }

    const koperasiName = setup?.namaKoperasi || "Koperasi Simpan Pinjam Dana Segar";
    const statusBadanHukum = setup?.noBadanHukum ? `Badan Hukum No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';
    const alamatKoperasi = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const sloganKoperasi = setup?.slogan || "Membantu Kesejahteraan Anggota";

    const totalAmount = data.items.reduce((sum, item) => sum + item.jumlah, 0);
    const nominalTerbilang = terbilang(totalAmount) + " Rupiah";

    const itemsRowsHtml = data.items.map(item => `
      <div class="item-row" style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;">
        <span class="item-name">Simpanan ${item.jenis}</span>
        <span class="item-price">${formatRupiah(item.jumlah)}</span>
      </div>
      ${item.keterangan ? `<div class="item-desc" style="font-size: 9px; font-style: italic; color: #444; margin-left: 10px; margin-bottom: 4px;">${item.keterangan}</div>` : ''}
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>KUITANSI_SIMPANAN_${data.txId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700&display=swap');
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
              font-family: 'Courier Prime', monospace, Courier, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 3mm;
              box-sizing: border-box;
            }
            .kuitansi-container {
              width: 100%;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
            }
            .header img {
              max-height: 40px;
              max-width: 40px;
              margin-bottom: 4px;
              border-radius: 50%;
              object-fit: cover;
            }
            .header h2 {
              margin: 0;
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .header p {
              margin: 2px 0;
              font-size: 8px;
            }
            .title {
              text-align: center;
              font-size: 10px;
              font-weight: bold;
              margin: 8px 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .meta-section {
              font-size: 9px;
              line-height: 1.3;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
            }
            .items-section {
              font-size: 9px;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .total-section {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: bold;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .terbilang-section {
              font-size: 8px;
              font-style: italic;
              margin-bottom: 10px;
              line-height: 1.2;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              font-size: 8px;
            }
            .sig-col {
              text-align: center;
              width: 45%;
            }
            .sig-space {
              height: 30px;
            }
            @media print {
              body { padding: 3mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="kuitansi-container">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 40px; max-width: 40px; margin-bottom: 4px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />` 
                : `<span style="font-size: 18px; display: block; margin-bottom: 2px;">${setup?.logoUrl || '🌱'}</span>`
              }
              <h2>${koperasiName.toUpperCase()}</h2>
              <p>${sloganKoperasi}</p>
              <p>${alamatKoperasi}</p>
              <p>${statusBadanHukum}</p>
            </div>
            
            <div class="title">Struk Bukti Setoran Simpanan</div>
            
            <div class="meta-section">
              <div class="meta-row"><span>No. Transaksi:</span> <b>${data.txId}</b></div>
              <div class="meta-row"><span>Tanggal / Jam:</span> <b>${data.tanggal} / ${getTransactionTime(data.txId)}</b></div>
              <div class="meta-row"><span>No. Anggota:</span> <b>${data.member.noAnggota}</b></div>
              <div class="meta-row"><span>Nama Anggota:</span> <b>${data.member.nama}</b></div>
            </div>
            
            <div class="items-section">
              ${itemsRowsHtml}
            </div>
            
            <div class="total-section">
              <span>TOTAL SETORAN :</span>
              <span>${formatRupiah(totalAmount)}</span>
            </div>
            
            <div class="terbilang-section">
              Terbilang: "${nominalTerbilang}"
            </div>
            
            <p style="font-size: 7.5px; text-align: center; color: #444; line-height: 1.2; margin: 8px 0;">
              Bukti setoran simpanan kuitansi elektronik sah. Disimpan secara aman dalam database koperasi. Struk ini sah sebagai bukti penyimpanan asli.
            </p>
            
            <div class="signatures">
              <div class="sig-col">
                <p>Pembayar / Anggota</p>
                <div class="sig-space"></div>
                <p><b>( ${data.member.nama} )</b></p>
              </div>
              <div class="sig-col">
                <p>Bendahara Koperasi</p>
                <div class="sig-space"></div>
                <p><b>( Anggi Anggraeni )</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSimpananSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anggotaId) {
      alert("Pilih anggota terlebih dahulu!");
      return;
    }

    const valPokok = parseInputRupiah(jumlahPokok);
    const valWajib = parseInputRupiah(jumlahWajib);
    const valSukarela = parseInputRupiah(jumlahSukarela);

    if (valPokok <= 0 && valWajib <= 0 && valSukarela <= 0) {
      alert("Masukkan nominal setoran minimal pada salah satu jenis simpanan (Pokok, Wajib, atau Sukarela)!");
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

    const tId = `TX-${Date.now()}`;
    const batchData: Omit<Simpanan, 'id'>[] = [];

    if (valPokok > 0) {
      batchData.push({
        anggotaId,
        tanggal,
        jenis: 'Pokok',
        jumlah: valPokok,
        keterangan: keterangan || 'Pembayaran Setoran Pokok',
        transaksiId: tId
      });
    }
    if (valWajib > 0) {
      batchData.push({
        anggotaId,
        tanggal,
        jenis: 'Wajib',
        jumlah: valWajib,
        keterangan: keterangan || 'Pembayaran Setoran Wajib',
        transaksiId: tId
      });
    }
    if (valSukarela > 0) {
      batchData.push({
        anggotaId,
        tanggal,
        jenis: 'Sukarela',
        jumlah: valSukarela,
        keterangan: keterangan || 'Pembayaran Setoran Sukarela',
        transaksiId: tId
      });
    }

    onAddSimpanan(batchData);

    const member = members.find(m => m.id === anggotaId);
    if (member) {
      setReceiptData({
        member,
        items: batchData.map(b => ({
          jenis: b.jenis as any,
          jumlah: b.jumlah,
          keterangan: b.keterangan
        })),
        txId: tId,
        tanggal
      });
    }

    // Reset inputs
    setJumlahPokok('');
    setJumlahWajib('');
    setJumlahSukarela('');
    setKeterangan('');
  };

  // Dynamic Manasuka Calculation Logic using setup property
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
    const message = `Halo ${member.nama} (${member.noAnggota}),%0A%0APerhitungan Bunga Jasa Simpanan Manasuka ${rate}% ${setup.namaKoperasi} untuk periode ${targetBulan}/${targetTahun} telah berhasil didistribusikan ke saldo tabungan Anda.%0A%0A*Rincian:*%0A- Total Simpanan: Rp ${total.toLocaleString('id-ID')}%0A- Jasa Manasuka (${rate}%): *Rp ${reward.toLocaleString('id-ID')}* (Telah ditambahkan ke Simpanan Sukarela)%0A%0ATerima kasih atas partisipasi aktif Anda di ${setup.namaKoperasi}.`;
    
    const waUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Input Tabungan di Kiri */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm self-start">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><Wallet className="w-5 h-5"/></span>
              Setor Simpanan Anggota
            </h3>
            <button 
              onClick={() => { setIsManasukaModalOpen(true); handleCalculateManasuka(); }}
              className="text-white bg-slate-800 hover:bg-slate-900 border border-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-455 shrink-0"/> Dividen Manasuka {setup.jasaSimpananSukarelaPersen}%
            </button>
          </div>

          <form onSubmit={handleSimpananSubmit} className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">PILIH ANGGOTA SETORAN</label>
              <select 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-medium"
                value={anggotaId}
                onChange={(e) => setAnggotaId(e.target.value)}
                required
              >
                <option value="">-- Cari Nama / ID Anggota --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.noAnggota} - {m.nama}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">TANGGAL TRANSAKSI</label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700 font-semibold"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id font-bold text-amber-600">RESI IDENTIFIER</label>
                <div className="px-3 py-2 text-xs bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/60 font-mono font-bold rounded-lg truncate">
                  AUTO GENERATED
                </div>
              </div>
            </div>

            {/* SPLIT Rincian Setoran 1x Transaksi */}
            <div className="space-y-3 p-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 tracking-wider block uppercase">Rincian Saluran Nominal Setor:</span>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>Simpanan Pokok</span>
                  {hasPokokPaid ? (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded">Auto-Disabled (Sudah Pernah Bayar)</span>
                  ) : (
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 rounded">Satu Kali Saja (Default 50.000)</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder={hasPokokPaid ? "Sudah pernah menyetor simpanan pokok" : "Masukkan simpanan pokok (Awal bergabung)"}
                    className={`w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-203 border-slate-200 dark:border-slate-700 font-mono ${
                      hasPokokPaid ? 'opacity-55 bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-400' : ''
                    }`}
                    value={jumlahPokok}
                    onChange={(e) => setJumlahPokok(formatInputRupiah(e.target.value))}
                    disabled={hasPokokPaid}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>Simpanan Wajib</span>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-955/40 px-1.5 rounded">Rutin Bulanan (Default 50.000)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan simpanan wajib"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-850 dark:text-slate-203 border-slate-200 dark:border-slate-700 font-mono"
                    value={jumlahWajib}
                    onChange={(e) => setJumlahWajib(formatInputRupiah(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>Simpanan Sukarela</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/40 px-1.5 rounded">Bebas & Fleksibel</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium font-mono">Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan simpanan sukarela"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono"
                    value={jumlahSukarela}
                    onChange={(e) => setJumlahSukarela(formatInputRupiah(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">CATATAN / PENGANTAR TRANSAKSI</label>
              <input 
                type="text"
                placeholder="Misal: Penyetoran kasir Budi Santoso..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:outline-emerald-700"
                 value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 border-t border-emerald-600 cursor-pointer shadow-sm animate-hover"
            >
              <Receipt className="w-4 h-4 shrink-0"/> Bukukan Setoran & Cetak Resi tunggal
            </button>
          </form>
        </div>

        {/* List Tabungan di Kanan */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600"/>
              Riwayat Mutasi Tabungan Koperasi
            </h3>
            {/* Filters */}
            <div className="flex gap-2 text-xs">
              <select 
                className="p-1 px-2 border rounded bg-slate-50 dark:bg-slate-900 dark:text-slate-200 text-slate-600 outline-none"
                value={filterAnggotaOpt}
                onChange={(e) => setFilterAnggotaOpt(e.target.value)}
              >
                <option value="">Semua Anggota</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
              <select 
                className="p-1 px-2 border rounded bg-slate-50 dark:bg-slate-900 dark:text-slate-200 text-slate-600 outline-none font-bold"
                value={filterJenisOpt}
                onChange={(e) => setFilterJenisOpt(e.target.value)}
              >
                <option value="">Semua Jenis</option>
                <option value="Pokok">Pokok</option>
                <option value="Wajib">Wajib</option>
                <option value="Sukarela">Sukarela</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full table-auto text-left text-sm text-slate-600 dark:text-slate-350">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Anggota</th>
                  <th className="px-4 py-2.5">Jenis</th>
                  <th className="px-4 py-2.5">Jumlah Setoran</th>
                  <th className="px-4 py-2.5 text-center">Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-xs text-slate-750 dark:text-slate-250">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Tidak ada rincian setoran terekam</td>
                  </tr>
                ) : (
                  filteredHistory.map((s) => {
                    const mb = members.find(m => m.id === s.anggotaId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-55/50 dark:hover:bg-slate-700/20">
                        <td className="px-4 py-3">{s.tanggal}</td>
                        <td className="px-4 py-3 w-1/3">
                          <p className="font-sans font-semibold leading-tight text-slate-800 dark:text-slate-200">{mb?.nama || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-404 mt-0.5">{mb?.noAnggota}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.jumlah < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' :
                            s.jenis === 'Pokok' ? 'bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20' : 
                            s.jenis === 'Wajib' ? 'bg-amber-50 text-amber-750 dark:bg-amber-955/20' : 
                            'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'
                          }`}>
                            {s.jumlah < 0 ? 'Penarikan' : s.jenis}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold ${s.jumlah < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {s.jumlah < 0 ? `-${formatRupiah(Math.abs(s.jumlah))}` : formatRupiah(s.jumlah)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            type="button"
                            onClick={() => viewReceiptForTxId(s.transaksiId || s.id, s)}
                            className="p-1 px-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-200 cursor-pointer transition flex items-center justify-center mx-auto"
                            title="Cetak Resi"
                          >
                            <Printer className="w-3.5 h-3.5"/>
                          </button>
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

      {/* AUTOMATIC JASA MANASUKA MANAGEMENT PANEL (DURABLE SETUP-BASED DYNAMIC CALCULATOR) */}
      <AnimatePresence>
        {isManasukaModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-5 text-white shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="font-bold text-lg">Pusat Dividen Jasa Manasuka Bulanan</h3>
                    <p className="text-xs text-emerald-100 font-light mt-0.5">Bunga harian senilai {setup.jasaSimpananSukarelaPersen}% per bulan otomatis disalurkan ke simpanan sukarela</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManasukaModalOpen(false)}
                  className="text-white hover:text-slate-300 font-mono text-sm border border-slate-600 hover:border-slate-400 font-bold px-2.5 py-1 rounded cursor-pointer"
                >
                  Tutup Panel
                </button>
              </div>

              {/* Calculator Settings */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-750 flex items-center justify-between flex-wrap gap-4 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase">Periode Hitung:</span>
                  <select 
                    value={targetBulan} 
                    onChange={(e) => setTargetBulan(e.target.value)}
                    className="p-1 px-2 border rounded text-xs bg-white text-slate-700"
                  >
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Okt</option>
                    <option value="11">Nov</option>
                    <option value="12">Des</option>
                  </select>
                  <select 
                    value={targetTahun} 
                    onChange={(e) => setTargetTahun(e.target.value)}
                    className="p-1 px-2 border rounded text-xs bg-white text-slate-700"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                  <button 
                    onClick={handleCalculateManasuka}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded cursor-pointer transition shadow"
                  >
                    Kalkulasi Jasa ({setup.jasaSimpananSukarelaPersen}%)
                  </button>
                </div>
                
                <button 
                  onClick={handlePostAllInterest}
                  disabled={calculatedLogs.length === 0 || logsPosted}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition shadow flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5"/> Posting Buku & Sinkronkan Akun
                </button>
              </div>

              {/* Grid content space */}
              <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/10">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2">ID Anggota</th>
                      <th className="px-4 py-2">Nama Anggota</th>
                      <th className="px-4 py-2">Total Saldo Simpanan</th>
                      <th className="px-4 py-2">Dividen Jasa ({setup.jasaSimpananSukarelaPersen}%)</th>
                      <th className="px-4 py-2 text-center">Beri Tahu Anggota (WA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {calculatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">Silahkan lakukan kalkulasi periode terlebih dahulu</td>
                      </tr>
                    ) : (
                      calculatedLogs.map((log, index) => {
                        const mInfo = members.find(m => m.id === log.anggotaId);
                        return (
                          <tr key={index} className="hover:bg-slate-55/40 text-slate-750 dark:text-slate-300">
                            <td className="px-4 py-2 font-bold">{mInfo?.noAnggota}</td>
                            <td className="px-4 py-2 font-sans font-medium">{mInfo?.nama}</td>
                            <td className="px-4 py-2">{formatRupiah(log.totalSimpanan)}</td>
                            <td className="px-4 py-2 font-semibold text-emerald-600">{formatRupiah(log.jumlahApresiasi)}</td>
                            <td className="px-4 py-2 text-center">
                              <button 
                                onClick={() => mInfo && triggerWhatsAppRedirect(mInfo, log.totalSimpanan, log.jumlahApresiasi)}
                                className="px-2.5 py-1 bg-green-150 text-green-800 hover:bg-green-700 hover:text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <Phone className="w-3 h-3 shrink-0"/> Kirim Nota WA
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

      {/* CONSOLIDATED RECEIPT MODAL (KUITANSI TRANSAKSI THERMAL-STYLE PIXEL PERFECT DETAIL) */}
      <AnimatePresence>
        {receiptData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full max-h-[75vh] border border-slate-300 dark:border-slate-750 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4"
            >
              {/* Close Button X (Kembali ke Menu Utama) */}
              <button 
                onClick={() => setReceiptData(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer z-50 border border-slate-150 dark:border-slate-700/50"
                title="Selesai & Kembali ke Menu Utama"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Receipt Body Frame */}
              <div id="thermal-receipt-print" className="border border-slate-200 bg-amber-50/10 dark:bg-slate-900/20 p-5 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 shadow-inner relative space-y-4 overflow-y-auto flex-1">
                
                {/* Decorative cut marks */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%)] bg-[size:8px_8px] -translate-y-1 opacity-40"></div>

                {/* Header Cooperative logo & Details */}
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <div className="flex justify-center items-center mb-1.5">
                    {setup.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                      <img src={setup.logoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-full" />
                    ) : (
                      <span className="text-3xl">{setup.logoUrl || '🌱'}</span>
                    )}
                  </div>
                  <h4 className="font-sans font-bold text-base tracking-tight">{setup.namaKoperasi}</h4>
                  <p className="text-[9px] font-sans text-slate-500 uppercase font-bold tracking-wider mt-0.5">{setup.slogan}</p>
                  {setup.noBadanHukum && (
                    <p className="text-[8px] font-mono text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 inline-block mt-0.5 font-bold">Badan Hukum: {setup.noBadanHukum}</p>
                  )}
                  <p className="text-[9px] text-slate-400 mt-1 block max-w-xs mx-auto leading-tight">{setup.alamatKantor}</p>
                </div>

                {/* Invoice Meta */}
                <div className="space-y-1 py-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>RESI NO:</span>
                    <span className="font-bold">{receiptData.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TANGGAL:</span>
                    <span>{receiptData.tanggal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KASIR:</span>
                    <span>ADMINISTRATOR (SYSTEM)</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
                    <span>ID ANGGOTA:</span>
                    <span className="font-bold">{receiptData.member.noAnggota}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NAMA ANGGOTA:</span>
                    <span className="font-semibold">{receiptData.member.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NO. TELEPON:</span>
                    <span>{receiptData.member.noHp}</span>
                  </div>
                </div>

                {/* Items details breakdown */}
                <div className="space-y-2 py-2 border-t border-b border-dashed border-slate-300">
                  <div className="grid grid-cols-12 font-bold text-[10px] text-slate-400">
                    <span className="col-span-5">JENIS REKENING</span>
                    <span className="col-span-3 text-right">JUMLAH</span>
                  </div>
                  
                  {receiptData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 text-slate-700 dark:text-slate-300 py-0.5">
                      <div className="col-span-5 font-bold">
                        Simpanan {item.jenis}
                        {item.keterangan && <span className="block text-[8px] font-normal font-sans text-slate-400 leading-none">{item.keterangan}</span>}
                      </div>
                      <div className="col-span-7 text-right font-semibold">{formatRupiah(item.jumlah)}</div>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center py-1 font-bold text-sm tracking-tight border-b border-dashed border-slate-300 pb-3">
                  <span className="font-sans text-xs uppercase text-slate-500">TOTAL SETORAN :</span>
                  <span className="text-emerald-700 dark:text-emerald-400 text-base">{formatRupiah(receiptData.items.reduce((sum, item) => sum + item.jumlah, 0))}</span>
                </div>

                {/* Legal note */}
                <div className="text-center text-[8px] text-slate-400 font-sans leading-normal pt-1.5">
                  Bukti setoran simpanan kuitansi elektronik syah. Disave secara aman dalam server database koperasi. Simpan struk ini sebagai referensi berharga.
                </div>

                {/* Signature zone block */}
                <div className="grid grid-cols-2 pt-4 text-[9px] text-center text-slate-500 font-sans border-t border-slate-150 dark:border-slate-800">
                  <div className="space-y-12">
                    <p>Bendahara Koperasi</p>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">Anggi Anggraeni</p>
                  </div>
                  <div className="space-y-12">
                    <p>Anggota Penyetor</p>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 underline">{receiptData.member.nama}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons (Non-Printable zone) */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => handlePrintSavingsReceipt(receiptData)}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 border text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition text-center"
                >
                  Cetak / Simpan PDF Struk
                </button>
                <button 
                  onClick={() => setReceiptData(null)}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition text-center"
                >
                  Selesai & Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================= LOAN / FINANCING SCHEDULER (PINJAMAN DENGAN 1% PROVISI) =================
interface PinjamanProps {
  setup: KoperasiSetup;
  members: Member[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  onAddPinjaman: (p: Omit<Pinjaman, 'id'>) => void;
  onEditPinjaman: (p: Pinjaman) => void;
  onDeletePinjaman: (id: string) => void;
  pengajuanPinjaman: PengajuanPinjaman[];
  onApprovePengajuanPinjaman: (id: string, catatan?: string, customNominal?: number) => void;
  onRejectPengajuanPinjaman: (id: string, catatan?: string) => void;
  availableCash?: number;
}

export function PinjamanView({ 
  setup, 
  members, 
  pinjaman, 
  angsuran, 
  onAddPinjaman, 
  onEditPinjaman, 
  onDeletePinjaman,
  pengajuanPinjaman,
  onApprovePengajuanPinjaman,
  onRejectPengajuanPinjaman,
  availableCash = 0
}: PinjamanProps) {
  const [anggotaId, setAnggotaId] = useState('');
  const [nominalStr, setNominalStr] = useState('');
  const [tenor, setTenor] = useState(10);
  const [bungaFlat, setBungaFlat] = useState(1.5); // user-inputted basis % per month
  const [pDate, setPDate] = useState(new Date().toISOString().substring(0, 10));

  // Admin sub tab toggle (Akad Aktif vs Pengajuan)
  const [adminSubTab, setAdminSubTab] = useState<'kontrak' | 'pengajuan'>('kontrak');

  // Interactive approval/rejection notes modal
  const [actionModal, setActionModal] = useState<{ id: string; type: 'APPROVE' | 'REJECT' } | null>(null);
  const [catatanPengurusForm, setCatatanPengurusForm] = useState('');
  const [approvedNominalStr, setApprovedNominalStr] = useState('');

  const handleActionWithNotes = (id: string, type: 'APPROVE' | 'REJECT') => {
    setActionModal({ id, type });
    setCatatanPengurusForm('');
    const prop = pengajuanPinjaman.find(p => p.id === id);
    if (prop && type === 'APPROVE') {
      setApprovedNominalStr(new Intl.NumberFormat('id-ID').format(prop.nominalPinjaman));
    } else {
      setApprovedNominalStr('');
    }
  };

  const handleActionSubmit = () => {
    if (!actionModal) return;
    if (actionModal.type === 'APPROVE') {
      const prop = pengajuanPinjaman.find(p => p.id === actionModal.id);
      if (prop) {
        const cleanNum = parseFloat(approvedNominalStr.replace(/\D/g, ''));
        const approvedNominal = isNaN(cleanNum) || cleanNum <= 0 ? prop.nominalPinjaman : cleanNum;
        const provisiRate = prop.biayaProvisiPersen || setup.biayaProvisiPersen || 0;
        const provisiDipotong = approvedNominal * (provisiRate / 100);
        const diterima = approvedNominal - provisiDipotong;

        if (diterima > availableCash) {
          alert(`Transaksi Ditolak: Saldo Kas Koperasi tidak mencukupi untuk pencairan pinjaman ini!\nKas Koperasi yang tersedia saat ini: ${formatRupiah(availableCash)}\nNominal pencairan (net): ${formatRupiah(diterima)}`);
          return;
        }

        onApprovePengajuanPinjaman(actionModal.id, catatanPengurusForm, isNaN(cleanNum) || cleanNum <= 0 ? undefined : cleanNum);
      }
    } else {
      onRejectPengajuanPinjaman(actionModal.id, catatanPengurusForm);
    }
    setActionModal(null);
  };

  // Edit states
  const [editingPinjaman, setEditingPinjaman] = useState<Pinjaman | null>(null);
  const [deletingPinjaman, setDeletingPinjaman] = useState<Pinjaman | null>(null);

  // Active loan detection for validation
  const activeLoan = useMemo(() => {
    if (!anggotaId) return null;
    return pinjaman.find(p => p.anggotaId === anggotaId && p.status === 'Belum Lunas');
  }, [anggotaId, pinjaman]);

  const modalProposal = useMemo(() => {
    if (!actionModal) return null;
    return pengajuanPinjaman.find(p => p.id === actionModal.id);
  }, [actionModal, pengajuanPinjaman]);

  const editPreviews = useMemo(() => {
    if (!editingPinjaman) return null;
    const nominal = parseFloat(editingPinjaman.nominalPinjaman.toString());
    if (isNaN(nominal) || nominal <= 0) return null;

    const provisiRate = editingPinjaman.biayaProvisiPersen ?? setup.biayaProvisiPersen ?? 1.0;
    const provisiDipotong = nominal * (provisiRate / 100);
    const jumlahDiterima = nominal - provisiDipotong;
    const angsuranPokokPerBulan = nominal / editingPinjaman.tenor;

    let totalJasa = 0;
    const isMenurun = setup.jenisBungaPinjaman === 'menurun';

    if (isMenurun) {
      for (let t = 1; t <= editingPinjaman.tenor; t++) {
        const sisaPokok = nominal - (t - 1) * angsuranPokokPerBulan;
        const jasaBulan = sisaPokok * (editingPinjaman.bungaFlatPersen / 100);
        totalJasa += jasaBulan;
      }
    } else {
      const jasaBulanConstant = (nominal * editingPinjaman.bungaFlatPersen) / 100;
      totalJasa = jasaBulanConstant * editingPinjaman.tenor;
    }

    const jasaPerBulan = totalJasa / editingPinjaman.tenor;
    const totalAngsuranPerBulan = angsuranPokokPerBulan + jasaPerBulan;
    const totalWajibBayar = nominal + totalJasa;

    return {
      nominal,
      provisiDipotong,
      provisiRate,
      jumlahDiterima,
      angsuranPokokPerBulan,
      jasaPerBulan,
      totalAngsuranPerBulan,
      totalWajibBayar
    };
  }, [editingPinjaman, setup]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPinjaman || !editPreviews) return;

    onEditPinjaman({
      ...editingPinjaman,
      nominalPinjaman: editPreviews.nominal,
      provisiDipotong: editPreviews.provisiDipotong,
      jumlahDiterima: editPreviews.jumlahDiterima,
      angsuranPokokPerBulan: editPreviews.angsuranPokokPerBulan,
      jasaPerBulan: editPreviews.jasaPerBulan,
      totalAngsuranPerBulan: editPreviews.totalAngsuranPerBulan,
      totalWajibBayar: editPreviews.totalWajibBayar
    });

    setEditingPinjaman(null);
    alert("Kontrak Kredit Pembiayaan Anggota Berhasil Diperbarui!");
  };

  const handlePrintLoanContract = (p: Pinjaman) => {
    const member = members.find(m => m.id === p.anggotaId);
    if (!member) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }

    const koperasiName = setup?.namaKoperasi || "Koperasi Simpan Pinjam Dana Segar";
    const statusBadanHukum = setup?.noBadanHukum ? `Badan Hukum No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';
    const alamatKoperasi = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const sloganKoperasi = setup?.slogan || "Membantu Kesejahteraan Anggota";

    const nominalTerbilang = terbilang(p.nominalPinjaman) + " Rupiah";

    printWindow.document.write(`
      <html>
        <head>
          <title>AKAD_KREDIT_${p.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700&display=swap');
            body {
              font-family: 'Courier Prime', monospace, Courier, sans-serif;
              padding: 20px;
              color: #000;
              background-color: #fff;
              max-width: 500px;
              margin: 0 auto;
            }
            .contract-container {
              border: 1px dashed #000;
              padding: 15px;
              border-radius: 4px;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .header img {
              max-height: 50px;
              max-width: 50px;
              margin-bottom: 6px;
              border-radius: 50%;
              object-fit: cover;
            }
            .header h2 {
              margin: 0;
              font-size: 14px;
              letter-spacing: 1px;
            }
            .header p {
              margin: 3px 0;
              font-size: 9px;
            }
            .title {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              margin: 12px 0;
              letter-spacing: 1px;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .meta-section {
              font-size: 9px;
              line-height: 1.5;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
            }
            .details-section {
              font-size: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
              line-height: 1.4;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
            }
            .detail-row.bold {
              font-weight: bold;
            }
            .terbilang-section {
              font-size: 8px;
              font-style: italic;
              margin-bottom: 15px;
              line-height: 1.4;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 20px;
              font-size: 9px;
            }
            .sig-col {
              text-align: center;
              width: 150px;
            }
            .sig-space {
              height: 40px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="contract-container">
            <div class="header">
              \${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? \`<img src="\${setup.logoUrl}" style="max-height: 50px; max-width: 50px; margin-bottom: 6px; border-radius: 50%; object-fit: cover; vertical-align: middle;" />\` 
                : \`<span style="font-size: 24px; display: block; margin-bottom: 4px;">\${setup?.logoUrl || '🌱'}</span>\`
              }
              <h2>\${koperasiName.toUpperCase()}</h2>
              <p>\${sloganKoperasi}</p>
              <p>\${alamatKoperasi}</p>
              <p>\${statusBadanHukum}</p>
            </div>
            
            <div class="title">Surat Akad Perjanjian Kredit Pinjaman</div>
            
            <div class="meta-section">
              <div class="meta-row"><span>No. Kontrak:</span> <b>\${p.id}</b></div>
              <div class="meta-row"><span>Waktu Realisasi:</span> <b>\${p.tanggal} / \${getTransactionTime(p.id)}</b></div>
              <div class="meta-row"><span>No. Anggota:</span> <b>\${member.noAnggota}</b></div>
              <div class="meta-row"><span>Nama Penerima:</span> <b>\${member.nama}</b></div>
              <div class="meta-row"><span>No. HP / Alamat:</span> <b>\${member.noHp} / \${member.alamat || '-'}</b></div>
            </div>
            
            <div class="details-section">
              <div class="detail-row bold"><span>Plafond Pengajuan:</span> <span>\${formatRupiah(p.nominalPinjaman)}</span></div>
              <div class="detail-row"><span>Biaya Provisi (\${p.biayaProvisiPersen || setup.biayaProvisiPersen || 0}%):</span> <span style="color: #666;">-\${formatRupiah(p.provisiDipotong)}</span></div>
              <div class="detail-row bold" style="color: #059669;"><span>Plafond Bersih Diterima:</span> <span>\${formatRupiah(p.jumlahDiterima)}</span></div>
              
              <div style="margin: 6px 0; border-top: 1px dotted #000;"></div>
              
              <div class="detail-row"><span>Jangka Waktu (Tenor):</span> <span>\${p.tenor} Bulan</span></div>
              <div class="detail-row"><span>Suku Jasa Koperasi:</span> <span>\${p.bungaFlatPersen}% per Bulan</span></div>
              <div class="detail-row"><span>Metode Perhitungan Jasa:</span> <span>\${setup.jenisBungaPinjaman === 'menurun' ? 'Menurun (Efektif)' : 'Tetap (Flat)'}</span></div>
              
              <div style="margin: 6px 0; border-top: 1px dotted #000;"></div>
              
              <div class="detail-row"><span>Angsuran Pokok / bln:</span> <span>\${formatRupiah(p.angsuranPokokPerBulan)}</span></div>
              <div class="detail-row"><span>Jasa Koperasi / bln (rata-rata):</span> <span>\${formatRupiah(p.jasaPerBulan)}</span></div>
              <div class="detail-row bold" style="font-size: 11px;"><span>Angsuran Bulanan:</span> <span>\${formatRupiah(p.totalAngsuranPerBulan)} / Bulan</span></div>
              <div class="detail-row bold"><span>Total Kewajiban Pelunasan:</span> <span>\${formatRupiah(p.totalWajibBayar)}</span></div>
              <div class="detail-row"><span>Status Pembayaran Saat Ini:</span> <span style="text-transform: uppercase; font-weight: bold;">\${p.status}</span></div>
            </div>
            
            <div class="terbilang-section">
              Terbilang (Plafond Pengajuan): "\${nominalTerbilang}"
            </div>
            
            <p style="font-size: 7.5px; text-align: justify; color: #333; line-height: 1.3; margin: 10px 0;">
              Surat Akad Kredit elektronik ini bersifat mengikat dan sah secara hukum antara pihak Koperasi dengan Anggota yang bersangkutan. Anggota berkewajiban melakukan pembayaran setoran angsuran setiap bulan sebelum tanggal jatuh tempo yang disepakati sesuai dengan ketentuan AD/ART Koperasi.
            </p>
            
            <div class="signatures">
              <div class="sig-col">
                <p>Penerima Manfaat / Anggota</p>
                <div class="sig-space"></div>
                <p><b>( \${member.nama} )</b></p>
              </div>
              <div class="sig-col">
                <p>Pengurus Koperasi</p>
                <div class="sig-space"></div>
                <p><b>( Ketua / Kasir Koperasi )</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Dynamic preview calculation parameters with support for flat or decreasing balance method
  const previews = useMemo(() => {
    const nominal = parseFloat(nominalStr.replace(/\D/g, ''));
    if (isNaN(nominal) || nominal <= 0) return null;

    const provisiRate = setup.biayaProvisiPersen ?? 1.0;
    const provisiDipotong = nominal * (provisiRate / 100);
    const jumlahDiterima = nominal - provisiDipotong;
    const angsuranPokokPerBulan = nominal / tenor;

    let totalJasa = 0;
    let amortizationSchedule: { bulan: number; sisaPokok: number; pokok: number; jasa: number; total: number }[] = [];
    const isMenurun = setup.jenisBungaPinjaman === 'menurun';

    if (isMenurun) {
      // Decreasing balance calculation
      for (let t = 1; t <= tenor; t++) {
        const sisaPokok = nominal - (t - 1) * angsuranPokokPerBulan;
        const jasaBulan = sisaPokok * (bungaFlat / 100);
        totalJasa += jasaBulan;
        amortizationSchedule.push({
          bulan: t,
          sisaPokok,
          pokok: angsuranPokokPerBulan,
          jasa: jasaBulan,
          total: angsuranPokokPerBulan + jasaBulan
        });
      }
    } else {
      // Standard Flat calculation
      const jasaBulanConstant = (nominal * bungaFlat) / 100;
      totalJasa = jasaBulanConstant * tenor;
      for (let t = 1; t <= tenor; t++) {
        amortizationSchedule.push({
          bulan: t,
          sisaPokok: nominal - (t - 1) * angsuranPokokPerBulan,
          pokok: angsuranPokokPerBulan,
          jasa: jasaBulanConstant,
          total: angsuranPokokPerBulan + jasaBulanConstant
        });
      }
    }

    const jasaPerBulan = totalJasa / tenor; // Average monthly interest for list/db compatibility
    const totalAngsuranPerBulan = angsuranPokokPerBulan + jasaPerBulan;
    const totalWajibBayar = nominal + totalJasa;

    return {
      nominal,
      provisiDipotong,
      provisiRate,
      jumlahDiterima,
      angsuranPokokPerBulan,
      jasaPerBulan,
      totalAngsuranPerBulan,
      totalWajibBayar,
      amortizationSchedule,
      isMenurun
    };
  }, [nominalStr, tenor, bungaFlat, setup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anggotaId || !previews) return;

    if (activeLoan) {
      alert(`Gagal mengajukan pinjaman! Anggota ini masih memiliki pinjaman berjalan yang belum lunas sebesar ${formatRupiah(activeLoan.nominalPinjaman)}.`);
      return;
    }

    // --- COOPERATIVE CASH VALIDATION ---
    if (previews.jumlahDiterima > availableCash) {
      alert(`Transaksi Ditolak: Saldo Kas Koperasi tidak mencukupi untuk pencairan pinjaman ini!\nKas Koperasi yang tersedia saat ini: ${formatRupiah(availableCash)}\nNominal pencairan (net): ${formatRupiah(previews.jumlahDiterima)}`);
      return;
    }

    onAddPinjaman({
      anggotaId,
      tanggal: pDate,
      nominalPinjaman: previews.nominal,
      tenor,
      bungaFlatPersen: bungaFlat,
      biayaProvisiPersen: previews.provisiRate,
      provisiDipotong: previews.provisiDipotong,
      jumlahDiterima: previews.jumlahDiterima,
      status: 'Belum Lunas',
      angsuranPokokPerBulan: previews.angsuranPokokPerBulan,
      jasaPerBulan: previews.jasaPerBulan,
      totalAngsuranPerBulan: previews.totalAngsuranPerBulan,
      totalWajibBayar: previews.totalWajibBayar
    });

    setNominalStr('');
    alert("Kontrak Permohonan Kredit Pinjaman Baru Berhasil Disetujui!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Simulation form */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm self-start space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 rounded-lg"><HandCoins className="w-5 h-5"/></span>
            Buka Pinjaman Baru
          </h3>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border tracking-wide uppercase ${
            setup.jenisBungaPinjaman === 'menurun' 
              ? 'bg-purple-55 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400' 
              : 'bg-emerald-55 text-emerald-700 border-emerald-250 dark:bg-emerald-900/20 dark:text-emerald-400'
          }`}>
            Metode: {setup.jenisBungaPinjaman === 'menurun' ? 'MENURUN (EFEKTIF)' : 'TETAP (FLAT)'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Penerima Manfaat Pinjaman</label>
            <select 
              value={anggotaId} 
              onChange={(e) => setAnggotaId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
              required
            >
              <option value="">-- Cari Nama / ID Anggota --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.noAnggota} - {m.nama}</option>
              ))}
            </select>
            {activeLoan && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-start gap-2 mt-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Akad Berjalan Terdeteksi!</p>
                  <p className="text-[11px] mt-0.5 text-rose-600 dark:text-rose-400">
                    Anggota ini masih memiliki pinjaman aktif senilai <strong>{formatRupiah(activeLoan.nominalPinjaman)}</strong> yang belum lunas. Selesaikan/lunasi pinjaman berjalan terlebih dahulu untuk membuka pinjaman baru.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Jadwal Penarikan</label>
              <input 
                type="date"
                value={pDate} 
                onChange={(e) => setPDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 font-semibold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Suku Jasa / bln (%)</label>
              <input 
                type="number" step="0.1"
                value={bungaFlat} 
                onChange={(e) => setBungaFlat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-orange-400 font-bold font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id font-bold text-slate-700 dark:text-slate-300">Plafond Pengajuan</label>
              <div className="relative">
                <span className="absolute left-2.5 text-slate-400 top-2.5 text-xs text-slate-500 font-mono font-bold">Rp</span>
                <input 
                  type="text"
                  placeholder="Contoh: 10.000.000"
                  value={nominalStr} 
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/\D/g, '');
                    const formatted = rawVal ? new Intl.NumberFormat('id-ID').format(parseInt(rawVal, 10)) : '';
                    setNominalStr(formatted);
                  }}
                  className="w-full pl-8 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold font-mono focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              {(() => {
                const cleanVal = parseFloat(nominalStr.replace(/\D/g, '')) || 0;
                if (cleanVal > 0) {
                  return (
                    <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 italic leading-none pt-0.5">
                      Terbilang: {terbilang(cleanVal)} Rupiah
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Tenor Cicilan (Bulan)</label>
              <select 
                value={tenor}
                onChange={(e) => setTenor(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 font-bold"
              >
                <option value={3}>3 Bulan</option>
                <option value={6}>6 Bulan</option>
                <option value={10}>10 Bulan</option>
                <option value={12}>12 Bulan</option>
                <option value={18}>18 Bulan</option>
                <option value={24}>24 Bulan</option>
              </select>
            </div>
          </div>

          {/* Simulator Calculations preview Box */}
          {previews && (
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/45 border border-slate-150 dark:border-slate-700/60 rounded-xl space-y-3 font-mono text-xs text-slate-650 dark:text-slate-350">
              <p className="font-bold border-b pb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[9px] flex justify-between items-center">
                <span>Rencana Jadwal Kredit Angsuran</span>
                <span className="text-[8px] bg-slate-200 dark:bg-slate-850 px-1 rounded text-slate-500">Biaya Administrasi: {setup.biayaProvisiPersen}%</span>
              </p>
              
              <div className="space-y-1 border-b border-dashed pb-2">
                <div className="flex justify-between">
                  <span>Potongan Provisi ({previews.provisiRate}%):</span>
                  <span className="text-rose-600 font-bold">-{formatRupiah(previews.provisiDipotong)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 text-[13px] pt-1">
                  <span>Kas Diterima Tangan:</span>
                  <span>{formatRupiah(previews.jumlahDiterima)}</span>
                </div>
              </div>

              {/* Installment breakdown list */}
              <div className="space-y-1 text-[11px] leading-relaxed">
                <div className="flex justify-between">
                  <span>Angsuran Pokok / bln:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(previews.angsuranPokokPerBulan)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{previews.isMenurun ? 'Rata-rata Jasa / bln:' : 'Jasa Bunga Koperasi / bln:'}</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-300">{formatRupiah(previews.jasaPerBulan)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-850 dark:text-slate-100 pt-1.5 border-t">
                  <span>Rata-rata Cicilan / bln:</span>
                  <span className="text-emerald-800 dark:text-emerald-400">{formatRupiah(previews.totalAngsuranPerBulan)} / bln</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Akumulasi Wajib Setor:</span>
                  <span>{formatRupiah(previews.totalWajibBayar)}</span>
                </div>
              </div>

              {/* Collapsible/Scrollable detail amortization schedule table (Extremely premium addition) */}
              <div className="pt-2 border-t border-slate-150">
                <span className="text-[8.5px] font-bold text-slate-400 hover:text-slate-600 block mb-1 uppercase tracking-wider">Tabel Amortisasi Cicilan Bulanan:</span>
                <div className="max-h-[110px] overflow-y-auto border rounded border-slate-100 dark:border-slate-800 text-[9px] bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-850">
                  <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-bold text-slate-400 text-center">
                    <span className="col-span-2 text-left">Bln</span>
                    <span className="col-span-3 text-right">Pokok</span>
                    <span className="col-span-3 text-right">Jasa Bunga</span>
                    <span className="col-span-4 text-right">Tagihan</span>
                  </div>
                  {previews.amortizationSchedule.map((sched) => (
                    <div key={sched.bulan} className="grid grid-cols-12 px-2 py-1 hover:bg-slate-50/50 dark:hover:bg-slate-950/40 text-center font-mono">
                      <span className="col-span-2 text-left font-bold text-slate-500">#{sched.bulan}</span>
                      <span className="col-span-3 text-right text-slate-600 dark:text-slate-400">{sched.pokok.toLocaleString('id-ID')}</span>
                      <span className="col-span-3 text-right text-emerald-600 font-semibold">{sched.jasa.toLocaleString('id-ID')}</span>
                      <span className="col-span-4 text-right font-bold text-slate-850 dark:text-slate-200">{Math.round(sched.total).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          <button 
            type="submit"
            disabled={!!activeLoan}
            className={`w-full font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer shadow-sm animate-hover flex justify-center items-center gap-1.5 ${
              activeLoan 
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <HandCoins className="w-4 h-4 shrink-0"/> {activeLoan ? 'Ditolak: Masih Memiliki Pinjaman' : 'Sahkan & Cairkan Kontrak Pinjaman'}
          </button>
        </form>
      </div>

      {/* Right Column containing both tables */}
      <div className="lg:col-span-7 space-y-6 flex flex-col">
        {/* Contracts and Applications table list */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600"/>
              <h3 className="text-base font-bold text-slate-750 dark:text-slate-200">
                Data Pembiayaan & Kredit
              </h3>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setAdminSubTab('kontrak')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  adminSubTab === 'kontrak'
                    ? 'bg-white dark:bg-slate-850 shadow-sm text-slate-850 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
                }`}
              >
                Akad Berjalan ({pinjaman.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminSubTab('pengajuan')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer relative ${
                  adminSubTab === 'pengajuan'
                    ? 'bg-white dark:bg-slate-855 shadow-sm text-slate-850 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
                }`}
              >
                Pengajuan Anggota
                {pengajuanPinjaman.filter(p => p.status === 'Pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                    {pengajuanPinjaman.filter(p => p.status === 'Pending').length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {adminSubTab === 'kontrak' ? (
            <div className="overflow-x-auto flex-1 max-h-[300px]">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2.5">Arsip</th>
                    <th className="px-4 py-2.5">Anggota</th>
                    <th className="px-4 py-2.5">Nominal Disbursed</th>
                    <th className="px-4 py-2.5">Tenor & Cicilan</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-xs">
                  {pinjaman.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-455 italic">Belum ada kontrak kredit tersimpan</td>
                    </tr>
                  ) : (
                    pinjaman.map((p) => {
                      const mInfo = members.find(m => m.id === p.anggotaId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <p className="font-bold">{p.tanggal}</p>
                            <p className="text-[9px] text-slate-400">Provisi {p.biayaProvisiPersen}%: {formatRupiah(p.provisiDipotong)}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{mInfo?.nama}</p>
                            <p className="text-[10px] text-slate-400">{mInfo?.noAnggota}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{formatRupiah(p.nominalPinjaman)}</p>
                            <p className="text-[9px] text-emerald-600">Disbursed: {formatRupiah(p.jumlahDiterima)}</p>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(p.totalAngsuranPerBulan)}/bln</p>
                            <p className="text-[9px] text-slate-400">Tenor: {p.tenor} Bulan | Jasa: {p.bungaFlatPersen}%</p>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handlePrintLoanContract(p)}
                                className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded transition cursor-pointer"
                                title="Cetak Akad Perjanjian"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingPinjaman(p)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 rounded transition cursor-pointer"
                                title="Koreksi Kontrak"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingPinjaman(p)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded transition cursor-pointer"
                                title="Hapus Kontrak"
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
          ) : (
            <div className="overflow-x-auto flex-1 max-h-[300px]">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2.5">Tanggal</th>
                    <th className="px-4 py-2.5">Anggota</th>
                    <th className="px-4 py-2.5">Nominal & Netto</th>
                    <th className="px-4 py-2.5">Tenor & Jasa</th>
                    <th className="px-4 py-2.5">Keterangan</th>
                    <th className="px-4 py-2.5 text-center w-20">Aksi / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-xs">
                  {pengajuanPinjaman.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-455 italic">Belum ada pengajuan pinjaman tersimpan</td>
                    </tr>
                  ) : (
                    pengajuanPinjaman.map((p) => {
                      const mInfo = members.find(m => m.id === p.anggotaId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{p.tanggalPengajuan}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{mInfo?.nama || 'Anggota'}</p>
                            <p className="text-[10px] text-slate-400">{mInfo?.noAnggota || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-850 dark:text-slate-100">{formatRupiah(p.nominalPinjaman)}</p>
                            <p className="text-[9px] text-slate-400">Adm Provisi {p.biayaProvisiPersen}%: -{formatRupiah(p.provisiDipotong)}</p>
                            <p className="text-[9.5px] text-emerald-600 font-bold">Bersih: {formatRupiah(p.jumlahDiterima)}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{p.tenor} Bulan</p>
                            <p className="text-[9px] text-slate-400">Jasa Flat: {p.bungaFlatPersen}%/bln</p>
                          </td>
                          <td className="px-4 py-3 font-sans max-w-[150px]">
                            <p className="text-xs text-slate-600 dark:text-slate-350 line-clamp-2" title={p.alasanPengajuan}>{p.alasanPengajuan || '-'}</p>
                            {p.catatanPengurus && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-450 italic mt-1 font-semibold">Tanggapan: {p.catatanPengurus}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.status === 'Pending' ? (
                              <div className="flex flex-col sm:flex-row gap-1 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleActionWithNotes(p.id, 'APPROVE')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9.5px] cursor-pointer transition"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleActionWithNotes(p.id, 'REJECT')}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[9.5px] cursor-pointer transition"
                                >
                                  Tolak
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                p.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {p.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* INTERACTIVE APPROVE/REJECT NOTES MODAL */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-150 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {actionModal.type === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-rose-600" />
                )}
                {actionModal.type === 'APPROVE' ? 'Persetujuan Pengajuan Pinjaman' : 'Penolakan Pengajuan Pinjaman'}
              </h3>
              
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="text-xs leading-relaxed">
                  Apakah Anda yakin ingin {actionModal.type === 'APPROVE' ? 'menyetujui & mencairkan' : 'menolak'} permohonan pinjaman ini?
                </p>

                {actionModal.type === 'APPROVE' && modalProposal && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-750 rounded-xl space-y-2.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">PEMOHON:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{modalProposal.namaAnggota} ({modalProposal.noAnggota})</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">DIAJUKAN AWAL:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{formatRupiah(modalProposal.nominalPinjaman)} ({modalProposal.tenor} Bulan)</span>
                    </div>
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2.5 space-y-1.5">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">NOMINAL ACC (DISETUJUI):</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold font-mono text-xs">Rp</span>
                        <input 
                          type="text"
                          required
                          value={approvedNominalStr}
                          onChange={(e) => {
                            const rawVal = e.target.value.replace(/\D/g, '');
                            const formatted = rawVal ? new Intl.NumberFormat('id-ID').format(parseInt(rawVal, 10)) : '';
                            setApprovedNominalStr(formatted);
                          }}
                          placeholder="Contoh: 2.000.000"
                          className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      {(() => {
                        const cleanNum = parseFloat(approvedNominalStr.replace(/\D/g, '')) || 0;
                        if (cleanNum > 0) {
                          const provisi = (cleanNum * modalProposal.biayaProvisiPersen) / 100;
                          const diterima = cleanNum - provisi;
                          return (
                            <div className="text-[10.5px] space-y-0.5 text-slate-500 font-medium pt-0.5 leading-relaxed">
                              <p className="font-sans italic text-emerald-650 dark:text-emerald-400">Terbilang: {terbilang(cleanNum)} Rupiah</p>
                              <p>Potongan Provisi ({modalProposal.biayaProvisiPersen}%): {formatRupiah(provisi)}</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Jumlah diterima anggota: {formatRupiah(diterima)}</p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Catatan / Tanggapan Pengurus</label>
                  <textarea
                    rows={2}
                    value={catatanPengurusForm}
                    onChange={(e) => setCatatanPengurusForm(e.target.value)}
                    placeholder="Masukkan catatan keputusan pengurus (misal: Suku bunga disepakati, Alasan penolakan, dsb.)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-700 focus:outline-none placeholder:text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition cursor-pointer ${
                    actionModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Konfirmasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LOAN CONTRACT MODAL */}
      <AnimatePresence>
        {editingPinjaman && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-lg w-full border border-slate-150 dark:border-slate-750 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-600" />
                Koreksi Kontrak Kredit Pembiayaan
              </h3>
              
              <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Penerima Manfaat Pinjaman</label>
                  <select 
                    value={editingPinjaman.anggotaId} 
                    onChange={(e) => setEditingPinjaman({ ...editingPinjaman, anggotaId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                    required
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.noAnggota} - {m.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Jadwal Penarikan</label>
                    <input 
                      type="date"
                      value={editingPinjaman.tanggal} 
                      onChange={(e) => setEditingPinjaman({ ...editingPinjaman, tanggal: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suku Jasa / bln (%)</label>
                    <input 
                      type="number" step="0.1"
                      value={editingPinjaman.bungaFlatPersen} 
                      onChange={(e) => setEditingPinjaman({ ...editingPinjaman, bungaFlatPersen: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-orange-400 font-bold font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-bold text-slate-700 dark:text-slate-300">Plafond Pengajuan</label>
                    <div className="relative">
                      <span className="absolute left-2.5 text-slate-400 top-2.5 text-xs text-slate-500 font-mono font-bold">Rp</span>
                      <input 
                        type="number"
                        value={editingPinjaman.nominalPinjaman} 
                        onChange={(e) => setEditingPinjaman({ ...editingPinjaman, nominalPinjaman: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tenor Cicilan (Bulan)</label>
                    <select 
                      value={editingPinjaman.tenor}
                      onChange={(e) => setEditingPinjaman({ ...editingPinjaman, tenor: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 font-bold"
                    >
                      <option value={3}>3 Bulan</option>
                      <option value={6}>6 Bulan</option>
                      <option value={10}>10 Bulan</option>
                      <option value={12}>12 Bulan</option>
                      <option value={18}>18 Bulan</option>
                      <option value={24}>24 Bulan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status Pembayaran</label>
                  <select 
                    value={editingPinjaman.status}
                    onChange={(e) => setEditingPinjaman({ ...editingPinjaman, status: e.target.value as 'Belum Lunas' | 'Lunas' })}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 font-bold"
                  >
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Lunas">Lunas</option>
                  </select>
                </div>

                {editPreviews && (
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-900/45 border border-slate-150 dark:border-slate-700/60 rounded-xl space-y-2 font-mono text-[11px] text-slate-650 dark:text-slate-350">
                    <p className="font-bold border-b pb-1 text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[9px] flex justify-between items-center">
                      <span>Simulasi Rencana Setelah Koreksi</span>
                      <span className="text-[8px] bg-slate-200 dark:bg-slate-850 px-1 rounded text-slate-500">Provisi: {setup.biayaProvisiPersen}%</span>
                    </p>
                    <div className="flex justify-between">
                      <span>Potongan Provisi ({editPreviews.provisiRate}%):</span>
                      <span className="text-rose-600 font-bold">-{formatRupiah(editPreviews.provisiDipotong)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Kas Bersih Diterima:</span>
                      <span>{formatRupiah(editPreviews.jumlahDiterima)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Angsuran Pokok / bln:</span>
                      <span>{formatRupiah(editPreviews.angsuranPokokPerBulan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jasa Koperasi / bln:</span>
                      <span>{formatRupiah(editPreviews.jasaPerBulan)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-850 dark:text-slate-200 border-t pt-1">
                      <span>Rata-rata Cicilan / bln:</span>
                      <span className="text-emerald-800 dark:text-emerald-400">{formatRupiah(editPreviews.totalAngsuranPerBulan)} / bln</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-850 dark:text-slate-200">
                      <span>Total Kewajiban Bayar:</span>
                      <span>{formatRupiah(editPreviews.totalWajibBayar)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 justify-end text-xs font-semibold">
                  <button 
                    type="button" 
                    onClick={() => setEditingPinjaman(null)}
                    className="px-4 py-2 border text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        
        {deletingPinjaman && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full border border-slate-150 dark:border-slate-750 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Hapus Kontrak Pinjaman?
              </h3>
              
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-350">
                <p>
                  Apakah Anda yakin ingin menghapus Kontrak Pinjaman milik{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {members.find(m => m.id === deletingPinjaman.anggotaId)?.nama || 'Anggota'}
                  </strong>
                  ?
                </p>
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-400">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Peringatan Dampak
                  </p>
                  <p className="mt-1">
                    Tindakan ini permanen. Seluruh data kontrak kredit dan riwayat simulasi yang terkait dengan pinjaman ini akan dihapus dari database. Riwayat setoran angsuran yang berkaitan mungkin akan terpengaruh.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 justify-end text-xs font-semibold">
                <button 
                  type="button" 
                  onClick={() => setDeletingPinjaman(null)}
                  className="px-4 py-2 border text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    onDeletePinjaman(deletingPinjaman.id);
                    setDeletingPinjaman(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                >
                  Hapus Kontrak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================= INSTALMENTS LOG (PEMBAYARAN ANGSURAN & REMINDERS) =================
interface AngsuranProps {
  setup?: KoperasiSetup;
  members: Member[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  onAddAngsuran: (a: Omit<Angsuran, 'id'>, updatePinjamanStatus: boolean) => void;
  onDeleteAngsuran?: (id: string) => void;
}

export function AngsuranView({ setup, members, pinjaman, angsuran, onAddAngsuran, onDeleteAngsuran }: AngsuranProps) {
  const [pinjamanId, setPinjamanId] = useState('');
  const [bayarDate, setBayarDate] = useState(new Date().toISOString().substring(0, 10));
  const [customAmount, setCustomAmount] = useState('');
  const [bulanKe, setBulanKe] = useState(1);
  const [notes, setNotes] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<Angsuran | null>(null);

  // Auto outstanding calculation
  const calculatedActiveContract = useMemo(() => {
    if (!pinjamanId) return null;
    const contract = pinjaman.find(p => p.id === pinjamanId);
    if (!contract) return null;

    const mInfo = members.find(m => m.id === contract.anggotaId);
    // Calculated total already paid
    const relatedPayments = angsuran.filter(a => a.pinjamanId === pinjamanId);
    const totalTerbayar = relatedPayments.reduce((acc, c) => acc + c.jumlahBayar, 0);
    const sisa = contract.status === 'Lunas' ? 0 : Math.max(0, Math.round(contract.nominalPinjaman - (totalTerbayar * (contract.nominalPinjaman / contract.totalWajibBayar))));

    return {
      contract,
      mInfo,
      totalTerbayar,
      sisa,
      relatedPayments
    };
  }, [pinjamanId, pinjaman, angsuran, members]);

  // Sisa Pinjaman Otomatis calculation
  const getRemainingPrincipal = (pId: string, totalContractDebt: number) => {
    const pContract = pinjaman.find(p => p.id === pId);
    if (!pContract) return 0;
    if (pContract.status === 'Lunas') return 0;
    const historicalPays = angsuran.filter(a => a.pinjamanId === pId);
    const totalPaid = historicalPays.reduce((acc, curr) => acc + curr.jumlahBayar, 0);
    const remainingPrincipal = pContract.nominalPinjaman - (totalPaid * (pContract.nominalPinjaman / pContract.totalWajibBayar));
    return Math.max(0, Math.round(remainingPrincipal));
  };

  // Print a single installment receipt (Kuitansi Resmi)
  const handlePrintSingle = (a: Angsuran) => {
    const member = members.find(m => m.id === a.anggotaId);
    const pContract = pinjaman.find(p => p.id === a.pinjamanId);
    const remaining = pContract ? getRemainingPrincipal(a.pinjamanId, pContract.totalWajibBayar) : 0;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }
    
    const koperasiName = setup?.namaKoperasi || "Koperasi Simpan Pinjam Dana Segar";
    const statusBadanHukum = setup?.noBadanHukum ? `Badan Hukum No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';
    const alamatKoperasi = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const sloganKoperasi = setup?.slogan || "Membantu Kesejahteraan Anggota";
    
    const nominalTerbilang = terbilang(a.jumlahBayar) + " Rupiah";
    
    printWindow.document.write(`
      <html>
        <head>
          <title>KUITANSI_ANGSURAN_${a.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');
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
              font-family: 'Courier Prime', monospace, Courier, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 3mm;
              box-sizing: border-box;
            }
            .kuitansi-container {
              width: 100%;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 6px;
            }
            .header img {
              max-height: 40px;
              max-width: 40px;
              margin-bottom: 4px;
              border-radius: 50%;
              object-fit: cover;
            }
            .header h2 {
              margin: 0;
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .header p {
              margin: 2px 0;
              font-size: 8px;
            }
            .title {
              text-align: center;
              font-size: 10px;
              font-weight: bold;
              margin: 8px 0;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              text-decoration: underline;
            }
            .row-meta {
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 4px;
            }
            .details {
              font-size: 9px;
              line-height: 1.4;
              margin-bottom: 10px;
            }
            .detail-field {
              display: flex;
              margin-bottom: 3px;
            }
            .label {
              width: 95px;
              flex-shrink: 0;
            }
            .colon {
              width: 10px;
              flex-shrink: 0;
            }
            .value {
              flex-grow: 1;
              font-weight: bold;
              word-break: break-word;
            }
            .amount-box {
              font-size: 11px;
              font-weight: bold;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              margin: 10px 0;
              text-align: center;
              display: block;
              width: 100%;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              font-size: 8px;
            }
            .sig-col {
              text-align: center;
              width: 45%;
            }
            .sig-space {
              height: 30px;
            }
            @media print {
              body { padding: 3mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="kuitansi-container">
            <div class="header">
              ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
                ? `<img src="${setup.logoUrl}" style="max-height: 40px; max-width: 40px; margin-bottom: 4px; border-radius: 50%; object-fit: cover; vertical-align: middle;" /><br/>` 
                : `<span style="font-size: 18px; display: block; margin-bottom: 2px;">${setup?.logoUrl || '🌱'}</span>`
              }
              <h2>${koperasiName.toUpperCase()}</h2>
              <p>${sloganKoperasi}</p>
              <p>${alamatKoperasi}</p>
              <p>${statusBadanHukum}</p>
            </div>
            
            <div class="title">Kuitansi Pembayaran Angsuran</div>
            
            <div class="row-meta">
              <span>No. TRX: <b>TRX-${a.id.toUpperCase().substring(0, 8)}</b></span>
              <span>Waktu: <b>${a.tanggal}</b></span>
            </div>
            
            <div class="details">
              <div class="detail-field">
                <span class="label">Telah Terima Dari</span>
                <span class="colon">:</span>
                <span class="value">${member?.nama || 'N/A'} [No. Anggota: ${member?.noAnggota || 'N/A'}]</span>
              </div>
              <div class="detail-field">
                <span class="label">Banyaknya Uang</span>
                <span class="colon">:</span>
                <span class="value" style="font-size: 8.5px; font-style: italic;">"${nominalTerbilang}"</span>
              </div>
              <div class="detail-field">
                <span class="label">Untuk Pembayaran</span>
                <span class="colon">:</span>
                <span class="value">Angsuran Pinjaman Bulan Ke-${a.bulanKe}</span>
              </div>
              <div class="detail-field">
                <span class="label">ID / Info Kontrak</span>
                <span class="colon">:</span>
                <span class="value">Kontrak #${a.pinjamanId.substring(0, 8)} (Plafond: ${formatRupiah(pContract?.nominalPinjaman || 0)})</span>
              </div>
              <div class="detail-field">
                <span class="label">Sisa Saldo</span>
                <span class="colon">:</span>
                <span class="value" style="color: #000;">${formatRupiah(remaining)}</span>
              </div>
              ${a.keterangan ? `
              <div class="detail-field">
                <span class="label">Keterangan</span>
                <span class="colon">:</span>
                <span class="value" style="font-weight: normal; font-style: italic;">"${a.keterangan}"</span>
              </div>
              ` : ''}
            </div>
            
            <div class="amount-box">
              JUMLAH: ${formatRupiah(a.jumlahBayar)}
            </div>
            
            <div class="signatures">
              <div class="sig-col">
                <p>Penyetor / Anggota</p>
                <div class="sig-space"></div>
                <p><b>( ${member?.nama || '_________________'} )</b></p>
              </div>
              <div class="sig-col">
                <p>Bendahara Koperasi</p>
                <div class="sig-space"></div>
                <p><b>( Anggi Anggraeni )</b></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print all installment logs (Daftar / Laporan Mutasi Angsuran)
  const handlePrintAllHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker menghalangi pencetakan. Harap aktifkan popup/izin jendela baru untuk situs ini.");
      return;
    }

    const tableRows = angsuran
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
      .map(a => {
        const m = members.find(mem => mem.id === a.anggotaId);
        const pContract = pinjaman.find(p => p.id === a.pinjamanId);
        const remaining = pContract ? getRemainingPrincipal(a.pinjamanId, pContract.totalWajibBayar) : 0;
        return `
          <tr>
            <td><b>${m?.nama || 'N/A'}</b><br/><span style="font-size: 10px; color: #64748b;">ID: ${m?.noAnggota || 'N/A'}</span></td>
            <td>Bulan Ke-${a.bulanKe}</td>
            <td>${a.tanggal}</td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">${formatRupiah(a.jumlahBayar)}</td>
            <td style="text-align: right; color: #b91c1c;">${formatRupiah(remaining)}</td>
            <td>${a.keterangan || '-'}</td>
          </tr>
        `;
      }).join('');

    const koperasiName = setup?.namaKoperasi || "Koperasi Simpan Pinjam Dana Segar";
    const statusBadanHukum = setup?.noBadanHukum ? `Badan Hukum No: ${setup.noBadanHukum}` : 'Koperasi Simpan Pinjam Serbaguna';
    const alamatKoperasi = setup?.alamatKantor || "Kantor Pusat Koperasi";
    const sloganKoperasi = setup?.slogan || "Membantu Kesejahteraan Anggota";

    printWindow.document.write(`
      <html>
        <head>
          <title>DAFTAR_ANGSURAN_KOP_${new Date().toISOString().substring(0, 10)}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header { text-align: center; margin-bottom: 35px; border-bottom: 3px double #000; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 22px; color: #000; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 4px 0; font-size: 12px; color: #475569; }
            .report-title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
            th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: bold; text-transform: uppercase; color: #334155; }
            td { border: 1px solid #cbd5e1; padding: 8px 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer-info { display: flex; justify-content: space-between; margin-top: 55px; font-size: 11px; }
            .sig-block { text-align: center; width: 220px; }
            .sig-space { height: 60px; }
            .sig-line { border-top: 1px solid #000; margin-top: 8px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            ${setup?.logoUrl && setup.logoUrl.startsWith('data:image') 
              ? `<img src="${setup.logoUrl}" style="max-height: 60px; max-width: 60px; margin-bottom: 8px; border-radius: 50%; object-fit: cover; vertical-align: middle;" /><br/>` 
              : `<span style="font-size: 28px; display: block; margin-bottom: 8px;">${setup?.logoUrl || '🌱'}</span>`
            }
            <h1>${koperasiName.toUpperCase()}</h1>
            <p>${sloganKoperasi}</p>
            <p>${alamatKoperasi}</p>
            <p>${statusBadanHukum}</p>
          </div>
          
          <div class="report-title">LAPORAN MUTASI DAN TRANSAKSI SETORAN ANGSURAN</div>
          <p style="font-size: 11px; margin-bottom: 15px;">Dicetak pada: <b>${new Date().toLocaleString('id-ID')}</b></p>
          
          <table>
            <thead>
              <tr>
                <th>Nama Anggota</th>
                <th>Angsuran Ke-</th>
                <th>Tanggal Pembayaran</th>
                <th style="text-align: right;">Jumlah Nominal</th>
                <th style="text-align: right;">Sisa Piutang</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-info">
            <div>
              <p>Model Dokumen: Laporan Digital Koperasi</p>
              <p>Status Data: Validated & Synced</p>
            </div>
            <div class="sig-block">
              <p>Kasir / Pengurus Keuangan</p>
              <div class="sig-space"></div>
              <p class="sig-line">( ____________________ )</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Automatically calculate next installment number of selected loan based on database records
  React.useEffect(() => {
    if (calculatedActiveContract) {
      const relatedPayments = calculatedActiveContract.relatedPayments;
      if (relatedPayments && relatedPayments.length > 0) {
        const maxBulan = Math.max(...relatedPayments.map(a => a.bulanKe || 0));
        setBulanKe(maxBulan + 1);
      } else {
        setBulanKe(1);
      }
    } else {
      setBulanKe(1);
    }
  }, [calculatedActiveContract]);

  // Handle pay submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinjamanId || !calculatedActiveContract) return;

    // Use default contract instalment amount if custom fits empty
    const nominalToPay = parseFloat(customAmount) || calculatedActiveContract.contract.totalAngsuranPerBulan;
    if (isNaN(nominalToPay) || nominalToPay <= 0) return;

    if (nominalToPay < 5000) {
      const remainingDebt = calculatedActiveContract.sisa;
      if (Math.abs(nominalToPay - remainingDebt) > 1 && nominalToPay < remainingDebt) {
        alert("Jumlah Angsuran tidak boleh kurang dari Rp 5.000. Minimal transaksi adalah Rp 5.000.");
        return;
      }
    }

    // Check if after this payment, total received reaches or exceeds total contract liability
    const afterPayAmount = calculatedActiveContract.totalTerbayar + nominalToPay;
    const isLunas = afterPayAmount >= calculatedActiveContract.contract.totalWajibBayar;

    onAddAngsuran({
      pinjamanId,
      anggotaId: calculatedActiveContract.contract.anggotaId,
      tanggal: bayarDate,
      jumlahBayar: nominalToPay,
      bulanKe: bulanKe,
      keterangan: notes || `Pembayaran angsuran ke-${bulanKe}`
    }, isLunas);

    setCustomAmount('');
    setNotes('');
    setBulanKe(prev => prev + 1);
    alert(`Angsuran sejumlah ${formatRupiah(nominalToPay)} berhasil diproses!`);
  };

  // Filter out complete contracts to represent only pending loans
  const uncompletedContracts = useMemo(() => {
    return pinjaman.filter(p => p.status === 'Belum Lunas');
  }, [pinjaman]);

  // Browser HTML5 Web due reminder or custom notification push
  const handlePushNotice = (nama: string, sisa: number, phone: string) => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("PENGINGAT JATUH TEMPO", {
            body: `Tagihan Pinjaman ${nama} tersisa: ${formatRupiah(sisa)}. Mohon ingatkan anggota tersebut secara berkala.`,
            icon: "🌱"
          });
        } else {
          alert(`NOTIFIKASI PUSH SIMULATED: Tagihan Pinjaman ${nama} tersisa: ${formatRupiah(sisa)}. Hubungi lewat ${phone}.`);
        }
      });
    } else {
      alert(`NOTIFIKASI PUSH SIMULATED: Tagihan Pinjaman ${nama} tersisa: ${formatRupiah(sisa)}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Ribbon for due calculations */}
      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-2xl border border-yellow-250 dark:border-yellow-900/60 text-yellow-805 dark:text-yellow-300 flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-yellow-100 rounded-lg shrink-0 text-yellow-800"><AlertCircle className="w-5 h-5"/></span>
          <div>
            <h4 className="text-sm font-bold">Pemberitahuan & Pusat Kontrol Jatuh Tempo Bulanan</h4>
            <p className="text-xs text-yellow-650 dark:text-yellow-405 mt-0.5">Pantau piutang belum tertagih anggota koperasi secara real-time. Tekan tombol lonceng untuk manual simulasi Web Push Notification.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Record payment */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm self-start">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 rounded-lg"><CheckCircle2 className="w-5 h-5"/></span>
            Terima Setoran Angsuran Mandiri
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">PILIH KAS PINJAMAN AKTIF</label>
              <select 
                value={pinjamanId}
                onChange={(e) => {
                  setPinjamanId(e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                required
              >
                <option value="">-- Kontrak Berlaku --</option>
                {uncompletedContracts.map(p => {
                  const m = members.find(mem => mem.id === p.anggotaId);
                  return (
                    <option key={p.id} value={p.id}>{m?.nama} ({p.tanggal} - Plafond: {formatRupiah(p.nominalPinjaman)})</option>
                  );
                })}
              </select>
            </div>

            {calculatedActiveContract && (
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950/40 border rounded-xl font-mono text-xs text-slate-700 dark:text-slate-350">
                <div className="flex justify-between">
                  <span>Kontrak Pihak:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{calculatedActiveContract.mInfo?.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span>Setoran Wajib Bulanan:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(calculatedActiveContract.contract.totalAngsuranPerBulan)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total yang Sudah Dibayar:</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(calculatedActiveContract.totalTerbayar)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-rose-700">
                  <span>Sisa Saldo Tunggakan (Sisa Piutang):</span>
                  <span>{formatRupiah(calculatedActiveContract.sisa)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Angsuran Ke- (Bulan)</label>
                <input 
                  type="number" min={1}
                  value={bulanKe}
                  onChange={(e) => setBulanKe(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Tgl Pembayaran</label>
                <input 
                  type="date"
                  value={bayarDate}
                  onChange={(e) => setBayarDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-850"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 label-id">Jumlah Angsuran (Rp) <span className="text-[10px] text-slate-400 font-normal">(Kosongkan jika bayar penuh bulanan)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-medium">Rp</span>
                <input 
                  type="number"
                  placeholder={calculatedActiveContract ? String(calculatedActiveContract.contract.totalAngsuranPerBulan) : 'Contoh: 1000000'}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 label-id">Catatan Pembayaran</label>
              <input 
                type="text"
                placeholder="Misal: Pelunasan bulan ke-4..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-lg text-sm transition cursor-pointer shadow-sm animate-hover"
            >
              Bukukan Transaksi Angsuran
            </button>
          </form>
        </div>

        {/* Due schedule and tables */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 animate-pulse"/>
              Daftar Pembayaran Terselesaikan & Pengingat Anggota
            </h3>
            {angsuran.length > 0 && (
              <button
                onClick={handlePrintAllHistory}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition self-start cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Semua History
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1 max-h-[380px]">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-350">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2">Anggota</th>
                  <th className="px-4 py-2">Angsuran Ke-</th>
                  <th className="px-4 py-2">Jumlah Bayar</th>
                  <th className="px-4 py-2 text-center">Aksi / Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono text-xs">
                {angsuran.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-450 italic">Belum ada struk pembayaran angsuran tersimpan</td>
                  </tr>
                ) : (
                  angsuran.sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map((a) => {
                    const m = members.find(mem => mem.id === a.anggotaId);
                    const pContract = pinjaman.find(p => p.id === a.pinjamanId);
                    const remaining = pContract ? getRemainingPrincipal(a.pinjamanId, pContract.totalWajibBayar) : 0;
                    
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-4 py-2.5">
                          <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">{m?.nama}</p>
                          <p className="text-[10px] text-slate-400">Tgl Setor: {a.tanggal}</p>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-emerald-700">
                          Bulan Ke-{a.bulanKe}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-bold text-slate-850 dark:text-slate-100">{formatRupiah(a.jumlahBayar)}</p>
                          <p className="text-[9px] text-slate-405 hover:text-slate-650">Sisa Piutang: {formatRupiah(remaining)}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => m && handlePushNotice(m.nama, remaining, m.noHp)}
                              title="Kirim Simulated Push Reminder"
                              className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-350 rounded text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                            >
                              🔔 <span className="hidden sm:inline">Push</span>
                            </button>
                            <button 
                              onClick={() => setPreviewReceipt(a)}
                              title="Cetak Kuitansi Resmi"
                              className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-350 rounded text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span className="hidden sm:inline">Cetak</span>
                            </button>
                            {onDeleteAngsuran && (
                              <button 
                                onClick={() => {
                                  if (window.confirm("Apakah Anda yakin ingin menghapus catatan angsuran ini? Tindakan ini akan menghapus data permanen dari database.")) {
                                    onDeleteAngsuran(a.id);
                                  }
                                }}
                                className="p-1 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-350 rounded text-[10px] font-sans font-bold cursor-pointer transition flex items-center gap-0.5"
                                title="Hapus Catatan Angsuran"
                              >
                                <Trash2 className="w-3 h-3" /> <span className="hidden sm:inline">Hapus</span>
                              </button>
                            )}
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

      {/* Cash Repayment Receipt Preview Modal */}
      <AnimatePresence>
        {previewReceipt && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-slate-150 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Pratinjau Kuitansi Pembayaran Angsuran
                </h3>
                <button 
                  onClick={() => setPreviewReceipt(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content - Receipt details */}
              <div className="p-6 overflow-y-auto max-h-[480px]">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-950/40 relative overflow-hidden font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {/* Decorative background watermark */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-200 dark:text-slate-800/40 -rotate-12 pointer-events-none font-bold select-none text-2xl tracking-widest uppercase text-center opacity-40">
                    {setup?.namaKoperasi || "Dana Segar"} <br /> KUITANSI SAH
                  </div>

                  {/* Header info */}
                  <div className="text-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-4 mb-4">
                    <div className="flex justify-center items-center mb-1.5">
                      {setup?.logoUrl && setup.logoUrl.startsWith('data:image') ? (
                        <img src={setup.logoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-full" />
                      ) : (
                        <span className="text-3xl">{setup?.logoUrl || '🌱'}</span>
                      )}
                    </div>
                    <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm uppercase">
                      {setup?.namaKoperasi || "Koperasi Dana Segar"}
                    </h4>
                    <p className="text-[10px] font-sans mt-0.5 text-slate-500 dark:text-slate-400">
                      {setup?.slogan || "Membantu Anggota Mandiri Sejahtera"}
                    </p>
                    <p className="text-[9px] font-sans mt-0.5 text-slate-400 dark:text-slate-450">
                      {setup?.alamatKantor || "Kantor Pusat Koperasi"}
                    </p>
                    {setup?.noBadanHukum && (
                      <p className="text-[9px] font-sans text-slate-400 font-bold mt-0.5">
                        BH No: {setup.noBadanHukum}
                      </p>
                    )}
                  </div>

                  {/* Title of Receipt */}
                  <div className="text-center text-xs font-bold text-slate-800 dark:text-slate-250 underline uppercase tracking-wider mb-4">
                    Kuitansi Angsuran Pinjaman
                  </div>

                  {/* Transaction metadata */}
                  <div className="flex justify-between text-[9px] text-slate-450 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                    <span>No. TRX: <span className="font-bold text-slate-700 dark:text-slate-350">TRX-{previewReceipt.id.toUpperCase()}</span></span>
                    <span>Tgl Setor: <span className="font-bold text-slate-700 dark:text-slate-350">{previewReceipt.tanggal}</span></span>
                  </div>

                  {/* Receipt Items Grid */}
                  <div className="space-y-2.5 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800 mb-3">
                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">Nama Anggota</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 font-bold text-slate-800 dark:text-slate-200">
                        {members.find(m => m.id === previewReceipt.anggotaId)?.nama || "N/A"}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">Kode Anggota</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-300">
                        {members.find(m => m.id === previewReceipt.anggotaId)?.noAnggota || "N/A"}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">Pembayaran</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-200 font-bold text-emerald-600">
                        Angsuran Bulan Ke-{previewReceipt.bulanKe}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">ID Kontrak</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-300">
                        Contract #{previewReceipt.pinjamanId} 
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                          (Plafond: {formatRupiah(pinjaman.find(p => p.id === previewReceipt.pinjamanId)?.nominalPinjaman || 0)})
                        </span>
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">Tunggakan Sisa</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-200 font-bold">
                        {formatRupiah(pinjaman.find(p => p.id === previewReceipt.pinjamanId) ? getRemainingPrincipal(previewReceipt.pinjamanId, pinjaman.find(p => p.id === previewReceipt.pinjamanId)!.totalWajibBayar) : 0)}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-28 text-slate-450 shrink-0">Terbilang</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 text-slate-700 dark:text-slate-300 font-semibold italic text-[10px]">
                        "${terbilang(previewReceipt.jumlahBayar)} Rupiah"
                      </span>
                    </div>

                    {previewReceipt.keterangan && (
                      <div className="flex">
                        <span className="w-28 text-slate-450 shrink-0">Catatan</span>
                        <span className="w-4 text-center shrink-0">:</span>
                        <span className="flex-1 text-slate-600 dark:text-slate-400">
                          {previewReceipt.keterangan}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Big Total Box */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-900/40 rounded-lg p-3 text-center mb-4">
                    <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400 tracking-wider font-bold">Jumlah Pembayaran</span>
                    <h3 className="text-lg font-sans font-black text-emerald-800 dark:text-emerald-400 mt-1">
                      {formatRupiah(previewReceipt.jumlahBayar)}
                    </h3>
                  </div>

                  {/* Signatures simulation */}
                  <div className="flex justify-between text-[9px] text-slate-400 mt-5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-center w-5/12">
                      <p>Anggota / Pembayar</p>
                      <div className="h-8"></div>
                      <p className="font-bold underline text-slate-600 dark:text-slate-300">
                        {members.find(m => m.id === previewReceipt.anggotaId)?.nama || "________________"}
                      </p>
                    </div>
                    <div className="text-center w-5/12">
                      <p>Bendahara Koperasi</p>
                      <div className="h-8"></div>
                      <p className="font-bold underline text-slate-600 dark:text-slate-300">
                        Anggi Anggraeni
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-xs">
                <button 
                  onClick={() => setPreviewReceipt(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
                >
                  Kembali
                </button>
                <button 
                  onClick={() => {
                    handlePrintSingle(previewReceipt);
                    setPreviewReceipt(null);
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
