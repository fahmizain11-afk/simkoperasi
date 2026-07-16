import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, ManasukaBungaLog, KoperasiSetup } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Rupiah currency formatter
export const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Excel Exporter
export const exportToExcel = (data: any[], sheetName: string, fileName: string, setup?: KoperasiSetup) => {
  try {
    const namaKop = setup ? setup.namaKoperasi : "Koperasi Penyelenggara Dana Segar";
    const noBadanHukum = setup?.noBadanHukum || "AHU-00123.AH.01.2026";
    const sloganKop = setup ? setup.slogan : "Koperasi Simpan Pinjam Modern";
    const alamatKop = setup ? setup.alamatKantor : "Jl. Pendidikan Raya No. 45, Jakarta Selatan | Telp: (021) 555-0199";

    // Elegant Kop Koperasi + Meta Header
    const kopHeader = [
      [`❖ ${namaKop.toUpperCase()}`],
      [`${alamatKop}`],
      [`Badan Hukum No: ${noBadanHukum} | Slogan: ${sloganKop}`],
      ["===================================================================================="],
      [],
      [`LAPORAN: ${fileName.toUpperCase().replace(/_/g, ' ')}`],
      [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`],
      [],
    ];

    // Read keys of first object
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      kopHeader.push(headers);
      
      data.forEach(item => {
        const row = headers.map(h => item[h]);
        kopHeader.push(row);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(kopHeader);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Gagal mengekspor Excel", error);
  }
};

// PDF Exporter (Flexible Table Generator)
export const exportToPDF = (
  title: string,
  subtitle: string,
  columns: string[],
  rows: any[][],
  filename: string,
  summaryNotes?: { label: string; value: string }[],
  setup?: KoperasiSetup
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const namaKop = setup ? setup.namaKoperasi : "KOPERASI SIMPAN PINJAM DANA SEGAR";
    const noBadanHukum = setup?.noBadanHukum || "AHU-00123.AH.01.2026";
    const sloganKop = setup ? `Badan Hukum: ${noBadanHukum} | Slogan: ${setup.slogan}` : `Badan Hukum No: ${noBadanHukum} | Telepon: (021) 555-0199`;
    const alamatKop = setup ? setup.alamatKantor : "Jl. Pendidikan Raya No. 45, Jakarta Selatan | Email: info@danasegar.coop";

    // --- DRAW LOGO KOPERASI (Base64 if available, fallback to elegant vector scale) ---
    let logoDrawn = false;
    if (setup?.logoUrl && (setup.logoUrl.startsWith('data:image') || setup.logoUrl.startsWith('http'))) {
      try {
        let imgFormat = 'PNG';
        const match = setup.logoUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
        if (match) {
          const matchedFormat = match[1].toLowerCase();
          if (matchedFormat === 'jpeg' || matchedFormat === 'jpg') {
            imgFormat = 'JPEG';
          } else if (matchedFormat === 'png') {
            imgFormat = 'PNG';
          } else if (matchedFormat === 'webp') {
            imgFormat = 'WEBP';
          } else if (matchedFormat === 'gif') {
            imgFormat = 'GIF';
          } else if (matchedFormat === 'svg' || matchedFormat === 'svg+xml') {
            imgFormat = 'SVG';
          }
        } else if (setup.logoUrl.includes('.jpg') || setup.logoUrl.includes('.jpeg')) {
          imgFormat = 'JPEG';
        } else if (setup.logoUrl.includes('.webp')) {
          imgFormat = 'WEBP';
        } else if (setup.logoUrl.includes('.svg')) {
          imgFormat = 'SVG';
        } else if (setup.logoUrl.includes('.gif')) {
          imgFormat = 'GIF';
        }
        doc.addImage(setup.logoUrl, imgFormat, 16, 11, 17, 17);
        logoDrawn = true;
      } catch (err) {
        console.warn("Gagal menambahkan logo image ke PDF, menggunakan fallback vector", err);
      }
    }

    if (!logoDrawn) {
      // Outer green/teal circle
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.8);
      doc.circle(25, 20, 9, 'D');

      // Inner gold circle
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.circle(25, 20, 7.5, 'D');

      // Center Scales of Justice/Balance icon
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.8);
      // Stand/vertical line
      doc.line(25, 15.5, 25, 24);
      // Base line
      doc.line(22.5, 24, 27.5, 24);
      // Beam/horizontal line
      doc.line(20.5, 17.5, 29.5, 17.5);
      // Left scale pan
      doc.line(20.5, 17.5, 18.5, 21.5);
      doc.line(20.5, 17.5, 22.5, 21.5);
      doc.line(18.5, 21.5, 22.5, 21.5);
      // Right scale pan
      doc.line(29.5, 17.5, 27.5, 21.5);
      doc.line(29.5, 17.5, 31.5, 21.5);
      doc.line(27.5, 21.5, 31.5, 21.5);
    }

    // --- DRAW KOP SURAT TEXT ---
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(namaKop.toUpperCase(), 38, 16);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(sloganKop, 38, 21);
    doc.text(alamatKop, 38, 25.5);

    // Double Line Separator
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.7);
    doc.line(15, 32, 195, 32);
    doc.setLineWidth(0.2);
    doc.line(15, 33.2, 195, 33.2);

    // --- DOCUMENT TITLES (Below Kop Surat) ---
    doc.setTextColor(15, 118, 110); // Forest Teal 700
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 15, 41);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(subtitle, 15, 46);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Petugas Administrasi`, 15, 50.5);

    let startY = 54;

    // Grid Columns Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, startY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);

    const colWidth = 180 / columns.length;
    columns.forEach((col, idx) => {
      doc.text(col, 17 + (idx * colWidth), startY + 5.5);
    });

    startY += 8;

    // Grid Body Rows
    doc.setTextColor(51, 65, 85);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);

    rows.forEach((row, rowIdx) => {
      // Prevent overflow
      if (startY > 275) {
        doc.addPage();
        startY = 20;
        // Reprint header on new page
        doc.setFillColor(30, 41, 59);
        doc.rect(15, startY, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        columns.forEach((col, idx) => {
          doc.text(col, 17 + (idx * colWidth), startY + 5.5);
        });
        doc.setTextColor(51, 65, 85);
        doc.setFont("Helvetica", "normal");
        startY += 8;
      }

      // Zebra striping or Highlight Total Row
      if (rowIdx === rows.length - 1) {
        doc.setFillColor(236, 253, 245); // light emerald-50
        doc.rect(15, startY, 180, 7.5, 'F');
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(6, 95, 70); // emerald-800
      } else if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(15, startY, 180, 7.5, 'F');
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
      } else {
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
      }

      row.forEach((cell, cellIdx) => {
        doc.text(String(cell), 17 + (cellIdx * colWidth), startY + 5);
      });

      startY += 7.5;
    });

    // Elegant Sign-off
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Laporan ini sah dan dicetak secara automatis menggunakan modul sistem Koperasi Dana Segar.", 15, startY + 15);
    
    // Board fields
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Mengetahui,", 15, startY + 25);
    doc.text("Pengurus Koperasi,", 15, startY + 29);
    
    doc.text("Pengawas Koperasi,", 145, startY + 25);
    doc.text("Bagian Keuangan,", 145, startY + 29);

    doc.setFont("Helvetica", "bold");
    doc.text("( ____________________ )", 15, startY + 48);
    doc.text("( ____________________ )", 145, startY + 48);

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Gagal mengekspor PDF", error);
  }
};

