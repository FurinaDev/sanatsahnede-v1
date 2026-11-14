import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useAdaptivePageSize } from '../hooks/useAdaptivePageSize';
import { ArtDiscipline, EventAnnouncement, EventCategory, MusicGenre } from '../types';
import { ART_DISCIPLINES, CITY_LIST, MUSIC_GENRES, resolveDiscipline } from '../utils/disciplineConfig';
import { ArchitecturalPageHeader } from './ui/ArchitecturalPageHeader';
import { CustomSelect } from './ui/CustomSelect';
import { PaginationBar } from './ui/PaginationBar';
import {
  Calendar,
  MapPin,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  Download,
  CalendarPlus,
  Filter,
  ChevronLeft,
  LayoutGrid,
  List,
  Map as MapIcon,
  Bookmark,
  X,
  RotateCcw,
  Layers,
  Music,
  Ticket,
  Accessibility,
  Pencil,
  Trash2,
} from 'lucide-react';

const CATEGORIES: (EventCategory | 'Tümü')[] = [
  'Tümü',
  'Müzik & Konser',
  'Sergi & Galeri',
  'Atölye & Masterclass',
  'Tiyatro & Sahne',
  'Festival',
  'Diğer',
];

const TURKEY_MAP_PINS: Array<{ city: string; x: number; y: number }> = [
  { city: 'İstanbul', x: 24, y: 24 },
  { city: 'Bursa', x: 25, y: 36 },
  { city: 'İzmir', x: 14, y: 55 },
  { city: 'Eskişehir', x: 34, y: 42 },
  { city: 'Ankara', x: 43, y: 38 },
  { city: 'Antalya', x: 35, y: 78 },
  { city: 'Konya', x: 44, y: 63 },
  { city: 'Adana', x: 56, y: 76 },
  { city: 'Kayseri', x: 56, y: 52 },
  { city: 'Trabzon', x: 71, y: 22 },
  { city: 'Diyarbakır', x: 76, y: 60 },
];

type SortOption = 'date_asc' | 'price_asc' | 'newest';

