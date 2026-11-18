# NIO FAR — Guide de Présentation au Jury (Banlieue Smart Genius 2026)

> **Catégorie** : *Smart Territory* · **Territoire cible** : Banlieue de Dakar (Pikine, Guédiawaye, Keur Massar, Thiaroye, Yeumbeul, Malika, Mbao, Rufisque).
> *« Nio far » : nous sommes ensemble, en wolof.*

---

## 1. Parcours de démonstration en 3 minutes (chronométré)

### 0:00 – 0:30 · L’accroche & l’accueil 3D (30 s)
1. Ouvrir la page d’accueil (`/`).
2. Montrer la **scène 3D interactive** du quartier au coucher du soleil : le lampadaire qui s’allume automatiquement, le camion de collecte qui s’arrête devant le bac à déchets, et les 4 marqueurs lumineux (**Déchets, Eau stagnante, Éclairage public, Voirie**).
3. Basculer le **mode sombre / clair** dans l’en-tête pour illustrer la cohérence visuelle et l’accessibilité en plein soleil comme de nuit.

### 0:30 – 1:45 · Le Mode Démo guidé en 5 temps (1 min 15 s)
Cliquer sur le bouton discret **« Mode démo »** (en bas à droite) qui charge des exemples étiquetés **« Exemple fictif »** et déroule en direct les 5 temps du cycle de vie citoyen :
1. **Temps 1/5 — Un habitant signale par la voix** : création du signalement vocal `NF-DEMO5` (caniveau bouché et eau stagnante à Pikine, étiqueté *Exemple fictif*) avec code de suivi sans création de compte.
2. **Temps 2/5 — L’admin vérifie** : écoute humaine de la note vocale originale, vérification de la suggestion de transcription et validation par un relais de quartier (+10 points citoyens dans le journal auditable si compte OTP facultatif rattaché).
3. **Temps 3/5 — Statut « Transmis » (acteur suggéré affiché)** : passage au statut **« Transmis »** avec l’acteur compétent suggéré (**ONAS** pour l’eau stagnante, **SONAGED** pour les déchets, **Senelec ou mairie** pour l’éclairage, **Services techniques de la mairie** pour la voirie) et mécanisme de relance J+3 / J+7 soumis à validation admin.
4. **Temps 4/5 — Résolution avec photo « après » + Confirmation de l’habitant** : téléversement de la photo « après » et confirmation par l’habitant (*« Oui, réglé »*). Expliquer la règle métier : si l’habitant clique *« Non, toujours là »*, le signalement repasse immédiatement en *« À vérifier »*.
5. **Temps 5/5 — Mise à jour en direct de la Transparence & des « Points noirs »** : les compteurs de transparence (`/transparence`) et la carte prédictive se mettent à jour instantanément.

### 1:45 – 2:30 · Urbanisme prédictif (« Points noirs ») & Export PDF communes (45 s)
1. Ouvrir `/admin` (compte démo pré-rempli `admin@niofar.sn` / `NioFar2026!`) puis l’onglet **« 2. Urbanisme prédictif (« Points noirs ») »**.
2. Montrer la **carte de chaleur** avant l’hivernage et les prévisions de pluie **Open-Meteo Dakar** (sans clé, 7 jours).
3. Cliquer sur **« Pourquoi ? »** sur Pikine ou Guédiawaye pour afficher la formule explicable à 4 facteurs pondérés : **Densité (35 %) + Récurrence (30 %) + Saisonnalité mensuelle (20 %) + Pluie Open-Meteo (15 %)**.
4. Cliquer sur **Keur Massar** ou **Rufisque** pour montrer le **garde-fou** en action : moins de 30 signalements dans le secteur = **« Données insuffisantes »**.
5. Cliquer sur **« Exporter le rapport en PDF pour les communes »** pour afficher le rapport municipal prêt à imprimer.

### 2:30 – 3:00 · Points citoyens, Classement par quartier & PWA hors-ligne (30 s)
1. Ouvrir `/points` (**Quartiers & Points**) : montrer le **classement collectif par quartier** (aucun individu exposé), le compte citoyen **100 % facultatif** par OTP, le journal auditable (**ledger**) et le catalogue étiqueté **« Récompenses en cours de lancement »** avec `PayoutProvider` (Wave / Orange Money) en **MODE SIMULATION** et entrées sponsors vides.

---

## 2. Les 5 points forts pour le jury

