import { getDb } from './index.js';

async function main() {
  await getDb();
  console.log('Migrations PostgreSQL appliquées avec succès.');
}

main().catch((err) => {
  console.error('Erreur lors de la migration :', err);
  process.exit(1);
});
