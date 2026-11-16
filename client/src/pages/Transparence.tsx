import { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Box,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { categoryColors } from '../lib/tokens';
import { STATUTS, categorieLabels, statutInfos } from '../lib/referentiel';
import type { Categorie } from '../lib/types';
import { hasWebGL, prefersSaveData, usePrefersReducedMotion } from '../lib/device';
import { useTheme } from '../lib/theme';
import { useChargement, useTitre } from '../lib/hooks';
import { BadgeExemple, EnTetePage, EtatErreur, Squelette, TiltCard, btn } from '../components/ui';
import type { SectorDatum } from '../three/SectorBars3D';

const SectorBars3D = lazy(() => import('../three/SectorBars3D'));

function CompteurAnime({ valeur, suffixe = '' }: { valeur: number | string; suffixe?: string }) {
  const [affiche, setAffiche] = useState(0);
  const estNombre = typeof valeur === 'number';

  useEffect(() => {
    if (!estNombre) return;
    let frame = 0;
    const totalFrames = 24;
    const timer = window.setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const ease = 1 - Math.pow(1 - progress, 3);
      setAffiche(Math.round(valeur * ease * 10) / 10);
      if (frame >= totalFrames) {
        setAffiche(valeur);
        window.clearInterval(timer);
      }
    }, 22);
    return () => window.clearInterval(timer);
  }, [valeur, estNombre]);

  if (!estNombre) return <>{valeur}</>;
  return (
    <>
      {Number.isInteger(valeur) ? Math.round(affiche) : affiche}
      {suffixe}
    </>
  );
}

