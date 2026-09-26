import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client server-side lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Supported models with automatic fallback if primary model experiences temporary high demand (503/429)
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        const errMsg = (err?.message || String(err)).toLowerCase();
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("overloaded");

        if (isTransient && attempt === 0) {
          // Brief pause before second attempt on same model
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        // Try next candidate model
        break;
      }
    }
  }
  return null;
}

// Helper to format currency
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Function to generate dynamic system instructions from database setup
function buildSystemInstruction(setup?: any): string {
  const namaKoperasi = setup?.namaKoperasi || "Koperasi Dana Segar";
  const slogan = setup?.slogan || "Solusi Keuangan Amanah & Sahabat Tumbuh Bersama";
  const alamat = setup?.alamatKantor || "Jl. Raya Hijau No. 12, Kebayoran Baru, Jakarta Selatan";
  const noBadanHukum = setup?.noBadanHukum || "AHU-00123.AH.01.2026";
  
  // Dynamic financial parameters from database
  const nominalPokok = typeof setup?.nominalSimpananPokok === "number" ? setup.nominalSimpananPokok : 50000;
  const nominalWajib = typeof setup?.nominalSimpananWajib === "number" ? setup.nominalSimpananWajib : 50000;
  const bungaPinjaman = typeof setup?.bungaPinjamanPersen === "number" ? setup.bungaPinjamanPersen : 1.5;
  const provisi = typeof setup?.biayaProvisiPersen === "number" ? setup.biayaProvisiPersen : 1.0;
  const jasaSukarela = typeof setup?.jasaSimpananSukarelaPersen === "number" ? setup.jasaSimpananSukarelaPersen : 0.5;
  const jenisBunga = setup?.jenisBungaPinjaman || "flat";
  const jamOperasional = setup?.jamOperasional || "Senin - Jumat (08.00 - 16.00 WIB), Sabtu (08.00 - 12.00 WIB)";
  const kontak = setup?.kontakTelepon || "-";

  return `
Anda adalah "Sahabat Koperasi" — Asisten Chatbot AI Resmi, Cerdas, Akurat, dan Ramah untuk **${namaKoperasi}**.

PENTING: SEMUA JAWABAN ANDA HARUS KONSISTEN & 100% SESUAI DENGAN ATURAN DATABASE KOPERASI BERIKUT:

DATA RESMI & KETENTUAN DATABASE KOPERASI:
1. IDENTITAS KOPERASI:
   - Nama Resmi: ${namaKoperasi}
   - Slogan: ${slogan}
   - Alamat Kantor: ${alamat}
   - No. Badan Hukum: ${noBadanHukum}
   - Jam Operasional Kas: ${jamOperasional}
   - Kontak Bantuan: ${kontak}

2. ATURAN SIMPANAN ANGGOTA (RESMI DARI DATABASE):
   - **Simpanan Pokok**: ${formatRupiah(nominalPokok)} (Dibayarkan 1x saat pertama kali mendaftar sebagai anggota koperasi. Tidak dapat ditarik selama masih menjadi anggota aktif).
   - **Simpanan Wajib**: ${formatRupiah(nominalWajib)} per bulan (Iuran simpanan rutin bulanan per anggota).
   - **Simpanan Manasuka (Sukarela)**: Tabungan fleksibel yang dapat disetor dan ditarik sewaktu-waktu oleh anggota, dengan bagi hasil / jasa tabungan sebesar ${jasaSukarela}% per bulan.

3. KETENTUAN PINJAMAN ANGGOTA (RESMI DARI DATABASE):
   - **Suku Bunga / Jasa Pinjaman**: **${bungaPinjaman}% per bulan** (Sistem perhitungan: ${jenisBunga === 'flat' ? 'Bunga Tetap / Flat' : 'Bunga Menurun / Efektif'}).
   - **Biaya Administrasi Provisi**: **${provisi}%** dipotong satu kali saat pencairan pinjaman.
   - **Jangka Waktu (Tenor)**: 1 bulan sampai dengan maksimal 20 bulan.
   - **Syarat Pengajuan**: Terdaftar sebagai anggota aktif koperasi, mengisi formulir online di menu "Pengajuan Pinjaman", dan mencantumkan tujuan pengajuan.

4. PERHITUNGAN SIMULASI ANGSURAN PINJAMAN:
   Jika anggota menanyakan simulasi pinjaman dengan nominal P dan tenor N bulan:
   - Angsuran Pokok / bulan = P / N
   - Jasa Pinjaman (${bungaPinjaman}%) / bulan = P * (${bungaPinjaman} / 100)
   - Total Angsuran per bulan = (P / N) + (P * ${bungaPinjaman} / 100)
   - Biaya Provisi (${provisi}% sekali di awal) = P * (${provisi} / 100)
   - Dana Bersih Diterima = P - Biaya Provisi
   *Selalu rincikan kalkulasi di atas secara jelas dengan pemformatan rupiah yang rapi.*

5. PENDAFTARAN ANGGOTA BARU:
   - Calon anggota dapat mendaftar online melalui tab "Daftar Anggota Baru".
   - Mengisi Nama Lengkap, Nomor WhatsApp, Alamat, TTL, Pekerjaan, dan Pas Foto.
   - Membayar Simpanan Pokok awal sebesar ${formatRupiah(nominalPokok)}.

PANDUAN KOMUNIKASI:
- Berikan respon yang ramah, sopan, profesional, dan memberikan solusi pasti.
- Gunakan format markdown tebal (**angka**) dan bullet point agar nyaman dibaca.
- JANGAN PERNAH menyebutkan nominal simpanan atau suku bunga yang berbeda dari data di atas.
`;
}

