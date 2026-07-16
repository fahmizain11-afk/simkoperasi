export interface Member {
  id: string;
  noAnggota: string;
  nama: string;
  alamat: string;
  noHp: string;
  tanggalBergabung: string;
  jenisKelamin?: 'Laki-laki' | 'Perempuan';
  isVerified?: boolean; // true = active member, false/undefined = pending verification
  tempatLahir?: string;
  tanggalLahir?: string;
  pekerjaan?: 'Kepala Sekolah' | 'Guru' | 'Staff' | string;
  fotoUrl?: string;
}

export interface KoperasiSetup {
  namaKoperasi: string;
  slogan: string;
  alamatKantor: string;
  noBadanHukum?: string; // Custom legal status number
  logoUrl: string; // Base64 or icon name
  kartuBgUrl?: string; // Custom Member Card Background (Base64 or URL)
  jenisBungaPinjaman: 'flat' | 'menurun';
  biayaProvisiPersen: number;
  jasaSimpananSukarelaPersen: number;
  warnaUtama?: 'emerald' | 'blue' | 'indigo' | 'violet' | 'teal' | 'rose' | 'amber';

  // Custom text content for Landing/Home page
  kataPembuka?: string;
  visi?: string;
  misi?: string[];

  // Setup Awal Neraca (Initial Balance Sheet)
  kasAwal?: number;
  piutangAwal?: number;
  persediaanWarungAwal?: number;
  inventarisAwal?: number;
  simpananPokokAwal?: number;
  simpananWajibAwal?: number;
  simpananSukarelaAwal?: number;
  modalAwal?: number;
  danaCadanganAwal?: number;
}

export interface Simpanan {
  id: string;
  anggotaId: string;
  tanggal: string;
  jenis: 'Pokok' | 'Wajib' | 'Sukarela';
  jumlah: number;
  keterangan: string;
  transaksiId?: string; // Groups multiple savings in a single receipt
}

export interface Pinjaman {
  id: string;
  anggotaId: string;
  tanggal: string;
  nominalPinjaman: number;
  tenor: number; // in months
  bungaFlatPersen: number; // e.g., 1.5%
  biayaProvisiPersen: number; // e.g., 1%
  provisiDipotong: number; // provisi deducted (nominal * 1%)
  jumlahDiterima: number; // nominal - provisi
  status: 'Belum Lunas' | 'Lunas';
  angsuranPokokPerBulan: number;
  jasaPerBulan: number;
  totalAngsuranPerBulan: number;
  totalWajibBayar: number;
}

export interface Angsuran {
  id: string;
  pinjamanId: string;
  anggotaId: string;
  tanggal: string;
  jumlahBayar: number;
  bulanKe: number;
  keterangan: string;
}

export interface PendapatanLain {
  id: string;
  tanggal: string;
  sumber: 'warung' | 'bunga_simpanan' | 'denda' | 'lain_lain';
  nominal: number;
  keterangan: string;
}

export interface BebanKoperasi {
  id: string;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
}

export interface ManasukaBungaLog {
  id: string;
  anggotaId: string;
  bulanTahun: string; // "MM-YYYY"
  totalSimpanan: number;
  bungaPersen: number; // e.g. 0.5%
  jumlahApresiasi: number;
  statusNotifikasi: 'Belum Kirim' | 'Terkirim';
  tanggalKalkulasi: string;
}

export interface Pembelian {
  id: string;
  tanggal: string;
  namaBarang: string;
  kategori: string;
  kuantitas: number;
  hargaSatuan: number;
  totalHarga: number;
  keterangan: string;
}

export interface PiutangWarung {
  id: string;
  anggotaId: string;
  tanggal: string;
  jenis: 'hutang_baru' | 'pelunasan';
  nominal: number;
  keterangan: string;
}

export interface Pengumuman {
  id: string;
  tanggal: string;
  judul: string;
  konten: string;
  isUrgent: boolean;
  status: 'Aktif' | 'Nonaktif';
}

export interface PengajuanPinjaman {
  id: string;
  anggotaId: string;
  tanggalPengajuan: string;
  nominalPinjaman: number;
  tenor: number; // Max 20 bulan
  bungaFlatPersen: number; // 1.5%
  biayaProvisiPersen: number; // 1%
  provisiDipotong: number;
  jumlahDiterima: number;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  alasanPengajuan?: string;
  catatanPengurus?: string;
}

export interface PembayaranPending {
  id: string;
  anggotaId: string;
  namaAnggota: string;
  tanggal: string;
  jenis: 'Simpanan Wajib' | 'Angsuran' | 'Simpanan Wajib & Angsuran' | 'Simpanan Manasuka' | 'Gabungan' | 'Simpanan Pokok';
  jumlah: number;
  pinjamanId?: string; // If Angsuran or Simpanan Wajib & Angsuran
  bulanKe?: number; // If Angsuran or Simpanan Wajib & Angsuran
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  buktiTransferUrl?: string; // base64 or photo url
  catatanPengurus?: string;
  keterangan?: string;
  jumlahSimpananWajib?: number;
  jumlahAngsuran?: number;
  jumlahSimpananManasuka?: number;
  jumlahSimpananPokok?: number;
}

export interface WarungBarang {
  id: string;
  namaBarang: string;
  harga: number;
  deskripsi: string;
  fotoUrl?: string; // base64 or URL
  stok?: number;
  satuan?: string;
}

export interface PengurusPengawas {
  id: string;
  nama: string;
  jabatan: 'pengurus' | 'pengawas';
  fotoUrl?: string; // base64 or URL
  peranDetail?: string; // e.g. Ketua, Sekretaris, Bendahara, Anggota Pengawas, dll.
}

export interface GaleriKoperasi {
  id: string;
  tanggal: string;
  judul: string;
  deskripsi?: string;
  fotoUrl: string; // base64 or URL
}

export interface RekeningNeraca {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Aktiva' | 'Pasiva';
  saldo: number;
  keterangan?: string;
}



