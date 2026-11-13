import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { ProductionWorkspace } from '../types';
import {
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  Truck,
  CheckSquare,
  Wrench,
} from 'lucide-react';

interface ProductionDeskViewProps {
  contextId?: string;
}

const STAGE_ITEM_TYPES: Array<{ kind: ProductionWorkspace['stagePlot'][number]['kind']; label: string; color: string }> = [
  { kind: 'musician', label: 'Sanatçı', color: 'bg-[#E45424]' },
  { kind: 'instrument', label: 'Enstrüman', color: 'bg-[#16274e]' },
  { kind: 'mic', label: 'Mikrofon', color: 'bg-emerald-600' },
  { kind: 'monitor', label: 'Monitör', color: 'bg-amber-600' },
  { kind: 'speaker', label: 'PA Hoparlör', color: 'bg-indigo-600' },
];

export const ProductionDeskView: React.FC<ProductionDeskViewProps> = ({ contextId }) => {
  const {
    isAuthenticated,
    setAuthModalMode,
    bookings,
    projects,
    navigateTo,
    generateAiDraft,
  } = useApp();

  const resolvedContext = React.useMemo(() => {
    if (contextId && contextId.startsWith('project:')) {
      return { type: 'project' as const, id: contextId.replace('project:', '') };
    }
    if (contextId && projects.some((p) => p.id === contextId)) {
      return { type: 'project' as const, id: contextId };
    }
    const targetBookingId = contextId || bookings[0]?.id || '';
    return { type: 'booking' as const, id: targetBookingId };
  }, [contextId, bookings, projects]);

  const [workspace, setWorkspace] = useState<ProductionWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Interactive Stage Plot state
  const [activePlotKind, setActivePlotKind] = useState<ProductionWorkspace['stagePlot'][number]['kind']>('musician');
  const [newPlotLabel, setNewPlotLabel] = useState('Vokal / Solist');

  // Schedule & Tasks inputs
  const [newSchedTime, setNewSchedTime] = useState('17:30');
  const [newSchedTitle, setNewSchedTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !resolvedContext.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    apiRequest<{ workspace: ProductionWorkspace }>(`/api/production/${resolvedContext.type}/${resolvedContext.id}`)
      .then((res) => {
        if (!cancelled) setWorkspace(res.workspace);
      })
      .catch((err) => {
        if (!cancelled) setErrorMsg(err?.message || 'Prodüksiyon çalışma alanına erişilemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, resolvedContext.type, resolvedContext.id]);

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <Sliders className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Prodüksiyon Masası</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sahne planı, technical rider ve akış programı yalnızca ilgili rezervasyon/proje taraflarına açıktır.
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center text-sm text-slate-500">
        Prodüksiyon masası yükleniyor...
      </div>
    );
  }

  if (errorMsg || !workspace) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-rose-200 dark:border-rose-800 p-8 space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMsg || 'Görüntülenecek aktif bir rezervasyon veya proje prodüksiyon masası bulunamadı.'}</span>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E45424] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>
      </div>
    );
  }

  const handleSaveWorkspace = async () => {
    setSaving(true);
    setSaveNotice(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ workspace: ProductionWorkspace }>(
        `/api/production/${workspace.contextType}/${workspace.contextId}`,
        {
          method: 'PUT',
          body: {
            rider: workspace.rider,
            stagePlot: workspace.stagePlot,
            schedule: workspace.schedule,
            tasks: workspace.tasks,
            logistics: workspace.logistics,
          },
        }
      );
      setWorkspace(res.workspace);
      setSaveNotice('Prodüksiyon masası ve teknik rider veritabanına kaydedildi.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleAiRiderDraft = async () => {
    const res = await generateAiDraft('technical_rider', {
      title: workspace.title,
      venueName: workspace.venueName,
      stageSize: workspace.rider.stageSize,
    });
    if (res?.text) {
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              rider: {
                ...prev.rider,
                specialNotes: res.text,
              },
            }
          : prev
      );
      setSaveNotice(res.source === 'gemini' ? 'Gemini AI teknik rider taslağı oluşturuldu.' : 'Yapılandırılmış teknik rider şablonu eklendi.');
    }
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const newItem = {
      id: `sp_${Date.now()}`,
      kind: activePlotKind,
      label: newPlotLabel.trim() || 'Ekipman',
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(8, Math.min(92, y)),
    };
    setWorkspace((prev) => (prev ? { ...prev, stagePlot: [...prev.stagePlot, newItem] } : prev));
  };

  const handleAddSchedule = () => {
    if (!newSchedTitle.trim()) return;
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            schedule: [
              ...prev.schedule,
              { id: `sch_${Date.now()}`, time: newSchedTime, title: newSchedTitle.trim(), ownerRole: 'Ekip' },
            ],
          }
        : prev
    );
    setNewSchedTitle('');
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            tasks: [
              ...prev.tasks,
              { id: `tsk_${Date.now()}`, title: newTaskTitle.trim(), assigneeRole: 'Prodüksiyon', dueDate: workspace.eventDate, completed: false },
            ],
          }
        : prev
    );
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">9.3 Prodüksiyon Masası</span>
          <h1 className="font-display text-2xl font-extrabold text-[#16274e] dark:text-white mt-0.5">{workspace.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {workspace.venueName} · {workspace.eventDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('technical_match')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:border-[#E45424]"
          >
            <Wrench className="w-3.5 h-3.5 text-[#E45424]" />
            <span>Teknik Eşleşme Talebi Aç</span>
          </button>
          <button
            type="button"
            onClick={handleSaveWorkspace}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
          </button>
        </div>
      </div>

      {saveNotice && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Stage Plot + Rider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Stage Plot */}
        <div className="lg:col-span-6 bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">İnteraktif Sahne Planı (Stage Plot)</h2>
            <span className="text-[11px] text-slate-500">Yerleştirmek için sahne alanına tıklayın</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Sahne Öğesi Türü"
              value={activePlotKind}
              onChange={(e) => setActivePlotKind(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs font-semibold"
            >
              {STAGE_ITEM_TYPES.map((t) => (
                <option key={t.kind} value={t.kind}>{t.label}</option>
              ))}
            </select>
            <input
              aria-label="Sahne Öğesi Etiketi"
              value={newPlotLabel}
              onChange={(e) => setNewPlotLabel(e.target.value)}
              placeholder="Etiket (Örn: Piyano)"
              className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>

          <div
            data-testid="stage-plot-canvas"
            onClick={handleStageClick}
            className="relative w-full h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] cursor-crosshair overflow-hidden"
          >
            <div className="absolute top-2 inset-x-0 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 pointer-events-none">
              Sahne Arkası (Backstage)
            </div>
            <div className="absolute bottom-2 inset-x-0 text-center text-[10px] font-bold uppercase tracking-widest text-[#E45424]/70 pointer-events-none">
              Seyirci Cephesi (Front of Stage)
            </div>
            {workspace.stagePlot.map((item) => {
              const meta = STAGE_ITEM_TYPES.find((t) => t.kind === item.kind) || STAGE_ITEM_TYPES[0];
              return (
                <div
                  key={item.id}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute group flex items-center gap-1"
                >
                  <span className={`px-2 py-1 rounded-lg ${meta.color} text-white text-[10px] font-bold shadow-sm whitespace-nowrap`}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    aria-label={`Kaldır: ${item.label}`}
                    onClick={() =>
                      setWorkspace((prev) =>
                        prev ? { ...prev, stagePlot: prev.stagePlot.filter((sp) => sp.id !== item.id) } : prev
                      )
                    }
                    className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical Rider Editor */}
        <div className="lg:col-span-6 bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-base text-[#16274e] dark:text-white">Teknik Rider & Ses/Işık Gereksinimleri</h2>
            <button
              type="button"
              onClick={handleAiRiderDraft}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[#E45424] text-[11px] font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Rider Önerisi</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rider-stage" className="block text-[11px] font-bold mb-1">Sahne Ölçüsü</label>
              <input
                id="rider-stage"
                value={workspace.rider.stageSize}
                onChange={(e) => setWorkspace({ ...workspace, rider: { ...workspace.rider, stageSize: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
            <div>
              <label htmlFor="rider-monitors" className="block text-[11px] font-bold mb-1">Monitör Sistemi</label>
              <input
                id="rider-monitors"
                value={workspace.rider.monitors}
                onChange={(e) => setWorkspace({ ...workspace, rider: { ...workspace.rider, monitors: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
          </div>
          <div>
            <label htmlFor="rider-sound" className="block text-[11px] font-bold mb-1">Ses Gereksinimleri</label>
            <input
              id="rider-sound"
              value={workspace.rider.soundRequirements}
              onChange={(e) => setWorkspace({ ...workspace, rider: { ...workspace.rider, soundRequirements: e.target.value } })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="rider-light" className="block text-[11px] font-bold mb-1">Işık Gereksinimleri</label>
            <input
              id="rider-light"
              value={workspace.rider.lightRequirements}
              onChange={(e) => setWorkspace({ ...workspace, rider: { ...workspace.rider, lightRequirements: e.target.value } })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="rider-notes" className="block text-[11px] font-bold mb-1">Rider Notları & Patch Listesi</label>
            <textarea
              id="rider-notes"
              rows={4}
              value={workspace.rider.specialNotes}
              onChange={(e) => setWorkspace({ ...workspace, rider: { ...workspace.rider, specialNotes: e.target.value } })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Run of Show, Tasks, Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run-of-Show */}
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
          <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#E45424]" />
            <span>Gün İçi Akış (Run of Show)</span>
          </h2>
          <div className="space-y-2">
            {workspace.schedule.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                <div>
                  <span className="font-bold text-[#E45424] mr-2 tabular-nums">{item.time}</span>
                  <span className="font-medium">{item.title}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Akış maddesini sil: ${item.title}`}
                  onClick={() =>
                    setWorkspace({ ...workspace, schedule: workspace.schedule.filter((s) => s.id !== item.id) })
                  }
                  className="text-rose-600 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Saat"
              type="time"
              value={newSchedTime}
              onChange={(e) => setNewSchedTime(e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
            <input
              aria-label="Akış Başlığı"
              value={newSchedTitle}
              onChange={(e) => setNewSchedTitle(e.target.value)}
              placeholder="Örn: Soundcheck"
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
            <button
              type="button"
              aria-label="Akışa Ekle"
              onClick={handleAddSchedule}
              className="p-2 rounded-lg bg-[#16274e] text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Checklist Tasks */}
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
          <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#E45424]" />
            <span>Hazırlık Görevleri</span>
          </h2>
          <div className="space-y-2">
            {workspace.tasks.map((task) => (
              <label key={task.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() =>
                      setWorkspace({
                        ...workspace,
                        tasks: workspace.tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
                      })
                    }
                  />
                  <span className={task.completed ? 'line-through text-slate-400' : 'font-medium'}>{task.title}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Yeni Görev"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Yeni prodüksiyon görevi"
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
            <button
              type="button"
              aria-label="Görev Ekle"
              onClick={handleAddTask}
              className="p-2 rounded-lg bg-[#16274e] text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logistics */}
        <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
          <h2 className="font-bold text-sm text-[#16274e] dark:text-white flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[#E45424]" />
            <span>Ulaşım, Konaklama & Kulis</span>
          </h2>
          <div>
            <label htmlFor="log-arrival" className="block text-[11px] font-bold mb-1">Varış Saati</label>
            <input
              id="log-arrival"
              value={workspace.logistics.arrivalTime}
              onChange={(e) => setWorkspace({ ...workspace, logistics: { ...workspace.logistics, arrivalTime: e.target.value } })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="log-travel" className="block text-[11px] font-bold mb-1">Transfer / Ulaşım</label>
            <input
              id="log-travel"
              value={workspace.logistics.travelSummary}
              onChange={(e) => setWorkspace({ ...workspace, logistics: { ...workspace.logistics, travelSummary: e.target.value } })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div>
            <label htmlFor="log-accom" className="block text-[11px] font-bold mb-1">Konaklama / Kulis Notu</label>
            <textarea
              id="log-accom"
              rows={2}
              value={workspace.logistics.accommodationSummary}
              onChange={(e) => setWorkspace({ ...workspace, logistics: { ...workspace.logistics, accommodationSummary: e.target.value } })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
