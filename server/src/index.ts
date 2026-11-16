import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { reports } from './db/schema.js';
import { chargerExemplesFictifsEnBase, seedUtilisateursDemo } from './db/seedData.js';
import { demarrerCronRelances, executerVerificationRelances } from './services/reminders.js';
import { appliquerConservationDonnees } from './services/retention.js';

async function bootstrap() {
  const db = await getDb();
  await seedUtilisateursDemo(db);

  // Si la base est vide au premier démarrage, précharger les exemples étiquetés « Exemple fictif »
  const existants = await db.select({ id: reports.id }).from(reports);
  if (existants.length === 0) {
    await chargerExemplesFictifsEnBase(db);
  }

  await executerVerificationRelances();
  await appliquerConservationDonnees();
  demarrerCronRelances();

  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Serveur NIO FAR actif sur http://localhost:${config.port}`);
    console.log(`API publique : http://localhost:${config.port}/api/reports`);
    console.log(`Statistiques : http://localhost:${config.port}/api/public/stats`);
  });
}

bootstrap().catch((err) => {
  console.error('Échec du démarrage du serveur :', err);
  process.exit(1);
});
