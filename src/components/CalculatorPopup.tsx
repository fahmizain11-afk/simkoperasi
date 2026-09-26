import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Copy, Check, Delete, CornerDownLeft, ClipboardPaste, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalculatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorPopup({ isOpen, onClose }: CalculatorPopupProps) {
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [pasted, setPasted] = useState<boolean>(false);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);
  
  // Screen size awareness
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const isMobile = windowSize.width < 640;
  const isTablet = windowSize.width >= 640 && windowSize.width < 1024;

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate default center position when modal opens or screen resizes
  useEffect(() => {
    if (isOpen) {
      if (isMobile) {
        setPosition(null); // On mobile, use responsive fixed center
      } else {
        const modalWidth = isTablet ? Math.min(520, windowSize.width - 32) : 580;
        const modalHeight = isTablet ? 340 : 310;
        const centerX = Math.max(12, Math.floor((windowSize.width - modalWidth) / 2));
        const centerY = Math.max(12, Math.floor((windowSize.height - modalHeight) / 2));
        
        setPosition(prev => {
          if (!prev) return { x: centerX, y: centerY };
          // Clamp existing position to current viewport
          const clampedX = Math.max(8, Math.min(windowSize.width - modalWidth - 8, prev.x));
          const clampedY = Math.max(8, Math.min(windowSize.height - modalHeight - 8, prev.y));
          return { x: clampedX, y: clampedY };
        });
      }
    }
  }, [isOpen, windowSize.width, windowSize.height, isMobile, isTablet]);

  // Handle keyboard inputs & paste
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
        handleDigit(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleOperator(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText) {
        const clean = pastedText.replace(/[^0-9.]/g, '');
        if (clean) {
          setDisplay(clean);
          setHasCalculated(false);
          setPasted(true);
          setTimeout(() => setPasted(false), 1500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, display, equation, hasCalculated]);

  const handleDigit = (digit: string) => {
    if (hasCalculated) {
      setDisplay(digit === '.' ? '0.' : digit);
      setEquation('');
      setHasCalculated(false);
      return;
    }

    if (digit === '.') {
      if (display.includes('.')) return;
      setDisplay(prev => prev + '.');
    } else {
      setDisplay(prev => (prev === '0' ? digit : prev + digit));
    }
  };

  const handleOperator = (op: string) => {
    const sym = op === '*' ? '×' : op === '/' ? '÷' : op;
    setEquation(`${display} ${sym} `);
    setDisplay('0');
    setHasCalculated(false);
  };

  const handleEvaluate = () => {
    if (!equation) return;
    try {
      const parts = equation.trim().split(' ');
      if (parts.length < 2) return;

      const num1 = parseFloat(parts[0]);
      const operator = parts[1];
      const num2 = parseFloat(display);

      let result = 0;
      if (operator === '×' || operator === '*') {
        result = num1 * num2;
      } else if (operator === '÷' || operator === '/') {
        if (num2 === 0) {
          setDisplay('Error');
          setEquation('');
          setHasCalculated(true);
          return;
        }
        result = num1 / num2;
      } else if (operator === '+') {
        result = num1 + num2;
      } else if (operator === '-') {
        result = num1 - num2;
      }

      const cleanResult = parseFloat(result.toFixed(6)).toString();
      setEquation(`${parts[0]} ${operator} ${display} =`);
      setDisplay(cleanResult);
      setHasCalculated(true);
    } catch {
      setDisplay('Error');
      setEquation('');
      setHasCalculated(true);
    }
  };

  const handlePercentage = () => {
    const current = parseFloat(display);
    if (isNaN(current)) return;
    const result = current / 100;
    setDisplay(result.toString());
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setHasCalculated(false);
  };

  const handleBackspace = () => {
    if (hasCalculated) {
      handleClear();
      return;
    }
    setDisplay(prev => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  };

  const handleAddThousand = () => {
    if (display === '0' || hasCalculated) return;
    setDisplay(prev => prev + '000');
  };

  // Copy result to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = display;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // Paste from clipboard into calculator
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const clean = text.replace(/[^0-9.]/g, '');
      if (clean) {
        setDisplay(clean);
        setHasCalculated(false);
        setPasted(true);
        setTimeout(() => setPasted(false), 1500);
      }
    } catch {
      // Fallback
    }
  };

  // Dragging support (desktop/tablet)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    isDraggingRef.current = true;
    const modalWidth = isTablet ? 500 : 580;
    const currentPos = position || {
      x: Math.max(10, Math.floor((window.innerWidth - modalWidth) / 2)),
      y: Math.max(10, Math.floor((window.innerHeight - 320) / 2)),
    };
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;
      const newX = Math.max(8, Math.min(window.innerWidth - modalWidth - 8, dragStartRef.current.posX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 330, dragStartRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  // Format display for readability
  const formatDisplay = (val: string) => {
    if (val === 'Error' || !val) return val;
    if (val.includes('.')) {
      const [intPart, decPart] = val.split('.');
      const formattedInt = Number(intPart).toLocaleString('id-ID');
      return `${formattedInt}.${decPart}`;
    }
    const num = Number(val);
    if (!isNaN(num)) {
      return num.toLocaleString('id-ID');
    }
    return val;
  };

  const modalWidthClass = isMobile 
    ? 'w-[94vw] max-w-[360px]' 
    : isTablet 
    ? 'w-[90vw] max-w-[500px]' 
    : 'w-[580px]';

  const positionStyle: React.CSSProperties = isMobile || !position
    ? {}
    : { left: `${position.x}px`, top: `${position.y}px` };

  return (
    <AnimatePresence>
      <div 
        className={`fixed z-[160] pointer-events-auto select-none ${
          isMobile 
            ? 'inset-0 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs' 
            : ''
        }`}
        style={!isMobile ? positionStyle : undefined}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: isMobile ? 12 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`bg-white border-2 border-emerald-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${modalWidthClass}`}
        >
          {/* Header */}
          <div 
            onMouseDown={!isMobile ? handleMouseDown : undefined}
            className={`h-[42px] bg-emerald-600 border-b border-emerald-700 px-3.5 flex items-center justify-between shrink-0 text-white ${
              !isMobile ? 'cursor-move' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-white stroke-[2.5]" />
              <span className="font-extrabold text-xs tracking-wide text-white uppercase">Kalkulator Koperasi</span>
              {!isMobile && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-white font-mono font-bold bg-emerald-700 border border-emerald-500 px-1.5 py-0.5 rounded">
                  <Move className="w-2.5 h-2.5" /> Geser
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={handlePaste}
                className="text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-500 px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Tempel angka dari clipboard (Paste)"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span className="hidden xs:inline">{pasted ? 'Ditempel!' : 'Paste'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-500 px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Salin hasil perhitungan ke clipboard (Copy)"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    <span className="hidden xs:inline">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    <span className="hidden xs:inline">Salin</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:bg-emerald-700 border border-transparent hover:border-emerald-500 p-1.5 rounded-lg transition cursor-pointer ml-1 active:scale-95"
                title="Tutup Popup Kalkulator"
              >
                <X className="w-4 h-4 text-white stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Display Screen */}
          <div className="min-h-[58px] bg-white px-3.5 py-2 flex items-center justify-between shrink-0 border-b-2 border-emerald-600 gap-2">
            <div className="flex flex-col justify-center text-left min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Operasi</span>
              <div className="text-xs font-mono font-bold text-emerald-800 truncate">
                {equation || <span className="text-emerald-300 font-sans font-normal">-</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span 
                onClick={handleCopy}
                title="Klik angka untuk salin"
                className="text-xl sm:text-2xl font-black font-mono tracking-tight text-blue-600 cursor-pointer hover:underline"
              >
                {formatDisplay(display)}
              </span>
            </div>
          </div>

          {/* Keypad Grid: Mobile 4-Cols vs Desktop/Tablet 6-Cols */}
          {isMobile ? (
            /* 4-COLUMN MOBILE / SMARTPHONE LAYOUT */
            <div className="p-2.5 grid grid-cols-4 gap-1.5 bg-slate-50">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handleClear}
                className="h-[44px] bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-800 font-black text-sm rounded-xl border border-rose-300 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Clear All (C)"
              >
                C
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-[44px] bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 font-bold text-sm rounded-xl border border-amber-300 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Backspace (⌫)"
              >
                <Delete className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handlePercentage}
                className="h-[44px] bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-black text-sm rounded-xl border border-emerald-400 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Persentase (%)"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleOperator('/')}
                className="h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Bagi (÷)"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleDigit('7')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit('8')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit('9')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleOperator('*')}
                className="h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Kali (×)"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleDigit('4')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('6')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleOperator('-')}
                className="h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Kurang (−)"
              >
                −
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleDigit('1')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleDigit('2')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleDigit('3')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleOperator('+')}
                className="h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Tambah (+)"
              >
                +
              </button>

              {/* Row 5 */}
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleAddThousand}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-xs rounded-xl border-2 border-emerald-400 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Tambah Ribuan (000)"
              >
                000
              </button>
              <button
                type="button"
                onClick={() => handleDigit('.')}
                className="h-[44px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-lg rounded-xl border-2 border-emerald-400 transition cursor-pointer shadow-2xs active:scale-95"
              >
                ,
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                className="h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-black text-xl rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                title="Sama dengan (=)"
              >
                =
              </button>
            </div>
          ) : (
            /* 6-COLUMN DESKTOP / TABLET LAYOUT */
            <div className="p-2.5 grid grid-cols-6 gap-1.5 bg-white">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handleClear}
                className="h-[40px] bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-black text-sm rounded-xl border border-emerald-500 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Clear All (C)"
              >
                C
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-[40px] bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-bold text-sm rounded-xl border border-emerald-500 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Backspace (⌫)"
              >
                <Delete className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handlePercentage}
                className="h-[40px] bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-black text-sm rounded-xl border border-emerald-500 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Persentase (%)"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleOperator('/')}
                className="h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Bagi (÷)"
              >
                ÷
              </button>
              <button
                type="button"
                onClick={() => handleOperator('*')}
                className="h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Kali (×)"
              >
                ×
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="h-[40px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-400 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                title="Salin hasil perhitungan ke clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                <span>Copy</span>
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleDigit('7')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit('8')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit('9')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleOperator('-')}
                className="h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Kurang (−)"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleAddThousand}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-xs rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Tambah Ribuan (000)"
              >
                000
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="h-[40px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-400 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                title="Tempel angka dari clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                <span>Paste</span>
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleDigit('4')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit('5')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit('6')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleOperator('+')}
                className="h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Tambah (+)"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                className="col-span-2 h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-98"
                title="Hitung Hasil (Enter / =)"
              >
                <span className="text-base">=</span>
                <span>Hitung Hasil</span>
                <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5] text-white" />
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleDigit('1')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleDigit('2')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleDigit('3')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleDigit('.')}
                className="h-[40px] bg-white hover:bg-emerald-50 active:bg-emerald-100 text-blue-600 font-black text-base rounded-xl border-2 border-emerald-400 hover:border-emerald-600 transition cursor-pointer shadow-2xs active:scale-95"
              >
                ,
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                className="h-[40px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-xl border border-emerald-700 transition cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
                title="Sama dengan (=)"
              >
                =
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

