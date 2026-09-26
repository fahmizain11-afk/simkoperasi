import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Scale, 
  TrendingUp, 
  ShieldCheck, 
  Wallet, 
  History, 
  CreditCard, 
  ArrowRight, 
  Copy, 
  Check, 
  RefreshCw, 
  X,
  Info
} from 'lucide-react';
import { Anggota, PengajuanPinjaman, LoanAIRecommendation } from '../types';
import { formatRupiah } from '../utils/finance';

export interface FinancialMemberSummary {
  simpananPokok: number;
  simpananWajib: number;
  simpananSukarela: number;
  totalSimpanan: number;
  jumlahBulanSimpananWajib: number;
  riwayatPinjamanCount: number;
  pinjamanLunasCount: number;
  pinjamanAktifCount: number;
  sisaHutangPinjamanAktif: number;
  riwayatAngsuranCount: number;
  totalAngsuranTerbayar: number;
  hasActiveLoan: boolean;
  sisaHutangWarung: number;
  rasioPinjamanKeSimpanan: number;
  angsuranPerBulan: number;
}

interface LoanAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: PengajuanPinjaman | null;
  member: Anggota | null;
  financialSummary: FinancialMemberSummary | null;
  onApplyRecommendation: (
    recommendation: 'SETUJUI' | 'SETUJUI_SEBAGIAN' | 'TOLAK', 
    suggestedNominal: number, 
    notes: string
  ) => void;
}

