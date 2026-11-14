import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import {
  Briefcase,
  Plus,
  QrCode,
  Printer,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from 'lucide-react';

export const ArtistStudioView: React.FC = () => {
  const {
    portfolios,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
    generateAiDraft,
  } = useApp();

  const [form, setForm] = useState({
    title: '',
    audienceType: 'Kurum & Otel',
    identityRole: 'Solist & Oda Müziği Sanatçısı',
    language: 'tr' as 'tr' | 'en',
    visibility: 'public' as 'public' | 'unlisted' | 'private',
    summary: '',
    worksText: 'Bach Çello Süitleri No.1-3, Saygun Partita Op.31',
    pressText: '"Güçlü yay tekniği ve derinlikli müzikal yorum." — İstanbul Kültür Sanat Bülteni',
    awardsText: '2025 Genç Solistler Ödülü',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, { targetUrl: string; qrDataUrl: string }>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      audienceType: 'Kurum & Otel',
      identityRole: 'Solist & Oda Müziği Sanatçısı',
      language: 'tr',
      visibility: 'public',
      summary: '',
      worksText: 'Bach Çello Süitleri No.1-3, Saygun Partita Op.31',
      pressText: '"Güçlü yay tekniği ve derinlikli müzikal yorum." — İstanbul Kültür Sanat Bülteni',
      awardsText: '2025 Genç Solistler Ödülü',
    });
  };

  const handleStartEdit = (port: typeof portfolios[number]) => {
    setEditingId(port.id);
    setForm({
      title: port.title,
      audienceType: port.audienceType,
      identityRole: port.identityRole,
      language: port.language === 'en' ? 'en' : 'tr',
      visibility: port.visibility,
      summary: port.summary,
      worksText: port.worksList.join(', '),
      pressText: port.pressQuotes.join('\n'),
      awardsText: port.awards.join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAiBio = async () => {
    const res = await generateAiDraft('press_bio', {
      fullName: `${currentUser.firstName || 'Sanatçı'} ${currentUser.lastName || ''}`.trim(),
      role: form.identityRole,
      audience: form.audienceType,
    });
    if (res?.text) {
      setForm((p) => ({ ...p, summary: res.text }));
      setFeedback({ type: 'success', text: res.source === 'gemini' ? 'Gemini AI basın biyografisi oluşturuldu.' : 'Yapılandırılmış EPK biyografi taslağı eklendi.' });
    }
  };

  const handleSubmitPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setFeedback(null);
    try {
      const body = {
        title: form.title,
        audienceType: form.audienceType,
        identityRole: form.identityRole,
        language: form.language,
        visibility: form.visibility,
        summary: form.summary,
        worksList: form.worksText.split(',').map((s) => s.trim()).filter(Boolean),
        pressQuotes: form.pressText.split('\n').map((s) => s.trim()).filter(Boolean),
        awards: form.awardsText.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await apiRequest(`/api/artist-studio/${editingId}`, { method: 'PATCH', body });
        await refreshBootstrap();
        resetForm();
        setFeedback({ type: 'success', text: 'Portfolyo / EPK sürümü güncellendi.' });
      } else {
        await apiRequest('/api/artist-studio', { method: 'POST', body });
        await refreshBootstrap();
        resetForm();
        setFeedback({ type: 'success', text: 'Yeni çoklu kimlik portfolyo / EPK sürümü oluşturuldu.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Portfolyo kaydedilemedi.' });
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/artist-studio/${id}`, { method: 'DELETE' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Portfolyo sürümü silindi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Silinemedi.' });
    }
  };

  const handleLoadQr = async (id: string) => {
    try {
      const data = await apiRequest<{ targetUrl: string; qrDataUrl: string }>(`/api/artist-studio/${id}/qr`);
      setQrMap((prev) => ({ ...prev, [id]: data }));
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'QR oluşturulamadı.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.6 · Sanatçı Stüdyosu & Çoklu Portfolyo (EPK)</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Çoklu Kimlik Portfolyo, Basın Kiti & QR Paylaşımı
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Kurumsal otel davetleri, festivaller veya akademik başvurular için farklı dillerde ve odaklarda portfolyo sürümleri hazırlayın, QR kod ile sahne arkasında paylaşın.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer self-start hover:border-[#E45424]"
        >
          <Printer className="w-4 h-4 text-[#E45424]" />
          <span>Yazdır / PDF EPK Kaydet</span>
        </button>
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

      {/* Create / Edit Form */}
      <form onSubmit={handleSubmitPortfolio} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
            {editingId ? <Pencil className="w-4 h-4 text-[#E45424]" /> : <Plus className="w-4 h-4 text-[#E45424]" />}
            <span>{editingId ? 'Portfolyo / Basın Kiti Sürümünü Düzenle' : 'Yeni Portfolyo / Basın Kiti Sürümü'}</span>
          </h2>
          <button
            type="button"
            onClick={handleAiBio}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Basın Biyografisi Öner</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="epk-title" className="block text-[11px] font-bold mb-1">Portfolyo Başlığı</label>
            <input id="epk-title" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Örn: 2027 Avrupa Festival EPK" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
          </div>
          <div>
            <label htmlFor="epk-audience" className="block text-[11px] font-bold mb-1">Hedef Kitle</label>
            <select id="epk-audience" value={form.audienceType} onChange={(e) => setForm((p) => ({ ...p, audienceType: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs">
              <option value="Kurum & Otel">Kurum & Otel</option>
              <option value="Festival">Festival & Kürasyon</option>
              <option value="Akademik">Akademik / Burs</option>
            </select>
          </div>
          <div>
            <label htmlFor="epk-role" className="block text-[11px] font-bold mb-1">Kimlik / Ünvan</label>
            <input id="epk-role" value={form.identityRole} onChange={(e) => setForm((p) => ({ ...p, identityRole: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
          </div>
          <div>
            <label htmlFor="epk-vis" className="block text-[11px] font-bold mb-1">Görünürlük</label>
            <select id="epk-vis" value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as any }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs">
              <option value="public">Herkese Açık</option>
              <option value="unlisted">Yalnızca Link/QR İle</option>
              <option value="private">Özel</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="epk-summary" className="block text-[11px] font-bold mb-1">Sanatçı Özeti / Biyografi</label>
          <textarea id="epk-summary" rows={3} required value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
        </div>

        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer">
              Düzenlemeyi İptal Et
            </button>
          )}
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer">
            {editingId ? 'Değişiklikleri Güncelle' : 'Portfolyo Sürümünü Kaydet'}
          </button>
        </div>
      </form>

      {/* Portfolio Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {portfolios.map((port) => {
          const qr = qrMap[port.id];
          const isOwner = isAuthenticated && (port.userId === currentUser.id || currentUser.activeRole === 'admin');
          return (
            <article key={port.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#E45424]">{port.audienceType} · {port.language.toUpperCase()}</span>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">{port.title}</h2>
                  <div className="text-xs text-slate-500">{port.identityRole}</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">{port.visibility}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{port.summary}</p>

              {port.worksList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {port.worksList.map((w) => (
                    <span key={w} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0B1120] text-[11px]">{w}</span>
                  ))}
                </div>
              )}

              {qr && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <img src={qr.qrDataUrl} alt={`QR: ${port.title}`} className="w-24 h-24 rounded-lg bg-white p-1" />
                  <div className="text-xs min-w-0">
                    <div className="font-bold">Doğrudan Paylaşım QR Kodu</div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">{qr.targetUrl}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleLoadQr(port.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Kod Oluştur</span>
                </button>

                {isOwner && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Portfolyoyu düzenle: ${port.title}`}
                      onClick={() => handleStartEdit(port)}
                      className="p-2 rounded-xl text-[#16274e] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Portfolyoyu sil: ${port.title}`}
                      onClick={() => handleDeletePortfolio(port.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
