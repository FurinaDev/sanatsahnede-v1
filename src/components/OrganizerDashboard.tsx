import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Sparkles, Layers, Wrench, Building2, ArrowRight } from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    listings,
    events,
    culturalPrograms,
    technicalRequests,
    navigateTo,
    addRoleWorkspace,
  } = useApp();

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <Calendar className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Organizatör & Festival Paneli</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Festival programlarınızı, çok sahneli kadrolarınızı ve teknik prodüksiyon süreçlerinizi yönetmek için giriş yapın.
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

  const hasOrganizerRole = currentUser.roles.includes('organizer') || currentUser.activeRole === 'admin';

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">Organizatör & Küratör Masası</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Festival, Program & Çoklu Sahne Koordinasyonu
          </h1>
        </div>
        {!hasOrganizerRole && (
          <button
            type="button"
            onClick={() => addRoleWorkspace('organizer', { organizationName: `${currentUser.firstName} Organizasyon` })}
            className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
          >
            Organizatör Çalışma Alanını Aktif Et
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5">
          <div className="text-xs text-slate-500">Aktif İlanlar</div>
          <div className="font-display text-2xl font-extrabold text-[#16274e] dark:text-white mt-1">{listings.length}</div>
        </div>
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5">
          <div className="text-xs text-slate-500">Yayınlı Etkinlikler</div>
          <div className="font-display text-2xl font-extrabold text-[#E45424] mt-1">{events.length}</div>
        </div>
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5">
          <div className="text-xs text-slate-500">Yıllık Kültür Programı</div>
          <div className="font-display text-2xl font-extrabold text-[#16274e] dark:text-white mt-1">{culturalPrograms.length}</div>
        </div>
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5">
          <div className="text-xs text-slate-500">Teknik Talepler</div>
          <div className="font-display text-2xl font-extrabold text-[#E45424] mt-1">{technicalRequests.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          type="button"
          onClick={() => navigateTo('culture_desk')}
          className="text-left bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] hover:border-[#E45424] p-6 space-y-2 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-6 h-6 text-[#E45424]" />
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="font-bold text-base text-slate-900 dark:text-white">Kurumsal Kültür Masası & Yıllık Program</h2>
          <p className="text-xs text-slate-500">Self-Service veya Profesyonel Yönetim modunda yıllık festival ve kültür sezonları planlayın.</p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('technical_match')}
          className="text-left bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] hover:border-[#E45424] p-6 space-y-2 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Wrench className="w-6 h-6 text-[#E45424]" />
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="font-bold text-base text-slate-900 dark:text-white">Teknik Ekipman & Ses/Işık Eşleşmesi</h2>
          <p className="text-xs text-slate-500">Festival sahnelerinizin teknik rider taleplerini açın ve sağlayıcı tekliflerini toplayın.</p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('project_lab')}
          className="text-left bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] hover:border-[#E45424] p-6 space-y-2 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Layers className="w-6 h-6 text-[#E45424]" />
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="font-bold text-base text-slate-900 dark:text-white">Ortak Üretim & Kürasyon Projeleri</h2>
          <p className="text-xs text-slate-500">Yeni festival komisyonları için disiplinlerarası ekip kurun ve çalışma alanı yönetin.</p>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('business_dashboard')}
          className="text-left bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] hover:border-[#E45424] p-6 space-y-2 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <Sparkles className="w-6 h-6 text-[#E45424]" />
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="font-bold text-base text-slate-900 dark:text-white">Sahne İlanları & Sanatçı Sözleşmeleri</h2>
          <p className="text-xs text-slate-500">Doğrudan sanatçı ilanı yayınlayın, teklif pazarlığı yapın ve güvenli ödeme ile sözleşme bağlayın.</p>
        </button>
      </div>
    </div>
  );
};
