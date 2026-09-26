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
  bungaPinjamanPersen?: number; // Suku bunga jasa pinjaman per bulan (%)
  biayaProvisiPersen: number;
  jasaSimpananSukarelaPersen: number;
  nominalSimpananPokok?: number; // Nilai Simpanan Pokok (default Rp 50.000)
  nominalSimpananWajib?: number; // Nilai Simpanan Wajib per bulan (default Rp 50.000)
  jamOperasional?: string; // Jam buka operasional kantor kas
  kontakTelepon?: string;
  warnaUtama?: 'emerald' | 'blue' | 'indigo' | 'violet' | 'teal' | 'rose' | 'amber';

  // Custom text content for Landing/Home page
  kataPembuka?: string;
  visi?: string;
  misi?: string[];

  // Setup Awal Neraca (Initial Balance Sheet)
  kasAwal?: number;
  piutangAwal?: number;
  piutangWarungAwal?: number;
  persediaanWarungAwal?: number;
  persediaanBarangDagangAwal?: number;
  seragamAwal?: number;
  inventarisAwal?: number;
  akumulasiPenyusutanAwal?: number;
  atributAwal?: number;
  simpananPokokAwal?: number;
  simpananWajibAwal?: number;
  simpananSukarelaAwal?: number;
  modalAwal?: number;
  danaCadanganAwal?: number;
  shuAwal?: number;
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
  keterangan?: string;
  catatan?: string;
}

export type Anggota = Member;

export interface Angsuran {
  id: string;
  pinjamanId: string;
  anggotaId: string;
  tanggal: string;
  pokokBayar?: number;
  jasaBayar?: number;
  jumlahBayar: number;
  bulanKe: number;
  keterangan: string;
}

