import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { formatCurrencyTRY } from '../utils/businessLogic';
import { Wrench, ShieldCheck, MapPin, CheckCircle2, AlertCircle, Send, Sparkles, Lock } from 'lucide-react';

interface MatchResult {
  providerId: string;
  providerName: string;
  cityMatch: boolean;
  coveredItems: string[];
  missingItems: string[];
  availableOnDate: boolean;
}

export const TechnicalMatchView: React.FC = () => {
  const {
    technicalProviders,
    technicalRequests,
    technicalQuotes,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
    navigateTo,
  } = useApp();

  const [cityFilter, setCityFilter] = useState('Tümü');
  const [reqForm, setReqForm] = useState({
    title: '',
    city: 'İstanbul',
    eventDate: '2027-01-25',
    equipmentText: 'Dijital Mikser, Kuyruklu Piyano Mikrofonu, Sahne Monitörü',
    notes: '',
  });
  const [matchesMap, setMatchesMap] = useState<Record<string, MatchResult[]>>({});
  const [quoteAmounts, setQuoteAmounts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const myProvider = technicalProviders.find((p) => p.userId === currentUser.id);

  const cities = ['Tümü', ...Array.from(new Set(technicalProviders.map((p) => p.city)))];
  const filteredProviders = technicalProviders.filter((p) => cityFilter === 'Tümü' || p.city === cityFilter);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setFeedback(null);
    try {
      const res = await apiRequest<{ request: { id: string } }>('/api/technical-requests', {
        method: 'POST',
        body: {
          title: reqForm.title,
          city: reqForm.city,
          eventDate: reqForm.eventDate,
          requiredEquipment: reqForm.equipmentText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          notes: reqForm.notes,
        },
      });
      await refreshBootstrap();
      setReqForm((p) => ({ ...p, title: '', notes: '' }));
      setFeedback({ type: 'success', text: 'Teknik ekipman talebi oluşturuldu. Sağlayıcı eşleşmelerini inceleyebilirsiniz.' });
      if (res.request?.id) {
        await handleCheckMatches(res.request.id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Talep oluşturulamadı.' });
    }
  };

  const handleCheckMatches = async (requestId: string) => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    try {
      const res = await apiRequest<{ matches: MatchResult[] }>(`/api/technical-requests/${requestId}/matches`);
      setMatchesMap((prev) => ({ ...prev, [requestId]: res.matches }));
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Eşleşme hesaplanamadı.' });
    }
  };

  const handleSubmitQuote = async (requestId: string) => {
    const amount = Number(quoteAmounts[requestId] || 0);
    if (!amount || amount <= 0) {
      setFeedback({ type: 'error', text: 'Geçerli bir teklif tutarı giriniz.' });
      return;
    }
    setFeedback(null);
    try {
      await apiRequest(`/api/technical-requests/${requestId}/quotes`, {
        method: 'POST',
        body: { amount, notes: 'Kurulum, ses mühendisi ve söküm dahildir.' },
      });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Teknik hizmet teklifiniz gönderildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Teklif gönderilemedi.' });
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/technical-quotes/${quoteId}/accept`, { method: 'POST' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Teknik teklif onaylandı ve sağlayıcının ilgili tarih takvimi kilitlendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Teklif onaylanamadı.' });
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/technical-quotes/${quoteId}/reject`, { method: 'POST' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Teknik teklif reddedildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Teklif reddedilemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.4 · Teknik Ekipman & Sağlayıcı Eşleşmesi</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Ses, Işık & Envanter Eşleşme Pazaryeri
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Etkinlik rider listenizle doğrulanmış teknik sağlayıcı envanterlerini eşleştirin, tarih uygunluğunu kontrol edin ve kurulum dahil teklif alın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('technical_dashboard')}
          className="px-4 py-2.5 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer self-start"
        >
          Teknik Sağlayıcı Panelim
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

      {/* Create Request + Active Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleCreateRequest} className="lg:col-span-5 bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E45424]" />
            <span>Teknik Rider / Ekipman Talebi Aç</span>
          </h2>
          <div>
            <label htmlFor="treq-title" className="block text-[11px] font-bold mb-1">Talep Başlığı</label>
            <input
              id="treq-title"
              required
              value={reqForm.title}
              onChange={(e) => setReqForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Örn: Oda Müziği Gala Ses & Işık Kurulumu"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="treq-city" className="block text-[11px] font-bold mb-1">Şehir</label>
              <input
                id="treq-city"
                required
                value={reqForm.city}
                onChange={(e) => setReqForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="treq-date" className="block text-[11px] font-bold mb-1">Etkinlik Tarihi</label>
              <input
                id="treq-date"
                type="date"
                required
                value={reqForm.eventDate}
                onChange={(e) => setReqForm((p) => ({ ...p, eventDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
          </div>
          <div>
            <label htmlFor="treq-equip" className="block text-[11px] font-bold mb-1">Gerekli Ekipmanlar (Virgülle Ayırın)</label>
            <textarea
              id="treq-equip"
              rows={2}
              value={reqForm.equipmentText}
              onChange={(e) => setReqForm((p) => ({ ...p, equipmentText: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="treq-notes" className="block text-[11px] font-bold mb-1">Kurulum Notları</label>
            <input
              id="treq-notes"
              value={reqForm.notes}
              onChange={(e) => setReqForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Örn: Soundcheck 15:00'te başlayacaktır."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
          >
            Talep Yayınla & Envanter Eşleştir
          </button>
        </form>

        {/* Open Requests & Quotes */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white">Açık Teknik Talepler & Teklifler ({technicalRequests.length})</h2>
          {technicalRequests.map((req) => {
            const reqQuotes = technicalQuotes.filter((q) => q.requestId === req.id);
            const matches = matchesMap[req.id];
            const isRequester = isAuthenticated && (req.requesterUserId === currentUser.id || currentUser.activeRole === 'admin');

            return (
              <div key={req.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{req.title}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">{req.city} · {req.eventDate}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      req.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-orange-100 text-[#E45424] dark:bg-orange-500/20 dark:text-orange-300'
                    }`}
                  >
                    {req.status === 'accepted' ? 'Onaylandı & Tarih Kilitlendi' : req.status === 'quoted' ? 'Teklif Var' : 'Açık Talep'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {req.requiredEquipment.map((item) => (
                    <span key={item} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCheckMatches(req.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#16274e] dark:text-slate-200 hover:border-[#E45424] cursor-pointer"
                  >
                    Envanter Eşleşmelerini Göster
                  </button>
                </div>

                {matches && (
                  <div className="bg-slate-50 dark:bg-[#0B1120] rounded-xl p-3 space-y-2 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Rider → Sağlayıcı Envanter Uyumu</div>
                    {matches.map((m) => (
                      <div key={m.providerId} className="text-xs flex flex-wrap items-center justify-between gap-2 border-b last:border-0 border-slate-200 dark:border-slate-800 pb-1.5">
                        <div>
                          <span className="font-bold">{m.providerName}</span>{' '}
                          <span className="text-slate-500">({m.cityMatch ? 'Şehir Eşleşti' : 'Şehir Dışı'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">Karşılanan: {m.coveredItems.length}</span>
                          <span className="text-amber-600 font-semibold">Eksik: {m.missingItems.length}</span>
                          <span className={m.availableOnDate ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {m.availableOnDate ? 'Tarih Müsait' : 'Dolu'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reqQuotes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {reqQuotes.map((q) => (
                      <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                        <div>
                          <span className="font-bold">{q.providerName}</span> — <strong className="text-[#E45424]">{formatCurrencyTRY(q.amount)}</strong>
                          <div className="text-[11px] text-slate-500">{q.notes}</div>
                        </div>
                        {q.status === 'accepted' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <Lock className="w-3.5 h-3.5" /> Onaylandı
                          </span>
                        ) : q.status === 'rejected' ? (
                          <span className="text-rose-600 font-bold">Reddedildi</span>
                        ) : (
                          isRequester &&
                          req.status !== 'accepted' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAcceptQuote(q.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                              >
                                Teklifi Onayla
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectQuote(q.id)}
                                className="px-3 py-1.5 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold cursor-pointer"
                              >
                                Reddet
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {myProvider && req.status !== 'accepted' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      aria-label={`Teklif tutarı (${req.title})`}
                      type="number"
                      placeholder="Teklif Tutarı (TRY)"
                      value={quoteAmounts[req.id] || ''}
                      onChange={(e) => setQuoteAmounts((p) => ({ ...p, [req.id]: e.target.value }))}
                      className="w-40 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitQuote(req.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E45424] text-white text-xs font-bold cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Teklif Gönder</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Providers Directory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-[#16274e] dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#E45424]" />
            <span>Teknik Hizmet & Ekipman Sağlayıcıları ({filteredProviders.length})</span>
          </h2>
          <select
            aria-label="Sağlayıcı Şehir Filtresi"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs font-semibold"
          >
            {cities.map((c) => (
              <option key={c} value={c}>{c === 'Tümü' ? 'Tüm Şehirler' : c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProviders.map((tp) => (
            <div key={tp.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{tp.name}</h3>
                    {tp.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E45424]" />
                    <span>{tp.city} · Hizmet Alanları: {tp.serviceAreas.join(', ')}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600">★ {tp.ratingAvg.toFixed(1)}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">{tp.description}</p>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Envanter ({tp.equipment.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tp.equipment.map((eq) => (
                    <div key={eq.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="font-bold">{eq.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {eq.brandModel} · Adet: {eq.quantity} · {formatCurrencyTRY(eq.dailyRate)}/gün
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {tp.packages.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hazır Sahne Paketleri</div>
                  {tp.packages.map((pkg) => (
                    <div key={pkg.id} className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-500/10 border border-orange-200/70 dark:border-orange-500/20 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{pkg.title}</div>
                        <div className="text-[11px] text-slate-500">{pkg.includedItems.join(' · ')}</div>
                      </div>
                      <div className="font-extrabold text-[#E45424] whitespace-nowrap">{formatCurrencyTRY(pkg.priceAmount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
