# Idées et travail à faire

Tout ce qui n'est pas encore fait : idées, demandes, bugs repérés, décisions à prendre. Une idée
réalisée sort d'ici et sa fiche du [journal](JOURNAL.md) la remplace. Les grandes étapes publiques sont
dans [docs/ROADMAP.md](../docs/ROADMAP.md) ; ce fichier-ci est la liste de travail détaillée.

Statuts : **à faire** (décidé), **à décider** (il faut trancher), **en cours**, **plus tard**.

## En priorité

### Synchronisation entre appareils — à faire

Le but premier de Cobblestone : retrouver ses notes sur son PC portable, son PC fixe et plus tard son
téléphone, sans serveur qui les garde. **Pas encore disponible** : aujourd'hui, chaque appareil a sa
copie.

- Chaque note devient un document CRDT (Yjs) relié à son fichier Markdown, qui reste la référence.
- Synchronisation directe entre appareils (WebRTC), appairage par code ou QR code, chiffrée de bout en
  bout.
- Un petit service de mise en relation, auto-hébergeable ; un relais chiffré pour synchroniser quand
  l'autre appareil est éteint.
- Historique des versions de chaque note, conflits résolus sans perte.
- **À décider** : où héberger le service de mise en relation et le relais officiels.

### Refonte du design et personnalisation — en cours

Demande du 30 septembre : une interface ergonomique, intuitive, optimisée pour l'utilisateur, et
**personnalisable à fond** depuis les réglages, avec un aperçu en direct.

- Maquettes dans Claude Design d'abord, validées avant le code.
- Thèmes par défaut prêts à l'emploi, et création de ses propres thèmes (couleurs de chaque rôle,
  polices, tailles, densité, arrondis).
- Emplacement des éléments : barres latérales à gauche ou à droite, panneaux déplaçables, ordre et
  visibilité des sections, position des onglets et des barres d'outils.
- Aperçu en direct de chaque réglage, et retour aux valeurs par défaut en un clic.
- Import et export de thèmes, compatibilité avec les extraits CSS d'Obsidian.

### Recette automatisée — à décider

Question du 30 septembre : automatiser les 551 vérifications de [docs/RECETTE.md](../docs/RECETTE.md).

- Proposition : un scénario de bout en bout par vérification automatisable (environ 8 sur 10), qui
  cite son numéro de recette et met à jour un rapport généré à chaque `npm run e2e`.
- Restent manuelles : l'installation des paquets, l'icône dans le dock, Firefox, l'aspect visuel, le
  retour dans Obsidian. Elles tiennent dans une courte liste Markdown.
- La page « Recette Cobblestone » (artifact) serait alors abandonnée : elle coûte cher à régénérer.

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
