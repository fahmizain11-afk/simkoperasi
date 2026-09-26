import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, KoperasiSetup, Pembelian, PiutangWarung, Pengumuman, PengajuanPinjaman, WarungBarang, PengurusPengawas, GaleriKoperasi, RekeningNeraca, PembayaranPending, UserAccount, SecurityLog, ItemAnggaranRAPBK, RAPBKSetting, WhatsAppLog } from './types';

export const initialSetup: KoperasiSetup = {
  namaKoperasi: "Koperasi Dana Segar",
  slogan: "Solusi Keuangan Amanah & Sahabat Tumbuh Bersama",
  alamatKantor: "Jl. Raya Hijau No. 12, Kebayoran Baru, Jakarta Selatan",
  noBadanHukum: "AHU-00123.AH.01.2026",
  logoUrl: "🌱",
  kartuBgUrl: "",
  jenisBungaPinjaman: "flat",
  bungaPinjamanPersen: 1.5,
  biayaProvisiPersen: 1.0,
  jasaSimpananSukarelaPersen: 0.5,
  nominalSimpananPokok: 50000,
  nominalSimpananWajib: 50000,
  jamOperasional: "Senin - Jumat (08.00 - 16.00 WIB), Sabtu (08.00 - 12.00 WIB)",
  kontakTelepon: "0812-3456-7890",
  warnaUtama: "emerald",

  // Default Neraca Awal Koperasi
  kasAwal: 0,
  piutangAwal: 0,
  piutangWarungAwal: 0,
  persediaanWarungAwal: 0,
  persediaanBarangDagangAwal: 0,
  seragamAwal: 0,
  inventarisAwal: 0,
  akumulasiPenyusutanAwal: 0,
  atributAwal: 0,
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

export const initialMembers: Member[] = [
  {
    id: "mem-001",
    noAnggota: "ANG-001",
    nama: "Drs. H. Ahmad Fauzi, M.Pd",
    alamat: "Jl. Melati No. 14, Kebayoran Baru, Jakarta Selatan",
    noHp: "0812-3456-7801",
    tanggalBergabung: "2025-01-10",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Bandung",
    tanggalLahir: "1975-04-12",
    pekerjaan: "Kepala Sekolah"
  },
  {
    id: "mem-002",
    noAnggota: "ANG-002",
    nama: "Siti Aminah, S.Pd",
    alamat: "Jl. Cempaka Putih No. 25, Jakarta Pusat",
    noHp: "0812-3456-7802",
    tanggalBergabung: "2025-01-12",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Semarang",
    tanggalLahir: "1982-08-21",
    pekerjaan: "Guru"
  },
  {
    id: "mem-003",
    noAnggota: "ANG-003",
    nama: "Budi Santoso, S.Kom",
    alamat: "Jl. Dahlia Raya Blok B3/12, Tebet, Jakarta Selatan",
    noHp: "0812-3456-7803",
    tanggalBergabung: "2025-01-15",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Surabaya",
    tanggalLahir: "1988-11-05",
    pekerjaan: "Staff"
  },
  {
    id: "mem-004",
    noAnggota: "ANG-004",
    nama: "Dewi Kartika, S.Pd",
    alamat: "Jl. Kenanga Timur No. 8, Pasar Minggu, Jakarta Selatan",
    noHp: "0812-3456-7804",
    tanggalBergabung: "2025-01-20",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Yogyakarta",
    tanggalLahir: "1985-03-17",
    pekerjaan: "Guru"
  },
  {
    id: "mem-005",
    noAnggota: "ANG-005",
    nama: "Hendra Gunawan",
    alamat: "Jl. Mawar No. 42, Cilandak, Jakarta Selatan",
    noHp: "0812-3456-7805",
    tanggalBergabung: "2025-02-01",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Cirebon",
    tanggalLahir: "1990-07-29",
    pekerjaan: "Staff"
  },
  {
    id: "mem-006",
    noAnggota: "ANG-006",
    nama: "Rina Marlina, S.Pd",
    alamat: "Jl. Anggrek Bulan No. 17, Pancoran, Jakarta Selatan",
    noHp: "0812-3456-7806",
    tanggalBergabung: "2025-02-05",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Bogor",
    tanggalLahir: "1986-09-14",
    pekerjaan: "Guru"
  },
  {
    id: "mem-007",
    noAnggota: "ANG-007",
    nama: "Agus Prasetyo",
    alamat: "Jl. Teratai Indah No. 5, Jagakarsa, Jakarta Selatan",
    noHp: "0812-3456-7807",
    tanggalBergabung: "2025-02-10",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Solo",
    tanggalLahir: "1992-01-23",
    pekerjaan: "Staff"
  },
  {
    id: "mem-008",
    noAnggota: "ANG-008",
    nama: "Nurul Hidayati, S.Pd",
    alamat: "Jl. Flamboyan Barat No. 33, Mampang Prapatan, Jakarta Selatan",
    noHp: "0812-3456-7808",
    tanggalBergabung: "2025-02-15",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Malang",
    tanggalLahir: "1989-12-03",
    pekerjaan: "Guru"
  },
  {
    id: "mem-009",
    noAnggota: "ANG-009",
    nama: "Bambang Hermanto",
    alamat: "Jl. Kamboja No. 19, Kebayoran Lama, Jakarta Selatan",
    noHp: "0812-3456-7809",
    tanggalBergabung: "2025-03-01",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Purwokerto",
    tanggalLahir: "1983-05-18",
    pekerjaan: "Staff"
  },
  {
    id: "mem-010",
    noAnggota: "ANG-010",
    nama: "Eka Wulandari, S.Pd",
    alamat: "Jl. Tanjung Duren Barat No. 11, Grogol, Jakarta Barat",
    noHp: "0812-3456-7810",
    tanggalBergabung: "2025-03-05",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Magelang",
    tanggalLahir: "1987-10-10",
    pekerjaan: "Guru"
  },
  {
    id: "mem-011",
    noAnggota: "ANG-011",
    nama: "Muhammad Rizky, S.Pd",
    alamat: "Jl. Palmerah Utara No. 27, Palmerah, Jakarta Barat",
    noHp: "0812-3456-7811",
    tanggalBergabung: "2025-03-10",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Jakarta",
    tanggalLahir: "1991-06-25",
    pekerjaan: "Guru"
  },
  {
    id: "mem-012",
    noAnggota: "ANG-012",
    nama: "Tri Wahyuni",
    alamat: "Jl. Kemang Timur No. 4, Bangka, Jakarta Selatan",
    noHp: "0812-3456-7812",
    tanggalBergabung: "2025-03-15",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Kebumen",
    tanggalLahir: "1993-02-14",
    pekerjaan: "Staff"
  },
  {
    id: "mem-013",
    noAnggota: "ANG-013",
    nama: "Dwi Cahyono, S.Pd",
    alamat: "Jl. Radio Dalam Raya No. 9, Gandaria, Jakarta Selatan",
    noHp: "0812-3456-7813",
    tanggalBergabung: "2025-04-01",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Klaten",
    tanggalLahir: "1984-07-08",
    pekerjaan: "Guru"
  },
  {
    id: "mem-014",
    noAnggota: "ANG-014",
    nama: "Sri Rahayu",
    alamat: "Jl. Fatmawati Raya No. 50, Cilandak, Jakarta Selatan",
    noHp: "0812-3456-7814",
    tanggalBergabung: "2025-04-05",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Cilacap",
    tanggalLahir: "1988-04-30",
    pekerjaan: "Staff"
  },
  {
    id: "mem-015",
    noAnggota: "ANG-015",
    nama: "Anang Suhendra, S.Pd",
    alamat: "Jl. Panglima Polim IX No. 16, Melawai, Jakarta Selatan",
    noHp: "0812-3456-7815",
    tanggalBergabung: "2025-04-10",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Sukabumi",
    tanggalLahir: "1986-11-22",
    pekerjaan: "Guru"
  },
  {
    id: "mem-016",
    noAnggota: "ANG-016",
    nama: "Fitriani Lestari, S.Pd",
    alamat: "Jl. Senopati Dalam No. 3, Senayan, Jakarta Selatan",
    noHp: "0812-3456-7816",
    tanggalBergabung: "2025-05-01",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Tasikmalaya",
    tanggalLahir: "1990-09-09",
    pekerjaan: "Guru"
  },
  {
    id: "mem-017",
    noAnggota: "ANG-017",
    nama: "Yayan Mulyana",
    alamat: "Jl. Antasari No. 21, Cipete, Jakarta Selatan",
    noHp: "0812-3456-7817",
    tanggalBergabung: "2025-05-10",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Garut",
    tanggalLahir: "1994-03-15",
    pekerjaan: "Staff"
  },
  {
    id: "mem-018",
    noAnggota: "ANG-018",
    nama: "Ratna Juwita, S.Pd",
    alamat: "Jl. Ampera Raya No. 18, Ragunan, Jakarta Selatan",
    noHp: "0812-3456-7818",
    tanggalBergabung: "2025-06-01",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Padang",
    tanggalLahir: "1987-01-28",
    pekerjaan: "Guru"
  },
  {
    id: "mem-019",
    noAnggota: "ANG-019",
    nama: "Dian Permana",
    alamat: "Jl. TB Simatupang No. 30, Pasar Minggu, Jakarta Selatan",
    noHp: "0812-3456-7819",
    tanggalBergabung: "2025-06-15",
    jenisKelamin: "Laki-laki",
    isVerified: true,
    tempatLahir: "Palembang",
    tanggalLahir: "1991-08-16",
    pekerjaan: "Staff"
  },
  {
    id: "mem-020",
    noAnggota: "ANG-020",
    nama: "Maya Anggraini, S.Pd",
    alamat: "Jl. Warung Buncit Raya No. 44, Pancoran, Jakarta Selatan",
    noHp: "0812-3456-7820",
    tanggalBergabung: "2025-07-01",
    jenisKelamin: "Perempuan",
    isVerified: true,
    tempatLahir: "Medan",
    tanggalLahir: "1989-05-02",
    pekerjaan: "Guru"
  }
];

export const initialSimpanan: Simpanan[] = [
  // Simpanan Pokok awal untuk 20 anggota (Rp 50.000 per anggota)
  { id: "sp-001", anggotaId: "mem-001", tanggal: "2025-01-10", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-002", anggotaId: "mem-002", tanggal: "2025-01-12", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-003", anggotaId: "mem-003", tanggal: "2025-01-15", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-004", anggotaId: "mem-004", tanggal: "2025-01-20", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-005", anggotaId: "mem-005", tanggal: "2025-02-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-006", anggotaId: "mem-006", tanggal: "2025-02-05", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-007", anggotaId: "mem-007", tanggal: "2025-02-10", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-008", anggotaId: "mem-008", tanggal: "2025-02-15", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-009", anggotaId: "mem-009", tanggal: "2025-03-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-010", anggotaId: "mem-010", tanggal: "2025-03-05", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-011", anggotaId: "mem-011", tanggal: "2025-03-10", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-012", anggotaId: "mem-012", tanggal: "2025-03-15", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-013", anggotaId: "mem-013", tanggal: "2025-04-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-014", anggotaId: "mem-014", tanggal: "2025-04-05", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-015", anggotaId: "mem-015", tanggal: "2025-04-10", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-016", anggotaId: "mem-016", tanggal: "2025-05-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-017", anggotaId: "mem-017", tanggal: "2025-05-10", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-018", anggotaId: "mem-018", tanggal: "2025-06-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-019", anggotaId: "mem-019", tanggal: "2025-06-15", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },
  { id: "sp-020", anggotaId: "mem-020", tanggal: "2025-07-01", jenis: "Pokok", jumlah: 50000, keterangan: "Setoran Simpanan Pokok awal keanggotaan" },

  // Simpanan Wajib Rutin Bulanan
  { id: "sw-001", anggotaId: "mem-001", tanggal: "2025-01-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Januari 2025" },
  { id: "sw-002", anggotaId: "mem-001", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-003", anggotaId: "mem-001", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-004", anggotaId: "mem-002", tanggal: "2025-01-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Januari 2025" },
  { id: "sw-005", anggotaId: "mem-002", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-006", anggotaId: "mem-002", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-007", anggotaId: "mem-003", tanggal: "2025-01-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Januari 2025" },
  { id: "sw-008", anggotaId: "mem-003", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-009", anggotaId: "mem-003", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-010", anggotaId: "mem-004", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-011", anggotaId: "mem-004", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-012", anggotaId: "mem-005", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-013", anggotaId: "mem-005", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-014", anggotaId: "mem-006", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-015", anggotaId: "mem-006", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-016", anggotaId: "mem-007", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-017", anggotaId: "mem-007", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-018", anggotaId: "mem-008", tanggal: "2025-02-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Februari 2025" },
  { id: "sw-019", anggotaId: "mem-008", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-020", anggotaId: "mem-009", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-021", anggotaId: "mem-010", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-022", anggotaId: "mem-011", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },
  { id: "sw-023", anggotaId: "mem-012", tanggal: "2025-03-25", jenis: "Wajib", jumlah: 50000, keterangan: "Simpanan Wajib Maret 2025" },

  // Simpanan Sukarela
  { id: "ss-001", anggotaId: "mem-001", tanggal: "2025-01-20", jenis: "Sukarela", jumlah: 1500000, keterangan: "Setoran tabungan sukarela" },
  { id: "ss-002", anggotaId: "mem-002", tanggal: "2025-02-10", jenis: "Sukarela", jumlah: 500000, keterangan: "Setoran tabungan sukarela" },
  { id: "ss-003", anggotaId: "mem-004", tanggal: "2025-02-18", jenis: "Sukarela", jumlah: 750000, keterangan: "Setoran tabungan sukarela" },
  { id: "ss-004", anggotaId: "mem-006", tanggal: "2025-03-02", jenis: "Sukarela", jumlah: 1000000, keterangan: "Setoran tabungan sukarela" }
];

export const initialPinjaman: Pinjaman[] = [
  {
    id: "pinj-001",
    anggotaId: "mem-002",
    tanggal: "2025-01-20",
    nominalPinjaman: 5000000,
    tenor: 10,
    bungaFlatPersen: 1.5,
    biayaProvisiPersen: 1.0,
    provisiDipotong: 50000,
    jumlahDiterima: 4950000,
    status: "Belum Lunas",
    angsuranPokokPerBulan: 500000,
    jasaPerBulan: 75000,
    totalAngsuranPerBulan: 575000,
    totalWajibBayar: 5750000,
    keterangan: "Pinjaman keperluan pendidikan keluarga"
  },
  {
    id: "pinj-002",
    anggotaId: "mem-003",
    tanggal: "2025-02-05",
    nominalPinjaman: 3000000,
    tenor: 6,
    bungaFlatPersen: 1.5,
    biayaProvisiPersen: 1.0,
    provisiDipotong: 30000,
    jumlahDiterima: 2970000,
    status: "Belum Lunas",
    angsuranPokokPerBulan: 500000,
    jasaPerBulan: 45000,
    totalAngsuranPerBulan: 545000,
    totalWajibBayar: 3270000,
    keterangan: "Pinjaman modal usaha sampingan"
  },
  {
    id: "pinj-003",
    anggotaId: "mem-006",
    tanggal: "2025-02-15",
    nominalPinjaman: 6000000,
    tenor: 12,
    bungaFlatPersen: 1.5,
    biayaProvisiPersen: 1.0,
    provisiDipotong: 60000,
    jumlahDiterima: 5940000,
    status: "Belum Lunas",
    angsuranPokokPerBulan: 500000,
    jasaPerBulan: 90000,
    totalAngsuranPerBulan: 590000,
    totalWajibBayar: 7080000,
    keterangan: "Pinjaman renovasi rumah"
  }
];

export const initialAngsuran: Angsuran[] = [
  // Angsuran pinjaman mem-002 (Bulan 1, 2)
  {
    id: "ang-001",
    pinjamanId: "pinj-001",
    anggotaId: "mem-002",
    tanggal: "2025-02-20",
    pokokBayar: 500000,
    jasaBayar: 75000,
    jumlahBayar: 575000,
    bulanKe: 1,
    keterangan: "Angsuran ke-1 Pinjaman Pendidikan (Pokok Rp500rb + Jasa Rp75rb)"
  },
  {
    id: "ang-002",
    pinjamanId: "pinj-001",
    anggotaId: "mem-002",
    tanggal: "2025-03-20",
    pokokBayar: 500000,
    jasaBayar: 75000,
    jumlahBayar: 575000,
    bulanKe: 2,
    keterangan: "Angsuran ke-2 Pinjaman Pendidikan (Pokok Rp500rb + Jasa Rp75rb)"
  },
  // Angsuran pinjaman mem-003 (Bulan 1)
  {
    id: "ang-003",
    pinjamanId: "pinj-002",
    anggotaId: "mem-003",
    tanggal: "2025-03-05",
    pokokBayar: 500000,
    jasaBayar: 45000,
    jumlahBayar: 545000,
    bulanKe: 1,
    keterangan: "Angsuran ke-1 Pinjaman Modal Usaha (Pokok Rp500rb + Jasa Rp45rb)"
  }
];

export const initialPendapatan: PendapatanLain[] = [
  {
    id: "inc-001",
    tanggal: "2025-01-20",
    sumber: "provisi",
    nominal: 50000,
    keterangan: "Biaya provisi & administrasi pencairan pinjaman Siti Aminah (pinj-001)"
  },
  {
    id: "inc-002",
    tanggal: "2025-01-31",
    sumber: "warung",
    nominal: 1850000,
    keterangan: "Hasil laba kotor penjualan toko/warung sembako koperasi Januari 2025"
  },
  {
    id: "inc-003",
    tanggal: "2025-01-31",
    sumber: "bunga_simpanan",
    nominal: 65000,
    keterangan: "Bagi hasil / bunga rekening bank operasional koperasi Januari 2025"
  },
  {
    id: "inc-004",
    tanggal: "2025-02-05",
    sumber: "provisi",
    nominal: 30000,
    keterangan: "Biaya provisi pinjaman Budi Santoso (pinj-002)"
  },
  {
    id: "inc-005",
    tanggal: "2025-02-15",
    sumber: "provisi",
    nominal: 60000,
    keterangan: "Biaya provisi pinjaman Rina Marlina (pinj-003)"
  },
  {
    id: "inc-006",
    tanggal: "2025-02-28",
    sumber: "warung",
    nominal: 2450000,
    keterangan: "Hasil laba kotor penjualan toko/warung sembako koperasi Februari 2025"
  },
  {
    id: "inc-007",
    tanggal: "2025-02-28",
    sumber: "bunga_simpanan",
    nominal: 72000,
    keterangan: "Bagi hasil / bunga rekening bank operasional koperasi Februari 2025"
  },
  {
    id: "inc-008",
    tanggal: "2025-03-15",
    sumber: "lain_lain",
    nominal: 500000,
    keterangan: "Pendapatan sewa kantin & stand fotokopi bulan Maret 2025"
  },
  {
    id: "inc-009",
    tanggal: "2025-03-25",
    sumber: "denda",
    nominal: 25000,
    keterangan: "Denda administrasi keterlambatan angsuran anggota"
  },
  {
    id: "inc-010",
    tanggal: "2025-03-31",
    sumber: "warung",
    nominal: 2150000,
    keterangan: "Hasil laba penjualan toko/warung sembako koperasi Maret 2025"
  }
];

export const initialBeban: BebanKoperasi[] = [
  {
    id: "exp-001",
    tanggal: "2025-01-28",
    kategori: "listrik_air",
    nominal: 350000,
    keterangan: "Pembayaran tagihan listrik PLN dan air PDAM kantor koperasi Januari 2025"
  },
  {
    id: "exp-002",
    tanggal: "2025-01-29",
    kategori: "atk",
    nominal: 240000,
    keterangan: "Pembelian ATK, kertas HVS 70gr 2 rim, dan tinta printer kantor"
  },
  {
    id: "exp-003",
    tanggal: "2025-01-31",
    kategori: "gaji_karyawan",
    nominal: 1500000,
    keterangan: "Honorarium pengelola operasional dan staf kasir koperasi Januari 2025"
  },
  {
    id: "exp-004",
    tanggal: "2025-02-10",
    kategori: "rapat",
    nominal: 350000,
    keterangan: "Konsumsi rapat koordinasi awal tahun pengurus dan badan pengawas"
  },
  {
    id: "exp-005",
    tanggal: "2025-02-26",
    kategori: "listrik_air",
    nominal: 375000,
    keterangan: "Pembayaran tagihan listrik PLN & internet Wi-Fi kantor Februari 2025"
  },
  {
    id: "exp-006",
    tanggal: "2025-02-28",
    kategori: "gaji_karyawan",
    nominal: 1500000,
    keterangan: "Honorarium pengelola operasional dan staf kasir koperasi Februari 2025"
  },
  {
    id: "exp-007",
    tanggal: "2025-03-08",
    kategori: "pemeliharaan",
    nominal: 180000,
    keterangan: "Service rutin AC ruang pelayanan dan penggantian lampu kantor"
  },
  {
    id: "exp-008",
    tanggal: "2025-03-18",
    kategori: "transportasi",
    nominal: 150000,
    keterangan: "Beban transportasi dinas pengurus menghadiri musyawarah Dekopinda"
  },
  {
    id: "exp-009",
    tanggal: "2025-03-27",
    kategori: "listrik_air",
    nominal: 390000,
    keterangan: "Pembayaran tagihan listrik PLN & internet kantor Maret 2025"
  },
  {
    id: "exp-010",
    tanggal: "2025-03-31",
    kategori: "gaji_karyawan",
    nominal: 1500000,
    keterangan: "Honorarium pengelola operasional koperasi Maret 2025"
  }
];

export const initialPembelian: Pembelian[] = [
  {
    id: "pem-001",
    tanggal: "2025-01-15",
    namaBarang: "Kalkulator Meja Casio 14 Digit & Kotak Uang Kasir",
    kategori: "Inventaris Kantor",
    kuantitas: 2,
    hargaSatuan: 175000,
    totalHarga: 350000,
    keterangan: "Pengadaan kelengkapan meja kasir kas masuk & kas keluar"
  },
  {
    id: "pem-002",
    tanggal: "2025-02-12",
    namaBarang: "Printer Struk Thermal Kasir 80mm",
    kategori: "Inventaris Elektronik",
    kuantitas: 1,
    hargaSatuan: 650000,
    totalHarga: 650000,
    keterangan: "Pengadaan printer cetak struk mutasi kas dan bukti transaksi"
  }
];

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
    hargaPokok: 67000,
    harga: 75000,
    deskripsi: "Beras pulen berkualitas premium, bersih, harum, dan bebas pengawet.",
    fotoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80",
    stok: 50,
    satuan: "Kg",
    kodeBarang: "8991001",
    kategori: "Sembako"
  },
  {
    id: "wb-2",
    namaBarang: "Minyak Goreng Bimoli 2 Liter",
    hargaPokok: 33000,
    harga: 38000,
    deskripsi: "Minyak goreng kelapa sawit murni berkualitas tinggi, cocok untuk menggoreng renyah.",
    fotoUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80",
    stok: 30,
    satuan: "liter",
    kodeBarang: "8991002",
    kategori: "Sembako"
  },
  {
    id: "wb-3",
    namaBarang: "Gula Pasir Putih Premium 1kg",
    hargaPokok: 14500,
    harga: 16500,
    deskripsi: "Gula pasir tebu asli pilihan, bersih, manis alami untuk konsumsi sehari-hari.",
    fotoUrl: "https://images.unsplash.com/photo-1581781898322-8646b9a22f3f?auto=format&fit=crop&w=300&q=80",
    stok: 100,
    satuan: "Kg",
    kodeBarang: "8991003",
    kategori: "Sembako"
  },
  {
    id: "wb-4",
    namaBarang: "Telur Ayam Negeri 1kg",
    hargaPokok: 24500,
    harga: 28000,
    deskripsi: "Telur ayam segar pilihan langsung dari peternakan, kaya nutrisi dan protein.",
    fotoUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=300&q=80",
    stok: 45,
    satuan: "Kg",
    kodeBarang: "8991004",
    kategori: "Sembako"
  },
  {
    id: "wb-5",
    namaBarang: "Kopi Kapal Api Spesial Mix (Renceng)",
    hargaPokok: 12500,
    harga: 15000,
    deskripsi: "Kopi bubuk instan dengan gula murni, mantap rasa dan aromanya.",
    fotoUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    stok: 25,
    satuan: "bungkus",
    kodeBarang: "8991005",
    kategori: "Minuman"
  },
  {
    id: "wb-6",
    namaBarang: "Mie Instan Indomie Goreng (Dus/40pcs)",
    hargaPokok: 106000,
    harga: 118000,
    deskripsi: "Mie instan goreng lezat dan praktis kesukaan keluarga Indonesia.",
    fotoUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=300&q=80",
    stok: 20,
    satuan: "dus",
    kodeBarang: "8991006",
    kategori: "Makanan"
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

export const initialUserAccounts: UserAccount[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    password: 'd4n45egar',
    role: 'admin',
    nama: 'Pengurus Utama / Admin',
    posisiJabatan: 'Ketua & System Admin',
    isActive: true,
    createdAt: new Date().toISOString().substring(0, 10)
  },
  {
    id: 'usr-pengawas-1',
    username: 'pengawas',
    password: 'pengawas123',
    role: 'pengawas',
    nama: 'Drs. H. Ahmad Dahlan, M.M.',
    posisiJabatan: 'Ketua Pengawas Koperasi',
    isActive: true,
    createdAt: new Date().toISOString().substring(0, 10)
  },
  {
    id: 'usr-kasir-1',
    username: 'kasir',
    password: 'kasir123',
    role: 'karyawan_warung',
    nama: 'Karyawan Warung / Kasir',
    posisiJabatan: 'Kasir Unit Usaha Warung',
    isActive: true,
    createdAt: new Date().toISOString().substring(0, 10)
  }
];

export const initialSecurityLogs: SecurityLog[] = [
  {
    id: 'sec-log-mem-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 minutes ago
    userId: 'mem-101',
    userNama: 'Budi Santoso',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Budi Santoso (No. Anggota: AG-001) berhasil masuk ke Portal Layanan Mandiri Koperasi melalui perangkat seluler.',
    ipAddress: '182.253.140.22',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) Chrome/124.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-001',
      deviceType: 'Android Smartphone',
      browser: 'Chrome Mobile 124',
      loginMethod: 'Nomor Anggota & Kata Sandi'
    }
  },
  {
    id: 'sec-log-mem-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 minutes ago
    userId: 'mem-101',
    userNama: 'Budi Santoso',
    role: 'member',
    action: 'KONFIRMASI_PEMBAYARAN_MANDIRI',
    category: 'Data Finansial',
    severity: 'info',
    description: 'Anggota Budi Santoso mengunggah bukti konfirmasi transfer pembayaran angsuran pinjaman ke-3 sebesar Rp 1.500.000 via Bank BRI.',
    ipAddress: '182.253.140.22',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) Chrome/124.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-001',
      jenisPembayaran: 'Angsuran Pinjaman',
      nominal: 1500000,
      bankTujuan: 'Bank BRI'
    }
  },
  {
    id: 'sec-log-mem-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(), // 48 minutes ago
    userId: 'mem-102',
    userNama: 'Siti Aminah',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Siti Aminah (No. Anggota: AG-002) berhasil login ke akun portal anggota.',
    ipAddress: '114.122.38.105',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/605.1.15',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-002',
      deviceType: 'iPhone / iOS',
      browser: 'Mobile Safari',
      loginMethod: 'Username & Kata Sandi'
    }
  },
  {
    id: 'sec-log-mem-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(), // ~1 hour ago
    userId: 'mem-102',
    userNama: 'Siti Aminah',
    role: 'member',
    action: 'PENGAJUAN_PINJAMAN_ONLINE',
    category: 'Data Finansial',
    severity: 'info',
    description: 'Anggota Siti Aminah mengajukan permohonan pinjaman modal usaha baru sebesar Rp 5.000.000 dengan jangka waktu 12 bulan.',
    ipAddress: '114.122.38.105',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/605.1.15',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-002',
      nominalPinjaman: 5000000,
      tenorBulan: 12,
      keperluan: 'Pengembangan Usaha Mikro Sembako'
    }
  },
  {
    id: 'sec-log-mem-5',
    timestamp: new Date(Date.now() - 1000 * 3600 * 3).toISOString(), // 3 hours ago
    userId: 'mem-103',
    userNama: 'Ahmad Fauzi',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Ahmad Fauzi (No. Anggota: AG-003) login melalui desktop browser Windows di kantor.',
    ipAddress: '36.85.12.94',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-003',
      deviceType: 'Desktop PC (Windows)',
      browser: 'Google Chrome'
    }
  },
  {
    id: 'sec-log-mem-6',
    timestamp: new Date(Date.now() - 1000 * 3600 * 3.2).toISOString(), // 3.2 hours ago
    userId: 'mem-103',
    userNama: 'Ahmad Fauzi',
    role: 'member',
    action: 'UNDUH_KUITANSI_TRANSAKSI',
    category: 'Data Finansial',
    severity: 'info',
    description: 'Anggota Ahmad Fauzi mengunduh e-kuitansi setoran simpanan sukarela dan riwayat buku tabungan digital.',
    ipAddress: '36.85.12.94',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-003',
      fileType: 'PDF E-Kuitansi',
      modul: 'Simpanan Sukarela'
    }
  },
  {
    id: 'sec-log-mem-7',
    timestamp: new Date(Date.now() - 1000 * 3600 * 5.5).toISOString(), // 5.5 hours ago
    userId: 'mem-104',
    userNama: 'Sri Wahyuni',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Sri Wahyuni (No. Anggota: AG-004) berhasil login ke portal anggota.',
    ipAddress: '180.252.88.40',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.3 Safari/605.1.15',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-004',
      deviceType: 'MacBook / MacOS',
      browser: 'Safari Desktop'
    }
  },
  {
    id: 'sec-log-mem-8',
    timestamp: new Date(Date.now() - 1000 * 3600 * 5.7).toISOString(), // 5.7 hours ago
    userId: 'mem-104',
    userNama: 'Sri Wahyuni',
    role: 'member',
    action: 'UPDATE_PROFIL_ANGGOTA',
    category: 'Manajemen Anggota',
    severity: 'info',
    description: 'Anggota Sri Wahyuni memperbarui nomor telepon WhatsApp dan informasi alamat tempat tinggal.',
    ipAddress: '180.252.88.40',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.3 Safari/605.1.15',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-004',
      fieldUpdated: 'No. WhatsApp & Alamat Domisili'
    }
  },
  {
    id: 'sec-log-mem-9',
    timestamp: new Date(Date.now() - 1000 * 3600 * 9).toISOString(), // 9 hours ago
    userId: 'mem-105',
    userNama: 'Hendra Gunawan',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Hendra Gunawan (No. Anggota: AG-005) berhasil login ke Portal Layanan Anggota.',
    ipAddress: '110.137.60.18',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) Chrome/123.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-005',
      deviceType: 'Xiaomi Android',
      browser: 'Chrome Mobile'
    }
  },
  {
    id: 'sec-log-mem-10',
    timestamp: new Date(Date.now() - 1000 * 3600 * 9.3).toISOString(), // 9.3 hours ago
    userId: 'mem-105',
    userNama: 'Hendra Gunawan',
    role: 'member',
    action: 'CEK_MUTASI_SIMPANAN',
    category: 'Data Finansial',
    severity: 'info',
    description: 'Anggota Hendra Gunawan memeriksa saldo tabungan simpanan pokok, wajib, sukarela, dan histori dividen SHU.',
    ipAddress: '110.137.60.18',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) Chrome/123.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-005',
      fitur: 'Kartu Tabungan & Riwayat Dividen SHU'
    }
  },
  {
    id: 'sec-log-mem-11',
    timestamp: new Date(Date.now() - 1000 * 3600 * 22).toISOString(), // yesterday
    userId: 'mem-106',
    userNama: 'Dewi Lestari',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Dewi Lestari (No. Anggota: AG-006) berhasil login ke portal anggota.',
    ipAddress: '182.253.111.45',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) Safari/604.1',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-006',
      deviceType: 'iPhone / iOS'
    }
  },
  {
    id: 'sec-log-mem-12',
    timestamp: new Date(Date.now() - 1000 * 3600 * 22.4).toISOString(), // yesterday
    userId: 'mem-106',
    userNama: 'Dewi Lestari',
    role: 'member',
    action: 'SIMULASI_PINJAMAN_ONLINE',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Dewi Lestari melakukan simulasi kalkulasi angsuran pinjaman Rp 10.000.000 dengan tenor 24 bulan di kalkulator portal.',
    ipAddress: '182.253.111.45',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) Safari/604.1',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-006',
      simulasiNominal: 10000000,
      simulasiTenor: 24
    }
  },
  {
    id: 'sec-log-mem-13',
    timestamp: new Date(Date.now() - 1000 * 3600 * 36).toISOString(), // 1.5 days ago
    userId: 'mem-107',
    userNama: 'Rudi Hartono',
    role: 'member',
    action: 'LOGIN_PORTAL_ANGGOTA',
    category: 'Autentikasi',
    severity: 'info',
    description: 'Anggota Rudi Hartono (No. Anggota: AG-007) berhasil login ke portal.',
    ipAddress: '114.124.90.12',
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Vivo Y21) Chrome/120.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-007',
      deviceType: 'Vivo Android'
    }
  },
  {
    id: 'sec-log-mem-14',
    timestamp: new Date(Date.now() - 1000 * 3600 * 36.5).toISOString(),
    userId: 'mem-107',
    userNama: 'Rudi Hartono',
    role: 'member',
    action: 'UBAH_KATA_SANDI',
    category: 'Keamanan Akses',
    severity: 'success',
    description: 'Anggota Rudi Hartono berhasil memperbarui kata sandi portal mandiri untuk meningkatkan keamanan akun.',
    ipAddress: '114.124.90.12',
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Vivo Y21) Chrome/120.0 Mobile',
    status: 'SUCCESS',
    metadata: {
      noAnggota: 'AG-007',
      aktivitas: 'Ganti Kata Sandi Berhasil'
    }
  },
  {
    id: 'sec-log-1',
    timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    userId: 'usr-admin-1',
    userNama: 'Pengurus Utama / Admin',
    role: 'admin',
    action: 'SYSTEM_BOOT',
    category: 'Konfigurasi Sistem',
    severity: 'info',
    description: 'Inisialisasi sistem pembukuan koperasi digital dan verifikasi integritas Cloud Database berhasil.',
    ipAddress: '127.0.0.1 (Local Server)',
    userAgent: 'Web Core Gateway v2.6',
    status: 'SUCCESS'
  },
  {
    id: 'sec-log-2',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    userId: 'usr-admin-1',
    userNama: 'Pengurus Utama / Admin',
    role: 'admin',
    action: 'LOGIN_SUCCESS',
    category: 'Autentikasi',
    severity: 'success',
    description: 'Login berhasil ke Portal Pengurus & Panel Administrasi Koperasi.',
    ipAddress: '192.168.1.10',
    userAgent: 'Chrome 124.0.0.0 (Desktop Windows)',
    status: 'SUCCESS'
  },
  {
    id: 'sec-log-3',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    userId: 'usr-admin-1',
    userNama: 'Pengurus Utama / Admin',
    role: 'admin',
    action: 'SECURITY_POLICY_CHECK',
    category: 'Keamanan Akses',
    severity: 'info',
    description: 'Pemeriksaan kepatuhan keamanan sandi berkala dan validasi sesi otorisasi role aktif.',
    ipAddress: '192.168.1.10',
    userAgent: 'Chrome 124.0.0.0 (Desktop Windows)',
    status: 'SUCCESS'
  },
  {
    id: 'sec-log-4',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    userId: 'usr-kasir-1',
    userNama: 'Karyawan Warung / Kasir',
    role: 'karyawan_warung',
    action: 'LOGIN_SUCCESS',
    category: 'Autentikasi',
    severity: 'success',
    description: 'Petugas kasir unit usaha warung berhasil login ke sesi operasional POS.',
    ipAddress: '192.168.1.15',
    userAgent: 'Firefox 125.0 (POS Station)',
    status: 'SUCCESS'
  },
  {
    id: 'sec-log-5',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'usr-admin-1',
    userNama: 'Pengurus Utama / Admin',
    role: 'admin',
    action: 'SESSION_ENCRYPT_ACTIVE',
    category: 'Keamanan Akses',
    severity: 'success',
    description: 'Enkripsi data sesi dan proteksi token akses admin aktif terverifikasi.',
    ipAddress: '192.168.1.10',
    userAgent: 'Chrome 124.0.0.0 (Desktop Windows)',
    status: 'SUCCESS'
  }
];

