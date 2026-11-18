import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  AlertCircle,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  CopyCheck,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Volume2,
} from 'lucide-react';
import { api } from '../lib/api';
import { categoryColors } from '../lib/tokens';
import { STATUTS, categorieLabels, graviteLabels, statutInfos } from '../lib/referentiel';
import type {
  Categorie,
  SignalementAdmin,
  Statut,
  UtilisateurSession,
} from '../lib/types';
import { compresserImage } from '../lib/image';
import { suggererCategorie } from '../lib/keywords';
import { formaterDateHeure, messageErreur } from '../lib/utils';
import { useTitre } from '../lib/hooks';
import {
  BadgeExemple,
  BadgeStatut,
  EnTetePage,
  EtatErreur,
  Squelette,
  TiltCard,
  btn,
} from '../components/ui';
import {
  ModulePointsCitoyensAdmin,
  ModulePointsNoirsAdmin,
} from '../components/AdminModulesEtape4';

const SUGGESTIONS_ACTEURS: Record<Categorie, string> = {
  dechets: 'SONAGED',
  eau_stagnante: 'ONAS',
  eclairage: 'Senelec ou mairie',
  voirie: 'Services techniques de la mairie',
};

function ChiffreAnime({ valeur }: { valeur: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let f = 0;
    const max = 20;
    const t = window.setInterval(() => {
      f++;
      setN(Math.round(valeur * (1 - Math.pow(1 - f / max, 3))));
      if (f >= max) {
        setN(valeur);
        window.clearInterval(t);
      }
    }, 20);
    return () => window.clearInterval(t);
  }, [valeur]);
  return <>{n}</>;
}

export default function Admin() {
  useTitre('Administration & Coordination');
  const [user, setUser] = useState<UtilisateurSession | null>(null);
  const [verifSession, setVerifSession] = useState(true);

  useEffect(() => {
    api
      .sessionAdmin()
      .then((s) => setUser(s?.user ?? null))
      .finally(() => setVerifSession(false));
  }, []);

  if (verifSession) {
    return (
      <section className="mx-auto max-w-5xl px-4 pb-32 pt-28">
        <Squelette className="h-64 w-full" />
      </section>
    );
  }

  if (!user) {
    return <EcranConnexion onConnecte={setUser} />;
  }

  return <TableauDeBordAdmin user={user} onDeconnexion={() => setUser(null)} />;
}

/* -------------------------------------------------------------------------- */
/* Écran de connexion (/admin)                                                */
/* -------------------------------------------------------------------------- */

