import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { VenueAccessibility } from '../types';
import { Building2, Plus, Accessibility, CalendarDays, CheckCircle2, AlertCircle, Trash2, Pencil } from 'lucide-react';

const ACCESS_FIELDS: Array<{ key: keyof Omit<VenueAccessibility, 'accessibleTransitInfo' | 'verifiedBy' | 'verifiedAt'>; label: string }> = [
  { key: 'wheelchairAccess', label: 'Tekerlekli Sandalye Erişimi' },
  { key: 'stepFreeEntrance', label: 'Basamaksız Giriş' },
  { key: 'accessibleRestroom', label: 'Erişilebilir Tuvalet' },
  { key: 'elevatorOrRamp', label: 'Asansör / Rampa' },
  { key: 'signLanguageInterpretation', label: 'İşaret Dili Tercümanı' },
  { key: 'liveCaptions', label: 'Canlı Altyazı' },
  { key: 'audioDescription', label: 'Sesli Betimleme' },
  { key: 'brailleProgram', label: 'Braille Program' },
  { key: 'hearingLoop', label: 'İşitme Döngüsü' },
  { key: 'companionSupport', label: 'Refakatçi Desteği' },
  { key: 'accessibleSeating', label: 'Erişilebilir Oturma Alanı' },
  { key: 'sensoryFriendly', label: 'Duyusal Hassasiyet Uyumu' },
];

