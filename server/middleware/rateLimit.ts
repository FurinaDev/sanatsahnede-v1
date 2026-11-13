import { Request, Response, NextFunction } from 'express';

interface Bucket {
  timestamps: number[];
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    // Allow automated test suites to bypass rate-limiting only when explicitly flagged in test env
    if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-ratelimit'] === '1') {
      return next();
    }

    const key = `${req.ip || 'local'}:${req.path}`;
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const bucket = buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      return res.status(429).json({
        error: options.message || 'Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.',
      });
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    next();
  };
}
