import { Member, Simpanan, Pinjaman, Angsuran, PendapatanLain, BebanKoperasi, ManasukaBungaLog, KoperasiSetup, Pembelian, PiutangWarung, UserAccount } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Authoritative Calculation of Cooperative Real Cash (Matching Neraca Saldo / Trial Balance)
export const calculateKasKoperasi = (
  setup?: KoperasiSetup | null,
  simpanan: Simpanan[] = [],
  pinjaman: Pinjaman[] = [],
  angsuran: Angsuran[] = [],
  income: PendapatanLain[] = [],
  expenses: BebanKoperasi[] = [],
  pembelian: Pembelian[] = [],
  piutangWarung: PiutangWarung[] = []
): number => {
  const kasAwal = setup?.kasAwal ?? 0;
  const totalSimpanan = simpanan.reduce((a, c) => a + (Number(c.jumlah) || 0), 0);
  const totalDisbursed = pinjaman.reduce((a, c) => a + (Number(c.nominalPinjaman) || 0), 0);
  const totalProvisi = pinjaman.reduce((a, c) => a + (Number(c.provisiDipotong) || 0), 0);
  const totalAngsuran = angsuran.reduce((a, c) => a + (Number(c.jumlahBayar) || 0), 0);
  const totalInc = income.reduce((a, c) => a + (Number(c.nominal) || 0), 0);
  const totalExp = expenses
    .filter(e => e.kategori !== 'penyusutan_inventaris' && e.kategori !== 'penyusutan_aktiva_tetap' && !e.kategori?.toLowerCase().includes('penyusutan'))
    .reduce((a, c) => a + (Number(c.nominal) || 0), 0);
  const totalPembelian = pembelian?.reduce((a, c) => a + (Number(c.totalHarga) || 0), 0) ?? 0;
  const totalHutangWarung = piutangWarung?.filter(pw => pw.jenis === 'hutang_baru').reduce((a, c) => a + (Number(c.nominal) || 0), 0) ?? 0;
  const totalPelunasanWarung = piutangWarung?.filter(pw => pw.jenis === 'pelunasan').reduce((a, c) => a + (Number(c.nominal) || 0), 0) ?? 0;

  return kasAwal + totalSimpanan + totalAngsuran + totalInc + totalPelunasanWarung + totalProvisi - totalDisbursed - totalExp - totalPembelian - totalHutangWarung;
};

// Rupiah currency formatter
export const formatRupiah = (num: number): string => {
  const val = Number(num) || 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
  return formatted.replace(/^Rp[\s\xA0]*/, 'Rp ');
};

