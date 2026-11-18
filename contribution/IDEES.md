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
- **Fait** : le chiffrement et l'appairage (voir le journal, `feat/synchro-chiffrement`) : clé par
  appareil, sessions chiffrées de bout en bout, appairage par un code de neuf caractères.
- **Fait** : les comptes (voir le journal, `feat/comptes-serveur`, `feat/comptes-app`,
  `feat/comptes-appareils`) : un nouvel appareil se connecte, un autre l'autorise après comparaison d'un
  code, et il reçoit les coffres proposés au compte (choix coffre par coffre).
- **Fait** : la synchronisation par Internet, par un relais (voir le journal, `feat/synchro-internet`),
  web compris.
- **Fait** : l'écriture en temps réel (voir le journal, `feat/synchro-direct`), curseurs compris.
- **Fait** : l'interface (voir le journal, `feat/synchro-interface`) : Réglages › Synchronisation,
  ajout d'un appareil, « Recevoir un coffre », barre d'état ; recette 31 avec deux apps réelles.
- **Fait** : le réseau local (voir le journal, `feat/synchro-reseau-local`) : les apps de bureau se
  trouvent et se relient sans serveur ; appairage, reconnexion, retrait d'un appareil.
- **À faire, dans l'ordre** :
  1. Synchroniser en arrière-plan tous les coffres proposés au compte, même fermés (aujourd'hui, un
     coffre ne s'échange que s'il est ouvert sur un appareil) ; recevoir automatiquement les coffres du
     compte dans un dossier par défaut (option).
  2. Le partage avec d'autres personnes (section dédiée).
  3. WebRTC pour aller en direct quand c'est possible ; relais qui garde les données chiffrées pour un
     appareil éteint.
- Options de la maquette pas encore faites : dossiers qui restent sur l'appareil, pièces jointes
  (oui/non, taille maximale), réglages du coffre (`.cobblestone/`, pas synchronisé aujourd'hui),
  service de mise en relation personnalisé, option pour masquer les curseurs des autres appareils.
- Garde-fou contre deux nœuds sur un même coffre (le bug du 18 novembre, corrigé côté app) : un
  verrou dans `.cobblestone/sync/` ou un refus au démarrage rendrait la règle impossible à enfreindre,
  y compris entre deux fenêtres ou deux apps ouvertes sur le même dossier.
- Comparer les deux versions d'une note en conflit (aujourd'hui : ouvrir la copie).
- Historique des versions de chaque note.
- Retirer un appareil le refuse aux sessions, mais il garde les notes déjà reçues ; quand un relais
  gardera des données chiffrées, il faudra changer la clé du coffre au retrait d'un appareil.
- Le retrait ne vaut que pour les appareils qui l'ont reçu : un troisième appareil qui ne le sait pas
  encore (éteint, ou coupé de celui qui retire) prend encore une modification de l'appareil retiré,
  et elle se propage ensuite comme une autre. Rien ne met les deux événements dans un ordre commun.
  À atténuer : un bail de participation à renouveler, qui bornerait la fenêtre. Voir
  [docs/guide/security.md](../docs/guide/security.md).
- **Fait** : le relais officiel tourne sur le VPS de l'utilisateur (`sync.cobblestone.marc-antoinemarie.com`) ; l'app web sera à `cobblestone.marc-antoinemarie.com`.
- Pas de quotas pour l'instant (décision du 1er octobre) : seulement un plafond contre les abus
  (30 Go par jour par compte ou par adresse IP). **Plus tard**, quand il y aura beaucoup d'utilisateurs :
  réfléchir à des quotas.

### Partage avec d'autres personnes — à décider (après la synchronisation)

Demande du 1er octobre : partager tout le coffre, une note ou un dossier avec qui on veut, avec les
droits qu'on veut (lecture, écriture…), de façon **entièrement sécurisée et contrôlée**.

