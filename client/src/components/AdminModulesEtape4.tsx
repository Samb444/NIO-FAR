import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  CalendarClock,
  CloudRain,
  FileDown,
  FlaskConical,
  Gift,
  HelpCircle,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { CENTRE_CARTE } from '../lib/referentiel';
import type {
  ElementCatalogueRecompense,
  EntreeLedgerPoints,
  PayoutProviderType,
  PointNoirSecteur,
  RapportPointsNoirs,
} from '../lib/types';
import { formaterDate, formaterDateHeure, messageErreur } from '../lib/utils';
import { BadgeExemple, EtatErreur, Squelette, btn } from './ui';

function couleurNiveauRisque(niveau: PointNoirSecteur['niveauGlobal']): string {
  if (niveau === 'eleve') return '#C8553D';
  if (niveau === 'modere') return '#E0A21B';
  if (niveau === 'faible') return '#0B6B4F';
  return '#6B7C74';
}

function labelNiveauRisque(niveau: PointNoirSecteur['niveauGlobal']): string {
  if (niveau === 'eleve') return 'Risque élevé à anticiper';
  if (niveau === 'modere') return 'Risque modéré';
  if (niveau === 'faible') return 'Risque faible';
  return 'Données insuffisantes (< 30)';
}

function exporterRapportPdfCommunes(rapport: RapportPointsNoirs): void {
  const w = window.open('', '_blank', 'width=960,height=800');
  if (!w) {
    window.print();
    return;
  }

  const pluieHtml = rapport.meteo.prochainePluieImportante
    ? `<strong>${rapport.meteo.prochainePluieImportante.date}</strong> (${rapport.meteo.prochainePluieImportante.precipitationMm} mm prévus, probabilité ${rapport.meteo.prochainePluieImportante.probabiliteMax} %)`
    : `Aucune pluie majeure (&ge; 10 mm) détectée sur les 7 prochains jours (cumul 7 j : ${rapport.meteo.cumul7JoursMm} mm)`;

  const lignesAnticiper = rapport.aAnticiper
    .map(
      (item) => `
      <tr>
        <td><strong>${item.secteur}</strong></td>
        <td>${item.labelCategorie}</td>
        <td><strong>${item.scoreRisque} / 100</strong> (${item.niveauRisque === 'eleve' ? 'Élevé' : 'Modéré'})</td>
        <td>${item.prochainePluieDate || 'Sous 7 jours'}</td>
        <td>${item.justificationCourte}<br/><em>Action suggérée : ${item.actionRecommandee}</em></td>
      </tr>`,
    )
    .join('');

  const lignesSecteurs = rapport.secteurs
    .map(
      (s) => `
      <tr>
        <td><strong>${s.secteur}</strong></td>
        <td>${s.totalSignalementsSecteur} / ${s.seuilMinimalRequis} requis</td>
        <td>${
          s.donneesSuffisantes
            ? `<strong>${s.scoreGlobalSecteur} / 100</strong> (${labelNiveauRisque(s.niveauGlobal)})`
            : '<strong>Données insuffisantes</strong> (garde-fou &lt; 30 signalements)'
        }</td>
        <td>${
          s.donneesSuffisantes
            ? s.parCategorie
                .map((c) => `${c.labelCategorie} : ${c.scoreRisque ?? '—'}/100`)
                .join(' · ')
            : 'Collecte citoyenne en cours avant activation du score.'
        }</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport pré-hivernage « Points noirs » — NIO FAR</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #14231C; margin: 28px; line-height: 1.45; }
    .bandeau { border: 2px solid #0B6B4F; background: #F6F1E7; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
    .mention { background: #FFF4D6; border-left: 4px solid #E0A21B; padding: 10px 14px; font-size: 13px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px 0; font-size: 22px; color: #0B6B4F; }
    h2 { font-size: 16px; margin-top: 22px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #0B6B4F; color: #fff; }
    .footer { margin-top: 24px; font-size: 11px; color: #475569; border-top: 1px solid #cbd5e1; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="bandeau">
    <h1>NIO FAR — Rapport communal d’anticipation (« Points noirs »)</h1>
    <p style="margin:4px 0 0 0;font-size:13px;">
      Généré le ${formaterDateHeure(rapport.genereLe)} · Zone : ${rapport.meteo.zone}
      ${rapport.contientExemplesFictifs ? ' · <strong>CONTIENT DES EXEMPLES FICTIFS DE DÉMONSTRATION</strong>' : ''}
    </p>
  </div>
  <div class="mention">
    <strong>Garde-fou &amp; Honnêteté :</strong> ${rapport.mentionLegale}<br/>
    <strong>Méthode explicable :</strong> ${rapport.methode}<br/>
    <strong>Météo Open-Meteo (sans clé) :</strong> Cumul 7 jours prévu : ${rapport.meteo.cumul7JoursMm} mm · Prochaine pluie importante : ${pluieHtml}.
  </div>

  <h2>1. Liste « À anticiper » avant la prochaine pluie</h2>
  <table>
    <thead>
      <tr>
        <th>Secteur</th>
        <th>Catégorie</th>
        <th>Score indicatif</th>
        <th>Prochaine pluie</th>
        <th>Pourquoi ? &amp; Action préventive suggérée</th>
      </tr>
    </thead>
    <tbody>
      ${lignesAnticiper || '<tr><td colspan="5">Aucun secteur n’a franchi le seuil de risque modéré/élevé avec au moins 30 signalements.</td></tr>'}
    </tbody>
  </table>

  <h2>2. État de tous les secteurs (Garde-fou : minimum ${rapport.seuilMinimalSecteur} signalements)</h2>
  <table>
    <thead>
      <tr>
        <th>Secteur</th>
        <th>Volume de données</th>
        <th>Statut / Score</th>
        <th>Détail par catégorie</th>
      </tr>
    </thead>
    <tbody>
      ${lignesSecteurs}
    </tbody>
  </table>

  <div class="footer">
    Document indicatif généré par le prototype citoyen NIO FAR (Banlieue Smart Genius 2026). Ce document ne constitue jamais une certitude météorologique ou hydraulique et ne remplace pas les diagnostics techniques de l’ONAS, de la SONAGED ou des services municipaux.
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 250); };
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function CarteChaleurPointsNoirs({
  secteurs,
  onSelectSecteur,
  secteurActif,
}: {
  secteurs: PointNoirSecteur[];
  onSelectSecteur: (nom: string) => void;
  secteurActif: string;
}) {
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<L.Map | null>(null);
  const calqueRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;
    const map = L.map(conteneurRef.current, {
      center: CENTRE_CARTE,
      zoom: 12,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    const group = L.layerGroup().addTo(map);
    carteRef.current = map;
    calqueRef.current = group;

    return () => {
      map.remove();
      carteRef.current = null;
      calqueRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = calqueRef.current;
    if (!group) return;
    group.clearLayers();

    for (const s of secteurs) {
      const couleur = couleurNiveauRisque(s.niveauGlobal);
      const rayonHalo = s.donneesSuffisantes ? 28 + Math.round((s.scoreGlobalSecteur ?? 20) * 0.35) : 20;

      if (s.donneesSuffisantes) {
        L.circleMarker([s.latitude, s.longitude], {
          radius: rayonHalo,
          color: couleur,
          weight: 1,
          fillColor: couleur,
          fillOpacity: 0.25,
        }).addTo(group);
      }

      const marker = L.circleMarker([s.latitude, s.longitude], {
        radius: s.secteur === secteurActif ? 15 : 11,
        color: s.secteur === secteurActif ? '#14231C' : '#FFFFFF',
        weight: s.secteur === secteurActif ? 3 : 2,
        fillColor: couleur,
        fillOpacity: 0.9,
      });

      const textePopup = s.donneesSuffisantes
        ? `<strong>${s.secteur}</strong><br/>Score indicatif : <strong>${s.scoreGlobalSecteur}/100</strong><br/>(${s.totalSignalementsSecteur} signalements)`
        : `<strong>${s.secteur}</strong><br/><em>Données insuffisantes (${s.totalSignalementsSecteur}/${s.seuilMinimalRequis})</em>`;

      marker.bindTooltip(textePopup, { direction: 'top' });
      marker.on('click', () => onSelectSecteur(s.secteur));
      marker.addTo(group);
    }
  }, [secteurs, secteurActif, onSelectSecteur]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line">
      <div
        ref={conteneurRef}
        className="h-80 w-full bg-bg-elev"
        role="region"
        aria-label="Carte de chaleur indicative des secteurs à risque avant l’hivernage"
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-bg-elev px-4 py-2.5 text-xs">
        <span className="font-bold">Légende thermique pré-hivernage :</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#C8553D]" /> Risque élevé (&ge; 65)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#E0A21B]" /> Risque modéré (40–64)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#0B6B4F]" /> Risque faible (&lt; 40)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#6B7C74]" /> Données insuffisantes (&lt; 30 signalements)
        </span>
      </div>
    </div>
  );
}

export function ModulePointsNoirsAdmin() {
  const [rapport, setRapport] = useState<RapportPointsNoirs | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [secteurSelectionne, setSecteurSelectionne] = useState<string>('Pikine');
  const [pourquoiOuvert, setPourquoiOuvert] = useState<string | null>('eau_stagnante');
  const [actionExemples, setActionExemples] = useState(false);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const r = await api.pointsNoirsAdmin();
      setRapport(r);
      if (r.secteurs.length > 0 && !r.secteurs.some((s) => s.secteur === secteurSelectionne)) {
        setSecteurSelectionne(r.secteurs[0].secteur);
      }
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargerJeuHistoriqueFictif = async () => {
    setActionExemples(true);
    try {
      await api.chargerExemples();
      await charger();
    } finally {
      setActionExemples(false);
    }
  };

  if (chargement) {
    return (
      <div className="mt-6 space-y-4">
        <Squelette className="h-28 w-full" />
        <Squelette className="h-80 w-full" />
      </div>
    );
  }

  if (erreur || !rapport) {
    return (
      <div className="mt-6">
        <EtatErreur message={erreur || 'Rapport indisponible'} onReessayer={() => void charger()} />
      </div>
    );
  }

  const secteurActuel =
    rapport.secteurs.find((s) => s.secteur === secteurSelectionne) ?? rapport.secteurs[0];

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl border-2 border-accent/50 bg-accent/10 p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-extrabold text-accent-fg">
              <ShieldAlert size={14} aria-hidden /> Indicatif, basé sur les données de NIO FAR
            </span>
            <span className="rounded-full border border-line bg-bg-elev px-3 py-1 text-xs font-bold">
              Garde-fou actif : seuil minimal de {rapport.seuilMinimalSecteur} signalements / secteur
            </span>
            {rapport.contientExemplesFictifs && <BadgeExemple />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exporterRapportPdfCommunes(rapport)}
              className={`${btn.base} ${btn.primary} min-h-10 px-4 text-xs`}
            >
              <FileDown size={16} aria-hidden /> Exporter le rapport en PDF pour les communes
            </button>
            <button
              type="button"
              onClick={() => void charger()}
              className={`${btn.base} ${btn.secondary} min-h-10 px-3 text-xs`}
            >
              <RefreshCw size={14} aria-hidden /> Recalculer
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-fg">
          <strong>Méthode explicable (règles + statistiques, aucune boîte noire) :</strong> {rapport.methode}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          Ces estimations sont fournies à titre purement indicatif pour aider les communes à anticiper le curage et la
          collecte avant l’hivernage. Elles ne sont jamais présentées comme une certitude.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <div className="glass rounded-4xl p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <CloudRain size={20} className="text-[#2F8FBF]" aria-hidden />
              Prévisions pluie Dakar (Open-Meteo)
            </h3>
            <span className="rounded-full bg-[#2F8FBF]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#2F8FBF]">
              7 jours · Sans clé
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">{rapport.meteo.source}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-bg-elev p-3">
              <p className="text-xs text-fg-muted">Cumul prévu (7 jours)</p>
              <p className="font-display text-2xl font-extrabold text-[#2F8FBF]">
                {rapport.meteo.cumul7JoursMm} mm
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-bg-elev p-3">
              <p className="text-xs text-fg-muted">Prochaine pluie importante</p>
              {rapport.meteo.prochainePluieImportante ? (
                <div>
                  <p className="font-display text-lg font-extrabold text-[#C8553D]">
                    {formaterDate(rapport.meteo.prochainePluieImportante.date)}
                  </p>
                  <p className="text-[11px] font-semibold text-fg-muted">
                    {rapport.meteo.prochainePluieImportante.precipitationMm} mm (prob.{' '}
                    {rapport.meteo.prochainePluieImportante.probabiliteMax} %)
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs font-semibold text-fg-muted">
                  Pas de pluie &ge; 10 mm prévue sous 7 j
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px]">
            {rapport.meteo.jours.slice(0, 7).map((j) => (
              <div key={j.date} className="rounded-xl border border-line bg-bg-elev px-1 py-2">
                <p className="font-bold">{j.date.slice(5)}</p>
                <p className="mt-1 font-mono font-extrabold text-[#2F8FBF]">{j.precipitationMm}mm</p>
                <p className="text-[10px] text-fg-muted">{j.probabiliteMax}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-4xl p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <CalendarClock size={20} className="text-ochre" aria-hidden />
              Liste « À anticiper » avant l’hivernage ({rapport.aAnticiper.length})
            </h3>
            {rapport.meteo.prochainePluieImportante && (
              <span className="rounded-full bg-[#C8553D]/15 px-3 py-1 text-xs font-extrabold text-[#C8553D]">
                Prochaine pluie importante : {formaterDate(rapport.meteo.prochainePluieImportante.date)} (
                {rapport.meteo.prochainePluieImportante.precipitationMm} mm)
              </span>
            )}
          </div>

          {rapport.aAnticiper.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-line bg-bg-elev p-5 text-center text-sm text-fg-muted">
              <p>
                Aucun secteur ne dépasse actuellement le seuil minimal de {rapport.seuilMinimalSecteur} signalements.
              </p>
              <button
                type="button"
                disabled={actionExemples}
                onClick={() => void chargerJeuHistoriqueFictif()}
                className={`${btn.base} ${btn.secondary} mt-3 min-h-10 text-xs`}
              >
                {actionExemples ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <FlaskConical size={14} aria-hidden />}
                Charger les exemples historiques fictifs (Pikine &amp; Guédiawaye &ge; 30)
              </button>
            </div>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {rapport.aAnticiper.map((item) => (
                <li
                  key={`${item.secteur}-${item.categorie}`}
                  className="rounded-2xl border border-line bg-bg-elev p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-sm">
                      {item.secteur} — {item.labelCategorie}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-extrabold text-white ${
                        item.niveauRisque === 'eleve' ? 'bg-[#C8553D]' : 'bg-ochre text-ink'
                      }`}
                    >
                      Risque indicatif {item.scoreRisque}/100
                    </span>
                  </div>
                  <p className="mt-1 text-fg-muted">{item.justificationCourte}</p>
                  <p className="mt-1 font-semibold text-accent">
                    Action préventive suggérée : {item.actionRecommandee}
                  </p>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    Échéance météo :{' '}
                    {item.prochainePluieDate
                      ? `Avant la pluie prévue le ${formaterDate(item.prochainePluieDate)} (${item.prochainePluieMm} mm)`
                      : 'Surveillance pré-hivernage (7 prochains jours)'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass rounded-4xl p-5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold">
              Carte de chaleur des secteurs à risque avant l’hivernage
            </h3>
            <p className="text-xs text-fg-muted">
              Cliquez sur un secteur pour inspecter ses scores par catégorie et ouvrir l’explication « Pourquoi ? ».
            </p>
          </div>
          <span className="text-xs font-semibold text-accent">
            Indicatif, basé sur les données de NIO FAR
          </span>
        </div>

        <CarteChaleurPointsNoirs
          secteurs={rapport.secteurs}
          secteurActif={secteurActuel.secteur}
          onSelectSecteur={setSecteurSelectionne}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass rounded-4xl p-5 shadow-soft">
          <h3 className="text-lg font-extrabold">Secteurs &amp; Garde-fou de volume</h3>
          <p className="mt-1 text-xs text-fg-muted">
            Moins de {rapport.seuilMinimalSecteur} signalements dans un secteur = affichage « Données insuffisantes ».
          </p>
          <ul className="mt-4 space-y-2">
            {rapport.secteurs.map((s) => {
              const actif = s.secteur === secteurActuel.secteur;
              return (
                <li key={s.secteur}>
                  <button
                    type="button"
                    onClick={() => setSecteurSelectionne(s.secteur)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-left text-sm transition-all ${
                      actif
                        ? 'border-accent bg-accent/12 ring-2 ring-accent'
                        : 'border-line bg-bg-elev hover:border-accent/50'
                    }`}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-extrabold">
                        <MapPin size={14} className="text-accent" aria-hidden />
                        {s.secteur}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {s.totalSignalementsSecteur} / {s.seuilMinimalRequis} signalements
                      </p>
                    </div>
                    {s.donneesSuffisantes ? (
                      <span
                        className="rounded-full px-3 py-1 font-mono text-xs font-extrabold text-white"
                        style={{ backgroundColor: couleurNiveauRisque(s.niveauGlobal) }}
                      >
                        Score {s.scoreGlobalSecteur}/100
                      </span>
                    ) : (
                      <span className="rounded-full bg-fg/15 px-3 py-1 text-xs font-bold text-fg-muted">
                        Données insuffisantes
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="glass rounded-4xl p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <h3 className="text-xl font-extrabold">
                Analyse sectorielle : {secteurActuel.secteur}
              </h3>
              <p className="text-xs text-fg-muted">
                Volume collecté : <strong>{secteurActuel.totalSignalementsSecteur}</strong> signalement(s) (seuil
                minimal : {secteurActuel.seuilMinimalRequis})
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-extrabold text-white"
              style={{ backgroundColor: couleurNiveauRisque(secteurActuel.niveauGlobal) }}
            >
              {secteurActuel.statutAffichage}
            </span>
          </div>

          {!secteurActuel.donneesSuffisantes ? (
            <div className="mt-5 rounded-3xl border-2 border-dashed border-line bg-bg-elev p-6 text-center">
              <AlertTriangle size={28} className="mx-auto text-ochre" aria-hidden />
              <p className="mt-2 text-lg font-extrabold">Données insuffisantes</p>
              <p className="mt-1 text-sm text-fg-muted">
                Le secteur <strong>{secteurActuel.secteur}</strong> compte actuellement{' '}
                <strong>{secteurActuel.totalSignalementsSecteur}</strong> signalement(s), soit moins du seuil minimal de{' '}
                <strong>{secteurActuel.seuilMinimalRequis}</strong> requis pour calculer un score de risque fiable.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {secteurActuel.parCategorie.map((cat) => {
                const ouvert = pourquoiOuvert === cat.categorie;
                return (
                  <div
                    key={cat.categorie}
                    className="rounded-3xl border border-line bg-bg-elev p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-extrabold">{cat.labelCategorie}</p>
                        <p className="text-xs text-fg-muted">
                          {cat.nbSignalementsCategorie} signalement(s) dont {cat.nbRecurrentsOuActifs} récurrent(s) ou
                          actif(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 font-mono text-xs font-extrabold text-white"
                          style={{ backgroundColor: couleurNiveauRisque(cat.niveauRisque) }}
                        >
                          {cat.scoreRisque}/100
                        </span>
                        <button
                          type="button"
                          onClick={() => setPourquoiOuvert(ouvert ? null : cat.categorie)}
                          aria-expanded={ouvert}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 text-xs font-bold text-accent hover:bg-accent/20"
                        >
                          <HelpCircle size={13} aria-hidden /> Pourquoi ?
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {ouvert && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-2.5 border-t border-line pt-3 text-xs">
                            <p className="font-mono text-[11px] font-bold text-accent">
                              {cat.formuleExplicable}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {cat.facteurs.map((f) => (
                                <div
                                  key={f.code}
                                  className="rounded-2xl border border-line bg-bg p-2.5"
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span>
                                      {f.label} ({f.poidsPourcent} %)
                                    </span>
                                    <span className="font-mono text-accent">
                                      +{f.contributionPoints} pts
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-fg-muted">{f.explication}</p>
                                </div>
                              ))}
                            </div>
                            <p className="rounded-xl bg-accent/10 px-3 py-2 font-semibold text-accent">
                              Recommandation : {cat.actionSuggereeCommune}
                            </p>
                            <p className="text-[11px] italic text-fg-muted">
                              {cat.messageGardeFou}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModulePointsCitoyensAdmin({ estRelais }: { estRelais: boolean }) {
  const [ledgerData, setLedgerData] = useState<{
    totalEntrees: number;
    totalComptesCitoyens: number;
    entries: EntreeLedgerPoints[];
    simulationsPaiement: {
      id: string;
      provider: PayoutProviderType;
      pointsUtilises: number;
      referenceSimulation: string;
      telephoneMasque: string;
      createdAt: string;
    }[];
  } | null>(null);
  const [catalogue, setCatalogue] = useState<ElementCatalogueRecompense[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [pointsRequis, setPointsRequis] = useState(50);
  const [fournisseurPaiement, setFournisseurPaiement] = useState<PayoutProviderType>('wave');
  const [sponsorNom, setSponsorNom] = useState('');
  const [sponsorContact, setSponsorContact] = useState('');
  const [montantIndicatif, setMontantIndicatif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [l, c] = await Promise.all([
        api.journalPointsAdmin(),
        api.catalogueRecompensesAdmin(),
      ]);
      setLedgerData(l);
      setCatalogue(c.items);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void charger();
  }, []);

  const ajouterRecompense = async (e: FormEvent) => {
    e.preventDefault();
    if (estRelais) return;
    setEnCours(true);
    setErreur(null);
    try {
      await api.creerRecompenseAdmin({
        titre: titre.trim(),
        description: description.trim(),
        pointsRequis: Number(pointsRequis) || 50,
        fournisseurPaiement,
        sponsorNom: sponsorNom.trim(),
        sponsorContact: sponsorContact.trim(),
        montantIndicatif: montantIndicatif.trim(),
        actif: true,
      });
      setTitre('');
      setDescription('');
      setSponsorNom('');
      setSponsorContact('');
      setMontantIndicatif('');
      await charger();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const mettreAJourSponsor = async (item: ElementCatalogueRecompense, nouveauSponsor: string, nouveauMontant: string) => {
    if (estRelais) return;
    setEnCours(true);
    try {
      await api.modifierRecompenseAdmin(item.id, {
        sponsorNom: nouveauSponsor,
        montantIndicatif: nouveauMontant,
      });
      await charger();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (id: string) => {
    if (estRelais) return;
    setEnCours(true);
    try {
      await api.supprimerRecompenseAdmin(id);
      await charger();
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <div className="mt-6 space-y-4">
        <Squelette className="h-40 w-full" />
        <Squelette className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl border-2 border-ochre/60 bg-ochre/12 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-extrabold uppercase text-sand dark:bg-sand dark:text-ink">
            <FlaskConical size={13} aria-hidden /> Récompenses en cours de lancement
          </span>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            PayoutProvider : Wave &amp; Orange Money en MODE SIMULATION
          </span>
        </div>
        <p className="mt-2 text-sm">
          Aucun sponsor RSE ni montant financier n’est pré-rempli ou inventé : les champs <em>Sponsor RSE</em> et{' '}
          <em>Montant</em> sont des entrées vides à remplir librement par l’administrateur lorsqu’un accord officiel
          existe.
        </p>
      </div>

      {erreur && <EtatErreur message={erreur} onReessayer={() => void charger()} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-4xl p-5 shadow-soft">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <Gift size={20} className="text-ochre" aria-hidden />
            Catalogue de récompenses ({catalogue.length})
          </h3>
          <p className="mt-1 text-xs text-fg-muted">
            Configurez les paliers de points et complétez les entrées sponsors vides.
          </p>

          <div className="mt-4 space-y-3">
            {catalogue.map((item) => (
              <CarteEditionRecompense
                key={item.id}
                item={item}
                estRelais={estRelais}
                enCours={enCours}
                onSaveSponsor={mettreAJourSponsor}
                onDelete={supprimer}
              />
            ))}
          </div>

          {!estRelais && (
            <form
              onSubmit={(e) => void ajouterRecompense(e)}
              className="mt-5 space-y-3 rounded-3xl border border-line bg-bg-elev p-4"
            >
              <h4 className="text-sm font-extrabold">Ajouter une entrée au catalogue</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="rew-titre" className="block text-xs font-bold">
                    Titre de la récompense *
                  </label>
                  <input
                    id="rew-titre"
                    type="text"
                    required
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder="Ex. : Bon citoyen — Palier quartier"
                    className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="rew-points" className="block text-xs font-bold">
                    Points requis *
                  </label>
                  <input
                    id="rew-points"
                    type="number"
                    min={10}
                    max={10000}
                    required
                    value={pointsRequis}
                    onChange={(e) => setPointsRequis(Number(e.target.value))}
                    className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label htmlFor="rew-provider" className="block text-xs font-bold">
                    PayoutProvider (Simulé)
                  </label>
                  <select
                    id="rew-provider"
                    value={fournisseurPaiement}
                    onChange={(e) => setFournisseurPaiement(e.target.value as PayoutProviderType)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-2 text-xs outline-none focus:border-accent"
                  >
                    <option value="wave">Wave (Simulation)</option>
                    <option value="orange_money">Orange Money (Simulation)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rew-sponsor" className="block text-xs font-bold">
                    Sponsor RSE (vide par défaut)
                  </label>
                  <input
                    id="rew-sponsor"
                    type="text"
                    value={sponsorNom}
                    onChange={(e) => setSponsorNom(e.target.value)}
                    placeholder="À remplir par vous…"
                    className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="rew-montant" className="block text-xs font-bold">
                    Montant (vide par défaut)
                  </label>
                  <input
                    id="rew-montant"
                    type="text"
                    value={montantIndicatif}
                    onChange={(e) => setMontantIndicatif(e.target.value)}
                    placeholder="À remplir par vous…"
                    className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rew-desc" className="block text-xs font-bold">
                  Description
                </label>
                <input
                  id="rew-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conditions d’obtention après vérification terrain…"
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
                />
              </div>

              <button type="submit" disabled={enCours} className={`${btn.base} ${btn.accent} min-h-10 w-full text-xs`}>
                <Plus size={15} aria-hidden /> Ajouter au catalogue
              </button>
            </form>
          )}
        </div>

        <div className="glass rounded-4xl p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <Award size={20} className="text-accent" aria-hidden />
              Journal auditable des points (Ledger)
            </h3>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
              {ledgerData?.totalEntrees ?? 0} écriture(s) · {ledgerData?.totalComptesCitoyens ?? 0} compte(s) OTP
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Chaque attribution (+10 pts après vérification), annulation de doublon (0 pt), retrait pour malveillance
            (-20 pts) ou simulation d’échange est tracée de façon immuable.
          </p>

          {!ledgerData || ledgerData.entries.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-line bg-bg-elev p-6 text-center text-xs text-fg-muted">
              Aucune écriture dans le journal des points pour le moment.
            </div>
          ) : (
            <ol className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-1 text-xs">
              {ledgerData.entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-bg-elev p-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-accent">{e.telephoneMasque}</span>
                      <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-semibold">
                        {e.secteur}
                      </span>
                      <span className="text-[11px] text-fg-muted">{formaterDateHeure(e.createdAt)}</span>
                    </div>
                    <p className="mt-1 font-medium">{e.description}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">Opérateur : {e.createdBy}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-extrabold ${
                      e.delta > 0 ? 'bg-accent/15 text-accent' : 'bg-[#C8553D]/20 text-[#C8553D]'
                    }`}
                  >
                    {e.delta > 0 ? `+${e.delta}` : e.delta} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function CarteEditionRecompense({
  item,
  estRelais,
  enCours,
  onSaveSponsor,
  onDelete,
}: {
  item: ElementCatalogueRecompense;
  estRelais: boolean;
  enCours: boolean;
  onSaveSponsor: (item: ElementCatalogueRecompense, sponsor: string, montant: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [sponsor, setSponsor] = useState(item.sponsorNom);
  const [montant, setMontant] = useState(item.montantIndicatif);

  return (
    <div className="rounded-3xl border border-line bg-bg-elev p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-extrabold">{item.titre}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono font-extrabold text-accent-fg">
            {item.pointsRequis} pts
          </span>
          <span className="rounded-full border border-line px-2 py-0.5 font-semibold">
            {item.fournisseurPaiement === 'wave' ? 'Wave (Simulation)' : 'Orange Money (Simulation)'}
          </span>
          {!estRelais && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => void onDelete(item.id)}
              aria-label={`Supprimer ${item.titre}`}
              className="rounded-full p-1.5 text-fg-muted hover:bg-[#C8553D]/15 hover:text-[#C8553D]"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-fg-muted">{item.description}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          disabled={estRelais}
          value={sponsor}
          onChange={(e) => setSponsor(e.target.value)}
          placeholder="Sponsor RSE (entrée vide à remplir)"
          aria-label="Nom du sponsor RSE"
          className="min-h-9 rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
        />
        <input
          type="text"
          disabled={estRelais}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="Montant (entrée vide à remplir)"
          aria-label="Montant indicatif"
          className="min-h-9 rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-accent"
        />
        {!estRelais && (
          <button
            type="button"
            disabled={enCours || (sponsor === item.sponsorNom && montant === item.montantIndicatif)}
            onClick={() => void onSaveSponsor(item, sponsor, montant)}
            className="min-h-9 rounded-xl bg-accent px-3 font-bold text-accent-fg disabled:opacity-40"
          >
            Enregistrer
          </button>
        )}
      </div>
    </div>
  );
}