export const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatYearMonthIndo = (ym: string): string => {
  if (!ym) return '-';
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = INDO_MONTH_NAMES[monthIdx] || parts[1];
  return `${monthName} ${year}`;
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
  setup?: KoperasiSetup,
  customOrientation?: 'portrait' | 'landscape'
) => {
  try {
    const isLandscape = customOrientation 
      ? (customOrientation === 'landscape')
      : (columns.length >= 6 || title.toUpperCase().includes('NOMINATIF') || title.toUpperCase().includes('MUTASI') || title.toUpperCase().includes('PINJAMAN') || title.toUpperCase().includes('ANGSURAN') || title.toUpperCase().includes('PIUTANG'));

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const marginLeft = 14;
    const marginRight = 14;
    const tableWidth = pageWidth - marginLeft - marginRight;
    const maxPageBottom = pageHeight - 20;

    const namaKop = setup ? setup.namaKoperasi : "KOPERASI SIMPAN PINJAM DANA SEGAR";
    const noBadanHukum = setup?.noBadanHukum || "AHU-00123.AH.01.2026";
    const sloganKop = setup ? `Badan Hukum: ${noBadanHukum} | Slogan: ${setup.slogan}` : `Badan Hukum No: ${noBadanHukum} | Telepon: (021) 555-0199`;
    const alamatKop = setup ? setup.alamatKantor : "Jl. Pendidikan Raya No. 45, Jakarta Selatan | Email: info@danasegar.coop";

    // Helper: Draw Kop Surat
    const drawKopSurat = () => {
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
          doc.addImage(setup.logoUrl, imgFormat, marginLeft + 1, 10, 18, 18);
          logoDrawn = true;
        } catch (err) {
          console.warn("Gagal menambahkan logo image ke PDF, menggunakan fallback vector", err);
        }
      }

      if (!logoDrawn) {
        // Outer green/teal circle
        const iconCenterX = marginLeft + 10;
        const iconCenterY = 19;
        doc.setDrawColor(15, 118, 110);
        doc.setLineWidth(0.8);
        doc.circle(iconCenterX, iconCenterY, 9, 'D');

        // Inner gold circle
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        doc.circle(iconCenterX, iconCenterY, 7.5, 'D');

        // Center Scales of Justice/Balance icon
        doc.setDrawColor(15, 118, 110);
        doc.setLineWidth(0.8);
        doc.line(iconCenterX, iconCenterY - 4.5, iconCenterX, iconCenterY + 4);
        doc.line(iconCenterX - 2.5, iconCenterY + 4, iconCenterX + 2.5, iconCenterY + 4);
        doc.line(iconCenterX - 4.5, iconCenterY - 2.5, iconCenterX + 4.5, iconCenterY - 2.5);
        doc.line(iconCenterX - 4.5, iconCenterY - 2.5, iconCenterX - 6.5, iconCenterY + 1.5);
        doc.line(iconCenterX - 4.5, iconCenterY - 2.5, iconCenterX - 2.5, iconCenterY + 1.5);
        doc.line(iconCenterX - 6.5, iconCenterY + 1.5, iconCenterX - 2.5, iconCenterY + 1.5);
        doc.line(iconCenterX + 4.5, iconCenterY - 2.5, iconCenterX + 2.5, iconCenterY + 1.5);
        doc.line(iconCenterX + 4.5, iconCenterY - 2.5, iconCenterX + 6.5, iconCenterY + 1.5);
        doc.line(iconCenterX + 2.5, iconCenterY + 1.5, iconCenterX + 6.5, iconCenterY + 1.5);
      }

      const textStartX = marginLeft + 23;
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13.5);
      doc.text(namaKop.toUpperCase(), textStartX, 15);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(sloganKop, textStartX, 20);
      doc.text(alamatKop, textStartX, 24.5);

      // Double Line Separator
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.7);
      doc.line(marginLeft, 31, marginLeft + tableWidth, 31);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, 32.2, marginLeft + tableWidth, 32.2);
    };

    drawKopSurat();

    // --- DOCUMENT TITLES (Below Kop Surat) ---
    doc.setTextColor(15, 118, 110); // Forest Teal 700
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(title.toUpperCase(), marginLeft, 40);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(subtitle, marginLeft, 45);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Petugas Administrasi`, marginLeft, 49.5);

    let startY = 53;

    // Optional Summary Notes rendering
    if (summaryNotes && summaryNotes.length > 0) {
      const rowsCount = Math.ceil(summaryNotes.length / 2);
      const noteBoxHeight = 5 + (rowsCount * 5.5);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(marginLeft, startY, tableWidth, noteBoxHeight, 2, 2, 'FD');
      
      summaryNotes.forEach((note, idx) => {
        const colIdx = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const noteX = marginLeft + 6 + (colIdx * (tableWidth / 2));
        const noteY = startY + 5 + (rowIdx * 5.5);
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const prefix = `${note.label}: `;
        doc.text(prefix, noteX, noteY);
        const labelW = doc.getTextWidth(prefix);
        doc.setTextColor(15, 118, 110);
        doc.text(note.value, noteX + labelW, noteY);
      });

      startY += noteBoxHeight + 5;
    }

    // --- CALCULATE INTELLIGENT COLUMN WIDTHS ---
    const calculateColumnWidths = (): number[] => {
      const numCols = columns.length;

      // 1. Neraca Keuangan (3 columns: Elemen, Aktiva, Pasiva)
      if (numCols === 3 && (
        columns[0].toUpperCase().includes('ELEMEN') || 
        columns[0].toUpperCase().includes('AKUN') || 
        columns[0].toUpperCase().includes('NERACA') || 
        columns[1].toUpperCase().includes('AKTIVA') || 
        columns[2].toUpperCase().includes('PASIVA')
      )) {
        return [tableWidth * 0.44, tableWidth * 0.28, tableWidth * 0.28];
      }

      // 2. Laba Rugi (2 columns: Uraian/Pos, Realisasi)
      if (numCols === 2) {
        return [tableWidth * 0.65, tableWidth * 0.35];
      }

      // 3. Laporan Data Nominatif (11 columns on landscape)
      if (numCols === 11 && (
        columns[0].toUpperCase().includes('ANGGOTA') || 
        columns[1].toUpperCase().includes('NAMA') || 
        columns[6].toUpperCase().includes('TOTAL')
      )) {
        // [NO ANGGOTA, NAMA ANGGOTA, S. POKOK, S. WAJIB, S. MANASUKA, JASA MNSK, TOTAL SIMP., SISA PINJ., JASA PINJ., PROVISI, PIUTANG WRG]
        const rawWeights = [20, 46, 22, 23, 24, 22, 26, 24, 22, 22, 24];
        const rawSum = rawWeights.reduce((a, b) => a + b, 0);
        return rawWeights.map(w => (w / rawSum) * tableWidth);
      }

      // 3b. Laporan Data Nominatif (10 columns legacy fallback)
      if (numCols === 10 && (
        columns[0].toUpperCase().includes('ANGGOTA') || 
        columns[1].toUpperCase().includes('NAMA') || 
        columns[6].toUpperCase().includes('TOTAL')
      )) {
        // [NO ANGGOTA, NAMA ANGGOTA, S. POKOK, S. WAJIB, S. MANASUKA, JASA MNSK, TOTAL SIMP., SISA PINJ., JASA PINJ., PROVISI]
        const rawWeights = [22, 50, 24, 25, 26, 24, 27, 25, 24, 24];
        const rawSum = rawWeights.reduce((a, b) => a + b, 0);
        return rawWeights.map(w => (w / rawSum) * tableWidth);
      }

      // 4. Kartu Mutasi Anggota (7 columns)
      if (numCols === 7 && columns[0].toUpperCase().includes('TGL') && columns[1].toUpperCase().includes('ANGSURAN')) {
        const rawWeights = [28, 22, 38, 38, 38, 38, 32];
        const rawSum = rawWeights.reduce((a, b) => a + b, 0);
        return rawWeights.map(w => (w / rawSum) * tableWidth);
      }

      // 5. Auto-weighted proportional layout for general multi-column tables
      const weights: number[] = columns.map((col) => {
        const header = col.toUpperCase();
        if (header === 'NO' || header === 'NO.') return 10;
        if (header.includes('TANGGAL') || header.includes('TGL')) return 22;
        if (header.includes('BULAN') || header.includes('TENOR') || header.includes('STATUS') || header.includes('ROLE')) return 20;
        if (header.includes('NO ANGGOTA') || header.includes('NO. ANGGOTA') || header.includes('USERNAME')) return 25;
        if (header.includes('JENIS') || header.includes('KATEGORI')) return 24;
        if (
          header.includes('POKOK') || header.includes('WAJIB') || header.includes('MANASUKA') ||
          header.includes('JASA') || header.includes('BUNGA') || header.includes('PROVISI') ||
          header.includes('JUMLAH') || header.includes('TOTAL') || header.includes('BAYAR') ||
          header.includes('SALDO') || header.includes('NOMINAL') || header.includes('DITERIMA') ||
          header.includes('(RP)') || header.includes('DEBET') || header.includes('KREDIT') ||
          header.includes('AKTIVA') || header.includes('PASIVA')
        ) return 28;
        if (header.includes('NAMA') || header.includes('KETERANGAN') || header.includes('URAIAN') || header.includes('ELEMEN')) return 44;
        return 25;
      });

      const sumWeights = weights.reduce((a, b) => a + b, 0);
      return weights.map(w => (w / sumWeights) * tableWidth);
    };

    const colWidths = calculateColumnWidths();

    // Column start X coordinates
    const colStarts: number[] = [];
    let currentX = marginLeft;
    colWidths.forEach(w => {
      colStarts.push(currentX);
      currentX += w;
    });

    // Detect column alignment for data cells: 'left' | 'right' | 'center'
    const colAlignments: ('left' | 'right' | 'center')[] = columns.map((col, idx) => {
      const header = col.toUpperCase();
      if (header === 'NO' || header === 'NO.' || header.includes('TENOR') || header.includes('STATUS') || header.includes('ROLE') || header.includes('BULAN KE') || header.includes('ANGSURAN KE')) {
        return 'center';
      }
      if (header === 'NO ANGGOTA' || header === 'NO. ANGGOTA' || header === 'KODE') {
        return 'center';
      }
      if (header.includes('TANGGAL') || header.includes('TGL')) {
        return 'center';
      }
      if (
        header.includes('(RP)') || header.includes('AKTIVA') || header.includes('PASIVA') ||
        header.includes('DEBET') || header.includes('KREDIT') || header.includes('POKOK') ||
        header.includes('WAJIB') || header.includes('MANASUKA') || header.includes('JASA') ||
        header.includes('BUNGA') || header.includes('PROVISI') || header.includes('JUMLAH') ||
        header.includes('TOTAL') || header.includes('BAYAR') || header.includes('SALDO') ||
        header.includes('NOMINAL') || header.includes('DITERIMA') || header.includes('REALISASI') ||
        header.includes('PINJ')
      ) {
        return 'right';
      }

      // Check sample rows
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const val = String(rows[r]?.[idx] ?? '');
        if (val.startsWith('Rp') || val.startsWith('Rp.') || val.includes('Rp ')) {
          return 'right';
        }
      }

      return 'left';
    });

    // Function to draw Table Header (Header Rata Tengah & Anti-Tumpang Tindih)
    const drawTableHeader = (yPos: number) => {
      const headerFontSize = columns.length >= 9 ? 7.5 : (columns.length >= 6 ? 8 : 8.5);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(headerFontSize);

      // Pre-calculate wrapped lines for each header column so text NEVER bleeds outside
      const headerLinesPerCol: string[][] = columns.map((col, idx) => {
        const colW = colWidths[idx];
        return doc.splitTextToSize(col, colW - 3);
      });

      const maxLines = Math.max(1, ...headerLinesPerCol.map(lines => lines.length));
      const lineHeight = headerFontSize * 0.42; // mm per line
      const headerHeight = Math.max(8, (maxLines * lineHeight) + 3.8);

      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(marginLeft, yPos, tableWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);

      columns.forEach((_, idx) => {
        const colW = colWidths[idx];
        const colX = colStarts[idx];
        const lines = headerLinesPerCol[idx];
        const centerX = colX + (colW / 2);
        
        // Vertically center lines in header rect
        const totalTextHeight = (lines.length - 1) * lineHeight;
        const firstLineY = yPos + (headerHeight / 2) + (headerFontSize * 0.16) - (totalTextHeight / 2);

        lines.forEach((line: string, lIdx: number) => {
          doc.text(line, centerX, firstLineY + (lIdx * lineHeight), { align: 'center' });
        });
      });

      return yPos + headerHeight;
    };

    startY = drawTableHeader(startY);

    // Grid Body Rows
    rows.forEach((row, rowIdx) => {
      const isTotalRow = (rowIdx === rows.length - 1) || 
        String(row[0] || '').toUpperCase().startsWith('TOTAL') || 
        String(row[0] || '').toUpperCase().includes('TOTAL AKUMULASI');

      // Pre-calculate line wrap and row height
      let maxLinesInRow = 1;
      row.forEach((cell, cellIdx) => {
        const align = colAlignments[cellIdx];
        if (align === 'left') {
          doc.setFont("Helvetica", isTotalRow ? "bold" : "normal");
          doc.setFontSize(columns.length >= 9 ? 7.5 : 8);
          const cellStr = String(cell !== undefined && cell !== null ? cell : '-');
          const lines = doc.splitTextToSize(cellStr, colWidths[cellIdx] - 5);
          if (lines.length > maxLinesInRow) {
            maxLinesInRow = lines.length;
          }
        }
      });

      // Sedikit menambah tinggi cell agar lebih lega dan estetis (tambah tinggi cell)
      const rowHeight = Math.max(8.0, (maxLinesInRow * 4.2) + 3.6);

      // Pencegahan Baris Total Terpisah Sendiri (Orphan Total Row Prevention):
      // Jika baris saat ini adalah baris sebelum Total (rowIdx === rows.length - 2), hitung kebutuhan ruang baris ini + baris Total berikutnya.
      // Jika tidak muat keduanya, langsung lompat halaman bersama-sama agar Jumlah Akhir (TOTAL) tidak pernah sendirian di halaman baru.
      let requiredSpace = rowHeight;
      if (rowIdx === rows.length - 2) {
        const nextRow = rows[rowIdx + 1];
        let nextMaxLines = 1;
        nextRow.forEach((cell, cellIdx) => {
          if (colAlignments[cellIdx] === 'left') {
            const lines = doc.splitTextToSize(String(cell || ''), colWidths[cellIdx] - 5);
            if (lines.length > nextMaxLines) nextMaxLines = lines.length;
          }
        });
        const nextRowHeight = Math.max(8.2, (nextMaxLines * 4.2) + 3.8);
        requiredSpace = rowHeight + nextRowHeight;
      }

      // Check page overflow
      if (startY + requiredSpace > maxPageBottom) {
        doc.addPage();
        drawKopSurat();
        let newStartY = 40;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 118, 110);
        doc.text(`${title.toUpperCase()} (Lanjutan)`, marginLeft, newStartY);
        newStartY += 6;
        startY = drawTableHeader(newStartY);
      }

      // Draw Row Background
      if (isTotalRow) {
        doc.setFillColor(236, 253, 245); // Emerald-50
        doc.rect(marginLeft, startY, tableWidth, rowHeight, 'F');
        doc.setDrawColor(16, 185, 129); // Emerald-500 top & bottom border
        doc.setLineWidth(0.5);
        doc.line(marginLeft, startY, marginLeft + tableWidth, startY);
        doc.line(marginLeft, startY + rowHeight, marginLeft + tableWidth, startY + rowHeight);
      } else if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Slate-50 zebra
        doc.rect(marginLeft, startY, tableWidth, rowHeight, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(marginLeft, startY + rowHeight, marginLeft + tableWidth, startY + rowHeight);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(marginLeft, startY, tableWidth, rowHeight, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(marginLeft, startY + rowHeight, marginLeft + tableWidth, startY + rowHeight);
      }

      // Draw Cells
      row.forEach((cell, cellIdx) => {
        const colW = colWidths[cellIdx];
        const colX = colStarts[cellIdx];
        const align = colAlignments[cellIdx];
        const cellStr = String(cell !== undefined && cell !== null ? cell : '-');

        const fontSize = columns.length >= 9 ? 7.5 : 8.2;
        if (isTotalRow) {
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(6, 95, 70); // Emerald 800
          doc.setFontSize(fontSize);
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(51, 65, 85); // Slate 700
          doc.setFontSize(fontSize);
        }

        const textBaselineY = startY + 5.2;

        if (align === 'right') {
          // Right-aligned with right margin padding
          doc.text(cellStr, colX + colW - 2.5, textBaselineY, { align: 'right' });
        } else if (align === 'center') {
          doc.text(cellStr, colX + (colW / 2), textBaselineY, { align: 'center' });
        } else {
          // Left-aligned with auto text wrapping to prevent any overlapping into next column
          const wrappedLines = doc.splitTextToSize(cellStr, colW - 4);
          wrappedLines.forEach((line: string, lIdx: number) => {
            doc.text(line, colX + 2.5, textBaselineY + (lIdx * 3.8));
          });
        }
      });

      startY += rowHeight;
    });

    // Check bottom space for Sign-off block
    if (startY + 48 > maxPageBottom) {
      doc.addPage();
      drawKopSurat();
      startY = 42;
    } else {
      startY += 8;
    }

    // Sign-off / Signature section
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Laporan ini sah, terverifikasi akurat, dan dicetak otomatis melalui Modul Keuangan Koperasi Digital.", marginLeft, startY);

    const signY = startY + 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Mengetahui,", marginLeft, signY);
    doc.text("Pengurus Koperasi,", marginLeft, signY + 4.5);

    const rightSignX = marginLeft + tableWidth - 55;
    doc.text("Pengawas Koperasi,", rightSignX, signY);
    doc.text("Bagian Keuangan,", rightSignX, signY + 4.5);

    doc.setFont("Helvetica", "bold");
    doc.text("( ____________________ )", marginLeft, signY + 22);
    doc.text("( ____________________ )", rightSignX, signY + 22);

    // Add page numbers at the bottom of each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sistem Informasi Koperasi Digital | ${namaKop}`, marginLeft, pageHeight - 8);
      doc.text(`Halaman ${i} dari ${totalPages}`, marginLeft + tableWidth, pageHeight - 8, { align: 'right' });
    }

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