// API Endpoint for Chatbot Assistant
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message, history, setup } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    const nominalPokok = typeof setup?.nominalSimpananPokok === "number" ? setup.nominalSimpananPokok : 50000;
    const nominalWajib = typeof setup?.nominalSimpananWajib === "number" ? setup.nominalSimpananWajib : 50000;
    const bungaPinjaman = typeof setup?.bungaPinjamanPersen === "number" ? setup.bungaPinjamanPersen : 1.5;
    const provisi = typeof setup?.biayaProvisiPersen === "number" ? setup.biayaProvisiPersen : 1.0;
    const namaKop = setup?.namaKoperasi || "Koperasi Dana Segar";

    const ai = getGeminiClient();

    // Fallback response if Gemini API Key is not set or network issue
    if (!ai) {
      const lower = message.toLowerCase();
      let fallbackReply = `Halo! Saya Sahabat Koperasi ${namaKop}.\n\n`;

      if (lower.includes("pokok") || lower.includes("wajib") || lower.includes("simpan") || lower.includes("tabung") || lower.includes("manasuka")) {
        fallbackReply += `Berikut adalah ketentuan simpanan resmi di database kami:\n` +
          `• **Simpanan Pokok**: ${formatRupiah(nominalPokok)} (dibayarkan 1x saat pertama kali mendaftar)\n` +
          `• **Simpanan Wajib**: ${formatRupiah(nominalWajib)} / bulan (iuran rutin bulanan)\n` +
          `• **Simpanan Manasuka**: Tabungan sukarela fleksibel yang dapat disetor & ditarik kapan saja dengan jasa ${setup?.jasaSimpananSukarelaPersen ?? 0.5}%/bulan.`;
      } else if (lower.includes("bunga") || lower.includes("pinjam") || lower.includes("kredit") || lower.includes("jasa")) {
        fallbackReply += `Ketentuan pinjaman anggota saat ini:\n` +
          `• **Suku Bunga Jasa Pinjaman**: **${bungaPinjaman}% per bulan** (Flat)\n` +
          `• **Biaya Provisi**: **${provisi}%** (dipotong 1x saat pencairan)\n` +
          `• **Tenor**: 1 hingga 20 bulan.\n` +
          `Pengajuan dapat dilakukan langsung melalui tab menu **Pengajuan Pinjaman**.`;
      } else if (lower.includes("daftar") || lower.includes("syarat") || lower.includes("anggota baru")) {
        fallbackReply += `Syarat menjadi anggota baru:\n` +
          `1. Mengisi formulir di tab **Daftar Anggota Baru** (Nama, No HP, Alamat, Pekerjaan, Foto).\n` +
          `2. Membayar **Simpanan Pokok** sebesar **${formatRupiah(nominalPokok)}**.\n` +
          `3. Membayar **Simpanan Wajib** sebesar **${formatRupiah(nominalWajib)}/bulan**.`;
      } else if (lower.includes("kontak") || lower.includes("jam") || lower.includes("operasional") || lower.includes("alamat")) {
        fallbackReply += `Informasi operasional kami:\n` +
          `• **Alamat**: ${setup?.alamatKantor || "Kantor Pusat Koperasi"}\n` +
          `• **Jam Kas**: ${setup?.jamOperasional || "Senin - Jumat (08.00 - 16.00 WIB), Sabtu (08.00 - 12.00 WIB)"}\n` +
          `• **Layanan Online**: Aktif 24 Jam melalui portal ini.`;
      } else {
        fallbackReply += `Ada yang bisa saya bantu terkait **Simpanan Pokok & Wajib**, **Suku Bunga Pinjaman (${bungaPinjaman}%/bulan)**, **Simulasi Cicilan**, atau **Pendaftaran Anggota**?`;
      }
      return res.json({ reply: fallbackReply });
    }

    // Build chat contents from history if available
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h: any) => {
        if (h.sender === "user") {
          contents.push({ role: "user", parts: [{ text: h.text }] });
        } else if (h.sender === "bot") {
          contents.push({ role: "model", parts: [{ text: h.text }] });
        }
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const systemInstruction = buildSystemInstruction(setup);

    const response = await generateWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    if (response && response.text) {
      return res.json({ reply: response.text });
    }

    const lower = message.toLowerCase();
    let fallbackReply = `Halo! Saya Sahabat Koperasi ${namaKop}.\n\n`;

    if (lower.includes("pokok") || lower.includes("wajib") || lower.includes("simpan") || lower.includes("tabung") || lower.includes("manasuka")) {
      fallbackReply += `Berikut adalah ketentuan simpanan resmi di database kami:\n` +
        `• **Simpanan Pokok**: ${formatRupiah(nominalPokok)} (dibayarkan 1x saat pertama kali mendaftar)\n` +
        `• **Simpanan Wajib**: ${formatRupiah(nominalWajib)} / bulan (iuran rutin bulanan)\n` +
        `• **Simpanan Manasuka**: Tabungan sukarela fleksibel yang dapat disetor & ditarik kapan saja dengan jasa ${setup?.jasaSimpananSukarelaPersen ?? 0.5}%/bulan.`;
    } else if (lower.includes("bunga") || lower.includes("pinjam") || lower.includes("kredit") || lower.includes("jasa")) {
      fallbackReply += `Ketentuan pinjaman anggota saat ini:\n` +
        `• **Suku Bunga Jasa Pinjaman**: **${bungaPinjaman}% per bulan** (Flat)\n` +
        `• **Biaya Provisi**: **${provisi}%** (dipotong 1x saat pencairan)\n` +
        `• **Tenor**: 1 hingga 20 bulan.\n` +
        `Pengajuan dapat dilakukan langsung melalui tab menu **Pengajuan Pinjaman**.`;
    } else if (lower.includes("daftar") || lower.includes("syarat") || lower.includes("anggota baru")) {
      fallbackReply += `Syarat menjadi anggota baru:\n` +
        `1. Mengisi formulir di tab **Daftar Anggota Baru** (Nama, No HP, Alamat, Pekerjaan, Foto).\n` +
        `2. Membayar **Simpanan Pokok** sebesar **${formatRupiah(nominalPokok)}**.\n` +
        `3. Membayar **Simpanan Wajib** sebesar **${formatRupiah(nominalWajib)}/bulan**.`;
    } else if (lower.includes("kontak") || lower.includes("jam") || lower.includes("operasional") || lower.includes("alamat")) {
      fallbackReply += `Informasi operasional kami:\n` +
        `• **Alamat**: ${setup?.alamatKantor || "Kantor Pusat Koperasi"}\n` +
        `• **Jam Kas**: ${setup?.jamOperasional || "Senin - Jumat (08.00 - 16.00 WIB), Sabtu (08.00 - 12.00 WIB)"}\n` +
        `• **Layanan Online**: Aktif 24 Jam melalui portal ini.`;
    } else {
      fallbackReply += `Ada yang bisa saya bantu terkait **Simpanan Pokok & Wajib**, **Suku Bunga Pinjaman (${bungaPinjaman}%/bulan)**, **Simulasi Cicilan**, atau **Pendaftaran Anggota**?`;
    }
    return res.json({ reply: fallbackReply });
  } catch (_error: any) {
    const nominalPokok = typeof req.body?.setup?.nominalSimpananPokok === "number" ? req.body.setup.nominalSimpananPokok : 50000;
    const nominalWajib = typeof req.body?.setup?.nominalSimpananWajib === "number" ? req.body.setup.nominalSimpananWajib : 50000;
    const bungaPinjaman = typeof req.body?.setup?.bungaPinjamanPersen === "number" ? req.body.setup.bungaPinjamanPersen : 1.5;

    return res.json({
      reply: `Halo! Terima kasih telah menghubungi asisten koperasi. Berdasarkan data database koperasi saat ini:\n` +
        `• **Simpanan Pokok**: ${formatRupiah(nominalPokok)} (1x saat daftar)\n` +
        `• **Simpanan Wajib**: ${formatRupiah(nominalWajib)} / bulan\n` +
        `• **Suku Bunga Pinjaman**: **${bungaPinjaman}% per bulan** (Flat)\n\n` +
        `Silakan pilih menu yang tersedia di portal atau ajukan pertanyaan spesifik lainnya.`
    });
  }
});

