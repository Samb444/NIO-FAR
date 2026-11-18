import type { PayoutProviderTypeDB } from '../db/schema.js';

/**
 * Interface PayoutProvider pour le branchement futur de solutions de paiement mobile money
 * (Wave, Orange Money). Tant qu'aucun partenariat ni accord légal n'existe, l'implémentation
 * active est strictement en MODE SIMULATION et n'effectue aucun appel financier réel.
 */
export type PayoutSimulationResult = {
  provider: PayoutProviderTypeDB;
  mode: 'SIMULATION';
  statut: 'simule';
  referenceSimulation: string;
  horodatage: string;
  avertissement: string;
};

export interface PayoutProvider {
  readonly id: PayoutProviderTypeDB;
  readonly nom: string;
  readonly modeSimulation: true;
  simulerVersement(params: {
    citizenId: string;
    rewardId: string;
    pointsUtilises: number;
  }): Promise<PayoutSimulationResult>;
}

class SimulatedMobileMoneyProvider implements PayoutProvider {
  readonly id: PayoutProviderTypeDB;
  readonly nom: string;
  readonly modeSimulation = true as const;

  constructor(id: PayoutProviderTypeDB, nom: string) {
    this.id = id;
    this.nom = nom;
  }

  async simulerVersement(params: {
    citizenId: string;
    rewardId: string;
    pointsUtilises: number;
  }): Promise<PayoutSimulationResult> {
    const prefix = this.id === 'wave' ? 'SIM-WAVE' : 'SIM-OM';
    const suffix = params.citizenId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase();
    return {
      provider: this.id,
      mode: 'SIMULATION',
      statut: 'simule',
      referenceSimulation: `${prefix}-${suffix}-${stamp}`,
      horodatage: new Date().toISOString(),
      avertissement:
        'Récompenses en cours de lancement : opération exécutée en MODE SIMULATION (aucun transfert mobile money réel, aucun partenariat actif).',
    };
  }
}

const providers: Record<PayoutProviderTypeDB, PayoutProvider> = {
  wave: new SimulatedMobileMoneyProvider('wave', 'Wave (Mode simulation)'),
  orange_money: new SimulatedMobileMoneyProvider('orange_money', 'Orange Money (Mode simulation)'),
};

export function obtenirPayoutProvider(type: PayoutProviderTypeDB): PayoutProvider {
  return providers[type] ?? providers.wave;
}

export function listerPayoutProviders() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    nom: p.nom,
    modeSimulation: p.modeSimulation,
    statutPartenariat: 'Récompenses en cours de lancement — aucun partenariat ni accord légal actif.',
  }));
}