// Helper to calculate interest portion (Jasa Pinjaman) for an installment payment
// Aturan Koperasi: Jika bayar kurang dari pokok + jasa, jasa pinjaman didahulukan
export const calculateAngsuranInterest = (a: Angsuran, p?: Pinjaman): number => {
  if (a.jasaBayar !== undefined && a.jasaBayar !== null && !isNaN(a.jasaBayar)) {
    return a.jasaBayar;
  }
  if (a.pokokBayar !== undefined && a.pokokBayar !== null && !isNaN(a.pokokBayar)) {
    return Math.max(0, a.jumlahBayar - a.pokokBayar);
  }
  if (!p) return 0;

  // Jasa pinjaman per bulan yang ditentukan di akad pinjaman (default 1.5% dari nominal pinjaman)
  const targetMonthlyInterest = p.jasaPerBulan > 0
    ? p.jasaPerBulan
    : Math.round(p.nominalPinjaman * (p.bungaFlatPersen ? p.bungaFlatPersen / 100 : 0.015));

  // Jasa pinjaman didahulukan dari jumlah bayar
  return Math.min(a.jumlahBayar, targetMonthlyInterest);
};

// Helper to calculate principal portion (Pokok Pinjaman) for an installment payment
// Sisanya setelah dipotong jasa pinjaman masuk ke pokok pinjaman
export const calculateAngsuranPrincipal = (a: Angsuran, p?: Pinjaman): number => {
  if (a.pokokBayar !== undefined && a.pokokBayar !== null && !isNaN(a.pokokBayar)) {
    return a.pokokBayar;
  }
  if (a.jasaBayar !== undefined && a.jasaBayar !== null && !isNaN(a.jasaBayar)) {
    return Math.max(0, a.jumlahBayar - a.jasaBayar);
  }
  if (!p) return a.jumlahBayar;
  const interest = calculateAngsuranInterest(a, p);
  return Math.max(0, a.jumlahBayar - interest);
};

// Helper to calculate remaining principal balance (Sisa Pokok Pinjaman Beredar)
// Sisa pinjaman adalah sisa pinjaman terakhir dikurangi dengan pokok pinjaman yang dibayarkan pada bulan tersebut
export const calculateLoanOutstanding = (p: Pinjaman, allAngsuranForP: Angsuran[]): number => {
  const totalPrincipalPaid = allAngsuranForP.reduce((sum, a) => sum + calculateAngsuranPrincipal(a, p), 0);
  const remaining = Math.round(p.nominalPinjaman - totalPrincipalPaid);
  return Math.max(0, remaining);
};

