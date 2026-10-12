import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Printer, QrCode, CreditCard, RotateCw, CheckCircle2, 
  Share2, Users, Search, Sparkles, Building2, Phone, Calendar, ShieldCheck,
  FileDown, ChevronLeft, ChevronRight, Layers, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { Member, KoperasiSetup } from '../types';

interface DigitalMemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  allMembers?: Member[];
  setup?: KoperasiSetup;
  namaKetua?: string;
  onSelectMember?: (member: Member) => void;
}

export function DigitalMemberCardModal({
  isOpen,
  onClose,
  member,
  allMembers = [],
  setup,
  namaKetua = 'Pengurus Koperasi',
  onSelectMember
}: DigitalMemberCardModalProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('front');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMemberIndex, setCurrentMemberIndex] = useState<number>(0);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Batch Print Modal State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchLimit, setBatchLimit] = useState<'all' | 'verified' | '5' | '10'>('all');

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync current member index
  useEffect(() => {
    if (member && allMembers.length > 0) {
      const idx = allMembers.findIndex(m => m.id === member.id);
      if (idx !== -1) setCurrentMemberIndex(idx);
    }
  }, [member, allMembers]);

  const activeMember = member || (allMembers.length > 0 ? allMembers[currentMemberIndex] : null);

  // Generate QR Code data URL whenever active member changes
  useEffect(() => {
    if (!activeMember) return;
    
    // Structured payload for instant cooperative scanner detection
    const payload = JSON.stringify({
      app: 'KOPERASI_DANA_SEGAR',
      type: 'MEMBER_CARD',
      id: activeMember.id,
      noAnggota: activeMember.noAnggota,
      nama: activeMember.nama
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#064e3b', // Deep emerald
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    }).then(url => {
      setQrDataUrl(url);
    }).catch(err => {
      console.error('Error generating QR Code:', err);
      // Fallback with simple noAnggota
      QRCode.toDataURL(activeMember.noAnggota, { width: 320, margin: 1 })
        .then(setQrDataUrl)
        .catch(console.error);
    });
  }, [activeMember]);

  // Generate Barcode on SVG
  useEffect(() => {
    if (!activeMember || !barcodeSvgRef.current) return;
    try {
      JsBarcode(barcodeSvgRef.current, activeMember.noAnggota, {
        format: 'CODE128',
        width: 1.8,
        height: 38,
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 2,
        margin: 4,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
    } catch (e) {
      console.warn('Barcode generation warning:', e);
    }
  }, [activeMember, activeSide]);

  if (!isOpen || !activeMember) return null;

  const kopName = setup?.namaKoperasi || "Koperasi Dana Segar";
  const slogan = setup?.slogan || "Maju Bersama Menuju Kesejahteraan";
  const alamat = setup?.alamatKantor || "Kantor Pusat Koperasi";
  const bhNo = setup?.noBadanHukum ? `BH No: ${setup.noBadanHukum}` : "Badan Hukum Koperasi Resmi";

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePrevMember = () => {
    if (allMembers.length === 0) return;
    const nextIdx = (currentMemberIndex - 1 + allMembers.length) % allMembers.length;
    setCurrentMemberIndex(nextIdx);
    if (onSelectMember) onSelectMember(allMembers[nextIdx]);
  };

  const handleNextMember = () => {
    if (allMembers.length === 0) return;
    const nextIdx = (currentMemberIndex + 1) % allMembers.length;
    setCurrentMemberIndex(nextIdx);
    if (onSelectMember) onSelectMember(allMembers[nextIdx]);
  };

  const handleCopyCode = () => {
    if (!activeMember) return;
    navigator.clipboard.writeText(activeMember.noAnggota);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!activeMember) return;
    const text = encodeURIComponent(
      `*KARTU ANGGOTA DIGITAL*\n` +
      `Koperasi: *${kopName}*\n` +
      `--------------------------------\n` +
      `No. Anggota : *${activeMember.noAnggota}*\n` +
      `Nama Lengkap: *${activeMember.nama}*\n` +
      `Status      : Anggota Aktif Terverifikasi\n` +
      `Bergabung   : ${formatDateIndo(activeMember.tanggalBergabung)}\n` +
      `--------------------------------\n` +
      `Tunjukkan kartu digital ini saat berbelanja di Kasir Warung POS atau melakukan transaksi Simpan Pinjam.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Render high-resolution Front Card to Canvas
  const drawFrontCardToCanvas = async (m: Member): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    // 300 DPI for CR80 Card: 1011 x 638 pixels
    canvas.width = 1011;
    canvas.height = 638;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Background Gradient (Deep emerald luxury look)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#064e3b');   // emerald-900
    gradient.addColorStop(0.5, '#047857'); // emerald-700
    gradient.addColorStop(1, '#0f172a');   // slate-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Guilloche decorative wave pattern simulation
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let i = -200; i < canvas.width + 200; i += 40) {
      ctx.beginPath();
      ctx.arc(i, canvas.height / 2, 450, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Top Header Banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(0, 0, canvas.width, 140);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 140);
    ctx.lineTo(canvas.width, 140);
    ctx.stroke();

    // Logo Koperasi
    let logoDrawn = false;
    if (setup?.logoUrl) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          logoImg.onload = res;
          logoImg.onerror = rej;
          logoImg.src = setup.logoUrl;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(85, 70, 48, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, 37, 22, 96, 96);
        ctx.restore();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(85, 70, 48, 0, Math.PI * 2);
        ctx.stroke();
        logoDrawn = true;
      } catch (e) {
        console.warn('Could not render logo to canvas, using fallback', e);
      }
    }

    if (!logoDrawn) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(85, 70, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌱', 85, 70);
    }

    // Organization Header Texts
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(kopName.toUpperCase(), 155, 60);

    ctx.fillStyle = '#a7f3d0'; // emerald-200
    ctx.font = '18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${bhNo}  •  ${slogan}`, 155, 92);

    // Gold EMV Smart Chip Graphic (Left side)
    const chipX = 50;
    const chipY = 170;
    const chipW = 86;
    const chipH = 68;
    ctx.fillStyle = '#eab308'; // Amber gold
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 10);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Chip contact lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(chipX + 28, chipY);
    ctx.lineTo(chipX + 28, chipY + chipH);
    ctx.moveTo(chipX + 58, chipY);
    ctx.lineTo(chipX + 58, chipY + chipH);
    ctx.moveTo(chipX, chipY + 34);
    ctx.lineTo(chipX + chipW, chipY + 34);
    ctx.stroke();

    // Member Photo Box
    const photoX = 50;
    const photoY = 265;
    const photoW = 190;
    const photoH = 250;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoW, photoH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    let photoDrawn = false;
    if (m.fotoUrl) {
      try {
        const photoImg = new Image();
        photoImg.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          photoImg.onload = res;
          photoImg.onerror = rej;
          photoImg.src = m.fotoUrl!;
        });
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(photoX + 4, photoY + 4, photoW - 8, photoH - 8, 10);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(photoImg, photoX + 4, photoY + 4, photoW - 8, photoH - 8);
        ctx.restore();
        photoDrawn = true;
      } catch (e) {
        console.warn('Could not draw photo to canvas', e);
      }
    }

    if (!photoDrawn) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(photoX + 4, photoY + 4, photoW - 8, photoH - 8, 10);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.nama.charAt(0).toUpperCase() || 'A', photoX + photoW / 2, photoY + photoH / 2);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('PAS FOTO', photoX + photoW / 2, photoY + photoH / 2 + 50);
    }

    // Member Details Box
    const textStartX = 270;
    ctx.textAlign = 'left';

    // Member Number Badge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(textStartX, 168, 260, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText(m.noAnggota, textStartX + 18, 202);

    // Verified badge
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(textStartX + 275, 168, 175, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✓ ANGGOTA AKTIF', textStartX + 292, 198);

    // Full Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
    const cleanName = m.nama.length > 22 ? m.nama.substring(0, 22) + '...' : m.nama;
    ctx.fillText(cleanName.toUpperCase(), textStartX, 265);

    // Detailed Metadata Fields
    const drawMetaRow = (label: string, value: string, yPos: number) => {
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(label.toUpperCase(), textStartX, yPos);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(value, textStartX + 180, yPos);
    };

    drawMetaRow('Pekerjaan', m.pekerjaan || 'Guru / Karyawan', 315);
    drawMetaRow('TTL', `${m.tempatLahir || '-'}${m.tanggalLahir ? `, ${formatDateIndo(m.tanggalLahir)}` : ''}`, 355);
    drawMetaRow('No. Ponsel', m.noHp || '-', 395);
    drawMetaRow('Bergabung', formatDateIndo(m.tanggalBergabung), 435);

    // Right Side: High-contrast Scannable QR Code
    const qrSize = 190;
    const qrX = canvas.width - qrSize - 45;
    const qrY = 295;

    // QR Code White Frame Card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 56, 14);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw generated QR image
    try {
      const qrData = await QRCode.toDataURL(JSON.stringify({
        app: 'KOPERASI_DANA_SEGAR',
        type: 'MEMBER_CARD',
        id: m.id,
        noAnggota: m.noAnggota,
        nama: m.nama
      }), { width: 300, margin: 1, errorCorrectionLevel: 'H' });

      const qrImg = new Image();
      await new Promise((res, rej) => {
        qrImg.onload = res;
        qrImg.onerror = rej;
        qrImg.src = qrData;
      });
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN KASIR / TELLER', qrX + qrSize / 2, qrY + qrSize + 22);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(m.noAnggota, qrX + qrSize / 2, qrY + qrSize + 36);
    } catch (e) {
      console.warn('QR code canvas error', e);
    }

    // Bottom Bar (Official Footer)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('KARTU TANDA ANGGOTA ELEKTRONIK (KTA DIGITAL)', 50, canvas.height - 18);
    ctx.textAlign = 'right';
    ctx.fillText(alamat, canvas.width - 50, canvas.height - 18);

    return canvas;
  };

  // Render high-resolution Back Card to Canvas
  const drawBackCardToCanvas = async (m: Member): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1011;
    canvas.height = 638;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // White / Light Platinum Clean Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Magnetic Stripe Simulation at top (Black bar)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 40, canvas.width, 85);

    // Decorative Header
    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('KETENTUAN & TATA TERTIB PENGGUNAAN KARTU ANGGOTA', 50, 175);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 195);
    ctx.lineTo(canvas.width - 50, 195);
    ctx.stroke();

    // Terms & Conditions Rules
    const rules = [
      '1. Kartu ini merupakan kartu tanda pengenal sah Anggota Koperasi Simpan Pinjam & Usaha.',
      '2. Kartu wajib dibawa atau ditunjukkan (via ponsel) saat berbelanja di Kasir Warung POS.',
      '3. Kasir dapat men-scan QR Code / Barcode pada kartu ini untuk pencatatan otomatis transaksi.',
      '4. Hak suara dalam Rapat Anggota Tahunan (RAT) hanya berlaku bagi pemegang sah kartu ini.',
      '5. Segala bentuk penyalahgunaan kartu ini dapat berakibat pada pembekuan hak keanggotaan.',
      '6. Jika kartu hilang atau ditemukan oleh pihak lain, harap segera menghubungi kantor koperasi.'
    ];

    ctx.fillStyle = '#334155'; // slate-700
    ctx.font = '17px "Segoe UI", Roboto, sans-serif';
    rules.forEach((rule, idx) => {
      ctx.fillText(rule, 50, 235 + (idx * 34));
    });

    // Bottom Divider
    const bottomDivY = 460;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, bottomDivY);
    ctx.lineTo(canvas.width - 50, bottomDivY);
    ctx.stroke();

    // Barcode Section (Bottom Left)
    try {
      // Create temporary svg to convert to canvas
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(tempSvg, m.noAnggota, {
        format: 'CODE128',
        width: 2.2,
        height: 60,
        displayValue: true,
        fontSize: 16,
        font: 'monospace',
        textMargin: 6,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
      const svgXml = new XMLSerializer().serializeToString(tempSvg);
      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgXml)));
      const barcodeImg = new Image();
      await new Promise((res, rej) => {
        barcodeImg.onload = res;
        barcodeImg.onerror = rej;
        barcodeImg.src = svgDataUrl;
      });
      ctx.drawImage(barcodeImg, 50, bottomDivY + 25, 340, 110);
    } catch (e) {
      console.warn('Barcode render error', e);
    }

    // Official Stamp & Chairman Signature (Bottom Right)
    const signX = canvas.width - 260;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '16px sans-serif';
    ctx.fillText('Disahkan oleh Pengurus Koperasi,', signX, bottomDivY + 30);

    // Stamp / Cap seal simulation
    ctx.strokeStyle = 'rgba(5, 150, 105, 0.4)'; // emerald stamp
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(signX - 40, bottomDivY + 75, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(5, 150, 105, 0.6)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('KOPERASI RESMI', signX - 40, bottomDivY + 75);

    // Signature Line
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(namaKetua, signX, bottomDivY + 115);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Ketua Pengurus', signX, bottomDivY + 135);

    return canvas;
  };

  // Download high-resolution PNG Image
  const handleDownloadPNG = async (side: 'front' | 'back' = 'front') => {
    if (!activeMember) return;
    setIsGenerating(true);
    try {
      const canvas = side === 'front' 
        ? await drawFrontCardToCanvas(activeMember)
        : await drawBackCardToCanvas(activeMember);

      const link = document.createElement('a');
      link.download = `Kartu_Anggota_${activeMember.noAnggota}_${activeMember.nama.replace(/\s+/g, '_')}_${side.toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Failed to download card PNG:', err);
      alert('Gagal mengunduh gambar kartu anggota.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download single card PDF
  const handleDownloadSinglePDF = async () => {
    if (!activeMember) return;
    setIsGenerating(true);
    try {
      const frontCanvas = await drawFrontCardToCanvas(activeMember);
      const backCanvas = await drawBackCardToCanvas(activeMember);

      // Standard A4 landscape or card document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(6, 78, 59); // Emerald
      doc.text("KARTU TANDA ANGGOTA DIGITAL (KTA)", 105, 20, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`${kopName} — ${bhNo}`, 105, 27, { align: 'center' });

      // Standard CR80 card in mm: 85.6 mm x 53.98 mm
      const cardW = 85.6;
      const cardH = 53.98;

      // Draw Front Card
      doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 20, 38, cardW, cardH);
      // Draw Back Card next to it or below
      doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 110, 38, cardW, cardH);

      // Print instructions box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 105, 175.6, 50, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PETUNJUK PENCETAKAN & PENGGUNAAN KARTU:", 25, 115);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("1. Cetak pada kertas tebal / glossy paper 230-260 gsm atau printer kartu PVC standar.", 25, 122);
      doc.text("2. Gunting mengikuti garis tepi kartu (ukuran standar KTP/ATM: 85.6 mm x 53.98 mm).", 25, 129);
      doc.text("3. Rekatkan sisi Depan dan Belakang lalu lakukan laminasi panas untuk daya tahan maksimal.", 25, 136);
      doc.text("4. QR Code dan Barcode dapat di-scan langsung di Mesin Kasir POS Warung dan Kasir Simpan Pinjam.", 25, 143);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | No. Anggota: ${activeMember.noAnggota}`, 105, 280, { align: 'center' });

      doc.save(`KTA_${activeMember.noAnggota}_${activeMember.nama.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal membuat dokumen PDF kartu.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch Print All Members PDF (A4 sheet grid)
  const handleBatchPrintPDF = async () => {
    if (allMembers.length === 0) return;
    setIsGenerating(true);
    try {
      let targetList = [...allMembers];
      if (batchLimit === 'verified') {
        targetList = targetList.filter(m => m.isVerified !== false);
      } else if (batchLimit === '5') {
        targetList = targetList.slice(0, 5);
      } else if (batchLimit === '10') {
        targetList = targetList.slice(0, 10);
      }

      if (targetList.length === 0) {
        alert("Tidak ada anggota yang memenuhi kriteria pencetakan.");
        setIsGenerating(false);
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const cardW = 85.6;
      const cardH = 53.98;
      // 4 cards per page (2 rows x 2 columns) with cutting margins
      const marginX = 14;
      const marginY = 20;
      const gapX = 10;
      const gapY = 14;

      let cardIndexOnPage = 0;

      for (let i = 0; i < targetList.length; i++) {
        const m = targetList[i];
        if (cardIndexOnPage === 4) {
          doc.addPage();
          cardIndexOnPage = 0;
        }

        const col = cardIndexOnPage % 2;
        const row = Math.floor(cardIndexOnPage / 2);

        const xPos = marginX + (col * (cardW + gapX));
        const yPos = marginY + (row * (cardH + gapY));

        const canvas = await drawFrontCardToCanvas(m);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', xPos, yPos, cardW, cardH);

        // Cutting guides (dashed cross marks)
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(xPos - 0.5, yPos - 0.5, cardW + 1, cardH + 1);
        doc.setLineDashPattern([], 0);

        cardIndexOnPage++;
      }

      doc.save(`Lembar_KTA_Massal_${targetList.length}_Anggota.pdf`);
      setIsBatchMode(false);
    } catch (err) {
      console.error('Batch print failed:', err);
      alert('Gagal memproses cetak massal kartu anggota.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPickList = allMembers.filter(m => 
    m.nama.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    m.noAnggota.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        >
          {/* Top Modal Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-emerald-700/60">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/15 shadow-inner">
                <CreditCard className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                  <span>Kartu Anggota Digital Koperasi</span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 uppercase">
                    QR & Barcode Ready
                  </span>
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Identitas resmi anggota dilengkapi kode QR scannable untuk transaksi kasir warung POS & kasir simpan pinjam.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member Navigator Bar (When multiple members available) */}
          {allMembers.length > 1 && (
            <div className="bg-slate-50 dark:bg-slate-850 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMember}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition text-slate-700 dark:text-slate-200 cursor-pointer"
                  title="Anggota Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMemberPicker(!showMemberPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 hover:border-emerald-500 transition cursor-pointer"
                  >
                    <span>{activeMember.nama}</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">({activeMember.noAnggota})</span>
                    <span className="text-[10px] text-slate-400">({currentMemberIndex + 1}/{allMembers.length})</span>
                  </button>

                  {/* Dropdown Member Picker */}
                  {showMemberPicker && (
                    <div className="absolute left-0 top-full mt-1.5 w-72 max-h-60 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <input
                          type="text"
                          placeholder="Cari anggota lain..."
                          value={searchMemberQuery}
                          onChange={(e) => setSearchMemberQuery(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-emerald-500"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPickList.map((m, idx) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const targetIdx = allMembers.findIndex(x => x.id === m.id);
                              setCurrentMemberIndex(targetIdx);
                              if (onSelectMember) onSelectMember(m);
                              setShowMemberPicker(false);
                            }}
                            className={`w-full p-2.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex items-center justify-between ${
                              m.id === activeMember.id ? 'bg-emerald-50 dark:bg-emerald-950/60 font-bold text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{m.nama}</span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">{m.noAnggota}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleNextMember}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition text-slate-700 dark:text-slate-200 cursor-pointer"
                  title="Anggota Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    activeSide === 'front' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Sisi Depan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    activeSide === 'back' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Sisi Belakang
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('both')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer hidden sm:block ${
                    activeSide === 'both' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Dua Sisi
                </button>
              </div>
            </div>
          )}

          {/* Modal Main Content Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Quick Operational Scan Notice */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                  <QrCode className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">
                    Siap Scan di Kasir Warung POS & Kas Masuk
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Arahkan kamera scanner kasir ke QR Code pada kartu ini untuk deteksi otomatis nama anggota tanpa mengetik.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-1.5 hover:bg-emerald-100/50 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedCode ? 'Tersalin!' : activeMember.noAnggota}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>

            {/* CARD DISPLAY PREVIEW */}
            <div className="flex flex-wrap items-center justify-center gap-8 py-2">
              
              {/* SISI DEPAN (FRONT) */}
              {(activeSide === 'front' || activeSide === 'both') && (
                <div className="flex flex-col items-center space-y-2 w-full max-w-[420px]">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tampak Depan (Front View)
                  </span>

                  {/* Physical Card Container with ISO 7810 Aspect Ratio (85.6mm / 53.98mm = ~1.586) */}
                  <div
                    className="w-full aspect-[85.6/53.98] rounded-[20px] shadow-2xl overflow-hidden border border-emerald-700/40 flex flex-col justify-between p-4 relative select-none text-white transition-transform hover:scale-[1.01]"
                    style={{
                      background: setup?.kartuBgUrl 
                        ? `url('${setup.kartuBgUrl}') center center / cover no-repeat` 
                        : 'linear-gradient(135deg, #064e3b 0%, #047857 55%, #0f172a 100%)'
                    }}
                  >
                    {/* Security Microprint Guilloche Overlay */}
                    <div 
                      className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)`,
                        backgroundSize: '16px 16px'
                      }}
                    />

                    {/* Card Header */}
                    <div className="flex items-center gap-2.5 border-b border-white/20 pb-2 relative z-10">
                      {setup?.logoUrl ? (
                        <img 
                          src={setup.logoUrl} 
                          alt="Logo Koperasi" 
                          className="w-9 h-9 rounded-full object-cover border-2 border-white/40 p-[1px] bg-white shrink-0 shadow-sm" 
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/30 shadow-xs">
                          🌱
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-xs sm:text-[13px] uppercase tracking-tight text-white leading-tight truncate">
                          {kopName}
                        </h4>
                        <p className="text-[7.5px] font-medium text-emerald-200 uppercase tracking-wider leading-none mt-0.5 truncate">
                          {bhNo}  •  {slogan}
                        </p>
                      </div>
                    </div>

                    {/* Card Body Grid */}
                    <div className="flex gap-3 items-center flex-1 py-2 relative z-10">
                      
                      {/* Left Side: Photo + Smart Chip */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        {/* Golden Chip */}
                        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border border-amber-600 shadow-xs flex items-center justify-center relative overflow-hidden">
                          <div className="w-full h-[1px] bg-amber-700/40 absolute top-1/2 -translate-y-1/2" />
                          <div className="w-[1px] h-full bg-amber-700/40 absolute left-1/3" />
                          <div className="w-[1px] h-full bg-amber-700/40 absolute right-1/3" />
                        </div>

                        {/* Pas Foto 3x4 */}
                        <div className="w-[66px] h-[86px] rounded-lg border-2 border-white/40 bg-slate-800/60 overflow-hidden shadow-md flex items-center justify-center">
                          {activeMember.fotoUrl ? (
                            <img src={activeMember.fotoUrl} alt={activeMember.nama} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-emerald-950/80 text-emerald-300 flex flex-col items-center justify-center text-[8px] font-extrabold gap-0.5">
                              <Users className="w-5 h-5 text-emerald-400/80" />
                              <span className="text-[6px] tracking-wider uppercase">FOTO 3X4</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Member Details */}
                      <div className="flex-1 min-w-0 space-y-1 text-left">
                        {/* Member Code */}
                        <div className="inline-block bg-white text-emerald-950 font-mono text-[11px] font-black px-2 py-0.5 rounded shadow-xs tracking-wider">
                          {activeMember.noAnggota}
                        </div>

                        {/* Full Name */}
                        <h3 className="font-extrabold text-sm sm:text-[15px] uppercase tracking-tight text-white leading-tight truncate">
                          {activeMember.nama}
                        </h3>

                        {/* Metadata Rows */}
                        <div className="space-y-0.5 text-[8.5px] pt-0.5 border-t border-white/10">
                          <div className="flex items-center text-emerald-100">
                            <span className="w-16 text-emerald-300 font-bold uppercase tracking-wider text-[7.5px]">Pekerjaan</span>
                            <span className="mr-1">:</span>
                            <span className="font-semibold truncate">{activeMember.pekerjaan || 'Guru / Karyawan'}</span>
                          </div>
                          <div className="flex items-center text-emerald-100">
                            <span className="w-16 text-emerald-300 font-bold uppercase tracking-wider text-[7.5px]">TTL</span>
                            <span className="mr-1">:</span>
                            <span className="font-semibold truncate">
                              {activeMember.tempatLahir || '-'}{activeMember.tanggalLahir ? `, ${formatDateIndo(activeMember.tanggalLahir)}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center text-emerald-100">
                            <span className="w-16 text-emerald-300 font-bold uppercase tracking-wider text-[7.5px]">Bergabung</span>
                            <span className="mr-1">:</span>
                            <span className="font-semibold truncate">{formatDateIndo(activeMember.tanggalBergabung)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: QR Code Frame */}
                      <div className="shrink-0 flex flex-col items-center bg-white p-1 rounded-xl shadow-md border border-white">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="QR Code Anggota" className="w-[68px] h-[68px] object-contain rounded" />
                        ) : (
                          <div className="w-[68px] h-[68px] bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                            QR Loading...
                          </div>
                        )}
                        <span className="text-[6.5px] font-black text-emerald-950 uppercase tracking-wider mt-0.5">
                          SCAN KASIR
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between text-[6.5px] font-bold text-emerald-200 border-t border-white/15 pt-1.5 relative z-10 leading-none">
                      <span className="tracking-wide">KARTU TANDA ANGGOTA DIGITAL</span>
                      <span className="truncate max-w-[200px]">{alamat}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SISI BELAKANG (BACK) */}
              {(activeSide === 'back' || activeSide === 'both') && (
                <div className="flex flex-col items-center space-y-2 w-full max-w-[420px]">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tampak Belakang (Back View)
                  </span>

                  {/* Back Card */}
                  <div className="w-full aspect-[85.6/53.98] rounded-[20px] bg-white shadow-2xl overflow-hidden border border-slate-300 flex flex-col justify-between p-4 relative select-none text-slate-800 text-left transition-transform hover:scale-[1.01]">
                    {/* Magnetic Stripe Strip */}
                    <div className="absolute top-3 left-0 right-0 h-7 bg-slate-900" />

                    {/* Content Section below stripe */}
                    <div className="pt-8">
                      <div className="font-extrabold text-[8.5px] uppercase tracking-wider text-emerald-800 border-b border-slate-200 pb-0.5">
                        Ketentuan Penggunaan Kartu Anggota
                      </div>
                      <ol className="text-[6.5px] text-slate-600 leading-tight mt-1 space-y-0.5 list-decimal pl-3">
                        <li>Kartu ini adalah identitas resmi Anggota {kopName}.</li>
                        <li>Tunjukkan kartu / QR Code saat berbelanja di Kasir POS Warung atau bertransaksi Simpan Pinjam.</li>
                        <li>Hak pembagian SHU dan partisipasi RAT hanya berlaku bagi anggota pemegang sah kartu.</li>
                        <li>Penyalahgunaan kartu dapat dikenai sanksi organisasi sesuai Anggaran Dasar Koperasi.</li>
                        <li>Jika menemukan kartu ini, harap hubungi: {alamat}.</li>
                      </ol>
                    </div>

                    {/* Bottom Area: Barcode & Chairman Stamp */}
                    <div className="flex items-end justify-between border-t border-slate-200 pt-1.5">
                      {/* Barcode SVG Container */}
                      <div className="flex flex-col items-center">
                        <svg ref={barcodeSvgRef} className="max-w-[170px] h-[36px]" />
                      </div>

                      {/* Official Stamp & Signature */}
                      <div className="text-center text-[7px] leading-tight flex flex-col items-center">
                        <span className="text-slate-500 font-semibold">Pengurus Koperasi,</span>
                        <div className="h-2" />
                        <span className="font-extrabold underline text-slate-900 truncate max-w-[120px]">
                          {namaKetua}
                        </span>
                        <span className="text-slate-500 text-[6px]">Ketua Pengurus</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadPNG('front')}
                disabled={isGenerating}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Gambar Depan (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPNG('back')}
                disabled={isGenerating}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Gambar Belakang (PNG)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSinglePDF}
                disabled={isGenerating}
                className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>Cetak Kartu PDF (Satuan)</span>
              </button>
            </div>

            {/* Batch Print Feature for Admin */}
            {allMembers.length > 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Cetak Kartu Anggota Massal (Batch Print Lembar A4)</span>
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Cetak banyak kartu anggota sekaligus dalam lembar kertas A4 siap potong dan laminasi.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(e.target.value as any)}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">Semua Anggota ({allMembers.length})</option>
                    <option value="verified">Hanya Terverifikasi ({allMembers.filter(m => m.isVerified !== false).length})</option>
                    <option value="5">5 Anggota Pertama</option>
                    <option value="10">10 Anggota Pertama</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleBatchPrintPDF}
                    disabled={isGenerating}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isGenerating ? 'Memproses...' : 'Cetak Massal PDF'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Close */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