function EcranConnexion({ onConnecte }: { onConnecte: (u: UtilisateurSession) => void }) {
  const [email, setEmail] = useState('admin@niofar.sn');
  const [password, setPassword] = useState('NioFar2026!');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const r = await api.connexionAdmin(email.trim(), password);
      onConnecte(r.user);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 pb-32 pt-24 sm:pt-32" aria-labelledby="titre-login">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-4xl p-6 shadow-soft sm:p-8"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Shield size={28} aria-hidden />
        </div>
        <h1 id="titre-login" className="mt-4 text-center text-2xl font-extrabold sm:text-3xl">
          Espace Administration
        </h1>
        <p className="mt-1 text-center text-sm text-fg-muted">
          Coordination citoyenne, suivi des priorités et validation des preuves de résolution.
        </p>

        {/* Boutons rapides de démonstration */}
        <div className="mt-5 rounded-2xl border border-line bg-bg-elev p-3 text-xs">
          <p className="font-bold uppercase tracking-wider text-fg-muted">Comptes de démonstration :</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@niofar.sn');
                setPassword('NioFar2026!');
                setErreur(null);
              }}
              className="rounded-xl border border-line bg-bg px-3 py-2 text-left transition-colors hover:border-accent"
            >
              <span className="block font-bold text-accent">Administrateur</span>
              <span className="font-mono text-[11px] text-fg-muted">admin@niofar.sn</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('relais@niofar.sn');
                setPassword('Relais2026!');
                setErreur(null);
              }}
              className="rounded-xl border border-line bg-bg px-3 py-2 text-left transition-colors hover:border-accent"
            >
              <span className="block font-bold text-ochre">Relais terrain</span>
              <span className="font-mono text-[11px] text-fg-muted">relais@niofar.sn</span>
            </button>
          </div>
        </div>

        <form onSubmit={(e) => void soumettre(e)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-bold">
              Identifiant (e-mail)
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg-elev px-4 text-base outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold">
              Mot de passe
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg-elev px-4 text-base outline-none focus:border-accent"
            />
          </div>

          {erreur && (
            <p role="alert" className="rounded-2xl bg-[#C8553D]/15 px-4 py-3 text-sm font-medium">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={enCours} className={`${btn.base} ${btn.accent} w-full`}>
            {enCours ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <KeyRound size={18} aria-hidden />}
            Se connecter
          </button>
        </form>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tableau de bord d'administration                                           */
/* -------------------------------------------------------------------------- */

function TableauDeBordAdmin({
  user,
  onDeconnexion,
}: {
  user: UtilisateurSession;
  onDeconnexion: () => void;
}) {
  const [items, setItems] = useState<SignalementAdmin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sectionAdmin, setSectionAdmin] = useState<'signalements' | 'points_noirs' | 'points_citoyens'>('signalements');
  const [onglet, setOnglet] = useState<'a_traiter' | 'relances' | 'tous' | 'doublons'>('a_traiter');
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [detailScoreId, setDetailScoreId] = useState<string | null>(null);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    try {
      const liste = await api.listerSignalementsAdmin();
      setItems(liste);
      if (!selectionId && liste.length > 0) {
        setSelectionId(liste[0].id);
      }
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deconnecter = async () => {
    await api.deconnexionAdmin();
    onDeconnexion();
  };

  const remplacerItem = (maj: SignalementAdmin) => {
    setItems((prev) =>
      prev
        .map((x) => (x.id === maj.id ? maj : x))
        .sort((a, b) => (b.priorite ?? 0) - (a.priorite ?? 0)),
    );
  };

  const aTraiter = items.filter((s) => !s.estDoublon && s.statut !== 'resolu');
  const enRelance = items.filter(
    (s) => !s.estDoublon && (s.relanceNiveau === 'j3' || s.relanceNiveau === 'j7'),
  );
  const resolusVerifies = items.filter(
    (s) => s.statut === 'resolu' && (Boolean(s.photoApres) || s.confirmationHabitant === true),
  );

  const listeFiltree = items.filter((s) => {
    if (onglet === 'a_traiter') return !s.estDoublon && s.statut !== 'resolu';
    if (onglet === 'relances') return !s.estDoublon && (s.relanceNiveau === 'j3' || s.relanceNiveau === 'j7');
    if (onglet === 'doublons') return s.estDoublon;
    return true;
  });

  const selection = items.find((s) => s.id === selectionId) ?? listeFiltree[0] ?? null;

  const statsCategories = (Object.keys(categorieLabels) as Categorie[]).map((cat) => ({
    nom: categorieLabels[cat],
    valeur: items.filter((s) => s.categorie === cat).length,
    couleur: categoryColors[cat],
  }));

  const statsStatuts = STATUTS.map((st) => ({
    nom: statutInfos[st].label,
    valeur: items.filter((s) => s.statut === st).length,
    couleur: statutInfos[st].couleur,
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:pt-28" aria-labelledby="titre-admin">
      {/* En-tête + profil */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <EnTetePage
          titre="Administration NIO FAR"
          intro={
            <span>
              Connecté en tant que <strong>{user.nom}</strong> (
              <span className="uppercase text-accent">{user.role}</span>).{' '}
              {user.role === 'relais' &&
                'Mode relais : vous pouvez marquer « vérifié sur place » et ajouter une note.'}
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void charger()} className={`${btn.base} ${btn.secondary} text-sm`}>
            <RefreshCw size={16} aria-hidden /> Actualiser
          </button>
          <button type="button" onClick={() => void deconnecter()} className={`${btn.base} ${btn.ghost} text-sm`}>
            <LogOut size={16} aria-hidden /> Déconnexion
          </button>
        </div>
      </div>

      {/* Cartes de chiffres animées */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total signalements', val: items.length, detail: 'Triés par score transparent' },
          { label: 'À traiter', val: aTraiter.length, detail: 'Hors résolus et doublons' },
          {
            label: 'Relances J+3 / J+7',
            val: enRelance.length,
            detail: 'Validation admin requise avant envoi',
          },
          {
            label: 'Résolus vérifiés',
            val: resolusVerifies.length,
            detail: 'Avec photo « après » ou confirmation',
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <TiltCard>
              <div className="glass rounded-3xl p-5 shadow-soft">
                <p className="font-display text-4xl font-extrabold text-accent">
                  <ChiffreAnime valeur={c.val} />
                </p>
                <p className="mt-1 font-bold">{c.label}</p>
                <p className="text-xs text-fg-muted">{c.detail}</p>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>

      {/* Graphiques Recharts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-5 shadow-soft">
          <h2 className="text-base font-bold">Volume par catégorie</h2>
          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsCategories}>
                <XAxis dataKey="nom" stroke="currentColor" fontSize={11} />
                <YAxis allowDecimals={false} stroke="currentColor" fontSize={11} />
                <Tooltip />
                <Bar dataKey="valeur" name="Signalements" radius={[6, 6, 0, 0]}>
                  {statsCategories.map((e) => (
                    <Cell key={e.nom} fill={e.couleur} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-5 shadow-soft">
          <h2 className="text-base font-bold">Avancement par statut</h2>
          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsStatuts}>
                <XAxis dataKey="nom" stroke="currentColor" fontSize={11} />
                <YAxis allowDecimals={false} stroke="currentColor" fontSize={11} />
                <Tooltip />
                <Bar dataKey="valeur" name="Signalements" radius={[6, 6, 0, 0]}>
                  {statsStatuts.map((e) => (
                    <Cell key={e.nom} fill={e.couleur} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {erreur && (
        <div className="mt-6">
          <EtatErreur message={erreur} onReessayer={() => void charger()} />
        </div>
      )}

      {/* Navigation entre les 3 grands modules d'administration */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-bg-elev p-2 shadow-soft">
        {(
          [
            ['signalements', `1. Signalements & Priorités (${items.length})`],
            ['points_noirs', '2. Urbanisme prédictif (« Points noirs »)'],
            ['points_citoyens', '3. Points citoyens & Récompenses (Ledger)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSectionAdmin(id)}
            className={`min-h-11 rounded-2xl px-4 text-sm font-extrabold transition-colors ${
              sectionAdmin === id
                ? 'bg-accent text-accent-fg shadow-glow'
                : 'text-fg-muted hover:bg-fg/5 hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sectionAdmin === 'points_noirs' && <ModulePointsNoirsAdmin />}
      {sectionAdmin === 'points_citoyens' && (
        <ModulePointsCitoyensAdmin estRelais={user.role === 'relais'} />
      )}

      {/* Liste « À traiter » triée par priorité + Fiche de gestion */}
      {sectionAdmin === 'signalements' && (
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
        {/* Colonne gauche : file de priorisation */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-bg-elev p-1.5">
            {(
              [
                ['a_traiter', `À traiter (${aTraiter.length})`],
                ['relances', `Relances (${enRelance.length})`],
                ['tous', `Tous (${items.length})`],
                ['doublons', `Doublons (${items.filter((x) => x.estDoublon).length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setOnglet(id)}
                className={`min-h-10 rounded-xl px-3 text-xs font-bold transition-colors ${
                  onglet === id ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-fg-muted">
            Formule de priorité transparente :{' '}
            <strong>gravité × 2 + signalements similaires + confirmations + 1 pt / 3 jours</strong>.
          </p>

          {chargement ? (
            <Squelette className="h-96 w-full" />
          ) : listeFiltree.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-fg-muted">
              Aucun signalement dans cette vue.
            </div>
          ) : (
            <ul className="space-y-3">
              {listeFiltree.map((s) => {
                const actif = selection?.id === s.id;
                const detailOuvert = detailScoreId === s.id;
                return (
                  <li
                    key={s.id}
                    className={`glass rounded-3xl p-4 transition-all ${
                      actif ? 'ring-2 ring-accent shadow-glow' : 'hover:bg-bg-elev/80'
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectionId(s.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectionId(s.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-accent">{s.code}</span>
                        <BadgeStatut statut={s.statut} taille="sm" />
                        {s.relanceNiveau === 'j7' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#C8553D] px-2.5 py-0.5 text-xs font-bold text-white">
                            <BellRing size={12} aria-hidden /> Relance J+7
                          </span>
                        )}
                        {s.relanceNiveau === 'j3' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ochre px-2.5 py-0.5 text-xs font-bold text-ink">
                            <BellRing size={12} aria-hidden /> Relance J+3
                          </span>
                        )}
                        {s.verifieParRelais && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                            <UserCheck size={12} aria-hidden /> Vérifié relais
                          </span>
                        )}
                        {s.estDoublon && (
                          <span className="rounded-full bg-fg/15 px-2.5 py-0.5 text-xs font-bold">
                            Doublon
                          </span>
                        )}
                        {s.estExemple && <BadgeExemple />}
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-sand dark:bg-sand dark:text-ink">
                          Score {s.priorite ?? 0}
                        </span>
                      </div>

                      <p className="mt-2 font-bold">
                        {categorieLabels[s.categorie]} — {s.secteur}
                      </p>
                      <p className="line-clamp-2 text-sm text-fg-muted">
                        {s.description || 'Signalement vocal ou photo'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                        <span>
                          Gravité : {graviteLabels[s.gravite].label} · {s.confirmations} confirmation(s)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailScoreId(detailOuvert ? null : s.id);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-accent hover:underline"
                        >
                          <HelpCircle size={13} aria-hidden /> Pourquoi ce score ?
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {detailOuvert && s.prioriteDetail && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-xs">
                            <p className="font-bold text-accent">
                              Formule : {s.prioriteDetail.formule}
                            </p>
                            <p className="mt-1 text-fg-muted">{s.prioriteDetail.explication}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Colonne droite : Fiche de gestion complète */}
        <div>
          {selection ? (
            <FicheGestionAdmin
              key={selection.id}
              s={selection}
              user={user}
              onMaj={remplacerItem}
            />
          ) : (
            <div className="glass rounded-4xl p-8 text-center text-fg-muted">
              Sélectionnez un signalement dans la liste pour ouvrir sa fiche de gestion.
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Fiche de gestion détaillée d'un signalement                                */
/* -------------------------------------------------------------------------- */

function FicheGestionAdmin({
  s,
  user,
  onMaj,
}: {
  s: SignalementAdmin;
  user: UtilisateurSession;
  onMaj: (maj: SignalementAdmin) => void;
}) {
  const estRelais = user.role === 'relais';
  const [statut, setStatut] = useState<Statut>(s.statut);
  const [categorie, setCategorie] = useState<Categorie>(s.categorie);
  const [note, setNote] = useState('');
  const [acteurCompetent, setActeurCompetent] = useState(
    s.acteurCompetent || s.acteurSuggere || SUGGESTIONS_ACTEURS[s.categorie],
  );
  const [verifieParRelais, setVerifieParRelais] = useState(Boolean(s.verifieParRelais));
  const [confirmationHabitant, setConfirmationHabitant] = useState<boolean | null>(
    s.confirmationHabitant,
  );
  const [photoApres, setPhotoApres] = useState<string | null>(s.photoApres);
  const [transcriptionSuggeree, setTranscriptionSuggeree] = useState(
    s.suggestion?.transcriptionSuggeree || '',
  );

  const [enCours, setEnCours] = useState(false);
  const [messageOk, setMessageOk] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const suggestionAutoCat = suggererCategorie(transcriptionSuggeree || s.description);

  const surPhotoApres = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compresse = await compresserImage(file);
      setPhotoApres(compresse);
    } catch (err) {
      setErreur(messageErreur(err));
    }
  };

  const enregistrerFiche = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    setMessageOk(null);
    try {
      const payload = estRelais
        ? {
            verifieParRelais,
            statut: verifieParRelais && s.statut === 'recu' ? ('a_verifier' as Statut) : undefined,
            note: note.trim() || undefined,
          }
        : {
            statut,
            categorie,
            note: note.trim() || undefined,
            acteurCompetent: acteurCompetent.trim() || null,
            verifieParRelais,
            photoApres,
            confirmationHabitant,
            transcriptionSuggeree,
          };

      const maj = await api.modifierStatutAdmin(s.id, payload);
      onMaj(maj);
      setNote('');
      setMessageOk('Modifications enregistrées avec succès.');
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const basculerDoublon = async () => {
    setEnCours(true);
    setErreur(null);
    setMessageOk(null);
    try {
      const maj = await api.marquerDoublonAdmin(s.id, !s.estDoublon);
      onMaj(maj);
      setMessageOk(maj.estDoublon ? 'Marqué comme doublon.' : 'Statut doublon retiré.');
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const validerRelance = async () => {
    setEnCours(true);
    setErreur(null);
    setMessageOk(null);
    try {
      const maj = await api.validerRelanceAdmin(s.id);
      onMaj(maj);
      setMessageOk('Relance validée et consignée dans l’historique.');
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const regleResoluRespectee = Boolean(photoApres) || confirmationHabitant === true;

  return (
    <form
      onSubmit={(e) => void enregistrerFiche(e)}
      className="glass space-y-5 rounded-4xl p-5 shadow-soft sm:p-6"
    >
      {/* En-tête de la fiche */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-extrabold text-accent">{s.code}</span>
            <BadgeStatut statut={s.statut} />
            {s.estExemple && <BadgeExemple />}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
            <MapPin size={14} aria-hidden /> {s.secteur}
            {s.latitude !== null && ` (${s.latitude}, ${s.longitude})`}
          </p>
        </div>
        <Link
          to={`/signalements/${s.id}`}
          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold hover:border-accent"
        >
          Fiche publique <ExternalLink size={13} aria-hidden />
        </Link>
      </div>

      {/* Pourquoi ce score ? */}
      {s.prioriteDetail && (
        <div className="rounded-2xl border border-line bg-bg-elev p-3.5 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span>Priorisation transparente (« Pourquoi ce score ? »)</span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-accent-fg">
              Score : {s.prioriteDetail.score} pts
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-accent">{s.prioriteDetail.formule}</p>
          <p className="mt-1 text-fg-muted">{s.prioriteDetail.explication}</p>
        </div>
      )}

      {/* Alerte de relance J+3 / J+7 */}
      {(s.relanceNiveau === 'j3' || s.relanceNiveau === 'j7') && (
        <div className="rounded-2xl border border-ochre/60 bg-ochre/15 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-extrabold">
              <BellRing size={16} aria-hidden />
              {s.relanceNiveau === 'j7' ? 'Relance J+7 détectée' : 'Relance J+3 détectée'}
            </span>
            {!estRelais && !s.relanceValideeAdmin && (
              <button
                type="button"
                disabled={enCours}
                onClick={() => void validerRelance()}
                className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-sand"
              >
                Valider la relance (admin)
              </button>
            )}
            {s.relanceValideeAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                <Check size={14} aria-hidden /> Relance validée par l’admin
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Aucune relance n’est envoyée automatiquement à une institution sans validation de l’administrateur.
          </p>
        </div>
      )}

      {/* Description citoyenne & Contact confidentiel */}
      <div className="space-y-2 rounded-2xl border border-line bg-bg-elev p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">
          Message de l’habitant
        </p>
        <p className="text-base">{s.description || 'Aucune description écrite.'}</p>
        {s.contact && (
          <p className="mt-2 rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
            Contact confidentiel ({s.contact.type}) : {s.contact.valeur} — jamais exposé publiquement
          </p>
        )}
      </div>

      {/* Écoute de la note vocale + Transcription suggérée modifiable */}
      <div className="space-y-3 rounded-2xl border border-line bg-bg-elev p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold">
            <Mic size={16} className="text-accent" aria-hidden /> Note vocale & suggestion de transcription
          </span>
          {s.suggestion && (
            <span className="rounded-full bg-fg/10 px-2.5 py-0.5 text-[11px] font-semibold">
              {s.suggestion.statutValidation === 'en_attente'
                ? 'Suggestion à vérifier'
                : 'Vérifiée par humain'}
            </span>
          )}
        </div>

        {s.audio ? (
          <div>
            <p className="mb-1 text-xs text-fg-muted">
              <Volume2 size={13} className="mr-1 inline" aria-hidden />
              Écoute humaine de la note vocale originale :
            </p>
            <audio controls src={s.audio} className="h-11 w-full" preload="metadata" />
          </div>
        ) : (
          <p className="text-xs text-fg-muted">Aucune note vocale jointe à ce signalement.</p>
        )}

        <div>
          <label htmlFor="admin-transcription" className="block text-xs font-bold">
            Transcription suggérée (modifiable, stockée à part)
          </label>
          <textarea
            id="admin-transcription"
            rows={2}
            disabled={estRelais}
            value={transcriptionSuggeree}
            onChange={(e) => setTranscriptionSuggeree(e.target.value)}
            placeholder="Saisir ou corriger la transcription après écoute humaine…"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="mt-1 text-[11px] text-fg-muted">
            Note : l’adaptateur wolof automatique est désactivé par défaut tant qu’il n’a pas été validé sur corpus local.
          </p>
        </div>

        {suggestionAutoCat && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ochre/15 px-3 py-2 text-xs">
            <span>
              <Sparkles size={13} className="mr-1 inline" aria-hidden />
              Catégorie suggérée par mots-clés :{' '}
              <strong>{categorieLabels[suggestionAutoCat.categorie]}</strong> (
              {suggestionAutoCat.motsTrouves.join(', ')})
            </span>
            {!estRelais && suggestionAutoCat.categorie !== categorie && (
              <button
                type="button"
                onClick={() => {
                  setCategorie(suggestionAutoCat.categorie);
                  setActeurCompetent(SUGGESTIONS_ACTEURS[suggestionAutoCat.categorie]);
                }}
                className="font-bold text-accent underline"
              >
                Appliquer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Statut & Acteur compétent */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="admin-statut" className="block text-sm font-bold">
            Statut du signalement
          </label>
          <select
            id="admin-statut"
            disabled={estRelais}
            value={statut}
            onChange={(e) => setStatut(e.target.value as Statut)}
            className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-bg-elev px-3 text-sm font-semibold outline-none focus:border-accent disabled:opacity-60"
          >
            {STATUTS.map((st) => (
              <option key={st} value={st}>
                {statutInfos[st].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="admin-acteur" className="block text-sm font-bold">
            Acteur compétent{' '}
            <span className="text-xs font-normal text-accent">(suggestion à confirmer)</span>
          </label>
          <input
            id="admin-acteur"
            type="text"
            disabled={estRelais}
            value={acteurCompetent}
            onChange={(e) => setActeurCompetent(e.target.value)}
            placeholder={SUGGESTIONS_ACTEURS[categorie]}
            className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-bg-elev px-3 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
          {!estRelais && (
            <p className="mt-1 text-[11px] text-fg-muted">
              Suggestion pour « {categorieLabels[categorie]} » :{' '}
              <button
                type="button"
                onClick={() => setActeurCompetent(SUGGESTIONS_ACTEURS[categorie])}
                className="font-bold text-accent underline"
              >
                {SUGGESTIONS_ACTEURS[categorie]}
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Case « Vérifié par un relais » & Confirmation habitant */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-bg-elev p-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={verifieParRelais}
            onChange={(e) => setVerifieParRelais(e.target.checked)}
            className="h-5 w-5 accent-[#0B6B4F]"
          />
          <span>Vérifié sur place par un relais</span>
        </label>

        {!estRelais && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-bg-elev p-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={confirmationHabitant === true}
              onChange={(e) => setConfirmationHabitant(e.target.checked ? true : null)}
              className="h-5 w-5 accent-[#0B6B4F]"
            />
            <span>Confirmé réglé par l’habitant</span>
          </label>
        )}
      </div>

      {/* Photo « après » et règle métier du statut Résolu */}
      {!estRelais && (
        <div className="rounded-2xl border border-line bg-bg-elev p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Photo « après » intervention</p>
            {statut === 'resolu' && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  regleResoluRespectee
                    ? 'bg-accent/15 text-accent'
                    : 'bg-[#C8553D]/20 text-[#C8553D]'
                }`}
              >
                {regleResoluRespectee
                  ? 'Preuve de résolution présente'
                  : 'Requis pour passer en « Résolu »'}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Règle métier : le statut « Résolu » exige obligatoirement une photo « après » OU la confirmation de l’habitant.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.photo && (
              <div>
                <p className="mb-1 text-xs font-semibold text-fg-muted">Photo « avant »</p>
                <img src={s.photo} alt="Avant" className="h-32 w-full rounded-xl object-cover" />
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-accent">Photo « après »</p>
              {photoApres ? (
                <div className="relative">
                  <img src={photoApres} alt="Après" className="h-32 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoApres(null)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-sand"
                  >
                    <Trash2 size={12} aria-hidden /> Retirer
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line text-xs font-semibold text-fg-muted hover:border-accent">
                  <Camera size={20} aria-hidden />
                  <span className="mt-1">Ajouter une photo « après »</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => void surPhotoApres(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Note d'historique */}
      <div>
        <label htmlFor="admin-note" className="block text-sm font-bold">
          Ajouter une note au journal de suivi
        </label>
        <textarea
          id="admin-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. : Vérifié ce matin sur place, transmis aux équipes techniques…"
          className="mt-1 w-full rounded-2xl border border-line bg-bg-elev px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>

      {erreur && (
        <p role="alert" className=" flex items-center gap-2 rounded-2xl bg-[#C8553D]/15 px-4 py-3 text-sm font-semibold">
          <AlertCircle size={18} className="shrink-0 text-[#C8553D]" aria-hidden />
          {erreur}
        </p>
      )}

      {messageOk && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-accent/15 px-4 py-3 text-sm font-semibold text-accent">
          <CheckCircle2 size={18} aria-hidden />
          {messageOk}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {!estRelais && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={enCours}
              onClick={() => void basculerDoublon()}
              className={`${btn.base} ${btn.secondary} text-xs`}
            >
              <CopyCheck size={15} aria-hidden />
              {s.estDoublon ? 'Retirer doublon' : 'Marquer doublon (0 pt)'}
            </button>
            <button
              type="button"
              disabled={enCours || Boolean(s.estMalveillant)}
              onClick={async () => {
                setEnCours(true);
                setErreur(null);
                setMessageOk(null);
                try {
                  const maj = await api.modifierStatutAdmin(s.id, {
                    estMalveillant: true,
                    note: 'Signalement classé comme malveillant / abusif (retrait de points citoyens dans le ledger).',
                  });
                  onMaj(maj);
                  setMessageOk('Signalement marqué malveillant (retrait de points inscrit au ledger).');
                } catch (err) {
                  setErreur(messageErreur(err));
                } finally {
                  setEnCours(false);
                }
              }}
              className={`${btn.base} min-h-10 bg-[#C8553D]/15 px-4 text-xs text-[#C8553D] hover:bg-[#C8553D]/25`}
            >
              {s.estMalveillant ? 'Classé malveillant (-20 pts)' : 'Signaler malveillant (-20 pts)'}
            </button>
          </div>
        )}
        <button type="submit" disabled={enCours} className={`${btn.base} ${btn.accent} ml-auto`}>
          {enCours ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
          Enregistrer les modifications
        </button>
      </div>

      {/* Historique complet */}
      <div className="border-t border-line pt-4">
        <h3 className="text-sm font-bold">Historique du signalement ({s.historique.length})</h3>
        <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1 text-xs">
          {[...s.historique].reverse().map((h, i) => (
            <li key={`${h.date}-${i}`} className="rounded-xl border border-line bg-bg-elev p-2.5">
              <div className="flex items-center justify-between">
                <BadgeStatut statut={h.statut} taille="sm" />
                <span className="text-fg-muted">{formaterDateHeure(h.date)}</span>
              </div>
              <p className="mt-1">{h.note}</p>
              {h.auteur && <p className="mt-0.5 text-[11px] text-fg-muted">Par {h.auteur}</p>}
            </li>
          ))}
        </ol>
      </div>
    </form>
  );
}
