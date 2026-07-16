import React, { useState, useMemo } from 'react';
import { Pengumuman, KoperasiSetup } from '../types';
import { 
  Megaphone, Plus, Edit2, Trash2, AlertCircle, Calendar, 
  Eye, EyeOff, Save, X, Search, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PengumumanViewProps {
  setup: KoperasiSetup;
  announcements: Pengumuman[];
  onAddAnnouncement: (item: Omit<Pengumuman, 'id'>) => Promise<void>;
  onEditAnnouncement: (item: Pengumuman) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
}

export function PengumumanView({ 
  setup, 
  announcements, 
  onAddAnnouncement, 
  onEditAnnouncement, 
  onDeleteAnnouncement 
}: PengumumanViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [filterUrgent, setFilterUrgent] = useState<'Semua' | 'Urgent' | 'Biasa'>('Semua');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formJudul, setFormJudul] = useState('');
  const [formKonten, setFormKonten] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle opening form for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormJudul('');
    setFormKonten('');
    setFormIsUrgent(false);
    setFormStatus('Aktif');
    setErrorMsg('');
    setShowForm(true);
  };

  // Handle opening form for Edit
  const handleOpenEdit = (item: Pengumuman) => {
    setEditingId(item.id);
    setFormJudul(item.judul);
    setFormKonten(item.konten);
    setFormIsUrgent(item.isUrgent);
    setFormStatus(item.status);
    setErrorMsg('');
    setShowForm(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formKonten.trim()) {
      setErrorMsg('Judul dan Konten pengumuman wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingId) {
        // Edit existing
        await onEditAnnouncement({
          id: editingId,
          tanggal: announcements.find(a => a.id === editingId)?.tanggal || new Date().toISOString().split('T')[0],
          judul: formJudul.trim(),
          konten: formKonten.trim(),
          isUrgent: formIsUrgent,
          status: formStatus
        });
      } else {
        // Create new
        await onAddAnnouncement({
          tanggal: new Date().toISOString().split('T')[0],
          judul: formJudul.trim(),
          konten: formKonten.trim(),
          isUrgent: formIsUrgent,
          status: formStatus
        });
      }
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menyimpan pengumuman. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        await onDeleteAnnouncement(id);
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus pengumuman.');
      }
    }
  };

  // Filter and search announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      const matchesSearch = 
        item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.konten.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'Semua' || 
        item.status === filterStatus;
      
      const matchesUrgent = 
        filterUrgent === 'Semua' || 
        (filterUrgent === 'Urgent' && item.isUrgent) ||
        (filterUrgent === 'Biasa' && !item.isUrgent);

      return matchesSearch && matchesStatus && matchesUrgent;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [announcements, searchQuery, filterStatus, filterUrgent]);

  return (
    <div className="space-y-6">
      
      {/* Upper header action area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Manajemen Pengumuman Koperasi
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400">
            Kelola pengumuman custom untuk ditampilkan pada halaman awal (Beranda) Portal Koperasi dan Dashboard Anggota.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      {/* Main Grid: Filters & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: search and filters */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-150 dark:border-slate-700/80 space-y-4">
            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Filter & Pencarian
            </h3>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-800 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Status Tayang
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                {(['Semua', 'Aktif', 'Nonaktif'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition ${
                      filterStatus === status
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Prioritas
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                {(['Semua', 'Urgent', 'Biasa'] as const).map((prio) => (
                  <button
                    key={prio}
                    onClick={() => setFilterUrgent(prio)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition ${
                      filterUrgent === prio
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt info */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl flex gap-3 text-xs text-emerald-800 dark:text-emerald-350 leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold mb-0.5">Pengumuman Terintegrasi</p>
              Setiap pengumuman berstatus <span className="font-bold">Aktif</span> akan langsung disematkan pada Landing Page (Portal Depan) dan dashboard privat masing-masing Anggota secara real-time. Gunakan flag <span className="font-bold">Penting/Urgent</span> untuk memposisikannya di bagian paling atas dengan sorotan khusus.
            </div>
          </div>
        </div>

        {/* Right columns: Announcement listing */}
        <div className="lg:col-span-2 space-y-4">
          
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-150 dark:border-slate-700/80 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3">
                <Megaphone className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tidak ada pengumuman ditemukan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Belum ada pengumuman yang sesuai dengan filter Anda, atau silakan buat pengumuman baru menggunakan tombol di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden shadow-sm flex flex-col md:flex-row gap-4 justify-between ${
                    item.isUrgent
                      ? 'border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-white to-amber-50/20 dark:from-slate-800 dark:to-amber-950/5'
                      : 'border-slate-150 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {/* Left priority side accent ribbon for urgent items */}
                  {item.isUrgent && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.tanggal}
                      </span>

                      {item.isUrgent && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/55 text-amber-800 dark:text-amber-400 text-[9px] font-extrabold uppercase rounded-md tracking-wider flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Penting
                        </span>
                      )}

                      {item.status === 'Aktif' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/55 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" />
                          Tayang
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                          <EyeOff className="w-2.5 h-2.5" />
                          Draf/Arsip
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-850 dark:text-white text-base leading-snug">
                      {item.judul}
                    </h4>

                    <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {item.konten}
                    </p>
                  </div>

                  {/* Actions column */}
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700/80 pt-3 md:pt-0 md:pl-4">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold md:w-full md:justify-start"
                      title="Ubah Pengumuman"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="md:inline">Ubah</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold md:w-full md:justify-start"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="md:inline">Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over / Modal Form for Add/Edit */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Form Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10"
            >
              
              {/* Header */}
              <div className="p-5 border-b border-slate-150 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    {editingId ? 'Edit Pengumuman Koperasi' : 'Buat Pengumuman Koperasi Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400">
                    {editingId ? 'Ubah informasi detail pengumuman yang sudah ada.' : 'Tambahkan pengumuman baru ke halaman depan.'}
                  </p>
                </div>
                
                <button
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                  className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                
                {errorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-350 text-xs flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Judul */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Judul Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jadwal Rapat Anggota Tahunan (RAT) 2026"
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-800 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>

                {/* Konten */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    Isi Konten Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Tuliskan isi pengumuman secara lengkap di sini. Anda dapat menggunakan spasi dan baris baru..."
                    value={formKonten}
                    onChange={(e) => setFormKonten(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-800 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 resize-none whitespace-pre-wrap"
                  />
                </div>

                {/* Status & Urgent Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  
                  {/* Urgent Switch */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-750">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-200">
                        Penting / Urgent
                      </span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">
                        Beri sorotan visual khusus
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormIsUrgent(!formIsUrgent)}
                      disabled={isSubmitting}
                      className={`w-10 h-6 rounded-full p-1 transition duration-200 cursor-pointer focus:outline-none flex items-center ${
                        formIsUrgent ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {/* Status Switch */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-750">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-200">
                        Status Tayang
                      </span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">
                        Langsung publish di portal
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormStatus(formStatus === 'Aktif' ? 'Nonaktif' : 'Aktif')}
                      disabled={isSubmitting}
                      className={`w-10 h-6 rounded-full p-1 transition duration-200 cursor-pointer focus:outline-none flex items-center ${
                        formStatus === 'Aktif' ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-slate-150 dark:border-slate-700 pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Pengumuman</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
