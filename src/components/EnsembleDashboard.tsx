import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Instrument } from '../types';
import {
  UserPlus,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Layers,
  Info,
} from 'lucide-react';
import { formatCurrencyTRY } from '../utils/businessLogic';

export const EnsembleDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    addRoleWorkspace,
    ensembles,
    bookings,
    addEnsembleMember,
    removeEnsembleMember,
    acceptContract,
    completePerformerService,
    navigateTo,
  } = useApp();

  const ensemble = isAuthenticated
    ? ensembles.find((e) => e.leaderUserId === currentUser.id)
    : undefined;

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberInstrument, setNewMemberInstrument] = useState<Instrument>('Keman');
  const [newMemberRole, setNewMemberRole] = useState('Enstrüman İcracısı');
  const [showAddModal, setShowAddModal] = useState(false);

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

  if (!ensemble) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
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
    );
  }

  const ensembleBookings = bookings.filter((b) => b.performerId === ensemble.id);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const res = await addEnsembleMember(ensemble.id, {
      name: newMemberName,
      instrument: newMemberInstrument,
      roleTitle: newMemberRole,
    });
    if (res.success) {
      setNewMemberName('');
      setShowAddModal(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeEnsembleMember(ensemble.id, memberId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6">
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#16274e] dark:text-blue-400" />
        <div>
          <strong>Topluluk Hukuki Statüsü &amp; Hakediş Sorumluluğu:</strong> Sanat toplulukları platform içinde ortak çalışma ve kadro grubu olarak tanımlanır (ayrı tüzel kişilik değildir). Hakediş tahsilatı ve fatura sorumluluğu topluluk lideri/yetkili temsilci hesabı üzerinden yürütülür.
        </div>
      </div>

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

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#16274e] hover:bg-[#111d38] dark:bg-[#f25922] dark:hover:bg-[#d94b18] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#f25922] dark:text-white" />
            <span>Yeni Üye Ekle</span>
          </button>
        </div>
      </div>

      {/* Grid: Members Roster & Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#1e335a]">
            <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Kadro ve Üye Yönetimi</h2>
            <span className="text-xs text-[#64748b] dark:text-slate-400 tabular-nums">{ensemble.members.length} Aktif Sanatçı</span>
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
                    <div className="text-xs font-bold text-[#0f172a] dark:text-white truncate">{m.name}</div>
                    <div className="text-[11px] text-[#f25922] font-medium truncate">
                      {m.instrument} · {m.roleTitle}
                    </div>
                  </div>
                </div>

                {ensemble.members.length > 1 && (
                  <button
                    type="button"
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
                        onClick={() => acceptContract(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#f25922] text-white font-bold cursor-pointer"
                      >
                        Sözleşmeyi Onayla
                      </button>
                    )}
                    {(b.status === 'confirmed' || b.status === 'employer_completed') && !b.performerCompletedAt && (
                      <button
                        type="button"
                        onClick={() => completePerformerService(b.id)}
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Topluluk Kadrosuna Üye Ekle</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Sanatçının adı ve soyadı"
                  className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Enstrüman</label>
                <select
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
                <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 block mb-1">Rol / Başlık</label>
                <input
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
                  Üyeyi Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
