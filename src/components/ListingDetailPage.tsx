import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateCommission, formatCurrencyTRY, SmartMatchExplanation } from '../utils/businessLogic';
import { apiRequest } from '../services/api';
import {
  ChevronLeft,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Music,
  Users,
  AlertTriangle,
  Send,
  Sparkles,
  LogIn,
  BadgePercent,
  MessageSquare,
} from 'lucide-react';

interface Props {
  listingId?: string;
  onBack: () => void;
}

export const ListingDetailPage: React.FC<Props> = ({ listingId, onBack }) => {
  const {
    listings,
    settings,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    applyToListing,
    createOffer,
    applications,
    artists,
    ensembles,
    navigateTo,
    generateAiDraft,
    isFlagEnabled,
    startConversation,
    businesses,
  } = useApp();

  const listing = listings.find((l) => l.id === listingId);

  const [applicantType, setApplicantType] = useState<'individual' | 'ensemble'>('individual');
  const [coverMessage, setCoverMessage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offer / Counter-Offer proposal form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [proposedAmount, setProposedAmount] = useState<number>(listing?.budgetAmount || 20000);
  const [offerNotes, setOfferNotes] = useState('');

  // Explainable Smart Match
  const [smartMatches, setSmartMatches] = useState<SmartMatchExplanation[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (listing) {
      setProposedAmount(listing.budgetAmount);
      if (isFlagEnabled('smart_match')) {
        apiRequest<{ matches: SmartMatchExplanation[] }>(`/api/listings/${listing.id}/smart-match`)
          .then((res) => setSmartMatches(res.matches || []))
          .catch(() => setSmartMatches([]));
      }
    }
  }, [listing?.id, isFlagEnabled]);

  if (!listing) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">İlan Bulunamadı</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">
          Aradığınız ilan kaldırılmış, süresi dolmuş veya henüz moderasyon aşamasında olabilir.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer"
        >
          İlanlar Listesine Dön
        </button>
      </div>
    );
  }

  const existingApplication = isAuthenticated
    ? applications.find((a) => a.listingId === listing.id && a.applicantUserId === currentUser.id)
    : undefined;

  const currentEnsemble = isAuthenticated
    ? ensembles.find((e) => e.leaderUserId === currentUser.id)
    : undefined;
  const currentArtist = isAuthenticated
    ? artists.find((a) => a.userId === currentUser.id)
    : undefined;

  const commissionPreview = calculateCommission(
    listing.budgetAmount,
    settings.commissionRate,
    settings.commissionModel
  );

  const handleAiCoverLetter = async () => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setLoadingAi(true);
    const res = await generateAiDraft('cover_letter', {
      artistName: currentArtist?.fullName || `${currentUser.firstName} ${currentUser.lastName}`,
      listingTitle: listing.title,
      city: listing.city,
      genres: listing.genres.join(', '),
      instruments: currentArtist?.primaryInstrument || listing.requiredInstruments.join(', '),
    });
    setLoadingAi(false);
    if (res?.text) {
      setCoverMessage(res.text);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    if (!coverMessage.trim()) {
      setStatusFeedback({ type: 'error', message: 'Lütfen başvuru mesajınızı veya repertuvar notunuzu belirtiniz.' });
      return;
    }
    if (applicantType === 'individual' && !currentArtist) {
      setStatusFeedback({ type: 'error', message: 'Bireysel başvuru için önce sanatçı profili oluşturmalısınız.' });
      return;
    }
    if (applicantType === 'ensemble' && !currentEnsemble) {
      setStatusFeedback({ type: 'error', message: 'Topluluk başvurusu için topluluk profili oluşturmalısınız.' });
      return;
    }

    const membersToSubmit =
      applicantType === 'ensemble' && currentEnsemble
        ? selectedMembers.length > 0
          ? selectedMembers
          : currentEnsemble.members.map((m) => `${m.name} (${m.instrument})`)
        : undefined;

    setIsSubmitting(true);
    const result = await applyToListing(listing.id, coverMessage, applicantType, membersToSubmit);
    setIsSubmitting(false);

    if (result.success) {
      setStatusFeedback({
        type: result.conflictWarning ? 'warning' : 'success',
        message: result.conflictWarning
          ? `Başvurunuz iletildi; ancak takvim uyarısı: ${result.conflictWarning}`
          : 'Başvurunuz başarıyla işletmeye iletildi. İlan sahibi başvurunuzu değerlendirerek dönüş yapacaktır.',
      });
    } else {
      setStatusFeedback({ type: 'error', message: result.error || 'Başvuru yapılamadı.' });
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    const performerId = applicantType === 'ensemble' ? currentEnsemble?.id : currentArtist?.id;
    if (!performerId) {
      setStatusFeedback({ type: 'error', message: 'Teklif göndermek için ilgili sanatçı/topluluk profiliniz olmalıdır.' });
      return;
    }
    setIsSubmitting(true);
    const res = await createOffer({
      listingId: listing.id,
      performerId,
      performerType: applicantType,
      proposedAmount: Number(proposedAmount),
      scopeNotes: offerNotes || 'Özel sahne teklifi',
    });
    setIsSubmitting(false);
    if (res.success) {
      setShowOfferForm(false);
      setStatusFeedback({ type: 'success', message: 'Özel sahne teklifiniz işletmeye iletildi.' });
    } else {
      setStatusFeedback({ type: 'error', message: res.error || 'Teklif gönderilemedi.' });
    }
  };

  const handleContactEmployer = async () => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    const biz = businesses.find((b) => b.id === listing.businessId);
    if (!biz) return;
    const res = await startConversation({
      contextType: 'listing',
      contextId: listing.id,
      title: `${listing.title} — Ön Görüşme`,
      participantUserIds: [biz.userId],
      initialMessage: `Merhaba ${listing.businessName} ekibi, "${listing.title}" ilanı hakkında ön bilgi almak istiyorum.`,
    });
    if (res.success) {
      navigateTo('messages');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Breadcrumb & Canonical URL Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#16274e] dark:text-[#ffb59e] hover:text-[#f25922] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>İlanlar Listesine Dön</span>
        </button>

        <div className="flex items-center gap-2">
          {listing.status !== 'active' && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[11px] font-bold">
              Durum: {listing.status === 'pending_moderation' ? 'Moderasyon Onayı Bekliyor' : listing.status}
            </span>
          )}
          <div className="text-xs font-sans tabular-nums text-[#475569] dark:text-slate-300 bg-white dark:bg-[#13213e] border border-[#e2e8f0] dark:border-[#1e335a] px-3 py-1 rounded-lg elevation-card truncate max-w-full">
            /ilanlar/{listing.slug}
          </div>
        </div>
      </div>

      {/* Urgent Replacement Banner */}
      {listing.isReplacement && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-[#f25922]/50 rounded-2xl flex items-start gap-3 elevation-card">
          <AlertTriangle className="w-5 h-5 text-[#f25922] shrink-0 mt-0.5" />
          <div>
            <h4 className="label-caps text-[#ad3300] dark:text-[#ffb59e]">
              Acil İkame Sanatçı İlanı (Öncelikli Başvuru)
            </h4>
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
              {listing.urgentReason || 'Önceki sanatçının son dakika mazereti nedeniyle ilan yeniden açılmıştır. Başvurular doğrudan değerlendirilmektedir.'}
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Specifications & Description */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] elevation-card space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569] dark:text-slate-300">
                <span className="font-bold text-[#16274e] dark:text-white">{listing.businessName}</span>
                {listing.businessVerified && <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
                <span aria-hidden="true">·</span>
                <span>{listing.businessType}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.city}, {listing.district}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#0f172a] dark:text-white">
                {listing.title}
              </h1>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-4 border-t border-[#e2e8f0] dark:border-[#1e335a] tabular-nums">
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-1">
                <div className="label-caps text-[#64748b] dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#f25922]" /> Tarih
                </div>
                <div className="font-display font-bold text-[#0f172a] dark:text-white">{listing.eventDate}</div>
                <div className="text-[11px] text-[#475569] dark:text-slate-300">{listing.startTime} - {listing.endTime}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-1">
                <div className="label-caps text-[#64748b] dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#16274e] dark:text-[#ffb59e]" /> Süre
                </div>
                <div className="font-display font-bold text-[#0f172a] dark:text-white">{listing.durationMins} Dakika</div>
                <div className="text-[11px] text-[#475569] dark:text-slate-300">{listing.discipline || 'Sahne Performansı'}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-1">
                <div className="label-caps text-[#64748b] dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#4f46e5] dark:text-indigo-400" /> Kadro
                </div>
                <div className="font-display font-bold text-[#0f172a] dark:text-white">{listing.targetEnsembleType}</div>
                <div className="text-[11px] text-[#475569] dark:text-slate-300">{listing.performerCount} Sanatçı</div>
              </div>

              <div className="p-3 rounded-xl bg-[#f1f3ff] dark:bg-[#1e335a]/60 border border-[#dae2ff] dark:border-[#2a457a] space-y-1">
                <div className="label-caps text-[#16274e] dark:text-[#ffb59e] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#f25922]" /> Son Başvuru
                </div>
                <div className="font-display font-bold text-[#16274e] dark:text-white">{listing.applicationDeadline}</div>
                <div className="text-[11px] text-[#475569] dark:text-slate-300">Kapanış: 23:59</div>
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="space-y-4 text-xs leading-relaxed text-[#0f172a] dark:text-slate-200">
              <div>
                <h3 className="font-display font-bold text-sm text-[#0f172a] dark:text-white mb-1">Etkinlik Açıklaması</h3>
                <p className="text-[#475569] dark:text-slate-300 leading-relaxed text-sm">{listing.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl space-y-1">
                  <span className="font-bold text-[#16274e] dark:text-[#ffb59e] block">Repertuvar Talebi:</span>
                  <p className="text-[#475569] dark:text-slate-300">{listing.repertoireExpectation}</p>
                </div>

                <div className="p-4 bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl space-y-1">
                  <span className="font-bold text-[#16274e] dark:text-[#ffb59e] block">Sahne &amp; Kıyafet Kuralları:</span>
                  <p className="text-[#475569] dark:text-slate-300">{listing.dressCode}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap gap-4 text-xs text-[#475569] dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-medium text-[#0f172a] dark:text-slate-200">
                  <CheckCircle2 className={`w-4 h-4 ${listing.soundSystemProvided ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>Ses Sistemi Mekânda Mevcut</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[#0f172a] dark:text-slate-200">
                  <CheckCircle2 className={`w-4 h-4 ${listing.transportationProvided ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>Ulaşım Sağlanıyor</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[#0f172a] dark:text-slate-200">
                  <CheckCircle2 className={`w-4 h-4 ${listing.accommodationProvided ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  <span>Konaklama Sağlanıyor</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Application & Offer Box */}
          <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] elevation-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0] dark:border-[#1e335a]">
              <div>
                <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Bu İlana Başvur veya Teklif Sun</h2>
                <p className="text-xs text-[#475569] dark:text-slate-300">Sabit bütçeyle başvurun ya da kapsam/ücret teklifi iletin</p>
              </div>
              <span className="px-3 py-1 rounded-md bg-orange-50 dark:bg-[#f25922]/15 text-[#ad3300] dark:text-[#ffb59e] text-xs font-bold tabular-nums">
                Bütçe: {formatCurrencyTRY(listing.budgetAmount)}
              </span>
            </div>

            {!isAuthenticated ? (
              <div className="p-6 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-3">
                <p className="text-xs text-[#475569] dark:text-slate-300">
                  İlânlara başvurabilmek veya işverene özel teklif iletebilmek için hesabınıza giriş yapmalısınız.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthModalMode('login')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f25922] hover:bg-[#d94b18] text-white text-xs font-bold cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Giriş Yap / Hesap Oluştur</span>
                </button>
              </div>
            ) : existingApplication ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-300">Başvurunuz Başarıyla İletildi</h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">
                      Başvuru durumunuzu yönetim panelinizden takip edebilirsiniz.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfferForm((p) => !p)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#13213e] border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer shrink-0"
                >
                  Revize Teklif Gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                {statusFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      statusFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : statusFeedback.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {statusFeedback.message}
                  </div>
                )}

                {!currentUser.isVerified && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                    Bilgi: Başvurularınızın yayınlanması için hesap doğrulamanızı (e-posta/KYC) yönetim panelinizden tamamlamanız gerekir.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setApplicantType('individual')}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      applicantType === 'individual'
                        ? 'bg-[#16274e] dark:bg-[#f25922] text-white shadow-xs'
                        : 'text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Bireysel Sanatçı Olarak</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplicantType('ensemble')}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      applicantType === 'ensemble'
                        ? 'bg-[#16274e] dark:bg-[#f25922] text-white shadow-xs'
                        : 'text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Topluluk / Kolektif Adına</span>
                  </button>
                </div>

                {applicantType === 'individual' ? (
                  currentArtist ? (
                    <div className="p-3 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl text-xs text-[#475569] dark:text-slate-300 flex items-center gap-3 border border-[#e2e8f0] dark:border-[#1e335a]">
                      <img src={currentArtist.avatarUrl} alt={currentArtist.fullName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      <div>
                        <span className="font-bold text-[#0f172a] dark:text-white">{currentArtist.fullName}</span> ({currentArtist.primaryInstrument}) profiliyle başvurulacaktır.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl text-xs border border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-2">
                      <span className="text-[#475569] dark:text-slate-300">Bireysel sanatçı çalışma alanınız yok.</span>
                      <button
                        type="button"
                        onClick={() => addRoleWorkspace('artist')}
                        className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Sanatçı Profili Ekle
                      </button>
                    </div>
                  )
                ) : currentEnsemble ? (
                  <div className="p-3 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl text-xs space-y-2 border border-[#e2e8f0] dark:border-[#1e335a]">
                    <div className="font-bold text-[#0f172a] dark:text-white">{currentEnsemble.name} ({currentEnsemble.ensembleType})</div>
                    <div className="flex flex-wrap gap-2">
                      {currentEnsemble.members.map((m) => {
                        const label = `${m.name} (${m.instrument})`;
                        const checked = selectedMembers.includes(label);
                        return (
                          <label key={m.id} className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedMembers([...selectedMembers, label]);
                                else setSelectedMembers(selectedMembers.filter((x) => x !== label));
                              }}
                              className="accent-[#f25922]"
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl text-xs border border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-2">
                    <span className="text-[#475569] dark:text-slate-300">Topluluk lideri çalışma alanınız yok.</span>
                    <button
                      type="button"
                      onClick={() => addRoleWorkspace('ensemble_leader')}
                      className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Topluluk Profili Ekle
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                      İşverene Notunuz &amp; Repertuvar Uyumu
                    </label>
                    {isFlagEnabled('ai_draft_assistant') && (
                      <button
                        type="button"
                        onClick={handleAiCoverLetter}
                        disabled={loadingAi}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f25922] hover:underline cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{loadingAi ? 'Taslak Hazırlanıyor...' : 'Yapay Zekâ Başvuru Taslağı'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={coverMessage}
                    onChange={(e) => setCoverMessage(e.target.value)}
                    placeholder="İlan koşullarını ve sahne saatini inceledim. Belirtilen repertuvar talebine tam uyumlu programımızla yer alabiliriz..."
                    className="w-full text-xs p-3.5 bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] text-[#0f172a] dark:text-white rounded-xl focus:outline-hidden focus:border-[#f25922]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferForm((p) => !p)}
                    className="px-4 py-2 text-xs font-bold text-[#16274e] dark:text-slate-200 bg-[#f1f3ff] dark:bg-[#0f1c38] border border-[#dae2ff] dark:border-[#1e335a] rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <BadgePercent className="w-3.5 h-3.5 text-[#f25922]" />
                    <span>Özel Fiyat / Kapsam Teklifi Sun</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || listing.status !== 'active'}
                    className="px-6 py-2.5 text-xs font-display font-bold text-white bg-[#f25922] hover:bg-[#d94b18] disabled:opacity-50 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>{isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Tamamla'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Counter-Offer / Custom Quote Form */}
            {isAuthenticated && showOfferForm && (
              <form onSubmit={handleSendOffer} className="mt-4 p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-3">
                <h4 className="text-xs font-bold text-[#0f172a] dark:text-white">Özel Teklif / Karşı Teklif Başlat</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] dark:text-slate-300 block mb-1">Teklif Tutarı (TRY)</label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-white dark:bg-[#13213e] text-[#0f172a] dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] dark:text-slate-300 block mb-1">Kapsam &amp; Ses / Ulaşım Notu</label>
                    <input
                      type="text"
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="Örn: Ses sistemi ve 2 set akustik repertuvar dahil"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-white dark:bg-[#13213e] text-[#0f172a] dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferForm(false)}
                    className="px-3 py-1.5 text-xs text-[#64748b] cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-[#16274e] dark:bg-[#f25922] text-white text-xs font-bold cursor-pointer"
                  >
                    Teklifi Gönder
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 9.7 Explainable Smart Match */}
          {smartMatches.length > 0 && (
            <div className="bg-white dark:bg-[#13213e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] elevation-card space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0f172a] dark:text-white">
                  Açıklanabilir Sahne Eşleşmesi (Kriter Bazlı)
                </h3>
                <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                  Sanatçılar tek bir gizli puana indirgenmeden; takvim, şehir, enstrüman ve sahne sicili kriterleriyle şeffaf eşleştirilir.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smartMatches.slice(0, 4).map((m) => (
                  <div
                    key={m.entityId}
                    onClick={() => navigateTo('artist_profile', m.entityId)}
                    className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] hover:border-[#f25922]/50 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white">{m.entityName}</span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        {m.matchedCriteriaCount}/4 Güçlü Uyum
                      </span>
                    </div>
                    <div className="space-y-1">
                      {m.criteria.map((c) => (
                        <div key={c.label} className="text-[11px] text-[#475569] dark:text-slate-300 flex items-center justify-between gap-2">
                          <span className="truncate">• {c.reason}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                            c.level === 'tam'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : c.level === 'yüksek'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {c.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Budget Transparency & Business Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#13213e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] elevation-card space-y-3">
            <div className="label-caps text-[#64748b] dark:text-slate-400">
              {settings.commissionModel === 'A_EMPLOYER_PAYS' ? 'Net Sanatçı Hakedişi' : 'İlan Bütçesi (Brüt)'}
            </div>
            <div className="font-display text-3xl font-extrabold text-[#0f172a] dark:text-white tabular-nums">
              {formatCurrencyTRY(commissionPreview.performerPayout)}
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              {settings.commissionModel === 'A_EMPLOYER_PAYS'
                ? `Model A · Platform komisyonu (%${settings.commissionRate}) işverene yansıtılır`
                : `Model B · %${settings.commissionRate} komisyon sonrası net icracı hakedişi`}
            </p>
            <div className="pt-3 border-t border-[#e2e8f0] dark:border-[#1e335a] text-xs text-[#475569] dark:text-slate-300 leading-relaxed space-y-1">
              <div>İşveren Toplam Ödeme: <strong className="text-[#0f172a] dark:text-white">{formatCurrencyTRY(commissionPreview.employerTotal)}</strong></div>
              <div>Ödeme etkinlik öncesinde güvence havuzunda bloke edilir; her iki taraf da tamamlanma onayı verdiğinde aktarılır.</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#13213e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] elevation-card space-y-4">
            <h3 className="label-caps text-[#64748b] dark:text-slate-400">İşveren Bilgileri</h3>
            <div className="flex items-center gap-3">
              <img
                src={listing.businessLogo}
                alt={listing.businessName}
                className="w-12 h-12 rounded-xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shrink-0"
              />
              <div>
                <div className="text-sm font-display font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                  <span>{listing.businessName}</span>
                  {listing.businessVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
                <div className="text-xs text-[#ad3300] dark:text-[#ffb59e] font-semibold">{listing.businessType}</div>
              </div>
            </div>

            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              {listing.venueName}, {listing.city}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigateTo('business_profile', listing.businessId)}
                className="w-full py-2.5 text-xs font-display font-bold text-[#16274e] dark:text-white bg-[#f1f3ff] dark:bg-[#0f1c38] hover:bg-[#e1e8fd] dark:hover:bg-[#1e335a] border border-transparent dark:border-[#1e335a] rounded-xl transition-colors cursor-pointer"
              >
                İşletme Profilini Görüntüle
              </button>
              <button
                type="button"
                onClick={handleContactEmployer}
                className="w-full py-2.5 text-xs font-bold text-[#f25922] bg-orange-50 dark:bg-[#f25922]/10 hover:bg-orange-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>İşverenle İlan Mesajı Başlat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
