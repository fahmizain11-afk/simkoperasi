import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Printer, X, Tag, Barcode as BarcodeIcon, CheckSquare, Square, 
  Search, Sliders, RefreshCw, Sparkles, AlertCircle, Copy, Check,
  Grid, FileText, ChevronRight, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JsBarcode from 'jsbarcode';
import { WarungBarang, KoperasiSetup } from '../types';
import { formatRupiah } from '../utils/finance';

interface CetakLabelRakModalProps {
  isOpen: boolean;
  onClose: () => void;
  warungBarang: WarungBarang[];
  onUpdateBarang?: (item: WarungBarang) => Promise<void>;
  setup?: KoperasiSetup;
}

// Helper component to render SVG Barcode
function BarcodeSvg({ 
  code, 
  height = 36, 
  width = 1.5, 
  displayValue = true,
  className = "" 
}: { 
  code: string; 
  height?: number; 
  width?: number; 
  displayValue?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      const isEan13 = /^\d{13}$/.test(code.trim());
      JsBarcode(svgRef.current, code.trim(), {
        format: isEan13 ? "EAN13" : "CODE128",
        width,
        height,
        displayValue,
        fontSize: 10,
        font: "monospace",
        textMargin: 1,
        margin: 2,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch {
      try {
        // Fallback to CODE128
        JsBarcode(svgRef.current, code.trim(), {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize: 9,
          font: "monospace",
          textMargin: 1,
          margin: 2,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (err2) {
        console.warn("Barcode rendering failed for code:", code, err2);
      }
    }
  }, [code, height, width, displayValue]);

  if (!code) {
    return <div className="text-[10px] text-slate-400 italic">Tanpa Barcode</div>;
  }

  return (
    <div className={`flex flex-col items-center justify-center overflow-hidden ${className}`}>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}

// Helper EAN-13 generator with modulo-10 checksum
export function generateStoreEan13(index: number): string {
  const base12 = "20" + String(index).padStart(10, '0').slice(-10);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(base12[i], 10);
    sum += (i % 2 === 0 ? 1 : 3) * d;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base12}${check}`;
}

export function CetakLabelRakModal({
  isOpen,
  onClose,
  warungBarang,
  onUpdateBarang,
  setup
}: CetakLabelRakModalProps) {
  // Print Template:
  // 'shelf': Label Rak Minimarket (65 x 38 mm)
  // 'sticker': Stiker Barcode Produk Mini (40 x 25 mm)
  // 'thermal': Roll Kasir Thermal (58mm / 80mm continuous)
  const [template, setTemplate] = useState<'shelf' | 'sticker' | 'thermal'>('shelf');
  
  // Selection and quantity mapping: itemId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [barcodeStatusFilter, setBarcodeStatusFilter] = useState<'all' | 'with_code' | 'no_code'>('all');

  // Display customizations
  const [showKoperasiHeader, setShowKoperasiHeader] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showPrintDate, setShowPrintDate] = useState(true);
  const [showSatuan, setShowSatuan] = useState(true);

  // Auto-generation progress state
  const [isGeneratingBarcodes, setIsGeneratingBarcodes] = useState(false);
  const [generateFeedback, setGenerateFeedback] = useState<string | null>(null);

  // Initialize selected items (default 1 for all items)
  useEffect(() => {
    if (isOpen && Object.keys(selectedItems).length === 0) {
      const initial: Record<string, number> = {};
      warungBarang.forEach(item => {
        initial[item.id] = 1;
      });
      setSelectedItems(initial);
    }
  }, [isOpen, warungBarang]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    warungBarang.forEach(item => {
      if (item.kategori) set.add(item.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [warungBarang]);

  // Filtered products list
  const filteredBarang = useMemo(() => {
    return warungBarang.filter(item => {
      // Category filter
      if (categoryFilter !== 'Semua' && item.kategori !== categoryFilter) return false;

      // Barcode status filter
      const hasCode = !!(item.kodeBarang && item.kodeBarang.trim());
      if (barcodeStatusFilter === 'with_code' && !hasCode) return false;
      if (barcodeStatusFilter === 'no_code' && hasCode) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.namaBarang.toLowerCase().includes(q);
        const matchCode = (item.kodeBarang || '').toLowerCase().includes(q);
        const matchCat = (item.kategori || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }

      return true;
    });
  }, [warungBarang, categoryFilter, barcodeStatusFilter, searchQuery]);

  // Items without barcode count
  const itemsWithoutBarcode = useMemo(() => {
    return warungBarang.filter(item => !item.kodeBarang || !item.kodeBarang.trim());
  }, [warungBarang]);

  // Toggle selection for all filtered items
  const isAllFilteredSelected = filteredBarang.length > 0 && filteredBarang.every(item => (selectedItems[item.id] || 0) > 0);
  
  const handleToggleSelectAll = () => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (isAllFilteredSelected) {
        filteredBarang.forEach(item => {
          delete next[item.id];
        });
      } else {
        filteredBarang.forEach(item => {
          next[item.id] = next[item.id] || 1;
        });
      }
      return next;
    });
  };

  // Set all to 1
  const handleSetAllQty = (qty: number) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      filteredBarang.forEach(item => {
        next[item.id] = qty;
      });
      return next;
    });
  };

  // Set qty according to current stock
  const handleSetQtyFromStock = () => {
    setSelectedItems(prev => {
      const next = { ...prev };
      filteredBarang.forEach(item => {
        next[item.id] = Math.max(1, item.stok || 1);
      });
      return next;
    });
  };

  // Total label to print count
  const totalLabelsToPrint = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const exists = warungBarang.some(item => item.id === id);
      return exists ? sum + Math.max(0, qty) : sum;
    }, 0);
  }, [selectedItems, warungBarang]);

  // Array of items duplicated by their quantity for printing
  const labelsToRender = useMemo(() => {
    const list: { item: WarungBarang; index: number }[] = [];
    warungBarang.forEach(item => {
      const qty = selectedItems[item.id] || 0;
      for (let i = 0; i < qty; i++) {
        list.push({ item, index: i });
      }
    });
    return list;
  }, [warungBarang, selectedItems]);

  // Bulk generate barcodes for items without barcode
  const handleBulkGenerateBarcodes = async () => {
    if (!onUpdateBarang) {
      alert("Fitur update produk tidak tersedia.");
      return;
    }

    if (itemsWithoutBarcode.length === 0) {
      alert("Semua produk sudah memiliki barcode!");
      return;
    }

    const confirmGen = window.confirm(
      `Apakah Anda ingin membuat Barcode EAN-13 otomatis untuk ${itemsWithoutBarcode.length} produk yang belum memiliki barcode?`
    );
    if (!confirmGen) return;

    setIsGeneratingBarcodes(true);
    setGenerateFeedback(`Sedang membuat barcode untuk ${itemsWithoutBarcode.length} produk...`);

    try {
      let count = 0;
      // Start sequence based on timestamp and index to avoid collision
      const baseSeq = (Date.now() % 1000000);
      
      for (let i = 0; i < itemsWithoutBarcode.length; i++) {
        const item = itemsWithoutBarcode[i];
        const newBarcode = generateStoreEan13(baseSeq + i + 1);
        await onUpdateBarang({
          ...item,
          kodeBarang: newBarcode
        });
        count++;
      }

      setGenerateFeedback(`✓ Berhasil membuat ${count} barcode baru.`);
      setTimeout(() => setGenerateFeedback(null), 4000);
    } catch (err) {
      console.error("Bulk barcode generation error:", err);
      alert("Terjadi kesalahan saat menyimpan barcode baru.");
    } finally {
      setIsGeneratingBarcodes(false);
    }
  };

  // Single item barcode generator
  const handleGenerateSingleBarcode = async (item: WarungBarang) => {
    if (!onUpdateBarang) return;
    const newBarcode = generateStoreEan13(Date.now() % 1000000);
    try {
      await onUpdateBarang({
        ...item,
        kodeBarang: newBarcode
      });
      // also ensure it's selected
      setSelectedItems(prev => ({ ...prev, [item.id]: prev[item.id] || 1 }));
    } catch (err) {
      console.error("Error setting single barcode:", err);
    }
  };

  // Execute print window
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      {/* SCOPED PRINT STYLES */}
      <style>{`
        @media print {
          /* Hide everything in the page except the printable container */
          body * {
            visibility: hidden;
          }
          #printable-label-rak-area, #printable-label-rak-area * {
            visibility: visible;
          }
          #printable-label-rak-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 5mm;
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${template === 'thermal' ? '80mm auto' : 'A4 portrait'};
            margin: 5mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-emerald-300 border border-white/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Cetak Label Harga Rak & Barcode Produk</h3>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-200 text-[10px] font-mono rounded-full border border-emerald-400/30">
                  {totalLabelsToPrint} Label Siap Cetak
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Cetak label rak minimarket (shelf talker) atau stiker barcode kemasan produk untuk unit usaha warung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={totalLabelsToPrint === 0}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang ({totalLabelsToPrint})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice for items missing barcodes */}
        {itemsWithoutBarcode.length > 0 && onUpdateBarang && (
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Terdapat <strong>{itemsWithoutBarcode.length} produk</strong> yang belum memiliki barcode dari pabrik.
              </span>
            </div>
            <button
              type="button"
              onClick={handleBulkGenerateBarcodes}
              disabled={isGeneratingBarcodes}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingBarcodes ? 'Sedang Memproses...' : '⚡ Generate Barcode Otomatis untuk Semua'}</span>
            </button>
          </div>
        )}

        {generateFeedback && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold shrink-0">
            {generateFeedback}
          </div>
        )}

        {/* Main Content: 2-Panel Layout (Left: Product Selection & Config, Right: Live Print Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* LEFT PANEL: Filters, Product Selection, & Display Settings (5 cols) */}
          <div className="lg:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-850/50 overflow-hidden">
            {/* Template Selector */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Model & Ukuran Label:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTemplate('shelf')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    template === 'shelf'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                      : 'border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Tag className="w-4 h-4 mb-1 text-emerald-600" />
                  <div className="font-bold text-[11px]">Label Rak</div>
                  <div className="text-[10px] text-slate-400">65 x 38 mm</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('sticker')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    template === 'sticker'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                      : 'border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <BarcodeIcon className="w-4 h-4 mb-1 text-emerald-600" />
                  <div className="font-bold text-[11px]">Stiker Kemasan</div>
                  <div className="text-[10px] text-slate-400">40 x 25 mm</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('thermal')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    template === 'thermal'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                      : 'border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-1 text-emerald-600" />
                  <div className="font-bold text-[11px]">Thermal Roll</div>
                  <div className="text-[10px] text-slate-400">58 / 80 mm</div>
                </button>
              </div>

              {/* Display Element Toggles */}
              <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800 flex flex-wrap gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showKoperasiHeader}
                    onChange={(e) => setShowKoperasiHeader(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Nama Koperasi</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Barcode Visual</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCategory}
                    onChange={(e) => setShowCategory(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Kategori</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showPrintDate}
                    onChange={(e) => setShowPrintDate(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tgl Cetak</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showSatuan}
                    onChange={(e) => setShowSatuan(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Satuan</span>
                </label>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama barang atau barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={barcodeStatusFilter}
                  onChange={(e) => setBarcodeStatusFilter(e.target.value as 'all' | 'with_code' | 'no_code')}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Semua Status</option>
                  <option value="with_code">Punya Barcode</option>
                  <option value="no_code">Tanpa Barcode</option>
                </select>
              </div>

              {/* Batch Quantity Setters */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {isAllFilteredSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{isAllFilteredSelected ? 'Lepas Semua' : 'Pilih Semua'}</span>
                  </button>
                  <span>({filteredBarang.length} item)</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetAllQty(1)}
                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 rounded font-semibold text-slate-700 dark:text-slate-300"
                    title="Set semua 1 label (cocok untuk rak)"
                  >
                    1 Label/Item
                  </button>
                  <button
                    type="button"
                    onClick={handleSetQtyFromStock}
                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 rounded font-semibold text-slate-700 dark:text-slate-300"
                    title="Set kuantitas stiker sama dengan jumlah stok"
                  >
                    Ikut Stok
                  </button>
                </div>
              </div>
            </div>

            {/* Products List with Qty Stepper */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredBarang.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Tidak ada barang yang cocok dengan filter.
                </div>
              ) : (
                filteredBarang.map(item => {
                  const qty = selectedItems[item.id] || 0;
                  const isSelected = qty > 0;
                  const hasBarcode = !!(item.kodeBarang && item.kodeBarang.trim());

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Checkbox & Item Info */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedItems(prev => ({
                              ...prev,
                              [item.id]: e.target.checked ? (prev[item.id] || 1) : 0
                            }));
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-850 dark:text-slate-100 truncate">
                            {item.namaBarang}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(item.harga)}
                            </span>
                            <span>•</span>
                            <span>Stok: {item.stok ?? 0}</span>
                            <span>•</span>
                            <span className="truncate">{item.kategori || 'Umum'}</span>
                          </div>

                          {/* Barcode status */}
                          <div className="mt-1 flex items-center gap-2">
                            {hasBarcode ? (
                              <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                                📟 {item.kodeBarang}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-amber-600 font-medium italic">
                                  Belum ada barcode
                                </span>
                                {onUpdateBarang && (
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateSingleBarcode(item)}
                                    className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                                  >
                                    + Generate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Qty Stepper */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems(prev => ({
                              ...prev,
                              [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                            }));
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={qty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setSelectedItems(prev => ({ ...prev, [item.id]: val }));
                          }}
                          className="w-10 text-center font-bold font-mono py-0.5 bg-slate-100 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems(prev => ({
                              ...prev,
                              [item.id]: (prev[item.id] || 0) + 1
                            }));
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Live Print Preview Sheet (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-200/80 dark:bg-slate-950 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">Pratinjau Hasil Cetak:</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {template === 'shelf' && 'Format Label Rak Minimarket (65x38mm)'}
                  {template === 'sticker' && 'Format Stiker Barcode Produk Mini (40x25mm)'}
                  {template === 'thermal' && 'Format Thermal Roll Continuous'}
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Total lembar label: <strong className="text-emerald-600">{labelsToRender.length}</strong>
              </div>
            </div>

            {/* Printable Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
              {labelsToRender.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12 text-slate-400">
                  <Tag className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-bold text-sm">Belum Ada Label yang Dipilih</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Centang produk pada daftar di sebelah kiri atau klik &quot;Pilih Semua&quot; untuk menampilkan label di pratinjau.
                  </p>
                </div>
              ) : (
                /* Container with ID used by print stylesheet */
                <div
                  id="printable-label-rak-area"
                  className={`bg-white shadow-xl rounded-sm p-4 text-slate-900 border border-slate-300 w-full ${
                    template === 'thermal' 
                      ? 'max-w-[340px] space-y-4' 
                      : template === 'sticker'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-w-[800px]'
                        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-[840px]'
                  }`}
                >
                  {labelsToRender.map(({ item, index }) => {
                    const barcodeValue = item.kodeBarang && item.kodeBarang.trim() 
                      ? item.kodeBarang.trim() 
                      : generateStoreEan13(parseInt(item.id.replace(/\D/g, '') || '1') + 100);

                    // TEMPLATE 1: Shelf Label (Label Rak Minimarket Standar)
                    if (template === 'shelf') {
                      return (
                        <div
                          key={`${item.id}-${index}`}
                          className="border-2 border-slate-800 rounded-lg p-2.5 bg-white flex flex-col justify-between h-[150px] relative overflow-hidden break-inside-avoid print:shadow-none"
                        >
                          {/* Header Koperasi & Kategori */}
                          <div className="flex items-center justify-between border-b border-slate-300 pb-1 text-[9px] font-bold uppercase tracking-tight">
                            {showKoperasiHeader ? (
                              <span className="truncate max-w-[130px] text-slate-800">
                                {setup?.namaKoperasi || 'KOPERASI DANA SEGAR'}
                              </span>
                            ) : <span />}
                            {showCategory && (
                              <span className="text-slate-500 font-mono truncate">
                                {item.kategori || 'Umum'}
                              </span>
                            )}
                          </div>

                          {/* Nama Produk */}
                          <div className="my-1">
                            <h4 className="font-black text-xs leading-tight text-slate-950 line-clamp-2 uppercase">
                              {item.namaBarang}
                            </h4>
                          </div>

                          {/* Middle: Barcode & SKU */}
                          <div className="flex items-center justify-between gap-1 border-t border-slate-200 pt-1">
                            {showBarcode && (
                              <div className="flex-1 max-w-[110px]">
                                <BarcodeSvg 
                                  code={barcodeValue} 
                                  height={26} 
                                  width={1.1} 
                                  displayValue={false} 
                                />
                                <span className="font-mono text-[8px] text-slate-600 block text-center -mt-0.5 tracking-tighter">
                                  {barcodeValue}
                                </span>
                              </div>
                            )}

                            {/* Big Price Tag */}
                            <div className="text-right flex-1">
                              <span className="text-[8px] font-bold text-slate-500 uppercase block">HARGA PAS</span>
                              <div className="text-base sm:text-lg font-black font-mono leading-none text-slate-950">
                                {formatRupiah(item.harga)}
                              </div>
                              {showSatuan && item.satuan && (
                                <span className="text-[8px] text-slate-600 font-bold block mt-0.5">
                                  per {item.satuan}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Footer with date */}
                          {showPrintDate && (
                            <div className="text-[7px] text-slate-400 font-mono flex justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5">
                              <span>Rak Warung</span>
                              <span>Tgl: {new Date().toLocaleDateString('id-ID')}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // TEMPLATE 2: Stiker Barcode Produk Mini (40 x 25 mm)
                    if (template === 'sticker') {
                      return (
                        <div
                          key={`${item.id}-${index}`}
                          className="border border-slate-400 rounded p-1.5 bg-white flex flex-col justify-between items-center text-center h-[105px] overflow-hidden break-inside-avoid"
                        >
                          <div className="w-full">
                            <div className="font-bold text-[10px] leading-tight truncate uppercase text-slate-900">
                              {item.namaBarang}
                            </div>
                            <div className="font-black text-xs font-mono text-slate-950 mt-0.5">
                              {formatRupiah(item.harga)}
                            </div>
                          </div>

                          {showBarcode && (
                            <div className="w-full flex flex-col items-center">
                              <BarcodeSvg 
                                code={barcodeValue} 
                                height={24} 
                                width={1.0} 
                                displayValue={false} 
                              />
                              <span className="font-mono text-[8px] text-slate-700 tracking-tight -mt-0.5">
                                {barcodeValue}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // TEMPLATE 3: Thermal Continuous Roll
                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className="border-b-2 border-dashed border-slate-400 pb-3 mb-3 text-center flex flex-col items-center break-inside-avoid"
                      >
                        {showKoperasiHeader && (
                          <div className="font-bold text-[11px] uppercase tracking-wider">
                            {setup?.namaKoperasi || 'KOPERASI DANA SEGAR'}
                          </div>
                        )}
                        <h4 className="font-black text-sm uppercase mt-1">
                          {item.namaBarang}
                        </h4>
                        <div className="text-xl font-black font-mono my-1">
                          {formatRupiah(item.harga)}
                          {showSatuan && item.satuan ? ` / ${item.satuan}` : ''}
                        </div>

                        {showBarcode && (
                          <div className="my-1">
                            <BarcodeSvg 
                              code={barcodeValue} 
                              height={34} 
                              width={1.4} 
                              displayValue={true} 
                            />
                          </div>
                        )}

                        {showPrintDate && (
                          <div className="text-[9px] font-mono text-slate-500 mt-1">
                            Dicetak: {new Date().toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Bar inside Right Panel */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-500">
                💡 <strong>Tips:</strong> Pada dialog printer browser, pilih ukuran kertas A4, margin &quot;None&quot; atau &quot;Minimum&quot;, dan centang opsi &quot;Background graphics&quot;.
              </span>

              <button
                type="button"
                onClick={handlePrint}
                disabled={totalLabelsToPrint === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Label ({totalLabelsToPrint})</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
