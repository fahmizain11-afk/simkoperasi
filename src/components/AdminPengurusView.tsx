import React, { useState } from 'react';
import { PengurusPengawas } from '../types';
import { 
  Users, Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Sparkles, Upload, AlertTriangle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/imageCompressor';

interface AdminPengurusViewProps {
  pengurusPengawas: PengurusPengawas[];
  onAddPerson: (item: Omit<PengurusPengawas, 'id'>) => Promise<void>;
  onEditPerson: (item: PengurusPengawas) => Promise<void>;
  onDeletePerson: (id: string) => Promise<void>;
}

export function AdminPengurusView({
  pengurusPengawas,
  onAddPerson,
  onEditPerson,
  onDeletePerson
}: AdminPengurusViewProps) {
  // Person states
  const [editingPerson, setEditingPerson] = useState<PengurusPengawas | null>(null);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personNama, setPersonNama] = useState('');
  const [personJabatan, setPersonJabatan] = useState<'pengurus' | 'pengawas'>('pengurus');
  const [personPeran, setPersonPeran] = useState('');
  const [personFoto, setPersonFoto] = useState('');
  const [isDragOverPerson, setIsDragOverPerson] = useState(false);

  // Success message state for popup
  const [successMessage, setSuccessMessage] = useState('');

  // Custom delete confirmation modal states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');

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
      setPersonFoto(compressed);
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPersonFoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Person
  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personNama || !personPeran) {
      alert("Mohon isi nama dan peran detail personil!");
      return;
    }

    let finalFotoUrl = personFoto;
    if (personFoto.startsWith('data:')) {
      try {
        finalFotoUrl = await compressImage(personFoto, 800, 800, 0.7);
      } catch (err) {
        console.error("Error compressing data URI on submit:", err);
      }
    }

    const itemData = {
      nama: personNama,
      jabatan: personJabatan,
      peranDetail: personPeran,
      fotoUrl: finalFotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"
    };

    if (editingPerson) {
      await onEditPerson({ ...itemData, id: editingPerson.id });
      setSuccessMessage("Perubahan data pengurus berhasil disimpan!");
    } else {
      await onAddPerson(itemData);
      setSuccessMessage(`Berhasil menambahkan jajaran ${personJabatan === 'pengurus' ? 'Pengurus' : 'Pengawas'} baru!`);
    }

    resetPersonForm();
  };

  const resetPersonForm = () => {
    setEditingPerson(null);
    setShowPersonForm(false);
    setPersonNama('');
    setPersonJabatan('pengurus');
    setPersonPeran('');
    setPersonFoto('');
  };

  const startEditPerson = (item: PengurusPengawas) => {
    setEditingPerson(item);
    setPersonNama(item.nama);
    setPersonJabatan(item.jabatan);
    setPersonPeran(item.peranDetail || '');
    setPersonFoto(item.fotoUrl || '');
    setShowPersonForm(true);
  };

  return (
    <div className="space-y-6" id="admin-pengurus-container">
      {/* Title Header area */}
      <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2" id="admin-pengurus-title">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Pengaturan Jajaran Pengurus & Pengawas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola struktur kepengurusan dan dewan pengawas Koperasi Dana Segar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Grid of Board & Supervisors */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Pengawas */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-emerald-600" />
                Daftar Pengawas Koperasi (Maksimal 3)
              </h3>
              {!showPersonForm && pengurusPengawas.filter(p => p.jabatan === 'pengawas').length < 3 && (
                <button 
                  id="btn-tambah-pengawas"
                  onClick={() => { resetPersonForm(); setPersonJabatan('pengawas'); setShowPersonForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Pengawas
                </button>
              )}
            </div>

            {pengurusPengawas.filter(p => p.jabatan === 'pengawas').length === 0 ? (
              <p className="text-center py-6 text-slate-400 italic text-xs">Belum ada Dewan Pengawas yang diinput.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pengurusPengawas.filter(p => p.jabatan === 'pengawas').map((item) => (
                  <div 
                    key={item.id}
                    id={`pengawas-item-${item.id}`}
                    className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center text-center relative group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-250 dark:border-slate-700 mb-3 bg-white">
                      <img 
                        src={item.fotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"} 
                        alt={item.nama} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">{item.nama}</h4>
                    <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">{item.peranDetail}</p>

                    {/* ALWAYS VISIBLE action buttons for high usability */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700 rounded-lg p-1 shadow-xs">
                      <button 
                        id={`btn-edit-pengawas-${item.id}`}
                        onClick={() => startEditPerson(item)}
                        className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                        title="Ubah"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        id={`btn-delete-pengawas-${item.id}`}
                        onClick={() => {
                          setDeleteConfirmId(item.id);
                          setDeleteConfirmName(item.nama);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Pengurus */}
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-emerald-600" />
                Daftar Pengurus Koperasi (Maksimal 3)
              </h3>
              {!showPersonForm && pengurusPengawas.filter(p => p.jabatan === 'pengurus').length < 3 && (
                <button 
                  id="btn-tambah-pengurus"
                  onClick={() => { resetPersonForm(); setPersonJabatan('pengurus'); setShowPersonForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Pengurus
                </button>
              )}
            </div>

            {pengurusPengawas.filter(p => p.jabatan === 'pengurus').length === 0 ? (
              <p className="text-center py-6 text-slate-400 italic text-xs">Belum ada Pengurus yang diinput.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pengurusPengawas.filter(p => p.jabatan === 'pengurus').map((item) => (
                  <div 
                    key={item.id}
                    id={`pengurus-item-${item.id}`}
                    className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center text-center relative group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-250 dark:border-slate-700 mb-3 bg-white">
                      <img 
                        src={item.fotoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"} 
                        alt={item.nama} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">{item.nama}</h4>
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">{item.peranDetail}</p>

                    {/* ALWAYS VISIBLE action buttons for high usability */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700 rounded-lg p-1 shadow-xs">
                      <button 
                        id={`btn-edit-pengurus-${item.id}`}
                        onClick={() => startEditPerson(item)}
                        className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                        title="Ubah"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        id={`btn-delete-pengurus-${item.id}`}
                        onClick={() => {
                          setDeleteConfirmId(item.id);
                          setDeleteConfirmName(item.nama);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Form Create/Edit Person Sidebar */}
        {showPersonForm && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {editingPerson ? "Ubah Detail Personil" : `Tambah ${personJabatan === 'pengurus' ? 'Pengurus' : 'Pengawas'} Baru`}
                </h3>
                <button 
                  onClick={resetPersonForm}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePersonSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nama Personil *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Budi Santoso, S.E."
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                    value={personNama}
                    onChange={(e) => setPersonNama(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Jabatan Koperasi *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPersonJabatan('pengurus')}
                      className={`py-2 px-3 rounded-lg border text-center transition font-bold ${
                        personJabatan === 'pengurus'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Pengurus
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonJabatan('pengawas')}
                      className={`py-2 px-3 rounded-lg border text-center transition font-bold ${
                        personJabatan === 'pengawas'
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-400'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Pengawas
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Detail Peran *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Ketua Koperasi / Sekretaris / Anggota Dewan Pengawas"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans"
                    value={personPeran}
                    onChange={(e) => setPersonPeran(e.target.value)}
                  />
                </div>

                {/* Person profile photo uploader */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">FOTO PROFILE</span>
                  <label 
                    htmlFor="person-foto-upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverPerson(true); }}
                    onDragLeave={() => setIsDragOverPerson(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverPerson(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDragOverPerson 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                      {personFoto ? (
                        <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 mb-1">
                          <img src={personFoto} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      )}
                      <p className="text-[10px] text-slate-600 dark:text-slate-300">
                        Tarik & Lepas foto, atau <span className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">pilih berkas manual</span>
                      </p>
                      <input 
                        id="person-foto-upload"
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
                        value={personFoto}
                        onChange={(e) => setPersonFoto(e.target.value)}
                      />
                      {personFoto && (
                        <button 
                          type="button" 
                          onClick={() => setPersonFoto('')}
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
                    {editingPerson ? "Simpan Perubahan" : "Simpan Anggota"}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetPersonForm}
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

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDeleteConfirmId(null);
                setDeleteConfirmName('');
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 shadow-xl max-w-sm w-full relative z-10 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Konfirmasi Hapus
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-700 dark:text-slate-300">"{deleteConfirmName}"</span> dari jajaran pengurus/pengawas? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteConfirmName('');
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    if (deleteConfirmId) {
                      await onDeletePerson(deleteConfirmId);
                    }
                    setDeleteConfirmId(null);
                    setDeleteConfirmName('');
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification Popup */}
      <AnimatePresence>
        {successMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessMessage('')}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 shadow-xl max-w-sm w-full relative z-10 text-center space-y-4"
              id="success-popup-container"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-6 h-6 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Pemberitahuan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {successMessage}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
