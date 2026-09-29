# Cobblestone — consignes de travail

Ces règles s'appliquent strictement à chaque session. La méthode complète est dans
[CONTRIBUTING.md](CONTRIBUTING.md) ; ce fichier en est l'aide-mémoire.

## Langue

- Parler à l'utilisateur en français.
- Code, identifiants et commentaires en anglais. Messages de commit en français.
- Interface : toute chaîne visible passe par `packages/app/src/i18n.ts`, en anglais et en français.

## Commits

- Format `type(portée): message` en français (voir le tableau des types dans CONTRIBUTING.md).
- Petits commits qui ont chacun du sens ; jamais un gros commit fourre-tout.
- **Aucune ligne `Co-Authored-By`** ni mention de Claude dans les messages : l'utilisateur gère
  lui-même le crédit des contributeurs.
- `npm run check` passe avant chaque commit. Un bug corrigé arrive avec son test.
- Ne jamais pousser, créer de tag ou publier sans l'accord explicite de l'utilisateur.

## Vérifier avant de dire « c'est fait »

- `npm run check` : formatage (Prettier), types, tests unitaires.
- `npm run e2e` pour tout ce qui touche un parcours de l'app (ouverture de coffre, édition,
  renommage, stockage). Les scénarios sont dans `scripts/e2e-*.mjs` : en ajouter pour chaque
  nouveau parcours.
- Pour l'interface : captures avec `node scripts/shoot.mjs <dossier>` et relecture visuelle.
- Chaque fonctionnalité ajoute ses cas à [docs/RECETTE.md](docs/RECETTE.md) (recette manuelle avant
  chaque version). Les résultats de l'utilisateur sont dans la page « Recette Cobblestone »
  (https://claude.ai/artifact/FoWbZmBNQuuuJ3ksmWVj1c, collection `results`, un document par test avec
  `desktop`, `web`, `noteDesktop`, `noteWeb`) : les relire avant de corriger.

## Versions

- SemVer ; en `0.x`, une fonctionnalité monte le mineur, une correction le correctif.
- Publier uniquement avec `npm run release X.Y.Z` (met à jour versions et CHANGELOG, commit et tag).
- Un audit `docs/audit-AAAA-MM-JJ.md` précède chaque version mineure.

## Produit et design

- [PRODUCT.md](PRODUCT.md) : Cobblestone remplace entièrement Obsidian ; web et bureau sont chacun
  complets ; synchronisation directe entre appareils en priorité ; open-core AGPL.
- Compatibilité : ouvrir un coffre Obsidian tel quel, **ne jamais écrire dans `.obsidian/`** ; nos
  réglages vont dans `.cobblestone/`.
- [DESIGN.md](DESIGN.md) : univers « Atelier Riso ». Toute modification d'interface le respecte
  (encres à rôle fixe, une seule taille de texte pour l'interface, états nommés par un mot et une
  forme). Utiliser la compétence Impeccable pour le travail d'interface.
- Le logo actuel est provisoire : le choisir avec l'utilisateur (clin d'œil à Minecraft souhaité).

## Environnement

- Le terminal de VS Code exporte `ELECTRON_RUN_AS_NODE=1` : les scripts de l'app de bureau le
  retirent ; le retirer aussi pour tout lancement manuel d'Electron.
- Les scripts de test utilisent Chrome (`CHROME_PATH`, par défaut `/usr/bin/google-chrome`).
