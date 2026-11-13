import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { ArtDiscipline } from '../types';
import {
  Radar,
  Bookmark,
  ExternalLink,
  Plus,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';

export const OpportunityRadarView: React.FC = () => {
  const {
    opportunities,
    bookmarks,
    toggleBookmark,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('Tümü');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [applyTargetId, setApplyTargetId] = useState<string | null>(null);
  const [applyForm, setApplyForm] = useState({ portfolioLabel: 'Ana Sanatçı Portfolyosu', note: '' });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    title: '',
    organizerName: '',
    category: 'Destek & Hibe',
    discipline: 'Müzik' as ArtDiscipline,
    city: 'İstanbul',
    country: 'Türkiye',
    rewardInfo: '',
    deadline: '2027-03-01',
    requirements: '',
    applicationMethod: 'internal' as 'internal' | 'external',
    externalUrl: '',
  });

  const categories = ['Tümü', ...Array.from(new Set(opportunities.map((o) => o.category)))];

  const filtered = useMemo(() => {
    return opportunities.filter((o) => categoryFilter === 'Tümü' || o.category === categoryFilter);
  }, [opportunities, categoryFilter]);

  const handleSubmitOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await apiRequest<{ opportunity: { status: string } }>('/api/opportunities', {
        method: 'POST',
        body: form,
      });
      await refreshBootstrap();
      setShowCreateForm(false);
      setForm((p) => ({ ...p, title: '', organizerName: '', rewardInfo: '', requirements: '', externalUrl: '' }));
      setFeedback({
        type: 'success',
        text:
          res.opportunity?.status === 'published'
            ? 'Fırsat ilanı yayınlandı.'
            : 'Fırsat öneriniz moderasyon onayına gönderildi; onay sonrası yayına alınacaktır.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Fırsat eklenemedi.' });
    }
  };

  const handleInternalApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTargetId) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/opportunities/${applyTargetId}/apply`, {
        method: 'POST',
        body: applyForm,
      });
      await refreshBootstrap();
      setApplyTargetId(null);
      setApplyForm({ portfolioLabel: 'Ana Sanatçı Portfolyosu', note: '' });
      setFeedback({ type: 'success', text: 'Fırsat başvurunuz platform üzerinden kaydedildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Başvuru başarısız.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.5 · Fırsat Radarı</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Hibeler, Burslar, Misafirlik (Residency) & Seçmeler
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Ulusal ve uluslararası kültür destek programlarını, yarışmaları ve açık çağrıları tek merkezden takip edin, yer imlerinize ekleyin veya doğrudan başvurun.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              setAuthModalMode('login');
              return;
            }
            setShowCreateForm((p) => !p);
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Fırsat / Çağrı Bildir</span>
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

      {showCreateForm && isAuthenticated && (
        <form onSubmit={handleSubmitOpportunity} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white">Yeni Hibe / Residency / Yarışma Ekle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="opp-title" className="block text-[11px] font-bold mb-1">Çağrı Başlığı</label>
              <input id="opp-title" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div>
              <label htmlFor="opp-org" className="block text-[11px] font-bold mb-1">Düzenleyen Kurum</label>
              <input id="opp-org" required value={form.organizerName} onChange={(e) => setForm((p) => ({ ...p, organizerName: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div>
              <label htmlFor="opp-cat" className="block text-[11px] font-bold mb-1">Kategori</label>
              <select id="opp-cat" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs">
                <option value="Destek & Hibe">Destek & Hibe</option>
                <option value="Residency / Misafir Programı">Residency / Misafir Programı</option>
                <option value="Yarışma & Ödül">Yarışma & Ödül</option>
                <option value="Seçme / Audition">Seçme / Audition</option>
              </select>
            </div>
            <div>
              <label htmlFor="opp-reward" className="block text-[11px] font-bold mb-1">Destek / Ödül Tutarı</label>
              <input id="opp-reward" required value={form.rewardInfo} onChange={(e) => setForm((p) => ({ ...p, rewardInfo: e.target.value }))} placeholder="Örn: 120.000 TRY Üretim Desteği" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div>
              <label htmlFor="opp-deadline" className="block text-[11px] font-bold mb-1">Son Başvuru Tarihi</label>
              <input id="opp-deadline" type="date" required value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
            <div>
              <label htmlFor="opp-method" className="block text-[11px] font-bold mb-1">Başvuru Yöntemi</label>
              <select id="opp-method" value={form.applicationMethod} onChange={(e) => setForm((p) => ({ ...p, applicationMethod: e.target.value as any }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs">
                <option value="internal">Platform İçi Başvuru</option>
                <option value="external">Harici Kurum Linki</option>
              </select>
            </div>
          </div>
          {form.applicationMethod === 'external' && (
            <div>
              <label htmlFor="opp-url" className="block text-[11px] font-bold mb-1">Harici Başvuru Adresi</label>
              <input id="opp-url" type="url" value={form.externalUrl} onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))} placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">İptal</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">Gönder</button>
          </div>
        </form>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#16274e] text-white border-[#16274e]'
                : 'bg-white dark:bg-[#13213e] border-slate-200 dark:border-[#1e335a] text-slate-600 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((opp) => {
          const isSaved = bookmarks.some((b) => b.itemType === 'opportunity' && b.itemId === opp.id);
          return (
            <article key={opp.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] text-[11px] font-bold">
                    {opp.category}
                  </span>
                  <button
                    type="button"
                    aria-label={isSaved ? `Kaydedilenlerden çıkar: ${opp.title}` : `Kaydet: ${opp.title}`}
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthModalMode('login');
                        return;
                      }
                      toggleBookmark('opportunity', opp.id);
                    }}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      isSaved ? 'bg-[#E45424] text-white border-[#E45424]' : 'border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">{opp.title}</h2>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{opp.organizerName}</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{opp.rewardInfo}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opp.requirements}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-[#E45424]" />{opp.city}, {opp.country}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3 text-[#E45424]" />Son: {opp.deadline}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {opp.applicationMethod === 'external' && opp.externalUrl ? (
                  <a
                    href={opp.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#16274e] hover:bg-[#1E2B4F] text-white text-xs font-bold"
                  >
                    <span>Resmî Başvuru Sayfası</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthModalMode('login');
                        return;
                      }
                      setApplyTargetId(opp.id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Platformdan Başvur</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {applyTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleInternalApply} className="w-full max-w-md bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#16274e] dark:text-white flex items-center gap-2">
              <Radar className="w-5 h-5 text-[#E45424]" />
              <span>Fırsat Başvurusu</span>
            </h3>
            <div>
              <label htmlFor="oapp-port" className="block text-xs font-bold mb-1">Gönderilecek Portfolyo Sürümü</label>
              <input
                id="oapp-port"
                required
                value={applyForm.portfolioLabel}
                onChange={(e) => setApplyForm((p) => ({ ...p, portfolioLabel: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="oapp-note" className="block text-xs font-bold mb-1">Başvuru Motivasyon Metni</label>
              <textarea
                id="oapp-note"
                rows={3}
                required
                value={applyForm.note}
                onChange={(e) => setApplyForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApplyTargetId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Vazgeç</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">Başvuruyu Gönder</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
