import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { Sparkles, Award, Calendar, MapPin, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export const OriginalsView: React.FC = () => {
  const {
    originalsPrograms,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
  } = useApp();

  const [applyProgramId, setApplyProgramId] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState('Müzik');
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isStaff = isAuthenticated && ['admin', 'moderator'].includes(currentUser.activeRole);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyProgramId) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/originals/${applyProgramId}/apply`, {
        method: 'POST',
        body: { discipline, pitch },
      });
      await refreshBootstrap();
      setApplyProgramId(null);
      setPitch('');
      setFeedback({ type: 'success', text: 'SanatSahnede Originals başvurunuz jüri havuzuna kaydedildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Başvuru gönderilemedi.' });
    }
  };

  const handleReviewApp = async (programId: string, appId: string, status: 'shortlisted' | 'selected' | 'rejected', juryScore: number) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/originals/${programId}/applications/${appId}/review`, {
        method: 'POST',
        body: { status, juryScore },
      });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Jüri değerlendirmesi kaydedildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Değerlendirme kaydedilemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="rounded-3xl bg-gradient-to-br from-[#16274e] via-[#1E2B4F] to-[#0B1120] p-8 sm:p-10 text-white border border-slate-800 space-y-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-orange-300">
          <Sparkles className="w-4 h-4" />
          <span>10 · SanatSahnede Originals Kürasyon & Sahne Programları</span>
        </span>
        <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
          İlk Sahne, Birleşik, Sahne Senin, Yeni Sesler & Şehirde Sahne
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          SanatSahnede&apos;nin genç sanatçıları, disiplinlerarası üretimleri ve kamusal alan performanslarını destekleyen özgün prodüksiyon serileri.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {originalsPrograms.map((prog) => (
          <article key={prog.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#E45424] uppercase tracking-wider">{prog.seasonTitle}</span>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">{prog.title}</h2>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{prog.tagline}</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  {prog.status === 'open' ? 'Başvuruya Açık' : prog.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{prog.description}</p>

              <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#E45424]" />{prog.city}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#E45424]" />Son Başvuru: {prog.applicationDeadline}</span>
              </div>

              {prog.juryMembers.length > 0 && (
                <div className="text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Jüri: </span>
                  <span className="text-slate-500">{prog.juryMembers.join(', ')}</span>
                </div>
              )}

              {prog.sponsors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {prog.sponsors.map((sp) => (
                    <span key={sp} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0B1120] text-[11px] font-medium">
                      Destekçi: {sp}
                    </span>
                  ))}
                </div>
              )}

              {isStaff && prog.applications.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Jüri & Moderatör Başvuru İnceleme ({prog.applications.length})
                  </div>
                  {prog.applications.map((app) => (
                    <div key={app.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold">{app.applicantName}</span> ({app.discipline}) — {app.status}
                        {app.juryScore !== undefined && <span className="ml-2 text-[#E45424] font-bold">Puan: {app.juryScore}/10</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => handleReviewApp(prog.id, app.id, 'shortlisted', 8)} className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold cursor-pointer">Kısa Liste</button>
                        <button type="button" onClick={() => handleReviewApp(prog.id, app.id, 'selected', 10)} className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">Seçkiye Al</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalMode('login');
                    return;
                  }
                  setApplyProgramId(prog.id);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Originals Seçkisine Başvur</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {applyProgramId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleApply} className="w-full max-w-md bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#16274e] dark:text-white">Originals Program Başvurusu</h3>
            <div>
              <label htmlFor="orig-disc" className="block text-xs font-bold mb-1">Disiplin</label>
              <input id="orig-disc" value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div>
              <label htmlFor="orig-pitch" className="block text-xs font-bold mb-1">Sahne Önerisi & Repertuvar Özeti</label>
              <textarea id="orig-pitch" rows={4} required value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Sahne fikrinizi, ekip yapınızı ve repertuvarınızı özetleyin..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApplyProgramId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Vazgeç</button>
              <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">
                <Send className="w-3.5 h-3.5" />
                <span>Başvuruyu Gönder</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
