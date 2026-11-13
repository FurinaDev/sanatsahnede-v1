import { DbInstance } from '../db/database';
import { newId } from '../utils/crypto';

export function notifyUser(
  db: DbInstance,
  input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    linkView?: string;
    linkEntityId?: string;
  }
): void {
  if (!input.userId) return;
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link_view, link_entity_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    newId('not'),
    input.userId,
    input.type,
    input.title,
    input.body,
    input.linkView ?? null,
    input.linkEntityId ?? null,
    new Date().toISOString()
  );
}
