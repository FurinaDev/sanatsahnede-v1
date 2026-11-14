import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { formatCurrencyTRY } from '../utils/businessLogic';
import { ArtDiscipline, BusinessType } from '../types';
import {
  Building2,
  Plus,
  Users,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const CultureDeskView: React.FC = () => {
  const {
    organizations,
    organizationMembers,
    culturalPrograms,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
  } = useApp();

  const canManageOrg = (orgId: string) => {
    if (!isAuthenticated) return false;
    if (currentUser.activeRole === 'admin') return true;
    const org = organizations.find((o) => o.id === orgId);
    if (org?.ownerUserId === currentUser.id) return true;
    return organizationMembers.some(
      (m) =>
        m.organizationId === orgId &&
        m.status === 'active' &&
        (m.userId === currentUser.id || (m.email && m.email.toLowerCase() === currentUser.email.toLowerCase()))
    );
  };

  const managedOrganizations = organizations.filter((o) => canManageOrg(o.id));

  const [orgForm, setOrgForm] = useState({
    name: '',
    orgType: 'Özel Şirket / Kurumsal' as BusinessType,
    city: 'İstanbul',
    taxNumber: '',
  });
  const [memberForm, setMemberForm] = useState({
    organizationId: '',
    userName: '',
    email: '',
    roleTitle: 'Kültür Programı Yetkilisi',
  });
  const [progForm, setProgForm] = useState({
    organizationId: '',
    title: '',
    year: 2027,
    serviceMode: 'self_service' as 'self_service' | 'managed_service',
    totalBudget: 250000,
  });
  const [eventForms, setEventForms] = useState<Record<string, { month: string; title: string; venueName: string; budget: number; discipline: ArtDiscipline }>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setFeedback(null);
    try {
      await apiRequest('/api/culture-desk/organizations', { method: 'POST', body: orgForm });
      await refreshBootstrap();
      setOrgForm({ name: '', orgType: 'Özel Şirket / Kurumsal', city: 'İstanbul', taxNumber: '' });
      setFeedback({ type: 'success', text: 'Kurum / şube yapısı oluşturuldu.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Kurum oluşturulamadı.' });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = memberForm.organizationId || managedOrganizations[0]?.id;
    if (!orgId) {
      setFeedback({ type: 'error', text: 'Yetkili olduğunuz bir kurum seçin veya yeni bir kurum oluşturun.' });
      return;
    }
    setFeedback(null);
    try {
      await apiRequest(`/api/culture-desk/organizations/${orgId}/members`, {
        method: 'POST',
        body: {
          userName: memberForm.userName,
          email: memberForm.email,
          roleTitle: memberForm.roleTitle,
          permissions: ['manage_listings', 'manage_budget'],
        },
      });
      await refreshBootstrap();
      setMemberForm((p) => ({ ...p, userName: '', email: '' }));
      setFeedback({ type: 'success', text: 'Kurum yetkilisi eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Yetkili eklenemedi.' });
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = progForm.organizationId || managedOrganizations[0]?.id;
    if (!orgId) {
      setFeedback({ type: 'error', text: 'Program açmak için yetkili olduğunuz bir kurum seçin veya oluşturun.' });
      return;
    }
    setFeedback(null);
    try {
      await apiRequest('/api/culture-desk/programs', {
        method: 'POST',
        body: { ...progForm, organizationId: orgId },
      });
      await refreshBootstrap();
      setProgForm((p) => ({ ...p, title: '' }));
      setFeedback({ type: 'success', text: 'Yıllık kültür programı oluşturuldu.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Program oluşturulamadı.' });
    }
  };

  const handleSwitchServiceMode = async (programId: string, nextMode: 'self_service' | 'managed_service') => {
    setFeedback(null);
    try {
      await apiRequest(`/api/culture-desk/programs/${programId}/service-mode`, {
        method: 'PATCH',
        body: { serviceMode: nextMode },
      });
      await refreshBootstrap();
      setFeedback({
        type: 'success',
        text:
          nextMode === 'managed_service'
            ? 'Profesyonel Yönetim (Managed Service) moduna geçildi ve denetim kaydı oluşturuldu.'
            : 'Kendi Kendine Yönetim (Self-Service) moduna geçildi.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Yönetim modu değiştirilemedi.' });
    }
  };

  const handleAddPlannedEvent = async (programId: string) => {
    const draft = eventForms[programId] || {
      month: 'Nisan 2027',
      title: '',
      venueName: 'Ana Salon',
      budget: 25000,
      discipline: 'Müzik' as ArtDiscipline,
    };
    if (!draft.title.trim()) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/culture-desk/programs/${programId}/events`, {
        method: 'POST',
        body: draft,
      });
      await refreshBootstrap();
      setEventForms((prev) => ({
        ...prev,
        [programId]: { ...draft, title: '' },
      }));
      setFeedback({ type: 'success', text: 'Yıllık programa yeni etkinlik eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Etkinlik eklenemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.11 · Kurumsal Kültür Masası</span>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
          Çok Şubeli Kurumlar, Yetkili Ekip & Yıllık Kültür Programı
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Belediyeler, vakıflar, üniversiteler ve şirketler için çok kullanıcılı yönetim. Kurumunuz programı ister <strong>Self-Service</strong> kendi yönetir, ister tek tıkla <strong>Profesyonel Yönetim (Managed Service)</strong> desteğine devreder.
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

      {!isAuthenticated ? (
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Kurum yapısı oluşturmak, yetkili atamak ve yıllık kültür programı planlamak için oturum açın.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            className="px-5 py-2.5 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
          >
            Giriş Yap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Create Org */}
          <form onSubmit={handleCreateOrg} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
            <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#E45424]" />
              <span>Yeni Kurum / Şube Ekle</span>
            </h2>
            <input required aria-label="Kurum Adı" value={orgForm.name} onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))} placeholder="Kurum Adı" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <input required aria-label="Şehir" value={orgForm.city} onChange={(e) => setOrgForm((p) => ({ ...p, city: e.target.value }))} placeholder="Şehir" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
            <button type="submit" className="w-full py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer">
              Kurum Oluştur
            </button>
          </form>

          {/* Add Member */}
          <form onSubmit={handleAddMember} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
            <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#E45424]" />
              <span>Kurum Yetkilisi Davet Et</span>
            </h2>
            {managedOrganizations.length === 0 ? (
              <p className="text-xs text-slate-500">Yetkili davet etmek için önce kendi kurum/şube yapınızı oluşturun.</p>
            ) : (
              <>
                <select
                  aria-label="Hedef Kurum"
                  value={memberForm.organizationId || managedOrganizations[0]?.id || ''}
                  onChange={(e) => setMemberForm((p) => ({ ...p, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                >
                  {managedOrganizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <input required aria-label="Yetkili Adı" value={memberForm.userName} onChange={(e) => setMemberForm((p) => ({ ...p, userName: e.target.value }))} placeholder="Ad Soyad" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                <input required type="email" aria-label="Yetkili E-posta" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} placeholder="yetkili@kurum.com" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                <button type="submit" className="w-full py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer">
                  Yetkili Ekle
                </button>
              </>
            )}
          </form>

          {/* Create Program */}
          <form onSubmit={handleCreateProgram} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
            <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#E45424]" />
              <span>Yıllık Kültür Programı Aç</span>
            </h2>
            {managedOrganizations.length === 0 ? (
              <p className="text-xs text-slate-500">Yıllık kültür programı başlatmak için yönettiğiniz bir kurum bulunmalıdır.</p>
            ) : (
              <>
                <select
                  aria-label="Program Kurumu"
                  value={progForm.organizationId || managedOrganizations[0]?.id || ''}
                  onChange={(e) => setProgForm((p) => ({ ...p, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                >
                  {managedOrganizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <input required aria-label="Program Adı" value={progForm.title} onChange={(e) => setProgForm((p) => ({ ...p, title: e.target.value }))} placeholder="2027 Kültür Sanat Sezonu" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                <select
                  aria-label="Yönetim Modeli"
                  value={progForm.serviceMode}
                  onChange={(e) => setProgForm((p) => ({ ...p, serviceMode: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                >
                  <option value="self_service">Self-Service (Kendi Yönetimim)</option>
                  <option value="managed_service">Profesyonel Yönetim (Managed Service)</option>
                </select>
                <button type="submit" className="w-full py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">
                  Programı Başlat
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {/* Organizations & Members Overview */}
      {organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => {
            const members = organizationMembers.filter((m) => m.organizationId === org.id);
            return (
              <div key={org.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{org.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-500">{org.city} · {org.orgType}</span>
                </div>
                <div className="text-xs text-slate-500">Yetkili Ekip ({members.length}): {members.map((m) => `${m.userName} (${m.roleTitle})`).join(', ') || 'Henüz atanmadı'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Annual Cultural Programs */}
      <div className="space-y-5">
        <h2 className="font-display text-xl font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#E45424]" />
          <span>Yıllık Kültür Programları ({culturalPrograms.length})</span>
        </h2>

        {culturalPrograms.map((prog) => {
          const evDraft = eventForms[prog.id] || {
            month: 'Mayıs 2027',
            title: '',
            venueName: 'Ana Salon',
            budget: 25000,
            discipline: 'Müzik' as ArtDiscipline,
          };

          return (
            <div key={prog.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#E45424]">{prog.organizationName} · {prog.year}</div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{prog.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Toplam Sezon Bütçesi: <strong>{formatCurrencyTRY(prog.totalBudget)}</strong>
                    {prog.assignedCoordinatorName && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                        · Atanan Koordinatör: {prog.assignedCoordinatorName}
                      </span>
                    )}
                  </div>
                </div>

                {canManageOrg(prog.organizationId) && (
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleSwitchServiceMode(prog.id, 'self_service')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        prog.serviceMode === 'self_service' ? 'bg-[#16274e] text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Self-Service
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchServiceMode(prog.id, 'managed_service')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        prog.serviceMode === 'managed_service' ? 'bg-[#E45424] text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Profesyonel Yönetim
                    </button>
                  </div>
                )}
              </div>

              {prog.serviceMode === 'managed_service' && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Bu program <strong>SanatSahnede Managed Service</strong> kapsamındadır; kürasyon, teknik eşleşme, sözleşme ve ödeme takibi koordinatör desteğiyle yürütülür.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {prog.events.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#E45424]">{ev.month}</span>
                      <span className="font-bold">{formatCurrencyTRY(ev.budget)}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">{ev.title}</div>
                    <div className="text-[11px] text-slate-500">{ev.venueName} · {ev.discipline}</div>
                  </div>
                ))}
              </div>

              {canManageOrg(prog.organizationId) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <input
                    aria-label={`Ay (${prog.title})`}
                    value={evDraft.month}
                    onChange={(e) => setEventForms((p) => ({ ...p, [prog.id]: { ...evDraft, month: e.target.value } }))}
                    className="w-32 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                  <input
                    aria-label={`Etkinlik Başlığı (${prog.title})`}
                    value={evDraft.title}
                    onChange={(e) => setEventForms((p) => ({ ...p, [prog.id]: { ...evDraft, title: e.target.value } }))}
                    placeholder="Programa yeni etkinlik ekle..."
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPlannedEvent(prog.id)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Etkinlik Ekle</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
