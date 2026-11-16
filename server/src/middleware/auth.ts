import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { RoleDB } from '../db/schema.js';

export const COOKIE_NAME = 'niofar_token';
export const CSRF_COOKIE_NAME = 'niofar_csrf';

export type JwtPayloadUser = {
  id: string;
  email: string;
  nom: string;
  role: RoleDB;
  csrf: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayloadUser;
    }
  }
}

export function signerSession(user: Omit<JwtPayloadUser, 'csrf'>): { token: string; csrf: string } {
  const csrf = crypto.randomBytes(24).toString('hex');
  const payload: JwtPayloadUser = { ...user, csrf };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '12h' });
  return { token, csrf };
}

export function poserCookiesSession(res: Response, token: string, csrf: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 12 * 3600 * 1000,
    path: '/',
  });
  res.cookie(CSRF_COOKIE_NAME, csrf, {
    httpOnly: false,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 12 * 3600 * 1000,
    path: '/',
  });
}

export function effacerCookiesSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const tokenCookie = req.cookies?.[COOKIE_NAME] as string | undefined;
  const authHeader = req.headers.authorization;
  const tokenBearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = tokenCookie || tokenBearer;

  if (!token) {
    res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayloadUser;

    // Protection CSRF pour les requêtes mutatives utilisant le cookie httpOnly
    const method = req.method.toUpperCase();
    if (tokenCookie && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const csrfHeader = (req.headers['x-csrf-token'] as string | undefined) || '';
      if (!csrfHeader || csrfHeader !== decoded.csrf) {
        res.status(403).json({
          error: 'Jeton CSRF manquant ou invalide. Rechargez la page d’administration.',
        });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Action réservée aux administrateurs. Le rôle « relais » peut uniquement marquer « vérifié sur place » et ajouter une note.',
    });
    return;
  }
  next();
}
