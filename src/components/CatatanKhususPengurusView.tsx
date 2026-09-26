import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  KoperasiSetup, 
  SpreadsheetCell, 
  CatatanPengurusSpreadsheet, 
  Member, 
  Simpanan, 
  Pinjaman, 
  Angsuran, 
  PendapatanLain, 
  BebanKoperasi, 
  Pembelian, 
  PiutangWarung,
  UserAccount
} from '../types';
import { formatRupiah } from '../utils/finance';
import { 
  colIndexToLetter, 
  letterToColIndex, 
  formatCellId, 
  parseCellId, 
  evaluateCell, 
  expandCellRange,
  toNumeric
} from '../utils/spreadsheetFormula';
import { 
  FileSpreadsheet, 
  Save, 
  RotateCcw, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Check, 
  X, 
  HelpCircle, 
  RefreshCw, 
  Coins, 
  Sparkles, 
  ChevronDown, 
  Table, 
  Layers, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CatatanKhususPengurusViewProps {
  setup: KoperasiSetup;
  availableCash: number;
  currentUserAccount?: UserAccount | null;
  onSaveToCloud?: (data: CatatanPengurusSpreadsheet) => Promise<void> | void;
  isDarkMode?: boolean;
}

const STORAGE_KEY = 'kop_catatan_pengurus_spreadsheet';
const DEFAULT_ROWS = 32;
const DEFAULT_COLS = 8; // A to H

export const CatatanKhususPengurusView: React.FC<CatatanKhususPengurusViewProps> = ({
  setup,
  availableCash,
  currentUserAccount,
  onSaveToCloud,
  isDarkMode = false
}) => {
  // Number of rows and columns in the active grid
  const [numRows, setNumRows] = useState<number>(DEFAULT_ROWS);
  const [numCols, setNumCols] = useState<number>(DEFAULT_COLS);

  // Cell storage: key "A1" -> SpreadsheetCell
  const [cells, setCells] = useState<Record<string, SpreadsheetCell>>({});

  // Active cell selection & multi-cell range selection
  const [activeCellId, setActiveCellId] = useState<string>('B3'); // Default cursor on "Posisi Kas"
  const [selectionStart, setSelectionStart] = useState<{ col: number; row: number }>({ col: 1, row: 3 }); // 0-based col, 1-based row
  const [selectionEnd, setSelectionEnd] = useState<{ col: number; row: number }>({ col: 1, row: 3 });
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');

  // Formula bar state
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // UI Modals / Panels
  const [showFormulaHelp, setShowFormulaHelp] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showQuickFormulaMenu, setShowQuickFormulaMenu] = useState<boolean>(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Create default starter cells with "Total Kas" from neraca saldo and empty "Posisi Kas"
  const generateInitialCells = (cash: number): Record<string, SpreadsheetCell> => {
    const init: Record<string, SpreadsheetCell> = {
      // Row 1: Header Table
      'A1': { raw: 'POS / KETERANGAN KAS', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },
      'B1': { raw: 'NOMINAL (RP)', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },
      'C1': { raw: 'FORMULA / KATEGORI', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },
      'D1': { raw: 'STATUS & AUDIT', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },
      'E1': { raw: 'CATATAN KHUSUS PENGURUS', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },
      'F1': { raw: 'VERIFIKATOR', bold: true, align: 'center', bgColor: '#ecfdf5', textColor: '#065f46' },

      // Row 2: Total Kas (Neraca Saldo)
      'A2': { raw: 'Total Kas (Neraca Saldo)', bold: true, align: 'left' },
      'B2': { raw: String(cash), format: 'currency', bold: true, align: 'right' },
      'C2': { raw: 'Neraca Saldo Koperasi', align: 'left' },
      'D2': { raw: 'Otomatis dari Sistem', align: 'center' },
      'E2': { raw: 'Saldo kas riil neraca saldo per hari ini', align: 'left' },
      'F2': { raw: 'Sistem / Bendahara', align: 'center' },

      // Row 3: Posisi Kas (KOSONG SESUAI PERMINTAAN USER)
      'A3': { raw: 'Posisi Kas', bold: true, align: 'left' },
      'B3': { raw: '', format: 'currency', bold: true, align: 'right' }, // KOSONG SESUAI PERMINTAAN
      'C3': { raw: 'Kas Fisik / Opname', align: 'left' },
      'D3': { raw: 'Perlu Diisi Pengurus', align: 'center' },
      'E3': { raw: 'Masukkan total kas fisik brankas / rekening bank', align: 'left' },
      'F3': { raw: 'Pengurus / Kasir', align: 'center' },

      // Row 4: Selisih Kas (Posisi Kas - Total Kas Neraca)
      'A4': { raw: 'Selisih Kas (Posisi - Total)', bold: true, align: 'left' },
      'B4': { raw: '=B3-B2', format: 'currency', bold: true, align: 'right' },
      'C4': { raw: '=B3-B2', align: 'center' },
      'D4': { raw: '=IF(B3="","(Belum Diisi)",IF(B4=0,"SEIMBANG / BALANCE",IF(B4>0,"LEBIH KAS FISIK","KURANG KAS FISIK")))', align: 'center', bold: true },
      'E4': { raw: 'Kalkulasi otomatis selisih antara posisi kas dan buku kas', align: 'left' },
      'F4': { raw: 'Pengawas / Audit', align: 'center' },

      // Row 5: Divider
      'A5': { raw: '', bgColor: '#f8fafc' },
      'B5': { raw: '', bgColor: '#f8fafc' },
      'C5': { raw: '', bgColor: '#f8fafc' },
      'D5': { raw: '', bgColor: '#f8fafc' },
      'E5': { raw: '', bgColor: '#f8fafc' },
      'F5': { raw: '', bgColor: '#f8fafc' },

      // Row 6-8: Rincian Fisik Rekonsiliasi (Bisa dijumlahkan dengan SUM)
      'A6': { raw: 'Rincian 1: Uang Tunai di Brankas (Kas Fisik)', align: 'left' },
      'B6': { raw: '0', format: 'currency', align: 'right' },
      'C6': { raw: 'Kas Tunai Kasir', align: 'left' },
      'D6': { raw: 'Opname Fisik', align: 'center' },
      'E6': { raw: 'Hitungan lembar uang kertas & logam di brankas', align: 'left' },
      'F6': { raw: 'Kasir', align: 'center' },

      'A7': { raw: 'Rincian 2: Saldo Rekening Bank Operasional', align: 'left' },
      'B7': { raw: '0', format: 'currency', align: 'right' },
      'C7': { raw: 'Bank Koperasi', align: 'left' },
      'D7': { raw: 'Cek Rekening Koran', align: 'center' },
      'E7': { raw: 'Saldo akhir mutasi bank koperasi', align: 'left' },
      'F7': { raw: 'Bendahara', align: 'center' },

      'A8': { raw: 'Subtotal Rincian Kas (Tunai + Bank)', bold: true, align: 'left' },
      'B8': { raw: '=SUM(B6:B7)', format: 'currency', bold: true, align: 'right' },
      'C8': { raw: '=SUM(B6:B7)', align: 'center' },
      'D8': { raw: 'Akumulasi Kas Riil', align: 'center' },
      'E8': { raw: 'Dapat disalin/dihubungkan ke sel B3 (=B8)', align: 'left' },
      'F8': { raw: 'Pengurus', align: 'center' },

      // Row 9: Divider
      'A9': { raw: '', bgColor: '#f8fafc' },
      'B9': { raw: '', bgColor: '#f8fafc' },
      'C9': { raw: '', bgColor: '#f8fafc' },
      'D9': { raw: '', bgColor: '#f8fafc' },
      'E9': { raw: '', bgColor: '#f8fafc' },
      'F9': { raw: '', bgColor: '#f8fafc' },

      // Row 10: Header Catatan Strategis Pengurus
      'A10': { raw: 'CATATAN AGENDA & KEPUTUSAN PENGURUS', bold: true, align: 'left', bgColor: '#f0fdf4' },
      'B10': { raw: 'TARGET DANA', bold: true, align: 'center', bgColor: '#f0fdf4' },
      'C10': { raw: 'DEADLINE', bold: true, align: 'center', bgColor: '#f0fdf4' },
      'D10': { raw: 'STATUS', bold: true, align: 'center', bgColor: '#f0fdf4' },
      'E10': { raw: 'URAIAN TINDAK LANJUT', bold: true, align: 'left', bgColor: '#f0fdf4' },
      'F10': { raw: 'PENANGGUNG JAWAB', bold: true, align: 'center', bgColor: '#f0fdf4' },

      'A11': { raw: '1. Persiapan Dana Pencairan Pinjaman Anggota', align: 'left' },
      'B11': { raw: '15000000', format: 'currency', align: 'right' },
      'C11': { raw: 'Akhir Bulan', align: 'center' },
      'D11': { raw: 'Direncanakan', align: 'center' },
      'E11': { raw: 'Alokasi likuiditas pencairan pengajuan pinjaman', align: 'left' },
      'F11': { raw: 'Ketua & Bendahara', align: 'center' },

      'A12': { raw: '2. Belanja Stok Barang Warung Koperasi', align: 'left' },
      'B12': { raw: '5000000', format: 'currency', align: 'right' },
      'C12': { raw: 'Minggu Depan', align: 'center' },
      'D12': { raw: 'Proses Pesanan', align: 'center' },
      'E12': { raw: 'Restok sembako dan kebutuhan pokok anggota', align: 'left' },
      'F12': { raw: 'Pengelola Warung', align: 'center' },

      'A13': { raw: '3. Cadangan Pembagian SHU & Dana Sosial', align: 'left' },
      'B13': { raw: '10000000', format: 'currency', align: 'right' },
      'C13': { raw: 'RAT Tahunan', align: 'center' },
      'D13': { raw: 'Alokasi Cadangan', align: 'center' },
      'E13': { raw: 'Dana cadangan untuk persiapan RAT', align: 'left' },
      'F13': { raw: 'Pengurus', align: 'center' },

      'A14': { raw: 'Total Kebutuhan Likuiditas Terjadwal', bold: true, align: 'left' },
      'B14': { raw: '=SUM(B11:B13)', format: 'currency', bold: true, align: 'right' },
      'C14': { raw: '=SUM(B11:B13)', align: 'center' },
      'D14': { raw: 'Total Rencana', align: 'center' },
      'E14': { raw: 'Perkiraan arus keluar dana pengurus', align: 'left' },
      'F14': { raw: 'Semua Pengurus', align: 'center' },
    };
    return init;
  };

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CatatanPengurusSpreadsheet = JSON.parse(stored);
        if (parsed.cells) {
          setCells(parsed.cells);
          if (parsed.rows) setNumRows(Math.max(parsed.rows, DEFAULT_ROWS));
          if (parsed.cols) setNumCols(Math.max(parsed.cols, DEFAULT_COLS));
          setLastSavedTime(parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleTimeString('id-ID') : '');
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load saved spreadsheet:', e);
    }

    // Default template if no stored data
    const initial = generateInitialCells(availableCash);
    setCells(initial);
  }, []);

  // Update formula bar value when active cell changes
  useEffect(() => {
    const cell = cells[activeCellId];
    const val = cell?.raw ?? '';
    setFormulaBarValue(val);
    setEditValue(val);
  }, [activeCellId, cells]);

  // Global mouseup listener to terminate drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Multi-cell selection range calculation
  const selectedRange = useMemo(() => {
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const count = (maxCol - minCol + 1) * (maxRow - minRow + 1);
    const isMulti = count > 1;
    const startId = formatCellId(minCol, minRow);
    const endId = formatCellId(maxCol, maxRow);
    const rangeLabel = isMulti ? `${startId}:${endId}` : startId;

    return {
      minCol,
      maxCol,
      minRow,
      maxRow,
      count,
      isMulti,
      startId,
      endId,
      rangeLabel,
    };
  }, [selectionStart, selectionEnd]);

  // Get list of all cell IDs in the currently selected block
  const getSelectedCellIds = useCallback((): string[] => {
    const ids: string[] = [];
    for (let r = selectedRange.minRow; r <= selectedRange.maxRow; r++) {
      for (let c = selectedRange.minCol; c <= selectedRange.maxCol; c++) {
        ids.push(formatCellId(c, r));
      }
    }
    return ids;
  }, [selectedRange]);

  // Check if a specific column and row is inside the current block selection
  const isCellSelected = useCallback((col: number, row: number): boolean => {
    return col >= selectedRange.minCol &&
           col <= selectedRange.maxCol &&
           row >= selectedRange.minRow &&
           row <= selectedRange.maxRow;
  }, [selectedRange]);

  // Evaluated cell cache (reactive evaluation)
  const evaluatedCells = useMemo(() => {
    const result: Record<string, { value: string | number; isNumeric: boolean; error?: string }> = {};

    const context = {
      getCellValue: (id: string) => {
        return cells[id]?.raw ?? '';
      },
      availableCash: availableCash,
      maxDepth: 25,
    };

    // Evaluate all known cells in the grid
    for (let r = 1; r <= numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const id = formatCellId(c, r);
        const raw = cells[id]?.raw ?? '';
        result[id] = evaluateCell(raw, context);
      }
    }

    return result;
  }, [cells, numRows, numCols, availableCash]);

  // Auto-save debounced to localStorage
  const saveTimeoutRef = useRef<any>(null);
  const triggerAutoSave = (updatedCells: Record<string, SpreadsheetCell>, rows = numRows, cols = numCols) => {
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      const payload: CatatanPengurusSpreadsheet = {
        id: 'catatan-pengurus-main',
        title: 'Catatan Khusus Pengurus',
        rows,
        cols,
        cells: updatedCells,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserAccount?.nama || currentUserAccount?.username || 'Pengurus',
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        if (onSaveToCloud) {
          onSaveToCloud(payload);
        }
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
      } catch (err) {
        console.error('Error auto-saving spreadsheet:', err);
        setSaveStatus('saved'); // Don't block UI
      }
    }, 800);
  };

  // Manual save action
  const handleManualSave = () => {
    setSaveStatus('saving');
    const payload: CatatanPengurusSpreadsheet = {
      id: 'catatan-pengurus-main',
      title: 'Catatan Khusus Pengurus',
      rows: numRows,
      cols: numCols,
      cells,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserAccount?.nama || currentUserAccount?.username || 'Pengurus',
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (onSaveToCloud) {
        onSaveToCloud(payload);
      }
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize Total Kas cell with current live neraca saldo balance
  const handleSyncKasNeraca = () => {
    setCells(prev => {
      const prevB2 = prev['B2'] || { raw: '' };
      const updatedB2: SpreadsheetCell = {
        ...prevB2,
        raw: String(availableCash),
        format: 'currency',
        bold: true,
        align: 'right'
      };
      const updated: Record<string, SpreadsheetCell> = {
        ...prev,
        'B2': updatedB2
      };
      triggerAutoSave(updated);
      return updated;
    });
  };

  // Cell editing commit
  const commitCellEdit = (cellId: string, value: string) => {
    setCells(prev => {
      const current = prev[cellId] || {};
      const updated: Record<string, SpreadsheetCell> = {
        ...prev,
        [cellId]: {
          ...current,
          raw: value,
        }
      };
      triggerAutoSave(updated);
      return updated;
    });
    setIsEditing(false);
  };

  // Clear contents of all selected cells with a single action (Delete key or button)
  const handleClearSelectedCells = useCallback(() => {
    const selectedIds = getSelectedCellIds();
    if (selectedIds.length === 0) return;

    setCells(prev => {
      const updated: Record<string, SpreadsheetCell> = { ...prev };
      for (const id of selectedIds) {
        const cur = updated[id] || { raw: '' };
        updated[id] = {
          ...cur,
          raw: ''
        };
      }
      triggerAutoSave(updated);
      return updated;
    });

    if (selectedIds.includes(activeCellId)) {
      setFormulaBarValue('');
      setEditValue('');
    }
    setIsEditing(false);
  }, [getSelectedCellIds, activeCellId]);

  // Format toggle for active cell or all selected cells
  const handleFormatChange = (format: SpreadsheetCell['format']) => {
    const ids = selectedRange.isMulti ? getSelectedCellIds() : [activeCellId];
    setCells(prev => {
      const updated: Record<string, SpreadsheetCell> = { ...prev };
      const currentActive = prev[activeCellId] || { raw: '' };
      const nextFormat = currentActive.format === format ? undefined : format;
      for (const id of ids) {
        const cur = updated[id] || { raw: '' };
        updated[id] = {
          ...cur,
          format: nextFormat
        };
      }
      triggerAutoSave(updated);
      return updated;
    });
  };

  const handleStyleToggle = (style: 'bold' | 'italic') => {
    const ids = selectedRange.isMulti ? getSelectedCellIds() : [activeCellId];
    setCells(prev => {
      const updated: Record<string, SpreadsheetCell> = { ...prev };
      const currentActive = prev[activeCellId] || { raw: '' };
      const nextVal = !currentActive[style];
      for (const id of ids) {
        const cur = updated[id] || { raw: '' };
        updated[id] = {
          ...cur,
          [style]: nextVal
        };
      }
      triggerAutoSave(updated);
      return updated;
    });
  };

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    const ids = selectedRange.isMulti ? getSelectedCellIds() : [activeCellId];
    setCells(prev => {
      const updated: Record<string, SpreadsheetCell> = { ...prev };
      for (const id of ids) {
        const cur = updated[id] || { raw: '' };
        updated[id] = {
          ...cur,
          align
        };
      }
      triggerAutoSave(updated);
      return updated;
    });
  };

  // Mouse drag selection handlers
  const handleCellMouseDown = (cellId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    const parsed = parseCellId(cellId);
    if (!parsed) return;

    if (isEditing) {
      commitCellEdit(activeCellId, editValue);
    }

    if (e.shiftKey) {
      // Shift + click expands current selection
      setSelectionEnd(parsed);
    } else {
      setActiveCellId(cellId);
      setSelectionStart(parsed);
      setSelectionEnd(parsed);
      setIsSelecting(true);
    }
  };

  const handleCellMouseEnter = (cellId: string) => {
    if (!isSelecting) return;
    const parsed = parseCellId(cellId);
    if (!parsed) return;
    setSelectionEnd(parsed);
  };

  // Select entire column by clicking header
  const handleSelectColumn = (cIdx: number) => {
    if (isEditing) commitCellEdit(activeCellId, editValue);
    setSelectionStart({ col: cIdx, row: 1 });
    setSelectionEnd({ col: cIdx, row: numRows });
    setActiveCellId(formatCellId(cIdx, 1));
  };

  // Select entire row by clicking row number
  const handleSelectRow = (rowNum: number) => {
    if (isEditing) commitCellEdit(activeCellId, editValue);
    setSelectionStart({ col: 0, row: rowNum });
    setSelectionEnd({ col: numCols - 1, row: rowNum });
    setActiveCellId(formatCellId(0, rowNum));
  };

  // Select all cells (Ctrl+A or corner button)
  const handleSelectAll = () => {
    if (isEditing) commitCellEdit(activeCellId, editValue);
    setSelectionStart({ col: 0, row: 1 });
    setSelectionEnd({ col: numCols - 1, row: numRows });
    setActiveCellId('A1');
  };

  // Keyboard navigation & Shortcuts
  const handleCellKeyDown = (e: React.KeyboardEvent, cellId: string) => {
    const parsed = parseCellId(cellId);
    if (!parsed) return;

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCellEdit(cellId, editValue);
        // Move to next row
        if (parsed.row < numRows) {
          const nextId = formatCellId(parsed.col, parsed.row + 1);
          setActiveCellId(nextId);
          setSelectionStart({ col: parsed.col, row: parsed.row + 1 });
          setSelectionEnd({ col: parsed.col, row: parsed.row + 1 });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitCellEdit(cellId, editValue);
        // Move to next col
        if (parsed.col < numCols - 1) {
          const nextId = formatCellId(parsed.col + 1, parsed.row);
          setActiveCellId(nextId);
          setSelectionStart({ col: parsed.col + 1, row: parsed.row });
          setSelectionEnd({ col: parsed.col + 1, row: parsed.row });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
        setEditValue(cells[cellId]?.raw ?? '');
      }
      return;
    }

    // Navigation and actions when NOT editing
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // CLEAR ALL BLOCKED/SELECTED CELLS AT ONCE WITH DELETE
      e.preventDefault();
      handleClearSelectedCells();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      handleSelectAll();
      return;
    }

    // Shift + Arrow keys to expand/shrink selection block
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      setSelectionEnd(prev => {
        let c = prev.col;
        let r = prev.row;
        if (e.key === 'ArrowUp' && r > 1) r--;
        if (e.key === 'ArrowDown' && r < numRows) r++;
        if (e.key === 'ArrowLeft' && c > 0) c--;
        if (e.key === 'ArrowRight' && c < numCols - 1) c++;
        return { col: c, row: r };
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(true);
      setTimeout(() => editInputRef.current?.select(), 50);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (parsed.row > 1) {
        const nextId = formatCellId(parsed.col, parsed.row - 1);
        setActiveCellId(nextId);
        setSelectionStart({ col: parsed.col, row: parsed.row - 1 });
        setSelectionEnd({ col: parsed.col, row: parsed.row - 1 });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (parsed.row < numRows) {
        const nextId = formatCellId(parsed.col, parsed.row + 1);
        setActiveCellId(nextId);
        setSelectionStart({ col: parsed.col, row: parsed.row + 1 });
        setSelectionEnd({ col: parsed.col, row: parsed.row + 1 });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (parsed.col > 0) {
        const nextId = formatCellId(parsed.col - 1, parsed.row);
        setActiveCellId(nextId);
        setSelectionStart({ col: parsed.col - 1, row: parsed.row });
        setSelectionEnd({ col: parsed.col - 1, row: parsed.row });
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (parsed.col < numCols - 1) {
        const nextId = formatCellId(parsed.col + 1, parsed.row);
        setActiveCellId(nextId);
        setSelectionStart({ col: parsed.col + 1, row: parsed.row });
        setSelectionEnd({ col: parsed.col + 1, row: parsed.row });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (parsed.col > 0) {
          const nextId = formatCellId(parsed.col - 1, parsed.row);
          setActiveCellId(nextId);
          setSelectionStart({ col: parsed.col - 1, row: parsed.row });
          setSelectionEnd({ col: parsed.col - 1, row: parsed.row });
        }
      } else {
        if (parsed.col < numCols - 1) {
          const nextId = formatCellId(parsed.col + 1, parsed.row);
          setActiveCellId(nextId);
          setSelectionStart({ col: parsed.col + 1, row: parsed.row });
          setSelectionEnd({ col: parsed.col + 1, row: parsed.row });
        }
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing directly into active cell and collapse selection
      setSelectionStart(parsed);
      setSelectionEnd(parsed);
      setIsEditing(true);
      setEditValue(e.key);
      setTimeout(() => editInputRef.current?.focus(), 20);
    }
  };

  // Add row
  const handleAddRow = () => {
    const next = numRows + 5;
    setNumRows(next);
    triggerAutoSave(cells, next, numCols);
  };

  // Add column
  const handleAddCol = () => {
    if (numCols >= 26) return; // Limit up to Z
    const next = numCols + 2;
    setNumCols(next);
    triggerAutoSave(cells, numRows, next);
  };

  // Apply Quick Formula
  const applyQuickFormula = (type: 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT' | 'SELISIH') => {
    const parsed = parseCellId(activeCellId);
    if (!parsed) return;

    let formula = '';
    if (type === 'SELISIH') {
      formula = '=B3-B2';
    } else {
      // Default guess range: e.g. B2:B[row-1]
      const aboveRow = parsed.row - 1;
      const startRow = Math.max(1, aboveRow - 4);
      formula = `=${type}(${parsed.colLetter}${startRow}:${parsed.colLetter}${aboveRow})`;
    }

    setFormulaBarValue(formula);
    setEditValue(formula);
    commitCellEdit(activeCellId, formula);
    setShowQuickFormulaMenu(false);
  };

  // Reset to default template
  const handleResetToDefault = () => {
    const fresh = generateInitialCells(availableCash);
    setCells(fresh);
    setNumRows(DEFAULT_ROWS);
    setNumCols(DEFAULT_COLS);
    setActiveCellId('B3');
    triggerAutoSave(fresh, DEFAULT_ROWS, DEFAULT_COLS);
    setShowResetConfirm(false);
  };

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    try {
      const aoa: any[][] = [];

      // Row headers
      for (let r = 1; r <= numRows; r++) {
        const rowData: any[] = [];
        let hasContent = false;
        for (let c = 0; c < numCols; c++) {
          const id = formatCellId(c, r);
          const evalRes = evaluatedCells[id];
          const val = evalRes ? evalRes.value : '';
          rowData.push(val);
          if (val !== '' && val !== undefined && val !== null) {
            hasContent = true;
          }
        }
        // Only push rows that have content or are within active rows
        if (hasContent || r <= 15) {
          aoa.push(rowData);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Set column widths
      ws['!cols'] = [
        { wch: 40 }, // Col A
        { wch: 22 }, // Col B
        { wch: 24 }, // Col C
        { wch: 26 }, // Col D
        { wch: 42 }, // Col E
        { wch: 20 }, // Col F
        { wch: 18 }, // Col G
        { wch: 18 }, // Col H
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Catatan Pengurus');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Catatan_Khusus_Pengurus_${setup?.namaKoperasi || 'Koperasi'}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('Gagal mengekspor lembar kerja ke Excel: ' + (err as Error).message);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const rows: string[] = [];
      for (let r = 1; r <= numRows; r++) {
        const rowCells: string[] = [];
        let hasContent = false;
        for (let c = 0; c < numCols; c++) {
          const id = formatCellId(c, r);
          const evalRes = evaluatedCells[id];
          const val = evalRes ? String(evalRes.value) : '';
          rowCells.push(`"${val.replace(/"/g, '""')}"`);
          if (val) hasContent = true;
        }
        if (hasContent || r <= 15) {
          rows.push(rowCells.join(','));
        }
      }

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Catatan_Khusus_Pengurus_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Helper to render cell display text with formats
  const renderCellDisplay = (id: string) => {
    const cellConfig = cells[id];
    const evalRes = evaluatedCells[id];
    if (!evalRes) return '';

    if (evalRes.error) {
      return (
        <span className="text-red-500 dark:text-red-400 font-semibold text-xs tracking-tight">
          {evalRes.error}
        </span>
      );
    }

    const val = evalRes.value;
    if (val === '' || val === null || val === undefined) return '';

    // If format is currency and value is numeric
    if (cellConfig?.format === 'currency') {
      const num = toNumeric(val);
      if (!isNaN(num)) {
        if (num < 0) {
          return <span className="text-red-600 dark:text-red-400">({formatRupiah(Math.abs(num))})</span>;
        }
        return formatRupiah(num);
      }
    }

    if (cellConfig?.format === 'percent') {
      const num = toNumeric(val);
      if (!isNaN(num)) {
        return `${(num * 100).toFixed(1)}%`;
      }
    }

    if (cellConfig?.format === 'number') {
      const num = toNumeric(val);
      if (!isNaN(num)) {
        return num.toLocaleString('id-ID');
      }
    }

    return String(val);
  };

  const activeCellConfig: SpreadsheetCell = cells[activeCellId] || { raw: '' };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/60 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  Catatan Khusus Pengurus
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700">
                  Spreadsheet & Kalkulasi Kas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lembar kerja mandiri interaktif pengurus dengan dukungan formula Excel, pencocokan posisi kas, dan audit neraca saldo.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Synchronization */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Total Kas Badge */}
            <div className="flex items-center gap-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 px-3 py-2 rounded-lg text-xs">
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 block leading-tight">
                  Kas Neraca Saldo Terkini
                </span>
                <span className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                  {formatRupiah(availableCash)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncKasNeraca}
                title="Perbarui nilai Total Kas di sel B2 dengan saldo kas neraca saldo terkini"
                className="ml-1 p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-md transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300">
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px]">Tersimpan {lastSavedTime && `(${lastSavedTime})`}</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Ada Perubahan...</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  <span className="text-[11px]">Menyimpan...</span>
                </>
              )}
            </div>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              Sel <strong>B2</strong> memuat <em>Total Kas dari Neraca Saldo</em>, sel <strong>B3</strong> memuat <em>Posisi Kas Fisik</em>, dan sel <strong>B4</strong> menghitung selisih secara otomatis dengan rumus <code>=B3-B2</code>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFormulaHelp(prev => !prev)}
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showFormulaHelp ? 'Tutup Panduan Rumus' : 'Panduan Rumus Excel'}</span>
          </button>
        </div>

        {/* Collapsible Formula Guidance Card */}
        {showFormulaHelp && (
          <div className="mt-3 p-4 bg-emerald-50/50 dark:bg-slate-750 border border-emerald-100 dark:border-slate-600 rounded-xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Dukungan Rumus & Fungsi Formula Spreadsheet:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=SUM(B2:B10)</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Menjumlahkan seluruh nilai angka dalam jangkauan sel.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=B3-B2</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Operasi hitung aritmatika (+, -, *, /, %, kurung).</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=AVERAGE(B6:B10)</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Menghitung nilai rata-rata dari rentang sel.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=MIN(B6:B10) / MAX(...)</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mencari nilai terendah atau tertinggi.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=IF(B4=0, "Balance", "Selisih")</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kondisi logika jika benar dan jika salah.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <code className="font-bold text-emerald-600 dark:text-emerald-400">=KAS_NERACA</code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Variabel sistem otomatis mengambil nilai saldo kas neraca.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Main Canvas (Toolbar + Formula Bar + Grid) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        {/* Spreadsheet Toolbar (Excel-like Ribbon) */}
        <div className="bg-slate-50 dark:bg-slate-850 p-2 sm:px-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-xs">
          {/* Group: Font & Format */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Format Style */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleStyleToggle('bold')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeCellConfig.bold 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Tebal (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleStyleToggle('italic')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeCellConfig.italic 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Miring (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Alignment */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleAlignChange('left')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeCellConfig.align === 'left' || (!activeCellConfig.align && !evaluatedCells[activeCellId]?.isNumeric)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Rata Kiri"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('center')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeCellConfig.align === 'center' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Rata Tengah"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignChange('right')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeCellConfig.align === 'right' || (!activeCellConfig.align && evaluatedCells[activeCellId]?.isNumeric)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Rata Kanan"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Number Formats */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFormatChange('currency')}
                className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                  activeCellConfig.format === 'currency'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Format Rupiah (Rp)"
              >
                Rp
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('number')}
                className={`px-2 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                  activeCellConfig.format === 'number'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Format Angka Ribuan"
              >
                123
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('percent')}
                className={`px-2 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                  activeCellConfig.format === 'percent'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Format Persen (%)"
              >
                %
              </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Quick Formula Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickFormulaMenu(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Σ</span>
                <span>Rumus Cepat</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showQuickFormulaMenu && (
                <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('SUM')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>AutoSum (SUM)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Σ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('AVERAGE')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Rata-rata (AVERAGE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('MIN')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Nilai Terkecil (MIN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('MAX')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Nilai Terbesar (MAX)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('COUNT')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Hitung Jumlah Sel (COUNT)</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                  <button
                    type="button"
                    onClick={() => applyQuickFormula('SELISIH')}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium cursor-pointer"
                  >
                    <span>=B3-B2 (Selisih Kas)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Clear / Delete Button for selected cells */}
            <button
              type="button"
              onClick={handleClearSelectedCells}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                selectedRange.isMulti
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/60'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-slate-700'
              }`}
              title={
                selectedRange.isMulti
                  ? `Hapus isi ${selectedRange.count} sel yang diblok sekaligus (atau tekan tombol Delete)`
                  : `Hapus isi sel ${activeCellId} (atau tekan tombol Delete)`
              }
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Hapus {selectedRange.isMulti ? `(${selectedRange.count} Sel)` : 'Isi'}</span>
              <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                Del
              </kbd>
            </button>
          </div>

          {/* Group: Grid Size & Export Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Add Row & Col */}
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Tambahkan 5 baris baru di bawah"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>+ Baris</span>
            </button>
            <button
              type="button"
              onClick={handleAddCol}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Tambahkan 2 kolom baru di kanan"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>+ Kolom</span>
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
              title="Unduh file Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Unduh file CSV"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Cetak lembar kerja"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="p-1 text-slate-400 hover:text-red-500 rounded-md transition cursor-pointer"
              title="Reset ke template standar awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Excel Formula Bar (fx) */}
        <div className="bg-white dark:bg-slate-800 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          {/* Active Cell / Range Name Box (e.g. B3 or B3:D7) */}
          <div 
            className="min-w-16 h-8 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-200 shadow-2xs gap-1.5"
            title={`Sel aktif atau rentang sel yang diblok: ${selectedRange.rangeLabel}`}
          >
            <span>{selectedRange.rangeLabel}</span>
            {selectedRange.isMulti && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1 py-0.2 rounded font-sans font-semibold">
                {selectedRange.count}
              </span>
            )}
          </div>

          {/* Formula Function Icon */}
          <div className="flex items-center justify-center w-6 h-8 text-slate-400 dark:text-slate-500 font-serif italic font-bold text-sm select-none">
            fx
          </div>

          {/* Formula Input Box */}
          <div className="flex-1 relative flex items-center">
            <input
              ref={formulaInputRef}
              type="text"
              value={formulaBarValue}
              onChange={(e) => {
                setFormulaBarValue(e.target.value);
                setEditValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitCellEdit(activeCellId, formulaBarValue);
                } else if (e.key === 'Escape') {
                  setFormulaBarValue(cells[activeCellId]?.raw ?? '');
                  setEditValue(cells[activeCellId]?.raw ?? '');
                }
              }}
              onFocus={() => {
                // Keep active
              }}
              placeholder="Ketik teks, angka, atau rumus Excel diawali tanda = (contoh: =B3-B2 atau =SUM(B6:B7))"
              className="w-full h-8 px-3 text-xs font-mono bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            {formulaBarValue !== (cells[activeCellId]?.raw ?? '') && (
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => commitCellEdit(activeCellId, formulaBarValue)}
                  className="p-1 hover:bg-emerald-100 text-emerald-600 rounded cursor-pointer"
                  title="Terapkan (Enter)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const original = cells[activeCellId]?.raw ?? '';
                    setFormulaBarValue(original);
                    setEditValue(original);
                  }}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                  title="Batalkan (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Spreadsheet Interactive Grid Container */}
        <div 
          ref={gridContainerRef}
          className="overflow-auto max-h-[68vh] relative select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 outline-none focus:outline-none"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace')) {
              e.preventDefault();
              handleClearSelectedCells();
            } else if (!isEditing && (e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSelectAll();
            }
          }}
        >
          <table className="w-full border-collapse text-xs font-sans table-fixed min-w-[850px]">
            {/* Column Header Row (A, B, C, D...) */}
            <thead>
              <tr className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                {/* Top-Left Corner Box (Select All) */}
                <th 
                  onClick={handleSelectAll}
                  className="sticky left-0 z-30 w-12 bg-slate-200 dark:bg-slate-950 border-r border-b border-slate-300 dark:border-slate-700 text-center font-normal text-[10px] text-slate-500 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition"
                  title="Pilih / blok seluruh lembar kerja (Ctrl+A)"
                >
                  <div className="w-full h-7 flex items-center justify-center">
                    <Table className="w-3.5 h-3.5 opacity-60 hover:opacity-100 text-emerald-700 dark:text-emerald-300" />
                  </div>
                </th>

                {/* Column Letters */}
                {Array.from({ length: numCols }).map((_, cIdx) => {
                  const letter = colIndexToLetter(cIdx);
                  const isColInSelection = cIdx >= selectedRange.minCol && cIdx <= selectedRange.maxCol;
                  return (
                    <th 
                      key={letter}
                      onClick={() => handleSelectColumn(cIdx)}
                      style={{
                        width: cIdx === 0 ? '260px' : cIdx === 1 ? '160px' : cIdx === 2 ? '170px' : cIdx === 3 ? '180px' : cIdx === 4 ? '260px' : '150px'
                      }}
                      className={`h-7 px-2 border-r border-slate-300 dark:border-slate-700 font-semibold text-[11px] select-none text-center transition cursor-pointer ${
                        isColInSelection 
                          ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200 font-bold' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                      title={`Klik untuk memblok seluruh Kolom ${letter}`}
                    >
                      {letter}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Grid Body */}
            <tbody>
              {Array.from({ length: numRows }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                const isRowInSelection = rowNum >= selectedRange.minRow && rowNum <= selectedRange.maxRow;

                return (
                  <tr key={rowNum} className="border-b border-slate-200 dark:border-slate-750 hover:bg-emerald-50/20 dark:hover:bg-slate-750/30 transition-colors">
                    {/* Row Number Header */}
                    <td 
                      onClick={() => handleSelectRow(rowNum)}
                      className={`sticky left-0 z-10 w-12 h-8 px-1 text-center font-mono text-[11px] font-medium border-r border-slate-300 dark:border-slate-700 select-none cursor-pointer transition ${
                        isRowInSelection 
                          ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200 font-bold' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                      title={`Klik untuk memblok seluruh Baris ${rowNum}`}
                    >
                      {rowNum}
                    </td>

                    {/* Cells in Row */}
                    {Array.from({ length: numCols }).map((_, cIdx) => {
                      const cellId = formatCellId(cIdx, rowNum);
                      const isSelected = activeCellId === cellId;
                      const inSelection = isCellSelected(cIdx, rowNum);
                      const isTopEdge = inSelection && rowNum === selectedRange.minRow;
                      const isBottomEdge = inSelection && rowNum === selectedRange.maxRow;
                      const isLeftEdge = inSelection && cIdx === selectedRange.minCol;
                      const isRightEdge = inSelection && cIdx === selectedRange.maxCol;

                      const cellConfig: SpreadsheetCell = cells[cellId] || { raw: '' };
                      const isCurrentlyEditing = isSelected && isEditing;
                      const evalRes = evaluatedCells[cellId];

                      // Dynamic text alignment
                      let textAlignClass = 'text-left';
                      if (cellConfig.align === 'center') textAlignClass = 'text-center';
                      else if (cellConfig.align === 'right' || (!cellConfig.align && evalRes?.isNumeric)) textAlignClass = 'text-right';

                      // Custom styling
                      const isBold = cellConfig.bold;
                      const isItalic = cellConfig.italic;
                      const bgColor = cellConfig.bgColor;
                      const textColor = cellConfig.textColor;

                      // Highlight for Posisi Kas (B3) and Total Kas (B2) and Selisih (B4)
                      const isSpecialCell = cellId === 'B2' || cellId === 'B3' || cellId === 'B4';

                      // Determine multi-cell block visual styling
                      let blockClasses = '';
                      if (selectedRange.isMulti && inSelection) {
                        blockClasses = isSelected
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/60 ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-20'
                          : 'bg-emerald-500/15 dark:bg-emerald-400/20 z-10';

                        // Block outer boundaries
                        if (isTopEdge) blockClasses += ' border-t-2 border-t-emerald-600 dark:border-t-emerald-400';
                        if (isBottomEdge) blockClasses += ' border-b-2 border-b-emerald-600 dark:border-b-emerald-400';
                        if (isLeftEdge) blockClasses += ' border-l-2 border-l-emerald-600 dark:border-l-emerald-400';
                        if (isRightEdge) blockClasses += ' border-r-2 border-r-emerald-600 dark:border-r-emerald-400';
                      } else if (isSelected) {
                        blockClasses = 'ring-2 ring-emerald-600 dark:ring-emerald-400 ring-inset z-20 bg-emerald-50/40 dark:bg-emerald-950/30';
                      }

                      return (
                        <td
                          key={cellId}
                          onMouseDown={(e) => handleCellMouseDown(cellId, e)}
                          onMouseEnter={() => handleCellMouseEnter(cellId)}
                          onDoubleClick={() => {
                            setActiveCellId(cellId);
                            setSelectionStart({ col: cIdx, row: rowNum });
                            setSelectionEnd({ col: cIdx, row: rowNum });
                            setIsEditing(true);
                            setEditValue(cells[cellId]?.raw ?? '');
                            setTimeout(() => editInputRef.current?.select(), 20);
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, cellId)}
                          style={{
                            backgroundColor: bgColor || undefined,
                            color: textColor || undefined,
                          }}
                          className={`h-8 px-2 border-r border-slate-200 dark:border-slate-750 relative overflow-hidden transition-all text-ellipsis whitespace-nowrap cursor-cell ${blockClasses} ${
                            isSpecialCell && !isSelected && !inSelection
                              ? cellId === 'B3' && (!cellConfig.raw || cellConfig.raw === '')
                                ? 'bg-amber-50/60 dark:bg-amber-950/20' // highlight empty Posisi Kas cell
                                : cellId === 'B4'
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-bold'
                                : ''
                              : ''
                          }`}
                        >
                          {/* Editing in-place input */}
                          {isCurrentlyEditing ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                setFormulaBarValue(e.target.value);
                              }}
                              onBlur={() => {
                                commitCellEdit(cellId, editValue);
                              }}
                              className="w-full h-full p-0 bg-transparent text-xs font-mono outline-none border-none text-slate-900 dark:text-slate-100"
                              autoFocus
                            />
                          ) : (
                            <div className={`w-full overflow-hidden text-ellipsis ${textAlignClass} ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}>
                              {/* If B3 is completely empty, show helpful subtle placeholder */}
                              {cellId === 'B3' && (!cellConfig.raw || cellConfig.raw === '') ? (
                                <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                                  (Kosong - Isi kas fisik di sini)
                                </span>
                              ) : (
                                renderCellDisplay(cellId)
                              )}
                            </div>
                          )}

                          {/* Excel selection handle square */}
                          {((selectedRange.isMulti && isBottomEdge && isRightEdge) || (!selectedRange.isMulti && isSelected)) && !isCurrentlyEditing && (
                            <div className="absolute right-0 bottom-0 w-2 h-2 bg-emerald-600 dark:bg-emerald-400 cursor-crosshair z-30 pointer-events-none" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Spreadsheet Status Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Lembar Aktif: <strong>Catatan Pengurus</strong></span>
            <span>Ukuran: <strong>{numCols} Kolom × {numRows} Baris</strong></span>
            <span>
              Sel/Blok: <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">{selectedRange.rangeLabel}</strong>
              {selectedRange.isMulti && ` (${selectedRange.count} sel diblok)`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Hapus blok: Tekan <strong>Delete</strong> / klik tombol <strong>Hapus</strong></span>
            <span>Blok rentang: <strong>Drag mouse</strong> atau <strong>Shift + Tombol Panah</strong></span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Template */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Reset Lembar Kerja?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kembalikan spreadsheet ke susunan awal standar pengurus.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tindakan ini akan mengembalikan struktur lembar kerja dengan <strong>Total Kas</strong> dari neraca saldo sistem ({formatRupiah(availableCash)}), mengosongkan <strong>Posisi Kas</strong>, serta mengatur ulang rumus selisih <code>=B3-B2</code>. Data yang baru diketik akan digantikan dengan template default.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
              >
                Ya, Reset Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
