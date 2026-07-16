import React, { useState } from 'react';
import { GaleriKoperasi } from '../types';
import { 
  Image as ImageIcon, Plus, Trash2, Edit3, Save, X, Sparkles, Upload, Calendar, FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';

interface AdminGaleriViewProps {
  galeriKoperasi: GaleriKoperasi[];
  onAddGaleri: (item: Omit<GaleriKoperasi, 'id'>) => Promise<void>;
  onEditGaleri: (item: GaleriKoperasi) => Promise<void>;
  onDeleteGaleri: (id: string) => Promise<void>;
}

export function AdminGaleriView({
  galeriKoperasi,
  onAddGaleri,
  onEditGaleri,
  onDeleteGaleri
}: AdminGaleriViewProps) {
  const [editingGaleri, setEditingGaleri] = useState<GaleriKoperasi | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form States
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // File Processing
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
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !tanggal || !fotoUrl) {
      alert("Mohon isi judul, tanggal, dan foto kegiatan!");
      return;
    }

    let finalFotoUrl = fotoUrl;
    if (fotoUrl.startsWith('data:')) {
      try {
        finalFotoUrl = await compressImage(fotoUrl, 800, 800, 0.7);
      } catch (err) {
        console.error("Error compressing data URI on submit:", err);
      }
    }

    const itemData = {
      judul,
      tanggal,
      deskripsi,
      fotoUrl: finalFotoUrl
    };

    if (editingGaleri) {
      await onEditGaleri({ ...itemData, id: editingGaleri.id });
    } else {
      await onAddGaleri(itemData);
    }

    resetForm();
  };

  const resetForm = () => {
    setEditingGaleri(null);
    setShowForm(false);
    setJudul('');
    setTanggal('');
    setDeskripsi('');
    setFotoUrl('');
  };

  const startEdit = (item: GaleriKoperasi) => {
    setEditingGaleri(item);
    setJudul(item.judul);
    setTanggal(item.tanggal);
    setDeskripsi(item.deskripsi || '');
    setFotoUrl(item.fotoUrl);
    setShowForm(true);
  };

  return (
    <div className="space-y-6" id="admin-galeri-container">
      {/* Title Header area */}
      <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Galeri Kegiatan Koperasi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola dokumentasi foto kegiatan koperasi yang akan tampil sebagai slideshow utama di beranda dashboard anggota.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Gallery List Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <ImageIcon className="w-4.5 h-4.5 text-emerald-600" />
                Daftar Foto Kegiatan ({galeriKoperasi.length})
              </h3>
              {!showForm && (
                <button 
                  id="btn-tambah-galeri"
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kegiatan
                </button>
              )}
            </div>

            {galeriKoperasi.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Belum ada foto kegiatan</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Gunakan tombol tambah untuk mempublikasikan foto kegiatan baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {galeriKoperasi.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    id={`galeri-item-${item.id}`}
                    className="flex flex-col bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-800 overflow-hidden relative group hover:shadow-md transition-shadow"
                  >
                    {/* Image block */}
                    <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden border-b border-slate-200 dark:border-slate-700">
                      <img 
                        src={item.fotoUrl} 
                        alt={item.judul} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {/* Floating Date Badge */}
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        {item.tanggal}
                      </span>

                      {/* ALWAYS VISIBLE Action Buttons in Top Right corner */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-md">
                        <button 
                          id={`btn-edit-galeri-${item.id}`}
                          onClick={() => startEdit(item)}
                          className="p-1 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                          title="Ubah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          id={`btn-delete-galeri-${item.id}`}
                          onClick={() => {
                            if (window.confirm(`Hapus foto kegiatan "${item.judul}" dari galeri?`)) onDeleteGaleri(item.id);
                          }}
                          className="p-1 text-slate-600 hover:text-rose-650 dark:text-slate-400 dark:hover:text-rose-400 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta Text block */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-850 dark:text-slate-100 text-xs line-clamp-1" title={item.judul}>
                          {item.judul}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.deskripsi || "Tanpa deskripsi."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Create/Edit Sidebar Panel */}
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {editingGaleri ? "Ubah Detail Foto" : "Tambah Foto Baru"}
                </h3>
                <button 
                  onClick={resetForm}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Judul Kegiatan *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Rapat Anggota Tahunan Koperasi"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tanggal Kegiatan *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Deskripsi Kegiatan</label>
                  <textarea 
                    rows={3}
                    placeholder="Deskripsi singkat atau rangkuman acara kegiatan..."
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                  />
                </div>

                {/* Image input selector & dropzone */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">DOKUMENTASI FOTO *</span>
                  <label 
                    htmlFor="galeri-foto-upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDragOver 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                      {fotoUrl ? (
                        <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mb-1">
                          <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      )}
                      <p className="text-[10px] text-slate-600 dark:text-slate-300">
                        Tarik & Lepas foto, atau <span className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">pilih berkas manual</span>
                      </p>
                      <input 
                        id="galeri-foto-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                      />
                    </div>
                  </label>

                  {/* Alternative Image URL Input */}
                  <div className="pt-2">
                    <p className="text-[9px] text-slate-400 mb-1">Atau gunakan URL Gambar Unsplash/Web:</p>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        placeholder="https://images.unsplash.com/..." 
                        className="flex-1 px-3 py-1.5 border rounded-lg text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                        value={fotoUrl}
                        onChange={(e) => setFotoUrl(e.target.value)}
                      />
                      {fotoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setFotoUrl('')}
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
                    {editingGaleri ? "Simpan Perubahan" : "Simpan Foto"}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
