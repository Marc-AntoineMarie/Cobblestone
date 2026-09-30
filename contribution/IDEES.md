# Idées et travail à faire

Tout ce qui n'est pas encore fait : idées, demandes, bugs repérés, décisions à prendre. Une idée
réalisée sort d'ici et sa fiche du [journal](JOURNAL.md) la remplace. Les grandes étapes publiques sont
dans [docs/ROADMAP.md](../docs/ROADMAP.md) ; ce fichier-ci est la liste de travail détaillée.

Statuts : **à faire** (décidé), **à décider** (il faut trancher), **en cours**, **plus tard**.

## En priorité

### Synchronisation entre appareils — en cours

Le but premier de Cobblestone : retrouver ses notes sur son PC portable, son PC fixe et plus tard son
téléphone, sans serveur qui les garde. **Pas encore disponible dans l'app** : aujourd'hui, chaque
appareil a sa copie.

- **Fait** : le moteur (voir le journal, `feat/synchro-moteur`) : le coffre en CRDT (Yjs), fusion des
  textes, renommages, suppressions vers la corbeille, pièces jointes par empreinte, conflits de noms,
  rattrapage de ce qui a changé app fermée. Testé entre appareils simulés en mémoire.
- **À faire, dans l'ordre** :
  1. Appairage par code (ou QR code) et chiffrement de bout en bout ; page Réglages › Synchronisation
     (appareils appairés, état, dernière synchro).
  2. Transport sur le réseau local entre deux apps de bureau, sans aucun serveur.
  3. Transport WebRTC par Internet et pour l'app web, avec un petit service de mise en relation
     auto-hébergeable ; un relais chiffré pour synchroniser quand l'autre appareil est éteint.
- Historique des versions de chaque note.
- **Limite connue** : l'éditeur enregistre 350 ms après la dernière touche ; une frappe au même moment
  sur deux appareils peut perdre quelques caractères. Remède prévu : relier l'éditeur directement au
  texte partagé (y-codemirror) quand la synchro arrivera dans l'app.
- **À décider** : où héberger le service de mise en relation et le relais officiels.

### Refonte du design et personnalisation — presque faite

Demande du 30 septembre : une interface ergonomique, intuitive, optimisée pour l'utilisateur, et
**personnalisable à fond** depuis les réglages, avec un aperçu en direct.

- Maquettes dans Claude Design, validées (carte blanche) :
  https://claude.ai/artifact/Lk4b71TLeUhCzyCvcemJ98 (espace de travail, personnalisation rapide,
  Réglages › Apparence et › Disposition avec aperçu, variante Minuit).
- **Fait** : l'apparence (voir le journal, `feat/themes`) : huit thèmes, couleurs par rôle, thèmes à
  soi exportables, polices, densité, coins, extraits CSS, réglages à sections avec recherche et aperçu.
- **Fait** : la disposition (voir le journal, `feat/disposition`) : barre du haut avec champ de
  commande, barre d'activité, panneaux à gauche, à droite ou masqués (menu, glisser, réglages),
  dispositions prêtes, barre d'état avec l'apparence rapide, Réglages › Disposition avec schéma.
- **Plus tard** :
  - Onglets sur le côté (une colonne d'onglets) ; un panneau à la fois par côté, en option.
  - Graphe local en panneau ; redimensionner les côtés à la souris.
  - Raccourcis clavier personnalisables (section Raccourcis des réglages).

## Téléphone — plus tard (après la synchronisation)

1. Application web installable (PWA) à partir de l'app web, avec une interface repensée pour le
   tactile (barre du bas, tiroirs, grandes cibles, clavier virtuel) et le hors-ligne.
2. Applications natives Android et iOS avec Capacitor, qui réutilisent ce travail, avec de vrais
   dossiers (stockage partagé sur Android, app Fichiers sur iPhone).

Détails et coûts dans [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md).

## Distribution — à décider

- Compte Apple Developer (99 $ par an) : macOS sans alerte à l'ouverture, puis l'App Store iOS.
- Signature Windows : SignPath (gratuit pour l'open source), Microsoft Store (gratuit), ou les deux.
- Nom de domaine pour l'app web et le site.
- À faire ensuite : mises à jour automatiques, Flathub, winget, AUR et .rpm, déploiement de l'app web
  à chaque version.

## Identité

- **Logo** — à faire ensemble : l'actuel est provisoire, clin d'œil à Minecraft souhaité (le bloc de
  pierre taillée).

## Parité avec Obsidian — à faire

- Créateur de notes uniques, éditeur de propriétés typées.
- Édition des tableaux, lecteur PDF avec annotations, enregistreur audio, diaporamas, récupération de
  fichiers, espaces de travail.
- Raccourcis personnalisables, extraits CSS et thèmes, plusieurs fenêtres.
- Import depuis Notion, Evernote, Apple Notes, Logseq, Roam, Bear.

## Au-delà d'Obsidian — plus tard

- Requêtes sur les notes et propriétés (façon Dataview), compatibles avec les fichiers `.base`.
- Tableaux kanban, vue des tâches de tout le coffre, calendrier.
- Publier un dossier comme site web, gratuitement.
- API de plugins, avec une couche de compatibilité pour les plugins Obsidian les plus utilisés.
- Rendre Cobblestone compatible a tous les logiciels Md, il faut que l'ont puisse importer tout a partir de n'importe quoi

## Organisations — plus tard

Fonctions payantes : authentification unique (SAML, OIDC), provisionnement SCIM, rôles et
permissions, console d'administration, journaux d'audit, rétention, hébergement dédié.

## Petites améliorations repérées — à faire

- Aperçu en direct : masquer les ``` des blocs de code quand le curseur est ailleurs, comme Obsidian
  (vu sur une capture du 29 septembre).
- Encadré « coffre introuvable » par-dessus un coffre ouvert : garder le focus clavier à l'intérieur.
- Une seule instance de l'app de bureau à la fois : deux instances écriraient les mêmes réglages.
- Vérifier la CI sur GitHub au prochain push (correctif du lancement d'Electron sans bac à sable).
- Valider la clause « Droits sur les contributions » de [CONTRIBUTING.md](../CONTRIBUTING.md).
