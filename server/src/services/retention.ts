import { lt, isNotNull, and } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { reports } from '../db/schema.js';

/**
 * Applique la règle de conservation configurable :
 * - Supprime les coordonnées de contact après RETENTION_DAYS_CONTACT jours
 * - Supprime l'audio brut après RETENTION_DAYS_AUDIO jours
 */
export async function appliquerConservationDonnees(maintenant: Date = new Date()): Promise<{
  contactsPurges: number;
  audiosPurges: number;
}> {
  const db = await getDb();
  const limiteContact = new Date(maintenant.getTime() - config.retentionDaysContact * 86_400_000);
  const limiteAudio = new Date(maintenant.getTime() - config.retentionDaysAudio * 86_400_000);

  const anciensContacts = await db
    .update(reports)
    .set({ contact: null })
    .where(and(isNotNull(reports.contact), lt(reports.dateCreation, limiteContact)))
    .returning({ id: reports.id });

  const anciensAudios = await db
    .update(reports)
    .set({ audio: null, audioMime: null })
    .where(and(isNotNull(reports.audio), lt(reports.dateCreation, limiteAudio)))
    .returning({ id: reports.id });

  return {
    contactsPurges: anciensContacts.length,
    audiosPurges: anciensAudios.length,
  };
}
