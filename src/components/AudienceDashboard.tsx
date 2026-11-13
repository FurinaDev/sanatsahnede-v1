import React from 'react';
import { useApp } from '../context/AppContext';
import { Bookmark, Calendar, Download, Sparkles, Radar, ArrowRight } from 'lucide-react';

export const AudienceDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    bookmarks,
    events,
    opportunities,
    toggleBookmark,
    navigateTo,
  } = useApp();

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <Bookmark className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Sanatsever Panelim</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Kaydettiğiniz konserleri, sergileri ve takvim hatırlatıcılarını görmek için giriş yapın. Sanatsever hesabı için belge doğrulaması gerekmez.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalMode('login')}
          className="px-6 py-2.5 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  const savedEvents = events.filter((ev) => bookmarks.some((b) => b.itemType === 'event' && b.itemId === ev.id));
  const savedOpportunities = opportunities.filter((op) => bookmarks.some((b) => b.itemType === 'opportunity' && b.itemId === op.id));

  return (
    <div className="space-y-8 text-left">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">Sanatsever / İzleyici Alanı</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Hoş Geldiniz, {currentUser.firstName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kimlik/KYC belgesi gerekmeden kültür-sanat takviminizi, yer imlerinizi ve Originals duyurularını takip edebilirsiniz.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigateTo('events')}
            className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
          >
            Etkinlik Keşfet
          </button>
          <button
            type="button"
            onClick={() => navigateTo('originals')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
          >
            SanatSahnede Originals
          </button>
        </div>
      </div>

      {/* Saved Events */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#E45424]" />
          <span>Kaydettiğim Etkinlikler ({savedEvents.length})</span>
        </h2>

        {savedEvents.length === 0 ? (
          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <span>Henüz ajandanıza etkinlik kaydetmediniz.</span>
            <button type="button" onClick={() => navigateTo('events')} className="inline-flex items-center gap-1 font-bold text-[#E45424] cursor-pointer">
              <span>Etkinlik Ajandasına Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedEvents.map((ev) => (
              <div key={ev.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{ev.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{ev.venueName}, {ev.city} · {ev.eventDate} {ev.startTime}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <a href={`/api/events/${ev.id}/ics`} download className="inline-flex items-center gap-1 text-xs font-bold text-[#E45424]">
                      <Download className="w-3.5 h-3.5" /> .ics İndir
                    </a>
                    <button type="button" onClick={() => toggleBookmark('event', ev.id)} className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer">
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Opportunities */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <Radar className="w-5 h-5 text-[#E45424]" />
          <span>Kaydettiğim Fırsatlar & Çağrılar ({savedOpportunities.length})</span>
        </h2>

        {savedOpportunities.length === 0 ? (
          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <span>Kaydedilmiş burs, hibe veya açık çağrı bulunmuyor.</span>
            <button type="button" onClick={() => navigateTo('opportunity_radar')} className="inline-flex items-center gap-1 font-bold text-[#E45424] cursor-pointer">
              <span>Fırsat Radarına Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedOpportunities.map((op) => (
              <div key={op.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{op.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{op.organizerName} · Son: {op.deadline}</div>
                </div>
                <button type="button" onClick={() => toggleBookmark('opportunity', op.id)} className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer">
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bg-slate-50 dark:bg-[#0B1120] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-[#E45424]" />
          <span>Profesyonel sanatçı veya kurum çalışma alanı açmak isterseniz panelden ek rol tanımlayabilirsiniz.</span>
        </div>
        <button type="button" onClick={() => navigateTo('profile_edit')} className="text-xs font-bold text-[#E45424] cursor-pointer">
          Hesap Ayarları →
        </button>
      </div>
    </div>
  );
};