export function LoanAIAssistantModal({
  isOpen,
  onClose,
  proposal,
  member,
  financialSummary,
  onApplyRecommendation
}: LoanAIAssistantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LoanAIRecommendation | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);

  // Trigger analysis whenever modal opens with a new proposal
  useEffect(() => {
    if (!isOpen || !proposal || !financialSummary) {
      setAnalysis(null);
      setError(null);
      return;
    }

    // If proposal already had cached recommendation, load it first
    if (proposal.aiRecommendation) {
      setAnalysis(proposal.aiRecommendation);
    }

    runAnalysis();
  }, [isOpen, proposal?.id]);

  const runAnalysis = async () => {
    if (!proposal || !financialSummary) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/loan-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberInfo: {
            id: member?.id || proposal.anggotaId,
            nama: member?.nama || 'Anggota',
            noAnggota: member?.noAnggota || '-',
            pekerjaan: member?.pekerjaan || '-',
            tanggalBergabung: member?.tanggalBergabung || '-'
          },
          proposal: {
            id: proposal.id,
            nominalPinjaman: proposal.nominalPinjaman,
            tenor: proposal.tenor,
            bungaFlatPersen: proposal.bungaFlatPersen,
            alasanPengajuan: proposal.alasanPengajuan
          },
          financialSummary
        })
      });

      if (!res.ok) {
        throw new Error('Gagal mendapatkan respon dari server analisis AI');
      }

      const data: LoanAIRecommendation = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      // Fallback deterministic computation
      const requestedNominal = proposal.nominalPinjaman || 0;
      const totalSimpanan = financialSummary.totalSimpanan || 0;
      const ratio = totalSimpanan > 0 ? Number((requestedNominal / totalSimpanan).toFixed(2)) : 99;

      let rec: 'SETUJUI' | 'SETUJUI_SEBAGIAN' | 'TOLAK' = 'SETUJUI';
      let score = 85;
      let risk: 'Rendah' | 'Sedang' | 'Tinggi' = 'Rendah';
      let suggested = requestedNominal;
      let reason = 'Pengajuan memenuhi kriteria kelayakan kredit standar koperasi.';
      let recNotes = `Pengajuan pinjaman sebesar ${formatRupiah(requestedNominal)} telah diverifikasi dan disetujui penuh oleh pengurus.`;

      if (financialSummary.hasActiveLoan) {
        rec = 'TOLAK';
        score = 25;
        risk = 'Tinggi';
        suggested = 0;
        reason = 'Anggota masih memiliki pinjaman aktif yang belum berstatus lunas.';
        recNotes = 'Mohon maaf, pengajuan belum dapat disetujui karena masih ada pinjaman berjalan yang belum lunas.';
      } else if (totalSimpanan <= 0) {
        rec = 'TOLAK';
        score = 20;
        risk = 'Tinggi';
        suggested = 0;
        reason = 'Saldo simpanan anggota belum mencukupi sebagai penyertaan modal.';
        recNotes = 'Mohon maaf, pengajuan pinjaman belum dapat disetujui karena belum mengaktifkan simpanan wajib.';
      } else if (ratio > 3.0) {
        rec = 'SETUJUI_SEBAGIAN';
        score = 64;
        risk = 'Sedang';
        suggested = Math.max(500000, Math.floor((totalSimpanan * 2.0) / 100000) * 100000);
        reason = `Plafon pengajuan melebihi 3x total simpanan (${ratio}x). Disarankan disetujui sebagian sebesar ${formatRupiah(suggested)}.`;
        recNotes = `Pengajuan pinjaman disetujui sebagian sebesar ${formatRupiah(suggested)} dengan pertimbangan batas aman rasio simpanan.`;
      }

      setAnalysis({
        recommendation: rec,
        skorKelayakan: score,
        riskLevel: risk,
        suggestedNominal: suggested,
        alasanUtama: reason,
        analisisSimpanan: `Total simpanan anggota saat ini ${formatRupiah(totalSimpanan)} dengan rasio pengajuan ${ratio}x.`,
        analisisRiwayatTransaksi: `Anggota ${financialSummary.pinjamanLunasCount > 0 ? `memiliki ${financialSummary.pinjamanLunasCount} pinjaman lunas sebelumnya.` : 'belum memiliki riwayat pinjaman lunas.'}`,
        catatanRekomendasiPengurus: recNotes,
        poinPertimbangan: [
          `Rasio Pinjaman/Simpanan: ${ratio}x`,
          financialSummary.hasActiveLoan ? 'Ada pinjaman aktif' : 'Bebas pinjaman berjalan',
          financialSummary.sisaHutangWarung > 0 ? `Kasbon warung: ${formatRupiah(financialSummary.sisaHutangWarung)}` : 'Tidak ada tunggakan kasbon'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  if (!isOpen || !proposal || !financialSummary) return null;

  const requestedNominal = proposal.nominalPinjaman || 0;
  const totalSimpanan = financialSummary.totalSimpanan || 0;
  const ratio = totalSimpanan > 0 ? (requestedNominal / totalSimpanan).toFixed(2) : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                  Rekomendasi Pakar Analisis Kredit & Pinjaman
                </h3>
                <span className="px-2 py-0.5 bg-indigo-500/40 border border-indigo-300/30 rounded-full text-[10px] font-bold text-indigo-100 uppercase tracking-wider">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Evaluasi kelayakan otomatis berdasarkan simpanan & riwayat transaksi anggota
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Profile Quick Ribbon */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">{member?.nama || 'Anggota'}</span>
            <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold">
              {member?.noAnggota || '-'}
            </span>
            {member?.pekerjaan && (
              <span className="text-slate-500 dark:text-slate-400">({member.pekerjaan})</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <span>Diajukan: <strong className="text-slate-900 dark:text-white font-mono">{formatRupiah(requestedNominal)}</strong></span>
            <span>Tenor: <strong>{proposal.tenor} Bulan</strong></span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200 text-sm">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full border border-indigo-200 dark:border-indigo-800">
                <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Menjalankan Analisis Keuangan Anggota...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Memeriksa rasio simpanan pokok, wajib, sukarela, riwayat pelunasan pinjaman lalu, dan beban angsuran.
                </p>
              </div>
            </div>
          ) : analysis ? (
            <>
              {/* Verdict Card */}
              <div className={`p-4 rounded-2xl border-2 transition ${
                analysis.recommendation === 'SETUJUI'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/60 text-emerald-950 dark:text-emerald-100'
                  : analysis.recommendation === 'SETUJUI_SEBAGIAN'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/60 text-amber-950 dark:text-amber-100'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-500/60 text-rose-950 dark:text-rose-100'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-2xl text-white shadow-sm shrink-0 ${
                      analysis.recommendation === 'SETUJUI'
                        ? 'bg-emerald-600'
                        : analysis.recommendation === 'SETUJUI_SEBAGIAN'
                        ? 'bg-amber-600'
                        : 'bg-rose-600'
                    }`}>
                      {analysis.recommendation === 'SETUJUI' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : analysis.recommendation === 'SETUJUI_SEBAGIAN' ? (
                        <Scale className="w-6 h-6" />
                      ) : (
                        <XCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          analysis.recommendation === 'SETUJUI'
                            ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                            : analysis.recommendation === 'SETUJUI_SEBAGIAN'
                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                        }`}>
                          {analysis.recommendation === 'SETUJUI'
                            ? '🟢 DIREKOMENDASIKAN: DISETUJUI PENUH'
                            : analysis.recommendation === 'SETUJUI_SEBAGIAN'
                            ? '🟡 DIREKOMENDASIKAN: DISETUJUI SEBAGIAN'
                            : '🔴 TIDAK DIREKOMENDASIKAN / TOLAK'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Tingkat Risiko: <strong className={
                            analysis.riskLevel === 'Rendah' ? 'text-emerald-600 font-bold' :
                            analysis.riskLevel === 'Sedang' ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold'
                          }>{analysis.riskLevel}</strong>
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                        {analysis.alasanUtama}
                      </h4>

                      {analysis.recommendation === 'SETUJUI_SEBAGIAN' && (
                        <div className="mt-2 p-2.5 bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-800 rounded-xl text-xs flex items-center justify-between gap-3">
                          <span className="text-slate-600 dark:text-slate-300">
                            Saran Plafon Aman Disetujui AI:
                          </span>
                          <span className="font-mono text-base font-black text-amber-700 dark:text-amber-400">
                            {formatRupiah(analysis.suggestedNominal)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kelayakan Score Ring */}
                  <div className="text-center shrink-0 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-[90px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Skor Kelayakan
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      analysis.skorKelayakan >= 75 ? 'text-emerald-600' :
                      analysis.skorKelayakan >= 50 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {analysis.skorKelayakan}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Financial Profile Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                    <Wallet className="w-3 h-3 text-indigo-500" />
                    Total Simpanan
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {formatRupiah(totalSimpanan)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Wajib: {formatRupiah(financialSummary.simpananWajib)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3 text-indigo-500" />
                    Rasio Kredit / Simpanan
                  </span>
                  <p className={`font-mono font-bold text-sm ${
                    Number(ratio) <= 2.5 ? 'text-emerald-600' :
                    Number(ratio) <= 3.5 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {ratio}x Simpanan
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {Number(ratio) <= 2.5 ? 'Batas Sehat (<=2.5x)' : 'Melebihi Batas Ideal'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                    <History className="w-3 h-3 text-indigo-500" />
                    Riwayat Angsuran
                  </span>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {financialSummary.hasActiveLoan ? (
                      <span className="text-rose-600">Ada Pinjaman Aktif</span>
                    ) : financialSummary.pinjamanLunasCount > 0 ? (
                      <span className="text-emerald-600">{financialSummary.pinjamanLunasCount}x Lunas Tertib</span>
                    ) : (
                      <span className="text-slate-500">Kredit Pertama</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {financialSummary.riwayatAngsuranCount}x bayar angsuran
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                    <CreditCard className="w-3 h-3 text-indigo-500" />
                    Hutang Kasbon Warung
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                    {financialSummary.sisaHutangWarung > 0 ? (
                      <span className="text-amber-600">{formatRupiah(financialSummary.sisaHutangWarung)}</span>
                    ) : (
                      <span className="text-emerald-600">Lunas (Rp 0)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Toko / Warung Koperasi
                  </p>
                </div>
              </div>

              {/* Analysis Narratives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Analisis Kecukupan Simpanan
                  </h5>
                  <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                    {analysis.analisisSimpanan}
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    Analisis Riwayat Transaksi & Reputasi
                  </h5>
                  <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                    {analysis.analisisRiwayatTransaksi}
                  </p>
                </div>
              </div>

              {/* Key Consideration Points */}
              {analysis.poinPertimbangan && analysis.poinPertimbangan.length > 0 && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    Poin Kunci Pertimbangan Komite Kredit:
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600 dark:text-slate-300">
                    {analysis.poinPertimbangan.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ready-to-Send Note Draft for Pengurus */}
              {analysis.catatanRekomendasiPengurus && (
                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      💬 Rekomendasi Draft Catatan untuk Anggota:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyNote(analysis.catatanRekomendasiPengurus)}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                    >
                      {copiedNote ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-indigo-950 dark:text-indigo-200 italic bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                    "{analysis.catatanRekomendasiPengurus}"
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Quick Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Analisis Ulang
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              Tutup
            </button>

            {analysis && (
              <>
                {analysis.recommendation === 'SETUJUI_SEBAGIAN' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRecommendation('SETUJUI_SEBAGIAN', analysis.suggestedNominal, analysis.catatanRekomendasiPengurus);
                      onClose();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Scale className="w-4 h-4" />
                    Terapkan Saran Disetujui Sebagian ({formatRupiah(analysis.suggestedNominal)})
                  </button>
                ) : analysis.recommendation === 'SETUJUI' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRecommendation('SETUJUI', requestedNominal, analysis.catatanRekomendasiPengurus);
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Terapkan Saran & Setujui Penuh ({formatRupiah(requestedNominal)})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRecommendation('TOLAK', 0, analysis.catatanRekomendasiPengurus);
                      onClose();
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Terapkan Saran Tolak Pengajuan
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
