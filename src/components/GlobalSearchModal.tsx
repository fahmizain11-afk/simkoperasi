import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Users, CreditCard, TrendingUp, TrendingDown, 
  ShoppingBag, Store, Receipt, Bell, 
  FileText, LayoutDashboard, ArrowRight, X, Sparkles, 
  PiggyBank, Package
} from 'lucide-react';
import { 
  Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, 
  BebanKoperasi, Pembelian, PiutangWarung, WarungBarang, Pengumuman 
} from '../types';
import { formatRupiah } from '../utils/finance';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string, params?: { query?: string; memberId?: string; pinjamanId?: string }) => void;
  members: Member[];
  simpanan: Simpanan[];
  pinjaman: Pinjaman[];
  angsuran: Angsuran[];
  income: PendapatanLain[];
  expenses: BebanKoperasi[];
  pembelian: Pembelian[];
  piutangWarung: PiutangWarung[];
  warungBarang: WarungBarang[];
  announcements: Pengumuman[];
  navItems: { id: string; label: string; icon: any }[];
  isDarkMode: boolean;
}

interface SearchResultItem {
  id: string;
  category: 'anggota' | 'pinjaman' | 'angsuran' | 'simpanan' | 'beban' | 'pendapatan' | 'pembelian' | 'warung' | 'piutang_warung' | 'pengumuman' | 'menu';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: any;
  targetTab: string;
  params?: { query?: string; memberId?: string; pinjamanId?: string };
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
  members,
  simpanan,
  pinjaman,
  angsuran,
  income,
  expenses,
  pembelian,
  piutangWarung,
  warungBarang,
  announcements,
  navItems
}: GlobalSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setActiveCategory('semua');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global search results indexing
  const allResults = useMemo<SearchResultItem[]>(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // 1. Menu & Navigasi
    navItems.forEach(nav => {
      if (nav.label.toLowerCase().includes(q) || nav.id.toLowerCase().includes(q)) {
        results.push({
          id: `menu-${nav.id}`,
          category: 'menu',
          title: `Menu: ${nav.label}`,
          subtitle: `Buka modul ${nav.label}`,
          badge: 'Navigasi Menu',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          icon: nav.icon || LayoutDashboard,
          targetTab: nav.id
        });
      }
    });

    // 2. Anggota Koperasi
    members.forEach(m => {
      const matchName = (m.nama || '').toLowerCase().includes(q);
      const matchNo = (m.noAnggota || '').toLowerCase().includes(q);
      const matchAlamat = (m.alamat || '').toLowerCase().includes(q);
      const matchPekerjaan = (m.pekerjaan || '').toLowerCase().includes(q);
      const matchHp = (m.noHp || '').toLowerCase().includes(q);

      if (matchName || matchNo || matchAlamat || matchPekerjaan || matchHp) {
        results.push({
          id: `member-${m.id}`,
          category: 'anggota',
          title: `${m.noAnggota || 'ANG'} - ${m.nama}`,
          subtitle: `Pekerjaan: ${m.pekerjaan || '-'} • Alamat: ${m.alamat || '-'} • HP: ${m.noHp || '-'} • Status: ${m.isVerified !== false ? 'Aktif' : 'Menunggu'}`,
          badge: 'Anggota Koperasi',
          badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300',
          icon: Users,
          targetTab: 'anggota',
          params: { query: m.nama, memberId: m.id }
        });
      }
    });

    // 3. Pinjaman
    pinjaman.forEach(p => {
      const member = members.find(m => m.id === p.anggotaId);
      const mName = member ? member.nama : '';
      const matchName = mName.toLowerCase().includes(q);
      const matchCode = (p.id || '').toLowerCase().includes(q);
      const matchNom = String(p.nominalPinjaman).includes(q) || formatRupiah(p.nominalPinjaman).toLowerCase().includes(q);
      const matchStatus = (p.status || '').toLowerCase().includes(q);

      if (matchName || matchCode || matchNom || matchStatus) {
        results.push({
          id: `pinjaman-${p.id}`,
          category: 'pinjaman',
          title: `Pinjaman: ${mName || 'Anggota'} (${formatRupiah(p.nominalPinjaman)})`,
          subtitle: `Kode: ${p.id} • Tanggal: ${p.tanggal || '-'} • Tenor: ${p.tenor} Bln • Status: ${p.status?.toUpperCase() || '-'}`,
          badge: 'Pinjaman',
          badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300',
          icon: CreditCard,
          targetTab: 'pinjaman',
          params: { query: mName || p.id, pinjamanId: p.id, memberId: p.anggotaId }
        });
      }
    });

    // 4. Angsuran / Kas Masuk
    angsuran.forEach(a => {
      const member = members.find(m => m.id === a.anggotaId);
      const mName = member ? member.nama : '';
      const matchName = mName.toLowerCase().includes(q);
      const matchCode = (a.id || '').toLowerCase().includes(q);
      const matchNom = String(a.jumlahBayar).includes(q) || formatRupiah(a.jumlahBayar).toLowerCase().includes(q);

      if (matchName || matchCode || matchNom) {
        results.push({
          id: `angsuran-${a.id}`,
          category: 'angsuran',
          title: `Angsuran: ${mName || 'Anggota'} - ${formatRupiah(a.jumlahBayar)}`,
          subtitle: `Tgl: ${a.tanggal || '-'} • Pokok: ${formatRupiah(a.pokokBayar || 0)} • Jasa: ${formatRupiah(a.jasaBayar || 0)}`,
          badge: 'Kas Masuk / Angsuran',
          badgeColor: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300',
          icon: Receipt,
          targetTab: 'kasmasuk',
          params: { query: mName || a.id }
        });
      }
    });

    // 5. Simpanan
    simpanan.forEach(s => {
      const member = members.find(m => m.id === s.anggotaId);
      const mName = member ? member.nama : '';
      const matchName = mName.toLowerCase().includes(q);
      const matchJenis = (s.jenis || '').toLowerCase().includes(q);
      const matchNom = String(s.jumlah).includes(q) || formatRupiah(s.jumlah).toLowerCase().includes(q);

      if (matchName || matchJenis || matchNom) {
        results.push({
          id: `simpanan-${s.id}`,
          category: 'simpanan',
          title: `Simpanan ${s.jenis}: ${mName || 'Anggota'} (${formatRupiah(s.jumlah)})`,
          subtitle: `Tanggal: ${s.tanggal || '-'} • Kategori: Simpanan ${s.jenis} Koperasi`,
          badge: `Simpanan ${s.jenis}`,
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          icon: PiggyBank,
          targetTab: 'simpanan',
          params: { query: mName }
        });
      }
    });

    // 6. Penyaluran Beban / Pengeluaran
    expenses.forEach(e => {
      const matchCat = (e.kategori || '').toLowerCase().includes(q);
      const matchKet = (e.keterangan || '').toLowerCase().includes(q);
      const matchTgl = (e.tanggal || '').toLowerCase().includes(q);
      const matchNom = String(e.nominal).includes(q) || formatRupiah(e.nominal).toLowerCase().includes(q);

      if (matchCat || matchKet || matchTgl || matchNom) {
        results.push({
          id: `expense-${e.id}`,
          category: 'beban',
          title: `Penyaluran Beban: ${formatRupiah(e.nominal)} - ${e.keterangan || e.kategori}`,
          subtitle: `Tgl: ${e.tanggal || '-'} • Kategori: ${(e.kategori || '').replace(/_/g, ' ').toUpperCase()}`,
          badge: 'Penyaluran Beban',
          badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300',
          icon: TrendingDown,
          targetTab: 'aruskas',
          params: { query: e.keterangan || e.kategori }
        });
      }
    });

    // 7. Pendapatan Non-Operasional
    income.forEach(inc => {
      const matchSrc = (inc.sumber || '').toLowerCase().includes(q);
      const matchKet = (inc.keterangan || '').toLowerCase().includes(q);
      const matchTgl = (inc.tanggal || '').toLowerCase().includes(q);
      const matchNom = String(inc.nominal).includes(q) || formatRupiah(inc.nominal).toLowerCase().includes(q);

      if (matchSrc || matchKet || matchTgl || matchNom) {
        results.push({
          id: `income-${inc.id}`,
          category: 'pendapatan',
          title: `Pendapatan: ${formatRupiah(inc.nominal)} - ${inc.keterangan || inc.sumber}`,
          subtitle: `Tgl: ${inc.tanggal || '-'} • Sumber: ${(inc.sumber || '').replace(/_/g, ' ').toUpperCase()}`,
          badge: 'Pendapatan',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          icon: TrendingUp,
          targetTab: 'aruskas',
          params: { query: inc.keterangan || inc.sumber }
        });
      }
    });

    // 8. Pembelian & Aset
    pembelian.forEach(pem => {
      const matchNama = (pem.namaBarang || '').toLowerCase().includes(q);
      const matchKat = (pem.kategori || '').toLowerCase().includes(q);
      const matchKet = (pem.keterangan || '').toLowerCase().includes(q);
      const matchNom = String(pem.totalHarga).includes(q) || formatRupiah(pem.totalHarga).toLowerCase().includes(q);

      if (matchNama || matchKat || matchKet || matchNom) {
        results.push({
          id: `pembelian-${pem.id}`,
          category: 'pembelian',
          title: `Pembelian: ${pem.namaBarang} (${formatRupiah(pem.totalHarga)})`,
          subtitle: `Tgl: ${pem.tanggal || '-'} • Jumlah: ${pem.kuantitas || 1} • Kategori: ${pem.kategori} • Ket: ${pem.keterangan || '-'}`,
          badge: 'Pembelian / Persediaan',
          badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300',
          icon: ShoppingBag,
          targetTab: 'pembelian',
          params: { query: pem.namaBarang }
        });
      }
    });

    // 9. Warung Toko
    warungBarang.forEach(wb => {
      const matchNama = (wb.namaBarang || '').toLowerCase().includes(q);
      const matchDesk = (wb.deskripsi || '').toLowerCase().includes(q);

      if (matchNama || matchDesk) {
        results.push({
          id: `wb-${wb.id}`,
          category: 'warung',
          title: `Produk Warung: ${wb.namaBarang} (${formatRupiah(wb.harga)})`,
          subtitle: `Deskripsi: ${wb.deskripsi || '-'} • Stok: ${wb.stok ?? 0} ${wb.satuan || 'pcs'}`,
          badge: 'Toko Warung',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          icon: Store,
          targetTab: 'warung',
          params: { query: wb.namaBarang }
        });
      }
    });

    // 10. Piutang Warung
    piutangWarung.forEach(pw => {
      const member = members.find(m => m.id === pw.anggotaId);
      const mName = member ? member.nama : 'Pelanggan Warung';
      const matchNama = mName.toLowerCase().includes(q);
      const matchKet = (pw.keterangan || '').toLowerCase().includes(q);
      const matchNom = String(pw.nominal).includes(q) || formatRupiah(pw.nominal).toLowerCase().includes(q);

      if (matchNama || matchKet || matchNom) {
        results.push({
          id: `pw-${pw.id}`,
          category: 'piutang_warung',
          title: `Piutang Toko: ${mName} (${pw.jenis === 'pelunasan' ? 'Pelunasan: ' : 'Hutang: '}${formatRupiah(pw.nominal)})`,
          subtitle: `Tgl: ${pw.tanggal || '-'} • Jenis: ${pw.jenis === 'pelunasan' ? 'Pelunasan' : 'Hutang Baru'} • Ket: ${pw.keterangan || '-'}`,
          badge: 'Piutang Toko',
          badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300',
          icon: Package,
          targetTab: 'warung',
          params: { query: mName }
        });
      }
    });

    // 11. Pengumuman
    announcements.forEach(ann => {
      const matchJudul = (ann.judul || '').toLowerCase().includes(q);
      const matchKonten = (ann.konten || '').toLowerCase().includes(q);

      if (matchJudul || matchKonten) {
        results.push({
          id: `ann-${ann.id}`,
          category: 'pengumuman',
          title: `Pengumuman: ${ann.judul}`,
          subtitle: `Tgl: ${ann.tanggal || '-'} • ${(ann.konten || '').substring(0, 80)}...`,
          badge: 'Pengumuman',
          badgeColor: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300',
          icon: Bell,
          targetTab: 'pengumuman',
          params: { query: ann.judul }
        });
      }
    });

    return results;
  }, [searchTerm, members, pinjaman, angsuran, simpanan, expenses, income, pembelian, warungBarang, piutangWarung, announcements, navItems]);

  // Filtered by category tab
  const filteredResults = useMemo(() => {
    if (activeCategory === 'semua') return allResults;
    if (activeCategory === 'anggota') return allResults.filter(r => r.category === 'anggota');
    if (activeCategory === 'pinjaman') return allResults.filter(r => r.category === 'pinjaman' || r.category === 'angsuran');
    if (activeCategory === 'simpanan') return allResults.filter(r => r.category === 'simpanan');
    if (activeCategory === 'kas') return allResults.filter(r => r.category === 'beban' || r.category === 'pendapatan' || r.category === 'angsuran');
    if (activeCategory === 'warung') return allResults.filter(r => r.category === 'warung' || r.category === 'piutang_warung' || r.category === 'pembelian');
    if (activeCategory === 'menu') return allResults.filter(r => r.category === 'menu');
    return allResults;
  }, [allResults, activeCategory]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeCategory]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredResults.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filteredResults.length || 1)) % (filteredResults.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose]);

  const handleSelect = (item: SearchResultItem) => {
    onNavigate(item.targetTab, item.params);
    onClose();
  };

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'Daftar Anggota', tab: 'anggota', icon: Users, desc: 'Lihat data & nomor anggota' },
    { label: 'Kas Masuk / Angsuran', tab: 'kasmasuk', icon: Receipt, desc: 'Setor simpanan & bayar angsuran' },
    { label: 'Pengajuan Pinjaman', tab: 'pinjaman', icon: CreditCard, desc: 'Kelola pinjaman & verifikasi' },
    { label: 'Arus Kas & Beban', tab: 'aruskas', icon: TrendingDown, desc: 'Catat pendapatan & penyaluran beban' },
    { label: 'Laporan Keuangan', tab: 'laporan', icon: FileText, desc: 'Neraca saldo, laba rugi & SHU' },
    { label: 'Unit Usaha Warung', tab: 'warung', icon: Store, desc: 'Transaksi belanja & POS' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10 flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-150 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari anggota, pinjaman, kas masuk, penyaluran beban, simpanan, produk warung..."
            className="w-full bg-transparent border-none outline-none px-3.5 text-sm sm:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200/80 dark:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Filter Category Chips */}
        {searchTerm.trim() && (
          <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-700/60 bg-white dark:bg-slate-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'semua', label: `Semua (${allResults.length})` },
              { id: 'anggota', label: `Anggota (${allResults.filter(r => r.category === 'anggota').length})` },
              { id: 'pinjaman', label: `Pinjaman (${allResults.filter(r => r.category === 'pinjaman' || r.category === 'angsuran').length})` },
              { id: 'simpanan', label: `Simpanan (${allResults.filter(r => r.category === 'simpanan').length})` },
              { id: 'kas', label: `Kas & Beban (${allResults.filter(r => r.category === 'beban' || r.category === 'pendapatan' || r.category === 'angsuran').length})` },
              { id: 'warung', label: `Toko Warung (${allResults.filter(r => r.category === 'warung' || r.category === 'piutang_warung' || r.category === 'pembelian').length})` },
              { id: 'menu', label: `Menu (${allResults.filter(r => r.category === 'menu').length})` }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Container */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800">
          {!searchTerm.trim() ? (
            <div className="py-6 px-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Akses Cepat & Modul Utama
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickLinks.map(ql => {
                  const Icon = ql.icon;
                  return (
                    <button
                      key={ql.tab}
                      onClick={() => {
                        onNavigate(ql.tab);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-150 dark:border-slate-750 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg group-hover:scale-105 transition shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                          {ql.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {ql.desc}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>💡 Ketik nama anggota, no anggota, kode transaksi, atau nominal untuk mencari otomatis.</span>
                <span className="font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">Ctrl + K</span>
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Tidak ada data ditemukan untuk "{searchTerm}"
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Coba periksa ejaan kata kunci atau ganti dengan istilah lain seperti nama anggota, nomor telepon, atau kategori transaksi.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 shadow-2xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-600 shrink-0 self-center">
                      <span className="text-[10px] hidden sm:inline font-medium">Buka</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono shadow-2xs">↓</kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono shadow-2xs">↵ Enter</kbd>
              <span>Pilih</span>
            </span>
          </div>
          <span>
            {filteredResults.length > 0 ? `${filteredResults.length} hasil ditemukan` : 'Pencarian Koperasi'}
          </span>
        </div>
      </div>
    </div>
  );
}
