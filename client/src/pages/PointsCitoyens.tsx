import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FlaskConical,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Megaphone,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  api,
  enregistrerCitizenIdLocal,
  obtenirCitizenIdLocal,
} from '../lib/api';
import { SECTEURS } from '../lib/referentiel';
import type {
  ClassementQuartiers,
  CompteCitoyen,
  ElementCatalogueRecompense,
  EntreeLedgerPoints,
  PayoutProviderType,
} from '../lib/types';
import { formaterDateHeure, messageErreur } from '../lib/utils';
import { useTitre } from '../lib/hooks';
import { EnTetePage, EtatErreur, Squelette, TiltCard, btn } from '../components/ui';

export default function PointsCitoyens() {
  useTitre('Points citoyens & Classement des quartiers');

  const [classement, setClassement] = useState<ClassementQuartiers | null>(null);
  const [catalogue, setCatalogue] = useState<{
    mention: string;
    modePaiement: 'SIMULATION';
    avertissement: string;
    providers: { id: PayoutProviderType; nom: string; modeSimulation: boolean; statutPartenariat: string }[];
    items: ElementCatalogueRecompense[];
  } | null>(null);
  const [profil, setProfil] = useState<{ citizen: CompteCitoyen; ledger: EntreeLedgerPoints[] } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [telephone, setTelephone] = useState('+221 77 123 45 67');
  const [secteur, setSecteur] = useState('Pikine');
  const [otpEnvoye, setOtpEnvoye] = useState<{
    telephoneMasque: string;
    codeOtpDemo: string;
    avertissement: string;
  } | null>(null);
  const [codeOtp, setCodeOtp] = useState('');
  const [actionOtp, setActionOtp] = useState(false);
  const [erreurOtp, setErreurOtp] = useState<string | null>(null);

  const [echangeEnCours, setEchangeEnCours] = useState<string | null>(null);
  const [resultatSimulation, setResultatSimulation] = useState<{
    referenceSimulation: string;
    provider: PayoutProviderType;
    avertissement: string;
  } | null>(null);

  const chargerTout = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [lb, cat] = await Promise.all([
        api.classementQuartiers(),
        api.catalogueRecompensesPublic(),
      ]);
      setClassement(lb);
      setCatalogue(cat);

      const idLocal = obtenirCitizenIdLocal();
      if (idLocal) {
        const p = await api.profilCitoyen(idLocal);
        if (p) setProfil(p);
        else enregistrerCitizenIdLocal(null);
      }
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void chargerTout();
  }, []);

  const demanderCode = async (e: FormEvent) => {
    e.preventDefault();
    setActionOtp(true);
    setErreurOtp(null);
    try {
      const r = await api.demanderOtpCitoyen(telephone, secteur);
      setOtpEnvoye({
        telephoneMasque: r.telephoneMasque,
        codeOtpDemo: r.codeOtpDemo,
        avertissement: r.avertissement,
      });
      setCodeOtp(r.codeOtpDemo);
    } catch (err) {
      setErreurOtp(messageErreur(err));
    } finally {
      setActionOtp(false);
    }
  };

  const validerCode = async (e: FormEvent) => {
    e.preventDefault();
    setActionOtp(true);
    setErreurOtp(null);
    try {
      const r = await api.verifierOtpCitoyen(telephone, codeOtp, secteur);
      setProfil(r);
      setOtpEnvoye(null);
      await chargerTout();
    } catch (err) {
      setErreurOtp(messageErreur(err));
    } finally {
      setActionOtp(false);
    }
  };

  const deconnecterCitoyen = () => {
    enregistrerCitizenIdLocal(null);
    setProfil(null);
    setResultatSimulation(null);
  };

  const simulerEchange = async (rewardId: string) => {
    if (!profil) return;
    setEchangeEnCours(rewardId);
    setErreurOtp(null);
    try {
      const r = await api.echangerRecompenseSimulee(profil.citizen.id, rewardId);
      setResultatSimulation({
        referenceSimulation: r.simulation.referenceSimulation,
        provider: r.simulation.provider,
        avertissement: r.simulation.avertissement,
      });
      const majProfil = await api.profilCitoyen(profil.citizen.id);
      if (majProfil) setProfil(majProfil);
    } catch (err) {
      setErreurOtp(messageErreur(err));
    } finally {
      setEchangeEnCours(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-points">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <EnTetePage
          titre="Points citoyens & Quartiers"
          intro="Gamification prudente et collective : le signalement anonyme reste toujours possible et prioritaire. Les points sont attribués uniquement après vérification terrain par un relais ou un administrateur."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/signaler" className={`${btn.base} ${btn.primary} text-sm`}>
            <Megaphone size={16} aria-hidden /> Signaler anonymement (sans compte)
          </Link>
          <button type="button" onClick={() => void chargerTout()} className={`${btn.base} ${btn.secondary} text-sm`}>
            <RefreshCw size={16} aria-hidden /> Actualiser
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border-2 border-ochre/60 bg-ochre/12 p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sand dark:bg-sand dark:text-ink">
            <FlaskConical size={13} aria-hidden /> Récompenses en cours de lancement
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            PayoutProvider : MODE SIMULATION (Wave & Orange Money)
          </span>
        </div>
        <p className="mt-2 text-sm text-fg">
          <strong>Transparence totale :</strong> aucun partenariat mobile money, aucun sponsor RSE et aucun montant
          financier ne sont actifs à ce stade. Le branchement <code>PayoutProvider</code> fonctionne exclusivement en{' '}
          <strong>MODE SIMULATION</strong> et les entrées sponsors sont vides par défaut (configurables par
          l’administrateur).
        </p>
      </div>

      {erreur && <EtatErreur message={erreur} onReessayer={() => void chargerTout()} />}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <div className="glass rounded-4xl p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                <Trophy size={24} className="text-ochre" aria-hidden />
                Classement par quartier
              </h2>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                Collectif · Aucun individu exposé
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {classement?.politiqueConfidentialite ||
                'Classement établi uniquement par quartier (secteur) pour éviter toute exposition des individus.'}
            </p>

            {chargement ? (
              <div className="mt-4 space-y-3">
                <Squelette className="h-16 w-full" />
                <Squelette className="h-16 w-full" />
                <Squelette className="h-16 w-full" />
              </div>
            ) : !classement || classement.quartiers.length === 0 ? (
              <p className="mt-6 text-center text-sm text-fg-muted">
                Aucun signalement vérifié pour le moment.
              </p>
            ) : (
              <ol className="mt-5 space-y-3">
                {classement.quartiers.map((q, index) => {
                  const maxScore = Math.max(...classement.quartiers.map((x) => x.scoreCollectif), 1);
                  const pct = Math.min(100, Math.round((q.scoreCollectif / maxScore) * 100));
                  return (
                    <motion.li
                      key={q.secteur}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-3xl border border-line bg-bg-elev p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-9 w-9 place-items-center rounded-2xl font-display text-sm font-extrabold ${
                              index === 0
                                ? 'bg-ochre text-ink shadow-cta'
                                : index === 1
                                  ? 'bg-accent text-accent-fg'
                                  : 'bg-fg/10 text-fg'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <p className="flex items-center gap-1.5 text-base font-extrabold">
                              <MapPin size={15} className="text-accent" aria-hidden />
                              {q.secteur}
                            </p>
                            <p className="text-xs text-fg-muted">
                              {q.signalementsVerifies} vérifié(s) · {q.resolusVerifies} résolu(s) avec preuve ·{' '}
                              {q.confirmationsCitoyennes} confirmation(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-xl font-extrabold text-accent">
                            {q.scoreCollectif} pts
                          </span>
                          {q.pointsTotaux > 0 && (
                            <span className="block text-[11px] text-fg-muted">
                              dont {q.pointsTotaux} pts ledger citoyens
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-fg/10" aria-hidden>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-ochre transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="glass rounded-4xl p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <ShieldCheck size={22} className="text-accent" aria-hidden />
              Règles anti-fraude & Attribution prudente
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="rounded-2xl border border-line bg-bg-elev p-3.5 text-sm">
                <p className="font-bold text-accent">+10 pts après vérification</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Aucun point n’est donné à l’envoi : les points sont crédités uniquement après vérification par un
                  relais de quartier ou l’administrateur.
                </p>
              </li>
              <li className="rounded-2xl border border-line bg-bg-elev p-3.5 text-sm">
                <p className="font-bold text-ochre">Plafond quotidien : 30 pts / jour</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Maximum 3 signalements vérifiés récompensés par jour pour éviter le spam ou la course au volume.
                </p>
              </li>
              <li className="rounded-2xl border border-line bg-bg-elev p-3.5 text-sm">
                <p className="font-bold">0 point pour les doublons</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Les doublons ne rapportent aucun point (et tout crédit antérieur est annulé dans le journal).
                </p>
              </li>
              <li className="rounded-2xl border border-line bg-bg-elev p-3.5 text-sm">
                <p className="font-bold text-[#C8553D]">-20 pts si malveillant</p>
                <p className="mt-1 text-xs text-fg-muted">
                  En cas de faux signalement abusif ou malveillant constaté sur le terrain, les points sont retirés avec
                  trace dans le ledger.
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-4xl p-6 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Award size={22} className="text-accent" aria-hidden />
                Compte citoyen (100 % facultatif)
              </h2>
              {profil && (
                <button
                  type="button"
                  onClick={deconnecterCitoyen}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold hover:border-accent"
                >
                  <LogOut size={13} aria-hidden /> Dissocier
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              Uniquement si vous souhaitez cumuler des points citoyens. Votre numéro est haché (SHA-256) et masqué.
            </p>

            {!profil ? (
              <div className="mt-4">
                <form onSubmit={(e) => void demanderCode(e)} className="space-y-3">
                  <div>
                    <label htmlFor="cit-tel" className="block text-sm font-bold">
                      Téléphone mobile (vérification par code OTP)
                    </label>
                    <div className="relative mt-1">
                      <Phone
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted"
                        aria-hidden
                      />
                      <input
                        id="cit-tel"
                        type="tel"
                        required
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="+221 77 123 45 67"
                        className="min-h-12 w-full rounded-2xl border border-line bg-bg-elev pl-10 pr-4 text-base outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cit-secteur" className="block text-sm font-bold">
                      Quartier / Secteur rattaché
                    </label>
                    <select
                      id="cit-secteur"
                      value={secteur}
                      onChange={(e) => setSecteur(e.target.value)}
                      className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg-elev px-4 text-base outline-none focus:border-accent"
                    >
                      {SECTEURS.map((s) => (
                        <option key={s.nom} value={s.nom}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionOtp}
                    className={`${btn.base} ${btn.secondary} w-full text-sm`}
                  >
                    {actionOtp ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <KeyRound size={16} aria-hidden />}
                    Recevoir un code OTP (mode démo)
                  </button>
                </form>

                {otpEnvoye && (
                  <form
                    onSubmit={(e) => void validerCode(e)}
                    className="mt-4 space-y-3 rounded-3xl border-2 border-accent bg-accent/10 p-4"
                  >
                    <p className="text-xs font-bold text-accent">{otpEnvoye.avertissement}</p>
                    <p className="text-sm">
                      Code OTP de démonstration généré pour <strong>{otpEnvoye.telephoneMasque}</strong> :{' '}
                      <code className="rounded-lg bg-bg-elev px-2 py-1 font-mono text-base font-extrabold text-accent">
                        {otpEnvoye.codeOtpDemo}
                      </code>
                    </p>
                    <div>
                      <label htmlFor="cit-otp" className="block text-xs font-bold">
                        Saisissez le code à 6 chiffres :
                      </label>
                      <input
                        id="cit-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={codeOtp}
                        onChange={(e) => setCodeOtp(e.target.value)}
                        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg-elev px-3 font-mono text-lg font-bold tracking-widest outline-none focus:border-accent"
                      />
                    </div>
                    <button type="submit" disabled={actionOtp} className={`${btn.base} ${btn.accent} w-full text-sm`}>
                      <CheckCircle2 size={16} aria-hidden /> Vérifier le code OTP
                    </button>
                  </form>
                )}

                {erreurOtp && (
                  <p role="alert" className="mt-3 rounded-2xl bg-[#C8553D]/15 px-4 py-3 text-sm font-semibold">
                    {erreurOtp}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <TiltCard>
                  <div className="rounded-3xl border border-accent/40 bg-accent/10 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                          Téléphone vérifié ({profil.citizen.secteur})
                        </p>
                        <p className="font-mono text-lg font-extrabold">{profil.citizen.telephoneMasque}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-4xl font-extrabold text-accent">
                          {profil.citizen.pointsBalance} <span className="text-base">pts</span>
                        </p>
                        <p className="text-xs text-fg-muted">
                          Aujourd’hui : {profil.citizen.pointsGagnesAujourdHui} / {profil.citizen.plafondQuotidien} pts
                        </p>
                      </div>
                    </div>
                  </div>
                </TiltCard>

                <div>
                  <h3 className="text-sm font-extrabold">Journal auditable de vos points (Ledger)</h3>
                  {profil.ledger.length === 0 ? (
                    <p className="mt-2 rounded-2xl border border-line bg-bg-elev p-3 text-xs text-fg-muted">
                      Aucune écriture dans votre journal pour l’instant. Vos prochains signalements recevront +10 pts dès
                      qu’ils seront vérifiés par un relais ou un administrateur.
                    </p>
                  ) : (
                    <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1 text-xs">
                      {profil.ledger.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start justify-between gap-2 rounded-2xl border border-line bg-bg-elev p-3"
                        >
                          <div>
                            <p className="font-semibold">{e.description}</p>
                            <p className="mt-0.5 text-[11px] text-fg-muted">
                              {formaterDateHeure(e.createdAt)} · Audit : {e.createdBy}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                              e.delta > 0
                                ? 'bg-accent/15 text-accent'
                                : 'bg-[#C8553D]/20 text-[#C8553D]'
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
            )}
          </div>

          <div className="glass rounded-4xl p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Gift size={22} className="text-ochre" aria-hidden />
                Catalogue de récompenses
              </h2>
              <span className="rounded-full bg-ochre/20 px-3 py-1 text-xs font-extrabold text-ink dark:text-ochre">
                {catalogue?.mention || 'Récompenses en cours de lancement'}
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Paiement mobile money (Wave, Orange Money) branché derrière <code>PayoutProvider</code> en{' '}
              <strong>MODE SIMULATION</strong>. Les entrées sponsors RSE et montants sont vides tant qu’aucun accord
              officiel n’est signé.
            </p>

            {resultatSimulation && (
              <div
                role="status"
                className="mt-4 rounded-3xl border-2 border-accent bg-accent/10 p-4 text-xs"
              >
                <p className="font-extrabold text-accent">
                  <Sparkles size={14} className="mr-1 inline" aria-hidden />
                  Simulation exécutée ({resultatSimulation.provider === 'wave' ? 'Wave' : 'Orange Money'}) — Réf.{' '}
                  <span className="font-mono">{resultatSimulation.referenceSimulation}</span>
                </p>
                <p className="mt-1 text-fg-muted">{resultatSimulation.avertissement}</p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {catalogue?.items.map((item) => {
                const peutEchanger = Boolean(profil && profil.citizen.pointsBalance >= item.pointsRequis);
                return (
                  <div key={item.id} className="rounded-3xl border border-line bg-bg-elev p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">{item.titre}</h3>
                      <span className="rounded-full bg-accent px-3 py-0.5 font-mono text-xs font-extrabold text-accent-fg">
                        {item.pointsRequis} pts
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">{item.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                      <span className="rounded-lg border border-line px-2 py-0.5 font-semibold">
                        Canal simulé : {item.fournisseurPaiement === 'wave' ? 'Wave (Simulation)' : 'Orange Money (Simulation)'}
                      </span>
                      <span className="rounded-lg border border-line px-2 py-0.5">
                        Sponsor RSE : {item.sponsorNom ? item.sponsorNom : '— (entrée vide, à remplir par l’admin)'}
                      </span>
                      <span className="rounded-lg border border-line px-2 py-0.5">
                        Montant : {item.montantIndicatif ? item.montantIndicatif : '— (non défini)'}
                      </span>
                    </div>
                    {profil && (
                      <button
                        type="button"
                        disabled={!peutEchanger || echangeEnCours !== null}
                        onClick={() => void simulerEchange(item.id)}
                        className={`${btn.base} ${btn.secondary} mt-3 min-h-10 w-full text-xs`}
                      >
                        {echangeEnCours === item.id ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden />
                        ) : (
                          <FlaskConical size={14} aria-hidden />
                        )}
                        Tester l’échange en MODE SIMULATION ({item.pointsRequis} pts)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-2xl border border-line bg-bg-elev p-3 text-xs text-fg-muted">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-ochre" aria-hidden />
              <span>
                L’administrateur peut configurer ce catalogue et renseigner un futur sponsor RSE dans{' '}
                <Link to="/admin" className="font-bold text-accent underline">
                  l’espace Administration
                </Link>
                .
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
