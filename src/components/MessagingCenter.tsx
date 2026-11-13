import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Send, Plus } from 'lucide-react';

export const MessagingCenter: React.FC = () => {
  const {
    conversations,
    currentUser,
    isAuthenticated,
    setAuthModalMode,
    sendMessage,
    startConversation,
    artists,
    businesses,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id || '');
  const [messageDraft, setMessageDraft] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTargetUserId, setNewTargetUserId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-10 text-center space-y-4">
        <MessageSquare className="w-10 h-10 text-[#E45424] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#16274e] dark:text-white">Bağlam Bazlı Mesaj Merkezi</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          İlan, teklif, prodüksiyon ve mekân görüşmelerinizi görüntülemek için giriş yapın.
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

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  const directoryRecipients = [
    ...artists.filter((a) => a.userId !== currentUser.id).map((a) => ({ userId: a.userId, label: `Sanatçı: ${a.fullName}` })),
    ...businesses.filter((b) => b.userId !== currentUser.id).map((b) => ({ userId: b.userId, label: `Kurum: ${b.businessName}` })),
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !messageDraft.trim()) return;
    setErrorMsg(null);
    const res = await sendMessage(activeConv.id, messageDraft.trim());
    if (res.success) {
      setMessageDraft('');
    } else {
      setErrorMsg(res.error || 'Mesaj gönderilemedi.');
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = newTargetUserId || directoryRecipients[0]?.userId;
    if (!targetId || !newTitle.trim()) return;
    setErrorMsg(null);
    const res = await startConversation({
      contextType: 'direct',
      contextId: targetId,
      title: newTitle.trim(),
      participantUserIds: [targetId],
      initialMessage: newBody.trim(),
    });
    if (res.success) {
      if (res.conversation?.id) setSelectedId(res.conversation.id);
      setShowNewThread(false);
      setNewTitle('');
      setNewBody('');
    } else {
      setErrorMsg(res.error || 'Görüşme başlatılamadı.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#E45424]">12.3 · Bağlam Bazlı İletişim</span>
          <h1 className="font-display text-2xl font-extrabold text-[#16274e] dark:text-white mt-0.5">Mesaj Merkezi</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowNewThread((p) => !p)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E45424] text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görüşme Başlat</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {showNewThread && (
        <form onSubmit={handleCreateThread} className="bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="msg-recipient" className="block text-[11px] font-bold mb-1">Alıcı</label>
              <select
                id="msg-recipient"
                value={newTargetUserId || directoryRecipients[0]?.userId || ''}
                onChange={(e) => setNewTargetUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              >
                {directoryRecipients.map((r) => (
                  <option key={r.userId} value={r.userId}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="msg-subject" className="block text-[11px] font-bold mb-1">Görüşme Başlığı</label>
              <input
                id="msg-subject"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Örn: Sahne & Repertuvar Görüşmesi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
              />
            </div>
          </div>
          <div>
            <label htmlFor="msg-initial" className="block text-[11px] font-bold mb-1">İlk Mesaj</label>
            <textarea
              id="msg-initial"
              rows={2}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewThread(false)} className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">İptal</button>
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#16274e] text-white text-xs font-bold cursor-pointer">Başlat</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[420px]">
        {/* Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Henüz aktif görüşmeniz bulunmuyor.</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  activeConv?.id === conv.id
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-[#E45424]'
                    : 'bg-slate-50/70 dark:bg-[#0B1120] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-[#E45424]">{conv.contextType}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">{conv.title}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {conv.messages[conv.messages.length - 1]?.body || 'Mesaj yok'}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-8 bg-white dark:bg-[#13213e] rounded-2xl border border-slate-200 dark:border-[#1e335a] p-5 flex flex-col justify-between">
          {!activeConv ? (
            <div className="m-auto text-sm text-slate-500">Görüntülemek için soldan bir görüşme seçin veya yeni görüşme başlatın.</div>
          ) : (
            <>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="text-[10px] font-bold uppercase text-[#E45424]">{activeConv.contextType}</div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white">{activeConv.title}</h2>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
                {activeConv.messages.map((m) => {
                  const isMine = m.senderUserId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                          isMine
                            ? 'bg-[#16274e] text-white'
                            : 'bg-slate-100 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold opacity-75 mb-0.5">{m.senderName}</div>
                        <p className="leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  aria-label="Mesajınız"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E45424] hover:bg-[#c94317] text-white text-xs font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gönder</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
