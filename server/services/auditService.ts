import { DbInstance } from '../db/database';
import { newId } from '../utils/crypto';

export function logAudit(
  db: DbInstance,
  input: {
    userId: string | null;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
  }
): void {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId('audit'),
    input.userId,
    input.action,
    input.resourceType,
    input.resourceId,
    JSON.stringify(input.details ?? {}),
    new Date().toISOString()
  );
}
