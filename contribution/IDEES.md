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
- **Fait** : la synchronisation par Internet, par un relais (voir le journal, `feat/synchro-internet`),
  web compris.
- **Fait** : l'écriture en temps réel (voir le journal, `feat/synchro-direct`), curseurs compris.
- **Fait** : l'interface (voir le journal, `feat/synchro-interface`) : Réglages › Synchronisation,
  ajout d'un appareil, « Recevoir un coffre », barre d'état ; recette 31 avec deux apps réelles.
- **Fait** : le réseau local (voir le journal, `feat/synchro-reseau-local`) : les apps de bureau se
  trouvent et se relient sans serveur ; appairage, reconnexion, retrait d'un appareil.
- **À faire, dans l'ordre** :
  1. Comptes (facultatifs) : se connecter sur un nouvel appareil le relie à ses autres appareils (avec
     consentement) et synchronise ses coffres d'emblée ; puis le partage (section dédiée).
  2. WebRTC pour aller en direct quand c'est possible ; relais qui garde les données chiffrées pour un
     appareil éteint.
- Options de la maquette pas encore faites : dossiers qui restent sur l'appareil, pièces jointes
  (oui/non, taille maximale), réglages du coffre (`.cobblestone/`, pas synchronisé aujourd'hui),
  service de mise en relation personnalisé, option pour masquer les curseurs des autres appareils.
- Comparer les deux versions d'une note en conflit (aujourd'hui : ouvrir la copie).
- Historique des versions de chaque note.
- Retirer un appareil le refuse aux sessions, mais il garde les notes déjà reçues ; quand un relais
  gardera des données chiffrées, il faudra changer la clé du coffre au retrait d'un appareil.
- **Fait** : le relais officiel tourne sur le VPS de l'utilisateur (`cobblestone.marc-antoinemarie.com`).
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
