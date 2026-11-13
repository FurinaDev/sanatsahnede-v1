import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { formatCurrencyTRY } from '../utils/businessLogic';
import { VenueAccessibility } from '../types';
import {
  CalendarDays,
  MapPin,
  Accessibility,
  ShieldCheck,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

const ACCESSIBILITY_LABELS: Array<{ key: keyof Omit<VenueAccessibility, 'accessibleTransitInfo' | 'verifiedBy' | 'verifiedAt'>; label: string }> = [
  { key: 'wheelchairAccess', label: 'Tekerlekli Sandalye Erişimi' },
  { key: 'stepFreeEntrance', label: 'Basamaksız Giriş' },
  { key: 'accessibleRestroom', label: 'Erişilebilir Tuvalet' },
  { key: 'elevatorOrRamp', label: 'Asansör / Rampa' },
  { key: 'signLanguageInterpretation', label: 'İşaret Dili Tercümanı' },
  { key: 'liveCaptions', label: 'Canlı Altyazı / Üst yazı' },
  { key: 'audioDescription', label: 'Sesli Betimleme' },
  { key: 'brailleProgram', label: 'Braille Program' },
  { key: 'hearingLoop', label: 'İşitme Döngüsü' },
  { key: 'companionSupport', label: 'Refakatçi Desteği' },
  { key: 'accessibleSeating', label: 'Erişilebilir Oturma Alanı' },
  { key: 'sensoryFriendly', label: 'Duyusal Hassasiyet Uyumu' },
];

const SLOT_KIND_LABELS: Record<string, { label: string; badgeClass: string }> = {
  open_stage: { label: 'Açık Sahne', badgeClass: 'bg-orange-100 text-[#E45424] dark:bg-orange-500/20 dark:text-orange-300' },
  free_rehearsal: { label: 'Ücretsiz Prova', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  available: { label: 'Kiralanabilir / Müsait', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  booked: { label: 'Rezerve Edildi', badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  blocked: { label: 'Kapalı', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
};

export const OpenStageNetworkView: React.FC = () => {
  const {
    venues,
    availabilitySlots,
    artists,
    ensembles,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
    navigateTo,
    startConversation,
  } = useApp();

  const [cityFilter, setCityFilter] = useState('Tümü');
  const [slotKindFilter, setSlotKindFilter] = useState<'all' | 'open_stage' | 'free_rehearsal' | 'available'>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ownedOwners = useMemo(() => {
    if (!isAuthenticated) return [];
    const list: Array<{ ownerType: 'venue' | 'artist' | 'ensemble'; ownerId: string; label: string; city: string }> = [];
    venues
      .filter((v) => v.managerUserId === currentUser.id || currentUser.activeRole === 'admin')
      .forEach((v) => list.push({ ownerType: 'venue', ownerId: v.id, label: `Mekân: ${v.name}`, city: v.city }));
    artists
      .filter((a) => a.userId === currentUser.id)
      .forEach((a) => list.push({ ownerType: 'artist', ownerId: a.id, label: `Sanatçı: ${a.fullName}`, city: a.city }));
    ensembles
      .filter((e) => e.leaderUserId === currentUser.id)
      .forEach((e) => list.push({ ownerType: 'ensemble', ownerId: e.id, label: `Topluluk: ${e.name}`, city: e.city }));
    return list;
  }, [isAuthenticated, venues, artists, ensembles, currentUser.id, currentUser.activeRole]);

  const [slotForm, setSlotForm] = useState({
    ownerKey: '',
    title: '',
    slotDate: '2027-01-15',
    startTime: '14:00',
    endTime: '17:00',
    slotKind: 'open_stage' as 'open_stage' | 'free_rehearsal' | 'available',
    recurrence: 'once' as 'once' | 'weekly' | 'monthly',
    isFree: true,
    feeAmount: 0,
    notes: '',
  });

  const cities = useMemo(() => {
    const set = new Set<string>(['Tümü']);
    venues.forEach((v) => set.add(v.city));
    availabilitySlots.forEach((s) => set.add(s.city));
    return Array.from(set);
  }, [venues, availabilitySlots]);

  const filteredSlots = useMemo(() => {
    return availabilitySlots.filter((slot) => {
      if (cityFilter !== 'Tümü' && slot.city !== cityFilter) return false;
      if (slotKindFilter !== 'all' && slot.slotKind !== slotKindFilter) return false;
      if (accessibleOnly && slot.ownerType === 'venue') {
        const v = venues.find((item) => item.id === slot.ownerId);
        if (!v || (!v.accessibility.wheelchairAccess && !v.accessibility.stepFreeEntrance)) return false;
      }
      return true;
    });
  }, [availabilitySlots, cityFilter, slotKindFilter, accessibleOnly, venues]);

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      if (cityFilter !== 'Tümü' && v.city !== cityFilter) return false;
      if (accessibleOnly && !v.accessibility.wheelchairAccess && !v.accessibility.stepFreeEntrance) return false;
      return true;
    });
  }, [venues, cityFilter, accessibleOnly]);

  const isStaff = ['admin', 'verification_officer', 'moderator'].includes(currentUser.activeRole);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const chosenOwner = ownedOwners.find((o) => `${o.ownerType}:${o.ownerId}` === slotForm.ownerKey) || ownedOwners[0];
    if (!chosenOwner) {
      setStatusMessage({ type: 'error', text: 'Önce sanatçı, topluluk veya mekân profiliniz bulunmalıdır.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/availability', {
        method: 'POST',
        body: {
          ownerType: chosenOwner.ownerType,
          ownerId: chosenOwner.ownerId,
          ownerName: chosenOwner.label.replace(/^[^:]+:\s*/, ''),
          title: slotForm.title.trim(),
          slotDate: slotForm.slotDate,
          startTime: slotForm.startTime,
          endTime: slotForm.endTime,
          recurrence: slotForm.recurrence,
          slotKind: slotForm.slotKind,
          isFree: slotForm.isFree,
          feeAmount: slotForm.isFree ? 0 : Number(slotForm.feeAmount || 0),
          city: chosenOwner.city,
          notes: slotForm.notes.trim(),
        },
      });
      await refreshBootstrap();
      setSlotForm((p) => ({ ...p, title: '', notes: '' }));
      setShowSlotForm(false);
      setStatusMessage({ type: 'success', text: 'Sahne / prova takvim slotu başarıyla yayınlandı.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Slot eklenemedi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    setStatusMessage(null);
    try {
      await apiRequest(`/api/availability/${id}`, { method: 'DELETE' });
      await refreshBootstrap();
      setStatusMessage({ type: 'success', text: 'Takvim kaydı silindi.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Silme işlemi başarısız.' });
    }
  };

  const handleVerifyAccessibility = async (venueId: string) => {
    setStatusMessage(null);
    try {
      await apiRequest(`/api/venues/${venueId}/accessibility/verify`, { method: 'POST' });
      await refreshBootstrap();
      setStatusMessage({ type: 'success', text: 'Mekân erişilebilirlik beyanı resmen doğrulandı.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Doğrulama başarısız.' });
    }
  };

  const handleContactVenue = async (venue: (typeof venues)[number]) => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    await startConversation({
      contextType: 'venue',
      contextId: venue.id,
      title: `Sahne & Prova Talebi: ${venue.name}`,
      participantUserIds: [venue.managerUserId],
      initialMessage: `Merhaba, ${venue.name} sahnenizin açık takvimi ve prova imkânları hakkında bilgi almak istiyorum.`,
    });
    navigateTo('messages');
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">
            9.2 & 9.8 · Açık Sahne Ağı & Erişilebilirlik
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Sahne Takvimi, Ücretsiz Prova & Açık Sahne Ağı
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Atıl kalan kültür mekânlarını ve sahne boşluklarını genç sanatçılarla buluşturun. Zaman çakışması korumalı takvim ve doğrulanmış erişilebilirlik verileriyle güvenli rezervasyon yapın.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setShowSlotForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Takvim Slotu Ekle</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalMode('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16274e] hover:bg-[#1E2B4F] text-white text-xs font-bold cursor-pointer"
            >
              <span>Slot Eklemek İçin Giriş Yapın</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigateTo('venue_dashboard')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#E45424] cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#E45424]" />
            <span>Mekân Yönetim Paneli</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {showSlotForm && isAuthenticated && (
        <form
          onSubmit={handleCreateSlot}
          className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">Yeni Sahne / Müsaitlik Slotu Yayınla</h2>
            <span className="text-[11px] text-slate-500">Çakışan saatler otomatik olarak 409 uyarısı ile engellenir</span>
          </div>
          {ownedOwners.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Slot yayınlamak için Mekân Paneli&apos;nden bir mekân oluşturun veya Sanatçı/Topluluk hesabınıza geçin.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="slot-owner" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Profil / Mekân
                  </label>
                  <select
                    id="slot-owner"
                    value={slotForm.ownerKey || `${ownedOwners[0].ownerType}:${ownedOwners[0].ownerId}`}
                    onChange={(e) => setSlotForm((p) => ({ ...p, ownerKey: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  >
                    {ownedOwners.map((o) => (
                      <option key={`${o.ownerType}:${o.ownerId}`} value={`${o.ownerType}:${o.ownerId}`}>
                        {o.label} ({o.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="slot-title" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Slot Başlığı
                  </label>
                  <input
                    id="slot-title"
                    required
                    value={slotForm.title}
                    onChange={(e) => setSlotForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Örn: Genç Oda Müziği Açık Sahne"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="slot-kind" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Slot Türü
                  </label>
                  <select
                    id="slot-kind"
                    value={slotForm.slotKind}
                    onChange={(e) => setSlotForm((p) => ({ ...p, slotKind: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  >
                    <option value="open_stage">Açık Sahne</option>
                    <option value="free_rehearsal">Ücretsiz Prova Saati</option>
                    <option value="available">Kiralanabilir / Müsait</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="slot-date" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tarih
                  </label>
                  <input
                    id="slot-date"
                    type="date"
                    required
                    value={slotForm.slotDate}
                    onChange={(e) => setSlotForm((p) => ({ ...p, slotDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="slot-start" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Başlangıç Saati
                  </label>
                  <input
                    id="slot-start"
                    type="time"
                    required
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="slot-end" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Bitiş Saati
                  </label>
                  <input
                    id="slot-end"
                    type="time"
                    required
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slotForm.isFree}
                      onChange={(e) => setSlotForm((p) => ({ ...p, isFree: e.target.checked }))}
                      className="rounded border-slate-300 text-[#E45424]"
                    />
                    <span>Ücretsiz Destek Slotu</span>
                  </label>
                </div>
                {!slotForm.isFree && (
                  <div>
                    <label htmlFor="slot-fee" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Ücret (TRY)
                    </label>
                    <input
                      id="slot-fee"
                      type="number"
                      min={0}
                      value={slotForm.feeAmount}
                      onChange={(e) => setSlotForm((p) => ({ ...p, feeAmount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                    />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="slot-notes" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Teknik Not / Koşullar
                </label>
                <input
                  id="slot-notes"
                  value={slotForm.notes}
                  onChange={(e) => setSlotForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Örn: Akustik piyano ve 2 adet mikrofon dahildir."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSlotForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Kaydediliyor...' : 'Slotu Yayınla'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="openstage-city" className="sr-only">Şehir Filtresi</label>
          <select
            id="openstage-city"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-semibold"
          >
            {cities.map((c) => (
              <option key={c} value={c}>{c === 'Tümü' ? 'Tüm Şehirler' : c}</option>
            ))}
          </select>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B1120]">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'open_stage', label: 'Açık Sahne' },
              { id: 'free_rehearsal', label: 'Ücretsiz Prova' },
              { id: 'available', label: 'Müsait' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSlotKindFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  slotKindFilter === t.id
                    ? 'bg-[#E45424] text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-bold text-[#16274e] dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={accessibleOnly}
            onChange={(e) => setAccessibleOnly(e.target.checked)}
            className="rounded border-slate-300 text-[#E45424]"
          />
          <Accessibility className="w-4 h-4 text-[#E45424]" />
          <span>Yalnızca Fiziksel Erişilebilirliği Uygun Mekânlar</span>
        </label>
      </div>

      {/* Availability Slots Grid */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#E45424]" />
          <span>Açık Sahne & Müsaitlik Slotları ({filteredSlots.length})</span>
        </h2>

        {filteredSlots.length === 0 ? (
          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-8 text-center text-sm text-slate-500">
            Seçili kriterlere uygun takvim slotu bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot) => {
              const kindMeta = SLOT_KIND_LABELS[slot.slotKind] || SLOT_KIND_LABELS.available;
              const venue = slot.ownerType === 'venue' ? venues.find((v) => v.id === slot.ownerId) : null;
              const canDelete =
                isAuthenticated &&
                (currentUser.activeRole === 'admin' ||
                  (venue && venue.managerUserId === currentUser.id) ||
                  artists.some((a) => a.id === slot.ownerId && a.userId === currentUser.id) ||
                  ensembles.some((e) => e.id === slot.ownerId && e.leaderUserId === currentUser.id));

              return (
                <article
                  key={slot.id}
                  className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${kindMeta.badgeClass}`}>
                        {kindMeta.label}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {slot.isFree ? 'Ücretsiz' : formatCurrencyTRY(slot.feeAmount)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{slot.title}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{slot.ownerName || 'Kültür Mekânı'}</div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E45424]" />
                        <span>{slot.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#E45424]" />
                        <span>{slot.slotDate} · {slot.startTime} - {slot.endTime}</span>
                      </div>
                    </div>
                    {slot.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1120] p-2.5 rounded-xl">
                        {slot.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                    {venue ? (
                      <button
                        type="button"
                        onClick={() => handleContactVenue(venue)}
                        className="text-xs font-bold text-[#E45424] hover:underline cursor-pointer"
                      >
                        Mekânla İletişime Geç
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">{slot.recurrence === 'weekly' ? 'Haftalık' : 'Tekil'}</span>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        aria-label={`Slotu sil: ${slot.title}`}
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Venues & Accessibility Directory */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#16274e] dark:text-white flex items-center gap-2">
          <Accessibility className="w-5 h-5 text-[#E45424]" />
          <span>Erişilebilir Sahne & Kültür Mekânları ({filteredVenues.length})</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredVenues.map((venue) => {
            const activeFeatures = ACCESSIBILITY_LABELS.filter((item) => venue.accessibility[item.key]);
            return (
              <div
                key={venue.id}
                className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{venue.name}</h3>
                      {venue.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Doğrulanmış Mekân
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {venue.city}, {venue.district} · {venue.address}
                    </p>
                  </div>
                  {venue.accessibility.verifiedAt ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                      Erişilebilirlik Onaylı
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold shrink-0">
                      Mekân Beyanı
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{venue.description}</p>

                {venue.spaces.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {venue.spaces.map((sp) => (
                      <div key={sp.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{sp.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Oturma: {sp.seatedCapacity} · Ayakta: {sp.standingCapacity} · Sahne: {sp.stageDimensions || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Erişilebilirlik Özellikleri</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeFeatures.length === 0 ? (
                      <span className="text-xs text-slate-400">Henüz erişilebilirlik özelliği işaretlenmemiş.</span>
                    ) : (
                      activeFeatures.map((f) => (
                        <span
                          key={f.key}
                          className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-[#16274e] dark:text-blue-200"
                        >
                          {f.label}
                        </span>
                      ))
                    )}
                  </div>
                  {venue.accessibility.accessibleTransitInfo && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>Ulaşım:</strong> {venue.accessibility.accessibleTransitInfo}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleContactVenue(venue)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16274e] hover:bg-[#1E2B4F] text-white text-xs font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Prova / Sahne Talep Et</span>
                  </button>

                  {isStaff && !venue.accessibility.verifiedAt && (
                    <button
                      type="button"
                      onClick={() => handleVerifyAccessibility(venue.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Erişilebilirliği Doğrula</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
