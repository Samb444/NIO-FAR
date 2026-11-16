import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { publicRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Sécurité : en-têtes HTTP avec Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // CORS restreint aux origines autorisées (ou même origine)
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          config.corsOrigins.includes(origin) ||
          origin.endsWith('.trycloudflare.com') ||
          origin.endsWith('.loca.lt') ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com')
        ) {
          return callback(null, true);
        }
        return callback(new Error('Origine non autorisée par la politique CORS'));
      },
      credentials: true,
    }),
  );

  // Limitation globale de débit sur l'API
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 2000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Veuillez patienter quelques instants.' },
  });

  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nio-far-api', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);

  // Servir le front compilé (client/dist) s'il est présent (pratique pour la prévisualisation et le déploiement)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Gestionnaire 404 API
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route API introuvable.' });
  });

  // Gestionnaire d'erreurs global (ne divulgue jamais de pile d'exécution en production)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message.includes('CORS')) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  return app;
}
