import cron from 'node-cron';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { reports, type RelanceNiveauDB } from '../db/schema.js';

export type RelanceResultat = {
  verifies: number;
  marquesJ3: string[];
  marquesJ7: string[];
};

/**
 * Inspecte les signalements au statut « a_verifier » ou « transmis » sans mise à jour
 * et les marque « Relance J+3 » (≥ 3 jours) ou « Relance J+7 » (≥ 7 jours).
 * Règle : aucune relance n'est jamais envoyée à une institution sans validation de l'admin.
 */
export async function executerVerificationRelances(maintenant: Date = new Date()): Promise<RelanceResultat> {
  const db = await getDb();
  const cibles = await db
    .select()
    .from(reports)
    .where(inArray(reports.statut, ['a_verifier', 'transmis']));

  const marquesJ3: string[] = [];
  const marquesJ7: string[] = [];

  for (const r of cibles) {
    if (r.estDoublon) continue;
    const refDate = r.dateMiseAJour ? new Date(r.dateMiseAJour) : new Date(r.dateCreation);
    const joursSansMaj = (maintenant.getTime() - refDate.getTime()) / 86_400_000;

    let nouveauNiveau: RelanceNiveauDB = 'aucune';
    if (joursSansMaj >= 7) {
      nouveauNiveau = 'j7';
    } else if (joursSansMaj >= 3) {
      nouveauNiveau = 'j3';
    }

    if (nouveauNiveau !== 'aucune' && nouveauNiveau !== r.relanceNiveau) {
      const label = nouveauNiveau === 'j7' ? 'Relance J+7' : 'Relance J+3';
      const dejaNote = r.historique.some((h) => h.note.includes(label));
      const nouvelHistorique = dejaNote
        ? r.historique
        : [
            ...r.historique,
            {
              date: maintenant.toISOString(),
              statut: r.statut,
              note: `${label} : aucune mise à jour depuis ${Math.floor(joursSansMaj)} jours (en attente de validation par l'administrateur).`,
            },
          ];

      await db
        .update(reports)
        .set({
          relanceNiveau: nouveauNiveau,
          relanceDate: maintenant,
          relanceValideeAdmin: false,
          historique: nouvelHistorique,
        })
        .where(eq(reports.id, r.id));

      if (nouveauNiveau === 'j7') marquesJ7.push(r.id);
      else marquesJ3.push(r.id);
    }
  }

  return {
    verifies: cibles.length,
    marquesJ3,
    marquesJ7,
  };
}

let tacheCron: cron.ScheduledTask | null = null;

export function demarrerCronRelances(): void {
  if (tacheCron) return;
  // Exécution toutes les heures (et immédiatement au démarrage)
  tacheCron = cron.schedule('0 * * * *', () => {
    void executerVerificationRelances().catch((err) => {
      console.error('Erreur tâche planifiée relances :', err);
    });
  });
}