export const initialRAPBKSettings: RAPBKSetting[] = [
  {
    id: 'rapbk-setting-2026',
    tahunBuku: 2026,
    status: 'Disahkan',
    tanggalPengesahan: '2026-01-15',
    disahkanOleh: 'Rapat Anggota Tahunan (RAT) Tahun Buku 2025',
    catatan: 'RAPBK Tahun Buku 2026 telah disahkan secara aklamasi oleh seluruh anggota RAT.',
    targetPertumbuhanSHU: 15.0
  },
  {
    id: 'rapbk-setting-2025',
    tahunBuku: 2025,
    status: 'Disahkan',
    tanggalPengesahan: '2025-01-18',
    disahkanOleh: 'Rapat Anggota Tahunan (RAT) Tahun Buku 2024',
    catatan: 'RAPBK Tahun Buku 2025.',
    targetPertumbuhanSHU: 12.5
  }
];

export const initialAnggaranRAPBK: ItemAnggaranRAPBK[] = [
  // PENDAPATAN TAHUN 2026
  {
    id: 'rapbk-inc-1',
    tahunBuku: 2026,
    tipe: 'pendapatan',
    kategori: 'Jasa Pinjaman',
    posAkun: 'Pendapatan Jasa Pinjaman Anggota (1.5%/bulan)',
    targetTahunan: 45000000,
    keterangan: 'Target pendapatan bunga pinjaman dari plafon penyaluran kredit Rp 300.000.000'
  },
  {
    id: 'rapbk-inc-2',
    tahunBuku: 2026,
    tipe: 'pendapatan',
    kategori: 'Provisi',
    posAkun: 'Pendapatan Biaya Provisi & Administrasi Pinjaman (1%)',
    targetTahunan: 3500000,
    keterangan: 'Provisi kredit pinjaman baru yang dicairkan'
  },
  {
    id: 'rapbk-inc-3',
    tahunBuku: 2026,
    tipe: 'pendapatan',
    kategori: 'Usaha Warung',
    posAkun: 'Pendapatan Bersih / Margin Penjualan Unit Usaha Warung & Kantin',
    targetTahunan: 24000000,
    keterangan: 'Laba kotor penjualan sembako, snack, dan perlengkapan sekolah'
  },
  {
    id: 'rapbk-inc-4',
    tahunBuku: 2026,
    tipe: 'pendapatan',
    kategori: 'Pendapatan Lain',
    posAkun: 'Jasa Giro / Bunga Rekening Bank Koperasi',
    targetTahunan: 1200000,
    keterangan: 'Pendapatan bunga penempatan dana di bank'
  },
  {
    id: 'rapbk-inc-5',
    tahunBuku: 2026,
    tipe: 'pendapatan',
    kategori: 'Pendapatan Lain',
    posAkun: 'Pendapatan Non-Operasional & Lain-lain',
    targetTahunan: 1000000,
    keterangan: 'Denda keterlambatan dan pendapatan seragam/atribut'
  },

  // BELANJA / BEBAN OPERASIONAL TAHUN 2026
  {
    id: 'rapbk-exp-1',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Operasional Kantor',
    posAkun: 'Beban ATK, Kertas, Tinta & Cetak Buku Anggota',
    targetTahunan: 3000000,
    keterangan: 'Pagu pengadaan perlengkapan administrasi dan formulir'
  },
  {
    id: 'rapbk-exp-2',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'RAT',
    posAkun: 'Beban Penyelenggaraan Rapat Anggota Tahunan (RAT)',
    targetTahunan: 8500000,
    keterangan: 'Pagu konsumsi, sewa tempat, souvenir, dan penggandaan LPJ'
  },
  {
    id: 'rapbk-exp-3',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Honor Pengurus',
    posAkun: 'Honorarium & Tunjangan Operasional Pengurus & Pengawas',
    targetTahunan: 18000000,
    keterangan: 'Alokasi honor bulanan pengurus harian dan pengawas'
  },
  {
    id: 'rapbk-exp-4',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Operasional Kantor',
    posAkun: 'Beban Listrik, Air, Kebersihan & Internet Kantor',
    targetTahunan: 3600000,
    keterangan: 'Biaya utilitas kantor operasional koperasi'
  },
  {
    id: 'rapbk-exp-5',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Transportasi',
    posAkun: 'Beban Transportasi, Perjalanan Dinas & Pembinaan Dinas Koperasi',
    targetTahunan: 2500000,
    keterangan: 'SPPD pengurus untuk koordinasi dinas dan perbankan'
  },
  {
    id: 'rapbk-exp-6',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Penyusutan',
    posAkun: 'Beban Penyusutan Inventaris & Peralatan Kantor',
    targetTahunan: 2400000,
    keterangan: 'Penyusutan laptop, printer, etalase, dan lemari arsip'
  },
  {
    id: 'rapbk-exp-7',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Dana Sosial',
    posAkun: 'Alokasi Dana Sosial, Santunan & Pendidikan Anggota',
    targetTahunan: 3000000,
    keterangan: 'Kegiatan kemanusiaan, belasungkawa dan pelatihan perkoperasian'
  },
  {
    id: 'rapbk-exp-8',
    tahunBuku: 2026,
    tipe: 'belanja',
    kategori: 'Operasional Kantor',
    posAkun: 'Beban Pemeliharaan Sistem, Hosting & Keamanan Aplikasi',
    targetTahunan: 1800000,
    keterangan: 'Langganan server cloud, domain, dan pemeliharaan IT'
  }
];