export const EventsView: React.FC = () => {
  const {
    events,
    addEventAnnouncement,
    updateEventAnnouncement,
    deleteEventAnnouncement,
    currentUser,
    activeRole,
    isAuthenticated,
    setAuthModalMode,
    runtimeConfig,
    bookmarks,
    toggleBookmark,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [listFeedback, setListFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<ArtDiscipline | 'Tümü'>('Tümü');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tümü');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'Tümü'>('Tümü');
  const [selectedCity, setSelectedCity] = useState<string>('Tümü');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar' | 'map'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const pageSize = useAdaptivePageSize(viewMode === 'list' ? 'list' : 'grid');

  const [formData, setFormData] = useState({
    title: '',
    discipline: 'Müzik' as ArtDiscipline,
    category: 'Müzik & Konser' as EventCategory,
    organizerName: '',
    organizerContact: '',
    venueName: '',
    city: 'İstanbul',
    district: '',
    eventDate: '',
    startTime: '20:00',
    endTime: '21:30',
    genres: ['Klasik Müzik'] as MusicGenre[],
    performers: '',
    ticketPrice: 0,
    isFree: false,
    ticketUrl: '',
    description: '',
    posterUrl: '',
    accessibilitySummary: [] as string[],
  });

  const [submitFeedback, setSubmitFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleDisciplineChange = (disc: ArtDiscipline | 'Tümü') => {
    setSelectedDiscipline(disc);
    if (disc !== 'Müzik') {
      setSelectedGenre('Tümü');
    }
  };

  const resetFilters = () => {
    setSelectedDiscipline('Tümü');
    setSelectedGenre('Tümü');
    setSelectedCategory('Tümü');
    setSelectedCity('Tümü');
    setPricingFilter('all');
    setAccessibleOnly(false);
    setSearchQuery('');
    setSortBy('date_asc');
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => {
        const disc = resolveDiscipline(e.discipline);

        if (selectedDiscipline !== 'Tümü' && disc !== selectedDiscipline) return false;
        if (selectedDiscipline === 'Müzik' && selectedGenre !== 'Tümü' && !e.genres.includes(selectedGenre as any)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(q);
          const matchVenue = e.venueName.toLowerCase().includes(q);
          const matchPerformer = e.performers.toLowerCase().includes(q);
          const matchDisc = disc.toLowerCase().includes(q);
          if (!matchTitle && !matchVenue && !matchPerformer && !matchDisc) return false;
        }

        if (selectedCategory !== 'Tümü' && e.category !== selectedCategory) return false;
        if (selectedCity !== 'Tümü' && e.city !== selectedCity) return false;
        if (pricingFilter === 'free' && !e.isFree && e.ticketPrice > 0) return false;
        if (pricingFilter === 'paid' && (e.isFree || e.ticketPrice === 0)) return false;
        if (accessibleOnly && (!e.accessibilitySummary || e.accessibilitySummary.length === 0)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.ticketPrice - b.ticketPrice;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      });
  }, [events, searchQuery, selectedDiscipline, selectedGenre, selectedCategory, selectedCity, pricingFilter, accessibleOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEvents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, safePage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDiscipline, selectedGenre, selectedCategory, selectedCity, pricingFilter, accessibleOnly, sortBy, viewMode]);

  const handlePageChange = (page: number) => {
    const next = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(next);
    resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (searchQuery.trim()) chips.push({ key: 'q', label: `"${searchQuery.trim()}"`, clear: () => setSearchQuery('') });
    if (selectedDiscipline !== 'Tümü') chips.push({ key: 'disc', label: selectedDiscipline, clear: () => handleDisciplineChange('Tümü') });
    if (selectedGenre !== 'Tümü') chips.push({ key: 'genre', label: selectedGenre, clear: () => setSelectedGenre('Tümü') });
    if (selectedCategory !== 'Tümü') chips.push({ key: 'cat', label: selectedCategory, clear: () => setSelectedCategory('Tümü') });
    if (selectedCity !== 'Tümü') chips.push({ key: 'city', label: selectedCity, clear: () => setSelectedCity('Tümü') });
    if (pricingFilter !== 'all') chips.push({ key: 'price', label: pricingFilter === 'free' ? 'Ücretsiz' : 'Ücretli Bilet', clear: () => setPricingFilter('all') });
    if (accessibleOnly) chips.push({ key: 'acc', label: 'Erişilebilir Etkinlik', clear: () => setAccessibleOnly(false) });
    return chips;
  }, [searchQuery, selectedDiscipline, selectedGenre, selectedCategory, selectedCity, pricingFilter, accessibleOnly]);

  const canManageEvent = (evt: EventAnnouncement) =>
    isAuthenticated && (evt.creatorUserId === currentUser.id || ['admin', 'moderator'].includes(activeRole));

  const handleOpenCreateTab = () => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    setEditingEventId(null);
    setSubmitFeedback(null);
    setActiveTab('create');
  };

  const handleStartEditEvent = (evt: EventAnnouncement) => {
    setEditingEventId(evt.id);
    setSubmitFeedback(null);
    setFormData({
      title: evt.title,
      discipline: (evt.discipline || 'Müzik') as ArtDiscipline,
      category: evt.category,
      organizerName: evt.organizerName,
      organizerContact: evt.organizerContact || '',
      venueName: evt.venueName,
      city: evt.city,
      district: evt.district || '',
      eventDate: evt.eventDate,
      startTime: evt.startTime || '20:00',
      endTime: evt.endTime || '21:30',
      genres: evt.genres || ['Klasik Müzik'],
      performers: evt.performers || '',
      ticketPrice: evt.ticketPrice || 0,
      isFree: Boolean(evt.isFree),
      ticketUrl: evt.ticketUrl || '',
      description: evt.description || '',
      posterUrl: evt.posterUrl || '',
      accessibilitySummary: evt.accessibilitySummary || [],
    });
    setActiveTab('create');
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await deleteEventAnnouncement(eventId);
    setDeletingEventId(null);
    if (res.success) {
      setListFeedback({ type: 'success', text: 'Etkinlik duyurusu silindi.' });
    } else {
      setListFeedback({ type: 'error', text: res.error || 'Etkinlik silinemedi.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    if (!formData.title.trim() || !formData.venueName.trim() || !formData.eventDate) {
      setSubmitFeedback({
        success: false,
        message: 'Lütfen etkinlik başlığı, mekân ve tarih bilgilerini eksiksiz doldurunuz.',
      });
      return;
    }

    const defaultPoster = formData.posterUrl.trim()
      ? formData.posterUrl
      : '/src/assets/images/hero_culture_music_1794440056664.jpg';

    const payload = {
      title: formData.title,
      discipline: formData.discipline,
      category: formData.category,
      organizerName: formData.organizerName || 'Bağımsız Sanatçı / İnisiyatif',
      organizerContact: formData.organizerContact,
      venueName: formData.venueName,
      city: formData.city,
      district: formData.district,
      eventDate: formData.eventDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      genres: formData.genres,
      performers: formData.performers || 'Belirtilmedi',
      ticketPrice: formData.isFree ? 0 : Number(formData.ticketPrice),
      isFree: formData.isFree,
      ticketUrl: formData.ticketUrl,
      description: formData.description,
      posterUrl: defaultPoster,
      accessibilitySummary: formData.accessibilitySummary,
    };

    const res = editingEventId
      ? await updateEventAnnouncement(editingEventId, payload)
      : await addEventAnnouncement(payload);

    if (res.success) {
      setSubmitFeedback({
        success: true,
        message: editingEventId
          ? 'Etkinlik duyurusu güncellendi.'
          : 'Etkinlik duyurunuz oluşturuldu ve moderatör onay kuyruğuna iletildi.',
      });
      setTimeout(() => {
        setEditingEventId(null);
        setActiveTab('list');
        setSubmitFeedback(null);
      }, 1000);
    } else {
      setSubmitFeedback({
        success: false,
        message: res.error || 'Etkinlik kaydedilemedi.',
      });
    }
  };

  const generateGoogleCalendarUrl = (item: EventAnnouncement) => {
    const title = encodeURIComponent(item.title);
    const details = encodeURIComponent(
      `${item.description}\n\nİcracılar: ${item.performers}\nMekân: ${item.venueName}, ${item.city}\nDüzenleyen: ${item.organizerName}`
    );
    const location = encodeURIComponent(`${item.venueName}, ${item.city}`);
    const cleanDate = item.eventDate.replace(/-/g, '');
    const startHour = item.startTime ? item.startTime.replace(/:/g, '') : '2000';
    const endHour = item.endTime ? item.endTime.replace(/:/g, '') : '2200';
    const dates = `${cleanDate}T${startHour}00/${cleanDate}T${endHour}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  const isBookmarked = (eventId: string) =>
    bookmarks.some((b) => b.itemType === 'event' && b.itemId === eventId);

  const handleBookmarkClick = async (eventId: string) => {
    if (!isAuthenticated) {
      setAuthModalMode('login');
      return;
    }
    await toggleBookmark('event', eventId);
  };

  const calendarGroups = useMemo(() => {
    const groups: Record<string, EventAnnouncement[]> = {};
    for (const evt of filteredEvents) {
      const monthKey = evt.eventDate.slice(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(evt);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  const cityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const evt of events) {
      map[evt.city] = (map[evt.city] || 0) + 1;
    }
    return map;
  }, [events]);

  const renderSidebarContent = () => {
    const isMusicSelected = selectedDiscipline === 'Müzik';

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#1e335a]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16274e] dark:text-white">
            <Filter className="w-3.5 h-3.5 text-[#f25922]" />
            <span>Etkinlik Filtreleri</span>
          </div>
          {activeFilterChips.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#64748b] hover:text-[#f25922] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sıfırla</span>
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#f25922]" />
            <span>Ana Sanat Dalı</span>
          </label>
          <CustomSelect
            value={selectedDiscipline}
            onChange={(val) => handleDisciplineChange(val as ArtDiscipline | 'Tümü')}
            options={ART_DISCIPLINES.map((d) => ({
              value: d,
              label: d === 'Tümü' ? 'Tüm Sanat Dalları' : d,
            }))}
            ariaLabel="Ana Sanat Dalı"
          />
        </div>

        {isMusicSelected && (
          <div className="space-y-2 p-3 rounded-xl bg-orange-50/70 dark:bg-[#0f1c38]/90 border border-[#f25922]/25">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#f25922] flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" />
              <span>Müzik Türü</span>
            </div>
            <CustomSelect
              value={selectedGenre}
              onChange={setSelectedGenre}
              options={MUSIC_GENRES.map((g) => ({
                value: g,
                label: g === 'Tümü' ? 'Tüm Müzik Türleri' : g,
              }))}
              variant="compact"
              ariaLabel="Müzik Türü"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block">
            Etkinlik Kategorisi
          </label>
          <CustomSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val as EventCategory | 'Tümü')}
            options={CATEGORIES.map((c) => ({
              value: c,
              label: c === 'Tümü' ? 'Tüm Kategoriler' : c,
            }))}
            ariaLabel="Kategori"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block">
            Şehir
          </label>
          <CustomSelect
            value={selectedCity}
            onChange={setSelectedCity}
            options={CITY_LIST.map((c) => ({
              value: c,
              label: c === 'Tümü' ? 'Tüm Şehirler' : c,
            }))}
            ariaLabel="Şehir"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-[#e2e8f0] dark:border-[#1e335a]">
          <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-[#f25922]" />
            <span>Katılım &amp; Bilet Durumu</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'free', label: 'Ücretsiz' },
                { id: 'paid', label: 'Ücretli' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPricingFilter(item.id)}
                className={`py-2 text-center rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  pricingFilter === item.id
                    ? 'bg-[#16274e] dark:bg-[#f25922] text-white border-[#16274e] dark:border-[#f25922]'
                    : 'bg-[#f8fafc] dark:bg-[#0f1c38] text-[#475569] dark:text-slate-300 border-[#e2e8f0] dark:border-[#1e335a]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1e335a]">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#0f172a] dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={accessibleOnly}
              onChange={(e) => setAccessibleOnly(e.target.checked)}
              className="accent-[#f25922] rounded"
            />
            <Accessibility className="w-4 h-4 text-[#f25922]" />
            <span>Yalnızca Erişilebilir Etkinlikler</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="text-left w-full">
      <ArchitecturalPageHeader
        eyebrow="Kültür & Sahne Takvimi · Türkiye Geneli Kültür Haritası"
        title="Kültür & Sanat Etkinlikleri"
        subtitle="Konserler, sergiler, edebiyat söyleşileri ve atölyeler; takviminize .ics olarak indirin, şehir haritasında keşfedin veya duyuru gönderin."
        stats={[
          { label: 'Aktif Takvim', value: `${events.filter((e) => e.status === 'published').length} Yayınlanmış Etkinlik` },
        ]}
        searchQuery={activeTab === 'list' ? searchQuery : undefined}
        onSearchChange={activeTab === 'list' ? setSearchQuery : undefined}
        searchPlaceholder="Etkinlik adı, sanatçı, sergi veya salon ara..."
        searchButtonLabel="Etkinlik Ara"
        onOpenMobileFilter={activeTab === 'list' ? () => setMobileFilterOpen(true) : undefined}
        actionSlot={
          activeTab === 'create' ? (
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Etkinlik Listesine Dön</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateTab}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#f25922] hover:bg-[#d94b18] text-white transition-colors shadow-lg shadow-[#f25922]/30 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Etkinlik Duyurusu Paylaş</span>
            </button>
          )
        }
      />

      {activeTab === 'create' ? (
        <div className="bg-[#f8fafc] dark:bg-[#0c1527] py-10 px-4">
          <div className="relative z-10 bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#0f172a] dark:text-white">
                {editingEventId ? 'Etkinlik Duyurusunu Güncelle' : 'Yeni Etkinlik Duyurusu Yayınla'}
              </h2>
              <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5">
                {editingEventId
                  ? 'Etkinlik detaylarını düzenleyip kaydedebilirsiniz.'
                  : 'Etkinlik duyurunuz moderasyon onayından geçtikten sonra herkese açık takvimde listelenecektir.'}
              </p>
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  submitFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Ana Sanat Dalı
                  </label>
                  <CustomSelect
                    value={formData.discipline}
                    onChange={(val) => setFormData({ ...formData, discipline: val as ArtDiscipline })}
                    options={ART_DISCIPLINES.filter((d) => d !== 'Tümü') as ArtDiscipline[]}
                    ariaLabel="Ana Sanat Dalı"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Etkinlik Kategorisi
                  </label>
                  <CustomSelect
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val as EventCategory })}
                    options={CATEGORIES.filter((c) => c !== 'Tümü') as EventCategory[]}
                    ariaLabel="Etkinlik Kategorisi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                  Etkinlik Başlığı
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Örn: Akustik Trio Bahar Resitali"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Mekân / Salon Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    placeholder="Örn: Pera Tarihi Konser Salonu"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Şehir
                  </label>
                  <CustomSelect
                    value={formData.city}
                    onChange={(val) => setFormData({ ...formData, city: val })}
                    options={CITY_LIST.filter((c) => c !== 'Tümü')}
                    ariaLabel="Şehir"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                    Başlangıç Saati
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                  Sanatçılar / İcracılar
                </label>
                <input
                  type="text"
                  value={formData.performers}
                  onChange={(e) => setFormData({ ...formData, performers: e.target.value })}
                  placeholder="Örn: Efe Özkan & İstanbul String Trio"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                  Erişilebilir Sanat Beyanı (Varsa İşaretleyin)
                </label>
                <div className="flex flex-wrap gap-3 text-xs">
                  {['Tekerlekli Sandalye Erişimi', 'İşaret Dili Tercümanı', 'Canlı Altyazı', 'Duyusal Dostu Oturum'].map((tag) => (
                    <label key={tag} className="inline-flex items-center gap-1.5 cursor-pointer text-[#475569] dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.accessibilitySummary.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, accessibilitySummary: [...formData.accessibilitySummary, tag] });
                          } else {
                            setFormData({
                              ...formData,
                              accessibilitySummary: formData.accessibilitySummary.filter((t) => t !== tag),
                            });
                          }
                        }}
                        className="accent-[#f25922]"
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    className="rounded border-[#e2e8f0] accent-[#f25922]"
                  />
                  <span>Ücretsiz Katılım</span>
                </label>

                {!formData.isFree && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#64748b] dark:text-slate-400">Bilet Fiyatı (₺):</span>
                    <input
                      type="number"
                      value={formData.ticketPrice}
                      onChange={(e) => setFormData({ ...formData, ticketPrice: Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 text-xs rounded-lg border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-slate-200 mb-1">
                  Açıklama &amp; Program
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Eserler, konsept veya katılım şartları hakkında detaylar..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] text-[#0f172a] dark:text-white focus:outline-hidden focus:border-[#f25922]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEventId(null);
                    setActiveTab('list');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#64748b] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] hover:opacity-90 rounded-xl transition-opacity shadow-xs cursor-pointer"
                >
                  {editingEventId ? 'Değişiklikleri Kaydet' : 'Onaya Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Summary & Controls Strip */}
          <div className="bg-white dark:bg-[#13213e] border-b border-[#e2e8f0] dark:border-[#1e335a] transition-colors">
            <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#16274e]/8 dark:bg-white/10 text-[#16274e] dark:text-white text-xs font-bold tabular-nums">
                  <span>{filteredEvents.length} Kültür &amp; Sanat Etkinliği</span>
                </span>

                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-[#f25922]/15 text-[#d94b18] dark:text-[#ffb59e] border border-[#f25922]/30 text-xs font-semibold hover:bg-[#f25922] hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{chip.label}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as SortOption)}
                  variant="compact"
                  className="w-48"
                  options={[
                    { value: 'date_asc', label: 'Tarihi Yaklaşanlar' },
                    { value: 'price_asc', label: 'Bilet: Düşükten Yükseğe' },
                    { value: 'newest', label: 'En Yeni Duyurular' },
                  ]}
                  ariaLabel="Sıralama"
                />

                <div className="inline-flex rounded-lg border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Izgara Görünümü"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white dark:bg-[#13213e] text-[#f25922] shadow-xs' : 'text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="Liste Görünümü"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list' ? 'bg-white dark:bg-[#13213e] text-[#f25922] shadow-xs' : 'text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    aria-label="Takvim Görünümü"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'calendar' ? 'bg-white dark:bg-[#13213e] text-[#f25922] shadow-xs' : 'text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    aria-label="Türkiye Kültür Haritası"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'map' ? 'bg-white dark:bg-[#13213e] text-[#f25922] shadow-xs' : 'text-[#64748b] dark:text-slate-400'
                    }`}
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#f8fafc] dark:bg-[#0c1527] min-h-[60vh] transition-colors">
            <div className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 items-start">
              <aside className="hidden lg:block w-72 xl:w-80 shrink-0 bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] p-5 sticky top-24 shadow-xs">
                {renderSidebarContent()}
              </aside>

              <div className="flex-1 min-w-0 w-full space-y-5">
                {listFeedback && (
                  <div
                    role={listFeedback.type === 'error' ? 'alert' : 'status'}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between gap-2 ${
                      listFeedback.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    }`}
                  >
                    <span>{listFeedback.text}</span>
                    <button type="button" onClick={() => setListFeedback(null)} className="hover:underline cursor-pointer">
                      Kapat
                    </button>
                  </div>
                )}
                <div ref={resultsTopRef} className="scroll-mt-24 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {CATEGORIES.slice(0, 5).map((cat) => {
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#f25922] text-white border-[#f25922] shadow-sm'
                              : 'bg-white dark:bg-[#13213e] text-[#475569] dark:text-slate-300 border-[#e2e8f0] dark:border-[#1e335a] hover:border-[#f25922]/50 hover:text-[#f25922]'
                          }`}
                        >
                          {cat === 'Tümü' ? 'Tüm Etkinlikler' : cat}
                        </button>
                      );
                    })}
                  </div>

                  {viewMode !== 'map' && viewMode !== 'calendar' && (
                    <PaginationBar
                      position="top"
                      currentPage={safePage}
                      totalItems={filteredEvents.length}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      itemLabel="etkinlik"
                    />
                  )}
                </div>

                {viewMode === 'map' ? (
                  <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-base font-bold text-[#0f172a] dark:text-white">
                          Türkiye Kültür &amp; Etkinlik Haritası
                        </h3>
                        <p className="text-xs text-[#64748b] dark:text-slate-400">
                          {runtimeConfig.hasGoogleMapsKey
                            ? 'Canlı Google Maps entegrasyonu aktif.'
                            : 'Google Maps API anahtarı tanımlanmadığı için etkileşimli Türkiye şehir yoğunluk haritası kullanılmaktadır.'}
                        </p>
                      </div>
                      {selectedCity !== 'Tümü' && (
                        <button
                          type="button"
                          onClick={() => setSelectedCity('Tümü')}
                          className="text-xs font-bold text-[#f25922] hover:underline cursor-pointer"
                        >
                          Tüm Türkiye&apos;yi Göster
                        </button>
                      )}
                    </div>

                    <div className="relative w-full h-72 sm:h-80 rounded-2xl bg-gradient-to-br from-[#16274e] to-[#0f1c38] border border-[#1e335a] overflow-hidden p-4">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-20">
                        <path
                          d="M8,32 L26,20 L55,18 L85,22 L92,45 L82,72 L52,82 L22,80 L10,58 Z"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                      </svg>
                      {TURKEY_MAP_PINS.map((pin) => {
                        const count = cityCounts[pin.city] || 0;
                        const active = selectedCity === pin.city;
                        return (
                          <button
                            key={pin.city}
                            type="button"
                            onClick={() => setSelectedCity(active ? 'Tümü' : pin.city)}
                            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-transform hover:scale-105 cursor-pointer flex items-center gap-1 shadow-md ${
                              active
                                ? 'bg-[#f25922] text-white ring-4 ring-[#f25922]/30'
                                : count > 0
                                ? 'bg-white text-[#16274e]'
                                : 'bg-white/20 text-slate-300'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-[#f25922]" />
                            <span>{pin.city}</span>
                            {count > 0 && <span className="px-1.5 py-0.2 rounded-md bg-[#16274e] text-white text-[9px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredEvents.slice(0, 6).map((evt) => (
                        <div key={evt.id} className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-1">
                          <div className="text-[11px] font-bold text-[#f25922]">{evt.city} · {evt.eventDate}</div>
                          <div className="text-xs font-bold text-[#0f172a] dark:text-white line-clamp-1">{evt.title}</div>
                          <div className="text-[11px] text-[#64748b] dark:text-slate-400">{evt.venueName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : viewMode === 'calendar' ? (
                  <div className="space-y-4">
                    {calendarGroups.length === 0 ? (
                      <div className="p-10 text-center bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a]">
                        <p className="text-xs text-[#64748b] dark:text-slate-400">Takvimde seçilen filtrelere uygun etkinlik bulunamadı.</p>
                      </div>
                    ) : (
                      calendarGroups.map(([monthKey, monthEvents]) => (
                        <div key={monthKey} className="bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] p-5 space-y-3">
                          <h3 className="font-display text-sm font-bold text-[#16274e] dark:text-[#ffb59e] border-b border-[#e2e8f0] dark:border-[#1e335a] pb-2">
                            Dönem: {monthKey} ({monthEvents.length} Etkinlik)
                          </h3>
                          <div className="space-y-2.5">
                            {monthEvents.map((evt) => (
                              <div key={evt.id} className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-bold text-[#f25922] tabular-nums">{evt.eventDate} · {evt.startTime}</div>
                                  <div className="text-xs font-bold text-[#0f172a] dark:text-white">{evt.title}</div>
                                  <div className="text-[11px] text-[#64748b] dark:text-slate-400">{evt.venueName}, {evt.city}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/api/events/${evt.id}/ics`}
                                    download={`sanatsahnede-${evt.id}.ics`}
                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#13213e] border border-[#e2e8f0] dark:border-[#1e335a] text-[11px] font-bold text-[#16274e] dark:text-white hover:border-[#f25922] inline-flex items-center gap-1"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[#f25922]" />
                                    <span>.ICS İndir</span>
                                  </a>
                                  <a
                                    href={generateGoogleCalendarUrl(evt)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-[#16274e] text-white text-[11px] font-bold inline-flex items-center gap-1"
                                  >
                                    <CalendarPlus className="w-3.5 h-3.5" />
                                    <span>Google Takvim</span>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-3">
                    <Calendar className="w-8 h-8 text-[#f25922] mx-auto" />
                    <h3 className="text-base font-bold text-[#0f172a] dark:text-white">
                      Seçilen filtrelere uygun etkinlik bulunamadı
                    </h3>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] hover:opacity-90 rounded-xl transition-opacity cursor-pointer"
                    >
                      Tüm Etkinlikleri Göster
                    </button>
                  </div>
                ) : (
                  <motion.div
                    key={`events-page-${safePage}-${viewMode}`}
                    initial={{ opacity: 0.78, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  >
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                        {paginatedEvents.map((evt) => (
                          <article
                            key={evt.id}
                            className="group bg-white dark:bg-[#13213e] rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] hover:border-[#f25922]/60 shadow-xs hover:shadow-lg transition-transform transition-colors duration-200 hover:-translate-y-0.5 overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative h-28 w-full bg-[#12161b] overflow-hidden">
                                <img
                                  src={evt.posterUrl}
                                  alt={evt.title}
                                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/20 to-transparent" />

                                <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10">
                                  <span className="px-2 py-0.5 rounded-md bg-[#16274e]/95 text-white text-[9px] font-bold truncate max-w-[65%]">
                                    {evt.status === 'pending_moderation' ? 'Onay Bekliyor' : evt.category || 'Konser'}
                                  </span>

                                  {evt.isFree || evt.ticketPrice === 0 ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-950 text-[9px] font-bold">
                                      Ücretsiz
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-[#f25922] text-white text-[9px] font-bold tabular-nums">
                                      {evt.ticketPrice}₺
                                    </span>
                                  )}
                                </div>

                                <div className="absolute bottom-2 inset-x-2.5 z-10 flex items-center gap-1 text-[10px] text-white font-semibold tabular-nums">
                                  <Calendar className="w-3 h-3 text-[#ffb59e] shrink-0" />
                                  <span className="truncate">
                                    {evt.eventDate} · {evt.startTime}
                                  </span>
                                </div>
                              </div>

                              <div className="p-3.5 space-y-1.5">
                                <h3 className="font-bold text-[13px] text-[#0f172a] dark:text-white group-hover:text-[#f25922] transition-colors line-clamp-2 min-h-[2.25rem] leading-snug">
                                  {evt.title}
                                </h3>

                                <div className="flex items-center gap-1 text-[11px] text-[#64748b] dark:text-slate-400 truncate">
                                  <MapPin className="w-3 h-3 shrink-0 text-[#f25922]" />
                                  <span className="truncate">
                                    {evt.venueName}, {evt.city}
                                  </span>
                                </div>

                                <div className="text-[11px] text-[#475569] dark:text-slate-300 truncate">
                                  {evt.performers}
                                </div>

                                {evt.accessibilitySummary && evt.accessibilitySummary.length > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <Accessibility className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{evt.accessibilitySummary[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="px-3.5 py-2.5 bg-[#f8fafc] dark:bg-[#0f1c38]/80 border-t border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={generateGoogleCalendarUrl(evt)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Google Takvime Ekle"
                                  className="p-1.5 rounded-lg bg-white dark:bg-[#13213e] border border-[#e2e8f0] dark:border-[#1e335a] text-[#16274e] dark:text-slate-200 hover:text-[#f25922] transition-colors"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`/api/events/${evt.id}/ics`}
                                  download={`sanatsahnede-${evt.id}.ics`}
                                  title=".ICS Takvim İndir"
                                  className="p-1.5 rounded-lg bg-white dark:bg-[#13213e] border border-[#e2e8f0] dark:border-[#1e335a] text-[#16274e] dark:text-slate-200 hover:text-[#f25922] transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleBookmarkClick(evt.id)}
                                  title="Etkinliği Kaydet"
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isBookmarked(evt.id)
                                      ? 'bg-[#f25922] text-white border-[#f25922]'
                                      : 'bg-white dark:bg-[#13213e] border-[#e2e8f0] dark:border-[#1e335a] text-[#16274e] dark:text-slate-200'
                                  }`}
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                </button>
                              </div>

                                {evt.ticketUrl ? (
                                  <a
                                    href={evt.ticketUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-[#f25922] hover:bg-[#d94b18] text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                  >
                                    <span>Bilet</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    Serbest Giriş
                                  </span>
                                )}
                              </div>

                              {canManageEvent(evt) && (
                                <div className="px-3.5 py-2 bg-[#f1f3ff] dark:bg-[#0f1c38] border-t border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditEvent(evt)}
                                    className="text-[11px] font-semibold text-[#16274e] dark:text-slate-200 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Düzenle</span>
                                  </button>
                                  {deletingEventId === evt.id ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEvent(evt.id)}
                                        className="px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        Silmeyi Onayla
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingEventId(null)}
                                        className="text-[10px] text-[#64748b] cursor-pointer"
                                      >
                                        Vazgeç
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingEventId(evt.id)}
                                      className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Sil</span>
                                    </button>
                                  )}
                                </div>
                              )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {paginatedEvents.map((evt) => (
                          <article
                            key={evt.id}
                            className="group bg-white dark:bg-[#13213e] p-5 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] hover:border-[#f25922]/60 shadow-xs hover:shadow-md transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-4 min-w-0">
                              <img
                                src={evt.posterUrl}
                                alt={evt.title}
                                className="w-16 h-16 rounded-xl object-cover border border-[#e2e8f0] dark:border-[#1e335a] shrink-0"
                              />
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-[#f25922]/15 text-[#f25922] text-[10px] font-bold">
                                    {evt.category}
                                  </span>
                                  <span className="text-[#64748b] dark:text-slate-400 tabular-nums">
                                    {evt.eventDate} · {evt.startTime}
                                  </span>
                                </div>
                                <h3 className="font-bold text-base text-[#0f172a] dark:text-white group-hover:text-[#f25922] transition-colors">
                                  {evt.title}
                                </h3>
                                <div className="text-xs text-[#475569] dark:text-slate-300">
                                  {evt.venueName}, {evt.city} · {evt.performers}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={generateGoogleCalendarUrl(evt)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-lg bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] text-xs font-semibold text-[#16274e] dark:text-slate-200 hover:border-[#f25922] inline-flex items-center gap-1"
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-[#f25922]" />
                                <span>Takvime Ekle</span>
                              </a>
                              <a
                                href={`/api/events/${evt.id}/ics`}
                                download={`sanatsahnede-${evt.id}.ics`}
                                className="p-2 rounded-lg bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] text-[#16274e] dark:text-slate-200 hover:border-[#f25922]"
                                title=".ICS İndir"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {canManageEvent(evt) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditEvent(evt)}
                                    className="px-2.5 py-2 rounded-lg bg-[#f1f3ff] dark:bg-[#0f1c38] border border-[#dae2ff] dark:border-[#1e335a] text-xs font-semibold text-[#16274e] dark:text-white inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Düzenle</span>
                                  </button>
                                  {deletingEventId === evt.id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEvent(evt.id)}
                                      className="px-2.5 py-2 rounded-lg bg-rose-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Onayla
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingEventId(evt.id)}
                                      className="px-2.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {viewMode !== 'map' && viewMode !== 'calendar' && (
                  <PaginationBar
                    position="bottom"
                    currentPage={safePage}
                    totalItems={filteredEvents.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    itemLabel="etkinlik"
                  />
                )}

                <div className="rounded-2xl bg-gradient-to-r from-[#16274e] to-[#203666] border border-[#1e335a] p-6 sm:p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg">
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      Konser, Sergi veya Söyleşi Duyurunuzu Takvime Ekleyin
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                      Sanatseverlere ve sektör profesyonellerine ulaşmak için etkinliğinizi ücretsiz duyurun.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateTab}
                    className="px-5 py-2.5 rounded-xl bg-[#f25922] hover:bg-[#d94b18] text-white text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Etkinlik Duyurusu Paylaş</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {mobileFilterOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onClick={() => setMobileFilterOpen(false)}
                className="fixed inset-0 z-50 bg-slate-950/65 flex justify-end"
              >
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xs bg-white dark:bg-[#13213e] h-full p-5 overflow-y-auto flex flex-col justify-between gap-6"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0] dark:border-[#1e335a]">
                      <span className="font-bold text-sm text-[#0f172a] dark:text-white">Etkinlik Filtreleri</span>
                      <button
                        type="button"
                        onClick={() => setMobileFilterOpen(false)}
                        aria-label="Kapat"
                        className="p-2 text-[#64748b] dark:text-slate-300 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {renderSidebarContent()}
                  </div>
                  <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#1e335a] flex gap-2">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="w-1/2 min-h-[44px] py-2.5 text-xs font-semibold text-[#0f172a] dark:text-white bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl cursor-pointer"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileFilterOpen(false)}
                      className="w-1/2 min-h-[44px] py-2.5 text-xs font-bold text-white bg-[#f25922] rounded-xl cursor-pointer"
                    >
                      Uygula ({filteredEvents.length})
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
