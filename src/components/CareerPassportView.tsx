import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { Award, ShieldCheck, QrCode, Printer, Plus, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface CareerPassportViewProps {
  artistId?: string;
}

export const CareerPassportView: React.FC<CareerPassportViewProps> = ({ artistId }) => {
  const {
    artists,
    careerRecords,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
  } = useApp();

  const targetArtist = useMemo(() => {
    if (artistId) return artists.find((a) => a.id === artistId) || artists[0];
    if (isAuthenticated) {
      return artists.find((a) => a.userId === currentUser.id) || artists[0];
    }
    return artists[0];
  }, [artistId, artists, isAuthenticated, currentUser.id]);

  const [selectedArtistId, setSelectedArtistId] = useState<string>(targetArtist?.id || '');
  const activeArtist = artists.find((a) => a.id === (selectedArtistId || targetArtist?.id)) || targetArtist;

  const records = useMemo(() => {
    if (!activeArtist) return careerRecords;
    return careerRecords.filter((r) => r.artistId === activeArtist.id || r.userId === activeArtist.userId);
  }, [careerRecords, activeArtist]);

  const [qrData, setQrData] = useState<{ targetUrl: string; qrDataUrl: string } | null>(null);
  const [form, setForm] = useState({
    title: '',
    organizationName: '',
    venueName: '',
    roleTitle: 'Solist',
    eventDate: '2026-10-15',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLoadQr = async () => {
    if (!activeArtist) return;
    try {
      const res = await apiRequest<{ targetUrl: string; qrDataUrl: string }>(`/api/career-passport/${activeArtist.id}/qr`);
      setQrData(res);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'QR oluşturulamadı.' });
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setFeedback(null);
    try {
      await apiRequest('/api/career-passport', {
        method: 'POST',
        body: form,
      });
      await refreshBootstrap();
      setForm({ title: '', organizationName: '', venueName: '', roleTitle: 'Solist', eventDate: '2026-10-15' });
      setFeedback({ type: 'success', text: 'Manuel sahne geçmişi kaydınız eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Kayıt eklenemedi.' });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/career-passport/${recordId}`, { method: 'DELETE' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Manuel sahne geçmişi kaydı silindi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Kayıt silinemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.10 · Sanatçı Kariyer Pasaportu</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Doğrulanmış Sahne Sicili & Kariyer Pasaportu
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Platform içi tamamlanan sözleşmeli performanslar otomatik olarak "Doğrulanmış Platform Kaydı" rozeti kazanır. Geçmiş sahnelerinizi ekleyebilir, QR ile kurumlara sunabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoadQr}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Pasaport QR Üret</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#E45424]" />
            <span>Yazdır / CV</span>
          </button>
        </div>
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

      {/* Artist Selector + QR Card */}
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <label htmlFor="passport-artist" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            İncelenen Sanatçı Pasaportu
          </label>
          <select
            id="passport-artist"
            value={activeArtist?.id || ''}
            onChange={(e) => {
              setSelectedArtistId(e.target.value);
              setQrData(null);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-sm font-bold"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.fullName} — {a.title}</option>
            ))}
          </select>
          {activeArtist && (
            <div className="text-xs text-slate-500">
              {activeArtist.city} · {activeArtist.completedJobsCount} Doğrulanmış Sahne · Puan: {activeArtist.ratingAvg.toFixed(1)}
            </div>
          )}
        </div>

        {qrData && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
            <img src={qrData.qrDataUrl} alt="Kariyer Pasaportu QR" className="w-20 h-20 rounded-lg bg-white p-1" />
            <div className="text-xs">
              <div className="font-bold">Doğrulama QR Kodu</div>
              <div className="text-[11px] text-slate-500 max-w-xs truncate">{qrData.targetUrl}</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Manual Record */}
      {isAuthenticated && (
        <form onSubmit={handleAddRecord} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
          <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#E45424]" />
            <span>Platform Dışı Sahne Deneyimi Ekle</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input required aria-label="Etkinlik Adı" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Konser / Proje Adı" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <input required aria-label="Kurum Adı" value={form.organizationName} onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))} placeholder="Kurum / Festival" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <input aria-label="Sahne Adı" value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} placeholder="Mekân / Salon" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <input aria-label="Rol" value={form.roleTitle} onChange={(e) => setForm((p) => ({ ...p, roleTitle: e.target.value }))} placeholder="Rol (Örn: Solist)" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <input required aria-label="Tarih" type="date" value={form.eventDate} onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">
            Sicil Kaydı Ekle
          </button>
        </form>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-[#E45424]" />
          <span>Performans & Sahne Kayıtları ({records.length})</span>
        </h2>

        {records.length === 0 ? (
          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-8 text-center text-sm text-slate-500">
            Bu sanatçı için henüz kayıtlı performans sicili bulunmuyor.
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <div key={rec.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{rec.title}</h3>
                    {rec.isVerifiedRecord ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" /> Platform Doğrulamalı
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                        Sanatçı Beyanı
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {rec.organizationName} · {rec.venueName} · Rol: {rec.roleTitle}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-[#16274e] dark:text-blue-300 tabular-nums">{rec.eventDate}</div>
                  {isAuthenticated &&
                    rec.sourceType === 'manual' &&
                    !rec.isVerifiedRecord &&
                    (rec.userId === currentUser.id || currentUser.activeRole === 'admin') && (
                      <button
                        type="button"
                        aria-label={`Kaydı sil: ${rec.title}`}
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