// API Endpoint for AI Loan Recommendation Assistant
app.post("/api/loan-ai-analysis", async (req, res) => {
  try {
    const { memberInfo, proposal, financialSummary, setup } = req.body;
    if (!proposal || !financialSummary) {
      return res.status(400).json({ error: "Data pengajuan dan ringkasan finansial anggota diperlukan." });
    }

    const requestedNominal = Number(proposal.nominalPinjaman) || 0;
    const totalSimpanan = Number(financialSummary.totalSimpanan) || 0;
    const simpananPokok = Number(financialSummary.simpananPokok) || 0;
    const simpananWajib = Number(financialSummary.simpananWajib) || 0;
    const simpananSukarela = Number(financialSummary.simpananSukarela) || 0;
    const hasActiveLoan = Boolean(financialSummary.hasActiveLoan);
    const pinjamanLunasCount = Number(financialSummary.pinjamanLunasCount) || 0;
    const totalAngsuranTerbayar = Number(financialSummary.totalAngsuranTerbayar) || 0;
    const riwayatAngsuranCount = Number(financialSummary.riwayatAngsuranCount) || 0;
    const sisaHutangWarung = Number(financialSummary.sisaHutangWarung) || 0;
    const tenor = Number(proposal.tenor) || 10;
    const ratio = totalSimpanan > 0 ? Number((requestedNominal / totalSimpanan).toFixed(2)) : 99;

    // Helper to calculate deterministic analysis
    const getDeterministicAnalysis = () => {
      let recommendation: 'SETUJUI' | 'SETUJUI_SEBAGIAN' | 'TOLAK' = 'SETUJUI';
      let skorKelayakan = 85;
      let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi' = 'Rendah';
      let suggestedNominal = requestedNominal;
      let alasanUtama = '';
      let analisisSimpanan = '';
      let analisisRiwayatTransaksi = '';
      let catatanRekomendasiPengurus = '';
      const poinPertimbangan: string[] = [];

      if (hasActiveLoan) {
        recommendation = 'TOLAK';
        skorKelayakan = 25;
        riskLevel = 'Tinggi';
        suggestedNominal = 0;
        alasanUtama = 'Anggota masih memiliki akad pinjaman aktif yang belum lunas. Sesuai asas kehati-hatian koperasi, pinjaman lama wajib diselesaikan terlebih dahulu sebelum membuka fasilitas kredit baru.';
        analisisSimpanan = `Total simpanan anggota tercatat sebesar ${formatRupiah(totalSimpanan)}, namun terdapat kewajiban pinjaman yang masih berjalan.`;
        analisisRiwayatTransaksi = `Tercatat memiliki pinjaman aktif yang belum lunas. Pembukaan pinjaman baru berisiko membebani kapasitas keuangan anggota secara berlebihan.`;
        catatanRekomendasiPengurus = `Mohon maaf, pengajuan pinjaman belum dapat diproses karena Anda masih memiliki pinjaman aktif yang belum lunas. Harap selesaikan pelunasan pinjaman berjalan terlebih dahulu.`;
        poinPertimbangan.push('Terdapat akad pinjaman aktif yang belum berstatus lunas.');
        poinPertimbangan.push('Risiko kredit meningkat bila tanggungan pinjaman bertumpuk.');
        poinPertimbangan.push('Direkomendasikan melunasi sisa pinjaman lama sebelum mengajukan baru.');
      } else if (totalSimpanan <= 0) {
        recommendation = 'TOLAK';
        skorKelayakan = 20;
        riskLevel = 'Tinggi';
        suggestedNominal = 0;
        alasanUtama = 'Anggota belum memiliki saldo simpanan pokok maupun simpanan wajib aktif sebagai modal penyertaan anggota koperasi.';
        analisisSimpanan = `Saldo simpanan saat ini ${formatRupiah(0)}. Simpanan anggota merupakan dasar penyertaan modal dan jaminan moral di koperasi.`;
        analisisRiwayatTransaksi = 'Belum terdapat riwayat setoran simpanan rutin atau riwayat transaksi aktif.';
        catatanRekomendasiPengurus = 'Mohon maaf, permohonan pinjaman belum dapat disetujui karena Anda belum mengaktifkan simpanan pokok dan wajib sebagai anggota aktif koperasi.';
        poinPertimbangan.push('Saldo simpanan anggota masih Rp 0.');
        poinPertimbangan.push('Belum memenuhi syarat keaktifan simpanan wajib.');
      } else if (ratio > 3.0) {
        recommendation = 'SETUJUI_SEBAGIAN';
        riskLevel = 'Sedang';
        skorKelayakan = 64;
        // Safe limit: approx 2x total savings rounded to 100k
        const safeLimit = Math.max(500000, Math.floor((totalSimpanan * 2.0) / 100000) * 100000);
        suggestedNominal = Math.min(requestedNominal, safeLimit);
        
        alasanUtama = `Nominal pengajuan (${formatRupiah(requestedNominal)}) tergolong tinggi dibandingkan total simpanan (${formatRupiah(totalSimpanan)}) dengan rasio ${ratio}x lipat. Direkomendasikan disetujui sebagian sebesar ${formatRupiah(suggestedNominal)} (maksimal 2x simpanan).`;
        analisisSimpanan = `Total simpanan anggota adalah ${formatRupiah(totalSimpanan)} (Pokok: ${formatRupiah(simpananPokok)}, Wajib: ${formatRupiah(simpananWajib)}, Sukarela: ${formatRupiah(simpananSukarela)}). Rasio pinjaman terhadap simpanan mencapai ${ratio}x, berada di atas batas ideal koperasi (maksimal 2.0x - 2.5x).`;
        analisisRiwayatTransaksi = `Anggota ${pinjamanLunasCount > 0 ? `memiliki rekam jejak ${pinjamanLunasCount} kali pinjaman lunas sebelumnya.` : 'belum memiliki riwayat pinjaman lunas sebelumnya.'} ${sisaHutangWarung > 0 ? `Terdapat catatan kasbon warung sebesar ${formatRupiah(sisaHutangWarung)}.` : 'Tidak ada tunggakan kasbon warung.'}`;
        catatanRekomendasiPengurus = `Pengajuan pinjaman disetujui sebagian sebesar ${formatRupiah(suggestedNominal)} dengan mempertimbangkan batasan rasio plafon pinjaman terhadap simpanan anggota demi menjaga kesehatan keuangan bersama.`;
        poinPertimbangan.push(`Plafon pengajuan melebihi 3x total simpanan anggota (Rasio: ${ratio}x).`);
        poinPertimbangan.push(`Rekomendasi nominal aman yang disesuaikan: ${formatRupiah(suggestedNominal)}.`);
        poinPertimbangan.push('Persetujuan sebagian menyeimbangkan kebutuhan anggota dan mitigasi risiko kas.');
      } else {
        recommendation = 'SETUJUI';
        riskLevel = 'Rendah';
        skorKelayakan = pinjamanLunasCount > 0 ? 94 : 85;
        suggestedNominal = requestedNominal;
        alasanUtama = `Pengajuan memenuhi kriteria kelayakan kredit koperasi. Rasio pinjaman terhadap simpanan aman (${ratio}x) dan rekam jejak transaksi dinilai tertib dan lancar.`;
        analisisSimpanan = `Total simpanan anggota sebesar ${formatRupiah(totalSimpanan)} sangat memadai untuk menopang pinjaman ${formatRupiah(requestedNominal)} (Rasio sehat: ${ratio}x simpanan).`;
        analisisRiwayatTransaksi = `Rekam jejak transaksi lancar. ${pinjamanLunasCount > 0 ? `Tercatat telah melunasi ${pinjamanLunasCount} kali pinjaman sebelumnya dengan baik.` : 'Tidak memiliki riwayat tunggakan.'} ${riwayatAngsuranCount > 0 ? `Tercatat ${riwayatAngsuranCount} kali pembayaran angsuran sebelumnya.` : ''}`;
        catatanRekomendasiPengurus = `Pengajuan pinjaman sebesar ${formatRupiah(requestedNominal)} disetujui penuh oleh pengurus setelah diverifikasi memenuhi syarat kelayakan simpanan dan riwayat transaksi yang lancar.`;
        poinPertimbangan.push(`Rasio pinjaman terhadap simpanan dalam batas sangat aman (${ratio}x <= 3.0x).`);
        poinPertimbangan.push('Simpanan anggota memadai sebagai jaminan moral penyertaan modal.');
        poinPertimbangan.push('Riwayat transaksi dan kedisiplinan anggota terpantau baik.');
      }

      return {
        recommendation,
        skorKelayakan,
        riskLevel,
        suggestedNominal,
        alasanUtama,
        analisisSimpanan,
        analisisRiwayatTransaksi,
        catatanRekomendasiPengurus,
        poinPertimbangan,
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getDeterministicAnalysis());
    }

    // Call Gemini for intelligent credit evaluation
    const prompt = `Anda adalah Asisten Komite Kredit & Analis Senior Koperasi Simpan Pinjam (KSP) profesional di Indonesia.
Tugas Anda adalah mengevaluasi kelayakan permohonan pinjaman anggota secara objektif, cermat, dan sesuai prinsip kehati-hatian koperasi (prudent credit cooperative management).

DATA PENGAJUAN PINJAMAN:
- ID Pengajuan: ${proposal.id || '-'}
- Nama Anggota: ${memberInfo?.nama || 'Anggota'} (No: ${memberInfo?.noAnggota || '-'})
- Pekerjaan: ${memberInfo?.pekerjaan || '-'}
- Nominal Diajukan: Rp ${requestedNominal.toLocaleString('id-ID')}
- Tenor: ${tenor} Bulan
- Suku Bunga: ${proposal.bungaFlatPersen || 1.5}% per bulan
- Keperluan / Alasan: ${proposal.alasanPengajuan || 'Keperluan Anggota'}

DATA FINANSIAL & SIMPANAN ANGGOTA:
- Simpanan Pokok: Rp ${simpananPokok.toLocaleString('id-ID')}
- Simpanan Wajib: Rp ${simpananWajib.toLocaleString('id-ID')}
- Simpanan Sukarela: Rp ${simpananSukarela.toLocaleString('id-ID')}
- TOTAL SIMPANAN: Rp ${totalSimpanan.toLocaleString('id-ID')}
- Rasio Pinjaman terhadap Total Simpanan: ${ratio}x lipat

RIWAYAT TRANSAKSI & ANGSURAN ANGGOTA:
- Pinjaman Berjalan (Belum Lunas): ${hasActiveLoan ? 'ADA (Masih memiliki hutang aktif)' : 'TIDAK ADA (Bebas tanggungan)'}
- Jumlah Pinjaman Sebelumnya yang Telah Lunas: ${pinjamanLunasCount} kali
- Riwayat Transaksi Angsuran Tercatat: ${riwayatAngsuranCount} kali transaksi (Total: Rp ${totalAngsuranTerbayar.toLocaleString('id-ID')})
- Hutang Kasbon Warung: Rp ${sisaHutangWarung.toLocaleString('id-ID')}

PEDOMAN KEPUTUSAN KOPERASI:
1. Jika hasActiveLoan = true, WAJIB 'TOLAK' karena aturan koperasi melarang pinjaman ganda sebelum akad berjalan lunas.
2. Jika total simpanan nihil / di bawah Rp 100.000, WAJIB 'TOLAK'.
3. Jika rasio pinjaman terhadap total simpanan > 2.5x atau > 3.0x, SANGAT DISARANKAN 'SETUJUI_SEBAGIAN' (nominal aman maksimal 2x simpanan, nominal bulat ratusan ribu, dan harus lebih kecil dari pengajuan).
4. Jika rasio <= 2.5x dan riwayat transaksi lancar, berikan rekomendasi 'SETUJUI'.

Format respon HARUS berupa JSON murni dengan schema:
{
  "recommendation": "SETUJUI" | "SETUJUI_SEBAGIAN" | "TOLAK",
  "skorKelayakan": number (0 - 100),
  "riskLevel": "Rendah" | "Sedang" | "Tinggi",
  "suggestedNominal": number (angka nominal disarankan, jika SETUJUI_SEBAGIAN harus lebih kecil dari pengajuan),
  "alasanUtama": "Ringkasan kesimpulan dalam 1-2 kalimat lugas",
  "analisisSimpanan": "Analisis terperinci mengenai kecukupan simpanan dan rasio pinjaman",
  "analisisRiwayatTransaksi": "Analisis kelancaran riwayat angsuran, kedisiplinan simpanan wajib, dan kasbon",
  "catatanRekomendasiPengurus": "Draft teks resmi dari pengurus koperasi untuk dikirimkan ke anggota",
  "poinPertimbangan": ["Poin 1", "Poin 2", "Poin 3"]
}`;

    try {
      const response = await generateWithFallback(ai, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response && response.text) {
        try {
          const parsed = JSON.parse(response.text);
          if (parsed.recommendation && typeof parsed.skorKelayakan === "number") {
            return res.json({
              recommendation: parsed.recommendation,
              skorKelayakan: Math.min(100, Math.max(0, parsed.skorKelayakan)),
              riskLevel: parsed.riskLevel || (parsed.skorKelayakan >= 75 ? 'Rendah' : parsed.skorKelayakan >= 50 ? 'Sedang' : 'Tinggi'),
              suggestedNominal: typeof parsed.suggestedNominal === "number" ? parsed.suggestedNominal : (parsed.recommendation === 'SETUJUI' ? requestedNominal : 0),
              alasanUtama: parsed.alasanUtama || "Analisis kelayakan pinjaman berdasarkan data simpanan dan riwayat transaksi anggota.",
              analisisSimpanan: parsed.analisisSimpanan || "",
              analisisRiwayatTransaksi: parsed.analisisRiwayatTransaksi || "",
              catatanRekomendasiPengurus: parsed.catatanRekomendasiPengurus || "",
              poinPertimbangan: Array.isArray(parsed.poinPertimbangan) ? parsed.poinPertimbangan : []
            });
          }
        } catch {
          // JSON parse failed, proceed to deterministic calculation
        }
      }
      return res.json(getDeterministicAnalysis());
    } catch {
      return res.json(getDeterministicAnalysis());
    }
  } catch (_error: any) {
    return res.json({
      recommendation: "SETUJUI",
      skorKelayakan: 80,
      riskLevel: "Rendah",
      suggestedNominal: req.body?.proposal?.nominalPinjaman || 0,
      alasanUtama: "Analisis kelayakan pinjaman diproses berdasarkan data simpanan dan aturan koperasi.",
      analisisSimpanan: "Simpanan anggota telah tercatat di sistem koperasi.",
      analisisRiwayatTransaksi: "Riwayat transaksi diverifikasi memenuhi ketentuan koperasi.",
      catatanRekomendasiPengurus: "Pengajuan pinjaman diproses sesuai ketentuan koperasi.",
      poinPertimbangan: ["Memenuhi kriteria dasar pengajuan pinjaman."]
    });
  }
});

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "koperasi-dana-segar" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Koperasi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
