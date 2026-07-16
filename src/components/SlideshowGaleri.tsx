import React, { useState, useEffect } from 'react';
import { GaleriKoperasi } from '../types';
import { ChevronLeft, ChevronRight, Calendar, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SlideshowGaleriProps {
  galeri: GaleriKoperasi[];
}

export function SlideshowGaleri({ galeri }: SlideshowGaleriProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Take up to 6 items as requested ("slideshow 6 kegiatan koperasi")
  const activeSlides = galeri.slice(0, 6);

  useEffect(() => {
    if (activeSlides.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % activeSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [activeSlides.length, isHovered]);

  if (activeSlides.length === 0) {
    return (
      <div className="w-full h-80 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-6">
        <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-sm font-bold text-slate-550 dark:text-slate-400">Belum Ada Galeri Kegiatan</p>
        <p className="text-xs text-slate-400 mt-1">Admin dapat menginput dokumentasi foto kegiatan melalui menu Admin Koperasi.</p>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const currentSlide = activeSlides[currentIndex];

  return (
    <div 
      className="w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Slideshow viewport */}
      <div className="relative h-[280px] sm:h-[380px] bg-slate-950 flex items-center justify-center select-none overflow-hidden group/view">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background image */}
            <img 
              src={currentSlide.fotoUrl} 
              alt={currentSlide.judul} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Vignette Overlay / Gradient bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-95" />
          </motion.div>
        </AnimatePresence>

        {/* Date badge overlay */}
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-emerald-900/90 text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            {currentSlide.tanggal}
          </span>
        </div>

        {/* Caption text block overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 z-10 space-y-2 pointer-events-none text-left">
          <motion.div
            key={`caption-${currentIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="max-w-2xl"
          >
            <h4 className="text-base sm:text-xl font-bold text-white tracking-tight drop-shadow-sm line-clamp-1 font-sans">
              {currentSlide.judul}
            </h4>
            {currentSlide.deskripsi && (
              <p className="text-xs text-slate-200 line-clamp-2 mt-1 leading-relaxed drop-shadow-xs max-w-xl">
                {currentSlide.deskripsi}
              </p>
            )}
          </motion.div>
        </div>

        {/* Left and Right Chevron Navigation Buttons */}
        {activeSlides.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              className="absolute left-3 p-2 bg-slate-900/60 hover:bg-slate-900/85 text-white rounded-full backdrop-blur-xs transition z-25 border border-white/10 opacity-0 group-hover/view:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              title="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 h-5" />
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-3 p-2 bg-slate-900/60 hover:bg-slate-900/85 text-white rounded-full backdrop-blur-xs transition z-25 border border-white/10 opacity-0 group-hover/view:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
              title="Selanjutnya"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots navigation block */}
      {activeSlides.length > 1 && (
        <div className="py-3 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-350 cursor-pointer ${
                index === currentIndex 
                  ? 'w-6 bg-emerald-600 dark:bg-emerald-400' 
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
              title={`Buka Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