// Helper to calculate historical remaining principal balance (Sisa Tagihan Pokok pada saat/setelah angsuran bersangkutan dibayar)
export const calculateHistoricalLoanOutstanding = (
  p: Pinjaman,
  currentAngsuran: Angsuran,
  allAngsuranForP: Angsuran[]
): number => {
  if (!p) return 0;
  // Filter angsuran for this specific loan
  const loanRepays = allAngsuranForP.filter(a => a.pinjamanId === p.id);

  // Sort them chronologically: by tanggal asc, then by bulanKe asc, then by id asc
  const sortedRepays = [...loanRepays].sort((a, b) => {
    if (a.tanggal !== b.tanggal) {
      return a.tanggal.localeCompare(b.tanggal);
    }
    const bKeA = a.bulanKe ?? 0;
    const bKeB = b.bulanKe ?? 0;
    if (bKeA !== bKeB) {
      return bKeA - bKeB;
    }
    return (a.id || '').localeCompare(b.id || '');
  });

  const currentIndex = sortedRepays.findIndex(a => a.id === currentAngsuran.id);
  const repaysUpToNow = currentIndex >= 0
    ? sortedRepays.slice(0, currentIndex + 1)
    : [
        ...sortedRepays.filter(a => (a.bulanKe ?? 0) <= (currentAngsuran.bulanKe ?? 0) || a.tanggal <= currentAngsuran.tanggal),
        currentAngsuran
      ];

  return calculateLoanOutstanding(p, repaysUpToNow);
};

export interface CooperativeRevenueBreakdown {
  pToko: number;
  pProvisi: number;
  pJasaBunga: number;
  pDenda: number;
  pBungaBank: number;
  pLain: number;
  totalRevenue: number;
}

// Single Source of Truth for calculating Total Cooperative Revenue across the entire application
export const calculateCooperativeRevenue = (
  incomeList: PendapatanLain[],
  pinjamanList: Pinjaman[],
  angsuranList: Angsuran[],
  allPinjamanForLookup?: Pinjaman[]
): CooperativeRevenueBreakdown => {
  const pinjamanLookup = allPinjamanForLookup || pinjamanList;

  // 1. Categorize manual income
  const pToko = incomeList
    .filter(i => i.sumber === 'warung')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  const pBungaBank = incomeList
    .filter(i => i.sumber === 'bunga_simpanan')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  const pDenda = incomeList
    .filter(i => i.sumber === 'denda')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  const pManualProvisi = incomeList
    .filter(i => i.sumber === 'provisi' || i.sumber === 'provisi_pinjaman')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  const pManualJasa = incomeList
    .filter(i => i.sumber === 'jasa_pinjaman' || i.sumber === 'bunga_pinjaman')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  const pLain = incomeList
    .filter(i => !['warung', 'bunga_simpanan', 'denda', 'provisi', 'provisi_pinjaman', 'jasa_pinjaman', 'bunga_pinjaman'].includes(i.sumber))
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  // 2. Real-time auto provisi from pinjaman
  const pAutoProvisi = pinjamanList.reduce((sum, p) => sum + (p.provisiDipotong || 0), 0);
  const pProvisi = pAutoProvisi + pManualProvisi;

  // 3. Real-time auto jasa pinjaman from angsuran (reconciled with double-entry loan ledger)
  const pAutoJasa = (() => {
    let totalJasa = 0;
    const processedLoanIds = new Set<string>();

    pinjamanLookup.forEach(p => {
      const repays = angsuranList.filter(a => a.pinjamanId === p.id);
      if (repays.length > 0) {
        processedLoanIds.add(p.id);
        const totalPaid = repays.reduce((sum, a) => sum + a.jumlahBayar, 0);
        const remainingPrincipal = calculateLoanOutstanding(p, repays);
        const principalRecovered = Math.max(0, p.nominalPinjaman - remainingPrincipal);
        const loanJasa = Math.max(0, totalPaid - principalRecovered);
        totalJasa += loanJasa;
      }
    });

    // Account for any standalone / orphan angsurans without matched loan in lookup
    angsuranList.forEach(a => {
      if (!a.pinjamanId || !processedLoanIds.has(a.pinjamanId)) {
        totalJasa += calculateAngsuranInterest(a);
      }
    });

    return totalJasa;
  })();
  const pJasaBunga = pAutoJasa + pManualJasa;

  const totalRevenue = pToko + pBungaBank + pDenda + pLain + pProvisi + pJasaBunga;

  return {
    pToko,
    pProvisi,
    pJasaBunga,
    pDenda,
    pBungaBank,
    pLain,
    totalRevenue
  };
};

