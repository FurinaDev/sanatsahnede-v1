import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MusicGenre, EnsembleType, Instrument, ArtDiscipline } from '../types';
import { formatCurrencyTRY, canBusinessCreateListing } from '../utils/businessLogic';
import { ART_DISCIPLINES, CITY_LIST } from '../utils/disciplineConfig';
import {
  PlusCircle,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Users,
  Star,
  Clock,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Wrench,
  Layers,
  Scale,
  X,
} from 'lucide-react';

export const BusinessDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    verifyEmailSandbox,
    verifyPhoneSandbox,
    businesses,
    listings,
    applications,
    offers,
    bookings,
    contracts,
    disputes,
    reviews,
    settings,
    createListing,
    shortlistApplication,
    rejectApplication,
    selectApplicantAndCreateBooking,
    createOffer,
    counterOffer,
    acceptOffer,
    rejectOffer,
    acceptContract,
    payBookingSandbox,
    completeEmployerService,
    cancelBooking,
    createEmergencyReplacement,
    openDispute,
    submitReview,
    submitVerificationRequest,
    generateAiDraft,
    isFlagEnabled,
    navigateTo,
  } = useApp();

  const business = isAuthenticated
    ? businesses.find((b) => b.userId === currentUser.id)
    : undefined;

  const [activeTab, setActiveTab] = useState<'listings' | 'applications' | 'offers' | 'bookings' | 'verification'>('listings');
  const [selectedListingForApps, setSelectedListingForApps] = useState<string>('');

  // New Listing Form Modal state
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDiscipline, setNewDiscipline] = useState<ArtDiscipline>('Müzik');
  const [newEventType, setNewEventType] = useState('Lobi & Salon Konseri');
  const [newEnsembleType, setNewEnsembleType] = useState<EnsembleType>('Trio');
  const [newGenres] = useState<MusicGenre[]>(['Klasik Müzik', 'Oda Müziği']);
  const [newInstruments] = useState<Instrument[]>(['Keman', 'Viyolonsel (Çello)']);
  const [newCity, setNewCity] = useState(business?.city || 'İstanbul');
  const [newBudget, setNewBudget] = useState(20000);
  const [newDate, setNewDate] = useState('2026-12-05');
  const [newDuration, setNewDuration] = useState(60);
  const [newStartTime, setNewStartTime] = useState('20:00');
  const [newEndTime, setNewEndTime] = useState('21:00');
  const [newDeadline, setNewDeadline] = useState('2026-11-30');
  const [newDesc, setNewDesc] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newSoundSystem, setNewSoundSystem] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Verification request form state
  const [verifDocUrl, setVerifDocUrl] = useState('');
  const [verifSubmitted, setVerifSubmitted] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Modals
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [contractViewBookingId, setContractViewBookingId] = useState<string | null>(null);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState(20000);
  const [counterNote, setCounterNote] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">İşletme Paneline Erişmek İçin Giriş Yapın</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">İlan, başvuru, sözleşme ve güvence ödemesi işlemleriniz için oturum açmanız gerekir.</p>
        <button
          type="button"
          onClick={() => setAuthModalMode('login')}
          className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Kurum / İşletme Profiliniz Bulunamadı</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">
          Hesabınıza işletme/kurum çalışma alanı ekleyerek sahne ilanı açabilir ve sanatçı başvurularını yönetebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => addRoleWorkspace('business_owner', { organizationName: `${currentUser.firstName} Kurumsal` })}
          className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer"
        >
          İşletme Çalışma Alanı Oluştur
        </button>
      </div>
    );
  }

  const businessListings = listings.filter((l) => l.businessId === business.id);
  const effectiveListingId = selectedListingForApps || businessListings[0]?.id || '';
  const currentListingApps = applications.filter((a) => a.listingId === effectiveListingId);
  const businessBookings = bookings.filter((b) => b.businessId === business.id);
  const businessOffers = offers.filter((o) => o.businessId === business.id);

  const handleAiListingBrief = async () => {
    setLoadingAi(true);
    const res = await generateAiDraft('listing_brief', {
      title: newTitle || newEventType,
      city: newCity,
      discipline: newDiscipline,
      ensembleType: newEnsembleType,
      budget: String(newBudget),
    });
    setLoadingAi(false);
    if (res?.text) {
      setNewDesc(res.text);
    }
  };

  const handleCreateListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!canBusinessCreateListing(business)) {
      setCreateError(
        'Yetkisiz İşlem: Yalnızca doğrulaması onaylanmış işletmeler ilan açabilir. Lütfen "Doğrulama & Akreditasyon" sekmesini tamamlayınız.'
      );
      return;
    }

    if (!newTitle.trim() || !newDesc.trim()) {
      setCreateError('Lütfen ilan başlığı ve açıklamasını eksiksiz doldurunuz.');
      return;
    }

    const res = await createListing({
      title: newTitle,
      discipline: newDiscipline,
      eventType: newEventType,
      targetEnsembleType: newEnsembleType,
      genres: newGenres,
      requiredInstruments: newInstruments,
      city: newCity || business.city,
      budgetAmount: Number(newBudget),
      eventDate: newDate,
      durationMins: Number(newDuration),
      startTime: newStartTime,
      endTime: newEndTime,
      applicationDeadline: newDeadline,
      description: newDesc,
      venueName: newVenue || `${business.businessName} Ana Salon`,
      soundSystemProvided: newSoundSystem,
    });

    if (res.success) {
      setIsCreatingListing(false);
      setNewTitle('');
      setNewDesc('');
      setCreateSuccess('İlanınız oluşturuldu ve moderasyon onay kuyruğuna iletildi.');
      if (res.listing?.id) {
        setSelectedListingForApps(res.listing.id);
      }
    } else {
      setCreateError(res.error || 'İlan oluşturulamadı.');
    }
  };

  const handleSelectCandidate = async (appId: string) => {
    const res = await selectApplicantAndCreateBooking(appId);
    if (res.success) {
      setActionBanner('Aday seçildi, dijital sözleşme oluşturuldu ve rezervasyon başlatıldı.');
      setActiveTab('bookings');
    } else {
      setActionBanner(res.error || 'Rezervasyon başlatılamadı.');
    }
  };

  const handleSendQuickOffer = async (app: typeof currentListingApps[number]) => {
    const listing = businessListings.find((l) => l.id === app.listingId);
    if (!listing) return;
    const res = await createOffer({
      listingId: listing.id,
      applicationId: app.id,
      performerId: app.applicantId,
      performerType: app.applicantType,
      proposedAmount: listing.budgetAmount,
      scopeNotes: 'İşletme resmi teklifi',
    });
    if (res.success) {
      setActionBanner(`${app.applicantName} için teklif gönderildi.`);
      setActiveTab('offers');
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, cancellationReason || 'İşletme organizasyon değişikliği');
    setCancellingBookingId(null);
    setCancellationReason('');
  };

  const handleTriggerEmergencyReplacement = async (bookingId: string) => {
    const res = await createEmergencyReplacement(bookingId);
    if (res.success) {
      setActionBanner('Acil İkame İlanı başarıyla oluşturuldu ve öncelikli olarak yayına alındı.');
      setActiveTab('listings');
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifDocUrl) return;
    const res = await submitVerificationRequest('business', business.businessName, verifDocUrl);
    if (res.success) setVerifSubmitted(true);
  };

  const activeContract = contractViewBookingId
    ? contracts.find((c) => c.bookingId === contractViewBookingId)
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6">
      {/* Verification Sandbox Banner */}
      {(!currentUser.emailVerified || !currentUser.phoneVerified) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-amber-900 dark:text-amber-200">
            <strong>Güvenlik Doğrulaması (Sandbox):</strong> İletişim kanallarınızı doğrulayarak hesap güvenliğini tamamlayın.
          </div>
          <div className="flex items-center gap-2">
            {!currentUser.emailVerified && (
              <button
                type="button"
                onClick={() => verifyEmailSandbox()}
                className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white font-bold cursor-pointer"
              >
                E-postayı Doğrula (Sandbox)
              </button>
            )}
            {!currentUser.phoneVerified && (
              <button
                type="button"
                onClick={() => verifyPhoneSandbox()}
                className="px-3 py-1.5 rounded-lg bg-[#f25922] text-white font-bold cursor-pointer"
              >
                Telefonu Doğrula (Sandbox)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white dark:bg-[#13213e] rounded-3xl p-6 sm:p-8 border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={business.logoUrl}
              alt={business.businessName}
              className="w-16 h-16 rounded-2xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shadow-sm shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white">{business.businessName}</h1>
                {business.isVerified ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Doğrulanmış İşveren
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#ad3300] dark:text-[#ff8a65] bg-[#ffdbd0] dark:bg-[#f25922]/20 px-2 py-0.5 rounded-md">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Onay Bekliyor
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
                İşletme Yönetim Paneli · {business.businessType} · {business.city}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigateTo('technical_match')}
              className="px-4 py-2.5 text-xs font-bold text-[#16274e] dark:text-white bg-[#f1f3ff] dark:bg-[#0f1c38] border border-[#dae2ff] dark:border-[#1e335a] rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-[#f25922]" />
              <span>Teknik Eşleşme</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingListing(true)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#f25922] hover:bg-[#ad3300] rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Yeni İlan Oluştur</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[#e2e8f0] dark:border-[#1e335a] overflow-x-auto text-xs">
          {[
            { id: 'listings', label: `İlanlarım (${businessListings.length})` },
            { id: 'applications', label: `Gelen Başvurular (${applications.filter((a) => businessListings.some((l) => l.id === a.listingId)).length})` },
            { id: 'offers', label: `Teklif & Pazarlık (${businessOffers.length})` },
            { id: 'bookings', label: `Rezervasyon, Sözleşme & Ödeme (${businessBookings.length})` },
            { id: 'verification', label: 'Doğrulama & Akreditasyon' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-[#16274e] dark:bg-[#f25922] text-white' : 'text-[#475569] dark:text-slate-300 hover:bg-[#f1f3ff] dark:hover:bg-[#0f1c38]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(actionBanner || createSuccess) && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-medium text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-3">
          <span>{actionBanner || createSuccess}</span>
          <button
            type="button"
            onClick={() => {
              setActionBanner(null);
              setCreateSuccess(null);
            }}
            className="text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      )}

      {/* TAB 1: LISTINGS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Yayınlanan Etkinlik İlanları</h2>
            <span className="text-xs text-[#64748b] dark:text-slate-400">Yeni ilanlar moderasyon onayının ardından yayına alınır</span>
          </div>

          {businessListings.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-3">
              <p className="text-sm text-[#475569] dark:text-slate-300">Henüz yayınlanmış bir ilanınız bulunmamaktadır.</p>
              <button
                type="button"
                onClick={() => setIsCreatingListing(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl cursor-pointer"
              >
                İlk İlanınızı Açın
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessListings.map((l) => (
                <div
                  key={l.id}
                  className="p-5 bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-3 shadow-xs"
                >
                  {l.isReplacement && (
                    <div className="bg-[#f25922] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-block">
                      Acil İkame
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#0f172a] dark:text-white">{l.title}</h3>
                      <div className="text-xs text-[#475569] dark:text-slate-300 mt-0.5">
                        {l.targetEnsembleType} · {l.genres.join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-[#0f172a] dark:text-white tabular-nums">
                        {formatCurrencyTRY(l.budgetAmount)}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">İlan Bütçesi</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#475569] dark:text-slate-300 pt-2 border-t border-[#e2e8f0] dark:border-[#1e335a]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                      {l.eventDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                      {l.durationMins} dk
                    </span>
                    <span className="flex items-center gap-1 text-[#f25922] font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {l.applicationsCount} Başvuru
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        l.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                          : l.status === 'pending_moderation'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                          : 'bg-[#f8fafc] dark:bg-[#0f1c38] text-[#475569] dark:text-slate-300'
                      }`}
                    >
                      {l.status === 'active'
                        ? 'Yayında · Başvuru Alınıyor'
                        : l.status === 'pending_moderation'
                        ? 'Moderasyon Onayı Bekliyor'
                        : l.status === 'assigned'
                        ? 'Sanatçı Seçildi / Anlaşmada'
                        : l.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListingForApps(l.id);
                        setActiveTab('applications');
                      }}
                      className="text-xs font-semibold text-[#f25922] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Başvuruları İncele</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Aday Karşılaştırma ve Başvuru Yönetimi</h2>
              <p className="text-xs text-[#64748b] dark:text-slate-400">
                Puanlama, tamamlanan sahne, doğrulama rozeti ve iptal oranına göre şeffaf karşılaştırma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#475569] dark:text-slate-300">İlan:</span>
              <select
                value={effectiveListingId}
                onChange={(e) => setSelectedListingForApps(e.target.value)}
                className="text-xs font-medium p-2 bg-white dark:bg-[#13213e] text-[#0f172a] dark:text-white border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl max-w-full"
              >
                {businessListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.budgetAmount} TL)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentListingApps.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-2">
              <p className="text-sm text-[#475569] dark:text-slate-300">Bu ilan için henüz bir başvuru bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentListingApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={app.applicantAvatar}
                        alt={app.applicantName}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#0f172a] dark:text-white">{app.applicantName}</h3>
                          {app.applicantIsVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#f8fafc] dark:bg-[#0f1c38] text-[#475569] dark:text-slate-300 border border-[#e2e8f0] dark:border-[#1e335a]">
                            {app.applicantType === 'ensemble' ? 'Sanat Topluluğu' : 'Bireysel Sanatçı'}
                          </span>
                        </div>
                        <div className="text-xs text-[#475569] dark:text-slate-300 font-medium">
                          {app.instrumentsOrType} · {app.genres.join(', ')}
                        </div>
                        {app.participatingMembers && app.participatingMembers.length > 0 && (
                          <div className="text-[11px] text-[#64748b] dark:text-slate-400">
                            <strong>Katılacak Kadro:</strong> {app.participatingMembers.join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center sm:text-right bg-[#f8fafc] dark:bg-[#0f1c38] p-2.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] shrink-0">
                      <div>
                        <div className="text-[10px] text-[#64748b] uppercase font-semibold">Puan</div>
                        <div className="text-sm font-bold text-[#0f172a] dark:text-white flex items-center justify-center sm:justify-end gap-1">
                          <Star className="w-3.5 h-3.5 text-[#f25922] fill-[#f25922]" />
                          <span>{app.applicantRating.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#64748b] uppercase font-semibold">İş</div>
                        <div className="text-sm font-bold text-[#0f172a] dark:text-white tabular-nums">{app.applicantCompletedJobs}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#64748b] uppercase font-semibold">İptal</div>
                        <div className="text-sm font-bold text-emerald-600 tabular-nums">%{app.applicantCancellationRate}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] text-xs text-[#475569] dark:text-slate-300 italic">
                    &ldquo;{app.message}&rdquo;
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e2e8f0] dark:border-[#1e335a]">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f8fafc] dark:bg-[#0f1c38] text-[#475569] dark:text-slate-300">
                      Durum: {app.status}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {app.status !== 'shortlisted' && app.status !== 'selected' && (
                        <button
                          type="button"
                          onClick={() => shortlistApplication(app.id)}
                          className="px-3.5 py-2 text-xs font-semibold text-[#475569] dark:text-slate-200 bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl cursor-pointer"
                        >
                          Kısa Listeye Al
                        </button>
                      )}
                      {app.status !== 'selected' && (
                        <button
                          type="button"
                          onClick={() => handleSendQuickOffer(app)}
                          className="px-3.5 py-2 text-xs font-semibold text-[#16274e] dark:text-slate-200 bg-[#f1f3ff] dark:bg-[#0f1c38] border border-[#dae2ff] dark:border-[#1e335a] rounded-xl cursor-pointer"
                        >
                          Resmi Teklif Gönder
                        </button>
                      )}
                      {app.status !== 'rejected' && app.status !== 'selected' && (
                        <button
                          type="button"
                          onClick={() => rejectApplication(app.id)}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 rounded-xl cursor-pointer"
                        >
                          Reddet
                        </button>
                      )}
                      {app.status !== 'selected' && (
                        <button
                          type="button"
                          onClick={() => handleSelectCandidate(app.id)}
                          className="px-5 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] hover:opacity-90 rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Seç &amp; Sözleşme Başlat</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OFFERS & COUNTER-OFFERS */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Teklif ve Karşı Teklif Müzakereleri</h2>
          {businessOffers.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-xs text-[#64748b]">
              Henüz aktif veya sonuçlanmış bir teklif müzakeresi yok.
            </div>
          ) : (
            <div className="space-y-4">
              {businessOffers.map((off) => {
                const waitingForMe = off.lastActorUserId !== currentUser.id && ['pending', 'countered'].includes(off.status);
                return (
                  <div key={off.id} className="bg-white dark:bg-[#13213e] p-5 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-[#f25922]">{off.listingTitle || off.listingId}</div>
                        <div className="text-sm font-bold text-[#0f172a] dark:text-white">{off.performerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-[#0f172a] dark:text-white tabular-nums">
                          {formatCurrencyTRY(off.proposedAmount)}
                        </div>
                        <div className="text-[11px] text-[#64748b] dark:text-slate-400">
                          Durum: {off.status} · Model: {off.commissionModel}
                        </div>
                      </div>
                    </div>
                    {off.revisions && off.revisions.length > 0 && (
                      <div className="text-[11px] text-[#475569] dark:text-slate-300 bg-[#f8fafc] dark:bg-[#0f1c38] p-3 rounded-xl space-y-1">
                        {off.revisions.map((rev) => (
                          <div key={rev.id} className="flex items-center justify-between">
                            <span>• {rev.scopeNotes}</span>
                            <span className="font-bold tabular-nums">{formatCurrencyTRY(rev.proposedAmount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {['pending', 'countered'].includes(off.status) && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {waitingForMe && (
                          <button
                            type="button"
                            onClick={() => acceptOffer(off.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Teklifi Onayla &amp; Sözleşmeye Geç
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCounterOfferId(off.id);
                            setCounterAmount(off.proposedAmount);
                            setCounterNote('');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
                        >
                          Karşı Teklif Gönder
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectOffer(off.id)}
                          className="px-3 py-2 rounded-xl text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BOOKINGS, CONTRACTS, SANDBOX PAYMENT & DUAL COMPLETION */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Rezervasyonlar, Dijital Sözleşmeler ve Ödemeler</h2>
            <span className="text-xs text-[#64748b] dark:text-slate-400">Çift taraflı tamamlanma onayı ve korumalı sandbox akışı</span>
          </div>

          {businessBookings.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a]">
              <p className="text-sm text-[#475569] dark:text-slate-300">Henüz kesinleşmiş veya süreçte olan bir rezervasyonunuz yok.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {businessBookings.map((b) => {
                const existingReview = reviews.find((r) => r.bookingId === b.id && r.reviewerId === currentUser.id);
                const activeDispute = disputes.find((d) => d.bookingId === b.id);
                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-5 text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#e2e8f0] dark:border-[#1e335a]">
                      <div>
                        <div className="text-xs font-semibold text-[#f25922]">Rezervasyon Kodu: {b.id}</div>
                        <h3 className="text-lg font-bold text-[#0f172a] dark:text-white mt-0.5">{b.listingTitle}</h3>
                        <div className="text-xs text-[#475569] dark:text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                          <span>Sanatçı: <strong className="text-[#0f172a] dark:text-white">{b.performerName}</strong></span>
                          <span>·</span>
                          <span>Tarih: {b.eventDate}</span>
                          <span>·</span>
                          <span>Mekân: {b.venueName}</span>
                        </div>
                      </div>

                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                        {b.status === 'agreement_pending'
                          ? 'Sözleşme Onayı Bekleniyor'
                          : b.status === 'payment_pending'
                          ? 'Güvence Ödemesi Bekleniyor'
                          : b.status === 'confirmed'
                          ? 'Rezervasyon Kesinleşti'
                          : b.status === 'performer_completed'
                          ? 'Sanatçı Tamamladı (İşveren Onayı Bekliyor)'
                          : b.status === 'employer_completed'
                          ? 'İşveren Onayladı (Sanatçı Onayı Bekliyor)'
                          : b.status === 'completed'
                          ? 'Hizmet Tamamlandı (Hakediş Aktarıldı)'
                          : b.status === 'in_dispute'
                          ? 'Uyuşmazlık İncelemesinde (Bloke)'
                          : b.status === 'cancelled'
                          ? 'İptal Edildi'
                          : b.status}
                      </span>
                    </div>

                    <div className="p-4 bg-[#f8fafc] dark:bg-[#0f1c38] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a]">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-slate-400 mb-2">
                        Finansal Detay ({b.commissionModel === 'A_EMPLOYER_PAYS' ? 'Model A — İşveren Komisyon Öder' : 'Model B — Hakedişten Kesinti'})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-[#475569] dark:text-slate-300">Sanatçı Net Hakedişi:</div>
                          <div className="text-base font-bold text-[#0f172a] dark:text-white tabular-nums">
                            {formatCurrencyTRY(b.netPayoutAmount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#475569] dark:text-slate-300">Platform Komisyonu (%{b.commissionRate}):</div>
                          <div className="text-base font-bold text-[#f25922] tabular-nums">
                            {formatCurrencyTRY(b.commissionAmount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#475569] dark:text-slate-300 font-semibold">İşverenin Toplam Ödemesi:</div>
                          <div className="text-base font-bold text-[#0f172a] dark:text-white tabular-nums">
                            {formatCurrencyTRY(b.grossAmount)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeDispute && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                        <strong>Uyuşmazlık Kaydı ({activeDispute.status}):</strong> {activeDispute.reason}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setContractViewBookingId(b.id)}
                          className="px-3.5 py-2 text-xs font-bold text-[#16274e] dark:text-white bg-[#f1f3ff] dark:bg-[#0f1c38] rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#f25922]" />
                          <span>Dijital Sözleşmeyi Gör</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo('production_desk', b.id)}
                          className="px-3.5 py-2 text-xs font-bold text-[#16274e] dark:text-white bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#f25922]" />
                          <span>Prodüksiyon Masası</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {b.status === 'agreement_pending' && !b.contractTermsAcceptedByEmployer && (
                          <button
                            type="button"
                            onClick={() => acceptContract(b.id)}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#16274e] rounded-xl cursor-pointer"
                          >
                            Sözleşmeyi Onayla
                          </button>
                        )}

                        {b.status === 'payment_pending' && (
                          <button
                            type="button"
                            onClick={() => payBookingSandbox(b.id)}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4 text-emerald-300" />
                            <span>iyzico Sandbox Güvence Ödemesi ({formatCurrencyTRY(b.grossAmount)})</span>
                          </button>
                        )}

                        {(b.status === 'confirmed' || b.status === 'performer_completed') && !b.employerCompletedAt && (
                          <button
                            type="button"
                            onClick={() => completeEmployerService(b.id)}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Hizmetin Gerçekleştiğini Onayla</span>
                          </button>
                        )}

                        {['confirmed', 'performer_completed', 'employer_completed'].includes(b.status) && b.disputeStatus !== 'open' && (
                          <button
                            type="button"
                            onClick={() => setDisputeBookingId(b.id)}
                            className="px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Uyuşmazlık Bildir</span>
                          </button>
                        )}

                        {b.status === 'completed' && !existingReview && (
                          <button
                            type="button"
                            onClick={() => setReviewBookingId(b.id)}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>Sanatçıyı Değerlendir</span>
                          </button>
                        )}

                        {!['completed', 'cancelled', 'in_dispute'].includes(b.status) && (
                          <button
                            type="button"
                            onClick={() => setCancellingBookingId(b.id)}
                            className="px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 rounded-xl cursor-pointer"
                          >
                            İptal Et
                          </button>
                        )}

                        {b.status === 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleTriggerEmergencyReplacement(b.id)}
                            className="px-4 py-2 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-800" />
                            <span>1-Tıkla Acil İkame İlanı Oluştur</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: VERIFICATION */}
      {activeTab === 'verification' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-6 max-w-2xl text-left">
          <div>
            <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">İşletme Doğrulama ve Akreditasyon</h2>
            <p className="text-xs text-[#64748b] dark:text-slate-400 mt-1">
              İlan açabilmek için işletme vergi levhası ve ticaret sicil belgelerinin doğrulama uzmanı tarafından onaylanması gerekir.
            </p>
          </div>

          {business.isVerified ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Hesabınız Doğrulanmıştır</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Tüm ilan yayınlama, rezervasyon ve ödeme süreçleriniz tam yetkiyle aktiftir.
                </p>
              </div>
            </div>
          ) : verifSubmitted ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-800 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">Belgeleriniz İnceleniyor</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Doğrulama ekibi belgelerinizi incelemektedir.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">
                  Resmî Vergi Levhası / Ticaret Sicil Gazetesi (Belge URL)
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com/docs/vergi_levhasi.pdf"
                  value={verifDocUrl}
                  onChange={(e) => setVerifDocUrl(e.target.value)}
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl cursor-pointer"
              >
                İncelemeye Gönder
              </button>
            </form>
          )}
        </div>
      )}

      {/* CREATE LISTING MODAL */}
      {isCreatingListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a]">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] dark:border-[#1e335a]">
              <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Yeni Etkinlik İlanı Oluştur</h2>
              <button type="button" onClick={() => setIsCreatingListing(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#64748b]" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-900 dark:text-rose-200 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateListingSubmit} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">İlan Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Hafta Sonu Salon Konseri — Yaylı Trio"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Disiplin</label>
                  <select
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value as ArtDiscipline)}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white"
                  >
                    {ART_DISCIPLINES.filter((d) => d !== 'Tümü').map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Şehir</label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white"
                  >
                    {CITY_LIST.filter((c) => c !== 'Tümü').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Kadro Formatı</label>
                  <select
                    value={newEnsembleType}
                    onChange={(e) => setNewEnsembleType(e.target.value as any)}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Trio">Trio</option>
                    <option value="Quartet">Quartet</option>
                    <option value="Quintet">Quintet</option>
                    <option value="Chamber Ensemble">Chamber Ensemble</option>
                    <option value="Orkestra">Orkestra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Sabit Bütçe (TRY)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Etkinlik Tarihi</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Süre (Dk)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Başlangıç Saati</label>
                  <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-full text-xs p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Bitiş Saati</label>
                  <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="w-full text-xs p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Son Başvuru</label>
                  <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="w-full text-xs p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block mb-1">Mekân ve Salon Bilgisi</label>
                <input
                  type="text"
                  value={newVenue || `${business.businessName} Ana Salon`}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">Detaylı Açıklama &amp; Repertuvar Talebi</label>
                  {isFlagEnabled('ai_draft_assistant') && (
                    <button
                      type="button"
                      onClick={handleAiListingBrief}
                      disabled={loadingAi}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f25922] hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{loadingAi ? 'Hazırlanıyor...' : 'Yapay Zekâ İlan Taslağı'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Etkinliğin konsepti, aranan müzik tarzı ve sahne beklentileri..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="soundCheck"
                  checked={newSoundSystem}
                  onChange={(e) => setNewSoundSystem(e.target.checked)}
                  className="w-4 h-4 text-[#f25922] rounded"
                />
                <label htmlFor="soundCheck" className="text-xs text-[#475569] dark:text-slate-300 cursor-pointer">
                  Ses sistemi mekân tarafından temin edilmektedir.
                </label>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#1e335a] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingListing(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl shadow-sm cursor-pointer"
                >
                  İlanı Onaya Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL CONTRACT MODAL */}
      {contractViewBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-lg w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0f172a] dark:text-white">
                {activeContract?.title || 'Dijital İcra Sözleşmesi'}
              </h3>
              <button type="button" onClick={() => setContractViewBookingId(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#64748b]" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs text-[#475569] dark:text-slate-300 bg-[#f8fafc] dark:bg-[#0f1c38] p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] font-sans leading-relaxed">
              {activeContract?.termsText || 'Sözleşme metni yükleniyor...'}
            </pre>
            {activeContract?.disclaimer && (
              <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl">
                {activeContract.disclaimer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COUNTER OFFER MODAL */}
      {counterOfferId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Karşı Teklif Gönder</h3>
            <div>
              <label className="text-xs font-semibold block mb-1">Tutar (TRY)</label>
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(Number(e.target.value))}
                className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Not / Kapsam</label>
              <textarea
                rows={2}
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCounterOfferId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button
                type="button"
                onClick={async () => {
                  await counterOffer(counterOfferId, counterAmount, counterNote);
                  setCounterOfferId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Uyuşmazlık Kaydı Oluştur</h3>
            <p className="text-xs text-[#64748b] dark:text-slate-400">
              Uyuşmazlık açıldığında ilgili güvence ödemesi yönetici/finans ekibi incelemesi tamamlanana kadar dondurulur.
            </p>
            <input
              type="text"
              placeholder="Uyuşmazlık konusu (Örn: Sahne saati ihlali / eksik kadro)"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
            />
            <textarea
              rows={3}
              placeholder="Kanıt ve detaylı açıklama..."
              value={disputeEvidence}
              onChange={(e) => setDisputeEvidence(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDisputeBookingId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button
                type="button"
                onClick={async () => {
                  await openDispute(disputeBookingId, disputeReason || 'Hizmet uyuşmazlığı', disputeEvidence);
                  setDisputeBookingId(null);
                  setDisputeReason('');
                  setDisputeEvidence('');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-700 rounded-xl cursor-pointer"
              >
                Uyuşmazlık Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL (Completed Only) */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Doğrulanmış Sahne Değerlendirmesi</h3>
            <div>
              <label className="text-xs font-semibold block mb-1">Puan (1 - 5)</label>
              <select
                value={reviewScore}
                onChange={(e) => setReviewScore(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>{s} Yıldız</option>
                ))}
              </select>
            </div>
            <textarea
              rows={3}
              placeholder="Performans kalitesi, iletişim ve sahne disiplini hakkında yorumunuz..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReviewBookingId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button
                type="button"
                onClick={async () => {
                  await submitReview(
                    reviewBookingId,
                    { overall: reviewScore, quality: reviewScore, comm: reviewScore, prof: reviewScore },
                    reviewComment
                  );
                  setReviewBookingId(null);
                  setReviewComment('');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer"
              >
                Değerlendirmeyi Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Rezervasyonu İptal Et</h3>
            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              İptal durumunda sanatçı bilgilendirilecek ve ödeme havuzu iade sürecine alınacaktır.
            </p>
            <textarea
              rows={3}
              required
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Etkinlik erteleme, teknik arıza, organizasyon değişikliği..."
              className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCancellingBookingId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button type="button" onClick={handleConfirmCancellation} className="px-4 py-2 text-xs font-bold text-white bg-rose-700 rounded-xl cursor-pointer">
                İptali Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