- Piste : chaque personne a une identité (clé), avec un compte facultatif pour se retrouver ; chaque
  partage (note, dossier, coffre) est un document chiffré à part, avec sa clé, envoyé seulement aux
  personnes invitées ; les droits sont signés par le propriétaire et vérifiés par chaque appareil
  (une modification d'un lecteur est refusée) ; retirer quelqu'un change la clé du partage.
- Il faut d'abord la synchronisation par Internet (service de mise en relation et relais).
- **Décidé (1er octobre)** : les deux, au choix de chacun. Sans compte : invitation par code **et**
  par lien. Avec compte : de vrais comptes (adresse e-mail, serveur), pour ceux qui le veulent.

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

## Téléphone — en cours (refonte décidée le 2026-11-16)

Refonte validée sur le prototype : pas de barre d'onglets, accueil épinglées puis récentes, note du
jour en un geste. Fait : zoom iPhone corrigé, accueil et navigation en pile, feuille d'infos de la
note, barre au-dessus du clavier, tablette. Reste, dans l'ordre :

1. **Réglages téléphone** (à faire) : « Ouvrir les notes en » lecture ou écriture, avec aperçu ;
   propriétés en pastilles sous le titre en lecture.
2. **À vérifier sur un vrai iPhone** (à faire) : position de la barre du clavier et de la recherche
   quand Safari fait défiler la page sous le clavier.
3. Applications natives Android et iOS avec Capacitor (plus tard), avec de vrais dossiers (stockage
   partagé sur Android, app Fichiers sur iPhone). Détails dans [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md).

## Refonte de l'interface sur ordinateur — en cours (fusion validée le 2026-11-17)

L'ossature est faite : la liste des notes à gauche (récentes, dossiers, tags, recherche), la note au
milieu, la marge à droite (rail de boutons, un panneau à la fois). Reste, dans l'ordre :

1. **Barre de mise en forme** (à faire) : en écriture, gras, italique, titre, liste, case, lien,
   tableau, image, et la bascule Document / Markdown (vue sans Markdown visible).
2. **Tableaux** (à faire) : édition en cellules dans la note (ajouter une ligne, une colonne, trier),
   et une vue tableur plein écran ; le fichier reste un tableau Markdown.
3. **Groupes de favoris** (à décider) : les favoris importés d'Obsidian en groupes s'affichent à plat
   dans les épinglées ; décider comment montrer les groupes.
4. **Assistant dans la marge** (à décider) : un cinquième bouton du rail, une fois l'IA et les MCP en
   place (voir la section suivante).

## IA et MCP — à décider (demandés le 2026-11-17)

1. Brancher les serveurs MCP choisis par l'utilisateur, pour qu'un assistant agisse sur les notes,
   le graphe, les tags et la recherche.
2. Exposer le coffre lui-même comme serveur MCP (lire, chercher, créer, relier des notes), pour les
   assistants extérieurs.
3. Prise de notes assistée : résumer, relier, ranger, proposer des tags et des liens ; à cadrer avec
   la vie privée (clé et modèle choisis par l'utilisateur, rien d'envoyé sans accord).

## Synchronisation en direct — à vérifier (repéré le 2026-11-17)

- Sur un stockage lent (téléphone), une écriture de fichier qui met plus de 350 ms peut encore
  ramener un texte en retard dans un coffre sans texte partagé ; à mesurer sur un vrai iPhone.
- Frappe simultanée pendant une composition du clavier (correction automatique d'iOS, Android) : à
  tester à deux appareils réels.

## Sécurité de l'app web — à faire (repéré le 2026-11-18, en écrivant le guide)

Le domaine de l'app web contient le coffre (OPFS) **et** la clé privée de l'appareil (IndexedDB) :
tout ce qui s'exécute sur cette origine les lit. Détail du modèle : [docs/guide/security.md](../docs/guide/security.md).

- **En-têtes de sécurité absents** sur `deploy/web/cobblestone.nginx.conf` : pas de
  `Content-Security-Policy`, pas de HSTS, pas de `X-Content-Type-Options`, pas de `frame-ancestors`.
  L'app de bureau a une CSP (meta dans son `index.html`), l'app web n'a rien d'équivalent. À ajouter
  côté nginx **et** en `<meta>` dans `apps/web/index.html` (pour un hébergement par quelqu'un
  d'autre), avec une ligne de recette dans la section 28.
- **Clés en clair au repos** : la clé privée de l'appareil est dans IndexedDB (web) et
  `storage.json` (bureau). À décider : clé enveloppée par une phrase de passe, trousseau du système
  (absent dans un navigateur), ou accepté tel quel et documenté.
- **Pas de `navigator.storage.persist()`** : un coffre « dans le navigateur » peut être évincé si le
  navigateur manque de place — risque de **perte de données**. À demander (et à expliquer dans
  l'interface quand c'est refusé).
- Les dépôts du relais révèlent la taille et le moment des échanges (pas de remplissage ni de trafic
  de couverture) : à accepter explicitement ou à atténuer.

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
- Ajouter une parti gestion de projet complete en bonus
- pouvoir exporter dans n'importe quel format
- avoir acces a un éditeur type word pour pouvoir faire du traitement de texte facilement en md en modifiant comme l'ont veut sans forcement taper le md a la main

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