// Indonesian text representation for numbers (terbilang)
export function terbilang(angka: number): string {
  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let hasil = "";
  
  if (angka < 0) {
    return "Minus " + terbilang(Math.abs(angka));
  }
  
  if (angka < 12) {
    hasil = units[angka];
  } else if (angka < 20) {
    hasil = terbilang(angka - 10) + " Belas";
  } else if (angka < 100) {
    hasil = terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
  } else if (angka < 200) {
    hasil = "Seratus " + terbilang(angka - 100);
  } else if (angka < 1000) {
    hasil = terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
  } else if (angka < 2000) {
    hasil = "Seribu " + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    hasil = terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    hasil = terbilang(Math.floor(angka / 1000000)) + " Juta " + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    hasil = terbilang(Math.floor(angka / 1000000000)) + " Milyar " + terbilang(angka % 1000000000);
  }
  
  return hasil.replace(/\s+/g, " ").trim();
}

// Get formatted transaction time from ID (millisecond timestamp) or fallback to current time
export function getTransactionTime(idOrTxId?: string): string {
  if (!idOrTxId) {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  }
  // Extract digits from the ID or TxId
  const digits = idOrTxId.replace(/\D/g, '');
  if (digits.length >= 8) {
    let timestampNum = parseInt(digits, 10);
    // If it's a partial timestamp of length 8 (e.g. from substring(5) of Date.now().toString())
    if (digits.length < 13) {
      const currentPrefix = Date.now().toString().substring(0, 13 - digits.length);
      timestampNum = parseInt(currentPrefix + digits, 10);
    }
    try {
      const date = new Date(timestampNum);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      }
    } catch (e) {
      // ignore
    }
  }
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
}