export default function Transparence() {
  useTitre('Transparence et Données Ouvertes');
  const { theme } = useTheme();
  const reduit = usePrefersReducedMotion();
  const peut3D = hasWebGL() && !reduit && !prefersSaveData();
  const [mode3D, setMode3D] = useState<boolean>(() => peut3D);
  const [actionEx, setActionEx] = useState(false);

  const { etat, recharger } = useChargement(() => api.indicateursPublics(), []);

  const basculerExemples = async (charger: boolean) => {
    setActionEx(true);
    try {
      if (charger) await api.chargerExemples();
      else await api.retirerExemples();
      recharger();
    } finally {
      setActionEx(false);
    }
  };

  const d = etat.etat === 'ok' ? etat.donnees : null;

  const donneesCategories = d
    ? (Object.keys(categorieLabels) as Categorie[]).map((cat) => ({
        id: cat,
        nom: categorieLabels[cat],
        valeur: d.parCategorie[cat] ?? 0,
        couleur: categoryColors[cat],
      }))
    : [];

  const donneesStatuts = d
    ? STATUTS.map((st) => ({
        id: st,
        nom: statutInfos[st].label,
        valeur: d.parStatut[st] ?? 0,
        couleur: statutInfos[st].couleur,
      }))
    : [];

  const donneesSecteurs: SectorDatum[] = d
    ? Object.entries(d.parSecteur)
        .map(([secteur, v]) => ({
          secteur,
          total: v.total,
          resolus: v.resolus,
          aTraiter: v.aTraiter,
        }))
        .sort((a, b) => b.total - a.total)
    : [];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-transparence">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTetePage
          titre="Transparence & Open Data"
          intro="Indicateurs calculés en direct sur la base de données PostgreSQL. Aucune statistique inventée."
        />
        {d && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {d.contientExemples && <BadgeExemple />}
            {d.contientExemples ? (
              <button
                type="button"
                onClick={() => void basculerExemples(false)}
                disabled={actionEx}
                className={`${btn.base} ${btn.secondary} text-sm`}
              >
                <Trash2 size={16} aria-hidden /> Retirer les exemples fictifs
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void basculerExemples(true)}
                disabled={actionEx}
                className={`${btn.base} ${btn.secondary} text-sm`}
              >
                <FlaskConical size={16} aria-hidden /> Charger des exemples fictifs
              </button>
            )}
          </div>
        )}
      </div>

      {etat.etat === 'chargement' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Squelette key={i} className="h-36 w-full" />
            ))}
          </div>
          <Squelette className="h-80 w-full" />
        </div>
      )}

      {etat.etat === 'erreur' && <EtatErreur message={etat.message} onReessayer={() => recharger()} />}

      {d && (
        <div className="space-y-8">
          {/* 1. Cartes d'indicateurs clés */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BarChart3,
                label: 'Signalements enregistrés',
                valeur: d.total,
                suffixe: '',
                detail: `${d.totalConfirmations} confirmations d’habitants`,
              },
              {
                icon: CheckCircle2,
                label: 'Taux de résolution vérifiée',
                valeur: d.tauxResolutionVerifiee,
                suffixe: ' %',
                detail: `${d.resolusVerifies} résolu(s) avec preuve ou confirmation`,
              },
              {
                icon: Clock,
                label: 'Délai médian 1re vérification',
                valeur:
                  d.delaiMedianPremiereVerificationJours !== null
                    ? d.delaiMedianPremiereVerificationJours
                    : '—',
                suffixe: d.delaiMedianPremiereVerificationJours !== null ? ' j' : '',
                detail:
                  d.delaiMedianPremiereVerificationHeures !== null
                    ? `Soit ${d.delaiMedianPremiereVerificationHeures} h (médiane)`
                    : 'En attente de données',
              },
              {
                icon: Users,
                label: 'Délai moyen de résolution',
                valeur: d.delaiMoyenResolutionJours !== null ? d.delaiMoyenResolutionJours : '—',
                suffixe: d.delaiMoyenResolutionJours !== null ? ' j' : '',
                detail: `${d.resolusContestes} résolution(s) contestée(s)`,
              },
            ].map(({ icon: Icon, label, valeur, suffixe, detail }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <TiltCard>
                  <div className="glass flex h-full flex-col justify-between rounded-4xl p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                        <Icon size={22} aria-hidden />
                      </span>
                    </div>
                    <p className="mt-4 font-display text-4xl font-extrabold">
                      <CompteurAnime valeur={valeur} suffixe={suffixe} />
                    </p>
                    <div>
                      <p className="mt-1 font-bold">{label}</p>
                      <p className="text-xs text-fg-muted">{detail}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          {/* 2. Visualisation par secteur : 3D (React Three Fiber) avec repli 2D */}
          <div className="glass rounded-4xl p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">Répartition par secteur (3D & 2D)</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Comparaison par quartier entre les problèmes résolus et ceux restant à traiter.
                </p>
              </div>
              {hasWebGL() && (
                <div className="inline-flex rounded-full border border-line bg-bg-elev p-1">
                  <button
                    type="button"
                    onClick={() => setMode3D(true)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors ${
                      mode3D ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Box size={15} aria-hidden /> Barres 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode3D(false)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors ${
                      !mode3D ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <BarChart3 size={15} aria-hidden /> Repli 2D
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
              {donneesSecteurs.length === 0 ? (
                <p className="py-10 text-center text-fg-muted">Aucun signalement enregistré pour le moment.</p>
              ) : mode3D && hasWebGL() ? (
                <Suspense fallback={<Squelette className="h-80 w-full" />}>
                  <SectorBars3D items={donneesSecteurs} dark={theme === 'dark'} />
                </Suspense>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donneesSecteurs} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <XAxis dataKey="secteur" stroke="currentColor" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="currentColor" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '1rem',
                          border: '1px solid rgba(20,35,28,0.15)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="resolus" name="Résolus" stackId="a" fill="#0B6B4F" radius={[0, 0, 6, 6]} />
                      <Bar dataKey="aTraiter" name="À traiter" stackId="a" fill="#E0A21B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 3. Graphiques Recharts : par catégorie et par statut */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-4xl p-6 shadow-soft">
              <h2 className="text-xl font-extrabold">Répartition par catégorie</h2>
              <p className="text-sm text-fg-muted">Les 4 catégories prioritaires de proximité.</p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donneesCategories}
                      dataKey="valeur"
                      nameKey="nom"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={92}
                      paddingAngle={4}
                    >
                      {donneesCategories.map((entry) => (
                        <Cell key={entry.id} fill={entry.couleur} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-4xl p-6 shadow-soft">
              <h2 className="text-xl font-extrabold">Répartition par statut</h2>
              <p className="text-sm text-fg-muted">Suivi étape par étape du cycle de vie des signalements.</p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={donneesStatuts} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} stroke="currentColor" fontSize={12} />
                    <YAxis type="category" dataKey="nom" width={95} stroke="currentColor" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="valeur" name="Signalements" radius={[0, 8, 8, 0]}>
                      {donneesStatuts.map((entry) => (
                        <Cell key={entry.id} fill={entry.couleur} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4. Téléchargement Open Data (CSV & JSON) */}
          <div className="glass rounded-4xl border-2 border-accent/30 p-6 shadow-soft sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                  <ShieldCheck size={15} aria-hidden /> Données ouvertes & vie privée protégée
                </div>
                <h2 className="mt-3 text-2xl font-extrabold">Télécharger les données ouvertes (Open Data)</h2>
                <p className="mt-2 text-sm text-fg-muted">
                  Conformément à notre charte de protection des habitants, les exports publics excluent systématiquement{' '}
                  <strong>les descriptions libres, les photos, les enregistrements vocaux et les contacts téléphoniques</strong>.
                  Les coordonnées GPS sont arrondies à 3 décimales (≈ 100 m).
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={api.urlOpenDataCsv()}
                  download="nio-far-open-data.csv"
                  className={`${btn.base} ${btn.accent}`}
                >
                  <FileSpreadsheet size={18} aria-hidden />
                  Télécharger CSV
                  <Download size={16} aria-hidden />
                </a>
                <a
                  href={api.urlOpenDataJson()}
                  download="nio-far-open-data.json"
                  className={`${btn.base} ${btn.secondary}`}
                >
                  <FileJson size={18} aria-hidden />
                  Télécharger JSON
                  <Download size={16} aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
