import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Building, ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { KoperasiSetup } from '../types';

interface SplashScreenProps {
  setup?: KoperasiSetup;
  onFinish?: () => void;
  minimumDuration?: number; // duration in ms, default 1500
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  setup,
  onFinish,
  minimumDuration = 1500,
  isLoading = false
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menginisialisasi Portal Koperasi...');
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const handleManualFinish = () => {
    if (!finishedRef.current) {
      finishedRef.current = true;
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }
  };

  useEffect(() => {
    const startTime = Date.now();
    const effectiveMinDuration = Math.min(minimumDuration, 1800);

    const interval = setInterval(() => {
      if (finishedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTime;
      let targetProgress = Math.floor((elapsed / effectiveMinDuration) * 100);

      // If database is still loading, pause progress at 92% until done
      if (isLoading && targetProgress >= 92 && elapsed < 3500) {
        targetProgress = 92;
      }

      const currentProgress = Math.min(100, targetProgress);
      setProgress(currentProgress);

      if (currentProgress < 35) {
        setStatusText('Menginisialisasi Sistem Portal Koperasi...');
      } else if (currentProgress < 70) {
        setStatusText('Menghubungkan Database & Keuangan...');
      } else if (currentProgress < 95) {
        setStatusText('Memuat Data Anggota & Layanan Koperasi...');
      } else {
        setStatusText('Membuka Portal Koperasi...');
      }

      // Complete when duration reached and not loading, or after maximum safety timeout (4s)
      if ((elapsed >= effectiveMinDuration && !isLoading) || elapsed >= 4000) {
        clearInterval(interval);
        setProgress(100);
        finishedRef.current = true;
        setTimeout(() => {
          if (onFinishRef.current) {
            onFinishRef.current();
          }
        }, 150);
      }
    }, 80);

    // Hard fallback safety timer: maximum 4.5 seconds
    const safetyTimer = setTimeout(() => {
      handleManualFinish();
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimer);
    };
  }, [minimumDuration, isLoading]);

  const namaKoperasi = setup?.namaKoperasi || 'KOPERASI SIMPAN PINJAM';
  const slogan = setup?.slogan || 'Sistem Informasi & Portal Layanan Koperasi Digital';
  const logoUrl = setup?.logoUrl;
  const noBadanHukum = setup?.noBadanHukum;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-slate-950 text-white overflow-hidden select-none"
    >
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Brand Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-300 text-[11px] font-bold tracking-wider uppercase shadow-xl backdrop-blur-md z-10"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Sistem Koperasi Resmi & Terintegrasi</span>
      </motion.div>

      {/* Center Branding & Logo */}
      <div className="flex flex-col items-center justify-center text-center max-w-lg w-full my-auto z-10 space-y-6">
        {/* Animated Emblem Logo Box */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative group"
        >
          {/* Pulsing Backlight */}
          <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-80 transition duration-1000 animate-pulse" />

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 border-2 border-emerald-500/30 p-3 shadow-2xl flex items-center justify-center backdrop-blur-xl">
            {logoUrl && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('/') || logoUrl.startsWith('blob:')) ? (
              <img
                src={logoUrl}
                alt="Logo Koperasi"
                className="w-full h-full object-contain drop-shadow-md rounded-2xl"
              />
            ) : logoUrl ? (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-inner font-bold text-4xl select-none">
                {logoUrl}
              </div>
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-inner">
                <Building className="w-14 h-14 text-emerald-100" />
              </div>
            )}
            
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-emerald-500 text-slate-950 shadow-lg border border-emerald-300"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </motion.div>
          </div>
        </motion.div>

        {/* Cooperative Name & Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-sm">
            {namaKoperasi}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-emerald-200/80 max-w-md mx-auto leading-relaxed">
            {slogan}
          </p>
          {noBadanHukum && (
            <div className="pt-1">
              <span className="inline-block text-[10px] font-mono font-semibold px-3 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-400">
                Badan Hukum: {noBadanHukum}
              </span>
            </div>
          )}
        </motion.div>

        {/* Loading Progress Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full max-w-xs space-y-2.5 pt-4"
        >
          {/* Progress Track */}
          <div className="h-2 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-medium truncate max-w-[200px]">
              {progress === 100 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
              )}
              {statusText}
            </span>
            <span className="font-bold text-slate-200">{progress}%</span>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleManualFinish}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-300 transition cursor-pointer py-1 px-3 rounded-lg hover:bg-emerald-950/40 border border-transparent hover:border-emerald-800/40"
            >
              <span>Langsung Masuk ke Portal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center text-[10px] text-slate-500 font-mono tracking-wider z-10 space-y-1"
      >
        <p className="uppercase font-sans font-bold text-slate-400">Portal Aplikasi Koperasi Modern v2.5</p>
        <p>© {new Date().getFullYear()} {namaKoperasi}. All Rights Reserved.</p>
      </motion.div>
    </motion.div>
  );
};
