import React, { useState } from 'react';
import { Pembelian, KoperasiSetup } from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  ShoppingCart, Plus, Trash2, Calendar, Tag, FileText, Search, Lock, Edit3, X
} from 'lucide-react';
import { motion } from 'motion/react';

interface PembelianProps {
  setup?: KoperasiSetup;
  pembelian: Pembelian[];
  onAddPembelian: (item: Omit<Pembelian, 'id'>) => void;
  onUpdatePembelian?: (id: string, item: Omit<Pembelian, 'id'>) => void;
  onDeletePembelian: (id: string) => void;
  availableCash?: number;
}

export function PembelianView({
  setup,
  pembelian,
  onAddPembelian,
  onUpdatePembelian,
  onDeletePembelian,
  availableCash
}: PembelianProps) {
  // Form states for Pembelian
  const [pemDate, setPemDate] = useState(new Date().toISOString().substring(0, 10));
  const [pemName, setPemName] = useState('');
  const [pemCat, setPemCat] = useState<string>('persediaan_warung');
  const [pemQty, setPemQty] = useState('1');
  const [pemPrice, setPemPrice] = useState('');
  const [pemNotes, setPemNotes] = useState('');

  // Form states for Editing Pembelian
  const [editingPembelian, setEditingPembelian] = useState<Pembelian | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('persediaan_warung');
  const [editQty, setEditQty] = useState('1');
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
    const prc = parseFloat(pemPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0 || !pemName.trim()) {
      alert("Harap lengkapi formulir pembelian dengan nilai yang valid!");
      return;
    }

    const total = qty * prc;
    if (availableCash !== undefined && total > availableCash) {
      alert(`Transaksi Gagal!\n\nSaldo kas tidak mencukupi untuk melakukan pembelian ini.\n\nSaldo Kas Saat Ini: ${formatRupiah(availableCash)}\nTotal Pembelian: ${formatRupiah(total)}\n\nSilakan kurangi kuantitas atau harga satuan.`);
      return;
    }

    onAddPembelian({
      tanggal: pemDate,
      namaBarang: pemName.trim(),
      kategori: pemCat,
      kuantitas: qty,
      hargaSatuan: prc,
      totalHarga: total,
      keterangan: pemNotes.trim() || `Pembelian ${pemName.trim()}`
    });

    // Reset Form
    setPemName('');
    setPemQty('1');
    setPemPrice('');
    setPemNotes('');
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
                    type="number" 
                    placeholder="Contoh: 15000"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 focus:outline-emerald-600 font-sans"
                    value={pemPrice}
                    onChange={(e) => setPemPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {(() => {
                const estimatedTotal = (parseInt(pemQty) || 0) * (parseFloat(pemPrice) || 0);
                const isInsufficient = availableCash !== undefined && estimatedTotal > availableCash;
                return (
                  <div className={`p-2.5 rounded-lg border border-dashed flex flex-col gap-1.5 transition duration-200 ${
                    isInsufficient 
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className={isInsufficient ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500"}>Estimasi Total:</span>
                      <span className={`font-bold ${isInsufficient ? 'text-rose-600 dark:text-rose-400 text-sm' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {formatRupiah(estimatedTotal)}
                      </span>
                    </div>
                    {isInsufficient && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1 mt-0.5">
                        ⚠️ Saldo Kas Tidak Mencukupi (Tersedia: {formatRupiah(availableCash)})
                      </div>
                    )}
                  </div>
                );
              })()}

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
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingPembelian(p);
                                  setEditDate(p.tanggal);
                                  setEditName(p.namaBarang);
                                  setEditCat(p.kategori);
                                  setEditQty(p.kuantitas.toString());
                                  setEditPrice(p.hargaSatuan.toString());
                                  setEditNotes(p.keterangan || '');
                                }}
                                className="p-1 hover:text-emerald-600 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-400 transition cursor-pointer"
                                title="Edit Catatan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  if(confirm("Apakah Anda yakin ingin menghapus catatan pembelian ini?")) {
                                    onDeletePembelian(p.id);
                                  }
                                }}
                                className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 transition cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      </div>

      {/* Edit Pembelian Modal */}
      {editingPembelian && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Edit Catatan Pembelian</h3>
                  <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Ubah data pembelian atau pengadaan</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingPembelian(null)}
                className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-400 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const qty = parseInt(editQty);
                const prc = parseFloat(editPrice);
                if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0 || !editName.trim()) {
                  alert("Harap lengkapi formulir dengan nilai yang valid!");
                  return;
                }
                const total = qty * prc;
                const diff = total - editingPembelian.totalHarga;
                if (availableCash !== undefined && diff > availableCash) {
                  alert(`Saldo kas tidak mencukupi!\n\nKebutuhan Tambahan: ${formatRupiah(diff)}\nSaldo Kas Saat Ini: ${formatRupiah(availableCash)}`);
                  return;
                }
                if (onUpdatePembelian) {
                  onUpdatePembelian(editingPembelian.id, {
                    tanggal: editDate,
                    namaBarang: editName.trim(),
                    kategori: editCat,
                    kuantitas: qty,
                    hargaSatuan: prc,
                    totalHarga: total,
                    keterangan: editNotes.trim() || `Pembelian ${editName.trim()}`
                  });
                }
                setEditingPembelian(null);
              }}
              className="p-5 space-y-4 overflow-y-auto text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Tanggal Transaksi:</label>
                  <input 
                    type="date" 
                    required
                    value={editDate}
                    onChange={(e)=>setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Kategori POS:</label>
                  <select 
                    value={editCat}
                    onChange={(e)=>setEditCat(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                  >
                    <option value="persediaan_warung">Warung (Restock Persediaan)</option>
                    <option value="inventaris_alat">Inventaris Kantor / Alat</option>
                    <option value="aset_tetap">Aset Tetap / Renovasi</option>
                    <option value="beban_operasional">Beban Operasional</option>
                    {customCategories.map(cat => (
                      <option key={cat} value={cat}>{cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Nama Barang / Pembelian:</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Beras Ramos 50kg, Printer Epson..."
                  value={editName}
                  onChange={(e)=>setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Kuantitas (Qty):</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={editQty}
                    onChange={(e)=>setEditQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Harga Satuan (Rp):</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="Contoh: 15000"
                    value={editPrice}
                    onChange={(e)=>setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-mono"
                  />
                </div>
              </div>

              {(() => {
                const estimatedTotal = (parseInt(editQty) || 0) * (parseFloat(editPrice) || 0);
                const originalTotal = editingPembelian.totalHarga;
                const diff = estimatedTotal - originalTotal;
                const isInsufficient = availableCash !== undefined && diff > availableCash;
                return (
                  <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                    isInsufficient 
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' 
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-150 dark:border-slate-800'
                  }`}>
                    <div className="flex justify-between items-center font-bold text-xs">
                      <span className={isInsufficient ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500"}>TOTAL BARU:</span>
                      <span className={`text-sm font-mono font-bold ${isInsufficient ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                        {formatRupiah(estimatedTotal)}
                      </span>
                    </div>
                    {diff !== 0 && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Selisih dengan sebelumnya:</span>
                        <span className={diff > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                          {diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
                        </span>
                      </div>
                    )}
                    {isInsufficient && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-1">
                        ⚠️ Saldo Kas Tidak Mencukupi (Tersedia: {formatRupiah(availableCash)})
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Keterangan / Supplier:</label>
                <textarea 
                  rows={2}
                  placeholder="Keterangan toko, merek, spesifikasi barang..."
                  value={editNotes}
                  onChange={(e)=>setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-600 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingPembelian(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-slate-600 dark:text-slate-400 text-center transition cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={(() => {
                    const estimatedTotal = (parseInt(editQty) || 0) * (parseFloat(editPrice) || 0);
                    const originalTotal = editingPembelian.totalHarga;
                    const diff = estimatedTotal - originalTotal;
                    return availableCash !== undefined && diff > availableCash;
                  })()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm hover:shadow transition cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
