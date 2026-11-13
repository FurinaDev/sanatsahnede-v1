import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry } from '../types';
import { formatCurrencyTRY } from '../utils/businessLogic';
import { apiRequest } from '../services/api';
import {
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

const STAFF_ROLES = ['admin', 'moderator', 'finance_admin', 'verification_officer', 'support'];

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    activeRole,
    settings,
    adminUpdateCommission,
    verifications,
    adminApproveVerification,
    adminRejectVerification,
    moderateEntity,
    resolveDispute,
    toggleFeatureFlag,
    listings,
    events,
    opportunities,
    bookings,
    disputes,
    ledger,
    featureFlags,
    resetAllData,
    setAuthModalMode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'kpis' | 'verifications' | 'moderation' | 'disputes' | 'ledger' | 'commission' | 'flags' | 'audit'>('kpis');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState(settings.commissionRate);
  const [commissionModel, setCommissionModel] = useState(settings.commissionModel);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [resolutionNote, setResolutionNote] = useState('');

  const isStaff = isAuthenticated && STAFF_ROLES.includes(activeRole);

  useEffect(() => {
    if (isStaff) {
      apiRequest<{ auditLogs: AuditLogEntry[] }>('/api/admin/overview')
        .then((res) => setAuditLogs(res.auditLogs || []))
        .catch(() => setAuditLogs([]));
    }
  }, [isStaff, activeTab]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f172a] dark:text-white">Yönetim Paneli İçin Giriş Yapın</h2>
        <button type="button" onClick={() => setAuthModalMode('login')} className="px-5 py-2.5 rounded-xl bg-[#f25922] text-white text-xs font-bold cursor-pointer">
          Giriş Yap
        </button>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-[#13213e] rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Yetkisiz Erişim</h2>
        <p className="text-xs text-[#64748b] dark:text-slate-400">
          Bu panel yalnızca platform yöneticileri, moderatörler, finans veya doğrulama uzmanları içindir ({currentUser.email}).
        </p>
      </div>
    );
  }

  const totalVolume = bookings.reduce((sum, b) => sum + b.grossAmount, 0);
  const totalCommissionEarned = bookings.reduce((sum, b) => sum + b.commissionAmount, 0);
  const activeListingsCount = listings.filter((l) => l.status === 'active').length;
  const pendingVerificationsCount = verifications.filter((v) => v.status === 'pending').length;

  const pendingListings = listings.filter((l) => l.status === 'pending_moderation');
  const pendingEvents = events.filter((e) => e.status === 'pending_moderation');
  const pendingOpportunities = opportunities.filter((o) => o.status === 'pending_moderation');
  const totalModerationCount = pendingListings.length + pendingEvents.length + pendingOpportunities.length;

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminUpdateCommission(commissionRate, commissionModel);
    if (res.success) {
      setSavedSettingsNotice(true);
      setTimeout(() => setSavedSettingsNotice(false), 3000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    await adminRejectVerification(rejectingId, rejectReason || 'Belgeler sicil şartlarına uygun görülmedi.');
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      <div className="bg-gradient-to-br from-[#16274e] via-[#12161b] to-[#0c0e12] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="label-caps text-[#ff8a65]">
              Yönetici &amp; Operasyon Merkezi ({activeRole})
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 tracking-tight">Platform Yönetim &amp; Denetim Paneli</h1>
            <p className="text-xs text-slate-300 mt-1">
              KYC akreditasyonu, ön moderasyon kuyruğu, uyuşmazlık çözümü, finansal defter ve özellik bayrakları.
            </p>
          </div>

          {activeRole === 'admin' && (
            confirmReset ? (
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2 self-start sm:self-auto">
                <span className="text-xs text-slate-200">Tüm veriler sıfırlansın mı?</span>
                <button
                  type="button"
                  onClick={async () => {
                    await resetAllData();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#f25922] rounded-lg cursor-pointer"
                >
                  Evet, Sıfırla
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className="px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer">
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Demo Verileri Sıfırla</span>
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10 overflow-x-auto text-xs">
          {[
            { id: 'kpis', label: 'Metrikler' },
            { id: 'verifications', label: `Doğrulama (${pendingVerificationsCount})` },
            { id: 'moderation', label: `Ön Moderasyon (${totalModerationCount})` },
            { id: 'disputes', label: `Uyuşmazlıklar (${disputes.filter((d) => d.status === 'open').length})` },
            { id: 'ledger', label: `Finansal Defter (${ledger.length})` },
            { id: 'commission', label: 'Komisyon' },
            { id: 'flags', label: 'Özellik Bayrakları' },
            { id: 'audit', label: 'Denetim Logları' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-[#f25922] text-white font-bold shadow-sm' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'kpis' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Toplam Rezervasyon Hacmi</div>
            <div className="font-display text-2xl font-bold text-[#0f172a] dark:text-white tabular-nums">{formatCurrencyTRY(totalVolume)}</div>
          </div>
          <div className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Platform Komisyon Geliri</div>
            <div className="font-display text-2xl font-bold text-[#f25922] tabular-nums">{formatCurrencyTRY(totalCommissionEarned)}</div>
          </div>
          <div className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Aktif Yayındaki İlanlar</div>
            <div className="font-display text-2xl font-bold text-[#0f172a] dark:text-white tabular-nums">{activeListingsCount}</div>
          </div>
          <div className="bg-white dark:bg-[#13213e] p-6 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] shadow-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Moderasyon &amp; Onay Bekleyen</div>
            <div className="font-display text-2xl font-bold text-[#16274e] dark:text-white tabular-nums">{pendingVerificationsCount + totalModerationCount}</div>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Akreditasyon &amp; Belge İnceleme Havuzu</h2>
          {verifications.length === 0 ? (
            <p className="text-xs text-[#64748b]">Doğrulama başvurusu bulunmamaktadır.</p>
          ) : (
            verifications.map((v) => (
              <div key={v.id} className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#0f172a] dark:text-white">{v.entityName} ({v.accountType})</div>
                  <div className="text-xs text-[#475569] dark:text-slate-300 flex flex-wrap gap-2">
                    {v.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {doc.title}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.status === 'pending' ? (
                    <>
                      <button type="button" onClick={() => adminApproveVerification(v.id)} className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 rounded-xl flex items-center gap-1 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                      </button>
                      <button type="button" onClick={() => setRejectingId(v.id)} className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-xl cursor-pointer">
                        Reddet
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800">{v.status}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-6">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">İçerik Ön Moderasyon Kuyruğu</h2>
          {totalModerationCount === 0 ? (
            <p className="text-xs text-[#64748b]">Moderasyon bekleyen ilan, etkinlik veya fırsat bulunmamaktadır.</p>
          ) : (
            <div className="space-y-4">
              {pendingListings.map((l) => (
                <div key={l.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#f25922]">İlan Onayı</span>
                    <div className="text-sm font-bold text-[#0f172a] dark:text-white">{l.title}</div>
                    <div className="text-xs text-[#64748b]">{l.businessName} · {l.city} · {formatCurrencyTRY(l.budgetAmount)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderateEntity('listing', l.id, 'approve')} className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">Yayınla</button>
                    <button type="button" onClick={() => moderateEntity('listing', l.id, 'reject')} className="px-3.5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold cursor-pointer">Reddet</button>
                  </div>
                </div>
              ))}
              {pendingEvents.map((ev) => (
                <div key={ev.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#f25922]">Etkinlik Duyurusu</span>
                    <div className="text-sm font-bold text-[#0f172a] dark:text-white">{ev.title}</div>
                    <div className="text-xs text-[#64748b]">{ev.venueName}, {ev.city} · {ev.eventDate}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderateEntity('event', ev.id, 'approve')} className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">Yayınla</button>
                    <button type="button" onClick={() => moderateEntity('event', ev.id, 'reject')} className="px-3.5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold cursor-pointer">Reddet</button>
                  </div>
                </div>
              ))}
              {pendingOpportunities.map((op) => (
                <div key={op.id} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#f25922]">Fırsat Radarı</span>
                    <div className="text-sm font-bold text-[#0f172a] dark:text-white">{op.title}</div>
                    <div className="text-xs text-[#64748b]">{op.organizerName} · {op.rewardInfo}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderateEntity('opportunity', op.id, 'approve')} className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">Yayınla</button>
                    <button type="button" onClick={() => moderateEntity('opportunity', op.id, 'reject')} className="px-3.5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold cursor-pointer">Reddet</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Uyuşmazlık Çözüm Masası</h2>
          {disputes.length === 0 ? (
            <p className="text-xs text-[#64748b]">Açık veya çözümlenmiş uyuşmazlık kaydı yok.</p>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f172a] dark:text-white">Rezervasyon: {d.bookingId} — {d.reason}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold">{d.status}</span>
                </div>
                <p className="text-[#475569] dark:text-slate-300">{d.evidenceNotes}</p>
                {d.status === 'open' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Çözüm gerekçesi..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-[#e2e8f0] dark:border-[#1e335a] bg-white dark:bg-[#13213e]"
                    />
                    <button
                      type="button"
                      onClick={() => resolveDispute(d.id, 'resolved_refund', resolutionNote || 'İşverene tam iade')}
                      className="px-3.5 py-2 rounded-xl bg-rose-700 text-white font-bold cursor-pointer"
                    >
                      İşverene İade Et
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveDispute(d.id, 'resolved_release', resolutionNote || 'İcracı hakedişi serbest bırakıldı')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      Sanatçıya Aktar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Değişmez Finansal Defter (Ledger)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#1e335a] text-[#64748b]">
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Rezervasyon</th>
                  <th className="py-2 pr-3">İşlem Türü</th>
                  <th className="py-2 pr-3">Tutar</th>
                  <th className="py-2 pr-3">Sağlayıcı / Mod</th>
                  <th className="py-2">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#e2e8f0]/60 dark:border-[#1e335a]/60">
                    <td className="py-2.5 pr-3 tabular-nums">{entry.createdAt.slice(0, 10)}</td>
                    <td className="py-2.5 pr-3 font-mono">{entry.bookingId}</td>
                    <td className="py-2.5 pr-3 font-bold text-[#f25922]">{entry.entryType}</td>
                    <td className="py-2.5 pr-3 font-bold tabular-nums">{formatCurrencyTRY(entry.amount)}</td>
                    <td className="py-2.5 pr-3">{entry.provider} ({entry.mode})</td>
                    <td className="py-2.5 text-[#475569] dark:text-slate-300">{entry.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commission' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] max-w-2xl space-y-6">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Komisyon Modeli ve Oran Yönetimi</h2>
          {savedSettingsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 rounded-xl">
              Komisyon ayarları güncellendi!
            </div>
          )}
          <form onSubmit={handleSaveCommission} className="space-y-4">
            <label className="flex items-start gap-3 p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] cursor-pointer">
              <input type="radio" name="commModel" checked={commissionModel === 'A_EMPLOYER_PAYS'} onChange={() => setCommissionModel('A_EMPLOYER_PAYS')} className="mt-1" />
              <div className="text-xs">
                <div className="font-bold">Model A — Komisyon İşverenin Ödemesine Eklenir</div>
                <p className="text-[#64748b] mt-0.5">Sanatçı net hakedişi tam alır.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 rounded-2xl border border-[#e2e8f0] dark:border-[#1e335a] cursor-pointer">
              <input type="radio" name="commModel" checked={commissionModel === 'B_ARTIST_DEDUCTS'} onChange={() => setCommissionModel('B_ARTIST_DEDUCTS')} className="mt-1" />
              <div className="text-xs">
                <div className="font-bold">Model B — Komisyon Sanatçı Hakedişinden Kesilir</div>
                <p className="text-[#64748b] mt-0.5">İşveren brüt öder, komisyon kesilir.</p>
              </div>
            </label>
            <div>
              <label className="text-xs font-bold block mb-1">Komisyon Oranı (%)</label>
              <input type="number" min="0" max="30" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} className="w-32 text-sm font-bold p-3 border border-[#e2e8f0] dark:border-[#1e335a] rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38]" />
            </div>
            <button type="submit" className="px-6 py-2.5 text-xs font-bold text-white bg-[#16274e] dark:bg-[#f25922] rounded-xl cursor-pointer">
              Ayarları Kaydet
            </button>
          </form>
        </div>
      )}

      {activeTab === 'flags' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Modül &amp; Özellik Bayrakları (Feature Flags)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featureFlags.map((flag) => (
              <div key={flag.flagKey} className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#0f172a] dark:text-white">{flag.label}</div>
                  <div className="text-[11px] text-[#64748b]">{flag.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFeatureFlag(flag.flagKey, !flag.enabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    flag.enabled ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-800'
                  }`}
                >
                  {flag.enabled ? 'Aktif' : 'Kapalı'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#13213e] p-6 sm:p-8 rounded-3xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f172a] dark:text-white">Sistem Denetim Kayıtları (Audit Logs)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0f1c38] border border-[#e2e8f0] dark:border-[#1e335a] flex flex-wrap justify-between gap-2">
                <span><strong>{log.action}</strong> · {log.resourceType}:{log.resourceId}</span>
                <span className="text-[#64748b] tabular-nums">{log.createdAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13213e] rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-[#e2e8f0] dark:border-[#1e335a] space-y-4">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-white">Başvuruyu Reddet</h3>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Gerekçe belirtin..."
              className="w-full text-xs p-3 border border-[#e2e8f0] dark:border-[#1e335a] bg-[#f8fafc] dark:bg-[#0f1c38] rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectingId(null)} className="px-4 py-2 text-xs font-semibold">Vazgeç</button>
              <button type="button" onClick={handleConfirmReject} className="px-4 py-2 text-xs font-bold text-white bg-rose-700 rounded-xl cursor-pointer">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