1. **Inclusion vocale & fonctionnement hors-ligne réel (PWA)** : un habitant peut signaler en 30 secondes à la voix (en wolof ou en français) sans savoir écrire et sans créer de compte. En cas de coupure réseau, le signalement est stocké dans IndexedDB et synchronisé automatiquement avec idempotence par UUID client.
2. **Preuve citoyenne de résolution (anti « faux résolus »)** : l’administrateur a l’interdiction technique de passer un signalement à *« Résolu »* sans **photo « après »** ou **confirmation de l’habitant**. Si un habitant répond *« Non, toujours là »*, le dossier est réouvert en *« À vérifier »*.
3. **Priorisation et prédiction 100 % explicables (« Pourquoi ce score ? »)** : aucune boîte noire. Le score de priorité d’un signalement et le score prédictif pré-hivernage (« Points noirs » croisé avec l’API météo Open-Meteo de Dakar) affichent leurs facteurs, leurs poids et un garde-fou strict (*« Données insuffisantes »* sous 30 signalements par secteur).
4. **Gamification prudente, collective et anti-fraude** : le signalement anonyme reste prioritaire. Les points du compte OTP facultatif ne sont crédités qu’**après vérification** par un relais ou un admin, avec plafond quotidien (30 pts/jour), 0 point pour les doublons, retrait (-20 pts) en cas de malveillance, ledger auditable, et **classement uniquement par quartier** pour ne jamais exposer les individus.
5. **Respect strict de la vie privée (Open Data anonymisé)** : coordonnées GPS arrondies à 3 décimales (≈ 100 m), numéros hachés avec sel, enregistrements vocaux réservés à l’écoute humaine protégée côté admin, et exports Open Data (CSV / JSON) purgés de toute donnée personnelle ou description libre.

---

## 3. Limites honnêtes du prototype (Transparence envers le jury)

Conformément à notre charte d’honnêteté, NIO FAR ne présente aucun chiffre d’impact, partenaire ou modèle d’IA comme réel :

- **Modèle de reconnaissance vocale wolof non validé (désactivé par défaut)** : l’architecture `TranscriptionProvider` sépare le français (Whisper) et le wolof (`WOLOF_ASR_ENABLED=false`). Tant qu’un modèle open source wolof n’a pas été évalué et validé sur un corpus local de la banlieue de Dakar, aucune fausse transcription automatique n’est affichée : l’audio original est écouté par un humain (relais ou admin) et toute transcription reste une suggestion stockée à part. De même, la lecture vocale en wolof est réservée à de vrais fichiers enregistrés par un locuteur natif (aucune voix synthétique approximative).
- **Urbanisme prédictif strictement indicatif** : chaque carte et score « Points noirs » porte la mention obligatoire *« Indicatif, basé sur les données de NIO FAR »*. En dessous de 30 signalements dans un secteur, le calcul est bloqué et affiche *« Données insuffisantes »*.
- **Récompenses et Mobile Money en MODE SIMULATION** : le catalogue affiche clairement *« Récompenses en cours de lancement »*. Le branchement Wave et Orange Money (`PayoutProvider`) fonctionne exclusivement en simulation. Aucun partenaire, aucun sponsor RSE et aucun montant financier n’ont été inventés : les champs sponsors sont des entrées vides à remplir lorsqu’un accord officiel sera signé.
- **Aucune donnée réelle ni institution représentée sans mandat** : tous les signalements préchargés portent le badge visible **« Exemple fictif »** et peuvent être retirés en un clic. Les acteurs affichés (SONAGED, ONAS, Senelec, services techniques municipaux) sont présentés comme des suggestions d’orientation à confirmer par l’administrateur.

---

## 4. Prochaines étapes (Feuille de route post-concours)

1. **Collecte et validation d’un corpus vocal wolof/français local** avec des relais communautaires de Pikine, Guédiawaye et Keur Massar pour calibrer l’adaptateur ASR wolof et enregistrer les messages vocaux natifs des 5 statuts.
2. **Pilote terrain dans 2 communes partenaires** avant l’hivernage pour alimenter le module « Points noirs » avec des signalements réels vérifiés par des relais de quartier.
3. **Signature de conventions RSE locales** (opérateurs, commerces de proximité) pour activer un premier palier réel dans le catalogue de récompenses collectives par quartier et basculer l’interface `PayoutProvider` du mode simulation vers une API marchande agréée.
4. **Intégration de notifications WhatsApp / SMS automatisées** pour prévenir gratuitement les habitants ayant laissé un contact facultatif lors du passage de leur code `NF-XXXXX` au statut *« Résolu »*.
