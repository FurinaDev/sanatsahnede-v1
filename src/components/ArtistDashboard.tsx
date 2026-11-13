import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrencyTRY } from '../utils/businessLogic';
import {
  CheckCircle2,
  Star,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  Scale,
  Briefcase,
  Award,
  CalendarDays,
  X,
} from 'lucide-react';

export const ArtistDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    verifyEmailSandbox,
    verifyPhoneSandbox,
    artists,
    applications,
    offers,
    bookings,
    contracts,
    disputes,
    reviews,
    settings,
    acceptContract,
    completePerformerService,
    counterOffer,
    acceptOffer,
    rejectOffer,
    openDispute,
    submitReview,
    submitVerificationRequest,
    cancelBooking,
    navigateTo,
  } = useApp();

  const artist = isAuthenticated
    ? artists.find((a) => a.userId === currentUser.id)
    : undefined;

  const [activeTab, setActiveTab] = useState<'bookings' | 'applications' | 'offers' | 'payouts' | 'verification'>('bookings');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [contractViewBookingId, setContractViewBookingId] = useState<string | null>(null);
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [verifDocUrl, setVerifDocUrl] = useState('');
  const [verifSubmitted, setVerifSubmitted] = useState(false);

  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState(20000);
  const [counterNote, setCounterNote] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Sanatçı Paneline Erişmek İçin Giriş Yapın</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">Başvurularınızı, dijital sözleşmelerinizi ve sahne hakedişlerinizi görmek için oturum açın.</p>
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

  if (!artist) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Bireysel Sanatçı Profiliniz Henüz Oluşturulmamış</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">
          Mevcut hesabınıza bireysel sanatçı çalışma alanı ekleyerek ilanlara başvurabilir ve sahne takviminizi yönetebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => addRoleWorkspace('artist')}
          className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer"
        >
          Sanatçı Çalışma Alanı Oluştur
        </button>
      </div>
    );
  }

  const myApplications = applications.filter(
    (a) => a.applicantUserId === currentUser.id || a.applicantId === artist.id
  );
  const myBookings = bookings.filter(
    (b) => b.performerId === artist.id || b.performerName.includes(artist.fullName)
  );
  const myOffers = offers.filter((o) => o.performerUserId === currentUser.id);

  const totalCompletedEarnings = myBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.netPayoutAmount, 0);

  const handleArtistCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, cancelReason || 'Sanatçı mazereti');
    setCancellingBookingId(null);
    setCancelReason('');
  };

  const activeContract = contractViewBookingId
    ? contracts.find((c) => c.bookingId === contractViewBookingId)
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6">
      {(!currentUser.emailVerified || !currentUser.phoneVerified) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-amber-900 dark:text-amber-200">
            <strong>Güvenlik Doğrulaması (Sandbox):</strong> Başvuru ve sahne sözleşmeleri için e-posta ve telefon doğrulamasını tamamlayın.
          </div>
          <div className="flex items-center gap-2">
            {!currentUser.emailVerified && (
              <button type="button" onClick={() => verifyEmailSandbox()} className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white font-bold cursor-pointer">
                E-postayı Doğrula
              </button>
            )}
            {!currentUser.phoneVerified && (
              <button type="button" onClick={() => verifyPhoneSandbox()} className="px-3 py-1.5 rounded-lg bg-[#f25922] text-white font-bold cursor-pointer">
                Telefonu Doğrula
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white dark:bg-[#13213e] rounded-3xl p-6 sm:p-8 border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={artist.avatarUrl}
              alt={artist.fullName}
              className="w-16 h-16 rounded-2xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shadow-sm shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white">{artist.fullName}</h1>
                {artist.isVerified ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Doğrulanmış Sanatçı
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#ad3300] bg-[#ffdbd0] px-2 py-0.5 rounded-md">
                    Doğrulama Bekleniyor
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
                {artist.title} · {artist.primaryInstrument} · {artist.city}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('artist_studio')}
              className="px-3.5 py-2 rounded-xl bg-[#f1f3ff] dark:bg-[#0f1c38] text-xs font-bold text-[#16274e] dark:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#f25922]" />
              <span>Sanatçı Stüdyom &amp; EPK</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('career_passport')}
              className="px-3.5 py-2 rounded-xl bg-[#f1f3ff] dark:bg-[#0f1c38] text-xs font-bold text-[#16274e] dark:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#f25922]" />
              <span>Kariyer Pasaportum</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('open_stage')}
              className="px-3.5 py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#f25922]" />
              <span>Müsaitlik &amp; Açık Sahne</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mt-5 p-3 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a]">
          <div>
            <div className="text-[10px] font-bold uppercase text-[#64748b]">Puan</div>
            <div className="text-sm font-bold text-[#0f172a] dark:text-white flex items-center gap-1 tabular-nums">
              <Star className="w-3.5 h-3.5 text-[#f25922] fill-[#f25922]" />
              <span>{artist.ratingAvg.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[#64748b]">Tamamlanan Sahne</div>
            <div className="text-sm font-bold text-[#0f172a] dark:text-white tabular-nums">{artist.completedJobsCount}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[#64748b]">İptal Oranı</div>
            <div className="text-sm font-bold text-emerald-600 tabular-nums">%{artist.cancellationRate}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#e2e8f0] dark:border-[#1e335a] overflow-x-auto text-xs">
          {[
            { id: 'bookings', label: `Rezervasyonlar & Sözleşmeler (${myBookings.length})` },
            { id: 'applications', label: `Başvurularım (${myApplications.length})` },
            { id: 'offers', label: `Teklifler (${myOffers.length})` },
            { id: 'payouts', label: 'Hakediş & Komisyon' },
            { id: 'verification', label: 'Sanatçı Doğrulaması' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-[#16274e] dark:bg-[#f25922] text-white' : 'text-[#475569] dark:text-slate-300 hover:bg-[#f1f3ff]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-2">
              <p className="text-sm text-[#475569] dark:text-slate-300">Henüz aktif bir sahne rezervasyonunuz yok.</p>
              <button
                type="button"
                onClick={() => navigateTo('listings')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl cursor-pointer"
              >
                İlanları Keşfet ve Başvur
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((b) => {
                const existingReview = reviews.find((r) => r.bookingId === b.id && r.reviewerId === currentUser.id);
                const activeDispute = disputes.find((d) => d.bookingId === b.id);
                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4 text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#f25922]">Rezervasyon: {b.id}</div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-[#0f172a] dark:text-white mt-0.5">{b.listingTitle}</h3>
                        <div className="text-xs text-[#475569] dark:text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                          <span>İşveren: <strong className="text-[#0f172a] dark:text-white">{b.businessName}</strong></span>
                          <span>·</span>
                          <span>Tarih: {b.eventDate}</span>
                          <span>·</span>
                          <span>Mekân: {b.venueName}</span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xs text-[#64748b] dark:text-slate-400">Net Sanatçı Hakedişi ({b.commissionModel})</div>
                        <div className="font-display text-xl font-bold text-[#0f172a] dark:text-white tabular-nums">
                          {formatCurrencyTRY(b.netPayoutAmount)}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {b.paymentStatus === 'held_sandbox'
                            ? 'Korumalı Havuzda Bekliyor (Sandbox)'
                            : b.paymentStatus === 'released'
                            ? 'Hakediş Aktarıldı'
                            : b.paymentStatus === 'refunded'
                            ? 'İade Edildi'
                            : 'Ödeme Bekleniyor'}
                        </div>
                      </div>
                    </div>

                    {activeDispute && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                        <strong>Uyuşmazlık Kaydı ({activeDispute.status}):</strong> {activeDispute.reason}
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#f1f3ff] dark:bg-[#0f1c38] text-[#16274e] dark:text-slate-200 border border-[#e2e8f0] dark:border-[#1e335a]">
                        {b.status === 'agreement_pending'
                          ? 'Dijital Sözleşme Onayınız Bekleniyor'
                          : b.status === 'payment_pending'
                          ? 'Sözleşme Onaylandı — İşverenin Güvence Ödemesi Bekleniyor'
                          : b.status === 'confirmed'
                          ? 'Rezervasyon Kesinleşti (Sahne Bekleniyor)'
                          : b.status === 'performer_completed'
                          ? 'Tamamlandı Bildirildi (İşveren Onayı Bekleniyor)'
                          : b.status === 'employer_completed'
                          ? 'İşveren Onayladı (Sizin Onayınız Bekleniyor)'
                          : b.status === 'completed'
                          ? 'Tamamlandı (Hakediş Hesaba Aktarıldı)'
                          : b.status === 'in_dispute'
                          ? 'Uyuşmazlık İncelemesinde'
                          : b.status}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setContractViewBookingId(b.id)}
                          className="px-3 py-2 text-xs font-bold text-[#16274e] dark:text-white bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#f25922]" />
                          <span>Sözleşme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateTo('production_desk', b.id)}
                          className="px-3 py-2 text-xs font-bold text-[#16274e] dark:text-white bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#f25922]" />
                          <span>Prodüksiyon Masası</span>
                        </button>

                        {b.status === 'agreement_pending' && !b.contractTermsAcceptedByPerformer && (
                          <button
                            type="button"
                            onClick={() => acceptContract(b.id)}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer"
                          >
                            Sözleşmeyi Onayla
                          </button>
                        )}

                        {(b.status === 'confirmed' || b.status === 'employer_completed') && !b.performerCompletedAt && (
                          <button
                            type="button"
                            onClick={() => completePerformerService(b.id)}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Hizmeti Tamamladım</span>
                          </button>
                        )}

                        {['confirmed', 'performer_completed', 'employer_completed'].includes(b.status) && b.disputeStatus !== 'open' && (
                          <button
                            type="button"
                            onClick={() => setDisputeBookingId(b.id)}
                            className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Uyuşmazlık</span>
                          </button>
                        )}

                        {b.status === 'completed' && !existingReview && (
                          <button
                            type="button"
                            onClick={() => setReviewBookingId(b.id)}
                            className="px-3.5 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer"
                          >
                            Kurumu Değerlendir
                          </button>
                        )}

                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => setCancellingBookingId(b.id)}
                            className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer"
                          >
                            Son Dakika İptal
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

      {/* TAB: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          {myApplications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a]">
              <p className="text-sm text-[#475569] dark:text-slate-300">Henüz bir ilana başvurmadınız.</p>
            </div>
          ) : (
            myApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-[#13213e] p-5 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-[#64748b] dark:text-slate-400">Başvuru Kodu: {app.id}</div>
                  <div className="text-sm font-bold text-[#0f172a] dark:text-white">
                    {app.applicantType === 'ensemble' ? 'Topluluk Başvurusu' : 'Bireysel Başvuru'}
                  </div>
                  <div className="text-xs text-[#475569] dark:text-slate-300 italic">&ldquo;{app.message}&rdquo;</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f8fafc] dark:bg-[#0f1c38] text-[#475569] dark:text-slate-300">
                  {app.status === 'shortlisted'
                    ? 'Kısa Listeye Alındınız'
                    : app.status === 'selected'
                    ? 'Seçildiniz'
                    : app.status === 'rejected'
                    ? 'Reddedildi'
                    : 'İnceleniyor'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: OFFERS */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          {myOffers.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-xs text-[#64748b]">
              Henüz teklif veya karşı teklif görüşmeniz yok.
            </div>
          ) : (
            myOffers.map((off) => {
              const waitingForMe = off.lastActorUserId !== currentUser.id && ['pending', 'countered'].includes(off.status);
              return (
                <div key={off.id} className="bg-white dark:bg-[#13213e] p-5 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#f25922]">{off.listingTitle || off.listingId}</div>
                      <div className="text-xs text-[#64748b]">Tarih: {off.eventDate} · Durum: {off.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#0f172a] dark:text-white tabular-nums">{formatCurrencyTRY(off.netPayoutAmount)} Net</div>
                      <div className="text-[11px] text-[#64748b]">Teklif Tutarı: {formatCurrencyTRY(off.proposedAmount)}</div>
                    </div>
                  </div>
                  {['pending', 'countered'].includes(off.status) && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {waitingForMe && (
                        <button type="button" onClick={() => acceptOffer(off.id)} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                          Teklifi Kabul Et
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCounterOfferId(off.id);
                          setCounterAmount(off.proposedAmount);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
                      >
                        Karşı Teklif Gönder
                      </button>
                      <button type="button" onClick={() => rejectOffer(off.id)} className="px-3 py-2 rounded-xl text-rose-700 text-xs font-semibold cursor-pointer">
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs">
            <div className="text-xs text-[#64748b] dark:text-slate-400 uppercase font-semibold">Toplam Tamamlanan Hakediş</div>
            <div className="text-3xl font-bold text-[#0f172a] dark:text-white mt-2 tabular-nums">
              {formatCurrencyTRY(totalCompletedEarnings)}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">Çift onay sonrası serbest bırakılan tutarlar</div>
          </div>

          <div className="p-6 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs">
            <div className="text-xs text-[#64748b] dark:text-slate-400 uppercase font-semibold">Aktif Platform Komisyon Modeli</div>
            <div className="text-sm font-semibold text-[#0f172a] dark:text-white mt-2">
              {settings.commissionModel === 'A_EMPLOYER_PAYS'
                ? `Model A: Komisyon (%${settings.commissionRate}) İşverenden Tahsil Edilir`
                : `Model B: %${settings.commissionRate} Platform Komisyonu Hakedişten Düşülür`}
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
              Her rezervasyonda anlaşma anındaki komisyon modeli sözleşmeye ve finansal deftere kalıcı olarak kaydedilir.
            </p>
          </div>
        </div>
      )}

      {/* TAB: VERIFICATION */}
      {activeTab === 'verification' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] max-w-2xl space-y-4">
          <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Sanatçı Portfolyo &amp; Kimlik Doğrulaması</h2>
          {artist.isVerified ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
              Sanatçı doğrulamanız onaylanmıştır. Tüm ilanlara başvurabilir ve Kariyer Pasaportu rozetini kullanabilirsiniz.
            </div>
          ) : verifSubmitted ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              Doğrulama başvurunuz incelemeye alındı.
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!verifDocUrl) return;
                const r = await submitVerificationRequest('artist', artist.fullName, verifDocUrl);
                if (r.success) setVerifSubmitted(true);
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-semibold">Konservatuvar Diploması / Portfolyo Kayıt Bağlantısı (URL)</label>
              <input
                type="text"
                required
                value={verifDocUrl}
                onChange={(e) => setVerifDocUrl(e.target.value)}
                placeholder="https://example.com/portfolyo-veya-diploma.pdf"
                className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]"
              />
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer">
                Doğrulama Talebi Gönder
              </button>
            </form>
          )}
        </div>
      )}

      {/* DIGITAL CONTRACT MODAL */}
      {contractViewBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-lg w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0f172a] dark:text-white">{activeContract?.title || 'Dijital Sözleşme'}</h3>
              <button type="button" onClick={() => setContractViewBookingId(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#64748b]" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs text-[#475569] dark:text-slate-300 bg-[#f8fafc] dark:bg-[#0f1c38] p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] font-sans leading-relaxed">
              {activeContract?.termsText || 'Sözleşme detayı bulunamadı.'}
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
            <input type="number" value={counterAmount} onChange={(e) => setCounterAmount(Number(e.target.value))} className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]" />
            <textarea rows={2} value={counterNote} onChange={(e) => setCounterNote(e.target.value)} placeholder="Kapsam / teknik şart notu..." className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCounterOfferId(null)} className="px-4 py-2 text-xs">Vazgeç</button>
              <button type="button" onClick={async () => { await counterOffer(counterOfferId, counterAmount, counterNote); setCounterOfferId(null); }} className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer">
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
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Uyuşmazlık Bildir</h3>
            <input type="text" placeholder="Sebep" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]" />
            <textarea rows={3} placeholder="Açıklama" value={disputeEvidence} onChange={(e) => setDisputeEvidence(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDisputeBookingId(null)} className="px-4 py-2 text-xs">Vazgeç</button>
              <button type="button" onClick={async () => { await openDispute(disputeBookingId, disputeReason || 'Sözleşme uyuşmazlığı', disputeEvidence); setDisputeBookingId(null); }} className="px-4 py-2 text-xs font-bold text-white bg-amber-700 rounded-xl cursor-pointer">
                Bildir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Kurumu Değerlendir</h3>
            <select value={reviewScore} onChange={(e) => setReviewScore(Number(e.target.value))} className="w-full text-xs p-2.5 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]">
              {[5, 4, 3, 2, 1].map((s) => (<option key={s} value={s}>{s} Yıldız</option>))}
            </select>
            <textarea rows={3} placeholder="Yorumunuz..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38]" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReviewBookingId(null)} className="px-4 py-2 text-xs">Vazgeç</button>
              <button type="button" onClick={async () => { await submitReview(reviewBookingId, { overall: reviewScore, quality: reviewScore, comm: reviewScore, prof: reviewScore }, reviewComment); setReviewBookingId(null); }} className="px-4 py-2 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Son Dakika İptal Bildirimi</h3>
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              Kesinleşmiş rezervasyon iptalleri güvenilirlik sicilindeki <strong>İptal Oranınızı</strong> etkiler.
            </p>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Sağlık mazereti, mücbir sebep..."
              className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCancellingBookingId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button type="button" onClick={handleArtistCancel} className="px-4 py-2 text-xs font-bold text-white bg-rose-700 rounded-xl cursor-pointer">
                İptali Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
