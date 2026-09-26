import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WarungBarang, Member, PiutangWarung, PendapatanLain, KoperasiSetup, UserAccount, Simpanan, Pinjaman, Angsuran } from '../types';
import { formatRupiah, sortMembersNaturally } from '../utils/finance';
import { 
  Store, ShoppingCart, Search, Plus, Minus, Trash2, Printer, CheckCircle2, 
  AlertCircle, X, UserCheck, DollarSign, CreditCard, QrCode, 
  Tag, Barcode, Copy, Receipt, Check, ArrowRight, ShoppingBag,
  Sparkles, Gift, ShieldCheck, AlertTriangle, ChevronRight, ChevronDown, Info, ShieldAlert,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { CetakLabelRakModal } from './CetakLabelRakModal';

export interface POSCartItem {
  id: string; // warungBarang id or 'custom-' + timestamp
  isCustom?: boolean;
  namaBarang: string;
  harga: number; // Harga Jual
  hargaPokok?: number; // Modal / HPP
  qty: number;
  stokTersedia?: number;
  satuan?: string;
  fotoUrl?: string;
  kodeBarang?: string;
  kategori?: string;
}

export interface POSTransactionReceipt {
  noTransaksi: string;
  waktu: string;
  kasirNama: string;
  tipePelanggan: 'umum' | 'anggota';
  pelangganNama: string;
  noAnggota?: string;
  items: POSCartItem[];
  subtotal: number;
  diskon: number;
  totalAkhir: number;
  metodePembayaran: 'tunai' | 'qris' | 'kredit';
  uangDiterima: number;
  kembalian: number;
  catatanRef?: string;
  poinDidapat?: number;
  poinDigunakan?: number;
  diskonPoin?: number;
  saldoSimpananSaatIni?: number;
  sisaPlafonKasbon?: number;
}

interface WarungPOSViewProps {
  warungBarang: WarungBarang[];
  members: Member[];
  piutangWarung: PiutangWarung[];
  simpanan?: Simpanan[];
  income?: PendapatanLain[];
  pinjaman?: Pinjaman[];
  angsuran?: Angsuran[];
  setup?: KoperasiSetup;
  currentUserAccount?: UserAccount | null;
  onAddIncome: (item: Omit<PendapatanLain, 'id'>) => Promise<void>;
  onAddPiutang: (item: Omit<PiutangWarung, 'id'>) => Promise<void>;
  onEditBarang: (item: WarungBarang) => Promise<void>;
  onOpenCatalogTab?: () => void;
}

export function WarungPOSView({
  warungBarang,
  members,
  piutangWarung,
  simpanan = [],
  income = [],
  pinjaman = [],
  angsuran = [],
  setup,
  currentUserAccount,
  onAddIncome,
  onAddPiutang,
  onEditBarang,
  onOpenCatalogTab
}: WarungPOSViewProps) {
  // Cart State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeScanFeedback, setBarcodeScanFeedback] = useState<string | null>(null);

  // Customer selection
  const [customerType, setCustomerType] = useState<'umum' | 'anggota'>('umum');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Discount & Payment
  const [discountNominal, setDiscountNominal] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'qris' | 'kredit'>('tunai');
  const [cashGivenStr, setCashGivenStr] = useState<string>('');
  const [refNote, setRefNote] = useState<string>('');
  
  // UI Modals & Notifications
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<POSTransactionReceipt | null>(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showLabelRakModal, setShowLabelRakModal] = useState(false);
  const [customNama, setCustomNama] = useState('');
  const [customHarga, setCustomHarga] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customSatuan, setCustomSatuan] = useState('pcs');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Barcode input ref
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const sortedMembers = useMemo(() => sortMembersNaturally(members), [members]);

  // Member piutang balance map
  const memberPiutangMap = useMemo(() => {
    const map: Record<string, number> = {};
    piutangWarung.forEach(pw => {
      if (!pw.anggotaId) return;
      const delta = pw.jenis === 'hutang_baru' ? (Number(pw.nominal) || 0) : -(Number(pw.nominal) || 0);
      map[pw.anggotaId] = (map[pw.anggotaId] || 0) + delta;
    });
    return map;
  }, [piutangWarung]);

  // Member filtering
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return sortedMembers;
    const q = memberSearchQuery.toLowerCase().trim();
    return sortedMembers.filter(m => 
      m.nama.toLowerCase().includes(q) ||
      m.noAnggota.toLowerCase().includes(q) ||
      (m.noHp && m.noHp.includes(q))
    );
  }, [sortedMembers, memberSearchQuery]);

  // Categories list derived from inventory
  const categories = useMemo(() => {
    const set = new Set<string>();
    warungBarang.forEach(b => {
      if (b.kategori && b.kategori.trim()) {
        set.add(b.kategori.trim());
      }
    });
    return ['Semua', ...Array.from(set)];
  }, [warungBarang]);

  // Filtered Catalog
  const filteredProducts = useMemo(() => {
    return warungBarang.filter(item => {
      const matchCategory = selectedCategory === 'Semua' || item.kategori === selectedCategory;
      const term = searchQuery.toLowerCase().trim();
      const matchSearch = !term || 
        item.namaBarang.toLowerCase().includes(term) ||
        (item.kodeBarang && item.kodeBarang.toLowerCase().includes(term)) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(term));
      return matchCategory && matchSearch;
    });
  }, [warungBarang, selectedCategory, searchQuery]);

  // Selected Member details
  const selectedMember = useMemo(() => {
    return sortedMembers.find(m => m.id === selectedMemberId) || null;
  }, [sortedMembers, selectedMemberId]);

  // Member savings breakdown (Pokok, Wajib, Sukarela, Total)
  const memberSavingsMap = useMemo(() => {
    const map: Record<string, { pokok: number; wajib: number; sukarela: number; total: number }> = {};
    (simpanan || []).forEach(s => {
      if (!s.anggotaId) return;
      if (!map[s.anggotaId]) {
        map[s.anggotaId] = { pokok: 0, wajib: 0, sukarela: 0, total: 0 };
      }
      const amt = Number(s.jumlah) || 0;
      if (s.jenis === 'Pokok') map[s.anggotaId].pokok += amt;
      else if (s.jenis === 'Wajib') map[s.anggotaId].wajib += amt;
      else if (s.jenis === 'Sukarela') map[s.anggotaId].sukarela += amt;
      map[s.anggotaId].total += amt;
    });
    return map;
  }, [simpanan]);

  // Current selected member savings & financial standing
  const currentMemberSavings = useMemo(() => {
    if (!selectedMemberId) return { pokok: 0, wajib: 0, sukarela: 0, total: 0 };
    return memberSavingsMap[selectedMemberId] || { pokok: 0, wajib: 0, sukarela: 0, total: 0 };
  }, [selectedMemberId, memberSavingsMap]);

  const currentMemberPiutang = useMemo(() => {
    if (!selectedMemberId) return 0;
    return memberPiutangMap[selectedMemberId] || 0;
  }, [selectedMemberId, memberPiutangMap]);

  // Plafon Kasbon Fleksibel Berdasarkan Simpanan:
  // - 50% dari Simpanan Sukarela (jika punya simpanan sukarela)
  // - Jika sukarela 0, gunakan 30% dari Total Simpanan (Pokok + Wajib)
  const plafonKasbonMaksimal = useMemo(() => {
    if (currentMemberSavings.sukarela > 0) {
      return Math.floor(currentMemberSavings.sukarela * 0.5);
    }
    return Math.floor(currentMemberSavings.total * 0.3);
  }, [currentMemberSavings]);

  const sisaPlafonKasbon = useMemo(() => {
    return Math.max(0, plafonKasbonMaksimal - currentMemberPiutang);
  }, [plafonKasbonMaksimal, currentMemberPiutang]);

  // Status Plafon Kasbon: 'aman' | 'waspada' | 'overlimit' | 'belum_ada'
  const statusLimitKasbon = useMemo(() => {
    if (plafonKasbonMaksimal <= 0) return 'belum_ada';
    if (sisaPlafonKasbon <= 0) return 'overlimit';
    if (sisaPlafonKasbon < 100000 || sisaPlafonKasbon < (plafonKasbonMaksimal * 0.35)) return 'waspada';
    return 'aman';
  }, [plafonKasbonMaksimal, sisaPlafonKasbon]);

  // Member loyalty points estimation from prior transactions
  const memberAccumulatedPoints = useMemo(() => {
    if (!selectedMemberId || !selectedMember) return 0;
    let totalBelanja = 0;
    (income || []).forEach(inc => {
      if (inc.sumber === 'warung' && (inc.keterangan?.includes(selectedMember.noAnggota) || inc.keterangan?.includes(selectedMember.nama))) {
        totalBelanja += inc.nominal;
      }
    });
    (piutangWarung || []).forEach(pw => {
      if (pw.anggotaId === selectedMemberId && pw.jenis === 'hutang_baru') {
        totalBelanja += pw.nominal;
      }
    });
    return Math.floor(totalBelanja / 10000);
  }, [selectedMemberId, selectedMember, income, piutangWarung]);

  // Loyalty point redemption state (1 Poin = Rp 100 diskon)
  const [poinYangDitukar, setPoinYangDitukar] = useState<number>(0);
  const [allowOverlimitOverride, setAllowOverlimitOverride] = useState<boolean>(false);
  const [overlimitNote, setOverlimitNote] = useState<string>('');

  const diskonPoinNominal = useMemo(() => {
    return poinYangDitukar * 100;
  }, [poinYangDitukar]);

  // Rekomendasi nominal pinjaman ideal dan maksimal berdasarkan data anggota
  const [showLoanRecommendation, setShowLoanRecommendation] = useState<boolean>(false);

  const selectedMemberLoanRecommendation = useMemo(() => {
    if (!selectedMemberId || !selectedMember) return null;
    const mId = selectedMemberId;
    const mSimpanan = (simpanan || []).filter(s => s.anggotaId === mId);
    const mPinjaman = (pinjaman || []).filter(p => p.anggotaId === mId);
    const mAngsuran = (angsuran || []).filter(a => a.anggotaId === mId);

    const sPokok = mSimpanan.filter(s => s.jenis === 'Pokok').reduce((sum, s) => sum + (s.jumlah || 0), 0);
    const sWajib = mSimpanan.filter(s => s.jenis === 'Wajib').reduce((sum, s) => sum + (s.jumlah || 0), 0);
    const sSukarela = mSimpanan.filter(s => s.jenis === 'Sukarela').reduce((sum, s) => sum + (s.jumlah || 0), 0);
    const totalSimpanan = sPokok + sWajib + sSukarela;

    const activeLoanObj = mPinjaman.find(p => p.status === 'Belum Lunas');
    const lunasLoans = mPinjaman.filter(p => p.status === 'Lunas');
    const lunasCount = lunasLoans.length;

    let sisaHutangAktif = 0;
    if (activeLoanObj) {
      const paidForThis = mAngsuran.filter(a => a.pinjamanId === activeLoanObj.id).reduce((sum, a) => sum + (a.jumlahBayar || 0), 0);
      sisaHutangAktif = Math.max(0, (activeLoanObj.totalWajibBayar || 0) - paidForThis);
    }

    const sisaHutangWarung = memberPiutangMap[mId] || 0;
    const hasActiveLoan = !!activeLoanObj;

    let idealNominal = 0;
    let maxNominal = 0;
    let statusKelayakan: 'SANGAT_LAYAK' | 'LAYAK' | 'PERLU_PENYESUAIAN' | 'TIDAK_LAYAK' = 'LAYAK';
    let catatanRekomendasi = '';

    if (hasActiveLoan) {
      statusKelayakan = 'TIDAK_LAYAK';
      idealNominal = 0;
      maxNominal = 0;
      catatanRekomendasi = 'Anggota masih memiliki akad pinjaman berjalan yang belum lunas di koperasi. Sesuai AD/ART, pinjaman aktif wajib diselesaikan terlebih dahulu sebelum membuka pinjaman baru.';
    } else if (totalSimpanan <= 0) {
      statusKelayakan = 'TIDAK_LAYAK';
      idealNominal = 0;
      maxNominal = 0;
      catatanRekomendasi = 'Anggota belum memiliki saldo simpanan pokok dan simpanan wajib aktif sebagai modal jaminan di koperasi.';
    } else {
      // Rasio Ideal: 2.0x (baru) atau 2.5x (pernah lunas tertib)
      const idealMultiplier = lunasCount > 0 ? 2.5 : 2.0;
      idealNominal = Math.max(500000, Math.round((totalSimpanan * idealMultiplier) / 100000) * 100000);

      // Rasio Maksimal: 3.0x simpanan dikurangi sisa hutang warung jika ada
      const rawMax = Math.round((totalSimpanan * 3.0 - (sisaHutangWarung || 0)) / 100000) * 100000;
      maxNominal = Math.max(idealNominal, rawMax);

      if (lunasCount > 0 && sisaHutangWarung === 0) {
        statusKelayakan = 'SANGAT_LAYAK';
        catatanRekomendasi = `Anggota teladan dengan ${lunasCount}x riwayat pinjaman lunas tertib tanpa tunggakan kasbon warung. Sangat direkomendasikan hingga plafon maksimal ${formatRupiah(maxNominal)}.`;
      } else if (sisaHutangWarung > 0) {
        statusKelayakan = 'PERLU_PENYESUAIAN';
        catatanRekomendasi = `Terdapat catatan kasbon warung ${formatRupiah(sisaHutangWarung)}. Plafon maksimal telah disesuaikan agar tidak membebani kapasitas cicilan anggota.`;
      } else {
        statusKelayakan = 'LAYAK';
        catatanRekomendasi = `Kredit pertama. Direkomendasikan plafon ideal ${formatRupiah(idealNominal)} (2.0x simpanan) dengan batas atas aman ${formatRupiah(maxNominal)} (3.0x simpanan).`;
      }
    }

    let skor = 0;
    if (totalSimpanan > 0) skor += 40;
    if (mSimpanan.filter(s => s.jenis === 'Wajib').length >= 3) skor += 15;
    if (!hasActiveLoan) skor += 25;
    if (lunasCount > 0) skor += 15;
    if (sisaHutangWarung === 0) skor += 5;

    return {
      member: selectedMember,
      totalSimpanan,
      simpananPokok: sPokok,
      simpananWajib: sWajib,
      simpananSukarela: sSukarela,
      hasActiveLoan,
      sisaHutangAktif,
      lunasCount,
      sisaHutangWarung,
      idealNominal,
      maxNominal,
      statusKelayakan,
      catatanRekomendasi,
      skorKelayakan: skor
    };
  }, [selectedMemberId, selectedMember, simpanan, pinjaman, angsuran, memberPiutangMap]);

  // Totals calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  }, [cart]);

  const manualDiscountAmount = useMemo(() => {
    const parsed = parseFloat(discountNominal.replace(/\D/g, '')) || 0;
    return Math.min(parsed, cartSubtotal);
  }, [discountNominal, cartSubtotal]);

  const totalDiskon = useMemo(() => {
    return Math.min(cartSubtotal, manualDiscountAmount + diskonPoinNominal);
  }, [cartSubtotal, manualDiscountAmount, diskonPoinNominal]);

  const totalAkhir = useMemo(() => {
    return Math.max(0, cartSubtotal - totalDiskon);
  }, [cartSubtotal, totalDiskon]);

  const poinDidapat = useMemo(() => {
    if (customerType !== 'anggota' || totalAkhir <= 0) return 0;
    return Math.floor(totalAkhir / 10000); // 1 Poin per Rp 10.000
  }, [customerType, totalAkhir]);

  const isOverCreditLimit = useMemo(() => {
    if (customerType !== 'anggota' || paymentMethod !== 'kredit') return false;
    return totalAkhir > sisaPlafonKasbon;
  }, [customerType, paymentMethod, totalAkhir, sisaPlafonKasbon]);

  const cashGiven = useMemo(() => {
    if (paymentMethod !== 'tunai') return totalAkhir;
    return parseFloat(cashGivenStr.replace(/\D/g, '')) || 0;
  }, [cashGivenStr, paymentMethod, totalAkhir]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'tunai') return 0;
    return Math.max(0, cashGiven - totalAkhir);
  }, [cashGiven, totalAkhir, paymentMethod]);

  const underpaidAmount = useMemo(() => {
    if (paymentMethod !== 'tunai') return 0;
    return Math.max(0, totalAkhir - cashGiven);
  }, [cashGiven, totalAkhir, paymentMethod]);

  // If customer is Umum, ensure payment is not kredit
  useEffect(() => {
    if (customerType === 'umum' && paymentMethod === 'kredit') {
      setPaymentMethod('tunai');
    }
  }, [customerType, paymentMethod]);

  // Set default member if switching to anggota
  useEffect(() => {
    if (customerType === 'anggota' && !selectedMemberId && sortedMembers.length > 0) {
      setSelectedMemberId(sortedMembers[0].id);
    }
  }, [customerType, selectedMemberId, sortedMembers]);

  // Add item to cart
  const handleAddToCart = (item: WarungBarang) => {
    const existingIndex = cart.findIndex(c => c.id === item.id);
    const availableStock = item.stok ?? 9999;

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (item.stok !== undefined && currentQty >= availableStock) {
        alert(`Perhatian: Stok ${item.namaBarang} hanya tersisa ${availableStock} ${item.satuan || 'item'}!`);
        return;
      }
      setCart(prev => prev.map((c, idx) => idx === existingIndex ? { ...c, qty: c.qty + 1 } : c));
    } else {
      if (item.stok !== undefined && availableStock <= 0) {
        const proceed = window.confirm(`Stok ${item.namaBarang} tercatat 0 / habis. Apakah tetap ingin menambahkan ke keranjang?`);
        if (!proceed) return;
      }
      setCart(prev => [
        ...prev,
        {
          id: item.id,
          namaBarang: item.namaBarang,
          harga: item.harga,
          hargaPokok: item.hargaPokok,
          qty: 1,
          stokTersedia: item.stok,
          satuan: item.satuan || 'pcs',
          fotoUrl: item.fotoUrl,
          kodeBarang: item.kodeBarang,
          kategori: item.kategori
        }
      ]);
    }
  };

  // Update quantity
  const handleUpdateQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id !== id) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (item.stokTersedia !== undefined && newQty > item.stokTersedia && delta > 0) {
          alert(`Maksimal stok tercatat adalah ${item.stokTersedia} ${item.satuan || 'item'}.`);
          return item;
        }
        return { ...item, qty: newQty };
      }).filter(Boolean) as POSCartItem[];
    });
  };

  // Set direct quantity
  const handleSetQtyDirect = (id: string, qtyStr: string) => {
    const parsed = parseInt(qtyStr.replace(/\D/g, '')) || 0;
    if (parsed <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (item.stokTersedia !== undefined && parsed > item.stokTersedia) {
        alert(`Maksimal stok tersedia adalah ${item.stokTersedia} ${item.satuan || 'item'}.`);
        return { ...item, qty: item.stokTersedia };
      }
      return { ...item, qty: parsed };
    }));
  };

  // Remove from cart
  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Kosongkan keranjang belanja kasir?")) {
      setCart([]);
      setDiscountNominal('');
      setPoinYangDitukar(0);
      setAllowOverlimitOverride(false);
      setOverlimitNote('');
      setCashGivenStr('');
      setRefNote('');
    }
  };

  // Quick Barcode Scan simulator
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Find by exact kodeBarang or close name match
    const found = warungBarang.find(b => 
      (b.kodeBarang && b.kodeBarang.toLowerCase() === query.toLowerCase()) ||
      b.namaBarang.toLowerCase() === query.toLowerCase()
    );

    if (found) {
      handleAddToCart(found);
      setBarcodeScanFeedback(`✓ Berhasil menambahkan: ${found.namaBarang}`);
      setTimeout(() => setBarcodeScanFeedback(null), 2500);
      setBarcodeInput('');
    } else {
      setBarcodeScanFeedback(`⚠️ Produk dengan kode/nama "${query}" tidak ditemukan.`);
      setTimeout(() => setBarcodeScanFeedback(null), 3000);
    }
  };

  // Camera Barcode Scan handler
  const handleCameraScan = (barcode: string, matched?: WarungBarang) => {
    const found = matched || warungBarang.find(b => 
      (b.kodeBarang && b.kodeBarang.trim().toLowerCase() === barcode.trim().toLowerCase()) ||
      b.namaBarang.toLowerCase() === barcode.trim().toLowerCase()
    );

    if (found) {
      handleAddToCart(found);
      setBarcodeScanFeedback(`✓ Berhasil scan: ${found.namaBarang}`);
      setTimeout(() => setBarcodeScanFeedback(null), 3000);
    } else {
      setBarcodeScanFeedback(`⚠️ Barcode "${barcode}" belum terdaftar di katalog warung.`);
      setTimeout(() => setBarcodeScanFeedback(null), 3500);
    }
  };

  // Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customHarga.replace(/\D/g, '')) || 0;
    const qtyNum = parseInt(customQty) || 1;
    if (!customNama.trim() || priceNum <= 0 || qtyNum <= 0) {
      alert("Harap lengkapi nama barang dan harga yang valid!");
      return;
    }

    const customId = `custom-${Date.now()}`;
    setCart(prev => [
      ...prev,
      {
        id: customId,
        isCustom: true,
        namaBarang: customNama.trim(),
        harga: priceNum,
        qty: qtyNum,
        satuan: customSatuan.trim() || 'item'
      }
    ]);

    setCustomNama('');
    setCustomHarga('');
    setCustomQty('1');
    setCustomSatuan('pcs');
    setShowCustomItemModal(false);
  };

  // Process Checkout
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      alert("Keranjang belanja masih kosong!");
      return;
    }

    if (customerType === 'anggota' && !selectedMemberId) {
      alert("Harap pilih nama anggota yang berbelanja!");
      return;
    }

    if (paymentMethod === 'tunai' && underpaidAmount > 0) {
      alert(`Uang pembayaran kurang ${formatRupiah(underpaidAmount)}! Harap masukkan nominal uang yang cukup.`);
      return;
    }

    if (paymentMethod === 'kredit') {
      if (customerType !== 'anggota') {
        alert("Metode pembayaran Kredit / Kasbon hanya berlaku untuk Anggota Koperasi!");
        return;
      }
      if (totalAkhir > sisaPlafonKasbon && !allowOverlimitOverride) {
        alert(`⚠️ Transaksi kasbon (${formatRupiah(totalAkhir)}) melebihi sisa plafon simpanan anggota (${formatRupiah(sisaPlafonKasbon)})!\n\nUntuk menyetujui transaksi ini, aktifkan opsi 'Dispensasi Pengurus' pada kartu informasi limit.`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const today = new Date().toISOString().substring(0, 10);
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const fullDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const noTrx = `TRX-POS-${Date.now().toString().slice(-6)}`;
      const cashierName = currentUserAccount?.nama || 'Kasir Warung';
      const itemsSummary = cart.map(c => `${c.qty}x ${c.namaBarang}`).join(', ');

      const poinNote = poinYangDitukar > 0 ? ` [Tukar ${poinYangDitukar} Poin (-${formatRupiah(diskonPoinNominal)})]` : '';
      const earnNote = poinDidapat > 0 ? ` [+${poinDidapat} Poin]` : '';
      const overrideNote = (paymentMethod === 'kredit' && totalAkhir > sisaPlafonKasbon) ? ` [Dispensasi Pengurus: ${overlimitNote || 'Disetujui'}]` : '';

      // 1. Record transaction financial flow
      if (paymentMethod === 'tunai' || paymentMethod === 'qris') {
        const methodLabel = paymentMethod === 'tunai' ? 'Tunai' : 'QRIS/Transfer';
        const custLabel = customerType === 'anggota' && selectedMember 
          ? `Anggota: ${selectedMember.nama} (${selectedMember.noAnggota})`
          : 'Pembeli Umum';
        
        await onAddIncome({
          tanggal: today,
          sumber: 'warung',
          nominal: totalAkhir,
          keterangan: `Penjualan POS Warung [${methodLabel}] - ${custLabel} - Items: ${itemsSummary}${poinNote}${earnNote}${refNote ? ` (Ref: ${refNote})` : ''}`
        });
      } else {
        // Kasbon / Kredit Warung
        await onAddPiutang({
          anggotaId: selectedMemberId,
          tanggal: today,
          jenis: 'hutang_baru',
          nominal: totalAkhir,
          keterangan: `Belanja Kasbon POS Warung [${noTrx}] - ${itemsSummary}${poinNote}${earnNote}${overrideNote}${refNote ? ` (Catatan: ${refNote})` : ''}`
        });
      }

      // 2. Decrement inventory stock for catalog items
      for (const cartItem of cart) {
        if (!cartItem.isCustom) {
          const original = warungBarang.find(b => b.id === cartItem.id);
          if (original && original.stok !== undefined) {
            const newStock = Math.max(0, original.stok - cartItem.qty);
            try {
              await onEditBarang({
                ...original,
                stok: newStock
              });
            } catch (stockErr) {
              console.warn(`Gagal memperbarui stok ${original.namaBarang}:`, stockErr);
            }
          }
        }
      }

      // 3. Create Receipt object
      const receipt: POSTransactionReceipt = {
        noTransaksi: noTrx,
        waktu: `${fullDateStr}, ${timeStr} WIB`,
        kasirNama: cashierName,
        tipePelanggan: customerType,
        pelangganNama: customerType === 'anggota' && selectedMember ? selectedMember.nama : 'Pembeli Umum',
        noAnggota: customerType === 'anggota' && selectedMember ? selectedMember.noAnggota : undefined,
        items: [...cart],
        subtotal: cartSubtotal,
        diskon: totalDiskon,
        totalAkhir: totalAkhir,
        metodePembayaran: paymentMethod,
        uangDiterima: paymentMethod === 'tunai' ? cashGiven : totalAkhir,
        kembalian: paymentMethod === 'tunai' ? changeDue : 0,
        catatanRef: refNote.trim() || undefined,
        poinDidapat: poinDidapat,
        poinDigunakan: poinYangDitukar > 0 ? poinYangDitukar : undefined,
        diskonPoin: diskonPoinNominal > 0 ? diskonPoinNominal : undefined,
        saldoSimpananSaatIni: currentMemberSavings.total,
        sisaPlafonKasbon: paymentMethod === 'kredit' ? Math.max(0, sisaPlafonKasbon - totalAkhir) : sisaPlafonKasbon
      };

      // Reset cart and checkout states
      setCart([]);
      setDiscountNominal('');
      setPoinYangDitukar(0);
      setAllowOverlimitOverride(false);
      setOverlimitNote('');
      setCashGivenStr('');
      setRefNote('');
      setActiveReceipt(receipt);
    } catch (err: unknown) {
      console.error("Error processing POS checkout:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Terjadi kesalahan saat memproses transaksi: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick cash buttons
  const setQuickCash = (amount: number) => {
    setCashGivenStr(new Intl.NumberFormat('id-ID').format(amount));
  };

  // Copy receipt text for WhatsApp
  const handleCopyReceiptText = () => {
    if (!activeReceipt) return;
    const r = activeReceipt;
    const kName = setup?.namaKoperasi || 'KOPERASI DANA SEGAR';
    const lines = [
      `*🧾 BUKTI TRANSAKSI WARUNG ${kName.toUpperCase()}*`,
      `No. Transaksi : ${r.noTransaksi}`,
      `Waktu         : ${r.waktu}`,
      `Kasir         : ${r.kasirNama}`,
      `Pelanggan     : ${r.pelangganNama}${r.noAnggota ? ` (${r.noAnggota})` : ''}`,
      `Metode Bayar  : ${r.metodePembayaran === 'tunai' ? 'Tunai' : r.metodePembayaran === 'qris' ? 'QRIS/Transfer' : 'Kredit/Kasbon Warung'}`,
      `--------------------------------`,
      ...r.items.map(it => `${it.qty}x ${it.namaBarang} @${formatRupiah(it.harga)} = ${formatRupiah(it.qty * it.harga)}`),
      `--------------------------------`,
      `Subtotal      : ${formatRupiah(r.subtotal)}`,
      ...(r.diskon > 0 ? [`Potongan/Diskon: -${formatRupiah(r.diskon)}${r.diskonPoin ? ` (Termasuk Poin: -${formatRupiah(r.diskonPoin)})` : ''}`] : []),
      `*TOTAL AKHIR  : ${formatRupiah(r.totalAkhir)}*`,
      ...(r.metodePembayaran === 'tunai' ? [
        `Uang Diterima : ${formatRupiah(r.uangDiterima)}`,
        `Kembalian     : ${formatRupiah(r.kembalian)}`
      ] : []),
      ...(r.poinDidapat && r.poinDidapat > 0 ? [`★ Poin Didapat: +${r.poinDidapat} Poin`] : []),
      ...(r.metodePembayaran === 'kredit' ? [`★ Sisa Plafon Kasbon: ${formatRupiah(r.sisaPlafonKasbon || 0)}`] : []),
      `--------------------------------`,
      `Terima kasih telah berbelanja di Unit Usaha Warung Koperasi!`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  // Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-4" id="pos-root-container">
      {/* Top Banner & Quick Barcode Scanner Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Mesin Kasir POS Warung</h3>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-300 dark:border-emerald-850">
                Point of Sale Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kasir: <span className="font-bold text-slate-700 dark:text-slate-200">{currentUserAccount?.nama || 'Petugas Warung'}</span> • Tanggal: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Barcode / SKU Scanner Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode / SKU lalu Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-emerald-600 font-mono shadow-2xs"
            />
            {barcodeInput && (
              <button 
                type="button" 
                onClick={() => setBarcodeInput('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <button
            type="button"
            id="btn-scan-kamera-pos"
            onClick={() => setShowCameraScanner(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs active:scale-95"
            title="Scan Barcode menggunakan Kamera HP / Tablet / Laptop"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scan Kamera</span>
          </button>

          <button
            type="button"
            id="btn-label-rak-pos"
            onClick={() => setShowLabelRakModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
            title="Cetak Label Rak & Barcode Produk"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Label Rak</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomItemModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
            title="Tambah item kustom / bebas langsung (F4)"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Item Bebas</span>
          </button>

          {onOpenCatalogTab && (
            <button
              type="button"
              onClick={onOpenCatalogTab}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer border border-emerald-200 dark:border-emerald-850 shadow-2xs"
              title="Buka kelola katalog stok barang"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Katalog</span>
            </button>
          )}
        </div>
      </div>

      {/* Barcode notification toast */}
      {barcodeScanFeedback && (
        <div className="p-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
          <span>{barcodeScanFeedback}</span>
          <button onClick={() => setBarcodeScanFeedback(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column POS Layout with Synchronized Height & No Overlaps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Product Catalog (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col h-[calc(100vh-210px)] min-h-[620px]">
          {/* Header: Search and Category Pills (shrink-0) */}
          <div className="space-y-3 shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama produk, barcode, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0 self-center">
                {filteredProducts.length} Produk
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid Area (flex-1 with dedicated smooth scroll) */}
          <div className="flex-1 overflow-y-auto pt-3 pr-1 min-h-0">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-12 space-y-2">
                <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">Tidak ada produk yang cocok dengan pencarian "{searchQuery}".</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Reset Filter Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(c => c.id === product.id);
                  const isOutOfStock = product.stok !== undefined && product.stok <= 0;
                  const isLowStock = product.stok !== undefined && product.stok > 0 && product.stok <= 5;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      className={`relative bg-slate-50/70 dark:bg-slate-850/60 border rounded-2xl p-3 flex flex-col justify-between transition cursor-pointer hover:shadow-md select-none ${
                        cartItem 
                          ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Image Thumbnail */}
                        <div className="w-full h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center">
                          {product.fotoUrl ? (
                            <img
                              src={product.fotoUrl}
                              alt={product.namaBarang}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Store className="w-8 h-8 text-slate-400" />
                          )}

                          {/* Category Tag overlay */}
                          {product.kategori && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-semibold rounded">
                              {product.kategori}
                            </span>
                          )}

                          {/* Stock pill in image corner */}
                          {product.stok !== undefined && (
                            <span className={`absolute top-1.5 left-1.5 text-[8.5px] px-1.5 py-0.5 rounded font-bold backdrop-blur-xs ${
                              isOutOfStock 
                                ? 'bg-rose-600 text-white'
                                : isLowStock
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-900/70 text-slate-200'
                            }`}>
                              {isOutOfStock ? 'Habis' : `${product.stok} ${product.satuan || ''}`}
                            </span>
                          )}
                        </div>

                        {/* Product Details */}
                        <div>
                          {product.kodeBarang && (
                            <p className="text-[9px] font-mono text-slate-400 tracking-wider">
                              SKU: {product.kodeBarang}
                            </p>
                          )}
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 line-clamp-2 leading-tight">
                            {product.namaBarang}
                          </h4>
                        </div>
                      </div>

                      {/* Bottom Pricing & In-Card Stepper */}
                      <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-400">
                            {formatRupiah(product.harga)}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            /{product.satuan || 'pcs'}
                          </span>
                        </div>

                        {/* Quick Stepper on Card if In Cart */}
                        {cartItem ? (
                          <div 
                            className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-emerald-500 rounded-lg p-0.5 shadow-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(product.id, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400 px-1">
                              {cartItem.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(product.id, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-850 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition shadow-2xs"
                            title="Tambah ke keranjang"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Terminal Kasir & Checkout Terpadu (5 cols on lg) */}
        <div 
          id="pos-cart-panel" 
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-210px)] min-h-[620px] sticky top-4 overflow-hidden"
        >
          {/* Section 1: Customer Type & Header (shrink-0) */}
          <div className="p-3.5 sm:p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-2.5 shrink-0">
            {/* Title & Cart Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">
                  Keranjang Kasir
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono font-black rounded-full border border-emerald-200 dark:border-emerald-800">
                  {cart.reduce((s, i) => s + i.qty, 0)} item
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Customer Type Segmented Control */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCustomerType('umum')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  customerType === 'umum'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Pembeli Umum</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('anggota')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  customerType === 'anggota'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Anggota Koperasi</span>
              </button>
            </div>

            {/* Member Selector and Compact Limit Badge (If Anggota) */}
            {customerType === 'anggota' && (
              <div className="space-y-2 p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl text-xs">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ketik filter nama / No. Anggota..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-1/2 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                  <select
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      setPoinYangDitukar(0);
                      setAllowOverlimitOverride(false);
                      setOverlimitNote('');
                    }}
                    className="w-1/2 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-850 dark:text-slate-100 font-bold focus:outline-amber-600"
                  >
                    <option value="">-- Pilih Anggota --</option>
                    {filteredMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.noAnggota} - {m.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compact Info Pill & Modal Triggers */}
                {selectedMember && (
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Plafon:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{formatRupiah(sisaPlafonKasbon)}</strong>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                        statusLimitKasbon === 'aman' ? 'bg-emerald-100 text-emerald-800' :
                        statusLimitKasbon === 'waspada' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {statusLimitKasbon === 'aman' ? 'Aman' : statusLimitKasbon === 'waspada' ? 'Menipis' : 'Overlimit'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {memberAccumulatedPoints > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          ⭐ {memberAccumulatedPoints} Poin
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowLoanRecommendation(true)}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Buka analisis rekomendasi pinjaman modal anggota"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Rekomendasi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Cart Items & Dynamic Payment Options (Scrollable Middle flex-1) */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 min-h-0">
            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-10 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Keranjang Masih Kosong</p>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Klik produk di katalog atau scan barcode untuk memasukkan ke keranjang belanja.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div 
                    key={item.id}
                    className="p-2.5 bg-slate-50/90 dark:bg-slate-850/90 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                        {item.namaBarang}
                      </h5>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatRupiah(item.harga)} / {item.satuan || 'pcs'}
                      </p>
                    </div>

                    {/* Stepper +/- */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs font-bold"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={item.qty}
                        onChange={(e) => handleSetQtyDirect(item.id, e.target.value)}
                        className="w-8 text-center font-mono font-black text-xs py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Item Subtotal */}
                    <div className="text-right shrink-0 min-w-[65px]">
                      <p className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(item.harga * item.qty)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="Hapus dari keranjang"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Loyalty Points Redemption Box (Only if member selected and has points) */}
            {customerType === 'anggota' && selectedMember && memberAccumulatedPoints > 0 && (
              <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-850 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-emerald-600" />
                    Tukar Poin ({memberAccumulatedPoints} Poin):
                  </span>
                  {poinYangDitukar > 0 && (
                    <button
                      type="button"
                      onClick={() => setPoinYangDitukar(0)}
                      className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[10, 20, 50].filter(pts => pts <= memberAccumulatedPoints).map(pts => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setPoinYangDitukar(pts)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                        poinYangDitukar === pts
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 border-slate-250 dark:border-slate-750 hover:bg-slate-100'
                      }`}
                    >
                      {pts} Poin (-{formatRupiah(pts * 100)})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPoinYangDitukar(memberAccumulatedPoints)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                      poinYangDitukar === memberAccumulatedPoints
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-850 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    Semua ({memberAccumulatedPoints} Poin)
                  </button>
                </div>
              </div>
            )}

            {/* Discount / Potongan Harga input */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Potongan / Diskon Manual (Rp)
                </label>
                {manualDiscountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountNominal('')}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="0"
                value={discountNominal}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setDiscountNominal(val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '');
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-right focus:outline-emerald-600"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Metode Pembayaran
              </label>
              <div className={`grid ${customerType === 'anggota' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('tunai')}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'tunai'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'qris'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>QRIS</span>
                </button>

                {customerType === 'anggota' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('kredit')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'kredit'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs'
                        : 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50/50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    <span>Kasbon</span>
                  </button>
                )}
              </div>
            </div>

            {/* Context-sensitive payment forms */}
            {paymentMethod === 'tunai' && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Uang Tunai Diterima (Rp):
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickCash(totalAkhir)}
                    className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                  >
                    [ Uang Pas ]
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="0"
                  value={cashGivenStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCashGivenStr(val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '');
                  }}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-850 dark:text-slate-100 font-mono font-black text-right focus:outline-emerald-600"
                />

                {/* Quick denomination chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[10000, 20000, 50000, 100000, 200000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickCash(amt)}
                      className="px-2 py-1 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Live change / underpaid info */}
                {cashGiven > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between font-mono font-black">
                    {underpaidAmount > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 text-xs">
                        ⚠️ Kurang: {formatRupiah(underpaidAmount)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                        ✓ Kembalian: {formatRupiah(changeDue)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-xs space-y-1.5 text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2 font-bold">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Pembayaran Digital QRIS / Transfer Bank</span>
                </div>
                <input
                  type="text"
                  placeholder="No. Referensi / ID Transaksi (Opsional)"
                  value={refNote}
                  onChange={(e) => setRefNote(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-slate-800 dark:text-slate-200 mt-1"
                />
              </div>
            )}

            {paymentMethod === 'kredit' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-2 text-amber-900 dark:text-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Kasbon Warung Anggota</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                    Sisa Plafon: {formatRupiah(sisaPlafonKasbon)}
                  </span>
                </div>

                {isOverCreditLimit && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1.5 text-rose-800 dark:text-rose-200 animate-fadeIn">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Belanja Melebihi Plafon Kasbon!</p>
                        <p className="text-[10px] text-rose-700 dark:text-rose-300 leading-snug">
                          Total tagihan ({formatRupiah(totalAkhir)}) melampaui sisa plafon ({formatRupiah(sisaPlafonKasbon)}) sebesar <strong>{formatRupiah(totalAkhir - sisaPlafonKasbon)}</strong>.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-rose-900 dark:text-rose-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowOverlimitOverride}
                        onChange={(e) => setAllowOverlimitOverride(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Setujui dengan Dispensasi Pengurus</span>
                    </label>

                    {allowOverlimitOverride && (
                      <input
                        type="text"
                        placeholder="Alasan dispensasi pengurus..."
                        value={overlimitNote}
                        onChange={(e) => setOverlimitNote(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg text-slate-800 dark:text-slate-200 mt-1"
                      />
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Catatan pelunasan / memo (Opsional)"
                  value={refNote}
                  onChange={(e) => setRefNote(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Section 3: Bottom Sticky Checkout Bar (Always Visible, shrink-0) */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/95 backdrop-blur-xs space-y-2.5 shrink-0">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} item):</span>
                <span className="font-mono font-semibold">{formatRupiah(cartSubtotal)}</span>
              </div>
              {totalDiskon > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Total Potongan:</span>
                  <span className="font-mono">-{formatRupiah(totalDiskon)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-slate-850 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-750">
                <span>TOTAL AKHIR:</span>
                <span className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(totalAkhir)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={
                cart.length === 0 || 
                isProcessing ||
                (paymentMethod === 'tunai' && underpaidAmount > 0) ||
                (customerType === 'anggota' && !selectedMemberId) ||
                (paymentMethod === 'kredit' && isOverCreditLimit && !allowOverlimitOverride)
              }
              onClick={handleProcessCheckout}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 ${
                cart.length === 0 || isProcessing || (paymentMethod === 'tunai' && underpaidAmount > 0) || (customerType === 'anggota' && !selectedMemberId) || (paymentMethod === 'kredit' && isOverCreditLimit && !allowOverlimitOverride)
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                  : paymentMethod === 'kredit'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {isProcessing ? (
                <span>Memproses Kasir...</span>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>
                    {paymentMethod === 'kredit' ? 'Simpan Kasbon & Cetak Struk' : 'Bayar & Cetak Struk'} ({formatRupiah(totalAkhir)})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile (lg:hidden) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between backdrop-blur-md border border-slate-750">
          <div>
            <span className="text-[11px] text-slate-400 block">{cart.reduce((s, i) => s + i.qty, 0)} item dalam keranjang</span>
            <span className="font-mono font-black text-emerald-400 text-sm">{formatRupiah(totalAkhir)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('pos-cart-panel');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>Lanjut Bayar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MODAL: Rekomendasi Pinjaman & Analisis Kredit Anggota */}
      <AnimatePresence>
        {showLoanRecommendation && selectedMemberLoanRecommendation && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Analisis Kelayakan & Rekomendasi Pinjaman
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Anggota: <strong>{selectedMemberLoanRecommendation.member?.nama}</strong> ({selectedMemberLoanRecommendation.member?.noAnggota})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoanRecommendation(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Skor Kelayakan Header */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Skor Kelayakan Kredit:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    selectedMemberLoanRecommendation.skorKelayakan >= 80
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                      : selectedMemberLoanRecommendation.skorKelayakan >= 60
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300'
                  }`}
                >
                  {selectedMemberLoanRecommendation.skorKelayakan} / 100 ({selectedMemberLoanRecommendation.statusKelayakan.replace('_', ' ')})
                </span>
              </div>

              {/* Rekomendasi Nominal Dua Kolom */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-850 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Pinjaman Ideal
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                      {selectedMemberLoanRecommendation.lunasCount > 0 ? '2.5x Simpanan' : '2.0x Simpanan'}
                    </span>
                  </div>
                  <p className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-300">
                    {formatRupiah(selectedMemberLoanRecommendation.idealNominal)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Plafon aman tanpa risiko likuiditas
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-850 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Plafon Maksimal
                    </span>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.2 rounded">
                      Batas Atas
                    </span>
                  </div>
                  <p className="font-mono font-black text-lg text-indigo-800 dark:text-indigo-300">
                    {formatRupiah(selectedMemberLoanRecommendation.maxNominal)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Batas pengajuan dengan jaminan cukup
                  </p>
                </div>
              </div>

              {/* Detail Ringkas Simpanan & Hutang */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Simpanan (Pokok + Wajib + Sukarela):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatRupiah(selectedMemberLoanRecommendation.totalSimpanan)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Sisa Kasbon Warung Saat Ini:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {formatRupiah(selectedMemberLoanRecommendation.sisaHutangWarung)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Pinjaman Koperasi Berjalan:</span>
                  <span className={`font-mono font-bold ${selectedMemberLoanRecommendation.hasActiveLoan ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedMemberLoanRecommendation.hasActiveLoan ? formatRupiah(selectedMemberLoanRecommendation.sisaHutangAktif) : 'Nihil (Tidak Ada)'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Riwayat Pinjaman Lunas:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedMemberLoanRecommendation.lunasCount}x Lunas Tertib
                  </span>
                </div>
              </div>

              {/* Catatan Analisis */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-indigo-700 dark:text-indigo-400">Catatan Rekomendasi: </strong>
                {selectedMemberLoanRecommendation.catatanRekomendasi}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowLoanRecommendation(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup Analisis
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Struk Kasir / Receipt Modal */}
      <AnimatePresence>
        {activeReceipt && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
            >
              {/* Receipt Printable Card */}
              <div 
                id="pos-receipt-print-area" 
                className="p-5 bg-amber-50/20 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl space-y-3 font-mono text-xs text-slate-800 dark:text-slate-200"
              >
                {/* Receipt Header */}
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {setup?.namaKoperasi || 'KOPERASI DANA SEGAR'}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    UNIT USAHA TOKO & WARUNG KOPERASI
                  </p>
                  {setup?.alamatKantor && (
                    <p className="text-[9px] text-slate-400 line-clamp-1">
                      {setup.alamatKantor}
                    </p>
                  )}
                </div>

                {/* Meta details */}
                <div className="text-[10px] space-y-0.5 text-slate-500 dark:text-slate-400 pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span>No. TRX:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeReceipt.noTransaksi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>{activeReceipt.waktu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{activeReceipt.kasirNama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {activeReceipt.pelangganNama} {activeReceipt.noAnggota ? `(${activeReceipt.noAnggota})` : ''}
                    </span>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-1 py-1 text-[11px]">
                  {activeReceipt.items.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span className="truncate pr-2">{it.namaBarang}</span>
                        <span className="font-bold shrink-0">{formatRupiah(it.harga * it.qty)}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 pl-2">
                        {it.qty} {it.satuan || 'item'} x {formatRupiah(it.harga)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Receipt Calculation Totals */}
                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(activeReceipt.subtotal)}</span>
                  </div>
                  {activeReceipt.diskon > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Diskon:</span>
                      <span>-{formatRupiah(activeReceipt.diskon)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>TOTAL:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(activeReceipt.totalAkhir)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span>Metode:</span>
                    <span className="font-bold uppercase">
                      {activeReceipt.metodePembayaran === 'tunai' ? 'Tunai' : activeReceipt.metodePembayaran === 'qris' ? 'QRIS / Non-Tunai' : 'Kasbon / Kredit'}
                    </span>
                  </div>
                  {activeReceipt.metodePembayaran === 'tunai' && (
                    <>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Bayar:</span>
                        <span>{formatRupiah(activeReceipt.uangDiterima)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-emerald-600">
                        <span>Kembalian:</span>
                        <span>{formatRupiah(activeReceipt.kembalian)}</span>
                      </div>
                    </>
                  )}
                  {activeReceipt.diskonPoin && activeReceipt.diskonPoin > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-600">
                      <span>Diskon Poin:</span>
                      <span>-{formatRupiah(activeReceipt.diskonPoin)}</span>
                    </div>
                  )}
                  {activeReceipt.poinDidapat && activeReceipt.poinDidapat > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-600 font-bold">
                      <span>Poin Diperoleh:</span>
                      <span>+{activeReceipt.poinDidapat} Poin</span>
                    </div>
                  )}
                  {activeReceipt.metodePembayaran === 'kredit' && typeof activeReceipt.sisaPlafonKasbon === 'number' && (
                    <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400">
                      <span>Sisa Plafon Kasbon:</span>
                      <span>{formatRupiah(activeReceipt.sisaPlafonKasbon)}</span>
                    </div>
                  )}
                  {activeReceipt.catatanRef && (
                    <div className="text-[9px] text-slate-400 pt-1">
                      Ket: {activeReceipt.catatanRef}
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 text-center space-y-0.5 text-[9px] text-slate-400">
                  <p>*** TERIMA KASIH ***</p>
                  <p>Koperasi Maju Bersama Anggota</p>
                </div>
              </div>

              {/* Receipt Modal Actions */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Struk</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReceiptText}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedReceipt ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReceipt ? 'Tersalin!' : 'Salin Teks WA'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Transaksi Baru (Selesai)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Custom Item Input */}
      <AnimatePresence>
        {showCustomItemModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Tambah Item Kustom / Bebas
                </h4>
                <button
                  onClick={() => setShowCustomItemModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Nama Barang / Jasa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Seduh Panas / Gorengan"
                    value={customNama}
                    onChange={(e) => setCustomNama(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl focus:outline-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Harga Satuan (Rp)</label>
                    <input
                      type="text"
                      required
                      placeholder="0"
                      value={customHarga}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setCustomHarga(val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '');
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl font-mono text-right focus:outline-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 dark:text-slate-300">Jumlah (Qty)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl font-mono text-center focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Satuan</label>
                  <input
                    type="text"
                    placeholder="pcs / porsi / gelas / bungkus"
                    value={customSatuan}
                    onChange={(e) => setCustomSatuan(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-750 rounded-xl focus:outline-emerald-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomItemModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    + Masukkan Keranjang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Camera Barcode Scanner */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleCameraScan}
        warungBarang={warungBarang}
        onQuickAddProduct={onOpenCatalogTab ? () => {
          setShowCameraScanner(false);
          onOpenCatalogTab();
        } : undefined}
      />

      {/* MODAL: Cetak Label Rak & Barcode Produk */}
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
