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

describe('NIO FAR — API Publique, Administration, Prédiction, Points Citoyens et Règles Métier', () => {
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
    expect(res1.body.latitude).toBe(14.755);
    expect(res1.body.longitude).toBe(-17.391);

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

    const detail = await request(app).get(`/api/reports/${creation.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.contact).toBeUndefined();
    expect(detail.body.audio).toBeNull();

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

    const openCsv = await request(app).get('/api/public/open-data.csv');
    expect(openCsv.status).toBe(200);
    expect(openCsv.text).not.toContain('77 999 88 77');
    expect(openCsv.text).not.toContain('Amadou Diop');
    expect(openCsv.text).toContain('eau_stagnante');
  });

  it('3. calcule le score de priorisation transparente selon la formule exacte', async () => {
    const maintenant = new Date('2026-11-16T12:00:00Z');
    const ilYA9Jours = new Date(maintenant.getTime() - 9 * 86_400_000);

    const detail = calculerPrioriteTransparente(
      {
        gravite: 3,
        confirmations: 4,
        dateCreation: ilYA9Jours,
      },
      2,
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

    const nonAuth = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .send({ statut: 'transmis' });
    expect(nonAuth.status).toBe(401);

    const relais = await loginAs(config.seedRelaisEmail, config.seedRelaisPassword);

    const relaisInterdit = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', relais.cookies)
      .set('X-CSRF-Token', relais.csrfToken)
      .send({ statut: 'transmis' });
    expect(relaisInterdit.status).toBe(403);

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

    const refus = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Cookie', admin.cookies)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ statut: 'resolu', note: 'Déclaré résolu sans preuve' });
    expect(refus.status).toBe(400);
    expect(refus.body.error).toMatch(/photo « après »|confirmation de l’habitant/i);

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

    const [r7] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, '55555555-2222-4333-8444-555555555557'));
    expect(r7.relanceValideeAdmin).toBe(false);
  });

  it('7. module « Points noirs » : applique le garde-fou < 30 signalements (« Données insuffisantes ») et explique chaque score', async () => {
    // Base vide -> tous les secteurs ont < 30 signalements -> Données insuffisantes
    const resVide = await request(app).get('/api/public/hotspots');
    expect(resVide.status).toBe(200);
    expect(resVide.body.mentionLegale).toContain('Indicatif, basé sur les données de NIO FAR');
    const pikineVide = resVide.body.secteurs.find((s: { secteur: string }) => s.secteur === 'Pikine');
    expect(pikineVide.donneesSuffisantes).toBe(false);
    expect(pikineVide.statutAffichage).toContain('Données insuffisantes');
    expect(pikineVide.scoreGlobalSecteur).toBeNull();

    // Chargement des exemples fictifs (Pikine >= 30, Guédiawaye >= 30, Keur Massar < 30)
    await request(app).post('/api/reports/examples');
    const resCharge = await request(app).get('/api/public/hotspots');
    expect(resCharge.status).toBe(200);

    const pikine = resCharge.body.secteurs.find((s: { secteur: string }) => s.secteur === 'Pikine');
    expect(pikine.donneesSuffisantes).toBe(true);
    expect(pikine.totalSignalementsSecteur).toBeGreaterThanOrEqual(30);
    expect(typeof pikine.scoreGlobalSecteur).toBe('number');
    expect(pikine.parCategorie[0].facteurs).toHaveLength(4);

    const keurMassar = resCharge.body.secteurs.find((s: { secteur: string }) => s.secteur === 'Keur Massar');
    expect(keurMassar.donneesSuffisantes).toBe(false);
    expect(keurMassar.statutAffichage).toContain('Données insuffisantes');
  });

  it('8. points citoyens : OTP facultatif, crédit seulement après vérification, 0 pour doublon, retrait malveillant et PayoutProvider en mode simulation', async () => {
    // 1. Demande OTP + Vérification
    const otpReq = await request(app)
      .post('/api/citizen/otp/request')
      .send({ telephone: '+221 77 123 45 67', secteur: 'Pikine' });
    expect(otpReq.status).toBe(200);
    expect(otpReq.body.codeOtpDemo).toMatch(/^\d{6}$/);

    const otpVer = await request(app).post('/api/citizen/otp/verify').send({
      telephone: '+221 77 123 45 67',
      code: otpReq.body.codeOtpDemo,
      secteur: 'Pikine',
    });
    expect(otpVer.status).toBe(200);
    const citizenId = otpVer.body.citizen.id as string;
    expect(otpVer.body.citizen.pointsBalance).toBe(0);

    // 2. Signalement créé avec citizenId -> 0 point avant vérification
    const sig1 = await request(app).post('/api/reports').send({
      id: '77777777-2222-4333-8444-555555555501',
      categorie: 'dechets',
      description: 'Dépôt sauvage à Pikine',
      secteur: 'Pikine',
      gravite: 2,
      citizenId,
    });
    expect(sig1.status).toBe(201);
    expect(sig1.body.pointsAttribues).toBe(0);

    // 3. Vérification par l'admin -> +10 points citoyens dans le ledger
    const admin = await loginAs(config.seedAdminEmail, config.seedAdminPassword);
    const verif1 = await request(app)
      .patch(`/api/admin/reports/${sig1.body.id}/status`)
      .set('Cookie', admin.cookies)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ verifieParRelais: true, statut: 'transmis' });
    expect(verif1.status).toBe(200);
    expect(verif1.body.pointsAttribues).toBe(10);

    // 4. Marquage doublon -> retrait des 10 points (0 point pour les doublons)
    const dup1 = await request(app)
      .patch(`/api/admin/reports/${sig1.body.id}/duplicate`)
      .set('Cookie', admin.cookies)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ estDoublon: true });
    expect(dup1.status).toBe(200);
    expect(dup1.body.pointsAttribues).toBe(0);

    const profApresDup = await request(app).get(`/api/citizen/${citizenId}/profile`);
    expect(profApresDup.body.citizen.pointsBalance).toBe(0);

    // 5. Classement public par quartier (jamais d'individu exposé)
    const lb = await request(app).get('/api/public/leaderboard');
    expect(lb.status).toBe(200);
    expect(lb.body.politiqueConfidentialite).toContain('uniquement par quartier');

    // 6. Catalogue de récompenses : mention « Récompenses en cours de lancement » et sponsors vides
    const cat = await request(app).get('/api/public/rewards');
    expect(cat.status).toBe(200);
    expect(cat.body.mention).toBe('Récompenses en cours de lancement');
    expect(cat.body.modePaiement).toBe('SIMULATION');
    expect(cat.body.items[0].sponsorNom).toBe('');
  });
});
