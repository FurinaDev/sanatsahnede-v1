import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EnsembleType, Instrument } from '../types';
import {
  UserPlus,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Layers,
  Info,
  Pencil,
  AlertCircle,
  Mail,
  X,
} from 'lucide-react';
import { formatCurrencyTRY } from '../utils/businessLogic';

export const EnsembleDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    ensembles,
    applications,
    offers,
    bookings,
    updateEnsembleProfile,
    addEnsembleMember,
    respondEnsembleInvite,
    removeEnsembleMember,
    withdrawApplication,
    acceptOffer,
    rejectOffer,
    acceptContract,
    completePerformerService,
    submitVerificationRequest,
    navigateTo,
  } = useApp();

  const ensemble = isAuthenticated
    ? ensembles.find((e) => e.leaderUserId === currentUser.id)
    : undefined;

  // Pending invites across any ensemble for the logged-in user
  const myPendingInvites = isAuthenticated
    ? ensembles.flatMap((ens) =>
        ens.members
          .filter(
            (m) =>
              m.status === 'invited' &&
              (m.userId === currentUser.id ||
                (m.email && m.email.toLowerCase() === currentUser.email.toLowerCase()))
          )
          .map((m) => ({ ensemble: ens, member: m }))
      )
    : [];

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberInstrument, setNewMemberInstrument] = useState<Instrument>('Keman');
  const [newMemberRole, setNewMemberRole] = useState('Enstrüman İcracısı');
  const [showAddModal, setShowAddModal] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    ensembleType: 'Trio' as EnsembleType,
    city: '',
    foundedYear: 2020,
    bio: '',
    website: '',
  });
  const [verifDocUrl, setVerifDocUrl] = useState('');
  const [verifSubmitted, setVerifSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Topluluk Paneline Erişmek İçin Giriş Yapın</h2>
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

  const runAction = async (fn: () => Promise<{ success: boolean; error?: string }>, successText: string) => {
    setFeedback(null);
    const res = await fn();
    if (!res.success) {
      setFeedback({ type: 'error', text: res.error || 'İşlem başarısız oldu.' });
    } else {
      setFeedback({ type: 'success', text: successText });
    }
    return res;
  };

  if (!ensemble) {
    return (
      <div className="max-w-3xl mx-auto my-12 space-y-6">
        {feedback && (
          <div
            role="alert"
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {myPendingInvites.length > 0 && (
          <div className="p-6 bg-white dark:bg-[#13213e] rounded-3xl border border-amber-200 dark:border-amber-800 space-y-3 text-left">
            <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#f25922]" />
              <span>Bekleyen Topluluk Üyelik Davetleriniz ({myPendingInvites.length})</span>
            </h2>
            {myPendingInvites.map(({ ensemble: ens, member }) => (
              <div key={member.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-sm text-[#0f172a] dark:text-white">{ens.name}</div>
                  <div className="text-[#475569] dark:text-slate-300">{member.instrument} · {member.roleTitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runAction(() => respondEnsembleInvite(ens.id, member.id, 'accept'), `"${ens.name}" topluluk davetini kabul ettiniz.`)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    Daveti Kabul Et
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction(() => respondEnsembleInvite(ens.id, member.id, 'decline'), 'Davet reddedildi.')}
                    className="px-3 py-2 rounded-xl text-rose-700 font-semibold cursor-pointer"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Topluluk Çalışma Alanınız Henüz Yok</h2>
          <p className="text-xs text-[#64748b] dark:text-slate-400">
            Oda müziği grubu, orkestra veya kolektif çalışma alanı oluşturarak ortak sahnelere başvurabilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => addRoleWorkspace('ensemble_leader', { organizationName: `${currentUser.firstName} Topluluğu` })}
            className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer"
          >
            Topluluk Çalışma Alanı Oluştur
          </button>
        </div>
      </div>
    );
  }

  const ensembleBookings = bookings.filter((b) => b.performerId === ensemble.id);
  const ensembleApplications = applications.filter((a) => a.applicantType === 'ensemble' && a.applicantId === ensemble.id);
  const ensembleOffers = offers.filter((o) => o.performerType === 'ensemble' && o.performerId === ensemble.id);

  const handleOpenEdit = () => {
    setProfileForm({
      name: ensemble.name,
      ensembleType: ensemble.ensembleType,
      city: ensemble.city,
      foundedYear: ensemble.foundedYear || 2020,
      bio: ensemble.bio,
      website: ensemble.website || '',
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await runAction(() => updateEnsembleProfile(ensemble.id, profileForm), 'Topluluk bilgileri güncellendi.');
    if (res.success) setEditingProfile(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const res = await runAction(
      () =>
        addEnsembleMember(ensemble.id, {
          name: newMemberName,
          instrument: newMemberInstrument,
          roleTitle: newMemberRole,
          email: newMemberEmail.trim() || undefined,
        }),
      newMemberEmail.trim() ? 'Üyelik daveti gönderildi / kadroya eklendi.' : 'Üye topluluk kadrosuna eklendi.'
    );
    if (res.success) {
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddModal(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    await runAction(() => removeEnsembleMember(ensemble.id, memberId), 'Üye kadrodan çıkarıldı.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6">
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#16274e] dark:text-blue-400" />
        <div>
          <strong>Topluluk Hukuki Statüsü &amp; Hakediş Sorumluluğu:</strong> Sanat toplulukları platform içinde ortak çalışma ve kadro grubu olarak tanımlanır (ayrı tüzel kişilik değildir). Hakediş tahsilatı ve fatura sorumluluğu topluluk lideri/yetkili temsilci hesabı üzerinden yürütülür.
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="underline shrink-0 cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {myPendingInvites.length > 0 && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 rounded-3xl border border-amber-200 dark:border-amber-800 space-y-3">
          <h2 className="font-display text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#f25922]" />
            <span>Size Gelen Topluluk Davetleri ({myPendingInvites.length})</span>
          </h2>
          {myPendingInvites.map(({ ensemble: ens, member }) => (
            <div key={member.id} className="p-3 rounded-xl bg-white dark:bg-[#13213e] border border-amber-200 dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold">{ens.name}</span> — {member.instrument} ({member.roleTitle})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runAction(() => respondEnsembleInvite(ens.id, member.id, 'accept'), `"${ens.name}" daveti kabul edildi.`)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Kabul Et
                </button>
                <button
                  type="button"
                  onClick={() => runAction(() => respondEnsembleInvite(ens.id, member.id, 'decline'), 'Davet reddedildi.')}
                  className="px-3 py-1.5 rounded-lg text-rose-700 font-semibold cursor-pointer"
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white dark:bg-[#13213e] rounded-3xl p-6 sm:p-8 border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={ensemble.avatarUrl}
              alt={ensemble.name}
              className="w-16 h-16 rounded-2xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-white">{ensemble.name}</h1>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {ensemble.isVerified ? 'Doğrulanmış Topluluk' : 'Onay Bekliyor'}
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 mt-1">
                Topluluk Yönetim Paneli · {ensemble.ensembleType} · {ensemble.city}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="px-4 py-2.5 text-xs font-bold text-[#16274e] dark:text-white bg-[#f1f3ff] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#f25922]" />
              <span>Topluluğu Düzenle</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#16274e] hover:bg-[#111d38] dark:bg-[#f25922] dark:hover:bg-[#d94b18] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#f25922] dark:text-white" />
              <span>Üye Davet Et / Ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Members Roster & Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#1e335a]">
            <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Kadro ve Üye Yönetimi</h2>
            <span className="text-xs text-[#64748b] dark:text-slate-400 tabular-nums">{ensemble.members.length} Sanatçı</span>
          </div>

          <div className="space-y-3">
            {ensemble.members.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={m.avatarUrl} alt={m.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white truncate">{m.name}</span>
                      {m.status === 'invited' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">Davet Bekliyor</span>
                      )}
                      {m.status === 'declined' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">Reddedildi</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#f25922] font-medium truncate">
                      {m.instrument} · {m.roleTitle}{m.email ? ` · ${m.email}` : ''}
                    </div>
                  </div>
                </div>

                {ensemble.members.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Kadrodan çıkar: ${m.name}`}
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 text-[#64748b] hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Kadrodan Çıkar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4">
          <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Topluluk Rezervasyonları</h2>

          {ensembleBookings.length === 0 ? (
            <p className="text-xs text-[#64748b] dark:text-slate-400">Henüz kesinleşmiş bir topluluk rezervasyonu bulunmuyor.</p>
          ) : (
            <div className="space-y-3">
              {ensembleBookings.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#0f172a] dark:text-white">{b.listingTitle}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">{formatCurrencyTRY(b.netPayoutAmount)}</span>
                  </div>
                  <div className="text-[#64748b] dark:text-slate-400">
                    {b.businessName} · {b.eventDate} · Durum: {b.status}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('production_desk', b.id)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#13213e] border border-[#e2e8f0] dark:border-[#1e335a] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-[#f25922]" />
                      <span>Prodüksiyon Masası</span>
                    </button>
                    {b.status === 'agreement_pending' && !b.contractTermsAcceptedByPerformer && (
                      <button
                        type="button"
                        onClick={() => runAction(() => acceptContract(b.id), 'Topluluk sözleşmesi onaylandı.')}
                        className="px-3 py-1.5 rounded-lg bg-[#f25922] text-white font-bold cursor-pointer"
                      >
                        Sözleşmeyi Onayla
                      </button>
                    )}
                    {(b.status === 'confirmed' || b.status === 'employer_completed') && !b.performerCompletedAt && (
                      <button
                        type="button"
                        onClick={() => runAction(() => completePerformerService(b.id), 'Tamamlanma bildirimi kaydedildi.')}
                        className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tamamlandı Bildir</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ensemble Applications, Offers & Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4">
          <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Topluluk Başvuruları ({ensembleApplications.length})</h2>
          {ensembleApplications.length === 0 ? (
            <p className="text-xs text-[#64748b]">Topluluk olarak yaptığınız bir başvuru bulunmuyor.</p>
          ) : (
            <div className="space-y-3">
              {ensembleApplications.map((app) => (
                <div key={app.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold">Başvuru #{app.id}</div>
                    <div className="text-[#475569] dark:text-slate-300 italic">&ldquo;{app.message}&rdquo;</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-white dark:bg-[#13213e] font-semibold">{app.status}</span>
                    {['submitted', 'shortlisted'].includes(app.status) && (
                      <button
                        type="button"
                        onClick={() => runAction(() => withdrawApplication(app.id), 'Topluluk başvurusu geri çekildi.')}
                        className="px-2.5 py-1 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                      >
                        Geri Çek
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4">
          <h2 className="font-display text-base font-bold text-[#0f172a] dark:text-white">Topluluk Teklifleri &amp; Doğrulama ({ensembleOffers.length})</h2>
          {ensembleOffers.map((off) => {
            const waitingForMe = off.lastActorUserId !== currentUser.id && ['pending', 'countered'].includes(off.status);
            return (
              <div key={off.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{off.listingTitle || off.listingId}</span>
                  <span className="font-bold text-[#f25922] tabular-nums">{formatCurrencyTRY(off.proposedAmount)}</span>
                </div>
                {['pending', 'countered'].includes(off.status) && (
                  <div className="flex gap-2">
                    {waitingForMe && (
                      <button type="button" onClick={() => runAction(() => acceptOffer(off.id), 'Topluluk teklifi kabul edildi.')} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold cursor-pointer">
                        Teklifi Kabul Et
                      </button>
                    )}
                    <button type="button" onClick={() => runAction(() => rejectOffer(off.id), 'Teklif reddedildi.')} className="px-3 py-1.5 rounded-lg text-rose-700 font-semibold cursor-pointer">
                      Reddet
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!ensemble.isVerified && !verifSubmitted && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!verifDocUrl.trim()) return;
                const res = await runAction(() => submitVerificationRequest('ensemble', ensemble.name, verifDocUrl), 'Topluluk doğrulama başvurusu gönderildi.');
                if (res.success) setVerifSubmitted(true);
              }}
              className="pt-3 border-t border-[#e2e8f0] dark:border-[#1e335a] space-y-2"
            >
              <label htmlFor="ens-verif-url" className="block text-xs font-bold">Topluluk Portfolyo / Referans Belgesi (URL)</label>
              <div className="flex gap-2">
                <input
                  id="ens-verif-url"
                  required
                  value={verifDocUrl}
                  onChange={(e) => setVerifDocUrl(e.target.value)}
                  placeholder="https://example.com/topluluk-referans.pdf"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-xs"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer">
                  Doğrula
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Edit Ensemble Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-lg w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Topluluk Bilgilerini Düzenle</h3>
              <button type="button" onClick={() => setEditingProfile(false)} aria-label="Kapat" className="cursor-pointer">
                <X className="w-5 h-5 text-[#64748b]" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label htmlFor="ens-edit-name" className="font-semibold block mb-1">Topluluk Adı</label>
                <input
                  id="ens-edit-name"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ens-edit-type" className="font-semibold block mb-1">Kadro Türü</label>
                  <select
                    id="ens-edit-type"
                    value={profileForm.ensembleType}
                    onChange={(e) => setProfileForm((p) => ({ ...p, ensembleType: e.target.value as EnsembleType }))}
                    className="w-full p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                  >
                    <option value="Duo">Duo</option>
                    <option value="Trio">Trio</option>
                    <option value="Quartet">Quartet</option>
                    <option value="Quintet">Quintet</option>
                    <option value="Chamber Ensemble">Chamber Ensemble</option>
                    <option value="Orkestra">Orkestra</option>
                    <option value="Koro">Koro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ens-edit-city" className="font-semibold block mb-1">Şehir</label>
                  <input
                    id="ens-edit-city"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="ens-edit-year" className="font-semibold block mb-1">Kuruluş Yılı</label>
                  <input
                    id="ens-edit-year"
                    type="number"
                    value={profileForm.foundedYear}
                    onChange={(e) => setProfileForm((p) => ({ ...p, foundedYear: Number(e.target.value) }))}
                    className="w-full p-2.5 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ens-edit-bio" className="font-semibold block mb-1">Biyografi</label>
                <textarea
                  id="ens-edit-bio"
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="ens-edit-web" className="font-semibold block mb-1">Web Sitesi</label>
                <input
                  id="ens-edit-web"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 font-semibold cursor-pointer">Vazgeç</button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-[#f25922] rounded-xl cursor-pointer">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Topluluk Kadrosuna Üye Davet Et / Ekle</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label htmlFor="mem-name" className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Ad Soyad</label>
                <input
                  id="mem-name"
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Sanatçının adı ve soyadı"
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="mem-email" className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Kayıtlı Kullanıcı E-postası (Opsiyonel — Davet Gönderir)</label>
                <input
                  id="mem-email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="sanatci@ornek.com"
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="mem-inst" className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Enstrüman</label>
                <select
                  id="mem-inst"
                  value={newMemberInstrument}
                  onChange={(e) => setNewMemberInstrument(e.target.value as any)}
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white"
                >
                  <option value="Keman">Keman</option>
                  <option value="Viyola">Viyola</option>
                  <option value="Viyolonsel (Çello)">Viyolonsel (Çello)</option>
                  <option value="Kontrbas">Kontrbas</option>
                  <option value="Flüt">Flüt</option>
                  <option value="Klarnet">Klarnet</option>
                  <option value="Piyano">Piyano</option>
                </select>
              </div>
              <div>
                <label htmlFor="mem-role" className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Rol / Başlık</label>
                <input
                  id="mem-role"
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="Örn: 2. Keman veya Konuk Sanatçı"
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold cursor-pointer">
                  Vazgeç
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl cursor-pointer">
                  Davet Gönder / Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
