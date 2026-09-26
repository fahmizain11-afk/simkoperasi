import React, { useState } from 'react';
import { Pembelian, KoperasiSetup } from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  ShoppingCart, Plus, Trash2, Calendar, Tag, FileText, Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PembelianProps {
  setup?: KoperasiSetup;
  pembelian: Pembelian[];
  onAddPembelian: (item: Omit<Pembelian, 'id'>) => void;
  onDeletePembelian: (id: string) => void;
}

export function PembelianView({
  setup,
  pembelian,
  onAddPembelian,
  onDeletePembelian
}: PembelianProps) {
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: string;
    itemName: string;
    itemDetails?: { label: string; value: string; isHighlight?: boolean }[];
    warningMessage?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Form states for Pembelian
  const [pemDate, setPemDate] = useState(new Date().toISOString().substring(0, 10));
  const [pemName, setPemName] = useState('');
  const [pemCat, setPemCat] = useState<string>('persediaan_warung');
  const [pemQty, setPemQty] = useState('1');
  const [pemPrice, setPemPrice] = useState('');
  const [pemNotes, setPemNotes] = useState('');

  // Custom Categories list from localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('koperasi_custom_pos_neraca');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Local Search state
  const [searchQuery, setSearchQuery] = useState('');

  const handlePembelianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(pemQty);
    const prc = parseFloat(pemPrice.replace(/\D/g, ''));
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0 || !pemName.trim()) {
      alert("Harap lengkapi formulir pembelian dengan nilai yang valid!");
      return;
    }

    onAddPembelian({
      tanggal: pemDate,
      namaBarang: pemName.trim(),
      kategori: pemCat,
      kuantitas: qty,
      hargaSatuan: prc,
      totalHarga: qty * prc,
      keterangan: pemNotes.trim() || `Pembelian ${pemName.trim()}`
    });

    // Reset Form
    setPemName('');
    setPemQty('1');
    setPemPrice('');
    setPemNotes('');
    alert("Transaksi Pembelian/Inventaris berhasil disimpan ke database!");
  };

  // Filtered Lists
  const filteredPembelian = pembelian.filter(p => {
    const term = searchQuery.toLowerCase();
    return p.namaBarang.toLowerCase().includes(term) || 
           p.keterangan.toLowerCase().includes(term) ||
           p.kategori.replace('_', ' ').toLowerCase().includes(term);
  }).sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  // Totals calculations
  const totalPembelianSum = pembelian.reduce((acc, c) => acc + c.totalHarga, 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-emerald-850 to-teal-900 text-white p-6 rounded-3xl border border-emerald-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="p-3 bg-white/10 backdrop-blur-md rounded-2xl"><ShoppingCart className="w-6 h-6 text-white"/></span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Inventaris & Pembelian Aset</h2>
              <p className="text-xs text-emerald-100 mt-1">Kelola perolehan persediaan, aset inventaris, serta catatan pembelanjaan barang modal.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[150px]">
              <span className="text-[10px] text-emerald-200 block uppercase font-mono">Total Pengadaan</span>
              <span className="text-sm font-bold font-mono">{formatRupiah(totalPembelianSum)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Searching Bar */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex gap-3 items-center shadow-xs">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-4 h-4" /></span>
          <input 
            type="text" 
            placeholder="Cari nama barang, kategori, rincian pengadaan..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 rounded-lg placeholder-slate-400 font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Form Column (Span 1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-emerald-600"/> Catat Pembelian & Inventaris
            </h3>
            <form onSubmit={handlePembelianSubmit} className="space-y-3.5 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tanggal Transaksi</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={pemDate}
                    onChange={(e) => setPemDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nama Barang / Deskripsi</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Contoh: Beras SPHP Rajawali"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={pemName}
                    onChange={(e) => setPemName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kategori Rekening / Pos Neraca</label>
                <select 
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-bold"
                  value={pemCat}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setShowNewCatInput(true);
                    } else {
                      setPemCat(e.target.value);
                      setShowNewCatInput(false);
                    }
                  }}
                >
                  <option value="persediaan_warung">🛍️ Persediaan Toko/Warung</option>
                  <option value="persediaan_barang">📦 Persediaan Barang Dagang Lain</option>
                  <option value="seragam">👕 Seragam Anggota / Pengurus</option>
                  <option value="inventaris">🖥️ Inventaris Kantor / Hardware</option>
                  <option value="atribut">🎗️ Atribut Koperasi (Pin, Banner, Badge)</option>
                  <option value="lain_lain">📝 Pengeluaran Pembelian Lain</option>
                  {customCategories.map((cat) => (
                    <option key={cat} value={cat}>🏢 {cat}</option>
                  ))}
                  <option value="__ADD_NEW__">➕ Tambah Pos Neraca Baru...</option>
                </select>
              </div>

              {showNewCatInput && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-lg space-y-2 mt-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pos Neraca Custom Baru</p>
                  <input 
                    type="text"
                    placeholder="Contoh: Gedung Kantor / Kendaraan"
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCatInput(false);
                        setPemCat('persediaan_warung');
                        setNewCatName('');
                      }}
                      className="flex-1 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded font-bold text-[10px]"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanDisplayName = newCatName.trim();
                        if (!cleanDisplayName) {
                          alert("Nama Pos Neraca tidak boleh kosong!");
                          return;
                        }
                        if (
                          customCategories.some(c => c.toLowerCase() === cleanDisplayName.toLowerCase()) || 
                          ['persediaan_warung', 'seragam', 'persediaan_barang', 'inventaris', 'lain_lain'].includes(cleanDisplayName.toLowerCase())
                        ) {
                          alert("Pos Neraca ini sudah ada!");
                          return;
                        }
                        const updated = [...customCategories, cleanDisplayName];
                        setCustomCategories(updated);
                        localStorage.setItem('koperasi_custom_pos_neraca', JSON.stringify(updated));
                        setPemCat(cleanDisplayName);
                        setShowNewCatInput(false);
                        setNewCatName('');
                      }}
                      className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                    >
                      Simpan Pos
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kuantitas (Qty)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={pemQty}
                    onChange={(e) => setPemQty(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Harga Satuan (Rp)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 15.000"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={pemPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPemPrice(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                    }}
                    required
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500">Estimasi Total:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah((parseInt(pemQty) || 0) * (parseFloat(pemPrice.replace(/\D/g, '')) || 0))}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Keterangan / Supplier</label>
                <textarea 
                  placeholder="Sumber toko, merek, atau nama pabrik..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600"
                  value={pemNotes}
                  onChange={(e) => setPemNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4"/> Catat Pembelian Tunai
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
                  <ShoppingCart className="w-4 h-4 text-emerald-600" /> Histori Pembelian Stok & Inventaris
                </h4>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-350">
                  {filteredPembelian.length} Transaksi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-3">Kategori POS</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Outlay</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredPembelian.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-normal italic">
                          Belum ada catatan transaksi pembelian / inventaris.
                        </td>
                      </tr>
                    ) : (
                      filteredPembelian.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-200 transition">
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{p.tanggal}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-850 dark:text-slate-100 leading-tight">{p.namaBarang}</p>
                            {p.keterangan && <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.keterangan}</p>}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                              {p.kategori.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{p.kuantitas}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{formatRupiah(p.hargaSatuan)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-50 font-mono text-[12px]">{formatRupiah(p.totalHarga)}</td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={() => {
                                setDeleteModalState({
                                  isOpen: true,
                                  itemType: 'Catatan Pembelian / Pengeluaran',
                                  itemName: `${p.namaBarang} (${p.kuantitas} pcs)`,
                                  itemDetails: [
                                    { label: 'Tanggal', value: p.tanggal },
                                    { label: 'Nama Barang', value: p.namaBarang },
                                    { label: 'Kategori', value: p.kategori.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
                                    { label: 'Kuantitas', value: String(p.kuantitas) },
                                    { label: 'Harga Satuan', value: formatRupiah(p.hargaSatuan) },
                                    { label: 'Total Biaya', value: formatRupiah(p.totalHarga), isHighlight: true }
                                  ],
                                  warningMessage: 'Menghapus catatan ini akan mengembalikan saldo buku kas dan memperbarui laporan neraca koperasi.',
                                  onConfirm: () => {
                                    onDeletePembelian(p.id);
                                  }
                                });
                              }}
                              className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                              title="Hapus Catatan"
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
        </div>
      </div>

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
    </div>
  );
}
