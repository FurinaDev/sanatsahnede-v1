import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { ArtDiscipline } from '../types';
import { formatCurrencyTRY } from '../utils/businessLogic';
import {
  Layers,
  Plus,
  Sparkles,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const DISCIPLINES: ArtDiscipline[] = [
  'Müzik',
  'Görsel Sanatlar & Sergi',
  'Heykel & Enstalasyon',
  'Sahne & Tiyatro',
  'Edebiyat & Söyleşi',
  'Bileşik Sanatlar',
];

export const ProjectLabView: React.FC = () => {
  const {
    projects,
    isAuthenticated,
    setAuthModalMode,
    refreshBootstrap,
    navigateTo,
    generateAiDraft,
  } = useApp();

  const [disciplineFilter, setDisciplineFilter] = useState<string>('Tümü');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [applyModalProjectId, setApplyModalProjectId] = useState<string | null>(null);
  const [applyForm, setApplyForm] = useState({ roleTitle: '', message: '' });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    discipline: 'Bileşik Sanatlar' as ArtDiscipline,
    projectType: 'Disiplinlerarası Performans',
    city: 'İstanbul',
    isRemote: false,
    budgetAmount: 50000,
    isVolunteer: false,
    applicationDeadline: '2027-02-01',
    deliveryDate: '2027-04-15',
    rolesText: 'Besteci / Müzisyen, Işık Tasarımcısı, Küratör',
    rightsAgreement: 'Eser ve icra hakları ortak üretim ekibi arasında eşit paylı protokol ile korunur.',
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (disciplineFilter === 'Tümü') return true;
      return p.disciplines.includes(disciplineFilter as ArtDiscipline);
    });
  }, [projects, disciplineFilter]);

  const handleAiBrief = async () => {
    const res = await generateAiDraft('project_brief', {
      title: createForm.title || 'Disiplinlerarası Sanat Projesi',
      discipline: createForm.discipline,
      city: createForm.city,
    });
    if (res?.text) {
      setCreateForm((p) => ({ ...p, description: res.text }));
      setFeedback({ type: 'success', text: res.source === 'gemini' ? 'Gemini AI proje özeti oluşturdu.' : 'Yapılandırılmış proje çağrısı taslağı eklendi.' });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const rolesNeeded = createForm.rolesText
      .split(',')
      .map((r, i) => ({
        id: `role_${i}_${Date.now()}`,
        roleTitle: r.trim(),
        discipline: createForm.discipline,
        count: 1,
      }))
      .filter((r) => r.roleTitle);

    try {
      const res = await apiRequest<{ project: { id: string } }>('/api/projects', {
        method: 'POST',
        body: {
          title: createForm.title,
          description: createForm.description,
          disciplines: [createForm.discipline],
          projectType: createForm.projectType,
          city: createForm.city,
          isRemote: createForm.isRemote,
          budgetAmount: createForm.isVolunteer ? 0 : Number(createForm.budgetAmount),
          isVolunteer: createForm.isVolunteer,
          applicationDeadline: createForm.applicationDeadline,
          deliveryDate: createForm.deliveryDate,
          rolesNeeded,
          rightsAgreement: createForm.rightsAgreement,
        },
      });
      await refreshBootstrap();
      setShowCreateForm(false);
      setCreateForm((p) => ({ ...p, title: '', description: '' }));
      setFeedback({ type: 'success', text: 'Ortak üretim projesi yayınlandı.' });
      if (res.project?.id) navigateTo('project_workspace', res.project.id);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Proje oluşturulamadı.' });
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalProjectId) return;
    setFeedback(null);
    try {
      await apiRequest(`/api/projects/${applyModalProjectId}/apply`, {
        method: 'POST',
        body: applyForm,
      });
      await refreshBootstrap();
      setApplyModalProjectId(null);
      setApplyForm({ roleTitle: '', message: '' });
      setFeedback({ type: 'success', text: 'Proje katılım başvurunuz proje sahibine iletildi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Başvuru gönderilemedi.' });
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.1 · Proje Lab & Ortak Üretim</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16274e] dark:text-white mt-1">
            Disiplinlerarası Ortak Üretim & Ekip Kurma Laboratuvarı
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Yeni bir sahne eseri, sergi veya disiplinlerarası proje başlatın; açık rollere ortak sanatçılar davet edin ve görev/bütçe/hak protokolünü ortak alanda yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              setAuthModalMode('login');
              return;
            }
            setShowCreateForm((p) => !p);
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Ortak Proje Başlat</span>
        </button>
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

      {showCreateForm && isAuthenticated && (
        <form onSubmit={handleCreateProject} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">Yeni Proje Çağrısı Oluştur</h2>
            <button
              type="button"
              onClick={handleAiBrief}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Proje Özeti Taslağı</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="proj-title" className="block text-[11px] font-bold mb-1">Proje Adı</label>
              <input
                id="proj-title"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Örn: Boğaziçi Ses & Görsel Enstalasyon Serisi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="proj-disc" className="block text-[11px] font-bold mb-1">Ana Disiplin</label>
              <select
                id="proj-disc"
                value={createForm.discipline}
                onChange={(e) => setCreateForm((p) => ({ ...p, discipline: e.target.value as ArtDiscipline }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="proj-city" className="block text-[11px] font-bold mb-1">Şehir</label>
              <input
                id="proj-city"
                value={createForm.city}
                onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="proj-desc" className="block text-[11px] font-bold mb-1">Proje Konsepti & Hedefler</label>
            <textarea
              id="proj-desc"
              rows={3}
              required
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="proj-roles" className="block text-[11px] font-bold mb-1">Aranan Roller (Virgülle Ayırın)</label>
              <input
                id="proj-roles"
                value={createForm.rolesText}
                onChange={(e) => setCreateForm((p) => ({ ...p, rolesText: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="proj-budget" className="block text-[11px] font-bold mb-1">Toplam Bütçe (TRY)</label>
              <input
                id="proj-budget"
                type="number"
                disabled={createForm.isVolunteer}
                value={createForm.budgetAmount}
                onChange={(e) => setCreateForm((p) => ({ ...p, budgetAmount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.isVolunteer}
                onChange={(e) => setCreateForm((p) => ({ ...p, isVolunteer: e.target.checked }))}
              />
              <span>Gönüllü / Kolektif Dayanışma Projesi</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                İptal
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">
                Projeyi Yayınla
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {['Tümü', ...DISCIPLINES].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDisciplineFilter(d)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
              disciplineFilter === d
                ? 'bg-[#16274e] text-white border-[#16274e]'
                : 'bg-white dark:bg-[#13213e] border-slate-200 dark:border-[#1e335a] text-slate-600 dark:text-slate-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProjects.map((project) => (
          <article key={project.id} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] text-[11px] font-bold">
                  {project.projectType}
                </span>
                <span className="text-xs font-bold text-[#16274e] dark:text-blue-300">
                  {project.isVolunteer ? 'Kolektif / Gönüllü' : formatCurrencyTRY(project.budgetAmount)}
                </span>
              </div>
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">{project.title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{project.description}</p>

              <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#E45424]" />{project.city}{project.isRemote ? ' + Uzaktan' : ''}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#E45424]" />Son Başvuru: {project.applicationDeadline}</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#E45424]" />{project.members.length} Üye</span>
              </div>

              {project.rolesNeeded.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Açık Ekip Rolleri</div>
                  <div className="flex flex-wrap gap-1.5">
                    {project.rolesNeeded.map((r) => (
                      <span key={r.id} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                        {r.roleTitle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigateTo('project_workspace', project.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-[#E45424] cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#E45424]" />
                <span>Çalışma Alanını Aç</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalMode('login');
                    return;
                  }
                  setApplyModalProjectId(project.id);
                  setApplyForm({ roleTitle: project.rolesNeeded[0]?.roleTitle || 'Katkıcı Sanatçı', message: '' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
              >
                <span>Role Başvur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {applyModalProjectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleApply} className="w-full max-w-md bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#16274e] dark:text-white">Projeye Katılım Başvurusu</h3>
            <div>
              <label htmlFor="papp-role" className="block text-xs font-bold mb-1">Başvurulan Rol</label>
              <input
                id="papp-role"
                required
                value={applyForm.roleTitle}
                onChange={(e) => setApplyForm((p) => ({ ...p, roleTitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="papp-msg" className="block text-xs font-bold mb-1">Katkı & Portfolyo Notu</label>
              <textarea
                id="papp-msg"
                rows={3}
                required
                value={applyForm.message}
                onChange={(e) => setApplyForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Projedeki rolünüze dair deneyiminizi ve fikirlerinizi yazın..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApplyModalProjectId(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                Vazgeç
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer">
                Başvuruyu Gönder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
