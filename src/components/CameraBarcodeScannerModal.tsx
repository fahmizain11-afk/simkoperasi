import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, X, Flashlight, FlipHorizontal, CheckCircle2, AlertTriangle, 
  Upload, Search, Volume2, VolumeX, Sparkles, Layers, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { WarungBarang } from '../types';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string, matchedProduct?: WarungBarang) => void;
  title?: string;
  subtitle?: string;
  warungBarang?: WarungBarang[];
  onQuickAddProduct?: (barcode: string) => void;
}

// Crisp Synthesized POS Beep
function playScanBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 Note
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, ctx.currentTime); // Low warning
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (err) {
    console.warn('AudioContext not supported or allowed yet', err);
  }
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode Kamera HP/Tablet",
  subtitle = "Arahkan kamera ke barcode kemasan barang (EAN-13, UPC, Code 128)",
  warungBarang = [],
  onQuickAddProduct
}: CameraBarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Continuous / Batch scanning mode
  const [isContinuous, setIsContinuous] = useState(false);
  const [scannedHistory, setScannedHistory] = useState<{ code: string; name?: string; time: string }[]>([]);
  const [lastScannedResult, setLastScannedResult] = useState<{ code: string; name?: string; success: boolean } | null>(null);

  // Manual input state
  const [manualCode, setManualCode] = useState('');

  // Scanner instance ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);
  const containerId = "html5-barcode-scanner-viewport";

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          isStoppingRef.current = true;
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        }
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      } finally {
        html5QrCodeRef.current = null;
        isStoppingRef.current = false;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  }, []);

  // Handle scanned decoded text
  const handleDecodedBarcode = useCallback((decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    // Cooldown check for identical barcode: 1.5 seconds
    const now = Date.now();
    if (cleanCode === lastScannedCodeRef.current && (now - lastScanTimestampRef.current) < 1600) {
      return;
    }
    lastScannedCodeRef.current = cleanCode;
    lastScanTimestampRef.current = now;

    // Check match in catalog
    const matched = warungBarang.find(b => 
      (b.kodeBarang && b.kodeBarang.trim().toLowerCase() === cleanCode.toLowerCase()) ||
      b.namaBarang.toLowerCase() === cleanCode.toLowerCase()
    );

    if (soundEnabled) {
      playScanBeep(!!matched || !warungBarang.length);
    }

    setLastScannedResult({
      code: cleanCode,
      name: matched ? matched.namaBarang : undefined,
      success: true
    });

    setScannedHistory(prev => [
      { code: cleanCode, name: matched?.namaBarang, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      ...prev.slice(0, 15)
    ]);

    // Propagate scan to parent
    onScan(cleanCode, matched);

    // If single scan mode, stop camera and close modal
    if (!isContinuous) {
      setTimeout(() => {
        onClose();
      }, 500);
    }
  }, [warungBarang, soundEnabled, isContinuous, onScan, onClose]);

  // Start camera helper
  const startCamera = useCallback(async (cameraIdToUse?: string) => {
    if (!isOpen) return;
    await stopCamera();

    const element = document.getElementById(containerId);
    if (!element) return;

    setErrorMessage(null);
    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });
      html5QrCodeRef.current = scanner;

      // Available cameras
      const availableDevices = await Html5Qrcode.getCameras();
      if (availableDevices && availableDevices.length > 0) {
        setCameras(availableDevices);
      }

      const cameraConfig = cameraIdToUse 
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Rectangular box suitable for standard 1D barcodes and QR codes
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.min(viewfinderWidth * 0.85, 340);
            const boxHeight = Math.min(minDim * 0.55, 180);
            return { width: Math.round(boxWidth), height: Math.round(boxHeight) };
          },
          aspectRatio: 1.333333
        },
        (decodedText) => {
          handleDecodedBarcode(decodedText);
        },
        () => {
          // ignore frame errors while seeking
        }
      );

      setIsScanning(true);

      // Check torch capability
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        setHasTorch(capabilities && capabilities.torchFeature().isSupported());
      } catch {
        setHasTorch(false);
      }

    } catch (err: unknown) {
      console.error("Camera start error:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes("NotAllowedError") || errStr.includes("Permission")) {
        setErrorMessage("Izin akses kamera ditolak. Mohon izinkan akses kamera di browser Anda.");
      } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
        setErrorMessage("Kamera tidak ditemukan pada perangkat ini. Gunakan fitur upload gambar atau ketik manual.");
      } else {
        setErrorMessage("Gagal menyalakan kamera. Coba balik kamera atau gunakan upload foto barcode.");
      }
      setIsScanning(false);
    }
  }, [isOpen, stopCamera, handleDecodedBarcode]);

  // Flip / switch camera
  const handleFlipCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed", e);
    }
  };

  // Scan from uploaded file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      // Create temporary scanner instance for file scanning
      const tempScanner = new Html5Qrcode("temp-barcode-file-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleDecodedBarcode(decodedText);
    } catch (err: unknown) {
      console.error("File barcode scan error:", err);
      setErrorMessage("Tidak dapat mendeteksi barcode dari foto ini. Pastikan barcode terlihat tajam, cukup cahaya, dan tidak terpotong.");
      if (soundEnabled) playScanBeep(false);
    }
  };

  // Submit manual code
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecodedBarcode(manualCode.trim());
    setManualCode('');
  };

  // Lifecycle when modal opens/closes or active tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera(selectedCameraId);
      }, 250);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, startCamera, stopCamera, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-emerald-300 border border-white/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">{title}</h3>
                <span className="px-2 py-0.5 bg-emerald-400/20 text-emerald-200 text-[10px] font-mono rounded-full border border-emerald-400/30">
                  EAN-13 / UPC / 128
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5 line-clamp-1">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            aria-label="Tutup Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Scanner Controls */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-250 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Langsung</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Gambar</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ketik Kode</span>
            </button>
          </div>

          {/* Quick controls: Sound & Continuous mode */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title={soundEnabled ? "Suara beep aktif" : "Suara beep nonaktif"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsContinuous(!isContinuous)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isContinuous
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Mode Scan Beruntun (Multi-Scan tanpa menutup kamera)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mode:</span>
              <span>{isContinuous ? 'Beruntun' : 'Tunggal'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center">
              {/* Viewport Box */}
              <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-inner aspect-[4/3] flex items-center justify-center border-2 border-emerald-500/40">
                {/* HTML5 QR Code Mount Node */}
                <div 
                  id={containerId} 
                  className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" 
                />

                {/* Laser animation & guide overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Viewfinder Target Border */}
                    <div className="relative w-[82%] h-[60%] border-2 border-emerald-400 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      {/* Laser scanning line */}
                      <motion.div
                        className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444]"
                        animate={{ y: [0, 140, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                      />
                      {/* Corner marks */}
                      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                    </div>
                    <span className="text-[11px] font-mono text-emerald-300 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Posisikan garis merah melintang di atas barcode
                    </span>
                  </div>
                )}

                {/* Camera toolbar: flip & flashlight */}
                {isScanning && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 pointer-events-auto">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer ${
                          torchOn 
                            ? 'bg-amber-400 text-slate-900 shadow-md' 
                            : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                      >
                        <Flashlight className="w-3.5 h-3.5" />
                        <span>{torchOn ? 'Lampu Nyala' : 'Lampu'}</span>
                      </button>
                    )}

                    {cameras.length > 1 && (
                      <button
                        type="button"
                        onClick={handleFlipCamera}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition cursor-pointer"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Balik Kamera</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Loading state before camera starts */}
                {!isScanning && !errorMessage && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                    <p className="text-sm font-bold">Menyiapkan Kamera...</p>
                    <p className="text-xs text-slate-400 mt-1">Mengaktifkan sensor kamera perangkat Anda</p>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mt-3 w-full max-w-md p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-bold">Kamera Belum Aktif</p>
                    <p className="mt-0.5">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(selectedCameraId)}
                      className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      Coba Sambungkan Ulang
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload File / Photo Scanner */}
          {activeTab === 'upload' && (
            <div className="w-full max-w-md flex flex-col items-center text-center py-4">
              <div id="temp-barcode-file-reader" className="hidden" />
              <label 
                htmlFor="barcode-file-upload-input"
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 dark:bg-slate-850 group"
              >
                <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full mb-3 group-hover:scale-105 transition">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Pilih atau Ambil Foto Barcode
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Dukung format JPG, PNG, WEBP. Sistem akan otomatis mendeteksi barcode dari gambar.
                </span>
                <input
                  id="barcode-file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {errorMessage && (
                <div className="mt-3 w-full p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Manual Code Entry */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full max-w-md py-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ketik Nomor Barcode / Kode SKU:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Contoh: 8992753210012 atau WRG-001..."
                  autoFocus
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-emerald-600"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
                >
                  Proses
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Tekan Enter atau klik Proses untuk memasukkan item ke transaksi kasir.
              </p>
            </form>
          )}

          {/* Scanned Feedback Card */}
          <AnimatePresence>
            {lastScannedResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 w-full max-w-md p-3 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{lastScannedResult.name || 'Kode Terdeteksi:'}</span>
                      <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.2 border rounded text-[11px]">
                        {lastScannedResult.code}
                      </span>
                    </div>
                    {!lastScannedResult.name && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        ⚠️ Produk belum terdaftar di katalog warung.
                      </p>
                    )}
                  </div>
                </div>

                {!lastScannedResult.name && onQuickAddProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickAddProduct(lastScannedResult.code);
                      stopCamera();
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer shrink-0 transition"
                  >
                    + Daftarkan
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanned History in Continuous Mode */}
          {isContinuous && scannedHistory.length > 0 && (
            <div className="mt-4 w-full max-w-md border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Riwayat Scan Sesi Ini ({scannedHistory.length} item)
                </span>
                <button
                  type="button"
                  onClick={() => setScannedHistory([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Bersihkan
                </button>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {scannedHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.name || item.code}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-750 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 shrink-0">
                      {item.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Support: EAN-13, EAN-8, UPC, Code 128, QR Code</span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
