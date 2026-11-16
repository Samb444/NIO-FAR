import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  effacerCookiesSession,
  poserCookiesSession,
  requireAuth,
  signerSession,
} from '../middleware/auth.js';
import { loginSchema } from '../validation/schemas.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});

authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    res.status(401).json({ error: 'Identifiants invalides.' });
    return;
  }

  const valide = await argon2.verify(user.passwordHash, parsed.data.password);
  if (!valide) {
    res.status(401).json({ error: 'Identifiants invalides.' });
    return;
  }

  const { token, csrf } = signerSession({
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
  });

  poserCookiesSession(res, token, csrf);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
    },
    csrfToken: csrf,
  });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  effacerCookiesSession(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      nom: req.user.nom,
      role: req.user.role,
    },
    csrfToken: req.user.csrf,
  });
});