// Helper to sort members naturally by noAnggota (e.g. AG001, AG002, ..., AG009, AG010, AG011)
export const sortMembersNaturally = (mList: Member[]): Member[] => {
  if (!mList || !Array.isArray(mList)) return [];
  return [...mList].sort((a, b) => {
    const codeA = a.noAnggota || '';
    const codeB = b.noAnggota || '';
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// Interface for Member Ledger Summary (Simpanan Pokok, Wajib, Manasuka, and Sisa Pinjaman)
export interface MemberLedgerResume {
  simpananPokok: number;
  simpananWajib: number;
  simpananManasuka: number;
  totalSimpanan?: number;
  sisaPinjaman: number;
}

// Calculate authoritative Member Ledger Resume (Pokok, Wajib, Manasuka/Sukarela, Sisa Pinjaman Beredar)
export const calculateMemberLedgerResume = (
  memberId: string,
  simpananList: Simpanan[] = [],
  pinjamanList: Pinjaman[] = [],
  angsuranList: Angsuran[] = []
): MemberLedgerResume => {
  const memberSimpanan = (simpananList || []).filter(s => s.anggotaId === memberId);
  const simpananPokok = memberSimpanan
    .filter(s => s.jenis === 'Pokok')
    .reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  const simpananWajib = memberSimpanan
    .filter(s => s.jenis === 'Wajib')
    .reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  const simpananManasuka = memberSimpanan
    .filter(s => s.jenis === 'Sukarela' || (s.jenis as string) === 'Manasuka')
    .reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
  const totalSimpanan = simpananPokok + simpananWajib + simpananManasuka;

  const memberLoans = (pinjamanList || []).filter(p => p.anggotaId === memberId && p.status === 'Belum Lunas');
  const sisaPinjaman = memberLoans.reduce((acc, p) => {
    const repays = (angsuranList || []).filter(a => a.pinjamanId === p.id);
    return acc + calculateLoanOutstanding(p, repays);
  }, 0);

  return {
    simpananPokok: Math.max(0, simpananPokok),
    simpananWajib: Math.max(0, simpananWajib),
    simpananManasuka: Math.max(0, simpananManasuka),
    totalSimpanan: Math.max(0, totalSimpanan),
    sisaPinjaman: Math.max(0, sisaPinjaman)
  };
};

// Helper to retrieve member login credentials (username and password)
export const getMemberUserCredentials = (
  memberId?: string,
  noAnggota?: string,
  userAccountsList?: UserAccount[]
): { username: string; password: string } => {
  let acc: UserAccount | undefined;

  const searchInList = (list: UserAccount[]) => {
    return list.find(u => 
      (memberId && u.anggotaId === memberId) || 
      (noAnggota && u.username && u.username.trim().toLowerCase() === noAnggota.trim().toLowerCase()) ||
      (memberId && u.id === memberId)
    );
  };

  if (userAccountsList && userAccountsList.length > 0) {
    acc = searchInList(userAccountsList);
  }

  if (!acc && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('kop_user_accounts');
      if (stored) {
        const list: UserAccount[] = JSON.parse(stored);
        if (Array.isArray(list)) {
          acc = searchInList(list);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const username = acc?.username || noAnggota || 'user';
  const password = acc?.password || '123456';
  return { username, password };
};

// Helper to build a WhatsApp Thank-You message URL for payments (Simpanan Wajib, Angsuran, etc.) with Member Ledger Resume & Portal Login details
export const createWhatsAppThankYouUrl = (
  noHp: string,
  namaMember: string,
  noAnggota: string,
  namaKoperasi: string,
  jenisPembayaran: string,
  nominal: number,
  tanggal: string,
  transaksiId?: string,
  keterangan?: string,
  ledgerResume?: MemberLedgerResume,
  memberIdOrAccount?: string | UserAccount | UserAccount[] | { username?: string; password?: string; memberId?: string }
): string => {
  let cleanPhone = (noHp || '').trim().replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.substring(1);
  } else if (cleanPhone && !cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  const formattedAmount = 'Rp ' + (Number(nominal) || 0).toLocaleString('id-ID');

  let text = `*UCAPAN TERIMA KASIH PEMBAYARAN*\n`;
  text += `*${(namaKoperasi || 'KOPERASI').toUpperCase()}*\n\n`;
  text += `Yth. *${namaMember}* (No. Anggota: ${noAnggota}),\n\n`;
  text += `Terima kasih banyak! Pembayaran *${jenisPembayaran}* Anda telah kami terima dan resmi dibukukan.\n\n`;
  text += `📋 *Rincian Transaksi:*\n`;
  text += `• Jenis Pembayaran: *${jenisPembayaran}*\n`;
  text += `• Total Nominal: *${formattedAmount}*\n`;
  text += `• Tanggal: ${tanggal}\n`;
  if (transaksiId) {
    text += `• No. Ref/Resi: ${transaksiId}\n`;
  }
  if (keterangan) {
    text += `• Catatan: ${keterangan}\n`;
  }

  if (ledgerResume) {
    const sPokok = 'Rp ' + (ledgerResume.simpananPokok || 0).toLocaleString('id-ID');
    const sWajib = 'Rp ' + (ledgerResume.simpananWajib || 0).toLocaleString('id-ID');
    const sManasuka = 'Rp ' + (ledgerResume.simpananManasuka || 0).toLocaleString('id-ID');
    const totSimp = 'Rp ' + ((ledgerResume.totalSimpanan !== undefined ? ledgerResume.totalSimpanan : (ledgerResume.simpananPokok + ledgerResume.simpananWajib + ledgerResume.simpananManasuka)) || 0).toLocaleString('id-ID');
    const sisaPinjamanText = (ledgerResume.sisaPinjaman && ledgerResume.sisaPinjaman > 0)
      ? 'Rp ' + ledgerResume.sisaPinjaman.toLocaleString('id-ID')
      : 'Rp 0 (Lunas / Tidak Ada)';

    text += `\n📊 *Resume Ledger Anggota (Posisi Terkini):*\n`;
    text += `• Simpanan Pokok: *${sPokok}*\n`;
    text += `• Simpanan Wajib: *${sWajib}*\n`;
    text += `• Simpanan Manasuka: *${sManasuka}*\n`;
    text += `• Total Simpanan: *${totSimp}*\n`;
    text += `• Sisa Pinjaman: *${sisaPinjamanText}*\n`;
  }

  // Resolve member user & password credentials
  let resolvedMemberId: string | undefined = undefined;
  let customUsername: string | undefined = undefined;
  let customPassword: string | undefined = undefined;
  let accountsList: UserAccount[] | undefined = undefined;

  if (typeof memberIdOrAccount === 'string') {
    resolvedMemberId = memberIdOrAccount;
  } else if (Array.isArray(memberIdOrAccount)) {
    accountsList = memberIdOrAccount;
  } else if (memberIdOrAccount && typeof memberIdOrAccount === 'object') {
    if ('role' in memberIdOrAccount) {
      customUsername = (memberIdOrAccount as UserAccount).username;
      customPassword = (memberIdOrAccount as UserAccount).password;
      resolvedMemberId = (memberIdOrAccount as UserAccount).anggotaId;
    } else {
      customUsername = (memberIdOrAccount as { username?: string }).username;
      customPassword = (memberIdOrAccount as { password?: string }).password;
      resolvedMemberId = (memberIdOrAccount as { memberId?: string }).memberId;
    }
  }

  let userAnggota = customUsername;
  let passAnggota = customPassword;

  if (!userAnggota || !passAnggota) {
    const creds = getMemberUserCredentials(resolvedMemberId, noAnggota, accountsList);
    if (!userAnggota) userAnggota = creds.username;
    if (!passAnggota) passAnggota = creds.password;
  }

  text += `\nUntuk melihat detail transaksi silakan login aplikasi https://danasegar.info/login\n`;
  text += `masukan user : *${userAnggota}*\n`;
  text += `pasword : *${passAnggota}*\n`;

  text += `\nSemoga Bpk/Ibu senantiasa sehat, dilimpahkan rezeki, dan penuh keberkahan. Terima kasih atas partisipasi aktif Anda di koperasi. 🤲✨\n\n`;
  text += `_Salam hangat dari Pengurus ${namaKoperasi}_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

// Helper to calculate accumulated Jasa Simpanan Manasuka since first deposit month
export const calculateAccumulatedJasaManasuka = (
  memberId: string,
  simpananList: Simpanan[],
  ratePercent: number = 0.5,
  asOfDate: Date = new Date()
): number => {
  if (!simpananList || !Array.isArray(simpananList)) return 0;
  
  // Filter all Sukarela / Manasuka transactions for this member
  const memberSukarela = simpananList.filter(
    s => s.anggotaId === memberId && (s.jenis === 'Sukarela' || (s.jenis as string) === 'Manasuka')
  );

  if (memberSukarela.length === 0) return 0;

  // Find the first deposit (first time member deposited manasuka)
  const deposits = memberSukarela.filter(s => s.jumlah > 0);
  if (deposits.length === 0) return 0;

  let earliestDateStr = deposits[0].tanggal || '';
  for (const dep of deposits) {
    if (dep.tanggal && dep.tanggal < earliestDateStr) {
      earliestDateStr = dep.tanggal;
    }
  }

  if (!earliestDateStr) return 0;

  const firstDate = new Date(earliestDateStr.substring(0, 10));
  if (isNaN(firstDate.getTime())) return 0;

  const startYear = firstDate.getFullYear();
  const startMonth = firstDate.getMonth(); // 0-indexed

  const currentYear = asOfDate.getFullYear();
  const currentMonth = asOfDate.getMonth(); // 0-indexed

  const rate = (Number(ratePercent) || 0.5) / 100;
  let totalJasa = 0;

  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    // Determine end date of month YYYY-MM-DD
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
    const mmStr = String(m + 1).padStart(2, '0');
    const endOfMonthStr = `${y}-${mmStr}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Balance of Simpanan Manasuka at this month
    const balanceAtMonth = memberSukarela
      .filter(s => {
        if (!s.tanggal) return false;
        const sDate = s.tanggal.substring(0, 10);
        return sDate <= endOfMonthStr;
      })
      .reduce((sum, s) => sum + (Number(s.jumlah) || 0), 0);

    if (balanceAtMonth > 0) {
      const monthJasa = Math.round(balanceAtMonth * rate);
      totalJasa += monthJasa;
    }

    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  return totalJasa;
};

// ================= UNIFIED MONTHLY PROFIT / LOSS & AVERAGE CALCULATION =================
export interface UnifiedMonthlyProfitItem {
  monthKey: string; // '2026-08'
  monthLabel: string; // "Agu '26"
  fullMonthLabel: string; // "Agustus 2026"
  year: number;
  monthNum: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  expenseRatio: number;
  incomeBreakdown: {
    jasaPinjaman: number;
    provisi: number;
    warung: number;
    bungaBank: number;
    denda: number;
    lainLain: number;
    manual: number;
  };
  expenseBreakdown: {
    gaji: number;
    operasional: number;
    listrik: number;
    penyusutan: number;
    lainnya: number;
  };
  incomeCount: number;
  expenseCount: number;
}

export const calculateMonthlyProfitLossSummaries = (
  incomeList: PendapatanLain[] = [],
  expensesList: BebanKoperasi[] = [],
  pinjamanList: Pinjaman[] = [],
  angsuranList: Angsuran[] = []
): UnifiedMonthlyProfitItem[] => {
  const INDO_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const INDO_MONTHS_FULL = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // 1. Build unified income items (matching ArusKasView)
  type TempIncomeItem = {
    tanggal: string;
    sumberKey: string;
    nominal: number;
    isAuto: boolean;
  };

  const allIncomeItems: TempIncomeItem[] = [];

  // Manual / categorized income
  (incomeList || []).forEach(inc => {
    let key = inc.sumber;
    if (key === 'bunga_pinjaman') key = 'jasa_pinjaman';
    if (key === 'provisi_pinjaman') key = 'provisi';
    allIncomeItems.push({
      tanggal: inc.tanggal || '',
      sumberKey: key,
      nominal: Number(inc.nominal) || 0,
      isAuto: false
    });
  });

  // Real-time provisi from pinjaman
  (pinjamanList || []).forEach(p => {
    if (p.provisiDipotong && p.provisiDipotong > 0) {
      allIncomeItems.push({
        tanggal: p.tanggal || '',
        sumberKey: 'provisi',
        nominal: Number(p.provisiDipotong) || 0,
        isAuto: true
      });
    }
  });

  // Real-time jasa pinjaman from angsuran (reconciled with authoritative loan contract ledger)
  const processedLoanIds = new Set<string>();
  (pinjamanList || []).forEach(p => {
    const repays = (angsuranList || []).filter(a => a.pinjamanId === p.id);
    if (repays.length > 0) {
      processedLoanIds.add(p.id);
      const totalPaid = repays.reduce((sum, a) => sum + (Number(a.jumlahBayar) || 0), 0);
      const remainingPrincipal = calculateLoanOutstanding(p, repays);
      const principalRecovered = Math.max(0, (Number(p.nominalPinjaman) || 0) - remainingPrincipal);
      const totalLoanJasa = Math.max(0, totalPaid - principalRecovered);

      const nominalSum = repays.reduce((sum, a) => sum + (calculateAngsuranInterest(a, p) || 0), 0);
      if (nominalSum > 0 && Math.abs(nominalSum - totalLoanJasa) > 0.01) {
        repays.forEach(a => {
          const baseInt = calculateAngsuranInterest(a, p);
          const allocated = (baseInt / nominalSum) * totalLoanJasa;
          if (allocated > 0) {
            allIncomeItems.push({
              tanggal: a.tanggal || '',
              sumberKey: 'jasa_pinjaman',
              nominal: allocated,
              isAuto: true
            });
          }
        });
      } else if (nominalSum === 0 && totalLoanJasa > 0) {
        const lastA = repays[repays.length - 1];
        allIncomeItems.push({
          tanggal: lastA.tanggal || '',
          sumberKey: 'jasa_pinjaman',
          nominal: totalLoanJasa,
          isAuto: true
        });
      } else {
        repays.forEach(a => {
          const interestAmount = calculateAngsuranInterest(a, p);
          if (interestAmount > 0) {
            allIncomeItems.push({
              tanggal: a.tanggal || '',
              sumberKey: 'jasa_pinjaman',
              nominal: interestAmount,
              isAuto: true
            });
          }
        });
      }
    }
  });

  // Account for any standalone / orphan angsurans without matched loan in lookup
  (angsuranList || []).forEach(a => {
    if (!a.pinjamanId || !processedLoanIds.has(a.pinjamanId)) {
      const interestAmount = calculateAngsuranInterest(a);
      if (interestAmount > 0) {
        allIncomeItems.push({
          tanggal: a.tanggal || '',
          sumberKey: 'jasa_pinjaman',
          nominal: interestAmount,
          isAuto: true
        });
      }
    }
  });

  // 2. Collect all distinct months
  const monthSet = new Set<string>();
  const currentYM = new Date().toISOString().substring(0, 7);
  monthSet.add(currentYM);

  allIncomeItems.forEach(item => {
    if (item.tanggal && item.tanggal.length >= 7) {
      monthSet.add(item.tanggal.substring(0, 7));
    }
  });

  (expensesList || []).forEach(item => {
    if (item.tanggal && item.tanggal.length >= 7) {
      monthSet.add(item.tanggal.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a)); // Descending by default

  return sortedMonths.map(ym => {
    const [yStr, mStr] = ym.split('-');
    const year = parseInt(yStr, 10) || 2026;
    const monthNum = parseInt(mStr, 10) || 1;
    const monthIndex = Math.max(0, Math.min(11, monthNum - 1));
    const monthLabel = `${INDO_MONTHS_SHORT[monthIndex]} '${String(year).slice(-2)}`;
    const fullMonthLabel = `${INDO_MONTHS_FULL[monthIndex]} ${year}`;

    // Filter income in this month
    const mIncomeItems = allIncomeItems.filter(i => i.tanggal && i.tanggal.startsWith(ym));
    let jasaPinjaman = 0;
    let provisi = 0;
    let warung = 0;
    let bungaBank = 0;
    let denda = 0;
    let lainLain = 0;
    let manual = 0;

    mIncomeItems.forEach(item => {
      if (item.sumberKey === 'jasa_pinjaman') jasaPinjaman += item.nominal;
      else if (item.sumberKey === 'provisi') provisi += item.nominal;
      else if (item.sumberKey === 'warung') warung += item.nominal;
      else if (item.sumberKey === 'bunga_simpanan') bungaBank += item.nominal;
      else if (item.sumberKey === 'denda') denda += item.nominal;
      else lainLain += item.nominal;

      if (!item.isAuto) manual += item.nominal;
    });

    const totalIncome = mIncomeItems.reduce((sum, item) => sum + item.nominal, 0);

    // Filter expenses in this month
    const mExpenseItems = (expensesList || []).filter(item => item.tanggal && item.tanggal.startsWith(ym));
    let gaji = 0;
    let operasional = 0;
    let listrik = 0;
    let penyusutan = 0;
    let lainnya = 0;

    mExpenseItems.forEach(item => {
      const nom = Number(item.nominal) || 0;
      if (['gaji_karyawan', 'gaji_pengurus', 'gaji_pengawas'].includes(item.kategori)) gaji += nom;
      else if (['operasional_kantor', 'beban_rapat'].includes(item.kategori)) operasional += nom;
      else if (['listrik', 'air', 'pdam'].includes(item.kategori)) listrik += nom;
      else if (['penyusutan_inventaris', 'penyusutan_aktiva_tetap'].includes(item.kategori) || item.kategori?.toLowerCase().includes('penyusutan')) penyusutan += nom;
      else lainnya += nom;
    });

    const totalExpense = mExpenseItems.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : (netProfit < 0 ? -100 : 0);
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

    return {
      monthKey: ym,
      monthLabel,
      fullMonthLabel,
      year,
      monthNum,
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      expenseRatio,
      incomeBreakdown: {
        jasaPinjaman,
        provisi,
        warung,
        bungaBank,
        denda,
        lainLain,
        manual
      },
      expenseBreakdown: {
        gaji,
        operasional,
        listrik,
        penyusutan,
        lainnya
      },
      incomeCount: mIncomeItems.length,
      expenseCount: mExpenseItems.length
    };
  });
};

export const calculateAverageMonthlyNetProfit = (
  summaries: UnifiedMonthlyProfitItem[] = []
): number => {
  if (!summaries || summaries.length === 0) return 0;
  const activeMonths = summaries.filter(m => m.totalIncome > 0 || m.totalExpense > 0);
  if (activeMonths.length === 0) return 0;
  const sumProfit = activeMonths.reduce((acc, m) => acc + m.netProfit, 0);
  return Math.round(sumProfit / activeMonths.length);
};

// ================= MONTHLY CASH FLOW (ARUS KAS MASUK & KELUAR) =================
export interface UnifiedMonthlyCashFlowItem {
  monthKey: string; // "2026-01"
  monthLabel: string; // "Jan '26"
  fullMonthLabel: string; // "Januari 2026"
  year: number;
  monthNum: number;
  
  // Kas Masuk (Inflows)
  inflowSimpananPokok: number;
  inflowSimpananWajib: number;
  inflowSimpananSukarela: number;
  totalInflowSimpanan: number;
  
  inflowAngsuranPokok: number;
  inflowAngsuranJasa: number;
  totalInflowAngsuran: number;
  
  inflowProvisi: number;
  inflowPendapatanLain: number;
  inflowPelunasanWarung: number;
  
  totalKasMasuk: number;
  
  // Kas Keluar (Outflows)
  outflowPencairanPinjaman: number;
  outflowPenarikanSimpanan: number;
  outflowPembelianPersediaan: number;
  outflowPembelianInventaris: number;
  outflowBebanGaji: number;
  outflowBebanOperasional: number;
  outflowBebanListrik: number;
  outflowBebanLain: number;
  outflowHutangWarung: number;
  totalBebanOperasionalKas: number;
  
  totalKasKeluar: number;
  
  // Net
  netCashFlow: number; // totalKasMasuk - totalKasKeluar
  saldoAwal: number;
  saldoAkhir: number;
}

export interface DetailedCashMutationItem {
  id: string;
  tanggal: string;
  tipe: 'inflow' | 'outflow';
  kategori: string;
  keterangan: string;
  nominal: number;
  refId?: string;
}

export const calculateMonthlyCashFlowSummaries = (
  setup?: KoperasiSetup | null,
  simpananList: Simpanan[] = [],
  pinjamanList: Pinjaman[] = [],
  angsuranList: Angsuran[] = [],
  incomeList: PendapatanLain[] = [],
  expensesList: BebanKoperasi[] = [],
  pembelianList: Pembelian[] = [],
  piutangWarungList: PiutangWarung[] = []
): {
  monthlySummaries: UnifiedMonthlyCashFlowItem[];
  allMutations: DetailedCashMutationItem[];
  overallTotals: {
    kasAwal: number;
    totalKasMasuk: number;
    totalKasKeluar: number;
    netCashFlow: number;
    saldoKasAkhir: number;
  };
} => {
  const INDO_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const INDO_MONTHS_FULL = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const allMutations: DetailedCashMutationItem[] = [];

  // 1. Simpanan (Positive = Inflow, Negative = Outflow)
  (simpananList || []).forEach(s => {
    const val = Number(s.jumlah) || 0;
    if (val >= 0) {
      allMutations.push({
        id: s.id || `simp-${Math.random()}`,
        tanggal: s.tanggal || '',
        tipe: 'inflow',
        kategori: `Simpanan ${s.jenis}`,
        keterangan: s.keterangan || `Setoran Simpanan ${s.jenis}`,
        nominal: val,
        refId: s.id
      });
    } else {
      allMutations.push({
        id: s.id || `simp-out-${Math.random()}`,
        tanggal: s.tanggal || '',
        tipe: 'outflow',
        kategori: `Penarikan Simpanan ${s.jenis}`,
        keterangan: s.keterangan || `Penarikan Simpanan ${s.jenis}`,
        nominal: Math.abs(val),
        refId: s.id
      });
    }
  });

  // 2. Pinjaman Diberikan (Pencairan = Outflow) + Provisi (Inflow)
  (pinjamanList || []).forEach(p => {
    const disbursed = Number(p.nominalPinjaman) || 0;
    if (disbursed > 0) {
      allMutations.push({
        id: `loan-disb-${p.id}`,
        tanggal: p.tanggal || '',
        tipe: 'outflow',
        kategori: 'Pencairan Pinjaman',
        keterangan: `Pencairan pinjaman pokok tenor ${p.tenor} bln`,
        nominal: disbursed,
        refId: p.id
      });
    }

    const provisi = Number(p.provisiDipotong) || 0;
    if (provisi > 0) {
      allMutations.push({
        id: `loan-prov-${p.id}`,
        tanggal: p.tanggal || '',
        tipe: 'inflow',
        kategori: 'Biaya Provisi Pinjaman',
        keterangan: `Pendapatan provisi pinjaman (${p.biayaProvisiPersen || 1}%)`,
        nominal: provisi,
        refId: p.id
      });
    }
  });

  // 3. Angsuran Masuk (Inflow)
  (angsuranList || []).forEach(a => {
    const amount = Number(a.jumlahBayar) || 0;
    if (amount > 0) {
      const p = (pinjamanList || []).find(loan => loan.id === a.pinjamanId);
      const pokok = a.pokokBayar !== undefined ? a.pokokBayar : calculateAngsuranPrincipal(a, p);
      const jasa = a.jasaBayar !== undefined ? a.jasaBayar : calculateAngsuranInterest(a, p);
      allMutations.push({
        id: a.id || `angs-${Math.random()}`,
        tanggal: a.tanggal || '',
        tipe: 'inflow',
        kategori: 'Angsuran Pinjaman',
        keterangan: a.keterangan || `Angsuran Pinjaman ke-${a.bulanKe || 1} (Pokok: ${formatRupiah(pokok)}, Jasa: ${formatRupiah(jasa)})`,
        nominal: amount,
        refId: a.id
      });
    }
  });

  // 4. Pendapatan Lain (Inflow) - Kecualikan provisi/jasa pinjaman manual jika sudah ada dari transaksi langsung
  (incomeList || []).forEach(inc => {
    const amount = Number(inc.nominal) || 0;
    if (amount > 0) {
      const labelKategori = inc.sumber === 'warung' ? 'Pendapatan Warung' :
        inc.sumber === 'bunga_simpanan' ? 'Bunga Rekening Bank' :
        inc.sumber === 'denda' ? 'Pendapatan Denda' :
        inc.sumber === 'jasa_pinjaman' ? 'Jasa Pinjaman (Manual)' :
        inc.sumber === 'provisi' ? 'Provisi Pinjaman (Manual)' : 'Pendapatan Lain-lain';

      allMutations.push({
        id: inc.id || `inc-${Math.random()}`,
        tanggal: inc.tanggal || '',
        tipe: 'inflow',
        kategori: labelKategori,
        keterangan: inc.keterangan || labelKategori,
        nominal: amount,
        refId: inc.id
      });
    }
  });

  // 5. Beban Operasional Kas (Outflow) - Kecualikan Beban Penyusutan karena non-kas
  (expensesList || []).forEach(exp => {
    const isPenyusutan = exp.kategori === 'penyusutan_inventaris' || 
      exp.kategori === 'penyusutan_aktiva_tetap' || 
      exp.kategori?.toLowerCase().includes('penyusutan');

    if (!isPenyusutan) {
      const amount = Number(exp.nominal) || 0;
      if (amount > 0) {
        const readableKategori = exp.kategori === 'gaji_karyawan' ? 'Beban Gaji Karyawan/Kasir' :
          exp.kategori === 'gaji_pengurus' ? 'Honor Pengurus' :
          exp.kategori === 'gaji_pengawas' ? 'Honor Pengawas' :
          exp.kategori === 'listrik' ? 'Beban Listrik, Air & WiFi' :
          exp.kategori === 'operasional_kantor' ? 'Beban Operasional Kantor & ATK' :
          exp.kategori === 'beban_rapat' ? 'Beban Rapat Anggota' : 'Beban Operasional Lain-lain';

        allMutations.push({
          id: exp.id || `exp-${Math.random()}`,
          tanggal: exp.tanggal || '',
          tipe: 'outflow',
          kategori: readableKategori,
          keterangan: exp.keterangan || readableKategori,
          nominal: amount,
          refId: exp.id
        });
      }
    }
  });

  // 6. Pembelian / Belanja Barang (Outflow)
  (pembelianList || []).forEach(pem => {
    const amount = Number(pem.totalHarga) || 0;
    if (amount > 0) {
      const kat = pem.kategori === 'inventaris' ? 'Belanja Inventaris Aset' :
        pem.kategori === 'seragam' ? 'Belanja Seragam' : 'Belanja Persediaan Toko/Warung';

      allMutations.push({
        id: pem.id || `pem-${Math.random()}`,
        tanggal: pem.tanggal || '',
        tipe: 'outflow',
        kategori: kat,
        keterangan: pem.keterangan || `${pem.namaBarang} (${pem.kuantitas || 1} unit)`,
        nominal: amount,
        refId: pem.id
      });
    }
  });

  // 7. Piutang Warung: Pelunasan (Inflow) & Hutang Baru (Outflow)
  (piutangWarungList || []).forEach(pw => {
    const amount = Number(pw.nominal) || 0;
    if (amount > 0) {
      if (pw.jenis === 'pelunasan') {
        allMutations.push({
          id: pw.id || `pw-lunas-${Math.random()}`,
          tanggal: pw.tanggal || '',
          tipe: 'inflow',
          kategori: 'Pelunasan Piutang Warung',
          keterangan: pw.keterangan || 'Pelunasan piutang/kasbon belanja anggota',
          nominal: amount,
          refId: pw.id
        });
      } else if (pw.jenis === 'hutang_baru') {
        allMutations.push({
          id: pw.id || `pw-htg-${Math.random()}`,
          tanggal: pw.tanggal || '',
          tipe: 'outflow',
          kategori: 'Talangan Belanja Warung (Kasbon)',
          keterangan: pw.keterangan || 'Pemberian kasbon / hutang belanja warung baru',
          nominal: amount,
          refId: pw.id
        });
      }
    }
  });

  // Sort all mutations by date ascending for sequential balance calculation
  allMutations.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

  // 8. Collect all distinct months (Chronological)
  const monthSet = new Set<string>();
  const currentYM = new Date().toISOString().substring(0, 7);
  monthSet.add(currentYM);

  allMutations.forEach(m => {
    if (m.tanggal && m.tanggal.length >= 7) {
      monthSet.add(m.tanggal.substring(0, 7));
    }
  });

  const sortedMonthsAsc = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

  let runningKas = setup?.kasAwal ?? 0;
  const kasAwalKeseluruhan = runningKas;

  const monthlySummariesAsc: UnifiedMonthlyCashFlowItem[] = sortedMonthsAsc.map(ym => {
    const [yStr, mStr] = ym.split('-');
    const year = parseInt(yStr, 10) || 2026;
    const monthNum = parseInt(mStr, 10) || 1;
    const monthIndex = Math.max(0, Math.min(11, monthNum - 1));
    const monthLabel = `${INDO_MONTHS_SHORT[monthIndex]} '${String(year).slice(-2)}`;
    const fullMonthLabel = `${INDO_MONTHS_FULL[monthIndex]} ${year}`;

    const saldoAwalBulan = runningKas;

    // Filter mutations in this month
    const mMutations = allMutations.filter(m => m.tanggal && m.tanggal.startsWith(ym));

    let inflowSimpananPokok = 0;
    let inflowSimpananWajib = 0;
    let inflowSimpananSukarela = 0;
    let inflowAngsuranPokok = 0;
    let inflowAngsuranJasa = 0;
    let inflowProvisi = 0;
    let inflowPendapatanLain = 0;
    let inflowPelunasanWarung = 0;

    let outflowPencairanPinjaman = 0;
    let outflowPenarikanSimpanan = 0;
    let outflowPembelianPersediaan = 0;
    let outflowPembelianInventaris = 0;
    let outflowBebanGaji = 0;
    let outflowBebanOperasional = 0;
    let outflowBebanListrik = 0;
    let outflowBebanLain = 0;
    let outflowHutangWarung = 0;

    mMutations.forEach(m => {
      if (m.tipe === 'inflow') {
        if (m.kategori.includes('Simpanan Pokok')) inflowSimpananPokok += m.nominal;
        else if (m.kategori.includes('Simpanan Wajib')) inflowSimpananWajib += m.nominal;
        else if (m.kategori.includes('Simpanan Sukarela') || m.kategori.includes('Manasuka')) inflowSimpananSukarela += m.nominal;
        else if (m.kategori === 'Angsuran Pinjaman') {
          // Check breakdown if available
          inflowAngsuranPokok += m.nominal;
        } else if (m.kategori === 'Biaya Provisi Pinjaman' || m.kategori.includes('Provisi')) {
          inflowProvisi += m.nominal;
        } else if (m.kategori === 'Pelunasan Piutang Warung') {
          inflowPelunasanWarung += m.nominal;
        } else {
          inflowPendapatanLain += m.nominal;
        }
      } else {
        if (m.kategori === 'Pencairan Pinjaman') outflowPencairanPinjaman += m.nominal;
        else if (m.kategori.includes('Penarikan Simpanan')) outflowPenarikanSimpanan += m.nominal;
        else if (m.kategori.includes('Persediaan')) outflowPembelianPersediaan += m.nominal;
        else if (m.kategori.includes('Inventaris')) outflowPembelianInventaris += m.nominal;
        else if (m.kategori.includes('Gaji') || m.kategori.includes('Honor')) outflowBebanGaji += m.nominal;
        else if (m.kategori.includes('Listrik')) outflowBebanListrik += m.nominal;
        else if (m.kategori.includes('Kantor') || m.kategori.includes('Rapat')) outflowBebanOperasional += m.nominal;
        else if (m.kategori.includes('Talangan') || m.kategori.includes('Hutang')) outflowHutangWarung += m.nominal;
        else outflowBebanLain += m.nominal;
      }
    });

    const totalInflowSimpanan = inflowSimpananPokok + inflowSimpananWajib + inflowSimpananSukarela;
    const totalInflowAngsuran = inflowAngsuranPokok + inflowAngsuranJasa;
    const totalKasMasuk = totalInflowSimpanan + totalInflowAngsuran + inflowProvisi + inflowPendapatanLain + inflowPelunasanWarung;

    const totalBebanOperasionalKas = outflowBebanGaji + outflowBebanOperasional + outflowBebanListrik + outflowBebanLain;
    const totalKasKeluar = outflowPencairanPinjaman + outflowPenarikanSimpanan + outflowPembelianPersediaan + outflowPembelianInventaris + totalBebanOperasionalKas + outflowHutangWarung;

    const netCashFlow = totalKasMasuk - totalKasKeluar;
    runningKas += netCashFlow;
    const saldoAkhirBulan = runningKas;

    return {
      monthKey: ym,
      monthLabel,
      fullMonthLabel,
      year,
      monthNum,
      inflowSimpananPokok,
      inflowSimpananWajib,
      inflowSimpananSukarela,
      totalInflowSimpanan,
      inflowAngsuranPokok,
      inflowAngsuranJasa,
      totalInflowAngsuran,
      inflowProvisi,
      inflowPendapatanLain,
      inflowPelunasanWarung,
      totalKasMasuk,
      outflowPencairanPinjaman,
      outflowPenarikanSimpanan,
      outflowPembelianPersediaan,
      outflowPembelianInventaris,
      outflowBebanGaji,
      outflowBebanOperasional,
      outflowBebanListrik,
      outflowBebanLain,
      outflowHutangWarung,
      totalBebanOperasionalKas,
      totalKasKeluar,
      netCashFlow,
      saldoAwal: saldoAwalBulan,
      saldoAkhir: saldoAkhirBulan
    };
  });

  const totalKasMasukAll = monthlySummariesAsc.reduce((sum, m) => sum + m.totalKasMasuk, 0);
  const totalKasKeluarAll = monthlySummariesAsc.reduce((sum, m) => sum + m.totalKasKeluar, 0);
  const netCashFlowAll = totalKasMasukAll - totalKasKeluarAll;

  return {
    monthlySummaries: monthlySummariesAsc,
    allMutations: [...allMutations].reverse(), // default newest first
    overallTotals: {
      kasAwal: kasAwalKeseluruhan,
      totalKasMasuk: totalKasMasukAll,
      totalKasKeluar: totalKasKeluarAll,
      netCashFlow: netCashFlowAll,
      saldoKasAkhir: runningKas
    }
  };
};




