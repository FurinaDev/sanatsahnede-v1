import 'dotenv/config';
import path from 'path';
import { pathToFileURL } from 'url';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { openDatabase, DbInstance } from './server/db/database';
import { initSchema } from './server/db/schema';
import { seedDatabase } from './server/db/seed';
import { attachSessionUser } from './server/middleware/auth';
import { createAuthRouter } from './server/modules/auth';
import { createBootstrapRouter } from './server/modules/bootstrap';
import { createProfilesRouter } from './server/modules/profiles';
import { createMarketplaceRouter } from './server/modules/marketplace';
import { createEventsRouter } from './server/modules/events';
import { createVenuesRouter } from './server/modules/venues';
import { createProductionRouter } from './server/modules/production';
import { createEcosystemRouter } from './server/modules/ecosystem';
import { createCommunicationsRouter } from './server/modules/communications';
import { createAdminRouter } from './server/modules/admin';

export function createApp(options?: { dbPath?: string }): { app: Express; db: DbInstance } {
  const dbPath = options?.dbPath || process.env.DATABASE_PATH || './data/sanatsahnede.db';
  const db = openDatabase(dbPath);
  initSchema(db);
  seedDatabase(db);

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(attachSessionUser(db));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sanatsahnede-api', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api', createBootstrapRouter(db));
  app.use('/api', createProfilesRouter(db));
  app.use('/api', createMarketplaceRouter(db));
  app.use('/api/events', createEventsRouter(db));
  app.use('/api', createVenuesRouter(db));
  app.use('/api', createProductionRouter(db));
  app.use('/api', createEcosystemRouter(db));
  app.use('/api', createCommunicationsRouter(db));
  app.use('/api/admin', createAdminRouter(db));

  return { app, db };
}

async function startServer() {
  const { app } = createApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`SanatSahnede full-stack server running on http://0.0.0.0:${port}`);
  });
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start SanatSahnede server:', err);
    process.exit(1);
  });
}
