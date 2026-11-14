import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, AppView } from '../context/AppContext';
import { BrandSymbol } from './ui/BrandSymbol';
import { RoleType } from '../types';
import {
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  LogIn,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Megaphone,
  Bell,
  MessageSquare,
  Compass,
  Sparkles,
  CalendarDays,
  Layers,
  Wrench,
  Radar,
  Award,
  Building2,
  Briefcase,
} from 'lucide-react';

const ROLE_LABELS: Record<RoleType, string> = {
  artist: 'Bireysel Sanatçı',
  ensemble_leader: 'Topluluk Lideri',
  business_owner: 'İşletme / Kurum',
  business_member: 'Kurum Yetkilisi',
  venue_manager: 'Mekân Yöneticisi',
  technical_provider: 'Teknik Sağlayıcı',
  organizer: 'Organizatör',
  audience: 'Sanatsever',
  moderator: 'Moderatör',
  finance_admin: 'Finans Yöneticisi',
  verification_officer: 'Doğrulama Uzmanı',
  support: 'Destek Uzmanı',
  admin: 'Platform Yöneticisi',
};

export const Navbar: React.FC = () => {
  const {
    activeView,
    navigateTo,
    activeRole,
    switchRole,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    logout,
    artists,
    ensembles,
    businesses,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    isFlagEnabled,
  } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [ecoMenuOpen, setEcoMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const ecoMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('ss_theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (ecoMenuRef.current && !ecoMenuRef.current.contains(e.target as Node)) setEcoMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setEcoMenuOpen(false);
        setNotifOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ss_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ss_theme', 'light');
    }
  }, [isDark]);

  const getDashboardView = (role: RoleType = activeRole): AppView => {
    switch (role) {
      case 'business_owner':
      case 'business_member':
        return 'business_dashboard';
      case 'artist':
        return 'artist_dashboard';
      case 'ensemble_leader':
        return 'ensemble_dashboard';
      case 'venue_manager':
        return 'venue_dashboard';
      case 'technical_provider':
        return 'technical_dashboard';
      case 'organizer':
        return 'organizer_dashboard';
      case 'audience':
        return 'audience_dashboard';
      case 'admin':
      case 'moderator':
      case 'finance_admin':
      case 'verification_officer':
      case 'support':
        return 'admin_panel';
      default:
        return 'audience_dashboard';
    }
  };

  const navigateToOwnProfile = () => {
    if (!isAuthenticated || !currentUser) {
      setAuthModalMode('login');
      return;
    }
    const myArtist = artists.find((a) => a.userId === currentUser.id);
    if (activeRole === 'artist' && myArtist) {
      navigateTo('artist_profile', myArtist.id);
      return;
    }
    const myEnsemble = ensembles.find((e) => e.leaderUserId === currentUser.id);
    if (activeRole === 'ensemble_leader' && myEnsemble) {
      navigateTo('ensemble_profile', myEnsemble.id);
      return;
    }
    const myBiz = businesses.find((b) => b.userId === currentUser.id);
    if ((activeRole === 'business_owner' || activeRole === 'organizer') && myBiz) {
      navigateTo('business_profile', myBiz.id);
      return;
    }
    if (myArtist) {
      navigateTo('artist_profile', myArtist.id);
    } else if (myEnsemble) {
      navigateTo('ensemble_profile', myEnsemble.id);
    } else if (myBiz) {
      navigateTo('business_profile', myBiz.id);
    } else {
      navigateTo(getDashboardView());
    }
  };

  const navLinks = [
    { label: 'İlanlar', view: 'listings' as const, match: ['listings', 'listing_detail'] },
    { label: 'Sanatçılar', view: 'artists_directory' as const, match: ['artists_directory', 'artist_profile', 'profile_edit'] },
    { label: 'Topluluklar', view: 'ensembles_directory' as const, match: ['ensembles_directory', 'ensemble_profile'] },
    { label: 'İşletmeler', view: 'businesses_directory' as const, match: ['businesses_directory', 'business_profile'] },
    { label: 'Etkinlikler', view: 'events' as const, match: ['events', 'event_detail'] },
  ];

  const rawEcosystemLinks: Array<{ label: string; desc: string; view: AppView; icon: any; flag?: string }> = [
    { label: 'Sahne Takvimi & Açık Sahne', desc: 'Mekân müsaitlikleri ve ücretsiz prova slotları', view: 'open_stage', icon: CalendarDays, flag: 'open_stage_network' },
    { label: 'Proje Lab & Ortak Üretim', desc: 'Disiplinlerarası ekip ve proje çağrıları', view: 'project_lab', icon: Layers, flag: 'project_lab' },
    { label: 'Teknik Eşleşme', desc: 'Ses, ışık, rider ve envanter teklifleri', view: 'technical_match', icon: Wrench, flag: 'technical_match' },
    { label: 'Fırsat Radarı', desc: 'Hibeler, burslar, residency ve yarışmalar', view: 'opportunity_radar', icon: Radar, flag: 'opportunity_radar' },
    { label: 'SanatSahnede Originals', desc: 'İlk Sahne, Birleşik ve özel kürasyonlar', view: 'originals', icon: Sparkles, flag: 'originals_programs' },
    { label: 'Kurumsal Kültür Masası', desc: 'Çok şubeli kurumlar için yıllık sanat programı', view: 'culture_desk', icon: Building2, flag: 'culture_desk' },
    { label: 'Sanatçı Stüdyosu & EPK', desc: 'Çoklu kimlik portfolyo ve QR paylaşımı', view: 'artist_studio', icon: Briefcase, flag: 'artist_studio' },
    { label: 'Kariyer Pasaportu', desc: 'Doğrulanmış sahne ve performans sicili', view: 'career_passport', icon: Award, flag: 'career_passport' },
  ];
  const ecosystemLinks = rawEcosystemLinks.filter((item) => !item.flag || isFlagEnabled(item.flag));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handlePostListingClick = async () => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    if (currentUser?.roles.includes('business_owner')) {
      await switchRole('business_owner');
      navigateTo('business_dashboard');
    } else if (currentUser?.roles.includes('organizer')) {
      await switchRole('organizer');
      navigateTo('organizer_dashboard');
    } else {
      navigateTo(getDashboardView());
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#0f1c38] border-b border-slate-200 dark:border-[#1e335a] transition-colors">
      <div className="max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 lg:gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-4">
        {/* Brand Lockup */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="xl:justify-self-start flex items-center gap-1.5 sm:gap-2 group text-left shrink-0 focus:outline-hidden cursor-pointer"
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-9 bg-[#E45424] rounded-xl flex items-center justify-center shadow-sm overflow-hidden transition-transform duration-200 group-hover:scale-105 shrink-0 px-1.5">
            <BrandSymbol className="w-full h-full text-white" strokeWidth={3.6} />
          </div>
          <div className="flex items-center shrink-0">
            <span className="font-sans font-extrabold text-[13px] sm:text-sm 2xl:text-lg tracking-tight text-slate-900 dark:text-white leading-none whitespace-nowrap">
              SANAT<span className="text-[#E45424]">SAHNEDE</span>.COM
            </span>
          </div>
        </button>

        {/* Primary Desktop Navigation */}
        <nav className="hidden xl:flex xl:justify-self-center items-center gap-0.5 xl:gap-1 2xl:gap-2 font-medium text-[13px] 2xl:text-[13.5px] text-slate-600 dark:text-slate-300 shrink-0">
          {navLinks.map((item) => {
            const isActive = item.match.includes(activeView as any);
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => navigateTo(item.view)}
                className={`relative py-2 px-1.5 xl:px-2 2xl:px-2.5 rounded-lg whitespace-nowrap shrink-0 flex items-center leading-none transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#f25922] font-semibold'
                    : 'hover:text-[#16274e] dark:hover:text-white font-medium'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 inset-x-1.5 xl:inset-x-2 2xl:inset-x-2.5 h-0.5 rounded-full bg-[#f25922]"
                  />
                )}
              </button>
            );
          })}

          {/* Ecosystem Dropdown */}
          <div ref={ecoMenuRef} className="relative">
            {(() => {
              const isEcoActive = ['open_stage', 'project_lab', 'project_workspace', 'technical_match', 'opportunity_radar', 'originals', 'culture_desk', 'artist_studio', 'career_passport'].includes(activeView);
              return (
                <button
                  type="button"
                  onClick={() => setEcoMenuOpen((p) => !p)}
                  className={`relative py-2 px-1.5 xl:px-2 2xl:px-2.5 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 leading-none transition-colors cursor-pointer ${
                    isEcoActive
                      ? 'text-[#f25922] font-semibold'
                      : 'hover:text-[#16274e] dark:hover:text-white font-medium'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#E45424]" />
                  <span>Ekosistem</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ecoMenuOpen ? 'rotate-180' : ''}`} />
                  {isEcoActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 inset-x-1.5 xl:inset-x-2 2xl:inset-x-2.5 h-0.5 rounded-full bg-[#f25922]"
                    />
                  )}
                </button>
              );
            })()}

            <AnimatePresence>
              {ecoMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute left-0 mt-2 w-80 bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 text-left grid grid-cols-1 gap-0.5"
                >
                  {ecosystemLinks.map((eco) => {
                    const Icon = eco.icon;
                    return (
                      <button
                        type="button"
                        key={eco.view}
                        onClick={() => {
                          navigateTo(eco.view);
                          setEcoMenuOpen(false);
                        }}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-left transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{eco.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{eco.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('contact')}
            className={`relative py-2 px-1.5 xl:px-2 2xl:px-2.5 rounded-lg whitespace-nowrap shrink-0 flex items-center leading-none transition-colors cursor-pointer ${
              activeView === 'contact' ? 'text-[#f25922] font-semibold' : 'hover:text-[#16274e] dark:hover:text-white font-medium'
            }`}
          >
            <span>İletişim</span>
            {activeView === 'contact' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 inset-x-1.5 xl:inset-x-2 2xl:inset-x-2.5 h-0.5 rounded-full bg-[#f25922]"
              />
            )}
          </button>
        </nav>

        {/* Right Utility & Action Zone */}
        <div className="xl:justify-self-end flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            aria-label="Tema Değiştir"
            onClick={() => setIsDark((prev) => !prev)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated && currentUser ? (
            <>
              {/* Messages quick icon */}
              <button
                type="button"
                aria-label="Mesajlar"
                onClick={() => navigateTo('messages')}
                className="hidden sm:inline-flex p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* Notifications Bell */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  aria-label="Bildirimler"
                  onClick={() => setNotifOpen((p) => !p)}
                  className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E45424] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-left space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Bildirimler</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllNotificationsRead()}
                          className="text-[11px] font-semibold text-[#E45424] hover:underline cursor-pointer"
                        >
                          Tümünü Okundu İşaretle
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">Henüz bildiriminiz yok.</div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            type="button"
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.linkView) navigateTo(n.linkView as AppView, n.linkEntityId);
                              setNotifOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                              n.isRead
                                ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-500'
                                : 'bg-orange-50/70 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-slate-900 dark:text-white'
                            }`}
                          >
                            <div className="font-bold">{n.title}</div>
                            <div className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{n.body}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 md:pr-2 xl:pr-1 2xl:pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.firstName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div className="hidden md:flex xl:hidden 2xl:flex flex-col text-left leading-tight max-w-[92px] 2xl:max-w-[116px]">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{currentUser.firstName}</span>
                    <span className="text-[10px] text-[#E45424] font-semibold truncate">{ROLE_LABELS[activeRole]}</span>
                  </div>
                  <ChevronDown
                    className={`hidden sm:inline w-3 h-3 text-slate-400 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180 text-[#f25922]' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#111A2E] rounded-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-left shadow-xl"
                    >
                      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {currentUser.firstName} {currentUser.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                      </div>

                      {currentUser.roles.length > 1 && (
                        <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Çalışma Alanı Değiştir</div>
                          <div className="flex flex-wrap gap-1">
                            {currentUser.roles.map((r) => (
                              <button
                                type="button"
                                key={r}
                                onClick={async () => {
                                  await switchRole(r);
                                  navigateTo(getDashboardView(r));
                                  setUserMenuOpen(false);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                  activeRole === r
                                    ? 'bg-[#E45424] text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {ROLE_LABELS[r]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          navigateToOwnProfile();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[#E45424]" />
                        <span>Profilim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigateTo(getDashboardView());
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1E2B4F] dark:text-blue-400" />
                        <span>Yönetim Panelim</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('messages');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#E45424]" />
                        <span>Mesaj Merkezi</span>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Çıkış Yap</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalMode('login')}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#E45424] dark:hover:text-[#E45424] px-3 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Giriş Yap</span>
            </button>
          )}

          {/* Primary Orange CTA */}
          <button
            type="button"
            onClick={handlePostListingClick}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-semibold px-2.5 2xl:px-3.5 py-2 rounded-xl shadow-md shadow-[#E45424]/20 transition-[background-color,transform] duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Sahne İlanı Ver</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-slate-700 dark:text-slate-200 hover:text-[#E45424] focus:outline-hidden rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer"
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="xl:hidden overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-left max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navLinks.map((item) => {
                const isActive = item.match.includes(activeView as any);
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => {
                      navigateTo(item.view);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-between ${
                      isActive
                        ? 'bg-[#E45424] text-white font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  navigateTo('contact');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-between ${
                  activeView === 'contact'
                    ? 'bg-[#E45424] text-white font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>İletişim</span>
              </button>

              <div className="pt-2 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ekosistem Modülleri
              </div>
              {ecosystemLinks.map((eco) => (
                <button
                  type="button"
                  key={eco.view}
                  onClick={() => {
                    navigateTo(eco.view);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {eco.label}
                </button>
              ))}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handlePostListingClick();
                    setMobileMenuOpen(false);
                  }}
                  className="sm:hidden w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-[#E45424] flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Sahne İlanı Ver</span>
                </button>
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo(getDashboardView());
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#E45424]" />
                      <span>Yönetim Panelim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateToOwnProfile();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-[#E45424]" />
                      <span>Profilim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('messages');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-[#E45424]" />
                      <span>Mesaj Merkezi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('login');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-center text-xs font-semibold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-xl"
                    >
                      Giriş Yap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('register');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#1E2B4F] rounded-xl"
                    >
                      Üye Ol
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
