import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { config } from '../config.js';
import { getDb, resetDbForTests } from '../db/index.js';
import { reports } from '../db/schema.js';
import { seedUtilisateursDemo } from '../db/seedData.js';
import { calculerPrioriteTransparente } from '../services/priority.js';
import { executerVerificationRelances } from '../services/reminders.js';

const app = createApp();

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  const cookies = res.headers['set-cookie'] as unknown as string[];
  const csrfToken = res.body.csrfToken as string;
  return { cookies, csrfToken, user: res.body.user };
}

describe('NIO FAR — API Publique, Administration, Sécurité et Règles Métier', () => {
  beforeEach(async () => {
    await resetDbForTests();
    await seedUtilisateursDemo();
  });

  it('1. assure l’idempotence de POST /api/reports grâce à l’UUID client', async () => {
    const payload = {
      id: '11111111-2222-4333-8444-555555555555',
      code: 'NF-TEST2',
      categorie: 'dechets',
      description: 'Tas d’ordures près du terrain de foot',
      secteur: 'Pikine',
      latitude: 14.755432,
      longitude: -17.390876,
      gravite: 3,
      contact: { type: 'whatsapp', valeur: '+221 77 123 45 67' },
    };

    const res1 = await request(app).post('/api/reports').send(payload);
    expect(res1.status).toBe(201);
    expect(res1.body.id).toBe(payload.id);
    // Coordonnées arrondies à 3 décimales
    expect(res1.body.latitude).toBe(14.755);
    expect(res1.body.longitude).toBe(-17.391);

    // Second envoi avec le même UUID client (ex. resynchronisation hors-ligne)
    const res2 = await request(app).post('/api/reports').send({
      ...payload,
      description: 'Doublon réseau hors-ligne',
    });
    expect(res2.status).toBe(200);
    expect(res2.body.id).toBe(payload.id);
    expect(res2.body.code).toBe(res1.body.code);

    const listRes = await request(app).get('/api/reports');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('2. garantit l’absence de données personnelles (contact, audio, description libre) dans les routes publiques et /public/*', async () => {
    const wavBase64 =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    const creation = await request(app).post('/api/reports').send({
      id: '22222222-2222-4333-8444-555555555555',
      categorie: 'eau_stagnante',
      description: 'Description personnelle avec nom Amadou Diop 771112233',
      secteur: 'Guédiawaye',
      latitude: 14.77611,
      longitude: -17.39489,
      gravite: 2,
      audio: wavBase64,
      contact: { type: 'telephone', valeur: '+221 77 999 88 77' },
    });
    expect(creation.status).toBe(201);
    expect(creation.body.contact).toBeUndefined();
    expect(creation.body.audio).toBeNull();
    expect(creation.body.hasAudio).toBe(true);

    // Lecture publique GET /api/reports/:id
    const detail = await request(app).get(`/api/reports/${creation.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.contact).toBeUndefined();
    expect(detail.body.audio).toBeNull();

    // Open Data JSON : ni contact, ni audio, ni photo, ni description libre
    const openJson = await request(app).get('/api/public/open-data.json');
    expect(openJson.status).toBe(200);
    expect(openJson.body.signalements).toHaveLength(1);
    const item = openJson.body.signalements[0];
    expect(item.contact).toBeUndefined();
    expect(item.audio).toBeUndefined();
    expect(item.photo).toBeUndefined();
    expect(item.description).toBeUndefined();
    expect(JSON.stringify(openJson.body)).not.toContain('77 999 88 77');
    expect(JSON.stringify(openJson.body)).not.toContain('Amadou Diop');

    // Open Data CSV : ni contact, ni audio, ni description libre
    const openCsv = await request(app).get('/api/public/open-data.csv');
    expect(openCsv.status).toBe(200);
    expect(openCsv.text).not.toContain('77 999 88 77');
    expect(openCsv.text).not.toContain('Amadou Diop');
    expect(openCsv.text).toContain('eau_stagnante');
  });

  it('3. calcule le score de priorisation transparente selon la formule exacte', async () => {
    // Formule : gravité × 2 + signalements similaires + confirmations + 1 point par tranche de 3 jours
    const maintenant = new Date('2026-11-16T12:00:00Z');
    const ilYA9Jours = new Date(maintenant.getTime() - 9 * 86_400_000);

    const detail = calculerPrioriteTransparente(
      {
        gravite: 3, // 3 * 2 = 6 pts
        confirmations: 4, // 4 pts
        dateCreation: ilYA9Jours, // 9 jours -> 3 tranches de 3 jours = 3 pts
      },
      2, // 2 signalements similaires = 2 pts
      maintenant,
    );

    expect(detail.gravitePoints).toBe(6);
    expect(detail.similairesPoints).toBe(2);
    expect(detail.confirmationsPoints).toBe(4);
    expect(detail.anciennetePoints).toBe(3);
    expect(detail.score).toBe(15);
    expect(detail.explication).toContain('Gravité (3 × 2 = 6 pts)');
  });

  it('4. refuse l’accès admin sans authentification et applique les droits du rôle relais', async () => {
    const cree = await request(app).post('/api/reports').send({
      id: '33333333-2222-4333-8444-555555555555',
      categorie: 'eclairage',
      description: 'Lampadaire éteint',
      secteur: 'Keur Massar',
      gravite: 2,
    });
    const reportId = cree.body.id as string;

    // Sans authentification -> 401
    const nonAuth = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .send({ statut: 'transmis' });
    expect(nonAuth.status).toBe(401);

    // Connexion en tant que relais
    const relais = await loginAs(config.seedRelaisEmail, config.seedRelaisPassword);

    // Le relais ne peut PAS passer un signalement à « transmis » -> 403
    const relaisInterdit = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', relais.cookies)
      .set('X-CSRF-Token', relais.csrfToken)
      .send({ statut: 'transmis' });
    expect(relaisInterdit.status).toBe(403);

    // Le relais PEUT marquer « vérifié sur place » et ajouter une note -> 200
    const relaisAutorise = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', relais.cookies)
      .set('X-CSRF-Token', relais.csrfToken)
      .send({ verifieParRelais: true, note: 'Lampadaire bien éteint constaté sur place.' });
    expect(relaisAutorise.status).toBe(200);
    expect(relaisAutorise.body.verifieParRelais).toBe(true);
    expect(relaisAutorise.body.statut).toBe('a_verifier');
  });

  it('5. refuse le passage au statut « resolu » sans photo « après » ni confirmationHabitant = true', async () => {
    const cree = await request(app).post('/api/reports').send({
      id: '44444444-2222-4333-8444-555555555555',
      categorie: 'voirie',
      description: 'Nid-de-poule profond',
      secteur: 'Thiaroye',
      gravite: 3,
    });
    const reportId = cree.body.id as string;

    const admin = await loginAs(config.seedAdminEmail, config.seedAdminPassword);

    // Tentative de passer à « resolu » sans photoApres ni confirmationHabitant -> 400
    const refus = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', admin.cookies)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ statut: 'resolu', note: 'Déclaré résolu sans preuve' });
    expect(refus.status).toBe(400);
    expect(refus.body.error).toMatch(/photo « après »|confirmation de l’habitant/i);

    // Avec une photo « après » -> 200
    const accepte = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', admin.cookies)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        statut: 'resolu',
        photoApres: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        note: 'Chaussée réparée, photo jointe.',
      });
    expect(accepte.status).toBe(200);
    expect(accepte.body.statut).toBe('resolu');

    // Si l'habitant répond « toujours là », le statut repasse à « a_verifier » avec historique
    const contestation = await request(app)
      .post(`/api/reports/${reportId}/resolution-feedback`)
      .send({ verdict: 'toujours_la' });
    expect(contestation.status).toBe(200);
    expect(contestation.body.statut).toBe('a_verifier');
    expect(contestation.body.confirmationHabitant).toBe(false);
    expect(
      contestation.body.historique.some((h: { note: string }) => h.note.includes('toujours là')),
    ).toBe(true);
  });

  it('6. détecte et marque automatiquement les relances J+3 et J+7 sur « a_verifier » et « transmis »', async () => {
    const db = await getDb();
    const maintenant = new Date();
    const ilYA4Jours = new Date(maintenant.getTime() - 4 * 86_400_000);
    const ilYA8Jours = new Date(maintenant.getTime() - 8 * 86_400_000);

    await db.insert(reports).values([
      {
        id: '55555555-2222-4333-8444-555555555553',
        code: 'NF-RELJ3',
        categorie: 'dechets',
        description: 'En attente depuis 4 jours',
        secteur: 'Pikine',
        gravite: 2,
        statut: 'a_verifier',
        historique: [{ date: ilYA4Jours.toISOString(), statut: 'a_verifier', note: 'Créé' }],
        dateCreation: ilYA4Jours,
        dateMiseAJour: ilYA4Jours,
      },
      {
        id: '55555555-2222-4333-8444-555555555557',
        code: 'NF-RELJ7',
        categorie: 'eau_stagnante',
        description: 'Transmis depuis 8 jours sans nouvelle',
        secteur: 'Guédiawaye',
        gravite: 3,
        statut: 'transmis',
        historique: [{ date: ilYA8Jours.toISOString(), statut: 'transmis', note: 'Transmis' }],
        dateCreation: ilYA8Jours,
        dateMiseAJour: ilYA8Jours,
      },
    ]);

    const bilan = await executerVerificationRelances(maintenant);
    expect(bilan.marquesJ3).toContain('55555555-2222-4333-8444-555555555553');
    expect(bilan.marquesJ7).toContain('55555555-2222-4333-8444-555555555557');

    const admin = await loginAs(config.seedAdminEmail, config.seedAdminPassword);
    const remRes = await request(app)
      .get('/api/admin/reminders')
      .set('Cookie', admin.cookies);
    expect(remRes.status).toBe(200);
    expect(remRes.body.j3Count).toBe(1);
    expect(remRes.body.j7Count).toBe(1);

    // Vérifier qu'aucune relance n'est marquée validée sans action de l'admin
    const [r7] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, '55555555-2222-4333-8444-555555555557'));
    expect(r7.relanceValideeAdmin).toBe(false);
  });
});
