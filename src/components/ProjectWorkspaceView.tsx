import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../services/api';
import { formatCurrencyTRY } from '../utils/businessLogic';
import {
  ArrowLeft,
  Users,
  CheckSquare,
  Calendar,
  Wallet,
  FileText,
  Scale,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

interface ProjectWorkspaceViewProps {
  projectId?: string;
}

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({ projectId }) => {
  const {
    projects,
    projectApplications,
    currentUser,
    isAuthenticated,
    refreshBootstrap,
    navigateTo,
  } = useApp();

  const project = projects.find((p) => p.id === projectId) || projects[0];
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'meetings' | 'expenses' | 'files' | 'rights'>('members');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('2027-01-18');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [rightsDraft, setRightsDraft] = useState(project?.rightsAgreement || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setRightsDraft(project?.rightsAgreement || '');
  }, [project?.id, project?.rightsAgreement]);

  if (!project) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Proje bulunamadı.</p>
        <button type="button" onClick={() => navigateTo('project_lab')} className="text-xs font-bold text-[#E45424] cursor-pointer">
          Proje Lab&apos;a Dön
        </button>
      </div>
    );
  }

  const isOwner = isAuthenticated && (project.ownerUserId === currentUser.id || currentUser.activeRole === 'admin');
  const isParticipant =
    isAuthenticated &&
    (isOwner || project.members.some((m) => m.userId === currentUser.id));

  const apps = projectApplications.filter((a) => a.projectId === project.id);

  const patchProject = async (payload: Record<string, any>, successMsg: string) => {
    setFeedback(null);
    try {
      await apiRequest(`/api/projects/${project.id}`, { method: 'PATCH', body: payload });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: successMsg });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Proje güncellenemedi.' });
    }
  };

  const handleDecideApp = async (appId: string, decision: 'accepted' | 'rejected' | 'shortlisted') => {
    setFeedback(null);
    try {
      await apiRequest(`/api/projects/${project.id}/applications/${appId}/decide`, {
        method: 'POST',
        body: { decision },
      });
      await refreshBootstrap();
      setFeedback({ type: 'success', text: decision === 'accepted' ? 'Başvuru onaylandı ve aday ekibe eklendi.' : 'Başvuru durumu güncellendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Karar kaydedilemedi.' });
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <button
            type="button"
            onClick={() => navigateTo('project_lab')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#E45424] mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Proje Lab&apos;a Dön</span>
          </button>
          <h1 className="font-display text-2xl font-extrabold text-[#16274e] dark:text-white">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Yürütücü: {project.ownerName} · {project.city} · Durum: {project.status}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo('production_desk', `project:${project.id}`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Prodüksiyon Masasını Aç</span>
        </button>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {!isParticipant && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          Bu proje çalışma alanını salt okunur görüntülüyorsunuz. Düzenleme yapmak için projeye katılmış olmanız gerekir.
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'members', label: `Ekip & Başvurular (${project.members.length})`, icon: Users },
          { id: 'tasks', label: `Görevler (${project.tasks.length})`, icon: CheckSquare },
          { id: 'meetings', label: `Toplantılar (${project.meetings.length})`, icon: Calendar },
          { id: 'expenses', label: `Harcamalar (${project.expenses.length})`, icon: Wallet },
          { id: 'files', label: `Dosyalar (${project.files.length})`, icon: FileText },
          { id: 'rights', label: 'Hak & Telif Paylaşımı', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#E45424] text-white border-[#E45424]'
                  : 'bg-white dark:bg-[#13213e] border-slate-200 dark:border-[#1e335a] text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-6 space-y-5">
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-sm text-[#16274e] dark:text-white mb-3">Aktif Proje Ekibi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.members.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                    <div className="text-[#E45424] font-semibold mt-0.5">{m.roleTitle}</div>
                  </div>
                ))}
              </div>
            </div>

            {isOwner && (
              <div>
                <h2 className="font-bold text-sm text-[#16274e] dark:text-white mb-3">Gelen Rol Başvuruları ({apps.length})</h2>
                {apps.length === 0 ? (
                  <p className="text-xs text-slate-500">Henüz rol başvurusu bulunmuyor.</p>
                ) : (
                  <div className="space-y-2.5">
                    {apps.map((app) => (
                      <div key={app.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{app.applicantName} · {app.roleTitle}</div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{app.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-lg bg-white dark:bg-[#13213e] font-bold">{app.status}</span>
                          {app.status === 'submitted' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDecideApp(app.id, 'accepted')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                              >
                                Ekibe Kabul Et
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecideApp(app.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                              >
                                Reddet
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {project.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                  <span className={t.status === 'done' ? 'line-through text-slate-400' : 'font-semibold'}>{t.title}</span>
                  {isParticipant && (
                    <button
                      type="button"
                      onClick={() =>
                        patchProject(
                          {
                            tasks: project.tasks.map((x) =>
                              x.id === t.id ? { ...x, status: x.status === 'done' ? 'todo' : 'done' } : x
                            ),
                          },
                          'Görev durumu güncellendi.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#13213e] border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                    >
                      {t.status === 'done' ? 'Tamamlandı' : 'Tamamla'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isParticipant && (
              <div className="flex gap-2">
                <input
                  aria-label="Yeni Görev Başlığı"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Yeni proje görevi..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTaskTitle.trim()) return;
                    patchProject(
                      {
                        tasks: [
                          ...project.tasks,
                          { id: `pt_${Date.now()}`, title: newTaskTitle.trim(), assigneeName: currentUser.firstName, dueDate: project.deliveryDate, status: 'todo' },
                        ],
                      },
                      'Görev eklendi.'
                    );
                    setNewTaskTitle('');
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {project.meetings.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                  <div className="font-bold">{m.title}</div>
                  <div className="text-slate-500 mt-0.5">{m.meetingDate} · {m.notes}</div>
                </div>
              ))}
            </div>
            {isParticipant && (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Toplantı Başlığı"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Toplantı / Prova başlığı"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <input
                  aria-label="Toplantı Tarihi"
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newMeetingTitle.trim()) return;
                    patchProject(
                      {
                        meetings: [
                          ...project.meetings,
                          { id: `pm_${Date.now()}`, title: newMeetingTitle.trim(), meetingDate: newMeetingDate, notes: 'Planlandı' },
                        ],
                      },
                      'Toplantı takvime eklendi.'
                    );
                    setNewMeetingTitle('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
                >
                  Toplantı Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {project.expenses.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                  <span className="font-medium">{ex.title}</span>
                  <span className="font-bold text-[#E45424]">{formatCurrencyTRY(ex.amount)}</span>
                </div>
              ))}
            </div>
            {isParticipant && (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Harcama Kalemi"
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                  placeholder="Harcama açıklaması"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <input
                  aria-label="Harcama Tutarı"
                  type="number"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="Tutar (TRY)"
                  className="w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newExpenseTitle.trim() || !Number(newExpenseAmount)) return;
                    patchProject(
                      {
                        expenses: [
                          ...project.expenses,
                          { id: `pex_${Date.now()}`, title: newExpenseTitle.trim(), amount: Number(newExpenseAmount), recordedAt: new Date().toISOString().slice(0, 10) },
                        ],
                      },
                      'Bütçe harcama kalemi kaydedildi.'
                    );
                    setNewExpenseTitle('');
                    setNewExpenseAmount('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
                >
                  Harcama Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {project.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] text-xs">
                  <span className="font-bold">{f.name}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[#E45424] font-semibold hover:underline">
                    Bağlantıyı Aç
                  </a>
                </div>
              ))}
            </div>
            {isParticipant && (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Dosya Adı"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Nota / Konsept Dosya Adı"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <input
                  aria-label="Dosya Bağlantısı"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFileName.trim() || !newFileUrl.trim()) return;
                    patchProject(
                      {
                        files: [
                          ...project.files,
                          { id: `pf_${Date.now()}`, name: newFileName.trim(), url: newFileUrl.trim(), uploadedBy: currentUser.firstName },
                        ],
                      },
                      'Dosya bağlantısı eklendi.'
                    );
                    setNewFileName('');
                    setNewFileUrl('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
                >
                  Dosya Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rights' && (
          <div className="space-y-3">
            <label htmlFor="rights-textarea" className="block text-xs font-bold">Eser, İcra & Gelir Paylaşım Protokolü</label>
            <textarea
              id="rights-textarea"
              rows={4}
              disabled={!isParticipant}
              value={rightsDraft}
              onChange={(e) => setRightsDraft(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
            {isParticipant && (
              <button
                type="button"
                onClick={() => patchProject({ rightsAgreement: rightsDraft }, 'Hak ve telif paylaşım metni kaydedildi.')}
                className="px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
              >
                Protokolü Kaydet
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
