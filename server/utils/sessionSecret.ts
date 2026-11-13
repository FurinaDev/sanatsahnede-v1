
export function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();

  if (configured) {
    if (configured.length < 32) {
      throw new Error('SESSION_SECRET en az 32 karakter olmalıdır.');
    }
    return configured;
  }

  // Yalnızca geliştirme ve demo ortamı için.
  if (process.env.NODE_ENV !== 'production') {
    return 'sanatsahnede-development-only-session-secret-2026-change-before-production';
  }

  throw new Error('SESSION_SECRET ortam değişkeni tanımlanmamış.');
}
