# Cobblestone — consignes de travail

Ces règles s'appliquent strictement à chaque session. La méthode complète est dans
[contribution/REGLES.md](contribution/REGLES.md) ; ce fichier en est l'aide-mémoire.

## Langue

- Parler à l'utilisateur en français.
- Code, identifiants et commentaires en anglais. Messages de commit en français.
- Interface : toute chaîne visible passe par `packages/app/src/i18n.ts`, en anglais et en français.

## Commits et branches

- Une branche courte par changement (`type/sujet`), fusionnée dans `main` avec `--no-ff`.
- Format `type(portée): message` en français (tableau des types dans contribution/REGLES.md).
- Petits commits qui ont chacun du sens ; jamais un gros commit fourre-tout.
- **Aucune ligne `Co-Authored-By`** ni mention de Claude dans les messages : l'utilisateur gère
  lui-même le crédit des contributeurs.
- `npm run check` passe avant chaque commit. Un bug corrigé arrive avec son test.
- Ne jamais pousser, créer de tag ou publier sans l'accord explicite de l'utilisateur.

## Journal et idées (obligatoire)

- **Chaque changement fusionné a sa fiche** dans `contribution/journal/` : `npm run journal -- new`
  sur la branche, écrire Pourquoi, Ajouté, Modifié, Supprimé et Tests en détail,
  `npm run journal -- index`, commit `docs(journal): …`, puis fusion. `npm run check` refuse une
  branche fusionnée sans fiche.
- Toute idée, demande ou décision pas encore réalisée va dans `contribution/IDEES.md` ; une idée
  réalisée en sort.

## Vérifier avant de dire « c'est fait »

- `npm run check` : formatage (Prettier), types, tests unitaires, format de la recette, journal.
- `npm run e2e` pour tout ce qui touche un parcours de l'app (ouverture de coffre, édition,
  renommage, stockage). Les scénarios sont dans `scripts/e2e-*.mjs` : en ajouter pour chaque
  nouveau parcours.
- Pour l'interface : captures avec `node scripts/shoot.mjs <dossier>` et relecture visuelle.
- Chaque fonctionnalité ajoute ses cas à [docs/RECETTE.md](docs/RECETTE.md), en fin de section. Les
  résultats déjà saisis par l'utilisateur sont dans la page « Recette Cobblestone »
  (https://claude.ai/artifact/FoWbZmBNQuuuJ3ksmWVj1c, collection `results`) : les relire avant de
  corriger, mais ne plus republier cette page (coûteux) ; l'automatisation de la recette est à décider
  (voir contribution/IDEES.md).

## Versions

- SemVer ; en `0.x`, une fonctionnalité monte le mineur, une correction le correctif.
- Publier uniquement avec `npm run release X.Y.Z` (met à jour versions et CHANGELOG, commit et tag).
- Un audit `docs/audit-AAAA-MM-JJ.md` précède chaque version mineure.

## Produit et design

- [PRODUCT.md](PRODUCT.md) : Cobblestone remplace entièrement Obsidian ; web et bureau sont chacun
  complets ; synchronisation directe entre appareils en priorité ; open-core AGPL.
- Compatibilité : ouvrir un coffre Obsidian tel quel, **ne jamais écrire dans `.obsidian/`** ; nos
  réglages vont dans `.cobblestone/`.
- [DESIGN.md](DESIGN.md) décrit le design en place ; toute modification d'interface le respecte ou le
  met à jour.
- **Design : ne plus utiliser de compétences (skills), dont Impeccable.** Les maquettes se font dans
  **Claude Design** (type d'artifact « Design »), validées par l'utilisateur avant le code. Priorités :
  ergonomie, intuitivité, et tout personnalisable dans les réglages avec un aperçu.
- Le logo actuel est provisoire : le choisir avec l'utilisateur (clin d'œil à Minecraft souhaité).

## Environnement

- Le terminal de VS Code exporte `ELECTRON_RUN_AS_NODE=1` : les scripts de l'app de bureau le
  retirent ; le retirer aussi pour tout lancement manuel d'Electron.
- Les scripts de test utilisent Chrome (`CHROME_PATH`, par défaut `/usr/bin/google-chrome`).
