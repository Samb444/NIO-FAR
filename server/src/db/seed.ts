import { getDb } from './index.js';
import { chargerExemplesFictifsEnBase, seedUtilisateursDemo } from './seedData.js';
import { config } from '../config.js';

async function main() {
  const db = await getDb();
  await seedUtilisateursDemo(db);
  const nb = await chargerExemplesFictifsEnBase(db);
  console.log(`Seed terminé : comptes démo (${config.seedAdminEmail}, ${config.seedRelaisEmail}) et ${nb} exemple(s) fictif(s) prêts.`);
}

main().catch((err) => {
  console.error('Erreur lors du seed :', err);
  process.exit(1);
});