export const initialWhatsAppLogs: WhatsAppLog[] = [
  {
    id: 'wa-log-1',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    nomorHp: '081234567890',
    namaPenerima: 'H. Ahmad Sobari, S.Pd',
    anggotaId: 'mbr-1',
    jenisPesan: 'Tagihan Angsuran Pinjaman',
    pesanText: 'Yth. Bpk/Ibu H. Ahmad Sobari, S.Pd (No. Anggota: 001/DS/2024), pengingat angsuran pinjaman ke-4 sebesar Rp 575.000 jatuh tempo pada 10 September 2026. Terima kasih - Koperasi Dana Segar.',
    status: 'Terkirim (wa.me)',
    adminSender: 'Pengurus Koperasi'
  },
  {
    id: 'wa-log-2',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    nomorHp: '085712345678',
    namaPenerima: 'Dra. Hj. Siti Nurjanah, M.Pd',
    anggotaId: 'mbr-2',
    jenisPesan: 'Kuitansi Setoran Simpanan',
    pesanText: '🧾 *KUITANSI DIGITAL RESMI KOPERASI DANA SEGAR*\nNo: KWT-20260901-002\nTelah diterima dari: Dra. Hj. Siti Nurjanah, M.Pd\nNominal: Rp 100.000\nUntuk: Setoran Simpanan Wajib & Sukarela Bulan September 2026\nStatus: *LUNAS & TERCATAT DI SISTEM*',
    status: 'Terkirim (wa.me)',
    adminSender: 'Bendahara Koperasi'
  }
];





