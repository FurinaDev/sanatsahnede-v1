import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest, requireAuth, requireFeatureFlag } from '../middleware/auth';
import { mapConversation } from '../db/mappers';
import { newId } from '../utils/crypto';
import { notifyUser } from '../services/notificationService';
import { DraftKind, generateDraftText } from '../services/aiService';

export function createCommunicationsRouter(db: DbInstance): Router {
  const router = Router();

  // 12.3 Context-Linked Messaging
  router.post('/conversations', requireAuth, (req: AuthedRequest, res) => {
    const { contextType = 'general', contextId = '', title, participantUserIds = [], initialMessage } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Görüşme başlığı zorunludur.' });

    const participants = Array.from(new Set([req.user!.id, ...(Array.isArray(participantUserIds) ? participantUserIds : [])]));
    const convId = newId('conv');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO conversations (id, context_type, context_id, title, participant_user_ids_json, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(convId, contextType, contextId || convId, String(title).trim(), JSON.stringify(participants), now);

    if (initialMessage && String(initialMessage).trim()) {
      const senderName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_user_id, sender_name, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newId('msg'), convId, req.user!.id, senderName, String(initialMessage).trim(), now);
    }

    const created = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
    return res.status(201).json({ conversation: mapConversation(db, created) });
  });

  router.post('/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id) as any;
    if (!conv) return res.status(404).json({ error: 'Konuşma bulunamadı.' });

    const participants = parseJson<string[]>(conv.participant_user_ids_json, []);
    if (!participants.includes(req.user!.id) && !['admin', 'moderator', 'support'].includes(req.user!.activeRole)) {
      return res.status(403).json({ error: 'Bu görüşmeye mesaj gönderme yetkiniz yok.' });
    }

    const { body, attachmentUrl } = req.body || {};
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'Mesaj içeriği boş olamaz.' });

    const now = new Date().toISOString();
    const senderName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_user_id, sender_name, body, attachment_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newId('msg'), conv.id, req.user!.id, senderName, String(body).trim(), attachmentUrl || null, now);

    db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').run(now, conv.id);

    for (const pId of participants) {
      if (pId !== req.user!.id) {
        notifyUser(db, {
          userId: pId,
          type: 'new_message',
          title: `Yeni Mesaj: ${conv.title}`,
          body: `${senderName}: ${String(body).trim().slice(0, 80)}`,
          linkView: 'messages',
          linkEntityId: conv.id,
        });
      }
    }

    const updated = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conv.id);
    return res.status(201).json({ conversation: mapConversation(db, updated) });
  });

  // 12.9 Notifications
  router.post('/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    return res.json({ success: true });
  });

  router.post('/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
    return res.json({ success: true });
  });

  // Contact form persistence
  router.post('/contact', (req, res) => {
    const { name, email, phone = '', subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Ad, e-posta, konu ve mesaj alanları zorunludur.' });
    }
    const id = newId('cnt');
    db.prepare(`
      INSERT INTO contact_messages (id, name, email, phone, subject, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, String(name).trim(), String(email).trim(), String(phone).trim(), String(subject).trim(), String(message).trim(), new Date().toISOString());

    notifyUser(db, {
      userId: 'user_admin',
      type: 'contact_message',
      title: `Yeni İletişim Talebi: ${subject}`,
      body: `${name} (${email}) iletişim formu üzerinden mesaj gönderdi.`,
      linkView: 'admin_panel',
    });

    return res.status(201).json({ id, success: true });
  });

  // 14. Optional Server-Side Gemini AI Draft Helper
  router.post('/ai/draft', requireAuth, requireFeatureFlag(db, 'ai_draft_assistant'), async (req: AuthedRequest, res) => {
    const { kind, context = {} } = req.body || {};
    const allowed: DraftKind[] = ['cover_letter', 'listing_brief', 'project_brief', 'technical_rider', 'press_bio'];
    if (!allowed.includes(kind)) {
      return res.status(400).json({ error: 'Geçersiz taslak türü.' });
    }
    const result = await generateDraftText(kind, context);
    return res.json(result);
  });

  return router;
}
