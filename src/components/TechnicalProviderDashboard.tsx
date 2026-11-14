import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { formatCurrencyTRY } from '../utils/businessLogic';
import { Wrench, Plus, Trash2, CheckCircle2, AlertCircle, Package, Pencil } from 'lucide-react';

export const TechnicalProviderDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    technicalProviders,
    technicalRequests,
    refreshBootstrap,
    navigateTo,
  } = useApp();

  const [eqForm, setEqForm] = useState({
    category: 'Ses Sistemi',
    name: '',
    brandModel: '',
    quantity: 1,
    dailyRate: 5000,
    mode: 'rental' as 'rental' | 'service' | 'sale',
  });
  const [pkgForm, setPkgForm] = useState({
    title: '',
    description: '',
    priceAmount: 18000,
    includedItemsText: 'Dijital Mikser, 2x Aktif Hoparlör, 4x Sahne Monitörü, Ses Teknisyeni',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    city: '',
    serviceAreasText: '',
    staffCapacity: 4,
    description: '',
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <Wrench className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Teknik Sağlayıcı Paneli</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Ses, ışık ve sahne envanterinizi yönetmek için giriş yapın.</p>
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

  const myProvider = technicalProviders.find((p) => p.userId === currentUser.id);

  const handleActivateProvider = async () => {
    const res = await addRoleWorkspace('technical_provider', {
      organizationName: `${currentUser.firstName} Teknik Ses & Işık`,
      city: 'İstanbul',
    });
    if (res.success) {
      setFeedback({ type: 'success', text: 'Teknik hizmet sağlayıcı çalışma alanınız oluşturuldu.' });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Çalışma alanı oluşturulamadı.' });
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/technical-providers/equipment', {
        method: 'POST',
        body: eqForm,
      });
      await refreshBootstrap();
      setEqForm((p) => ({ ...p, name: '', brandModel: '' }));
      setFeedback({ type: 'success', text: 'Ekipman envantere eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Ekipman eklenemedi.' });
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await apiRequest(`/api/technical-providers/equipment/${id}`, { method: 'DELETE' });
      await refreshBootstrap();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Silinemedi.' });
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/technical-providers/packages', {
        method: 'POST',
        body: {
          title: pkgForm.title,
          description: pkgForm.description,
          priceAmount: Number(pkgForm.priceAmount),
          includedItems: pkgForm.includedItemsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      await refreshBootstrap();
      setPkgForm((p) => ({ ...p, title: '', description: '' }));
      setFeedback({ type: 'success', text: 'Hizmet paketi eklendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Paket eklenemedi.' });
    }
  };

  const handleDeletePackage = async (id: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/technical-providers/packages/${id}`, { method: 'DELETE' });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: 'Hizmet paketi kaldırıldı.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Paket silinemedi.' });
    }
  };

  const handleOpenEditProfile = () => {
    if (!myProvider) return;
    setProfileForm({
      name: myProvider.name,
      city: myProvider.city,
      serviceAreasText: myProvider.serviceAreas.join(', '),
      staffCapacity: myProvider.staffCapacity || 4,
      description: myProvider.description || '',
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiRequest('/api/technical-providers/me', {
        method: 'PATCH',
        body: {
          name: profileForm.name,
          city: profileForm.city,
          serviceAreas: profileForm.serviceAreasText.split(',').map((s) => s.trim()).filter(Boolean),
          staffCapacity: Number(profileForm.staffCapacity),
          description: profileForm.description,
        },
      });
      await refreshBootstrap();
      setEditingProfile(false);
      setFeedback({ type: 'success', text: 'Teknik sağlayıcı profiliniz güncellendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Profil güncellenemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">Teknik Sağlayıcı Çalışma Alanı</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            {myProvider ? myProvider.name : 'Ses, Işık & Teknik Ekipman Yönetimi'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {myProvider && (
            <button
              type="button"
              onClick={() => (editingProfile ? setEditingProfile(false) : handleOpenEditProfile())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:border-[#E45424]"
            >
              <Pencil className="w-3.5 h-3.5 text-[#E45424]" />
              <span>{editingProfile ? 'Düzenlemeyi Kapat' : 'Firma Profilini Düzenle'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigateTo('technical_match')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:border-[#E45424]"
          >
            Açık Taleplere Teklif Ver ({technicalRequests.length})
          </button>
          {!myProvider && (
            <button
              type="button"
              onClick={handleActivateProvider}
              className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
            >
              Teknik Sağlayıcı Profilini Aktif Et
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

      {myProvider ? (
        <>
          {editingProfile && (
            <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <h2 className="font-bold text-base text-[#16274e] dark:text-white">Teknik Sağlayıcı Firma Profili</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="tp-name" className="block text-[11px] font-bold mb-1">Firma / Ekip Adı</label>
                  <input id="tp-name" required value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                </div>
                <div>
                  <label htmlFor="tp-city" className="block text-[11px] font-bold mb-1">Merkez Şehir</label>
                  <input id="tp-city" required value={profileForm.city} onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                </div>
                <div>
                  <label htmlFor="tp-areas" className="block text-[11px] font-bold mb-1">Hizmet İlleri (Virgülle)</label>
                  <input id="tp-areas" value={profileForm.serviceAreasText} onChange={(e) => setProfileForm((p) => ({ ...p, serviceAreasText: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                </div>
                <div>
                  <label htmlFor="tp-staff" className="block text-[11px] font-bold mb-1">Teknik Ekip Kapasitesi</label>
                  <input id="tp-staff" type="number" min="1" value={profileForm.staffCapacity} onChange={(e) => setProfileForm((p) => ({ ...p, staffCapacity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
                </div>
              </div>
              <div>
                <label htmlFor="tp-desc" className="block text-[11px] font-bold mb-1">Uzmanlık &amp; Açıklama</label>
                <textarea id="tp-desc" rows={2} value={profileForm.description} onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 text-xs font-semibold cursor-pointer">İptal</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">Profili Kaydet</button>
              </div>
            </form>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleAddEquipment} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#E45424]" />
                <span>Envantere Ekipman Ekle</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="eq-cat" className="block text-[11px] font-bold mb-1">Kategori</label>
                  <select
                    id="eq-cat"
                    value={eqForm.category}
                    onChange={(e) => setEqForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  >
                    <option value="Ses Sistemi">Ses Sistemi</option>
                    <option value="Mikrofon & DI">Mikrofon & DI</option>
                    <option value="Işık & Sahne">Işık & Sahne</option>
                    <option value="Backline">Backline / Enstrüman</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="eq-name" className="block text-[11px] font-bold mb-1">Ekipman Adı</label>
                  <input
                    id="eq-name"
                    required
                    value={eqForm.name}
                    onChange={(e) => setEqForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Örn: Dijital Mikser"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="eq-brand" className="block text-[11px] font-bold mb-1">Marka / Model</label>
                  <input
                    id="eq-brand"
                    value={eqForm.brandModel}
                    onChange={(e) => setEqForm((p) => ({ ...p, brandModel: e.target.value }))}
                    placeholder="Örn: Allen & Heath SQ-6"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="eq-rate" className="block text-[11px] font-bold mb-1">Günlük Ücret (TRY)</label>
                  <input
                    id="eq-rate"
                    type="number"
                    value={eqForm.dailyRate}
                    onChange={(e) => setEqForm((p) => ({ ...p, dailyRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
              >
                Ekipman Ekle
              </button>
            </form>

            <form onSubmit={handleAddPackage} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
              <h2 className="font-bold text-base text-[#16274e] dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#E45424]" />
                <span>Hazır Sahne Hizmet Paketi Ekle</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pkg-title" className="block text-[11px] font-bold mb-1">Paket Başlığı</label>
                  <input
                    id="pkg-title"
                    required
                    value={pkgForm.title}
                    onChange={(e) => setPkgForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Örn: Oda Müziği Akustik Paket"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-price" className="block text-[11px] font-bold mb-1">Paket Fiyatı (TRY)</label>
                  <input
                    id="pkg-price"
                    type="number"
                    required
                    value={pkgForm.priceAmount}
                    onChange={(e) => setPkgForm((p) => ({ ...p, priceAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pkg-items" className="block text-[11px] font-bold mb-1">Dahil Kalemler (Virgülle)</label>
                <input
                  id="pkg-items"
                  value={pkgForm.includedItemsText}
                  onChange={(e) => setPkgForm((p) => ({ ...p, includedItemsText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#16274e] hover:bg-[#1E2B4F] text-white text-xs font-bold cursor-pointer"
              >
                Paketi Yayınla
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">Kayıtlı Envanterim ({myProvider.equipment.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myProvider.equipment.map((eq) => (
                <div key={eq.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {eq.category} · {eq.brandModel} · {formatCurrencyTRY(eq.dailyRate)}/gün
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Ekipmanı sil: ${eq.name}`}
                    onClick={() => handleDeleteEquipment(eq.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">Hazır Sahne Hizmet Paketlerim ({myProvider.packages.length})</h2>
            {myProvider.packages.length === 0 ? (
              <p className="text-xs text-slate-500">Henüz hazır hizmet paketi yayınlanmadı.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myProvider.packages.map((pkg) => (
                  <div key={pkg.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{pkg.title}</div>
                      <div className="text-[11px] text-slate-500">{pkg.includedItems.join(' · ')}</div>
                      <div className="text-[11px] font-bold text-[#E45424] mt-0.5">{formatCurrencyTRY(pkg.priceAmount)}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Paketi sil: ${pkg.title}`}
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Henüz teknik hizmet sağlayıcı profiliniz yok. Tek tıkla oluşturarak ekipman ve paketlerinizi listelemeye başlayın.
          </p>
          <button
            type="button"
            onClick={handleActivateProvider}
            className="px-5 py-2.5 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
          >
            Teknik Sağlayıcı Profili Oluştur
          </button>
        </div>
      )}
    </div>
  );
};