export interface PendapatanLain {
  id: string;
  tanggal: string;
  sumber: 'warung' | 'jasa_pinjaman' | 'provisi' | 'bunga_simpanan' | 'denda' | 'lain_lain' | string;
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

export interface LoanAIRecommendation {
  recommendation: 'SETUJUI' | 'SETUJUI_SEBAGIAN' | 'TOLAK';
  skorKelayakan: number; // 0 - 100
  riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
  suggestedNominal: number;
  alasanUtama: string;
  analisisSimpanan: string;
  analisisRiwayatTransaksi: string;
  catatanRekomendasiPengurus: string;
  poinPertimbangan: string[];
}

export interface PengajuanPinjaman {
  id: string;
  anggotaId: string;
  tanggalPengajuan: string;
  nominalPinjaman: number;
  nominalPengajuanAwal?: number; // Nominal asli yang diajukan jika disetujui sebagian
  nominalDisetujui?: number; // Nominal disetujui pengurus
  tenor: number; // Max 20 bulan
  bungaFlatPersen: number; // 1.5%
  biayaProvisiPersen: number; // 1%
  provisiDipotong: number;
  jumlahDiterima: number;
  status: 'Pending' | 'Disetujui' | 'Disetujui Sebagian' | 'Ditolak';
  alasanPengajuan?: string;
  catatanPengurus?: string;
  tanggalDiproses?: string;
  aiRecommendation?: LoanAIRecommendation;
}

export interface PembayaranPending {
  id: string;
  anggotaId: string;
  namaAnggota: string;
  tanggal: string;
  jenis: 'Simpanan Wajib' | 'Angsuran' | 'Simpanan Wajib & Angsuran' | 'Simpanan Pokok & Wajib' | 'Simpanan Pokok' | 'Pelunasan Hutang Warung';
  jumlah: number;
  pinjamanId?: string; // If Angsuran or Simpanan Wajib & Angsuran
  bulanKe?: number; // If Angsuran or Simpanan Wajib & Angsuran
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  buktiTransferUrl?: string; // base64 or photo url
  catatanPengurus?: string;
  keterangan?: string;
  jumlahSimpananPokok?: number;
  jumlahSimpananWajib?: number;
  jumlahAngsuran?: number;
}

export interface WarungBarang {
  id: string;
  namaBarang: string;
  harga: number; // Harga Jual Konsumen
  hargaPokok?: number; // Harga Pokok Pembelian / Modal
  deskripsi: string;
  fotoUrl?: string; // base64 or URL
  stok?: number;
  satuan?: string;
  kodeBarang?: string;
  kategori?: string;
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

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'pengawas' | 'karyawan_warung' | 'member';
  nama: string;
  posisiJabatan?: string; // e.g. "Ketua Koperasi", "Bendahara", "Kasir Warung", "Pengawas", "Anggota"
  anggotaId?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SHUDistribution {
  id: string;
  tanggal: string;
  tahunBuku: string;
  totalSHUBersih: number;
  persenDanaCadangan: number;
  persenAnggota: number;
  persenPengurus: number;
  persenPengawas: number;
  danaCadanganNominal: number;
  shuAnggotaNominal: number;
  shuPengurusNominal: number;
  shuPengawasNominal: number;
  keterangan?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string; // ISO date string
  userId?: string;
  userNama: string;
  role: 'admin' | 'pengawas' | 'karyawan_warung' | 'member' | 'sistem';
  action: string;
  category: 'Autentikasi' | 'Otorisasi' | 'Data Finansial' | 'Manajemen Anggota' | 'Konfigurasi Sistem' | 'Keamanan Akses';
  severity: 'info' | 'warning' | 'danger' | 'success';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BLOCKED';
  metadata?: Record<string, any>;
}

// Module 4: RAPBK (Rencana Anggaran Pendapatan dan Belanja Koperasi)
export interface ItemAnggaranRAPBK {
  id: string;
  tahunBuku: number; // e.g. 2026
  tipe: 'pendapatan' | 'belanja';
  kategori: string; // e.g. "Jasa Pinjaman", "Provisi", "Usaha Warung", "Operasional Kantor", "RAT", "Honor Pengurus", "ATK", "Transportasi", "Penyusutan", "Dana Sosial", dll.
  posAkun: string; // Spesifik nama pos anggaran
  targetTahunan: number; // Nilai Pagu / Target Anggaran (Rp)
  keterangan?: string;
  updatedAt?: string;
}

export interface RAPBKSetting {
  id: string;
  tahunBuku: number;
  status: 'Draft' | 'Disahkan' | 'Revisi';
  tanggalPengesahan?: string;
  disahkanOleh?: string; // e.g. "Rapat Anggota Tahunan (RAT) Tahun 2025"
  catatan?: string;
  targetPertumbuhanSHU?: number; // %
}

// Module 1: WhatsApp Gateway & Notifications
export interface WhatsAppLog {
  id: string;
  timestamp: string; // ISO date string
  nomorHp: string;
  namaPenerima: string;
  anggotaId?: string;
  jenisPesan: 'Tagihan Simpanan Wajib' | 'Tagihan Angsuran Pinjaman' | 'Tagihan Piutang Warung' | 'Tagihan Gabungan' | 'Kuitansi Setoran Simpanan' | 'Kuitansi Angsuran' | 'Kuitansi Pencairan Pinjaman' | 'Kuitansi Pelunasan Warung' | 'Pemberitahuan Pendaftaran' | 'Pengumuman Umum';
  pesanText: string;
  status: 'Terkirim (wa.me)' | 'Tersalin ke Clipboard';
  adminSender?: string;
}

// Module 5: Catatan Khusus Pengurus (Spreadsheet Excel-like)
export interface SpreadsheetCell {
  raw: string; // the entered string or formula (e.g. "=B3-B2" or "1000000" or "Total Kas")
  format?: 'text' | 'currency' | 'percent' | 'number';
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;
  textColor?: string;
}

export interface CatatanPengurusSpreadsheet {
  id: string;
  title: string;
  rows: number;
  cols: number;
  cells: Record<string, SpreadsheetCell>; // key: "A1", "B2", etc.
  updatedAt: string;
  updatedBy?: string;
}
