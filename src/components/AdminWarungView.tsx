import React, { useState, useMemo } from 'react';
import { WarungBarang, Member, PiutangWarung, Pembelian, PendapatanLain, KoperasiSetup, UserAccount, Simpanan, Pinjaman, Angsuran } from '../types';
import { formatRupiah, sortMembersNaturally } from '../utils/finance';
import { 
  Store, Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Sparkles, Upload,
  Users, Calendar, ArrowUpRight, ArrowDownLeft, Search, AlertCircle, ShoppingCart, Barcode, Tag,
  Coins, TrendingUp, DollarSign, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';
import { WarungPOSView } from './WarungPOSView';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { CetakLabelRakModal, generateStoreEan13 } from './CetakLabelRakModal';

interface AdminWarungViewProps {
  warungBarang: WarungBarang[];
  members: Member[];
  piutangWarung: PiutangWarung[];
  onAddBarang: (item: Omit<WarungBarang, 'id'>) => Promise<void>;
  onEditBarang: (item: WarungBarang) => Promise<void>;
  onDeleteBarang: (id: string) => Promise<void>;
  onAddPiutang: (item: Omit<PiutangWarung, 'id'>) => Promise<void>;
  onDeletePiutang: (id: string) => Promise<void>;
  pembelian: Pembelian[];
  onAddPembelian: (item: Omit<Pembelian, 'id'>) => Promise<void>;
  onDeletePembelian: (id: string) => Promise<void>;
  income: PendapatanLain[];
  onAddIncome: (item: Omit<PendapatanLain, 'id'>) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  setup?: KoperasiSetup;
  currentUserAccount?: UserAccount | null;
  simpanan?: Simpanan[];
  pinjaman?: Pinjaman[];
  angsuran?: Angsuran[];
}

export function AdminWarungView({
  warungBarang,
  members,
  piutangWarung,
  onAddBarang,
  onEditBarang,
  onDeleteBarang,
  onAddPiutang,
  onDeletePiutang,
  pembelian,
  onAddPembelian,
  onDeletePembelian,
  income,
  onAddIncome,
  onDeleteIncome,
  setup,
  currentUserAccount,
  simpanan = [],
  pinjaman = [],
  angsuran = []
}: AdminWarungViewProps) {
  // Navigation tabs for Unit Usaha Warung
  const [subTab, setSubTab] = useState<'pos' | 'barang' | 'penjualan' | 'pembelian' | 'piutang'>('pos');

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: string;
    itemName: string;
    itemDetails?: { label: string; value: string; isHighlight?: boolean }[];
    warningMessage?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Barang states
  const [editingBarang, setEditingBarang] = useState<WarungBarang | null>(null);
  const [showBarangForm, setShowBarangForm] = useState(false);
  const [showLabelRakModal, setShowLabelRakModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showCameraScannerInForm, setShowCameraScannerInForm] = useState(false);
  const [barangNama, setBarangNama] = useState('');
  const [barangHargaPokok, setBarangHargaPokok] = useState(''); // Harga Pokok / Modal (HPP)
  const [barangHarga, setBarangHarga] = useState(''); // Harga Jual Konsumen
  const [barangDeskripsi, setBarangDeskripsi] = useState('');
  const [barangFoto, setBarangFoto] = useState('');
  const [barangStok, setBarangStok] = useState('');
  const [barangSatuan, setBarangSatuan] = useState('pcs');
  const [customSatuan, setCustomSatuan] = useState('');
  const [barangKode, setBarangKode] = useState('');
  const [barangKategori, setBarangKategori] = useState('Sembako');
  const [isDragOverBarang, setIsDragOverBarang] = useState(false);

  // Valuation and Profit calculation for Warung Catalog
  const { totalNilaiModalStok, totalNilaiJualStok, totalPotensiKeuntungan, marginRataRata } = useMemo(() => {
    let modal = 0;
    let jual = 0;
    let untung = 0;
    warungBarang.forEach(item => {
      const stok = item.stok || 0;
      const hpp = item.hargaPokok || 0;
      const hj = item.harga || 0;
      modal += hpp * stok;
      jual += hj * stok;
      untung += (hj - hpp) * stok;
    });
    const margin = modal > 0 ? (untung / modal) * 100 : 0;
    return {
      totalNilaiModalStok: modal,
      totalNilaiJualStok: jual,
      totalPotensiKeuntungan: untung,
      marginRataRata: margin
    };
  }, [warungBarang]);

  // Live profit calculation for barang form
  const liveHpp = barangHargaPokok ? parseFloat(barangHargaPokok.replace(/\D/g, '')) || 0 : 0;
  const liveHj = barangHarga ? parseFloat(barangHarga.replace(/\D/g, '')) || 0 : 0;
  const liveKeuntungan = liveHj > 0 ? liveHj - liveHpp : 0;
  const liveMarginPersen = liveHpp > 0 && liveHj > 0 ? ((liveHj - liveHpp) / liveHpp) * 100 : 0;

  // Form states for Piutang Warung
  const [piuAnggotaId, setPiuAnggotaId] = useState('');
  const [piuDate, setPiuDate] = useState(new Date().toISOString().substring(0, 10));
  const [piuJenis, setPiuJenis] = useState<'hutang_baru' | 'pelunasan'>('hutang_baru');
  const [piuNominal, setPiuNominal] = useState('');
  const [piuNotes, setPiuNotes] = useState('');

  // Form states for Pembelian
  const [pemDate, setPemDate] = useState(new Date().toISOString().substring(0, 10));
  const [pemName, setPemName] = useState('');
  const [pemQty, setPemQty] = useState('1');
  const [pemPrice, setPemPrice] = useState('');
  const [pemNotes, setPemNotes] = useState('');

  // Form states for Penjualan
  const [penDate, setPenDate] = useState(new Date().toISOString().substring(0, 10));
  const [penType, setPenType] = useState<'tunai' | 'kredit'>('tunai');
  const [penAnggotaId, setPenAnggotaId] = useState('');
  const [penNominal, setPenNominal] = useState('');
  const [penNotes, setPenNotes] = useState('');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');
  const [piuMemberSearch, setPiuMemberSearch] = useState('');
  const [penMemberSearch, setPenMemberSearch] = useState('');

  const sortedMembers = useMemo(() => sortMembersNaturally(members), [members]);

  // Mapping saldo piutang warung per anggota
  const memberPiutangMap = useMemo(() => {
    const map: Record<string, number> = {};
    piutangWarung.forEach(pw => {
      if (!pw.anggotaId) return;
      const delta = pw.jenis === 'hutang_baru' ? (Number(pw.nominal) || 0) : -(Number(pw.nominal) || 0);
      map[pw.anggotaId] = (map[pw.anggotaId] || 0) + delta;
    });
    return map;
  }, [piutangWarung]);

  // Anggota terfilter untuk Piutang Form:
  // - Pada mode 'pelunasan': hanya anggota yang masih memiliki sisa piutang (> 0)
  // - Pada mode 'hutang_baru': semua anggota
  const piuFilteredMembers = useMemo(() => {
    const base = piuJenis === 'pelunasan'
      ? sortedMembers.filter(m => (memberPiutangMap[m.id] || 0) > 0)
      : sortedMembers;

    if (!piuMemberSearch.trim()) return base;
    const q = piuMemberSearch.toLowerCase().trim();
    return base.filter(m =>
      m.nama.toLowerCase().includes(q) ||
      m.noAnggota.toLowerCase().includes(q) ||
      (m.noHp && m.noHp.includes(q))
    );
  }, [sortedMembers, piuJenis, memberPiutangMap, piuMemberSearch]);

  const penFilteredMembers = useMemo(() => {
    if (!penMemberSearch.trim()) return sortedMembers;
    const q = penMemberSearch.toLowerCase().trim();
    return sortedMembers.filter(m =>
      m.nama.toLowerCase().includes(q) ||
      m.noAnggota.toLowerCase().includes(q) ||
      (m.noHp && m.noHp.includes(q))
    );
  }, [sortedMembers, penMemberSearch]);

  // Auto-select member for Piutang Form
  React.useEffect(() => {
    if (piuFilteredMembers.length > 0) {
      const exists = piuFilteredMembers.some(m => m.id === piuAnggotaId);
      if (!exists) {
        setPiuAnggotaId(piuFilteredMembers[0].id);
      }
    } else {
      setPiuAnggotaId('');
    }
  }, [piuFilteredMembers, piuAnggotaId]);

  // Auto-select member for Penjualan Form
  React.useEffect(() => {
    if (sortedMembers && sortedMembers.length > 0) {
      if (!penAnggotaId) setPenAnggotaId(sortedMembers[0].id);
    }
  }, [sortedMembers, penAnggotaId]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Hanya berkas gambar yang diperbolehkan!");
      return;
    }
    try {
      const compressed = await compressImage(file, 800, 800, 0.7);
      setBarangFoto(compressed);
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBarangFoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Barang
  const handleBarangSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangNama || !barangHarga || !barangDeskripsi) {
      alert("Mohon lengkapi seluruh field wajib!");
      return;
    }

    const priceNum = parseFloat(barangHarga.replace(/\D/g, ''));
    const hppNum = barangHargaPokok ? parseFloat(barangHargaPokok.replace(/\D/g, '')) : undefined;
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Harga jual barang harus berupa angka positif!");
      return;
    }

    let finalFotoUrl = barangFoto;
    if (barangFoto.startsWith('data:')) {
      try {
        finalFotoUrl = await compressImage(barangFoto, 800, 800, 0.7);
      } catch (err) {
        console.error("Error compressing data URI on submit:", err);
      }
    }

    const itemData = {
      namaBarang: barangNama,
      hargaPokok: hppNum && hppNum > 0 ? hppNum : undefined,
      harga: priceNum,
      deskripsi: barangDeskripsi,
      fotoUrl: finalFotoUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
      stok: barangStok ? parseInt(barangStok) : 99,
      satuan: barangSatuan === 'lainnya' ? customSatuan : barangSatuan,
      kodeBarang: barangKode.trim() || undefined,
      kategori: barangKategori.trim() || undefined
    };

    if (editingBarang) {
      await onEditBarang({ ...itemData, id: editingBarang.id });
    } else {
      await onAddBarang(itemData);
    }

    resetBarangForm();
  };

  // Submit Piutang Warung
  const handlePiutangSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseFloat(piuNominal.replace(/\D/g, ''));
    if (isNaN(nom) || nom <= 0 || !piuAnggotaId) {
      alert("Harap lengkapi data piutang dengan nominal yang valid!");
      return;
    }

    await onAddPiutang({
      anggotaId: piuAnggotaId,
      tanggal: piuDate,
      jenis: piuJenis,
      nominal: nom,
      keterangan: piuNotes.trim() || (piuJenis === 'hutang_baru' ? "Belanja Kredit Toko/Warung" : "Pembayaran Piutang Toko/Warung")
    });

    setPiuNominal('');
    setPiuNotes('');
    alert(piuJenis === 'hutang_baru' ? "Pencatatan piutang baru berhasil disimpan!" : "Pembayaran piutang warung berhasil disimpan! (Mengurangi piutang anggota & menambah Kas)");
  };

  // Submit Pembelian
  const handlePembelianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(pemQty);
    const prc = parseFloat(pemPrice.replace(/\D/g, ''));
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0 || !pemName.trim()) {
      alert("Harap lengkapi formulir pembelian dengan nilai yang valid!");
      return;
    }

    await onAddPembelian({
      tanggal: pemDate,
      namaBarang: pemName.trim(),
      kategori: 'persediaan_warung',
      kuantitas: qty,
      hargaSatuan: prc,
      totalHarga: qty * prc,
      keterangan: pemNotes.trim() || `Pembelian ${pemName.trim()}`
    });

    setPemName('');
    setPemQty('1');
    setPemPrice('');
    setPemNotes('');
    alert("Transaksi Pembelian/Restock Warung berhasil disimpan!");
  };

  // Submit Penjualan
  const handlePenjualanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = parseFloat(penNominal.replace(/\D/g, ''));
    if (isNaN(nom) || nom <= 0) {
      alert("Harap lengkapi data penjualan dengan nominal yang valid!");
      return;
    }

    if (penType === 'tunai') {
      await onAddIncome({
        tanggal: penDate,
        sumber: 'warung',
        nominal: nom,
        keterangan: penNotes.trim() || "Penjualan Tunai Warung Sembako/Barang"
      });
    } else {
      if (!penAnggotaId) {
        alert("Harap pilih anggota untuk transaksi kredit!");
        return;
      }
      await onAddPiutang({
        anggotaId: penAnggotaId,
        tanggal: penDate,
        jenis: 'hutang_baru',
        nominal: nom,
        keterangan: penNotes.trim() || "Belanja Kredit Toko/Warung"
      });
    }

    setPenNominal('');
    setPenNotes('');
    alert("Transaksi Penjualan Warung berhasil disimpan!");
  };

  const resetBarangForm = () => {
    setEditingBarang(null);
    setShowBarangForm(false);
    setBarangNama('');
    setBarangHargaPokok('');
    setBarangHarga('');
    setBarangDeskripsi('');
    setBarangFoto('');
    setBarangStok('');
    setBarangSatuan('pcs');
    setCustomSatuan('');
    setBarangKode('');
    setBarangKategori('Sembako');
  };

  const startEditBarang = (item: WarungBarang) => {
    setEditingBarang(item);
    setBarangNama(item.namaBarang);
    setBarangHargaPokok(item.hargaPokok ? item.hargaPokok.toLocaleString('id-ID') : '');
    setBarangHarga(item.harga ? item.harga.toLocaleString('id-ID') : '');
    setBarangDeskripsi(item.deskripsi);
    setBarangFoto(item.fotoUrl || '');
    setBarangStok(item.stok ? String(item.stok) : '');
    setBarangKode(item.kodeBarang || '');
    setBarangKategori(item.kategori || 'Sembako');
    
    const standardUnits = ['pcs', 'liter', 'Kg', 'gram', 'bungkus', 'dus'];
    if (item.satuan) {
      if (standardUnits.includes(item.satuan)) {
        setBarangSatuan(item.satuan);
        setCustomSatuan('');
      } else {
        setBarangSatuan('lainnya');
        setCustomSatuan(item.satuan);
      }
    } else {
      setBarangSatuan('pcs');
      setCustomSatuan('');
    }
    setShowBarangForm(true);
  };

  // Filter lists
  const filteredBarang = warungBarang.filter(b => {
    const term = searchQuery.toLowerCase();
    return b.namaBarang.toLowerCase().includes(term) || b.deskripsi.toLowerCase().includes(term);
  });

  const filteredPiutang = piutangWarung.filter(pw => {
    const member = members.find(m => m.id === pw.anggotaId);
    const term = searchQuery.toLowerCase();
    return (member?.nama || '').toLowerCase().includes(term) || 
           (member?.noAnggota || '').toLowerCase().includes(term) ||
           pw.keterangan.toLowerCase().includes(term);
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const totalPiutangSum = piutangWarung.reduce((acc, c) => {
    return acc + (c.jenis === 'hutang_baru' ? c.nominal : -c.nominal);
  }, 0);

  // Filter Pembelian: show only warung-related purchases
  const filteredPembelian = pembelian.filter(p => {
    const isWarungRelated = p.kategori === 'persediaan_warung' || p.kategori === 'persediaan_barang';
    const term = searchQuery.toLowerCase();
    return isWarungRelated && (
      p.namaBarang.toLowerCase().includes(term) ||
      p.keterangan.toLowerCase().includes(term)
    );
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Filter Penjualan: combined list of Cash Sales and Credit Sales
  const salesFromIncome = income.filter(i => i.sumber === 'warung').map(i => ({
    id: i.id,
    tanggal: i.tanggal,
    tipe: 'Tunai' as const,
    nama: 'Pembeli Umum / Tunai',
    noAnggota: '-',
    nominal: i.nominal,
    keterangan: i.keterangan,
    rawId: i.id,
    source: 'income' as const
  }));

  const salesFromPiutang = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').map(pw => {
    const m = members.find(mem => mem.id === pw.anggotaId);
    return {
      id: pw.id,
      tanggal: pw.tanggal,
      tipe: 'Kredit' as const,
      nama: m?.nama || 'Anggota Terhapus',
      noAnggota: m?.noAnggota || '-',
      nominal: pw.nominal,
      keterangan: pw.keterangan,
      rawId: pw.id,
      source: 'piutang' as const
    };
  });

  const combinedSales = [...salesFromIncome, ...salesFromPiutang].filter(sale => {
    const term = searchQuery.toLowerCase();
    return sale.nama.toLowerCase().includes(term) ||
           sale.keterangan.toLowerCase().includes(term) ||
           sale.noAnggota.toLowerCase().includes(term);
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const totalSalesTunai = income.filter(i => i.sumber === 'warung').reduce((sum, i) => sum + i.nominal, 0);
  const totalSalesKredit = piutangWarung.filter(pw => pw.jenis === 'hutang_baru').reduce((sum, pw) => sum + pw.nominal, 0);
  const totalPurchasesSum = pembelian.filter(p => p.kategori === 'persediaan_warung' || p.kategori === 'persediaan_barang').reduce((sum, p) => sum + p.totalHarga, 0);

  return (
    <div className="space-y-6" id="admin-warung-container">
      {/* Title Header area */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="p-3 bg-white/10 backdrop-blur-md rounded-2xl"><Store className="w-6 h-6 text-white"/></span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Unit Usaha Warung Koperasi</h2>
              <p className="text-xs text-emerald-100 mt-1">
                Kelola penjualan produk, kontrol stok, pembelian barang persediaan, serta kelola tagihan belanja kredit (Piutang Warung) anggota.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <button
              id="btn-buka-kasir-pos"
              onClick={() => { setSubTab('pos'); setSearchQuery(''); }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm border border-emerald-300/40 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Mesin Kasir POS</span>
            </button>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-emerald-200 block uppercase font-mono">Total Produk</span>
              <span className="text-sm font-bold font-mono">{warungBarang.length} Item</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-center min-w-[115px]">
              <span className="text-[10px] text-emerald-250 block uppercase font-mono">Sisa Piutang</span>
              <span className="text-sm font-bold font-mono text-amber-200">{formatRupiah(Math.max(0, totalPiutangSum))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-750 gap-4">
        <button 
          id="tab-pos"
          onClick={() => { setSubTab('pos'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'pos' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Kasir POS (Point of Sale)</span>
          <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[9px] font-black rounded-full uppercase tracking-wider">
            POS
          </span>
        </button>
        <button 
          id="tab-barang"
          onClick={() => { setSubTab('barang'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'barang' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">🛍️ Katalog & Stok Barang</span>
        </button>
        <button 
          id="tab-label-rak"
          onClick={() => setShowLabelRakModal(true)}
          className="pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
          title="Buka Cetak Label Harga Rak & Barcode Stiker"
        >
          <Tag className="w-3.5 h-3.5 text-emerald-600" />
          <span>🏷️ Label Rak & Barcode</span>
          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[9px] font-black rounded-full uppercase tracking-wider">
            Cetak
          </span>
        </button>
        <button 
          id="tab-penjualan"
          onClick={() => { setSubTab('penjualan'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'penjualan' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">📤 Catatan Penjualan</span>
        </button>
        <button 
          id="tab-pembelian"
          onClick={() => { setSubTab('pembelian'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'pembelian' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">📥 Catatan Pembelian Stok</span>
        </button>
        <button 
          id="tab-piutang"
          onClick={() => { setSubTab('piutang'); setSearchQuery(''); }}
          className={`pb-2.5 text-xs font-bold leading-none cursor-pointer border-b-2 transition ${
            subTab === 'piutang' 
              ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">💳 Rekap Piutang Anggota</span>
        </button>
      </div>

      {/* Searching Bar (Only displayed for non-POS tabs) */}
      {subTab !== 'pos' && (
        <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex gap-3 items-center shadow-xs">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-4 h-4" /></span>
            <input 
              type="text" 
              placeholder={
                subTab === 'barang' ? "Cari produk, deskripsi barang..." :
                subTab === 'piutang' ? "Cari nama debitur, mutasi piutang..." :
                subTab === 'pembelian' ? "Cari nama barang pembelian, keterangan..." :
                "Cari nama pembeli, keterangan penjualan..."
              }
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 rounded-lg placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Tab Contents: POS or regular 3-col grid */}
      {subTab === 'pos' ? (
        <WarungPOSView 
          warungBarang={warungBarang}
          members={members}
          piutangWarung={piutangWarung}
          setup={setup}
          currentUserAccount={currentUserAccount}
          onAddIncome={onAddIncome}
          onAddPiutang={onAddPiutang}
          onEditBarang={onEditBarang}
          onOpenCatalogTab={() => setSubTab('barang')}
          simpanan={simpanan}
          income={income}
          pinjaman={pinjaman}
          angsuran={angsuran}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {subTab === 'barang' && (
          <>
            {/* Goods List Column (Span 2 or 3 depending on form status) */}
            <div className={`${showBarangForm ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <Store className="w-4.5 h-4.5 text-emerald-600" />
                    Katalog Barang Usaha Warung
                  </h3>
                  {!showBarangForm && (
                    <div className="flex items-center gap-2">
                      <button 
                        id="btn-scan-kamera-admin"
                        onClick={() => setShowCameraScanner(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                        title="Scan Barcode menggunakan Kamera HP / Tablet / Laptop"
                      >
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">Scan Kamera</span>
                      </button>

                      <button 
                        id="btn-cetak-label-admin"
                        onClick={() => setShowLabelRakModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl transition cursor-pointer border border-emerald-300 dark:border-emerald-800 shadow-2xs"
                        title="Buka Cetak Label Harga Rak & Barcode Stiker"
                      >
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span>Cetak Label & Barcode</span>
                      </button>

                      <button 
                        id="btn-tambah-barang"
                        onClick={() => { resetBarangForm(); setShowBarangForm(true); }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Barang</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Valuation & Profit Metric Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-150 dark:border-slate-750">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Varian Produk</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{warungBarang.length} <span className="text-[10px] font-normal text-slate-400">item</span></p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-150 dark:border-slate-750">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" /> Modal Stok (HPP)
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{formatRupiah(totalNilaiModalStok)}</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-150 dark:border-slate-750">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-blue-500" /> Nilai Jual Stok
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{formatRupiah(totalNilaiJualStok)}</p>
                  </div>
                  <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" /> Potensi Laba
                    </p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      +{formatRupiah(totalPotensiKeuntungan)}
                    </p>
                  </div>
                </div>

                {filteredBarang.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Store className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Belum ada produk terekam atau cocok</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Gunakan tombol tambah untuk menambahkan produk baru.</p>
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 ${showBarangForm ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
                    {filteredBarang.map((item) => {
                      const hpp = item.hargaPokok || 0;
                      const untungPerUnit = item.harga - hpp;
                      const marginPersen = hpp > 0 ? (untungPerUnit / hpp) * 100 : 0;
                      const totalPotensiLaba = item.stok !== undefined ? untungPerUnit * item.stok : 0;

                      return (
                        <motion.div 
                          key={item.id}
                          layout
                          id={`barang-item-${item.id}`}
                          className="flex flex-col p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-800 relative hover:shadow-md transition-shadow group"
                        >
                          <div className="flex gap-3">
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              <img 
                                src={item.fotoUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80"} 
                                alt={item.namaBarang} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0 pr-12">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-slate-850 dark:text-slate-100 text-xs truncate" title={item.namaBarang}>{item.namaBarang}</h4>
                                {item.kategori && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded font-medium">
                                    {item.kategori}
                                  </span>
                                )}
                              </div>
                              {item.kodeBarang && (
                                <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Barcode className="w-3 h-3 inline" /> {item.kodeBarang}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-450 mt-1 line-clamp-1 leading-relaxed">{item.deskripsi}</p>
                            </div>
                          </div>

                          {/* Detail Harga Pokok, Harga Jual, dan Selisih Keuntungan */}
                          <div className="mt-3 p-2.5 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-150 dark:border-slate-750 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                              <span className="text-[10px] flex items-center gap-1">
                                <Coins className="w-3 h-3 text-amber-500" />
                                Harga Pokok (HPP):
                              </span>
                              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                {item.hargaPokok ? formatRupiah(item.hargaPokok) : <span className="italic text-slate-400">Belum diisi</span>}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                              <span className="text-[10px] font-semibold flex items-center gap-1">
                                <Tag className="w-3 h-3 text-blue-500" />
                                Harga Jual:
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {formatRupiah(item.harga)}
                              </span>
                            </div>
                            <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                Laba / Unit:
                              </span>
                              <span className={`font-mono font-bold text-[11px] ${
                                untungPerUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {item.hargaPokok !== undefined ? (
                                  <>
                                    {untungPerUnit >= 0 ? `+${formatRupiah(untungPerUnit)}` : formatRupiah(untungPerUnit)}
                                    {hpp > 0 && (
                                      <span className="text-[9px] font-normal ml-1 opacity-80">
                                        ({marginPersen >= 0 ? `+${marginPersen.toFixed(0)}%` : `${marginPersen.toFixed(0)}%`})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400 font-normal text-[10px]">Perlu modal</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Baris Bawah: Stok & Potensi Laba */}
                          <div className="mt-2.5 pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-[10px] flex-wrap gap-1">
                            <span className="font-mono font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              Stok: {item.stok ?? 0} {item.satuan || 'pcs'}
                            </span>
                            {item.hargaPokok !== undefined && item.stok !== undefined && item.stok > 0 && (
                              <span className="font-mono text-slate-450 dark:text-slate-400" title="Potensi laba bila seluruh stok terjual">
                                Potensi: <b className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatRupiah(totalPotensiLaba)}</b>
                              </span>
                            )}
                          </div>

                          {/* action buttons */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 rounded-lg p-1 border border-slate-100 dark:border-slate-700 shadow-xs">
                            <button 
                              id={`btn-label-barang-${item.id}`}
                              onClick={() => setShowLabelRakModal(true)}
                              className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                              title="Cetak Label Rak & Barcode"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              id={`btn-edit-barang-${item.id}`}
                              onClick={() => startEditBarang(item)}
                              className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                              title="Ubah"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              id={`btn-delete-barang-${item.id}`}
                              onClick={() => {
                                setDeleteModalState({
                                  isOpen: true,
                                  itemType: 'Barang Warung',
                                  itemName: item.namaBarang,
                                  itemDetails: [
                                    { label: 'Kode Barang', value: item.kodeBarang || '-' },
                                    { label: 'Kategori', value: item.kategori || '-' },
                                    { label: 'Sisa Stok', value: `${item.stok ?? 0} ${item.satuan || 'pcs'}` },
                                    { label: 'Harga Jual', value: formatRupiah(item.harga), isHighlight: true }
                                  ],
                                  warningMessage: 'Data barang akan dihapus dari etalase kasir POS dan inventaris warung.',
                                  onConfirm: async () => {
                                    await onDeleteBarang(item.id);
                                  }
                                });
                              }}
                              className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar form column */}
            {showBarangForm && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 lg:col-span-1"
              >
                <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      {editingBarang ? "Ubah Detail Barang" : "Tambah Barang Baru"}
                    </h3>
                    <button 
                      onClick={resetBarangForm}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleBarangSubmit} className="space-y-4 text-xs font-medium">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nama Barang *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Gula Pasir Gulaku 1kg"
                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                        value={barangNama}
                        onChange={(e) => setBarangNama(e.target.value)}
                      />
                    </div>

                    {/* Pricing & Profit Section */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-750 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-500" />
                            Harga Pokok (Modal / HPP)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-bold">Rp</span>
                            <input 
                              type="text" 
                              placeholder="Contoh: 15.000"
                              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
                              value={barangHargaPokok}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                setBarangHargaPokok(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                              }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-450">Biaya modal/kulakan per unit</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            Harga Jual Konsumen *
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Rp</span>
                            <input 
                              type="text" 
                              required
                              placeholder="Contoh: 17.500"
                              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-850 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold font-mono"
                              value={barangHarga}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                setBarangHarga(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                              }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-450">Harga jual eceran di warung</p>
                        </div>
                      </div>

                      {/* Live Profit Calculation Card */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            Selisih Keuntungan (Laba/Unit):
                          </span>
                          <span className={`font-mono font-bold text-xs ${
                            liveKeuntungan > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                            liveKeuntungan < 0 ? 'text-rose-600 dark:text-rose-400' :
                            'text-slate-400'
                          }`}>
                            {liveHj > 0 ? (
                              <>
                                {liveKeuntungan >= 0 ? `+${formatRupiah(liveKeuntungan)}` : formatRupiah(liveKeuntungan)}
                                {liveHpp > 0 && (
                                  <span className="text-[9px] ml-1 font-normal opacity-85">
                                    ({liveMarginPersen >= 0 ? `+${liveMarginPersen.toFixed(1)}%` : `${liveMarginPersen.toFixed(1)}%`})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">Masukkan harga jual</span>
                            )}
                          </span>
                        </div>

                        {liveKeuntungan < 0 && (
                          <div className="mt-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Peringatan: Harga jual di bawah modal! Warung mengalami rugi per unit.</span>
                          </div>
                        )}

                        {liveKeuntungan > 0 && barangStok && parseInt(barangStok) > 0 && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                            <span>Estimasi Total Keuntungan Stok ({barangStok} {barangSatuan}):</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatRupiah(liveKeuntungan * parseInt(barangStok))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Stok Barang</label>
                      <input 
                        type="number" 
                        placeholder="Contoh: 50"
                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                        value={barangStok}
                        onChange={(e) => setBarangStok(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Satuan Barang *</label>
                        <select 
                          required
                          className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                          value={barangSatuan}
                          onChange={(e) => setBarangSatuan(e.target.value)}
                        >
                          <option value="pcs">pcs</option>
                          <option value="liter">liter</option>
                          <option value="Kg">Kg</option>
                          <option value="gram">gram</option>
                          <option value="bungkus">bungkus</option>
                          <option value="dus">dus</option>
                          <option value="lainnya">Lainnya...</option>
                        </select>
                      </div>
                      {barangSatuan === 'lainnya' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Satuan Kustom *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contoh: botol, pax, dll."
                            className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                            value={customSatuan}
                            onChange={(e) => setCustomSatuan(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1 opacity-40 select-none">
                          <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Satuan Kustom</label>
                          <input 
                            type="text" 
                            disabled
                            placeholder="Pilih 'Lainnya...' untuk mengisi"
                            className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-400 font-sans cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          Barcode / SKU (Opsional)
                        </label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Contoh: 8991001..."
                            className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs"
                            value={barangKode}
                            onChange={(e) => setBarangKode(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCameraScannerInForm(true)}
                            className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            title="Scan Barcode kemasan menggunakan Kamera HP/Tablet/Laptop"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Scan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const autoCode = generateStoreEan13(Date.now() % 1000000);
                              setBarangKode(autoCode);
                            }}
                            className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 text-slate-750 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            title="Generate kode barcode EAN-13 internal otomatis"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Auto</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          Kategori Produk
                        </label>
                        <select 
                          className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans text-xs"
                          value={barangKategori}
                          onChange={(e) => setBarangKategori(e.target.value)}
                        >
                          <option value="Sembako">Sembako</option>
                          <option value="Minuman">Minuman</option>
                          <option value="Makanan">Makanan</option>
                          <option value="Perlengkapan">Perlengkapan / ATK</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Deskripsi Barang *</label>
                      <textarea 
                        required
                        rows={3}
                        placeholder="Deskripsi singkat produk, ukuran, atau kemasan..."
                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                        value={barangDeskripsi}
                        onChange={(e) => setBarangDeskripsi(e.target.value)}
                      />
                    </div>

                    {/* Image input selector */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">FOTO PRODUK</span>
                      <label 
                        htmlFor="barang-foto-upload"
                        onDragOver={(e) => { e.preventDefault(); setIsDragOverBarang(true); }}
                        onDragLeave={() => setIsDragOverBarang(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverBarang(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) processImageFile(file);
                        }}
                        className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                          isDragOverBarang 
                            ? 'border-emerald-600 bg-emerald-50/20' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                          {barangFoto ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mb-1">
                              <img src={barangFoto} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          )}
                          <p className="text-[10px] text-slate-600 dark:text-slate-300">
                            Tarik & Lepas foto, atau <span className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">pilih berkas manual</span>
                          </p>
                          <input 
                            id="barang-foto-upload"
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange} 
                          />
                        </div>
                      </label>
                      <div className="pt-2">
                        <p className="text-[9px] text-slate-400 mb-1">Atau gunakan URL Gambar Web:</p>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="https://images.unsplash.com/..." 
                            className="flex-1 px-3 py-1.5 border rounded-lg text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                            value={barangFoto}
                            onChange={(e) => setBarangFoto(e.target.value)}
                          />
                          {barangFoto && (
                            <button 
                              type="button" 
                              onClick={() => setBarangFoto('')}
                              className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition text-[10px]"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button 
                        type="submit" 
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {editingBarang ? "Simpan Perubahan" : "Simpan Barang"}
                      </button>
                      <button 
                        type="button" 
                        onClick={resetBarangForm}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 transition"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </>
        )}

        {subTab === 'piutang' && (
          <>
            {/* Left Side Form Column (Span 1) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-emerald-600"/> Transaksi Piutang Warung
                </h3>
                <form onSubmit={handlePiutangSubmit} className="space-y-3.5 text-xs font-medium">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pilih Anggota Debitur</label>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ketik untuk filter ID / Nama Anggota..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                          value={piuMemberSearch}
                          onChange={(e) => setPiuMemberSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-semibold"
                        value={piuAnggotaId}
                        onChange={(e) => setPiuAnggotaId(e.target.value)}
                        disabled={piuFilteredMembers.length === 0}
                      >
                        <option value="">
                          {piuJenis === 'pelunasan' 
                            ? `-- Pilih Anggota Berpiutang (${piuFilteredMembers.length}) --` 
                            : `-- Pilih Anggota (${piuFilteredMembers.length}) --`}
                        </option>
                        {piuFilteredMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nama} ({m.noAnggota}) {piuJenis === 'pelunasan' ? ` - Sisa: ${formatRupiah(memberPiutangMap[m.id] || 0)}` : ''}
                          </option>
                        ))}
                      </select>
                      {piuJenis === 'pelunasan' && piuFilteredMembers.length === 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                          ✓ Tidak ada anggota yang memiliki saldo piutang warung saat ini.
                        </p>
                      )}
                      {piuJenis === 'pelunasan' && piuAnggotaId && (memberPiutangMap[piuAnggotaId] || 0) > 0 && (
                        <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11px]">
                          <div>
                            <span className="text-amber-800 dark:text-amber-300 font-medium">Sisa Piutang: </span>
                            <span className="font-bold text-amber-900 dark:text-amber-200">{formatRupiah(memberPiutangMap[piuAnggotaId] || 0)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const sisa = memberPiutangMap[piuAnggotaId] || 0;
                              setPiuNominal(sisa.toLocaleString('id-ID'));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer transition shadow-xs"
                          >
                            Isi Bayar Penuh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                      value={piuDate}
                      onChange={(e) => setPiuDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Jenis Transaksi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPiuJenis('hutang_baru')}
                        className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition flex items-center justify-center gap-1 ${
                          piuJenis === 'hutang_baru' 
                            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Piutang Baru
                      </button>
                      <button
                        type="button"
                        onClick={() => setPiuJenis('pelunasan')}
                        className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer transition flex items-center justify-center gap-1 ${
                          piuJenis === 'pelunasan' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Pembayaran Piutang
                      </button>
                    </div>
                    {piuJenis === 'pelunasan' ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-md border border-emerald-200/50 dark:border-emerald-800/50 leading-relaxed">
                        ✓ Pembayaran ini akan <strong>mengurangi piutang anggota</strong> dan <strong>bertambah ke Kas Koperasi</strong>.
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-md border border-amber-200/50 dark:border-amber-800/50 leading-relaxed">
                        ✓ Penambahan piutang baru (belanja kredit) anggota warung.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nominal Transaksi (Rp)</label>
                    <div className="relative font-mono text-xs">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-medium">Rp</span>
                      <input 
                        type="text"
                        placeholder="Contoh: 154.000"
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-mono"
                        value={piuNominal}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 15);
                          setPiuNominal(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Keterangan Catatan / Sembako</label>
                    <textarea 
                      placeholder="Contoh: Pembelian sembako bon bulan Juni..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600"
                      value={piuNotes}
                      onChange={(e) => setPiuNotes(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={`w-full text-xs font-bold py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shadow-sm text-white ${
                      piuJenis === 'hutang_baru' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    <Plus className="w-4 h-4"/> {piuJenis === 'hutang_baru' ? 'Simpan Piutang Baru' : 'Simpan Pembayaran Piutang'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side Transaction Lists (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" /> Mutasi Log Piutang Belanja Anggota
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-350">
                      {filteredPiutang.length} Transaksi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Anggota</th>
                          <th className="py-2.5 px-3">Aliran Transaksi</th>
                          <th className="py-2.5 px-3">Catatan / Sembako</th>
                          <th className="py-2.5 px-3 text-right">Besaran Nominal</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredPiutang.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-normal italic">
                              Belum ada data mutasi piutang yang tercatat atau cocok.
                            </td>
                          </tr>
                        ) : (
                          filteredPiutang.map(pw => {
                            const member = members.find(m => m.id === pw.anggotaId);
                            return (
                              <tr key={pw.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{pw.tanggal}</td>
                                <td className="py-3 px-3">
                                  <p className="font-bold text-slate-850 dark:text-slate-100 leading-tight">{member?.nama || "Anggota Terhapus"}</p>
                                  <p className="text-[10px] text-slate-400 font-mono font-normal">{member?.noAnggota || '-'}</p>
                                </td>
                                <td className="py-3 px-3">
                                  {pw.jenis === 'hutang_baru' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                                      <ArrowUpRight className="w-3 h-3" /> Utang Baru (+Piutang)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                                      <ArrowDownLeft className="w-3 h-3" /> Pembayaran Piutang (-Piutang, +Kas)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-normal text-slate-600 dark:text-slate-350">
                                  <p className="text-[11px] max-w-xs truncate">{pw.keterangan || '-'}</p>
                                </td>
                                <td className={`py-3 px-3 text-right font-bold font-mono text-[12px] ${
                                  pw.jenis === 'hutang_baru' ? 'text-amber-600 dark:text-amber-450' : 'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {pw.jenis === 'hutang_baru' ? '+' : '-'}{formatRupiah(pw.nominal)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button 
                                    onClick={() => {
                                      const m = members.find(mem => mem.id === pw.anggotaId);
                                      setDeleteModalState({
                                        isOpen: true,
                                        itemType: 'Catatan Piutang Warung',
                                        itemName: `${pw.jenis === 'hutang_baru' ? 'Belanja Kasbon' : 'Pembayaran Piutang'} - ${formatRupiah(pw.nominal)}`,
                                        itemDetails: [
                                          { label: 'Nama Anggota', value: m ? `${m.nama} (${m.noAnggota})` : '-' },
                                          { label: 'Tanggal', value: pw.tanggal },
                                          { label: 'Jenis', value: pw.jenis === 'hutang_baru' ? 'Belanja Kasbon / Kredit' : 'Pelunasan / Bayar' },
                                          { label: 'Nominal', value: formatRupiah(pw.nominal), isHighlight: true },
                                          { label: 'Keterangan', value: pw.keterangan || '-' }
                                        ],
                                        warningMessage: 'Menghapus mutasi ini akan mengkalkulasi ulang saldo piutang anggota dan posisi kas koperasi.',
                                        onConfirm: async () => {
                                          await onDeletePiutang(pw.id);
                                        }
                                      });
                                    }}
                                    className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          </>
        )}

        {subTab === 'pembelian' && (
          <>
            {/* Form Column */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 border-b pb-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Tambah Catatan Pembelian Stok
                </h3>
                <form onSubmit={handlePembelianSubmit} className="space-y-3 font-sans text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">Tanggal Transaksi:</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                      value={pemDate}
                      onChange={(e) => setPemDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Nama Barang / Stok:</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Beras Ramos 10kg, Minyak Kita"
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                      value={pemName}
                      onChange={(e) => setPemName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Kuantitas:</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 font-mono"
                        value={pemQty}
                        onChange={(e) => setPemQty(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Harga Satuan:</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 15.000"
                        className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 font-mono"
                        value={pemPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setPemPrice(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800 flex justify-between items-center font-bold">
                    <span className="text-[10px] text-slate-400">ESTIMASI TOTAL:</span>
                    <span className="text-sm text-emerald-600 font-mono font-bold">
                      {formatRupiah((parseInt(pemQty) || 0) * (parseFloat(pemPrice.replace(/\D/g, '')) || 0))}
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Keterangan / Memo:</label>
                    <textarea 
                      placeholder="Catatan tambahan..."
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 resize-none h-16"
                      value={pemNotes}
                      onChange={(e) => setPemNotes(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs font-sans"
                  >
                    <Plus className="w-3.5 h-3.5" /> Simpan Pembelian
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4.5 h-4.5 text-emerald-600" />
                    Catatan Pengadaan & Restock Stok Warung
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                    Total: {formatRupiah(totalPurchasesSum)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Nama Barang</th>
                        <th className="py-2.5 px-3 text-center">Kuantitas</th>
                        <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPembelian.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-normal italic">
                            Belum ada catatan pembelian persediaan warung.
                          </td>
                        </tr>
                      ) : (
                        filteredPembelian.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{p.tanggal}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{p.namaBarang}</p>
                              {p.keterangan && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{p.keterangan}</p>}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{p.kuantitas}</td>
                            <td className="py-3 px-3 text-right font-mono">{formatRupiah(p.hargaSatuan)}</td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                              {formatRupiah(p.totalHarga)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button 
                                onClick={() => {
                                  setDeleteModalState({
                                    isOpen: true,
                                    itemType: 'Catatan Pembelian / Kulakan',
                                    itemName: `${p.namaBarang} (${p.kuantitas} item)`,
                                    itemDetails: [
                                      { label: 'Tanggal', value: p.tanggal },
                                      { label: 'Nama Barang', value: p.namaBarang },
                                      { label: 'Kuantitas', value: `${p.kuantitas} item` },
                                      { label: 'Kategori', value: p.kategori || '-' },
                                      { label: 'Total Pembelian', value: formatRupiah(p.totalHarga), isHighlight: true }
                                    ],
                                    warningMessage: 'Menghapus catatan pembelian ini akan memperbarui riwayat pengeluaran kas dan nilai persediaan warung.',
                                    onConfirm: async () => {
                                      await onDeletePembelian(p.id);
                                    }
                                  });
                                }}
                                className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                title="Hapus Pembelian"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {subTab === 'penjualan' && (
          <>
            {/* Form Column */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 border-b pb-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Tambah Catatan Penjualan
                </h3>
                <form onSubmit={handlePenjualanSubmit} className="space-y-3 font-sans text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">Tanggal Transaksi:</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                      value={penDate}
                      onChange={(e) => setPenDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Jenis Pembayaran:</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setPenType('tunai')}
                        className={`py-2 px-3 rounded-lg border text-center font-bold text-xs cursor-pointer transition ${
                          penType === 'tunai' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-extrabold' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850'
                        }`}
                      >
                        Tunai (Masuk Kas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPenType('kredit')}
                        className={`py-2 px-3 rounded-lg border text-center font-bold text-xs cursor-pointer transition ${
                          penType === 'kredit' 
                            ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-extrabold' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850'
                        }`}
                      >
                        Kredit (Piutang)
                      </button>
                    </div>
                  </div>

                  {penType === 'kredit' && (
                    <div className="space-y-1">
                      <label className="block text-slate-500 mb-1">Anggota Debitur:</label>
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Ketik untuk filter ID / Nama Anggota..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                            value={penMemberSearch}
                            onChange={(e) => setPenMemberSearch(e.target.value)}
                          />
                        </div>
                        <select 
                          className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 font-medium text-xs"
                          value={penAnggotaId}
                          onChange={(e) => setPenAnggotaId(e.target.value)}
                          required={penType === 'kredit'}
                        >
                          <option value="">-- Pilih Anggota ({penFilteredMembers.length}) --</option>
                          {penFilteredMembers.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nama} ({m.noAnggota})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-500 mb-1">Nominal Penjualan:</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 150.000"
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 font-mono"
                      value={penNominal}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setPenNominal(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Keterangan / Memo:</label>
                    <textarea 
                      placeholder="Contoh: Belanja sembako bulanan, kopi & gula"
                      className="w-full p-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-emerald-600 resize-none h-16"
                      value={penNotes}
                      onChange={(e) => setPenNotes(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs font-sans"
                  >
                    <Plus className="w-3.5 h-3.5" /> Simpan Penjualan
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b pb-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <Store className="w-4.5 h-4.5 text-emerald-600" />
                    Catatan Transaksi Penjualan Warung
                  </h3>
                  <div className="flex gap-2 text-[10px] font-mono">
                    <span className="font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded">
                      Tunai: {formatRupiah(totalSalesTunai)}
                    </span>
                    <span className="font-bold bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                      Kredit: {formatRupiah(totalSalesKredit)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Metode</th>
                        <th className="py-2.5 px-3">Nama Pembeli</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {combinedSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-normal italic">
                            Belum ada transaksi penjualan yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        combinedSales.map(sale => (
                          <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{sale.tanggal}</td>
                            <td className="py-3 px-3">
                              {sale.tipe === 'Tunai' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                                  Tunai
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                                  Kredit
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{sale.nama}</p>
                              {sale.noAnggota !== '-' && <p className="text-[9px] text-slate-400 font-mono font-normal">{sale.noAnggota}</p>}
                            </td>
                            <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{sale.keterangan || '-'}</td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-slate-100">
                              {formatRupiah(sale.nominal)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button 
                                onClick={() => {
                                  setDeleteModalState({
                                    isOpen: true,
                                    itemType: 'Catatan Penjualan Warung',
                                    itemName: `${sale.nama} - ${formatRupiah(sale.nominal)}`,
                                    itemDetails: [
                                      { label: 'Tanggal Transaksi', value: sale.tanggal },
                                      { label: 'Pelanggan / Anggota', value: `${sale.nama} ${sale.noAnggota !== '-' ? `(${sale.noAnggota})` : ''}` },
                                      { label: 'Keterangan Transaksi', value: sale.keterangan || '-' },
                                      { label: 'Metode Pembayaran', value: sale.tipe === 'Tunai' ? 'Tunai (Kas Masuk)' : 'Kredit (Piutang Kasbon)' },
                                      { label: 'Total Belanja', value: formatRupiah(sale.nominal), isHighlight: true }
                                    ],
                                    warningMessage: 'Menghapus catatan transaksi penjualan ini akan mengoreksi kembali saldo kas atau piutang anggota.',
                                    onConfirm: async () => {
                                      if (sale.source === 'income') {
                                        await onDeleteIncome(sale.rawId);
                                      } else {
                                        await onDeletePiutang(sale.rawId);
                                      }
                                    }
                                  });
                                }}
                                className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                title="Hapus Penjualan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

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

      {/* MODAL: Scanner Barcode via Kamera Perangkat (Untuk Pencarian/Filter Katalog) */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code, matched) => {
          if (matched) {
            setSearchQuery(matched.namaBarang);
            setShowCameraScanner(false);
          } else {
            setSearchQuery(code);
            setShowCameraScanner(false);
          }
        }}
        warungBarang={warungBarang}
        onQuickAddProduct={(code) => {
          setShowCameraScanner(false);
          resetBarangForm();
          setBarangKode(code);
          setShowBarangForm(true);
        }}
      />

      {/* MODAL: Scanner Barcode via Kamera Perangkat (Untuk Form Tambah/Edit Barang) */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScannerInForm}
        onClose={() => setShowCameraScannerInForm(false)}
        onScan={(code) => {
          setBarangKode(code);
          setShowCameraScannerInForm(false);
        }}
        warungBarang={warungBarang}
      />

      {/* MODAL: Cetak Label Rak Minimarket & Barcode Stiker */}
      <CetakLabelRakModal
        isOpen={showLabelRakModal}
        onClose={() => setShowLabelRakModal(false)}
        warungBarang={warungBarang}
        onUpdateBarang={onEditBarang}
        setup={setup}
      />
    </div>
  );
}