export const VenueDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    venues,
    availabilitySlots,
    refreshBootstrap,
    navigateTo,
  } = useApp();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [venueForm, setVenueForm] = useState({
    name: '',
    city: 'İstanbul',
    district: 'Beyoğlu',
    address: '',
    description: '',
    contactPhone: '',
    spaceName: 'Ana Salon',
    seatedCapacity: 150,
    standingCapacity: 300,
    stageDimensions: '8m x 5m',
    technicalEquipmentText: 'Kuyruklu Piyano, Temel PA Ses Sistemi, Sahne Işığı',
  });

  const [slotForm, setSlotForm] = useState({
    venueId: '',
    title: '',
    slotDate: '2027-01-20',
    startTime: '10:00',
    endTime: '13:00',
    slotKind: 'open_stage' as 'open_stage' | 'free_rehearsal' | 'available',
    isFree: true,
    feeAmount: 0,
    notes: '',
  });
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [venueEditForm, setVenueEditForm] = useState({
    name: '',
    city: '',
    district: '',
    address: '',
    description: '',
    contactPhone: '',
  });
  const [spaceForms, setSpaceForms] = useState<Record<string, { name: string; seatedCapacity: number; standingCapacity: number; stageDimensions: string }>>({});

  const myVenues = useMemo(
    () => venues.filter((v) => v.managerUserId === currentUser.id || currentUser.activeRole === 'admin'),
    [venues, currentUser.id, currentUser.activeRole]
  );

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <Building2 className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Mekân Yönetim Paneli</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sahne ve mekân envanterinizi, erişilebilirlik beyanınızı ve açık sahne takviminizi yönetmek için giriş yapın.
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

  const hasVenueRole = currentUser.roles.includes('venue_manager') || currentUser.activeRole === 'admin';

  const handleEnableWorkspace = async () => {
    const res = await addRoleWorkspace('venue_manager', { organizationName: `${currentUser.firstName} Kültür Mekânı` });
    if (!res.success) {
      setFeedback({ type: 'error', text: res.error || 'Çalışma alanı açılamadı.' });
    } else {
      setFeedback({ type: 'success', text: 'Mekân Yöneticisi çalışma alanı aktif edildi.' });
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/venues', {
        method: 'POST',
        body: {
          name: venueForm.name,
          city: venueForm.city,
          district: venueForm.district,
          address: venueForm.address,
          description: venueForm.description,
          contactPhone: venueForm.contactPhone || currentUser.phone,
          contactEmail: currentUser.email,
          spaces: [
            {
              name: venueForm.spaceName,
              seatedCapacity: Number(venueForm.seatedCapacity),
              standingCapacity: Number(venueForm.standingCapacity),
              stageDimensions: venueForm.stageDimensions,
              technicalEquipment: venueForm.technicalEquipmentText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            },
          ],
        },
      });
      await refreshBootstrap();
      setVenueForm((p) => ({ ...p, name: '', address: '', description: '' }));
      setFeedback({ type: 'success', text: 'Yeni mekân ve salon profili oluşturuldu.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Mekân oluşturulamadı.' });
    }
  };

  const handleToggleAccessibility = async (venueId: string, key: keyof Omit<VenueAccessibility, 'accessibleTransitInfo' | 'verifiedBy' | 'verifiedAt'>, currentVal: boolean) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/venues/${venueId}/accessibility`, {
        method: 'PUT',
        body: { [key]: !currentVal },
      });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Erişilebilirlik özelliği güncellendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erişilebilirlik güncellenemedi.' });
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const targetVenue = myVenues.find((v) => v.id === slotForm.venueId) || myVenues[0];
    if (!targetVenue) {
      setFeedback({ type: 'error', text: 'Önce bir mekân oluşturunuz.' });
      return;
    }

    try {
      await apiRequest('/api/availability', {
        method: 'POST',
        body: {
          ownerType: 'venue',
          ownerId: targetVenue.id,
          ownerName: targetVenue.name,
          title: slotForm.title,
          slotDate: slotForm.slotDate,
          startTime: slotForm.startTime,
          endTime: slotForm.endTime,
          slotKind: slotForm.slotKind,
          isFree: slotForm.isFree,
          feeAmount: slotForm.isFree ? 0 : Number(slotForm.feeAmount),
          city: targetVenue.city,
          notes: slotForm.notes,
        },
      });
      await refreshBootstrap();
      setSlotForm((p) => ({ ...p, title: '', notes: '' }));
      setFeedback({ type: 'success', text: 'Mekân takvim slotu eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Takvim slotu eklenemedi.' });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await apiRequest(`/api/availability/${slotId}`, { method: 'DELETE' });
      await refreshBootstrap();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Silinemedi.' });
    }
  };

  const handleStartEditVenue = (venue: typeof myVenues[number]) => {
    setEditingVenueId(venue.id);
    setVenueEditForm({
      name: venue.name,
      city: venue.city,
      district: venue.district || '',
      address: venue.address || '',
      description: venue.description || '',
      contactPhone: venue.contactPhone || '',
    });
  };

  const handleSaveVenueEdit = async (e: React.FormEvent, venueId: string) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest(`/api/venues/${venueId}`, { method: 'PATCH', body: venueEditForm });
      await refreshBootstrap();
      setEditingVenueId(null);
      setFeedback({ type: 'success', text: 'Mekân bilgileri güncellendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Mekân güncellenemedi.' });
    }
  };

  const handleAddSpace = async (venueId: string) => {
    const draft = spaceForms[venueId] || { name: '', seatedCapacity: 100, standingCapacity: 200, stageDimensions: '6m x 4m' };
    if (!draft.name.trim()) {
      setFeedback({ type: 'error', text: 'Salon adı zorunludur.' });
      return;
    }
    setFeedback(null);
    try {
      await apiRequest(`/api/venues/${venueId}/spaces`, { method: 'POST', body: draft });
      await refreshBootstrap();
      setSpaceForms((p) => ({ ...p, [venueId]: { name: '', seatedCapacity: 100, standingCapacity: 200, stageDimensions: '6m x 4m' } }));
      setFeedback({ type: 'success', text: 'Yeni salon mekâna eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Salon eklenemedi.' });
    }
  };

  const handleDeleteSpace = async (venueId: string, spaceId: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/venues/${venueId}/spaces/${spaceId}`, { method: 'DELETE' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Salon kaydı silindi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Salon silinemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">Mekân Yöneticisi Çalışma Alanı</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Mekânlar, Salonlar & Erişilebilirlik Yönetimi
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigateTo('open_stage')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:border-[#E45424]"
          >
            Açık Sahne Ağında Görüntüle
          </button>
          {!hasVenueRole && (
            <button
              type="button"
              onClick={handleEnableWorkspace}
              className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
            >
              Mekân Yöneticisi Rolünü Aç
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Venue Form */}
        <form onSubmit={handleCreateVenue} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#E45424]" />
            <span>Yeni Kültür Mekânı & Salon Ekle</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="venue-name" className="block text-[11px] font-bold mb-1">Mekân Adı</label>
              <input
                id="venue-name"
                required
                value={venueForm.name}
                onChange={(e) => setVenueForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Örn: Kadıköy Oda Sahnesi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="venue-city" className="block text-[11px] font-bold mb-1">Şehir</label>
              <input
                id="venue-city"
                required
                value={venueForm.city}
                onChange={(e) => setVenueForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="venue-district" className="block text-[11px] font-bold mb-1">İlçe</label>
              <input
                id="venue-district"
                value={venueForm.district}
                onChange={(e) => setVenueForm((p) => ({ ...p, district: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="venue-space" className="block text-[11px] font-bold mb-1">İlk Salon Adı</label>
              <input
                id="venue-space"
                value={venueForm.spaceName}
                onChange={(e) => setVenueForm((p) => ({ ...p, spaceName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="venue-seated" className="block text-[11px] font-bold mb-1">Oturma Kapasitesi</label>
              <input
                id="venue-seated"
                type="number"
                value={venueForm.seatedCapacity}
                onChange={(e) => setVenueForm((p) => ({ ...p, seatedCapacity: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="venue-stage" className="block text-[11px] font-bold mb-1">Sahne Ölçüsü</label>
              <input
                id="venue-stage"
                value={venueForm.stageDimensions}
                onChange={(e) => setVenueForm((p) => ({ ...p, stageDimensions: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
          </div>
          <div>
            <label htmlFor="venue-address" className="block text-[11px] font-bold mb-1">Açık Adres</label>
            <input
              id="venue-address"
              value={venueForm.address}
              onChange={(e) => setVenueForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="venue-desc" className="block text-[11px] font-bold mb-1">Mekân Akustiği & Tanıtım</label>
            <textarea
              id="venue-desc"
              rows={2}
              value={venueForm.description}
              onChange={(e) => setVenueForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
          >
            Mekânı Kaydet
          </button>
        </form>

        {/* Add Slot Form */}
        <form onSubmit={handleAddSlot} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
          <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#E45424]" />
            <span>Mekân Açık Sahne / Prova Slotu Tanımla</span>
          </h2>
          {myVenues.length === 0 ? (
            <p className="text-xs text-slate-500">Takvim tanımlamak için soldaki formdan ilk mekânınızı oluşturun.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vs-venue" className="block text-[11px] font-bold mb-1">Mekân</label>
                  <select
                    id="vs-venue"
                    value={slotForm.venueId || myVenues[0].id}
                    onChange={(e) => setSlotForm((p) => ({ ...p, venueId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  >
                    {myVenues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vs-kind" className="block text-[11px] font-bold mb-1">Slot Türü</label>
                  <select
                    id="vs-kind"
                    value={slotForm.slotKind}
                    onChange={(e) => setSlotForm((p) => ({ ...p, slotKind: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  >
                    <option value="open_stage">Açık Sahne</option>
                    <option value="free_rehearsal">Ücretsiz Prova</option>
                    <option value="available">Kiralanabilir</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="vs-title" className="block text-[11px] font-bold mb-1">Slot Başlığı</label>
                  <input
                    id="vs-title"
                    required
                    value={slotForm.title}
                    onChange={(e) => setSlotForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Örn: Genç Topluluklar İçin Sabah Provası"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="vs-date" className="block text-[11px] font-bold mb-1">Tarih</label>
                  <input
                    id="vs-date"
                    type="date"
                    required
                    value={slotForm.slotDate}
                    onChange={(e) => setSlotForm((p) => ({ ...p, slotDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="vs-start" className="block text-[11px] font-bold mb-1">Başlangıç</label>
                    <input
                      id="vs-start"
                      type="time"
                      required
                      value={slotForm.startTime}
                      onChange={(e) => setSlotForm((p) => ({ ...p, startTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="vs-end" className="block text-[11px] font-bold mb-1">Bitiş</label>
                    <input
                      id="vs-end"
                      type="time"
                      required
                      value={slotForm.endTime}
                      onChange={(e) => setSlotForm((p) => ({ ...p, endTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                    />
                  </div>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={slotForm.isFree}
                  onChange={(e) => setSlotForm((p) => ({ ...p, isFree: e.target.checked }))}
                />
                <span>Ücretsiz Genç Sanatçı / Topluluk Desteği</span>
              </label>
              <div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#16274e] hover:bg-[#1E2B4F] text-white text-xs font-bold cursor-pointer"
                >
                  Takvime Ekle
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Managed Venues List + Accessibility Toggles */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#16274e] dark:text-white">
          Yönettiğiniz Mekânlar & Erişilebilirlik Kontrol Listesi ({myVenues.length})
        </h2>
        {myVenues.map((venue) => {
          const venueSlots = availabilitySlots.filter((s) => s.ownerType === 'venue' && s.ownerId === venue.id);
          const spaceDraft = spaceForms[venue.id] || { name: '', seatedCapacity: 100, standingCapacity: 200, stageDimensions: '6m x 4m' };
          return (
            <div key={venue.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{venue.name}</h3>
                  <p className="text-xs text-slate-500">{venue.city}, {venue.district}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (editingVenueId === venue.id ? setEditingVenueId(null) : handleStartEditVenue(venue))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-[#E45424] cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#E45424]" />
                    <span>{editingVenueId === venue.id ? 'Düzenlemeyi Kapat' : 'Mekânı Düzenle'}</span>
                  </button>
                  <span className="text-xs font-semibold text-[#E45424]">
                    {venue.accessibility.verifiedAt ? `Doğrulandı: ${venue.accessibility.verifiedBy}` : 'Doğrulama Uzmanı Onayı Bekliyor'}
                  </span>
                </div>
              </div>

              {editingVenueId === venue.id && (
                <form onSubmit={(e) => handleSaveVenueEdit(e, venue.id)} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      required
                      aria-label="Mekân Adı Düzenle"
                      value={venueEditForm.name}
                      onChange={(e) => setVenueEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Mekân Adı"
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs"
                    />
                    <input
                      required
                      aria-label="Şehir Düzenle"
                      value={venueEditForm.city}
                      onChange={(e) => setVenueEditForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Şehir"
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs"
                    />
                    <input
                      aria-label="İlçe Düzenle"
                      value={venueEditForm.district}
                      onChange={(e) => setVenueEditForm((p) => ({ ...p, district: e.target.value }))}
                      placeholder="İlçe"
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs"
                    />
                  </div>
                  <input
                    aria-label="Adres Düzenle"
                    value={venueEditForm.address}
                    onChange={(e) => setVenueEditForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Açık Adres"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs"
                  />
                  <textarea
                    rows={2}
                    aria-label="Tanıtım Düzenle"
                    value={venueEditForm.description}
                    onChange={(e) => setVenueEditForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Mekân akustiği ve sahne detayları..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13213e] text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingVenueId(null)} className="px-3 py-1.5 text-xs font-semibold cursor-pointer">İptal</button>
                    <button type="submit" className="px-4 py-1.5 rounded-lg bg-[#E45424] text-white text-xs font-bold cursor-pointer">Değişiklikleri Kaydet</button>
                  </div>
                </form>
              )}

              {/* Venue Spaces Management */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Salonlar &amp; Sahneler ({venue.spaces.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {venue.spaces.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <div className="font-bold">{sp.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Oturma: {sp.seatedCapacity} · Ayakta: {sp.standingCapacity} {sp.stageDimensions ? `· ${sp.stageDimensions}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Salonu sil: ${sp.name}`}
                        onClick={() => handleDeleteSpace(venue.id, sp.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    aria-label={`Yeni salon adı (${venue.name})`}
                    value={spaceDraft.name}
                    onChange={(e) => setSpaceForms((p) => ({ ...p, [venue.id]: { ...spaceDraft, name: e.target.value } }))}
                    placeholder="Yeni salon adı"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                  <input
                    aria-label={`Oturma kapasitesi (${venue.name})`}
                    type="number"
                    value={spaceDraft.seatedCapacity}
                    onChange={(e) => setSpaceForms((p) => ({ ...p, [venue.id]: { ...spaceDraft, seatedCapacity: Number(e.target.value) } }))}
                    placeholder="Oturma"
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                  <input
                    aria-label={`Sahne ölçüsü (${venue.name})`}
                    value={spaceDraft.stageDimensions}
                    onChange={(e) => setSpaceForms((p) => ({ ...p, [venue.id]: { ...spaceDraft, stageDimensions: e.target.value } }))}
                    placeholder="6m x 4m"
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSpace(venue.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16274e] text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salon Ekle</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                  <Accessibility className="w-4 h-4 text-[#E45424]" />
                  <span>Erişilebilirlik Beyanı (Tıklayarak Güncelleyin)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ACCESS_FIELDS.map((field) => {
                    const checked = Boolean(venue.accessibility[field.key]);
                    return (
                      <label
                        key={field.key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold'
                            : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleAccessibility(venue.id, field.key, checked)}
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {venueSlots.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Kayıtlı Takvim Slotları ({venueSlots.length})</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {venueSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <div className="font-bold">{slot.title}</div>
                          <div className="text-[11px] text-slate-500">{slot.slotDate} · {slot.startTime}-{slot.endTime}</div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Slotu sil: ${slot.title}`}
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
