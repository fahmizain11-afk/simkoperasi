import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman, PengajuanPinjaman, WarungBarang, PengurusPengawas, GaleriKoperasi, RekeningNeraca, PembayaranPending } from './types';

export const initialSetup: KoperasiSetup = {
  namaKoperasi: "Koperasi Dana Segar",
  slogan: "Solusi Keuangan Amanah & Sahabat Tumbuh Bersama",
  alamatKantor: "Jl. Raya Hijau No. 12, Kebayoran Baru, Jakarta Selatan",
  noBadanHukum: "AHU-00123.AH.01.2026",
  logoUrl: "🌱",
  kartuBgUrl: "",
  jenisBungaPinjaman: "flat",
  biayaProvisiPersen: 1.0,
  jasaSimpananSukarelaPersen: 0.5,
  warnaUtama: "emerald",

  // Default Neraca Awal Koperasi
  kasAwal: 0,
  piutangAwal: 0,
  persediaanWarungAwal: 0,
  inventarisAwal: 0,
  simpananPokokAwal: 0,
  simpananWajibAwal: 0,
  simpananSukarelaAwal: 0,
  modalAwal: 0,
  danaCadanganAwal: 0,

  // Default custom text values
  kataPembuka: "Selamat datang di website resmi Koperasi Dana Segar. Kami memadukan prinsip luhur kekeluargaan dengan teknologi digital terintegrasi untuk mendukung kesejahteraan seluruh anggota dan kemandirian usaha komunitas.",
  visi: "Menjadi lembaga keuangan mikro koperasi terpercaya, mandiri, unggul dalam pelayanan, dan berorientasi penuh pada pemberdayaan potensi ekonomi seluruh anggota koperasi.",
  misi: [
    "Memberikan pelayanan prima di bidang tabungan berkeadilan serta kredit berbunga ringan secara cepat dan transparan.",
    "Menumbuhkan budaya hemat melestarikan tabungan masyarakat guna memperkuat ketahanan modal internal.",
    "Menjunjung tinggi azas mufakat gotong royong, transparansi pelaporan, serta kepatuhan penuh terhadap undang-undang koperasi."
  ]
};

export const initialMembers: Member[] = [];
export const initialSimpanan: Simpanan[] = [];
export const initialPinjaman: Pinjaman[] = [];
export const initialAngsuran: Angsuran[] = [];
export const initialPendapatan: PendapatanLain[] = [];
export const initialBeban: BebanKoperasi[] = [];
export const initialPembelian: Pembelian[] = [];
export const initialPiutangWarung: PiutangWarung[] = [];

export const initialAnnouncements: Pengumuman[] = [
  {
    id: "ann-1",
    tanggal: new Date().toISOString().split('T')[0],
    judul: "Pemberitahuan Pembagian Sisa Hasil Usaha (SHU) Buku Tahun 2025",
    konten: "Yth. Seluruh Anggota Koperasi,\n\nKami informasikan bahwa kalkulasi SHU Tahun Buku 2025 telah rampung. Pembagian SHU kepada masing-masing anggota akan ditransfer langsung ke rekening terdaftar atau dapat diambil tunai di kantor Koperasi mulai tanggal 5 bulan depan.\n\nHarap hubungi admin atau login ke portal anggota masing-masing untuk melihat rincian SHU Anda. Terima kasih.",
    isUrgent: true,
    status: "Aktif"
  },
  {
    id: "ann-2",
    tanggal: new Date().toISOString().split('T')[0],
    judul: "Penyesuaian Jam Operasional Kantor Koperasi Selama Bulan Ramadhan",
    konten: "Selama bulan suci Ramadhan, jam pelayanan operasional kantor koperasi mengalami penyesuaian sebagai berikut:\n\n- Senin s/d Kamis: 08.00 - 14.30 WIB\n- Jumat: 08.00 - 15.00 WIB\n- Sabtu, Minggu & Hari Libur Nasional: Tutup\n\nPelayanan pendaftaran anggota baru, pengajuan pinjaman, dan setoran simpanan sukarela tetap dapat dilayani secara online melalui portal ini 24 jam.\n\nSalam hangat,\nPengurus Koperasi",
    isUrgent: false,
    status: "Aktif"
  }
];

export const initialPengajuanPinjaman: PengajuanPinjaman[] = [];

export const initialPembayaranPending: PembayaranPending[] = [];

export const initialWarungBarang: WarungBarang[] = [
  {
    id: "wb-1",
    namaBarang: "Beras Premium Pandan Wangi 5kg",
    harga: 75000,
    deskripsi: "Beras pulen berkualitas premium, bersih, harum, dan bebas pengawet.",
    fotoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80",
    stok: 50,
    satuan: "Kg"
  },
  {
    id: "wb-2",
    namaBarang: "Minyak Goreng Bimoli 2 Liter",
    harga: 38000,
    deskripsi: "Minyak goreng kelapa sawit murni berkualitas tinggi, cocok untuk menggoreng renyah.",
    fotoUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80",
    stok: 30,
    satuan: "liter"
  },
  {
    id: "wb-3",
    namaBarang: "Gula Pasir Putih Premium 1kg",
    harga: 16500,
    deskripsi: "Gula pasir tebu asli pilihan, bersih, manis alami untuk konsumsi sehari-hari.",
    fotoUrl: "https://images.unsplash.com/photo-1581781898322-8646b9a22f3f?auto=format&fit=crop&w=300&q=80",
    stok: 100,
    satuan: "Kg"
  }
];

export const initialPengurusPengawas: PengurusPengawas[] = [
  {
    id: "pp-1",
    nama: "H. Ahmad Sutejo, S.E.",
    jabatan: "pengurus",
    peranDetail: "Ketua Koperasi",
    fotoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "pp-2",
    nama: "Hj. Ratna Purwanti, M.M.",
    jabatan: "pengurus",
    peranDetail: "Sekretaris Koperasi",
    fotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "pp-3",
    nama: "Drs. Bambang Wijaya",
    jabatan: "pengurus",
    peranDetail: "Bendahara Koperasi",
    fotoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "pp-4",
    nama: "Prof. Dr. Ir. Gunawan Saputra",
    jabatan: "pengawas",
    peranDetail: "Ketua Dewan Pengawas",
    fotoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "pp-5",
    nama: "Siti Rahmawati, S.H., M.H.",
    jabatan: "pengawas",
    peranDetail: "Anggota Dewan Pengawas",
    fotoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "pp-6",
    nama: "Budi Santoso, C.A.",
    jabatan: "pengawas",
    peranDetail: "Pengawas Bidang Keuangan",
    fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
  }
];

export const initialGaleriKoperasi: GaleriKoperasi[] = [
  {
    id: "gk-1",
    tanggal: "2026-05-10",
    judul: "Rapat Anggota Tahunan (RAT) Buku Tahun 2025",
    deskripsi: "Penyampaian laporan pertanggungjawaban pengurus dan pengawas serta pembahasan rencana kerja koperasi.",
    fotoUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "gk-2",
    tanggal: "2026-05-20",
    judul: "Pembagian Sembako Murah Ramadhan",
    deskripsi: "Penyaluran paket sembako bersubsidi kepada para anggota aktif untuk meringankan kebutuhan pokok menjelang hari raya.",
    fotoUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "gk-3",
    tanggal: "2026-06-05",
    judul: "Workshop Digitalisasi UMKM Anggota",
    deskripsi: "Pelatihan strategi pemasaran online dan manajemen keuangan digital bagi anggota yang memiliki usaha mikro.",
    fotoUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "gk-4",
    tanggal: "2026-06-15",
    judul: "Restocking Persediaan Warung Koperasi",
    deskripsi: "Pengadaan komoditas pangan pokok berkualitas secara berkala untuk memenuhi persediaan toko konsumsi anggota.",
    fotoUrl: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "gk-5",
    tanggal: "2026-06-20",
    judul: "Penyaluran Simpan Pinjam Produktif",
    deskripsi: "Proses verifikasi dan pencairan dana usaha bagi anggota untuk mendukung ekspansi usaha kecil mandiri.",
    fotoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "gk-6",
    tanggal: "2026-06-25",
    judul: "Gathering Silaturahmi Anggota",
    deskripsi: "Acara silaturahmi, ramah tamah, dan diskusi santai antar pengurus, pengawas, and seluruh jajaran anggota aktif.",
    fotoUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80"
  }
];

export const initialRekeningNeraca: RekeningNeraca[] = [];



