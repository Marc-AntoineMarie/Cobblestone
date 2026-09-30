---
date: 2026-09-30
branche: test/recette-automatique
type: amélioration
version: non publiée
---

# Recette automatique : les 556 vérifications passent par des tests

## Pourquoi

La recette de [docs/RECETTE.md](../../docs/RECETTE.md) se faisait à la main, sur le bureau et sur le web : plus de mille gestes avant chaque version, et une page de résultats (artifact) coûteuse à tenir à jour. L'utilisateur a demandé de l'automatiser avec des tests de bout en bout, et de faire en sorte qu'elle ne soit jamais oubliée à un changement. En l'automatisant, la recette a trouvé de vrais bugs, corrigés ici dans 34 commits de correction.

## Ajouté

- La recette automatique, avec Playwright Test (`npm run e2e`) : un projet « bureau » qui pilote l'app Electron, un projet « web » qui pilote l'app web dans Chrome.
- `tests/recette/` : un fichier par section de la recette (01 à 30), un test par ligne, nommé par son numéro et étiqueté `@bureau` ou `@web` selon la ligne.
  - `lib/cobble.ts` démarre l'app sur un coffre préparé (dossier temporaire ou stockage du navigateur), lit et change ses fichiers de l'extérieur, la redémarre.
  - `lib/ui.ts` dit où sont les choses dans l'interface : une refonte ne change que ce fichier.
  - `lib/canvas.ts` et `lib/graph.ts` lisent le canvas et le graphe.
  - `lib/rapport.ts` écrit l'état de chaque ligne dans `test-results/recette.md`.
- `recette.manuel(id, raison)` pour ce qu'une machine ne peut pas vérifier (34 cas : Firefox, installation des paquets, icônes du système, Obsidian lui-même, usage prolongé), `recette.ci(id, ce qu'elle fait)` pour ce que fait la CI (6 cas).
- Statut de chaque ligne dans RECETTE.md (`auto`, `ci`, `manuel`, par plateforme au besoin), recopié par `npm run recette -- sync`. `npm run check` refuse une ligne sans test et un statut pas à jour.
- Le graphe laisse sur son canvas un relevé de son dernier dessin (`graphProbe`), que les tests lisent avant de vérifier les pixels.
- Deux fonctions d'Obsidian qui manquaient : les tâches à statut (`- [-]`, `- [/]`, `- [>]`…) et Tab pour accepter une suggestion.

## Modifié

Bugs trouvés par la recette, chacun dans son commit avec le numéro de sa ligne :

- Web : erreurs d'accès à un dossier en français ; un fichier illisible reste visible ; le texte tapé juste avant de fermer l'onglet n'est plus perdu.
- App : onglets, favoris et réglages ne se perdent plus en fermant vite ; le texte tapé pendant que le dossier du coffre disparaît est gardé et restauré ; rouvrir les réglages revient à leur onglet ; la barre de note tient sur un téléphone.
- Bureau : les images distantes en `http` s'affichent ; l'app attend la fin des écritures avant de quitter.
- Coffre (core) : renommer en changeant seulement la casse met les liens à jour ; une note illisible n'est plus prise pour une note vide ; une image ou un canvas modifiés par un autre programme s'affichent à jour ; un nom cité dans un lien ou une adresse n'est plus une mention.
- Recherche : une expression régulière en cours de frappe montre les noms ; `section:` marche pour une note qui commence par un titre.
- Arborescence et favoris : l'arbre ne reprend plus le focus au menu ni au renommage ; Alt+Gauche revient à la note précédente depuis l'arbre ; un favori de dossier ouvre ce dossier.
- Éditeur : une formule `$$` sur plusieurs lignes ne fait plus planter l'éditeur ; `[texte]` seul n'est plus un lien ; l'en-tête et les liens d'une note intégrée sont cliquables ; l'autocomplétion ignore les accents et garde l'ordre des titres ; Ctrl maintenu sur un lien montre son aperçu ; Ctrl+[, Ctrl+] et Ctrl+G marchent même dans le texte.
- Lecture et aperçu : les diagrammes Mermaid s'affichent ; la lecture suit aussitôt les retours à la ligne et le papier ; l'aperçu d'un lien en bas de l'écran s'ouvre au-dessus.
- Marge : message juste pour un canvas ou un graphe ; tiroir fermé au départ sur un écran étroit.
- Canvas : double-cliquer une carte, un groupe ou une étiquette les modifie (au lieu de créer une carte vide), une carte de note s'ouvre au double-clic et les liens des cartes répondent ; glisser une sélection faite au Maj+clic déplace les cartes ; une flèche lâchée au milieu d'une carte arrive par le côté qui fait face ; Maj+molette défile de côté partout ; un canvas modifié ailleurs s'affiche à jour.
- Graphe : double-cliquer un point épinglé le libère au lieu d'ouvrir la note.
- La CI lance `npm run e2e` et garde `test-results` (état de la recette, traces des échecs).
- La recette lance deux tests à la fois (`RECETTE_WORKERS` pour en lancer plus) : à quatre, une machine de 8 Go manquait de mémoire et des tests de délai échouaient sans raison.
- Règles (REGLES.md, CLAUDE.md, README de contribution) : la recette suit chaque changement ; l'idée « recette automatisée » sort d'IDEES.md.

## Supprimé

- `scripts/e2e-desktop.mjs` et `scripts/e2e-web.mjs` : chacune de leurs vérifications a son équivalent dans la recette.

## Tests

- Recette : 556 vérifications, 991 tests automatiques (bureau et web), 6 par la CI, 34 manuels, aucune à automatiser.
- Unitaires ajoutés avec les corrections : `vault.test.ts` (casse, note illisible, canvas modifié ailleurs), `ofm-syntax.test.ts`, `mentions.test.ts`, `search.test.ts`, `workspace.test.ts`, `errors.test.ts`, `render.test.ts` (Mermaid), `geometry.test.ts` (côté d'arrivée d'une flèche).
- Incident : `render.test.ts` a été écrasé par erreur pendant le travail ; ses 7 tests ont été rétablis dans un commit à part.

## Fichiers

- modifié : `.github/workflows/ci.yml`
- modifié : `.gitignore`
- modifié : `.prettierignore`
- modifié : `CLAUDE.md`
- modifié : `apps/desktop/src/main/index.ts`
- modifié : `apps/desktop/src/renderer/index.html`
- modifié : `apps/web/src/directory-adapter.ts`
- modifié : `apps/web/src/platform.ts`
- modifié : `contribution/IDEES.md`
- modifié : `contribution/README.md`
- modifié : `contribution/REGLES.md`
- modifié : `docs/RECETTE.md`
- modifié : `package-lock.json`
- modifié : `package.json`
- modifié : `packages/app/src/canvas/CanvasView.tsx`
- modifié : `packages/app/src/canvas/geometry.test.ts`
- modifié : `packages/app/src/canvas/geometry.ts`
- modifié : `packages/app/src/editor/completion.ts`
- modifié : `packages/app/src/editor/live-preview.ts`
- modifié : `packages/app/src/editor/ofm-syntax.test.ts`
- modifié : `packages/app/src/editor/ofm-syntax.ts`
- modifié : `packages/app/src/editor/setup.ts`
- modifié : `packages/app/src/editor/widgets.ts`
- modifié : `packages/app/src/errors.test.ts`
- modifié : `packages/app/src/errors.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/markdown/render.test.ts`
- modifié : `packages/app/src/markdown/render.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/canvas.css`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `packages/app/src/ui/Editor.tsx`
- modifié : `packages/app/src/ui/FileTree.tsx`
- modifié : `packages/app/src/ui/FileView.tsx`
- modifié : `packages/app/src/ui/GraphView.tsx`
- modifié : `packages/app/src/ui/HoverPreview.tsx`
- modifié : `packages/app/src/ui/Marginalia.tsx`
- modifié : `packages/app/src/ui/NoteView.tsx`
- modifié : `packages/app/src/ui/Rail.tsx`
- modifié : `packages/app/src/ui/ReadingView.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `packages/app/src/ui/render-note.ts`
- modifié : `packages/app/src/workspace/workspace.test.ts`
- modifié : `packages/app/src/workspace/workspace.ts`
- modifié : `packages/core/src/links/mentions.test.ts`
- modifié : `packages/core/src/links/mentions.ts`
- modifié : `packages/core/src/search/search.test.ts`
- modifié : `packages/core/src/search/search.ts`
- modifié : `packages/core/src/vault.test.ts`
- modifié : `packages/core/src/vault.ts`
- ajouté : `playwright.config.ts`
- supprimé : `scripts/e2e-desktop.mjs`
- supprimé : `scripts/e2e-web.mjs`
- ajouté : `scripts/lib/recette-md.mjs`
- modifié : `scripts/recette.mjs`
- ajouté : `tests/recette/01-preparation.spec.ts`
- ajouté : `tests/recette/02-accueil.spec.ts`
- ajouté : `tests/recette/03-migration-obsidian.spec.ts`
- ajouté : `tests/recette/04-recherche-laterale.spec.ts`
- ajouté : `tests/recette/05-arborescence-des-fichiers.spec.ts`
- ajouté : `tests/recette/06-barre-laterale.spec.ts`
- ajouté : `tests/recette/07-onglets-et-divisions.spec.ts`
- ajouté : `tests/recette/08-barre-de-note.spec.ts`
- ajouté : `tests/recette/09-editeur-ecriture.spec.ts`
- ajouté : `tests/recette/10-editeur-liens.spec.ts`
- ajouté : `tests/recette/11-autocompletion.spec.ts`
- ajouté : `tests/recette/12-mode-lecture.spec.ts`
- ajouté : `tests/recette/13-apercu-au-survol.spec.ts`
- ajouté : `tests/recette/14-marge.spec.ts`
- ajouté : `tests/recette/15-palette.spec.ts`
- ajouté : `tests/recette/16-toutes-les-commandes.spec.ts`
- ajouté : `tests/recette/17-note-du-jour-modeles.spec.ts`
- ajouté : `tests/recette/18-recherche-avancee.spec.ts`
- ajouté : `tests/recette/19-graphe.spec.ts`
- ajouté : `tests/recette/20-canvas.spec.ts`
- ajouté : `tests/recette/21-fichiers-joints.spec.ts`
- ajouté : `tests/recette/22-operations-fichiers.spec.ts`
- ajouté : `tests/recette/23-changements-exterieurs.spec.ts`
- ajouté : `tests/recette/24-reglages.spec.ts`
- ajouté : `tests/recette/25-apparence.spec.ts`
- ajouté : `tests/recette/26-web.spec.ts`
- ajouté : `tests/recette/27-bureau.spec.ts`
- ajouté : `tests/recette/28-securite.spec.ts`
- ajouté : `tests/recette/29-robustesse.spec.ts`
- ajouté : `tests/recette/30-retour-dans-obsidian.spec.ts`
- ajouté : `tests/recette/lib/canvas.ts`
- ajouté : `tests/recette/lib/cobble.ts`
- ajouté : `tests/recette/lib/graph.ts`
- ajouté : `tests/recette/lib/rapport.ts`
- ajouté : `tests/recette/lib/recette.ts`
- ajouté : `tests/recette/lib/ui.ts`
- ajouté : `tests/recette/lib/vaults.ts`
- ajouté : `tests/tsconfig.json`

## Commits

- `db8a599` fix(web): les erreurs d'accès à un dossier s'affichent en français
- `440d0b1` fix(app): les onglets, favoris et réglages ne se perdent plus en fermant vite
- `d381fa1` test(recette): lancer la recette avec Playwright, sur le bureau et sur le web
- `8719741` test(recette): préparation et écran d'accueil automatisés
- `7c57db0` build(recette): npm run check refuse une vérification sans test
- `52cd4e5` fix(recherche): une expression régulière en cours de frappe montre les noms
- `d3a02ef` test(recette): migration Obsidian et champ de recherche automatisés
- `c0a1365` fix(arborescence): l'arbre ne reprend plus le focus au menu ni au renommage
- `e515af8` fix(core): renommer « note » en « Note » met les liens à la nouvelle casse
- `d312be4` test(recette): arborescence des fichiers automatisée
- `20723a7` fix(favoris): un favori de dossier ouvre ce dossier dans l'arborescence
- `bfabcd6` test(recette): barre latérale automatisée (coffre, favoris, tags, pied)
- `02dd9d3` fix(arborescence): Alt+Gauche revient à la note précédente depuis l'arbre
- `6245844` test(recette): onglets et divisions automatisés
- `f7e89e1` fix(core): une note illisible au chargement n'est plus prise pour une note vide
- `c977e15` fix(web): un fichier illisible reste visible dans le coffre
- `e3d3a4f` test(recette): barre de note et titre automatisés
- `927f243` fix(éditeur): une formule $$ sur plusieurs lignes ne fait plus planter l'éditeur
- `7625610` fix(éditeur): « [texte] » seul n'est plus affiché comme un lien
- `eeee47a` feat(éditeur): tâches à statut d'Obsidian (« - [-] », « - [/] »…)
- `1b8b09e` fix(web): le texte tapé juste avant de fermer l'onglet n'est plus perdu
- `bf83e32` test(recette): éditeur, écriture et mise en forme automatisés
- `c885b11` fix(éditeur): l'en-tête et les liens d'une note intégrée sont cliquables
- `470d6d2` fix(bureau): les images distantes en http s'affichent
- `f37056d` test(recette): liens, intégrations, tags et propriétés de l'éditeur automatisés
- `0e56f9c` fix(éditeur): l'autocomplétion des liens ignore les accents et garde l'ordre des titres
- `307156b` feat(éditeur): Tab accepte la suggestion, comme dans Obsidian
- `0490f3a` test(recette): autocomplétion et pièces jointes automatisées
- `c44ae16` fix(lecture): les diagrammes Mermaid s'affichent enfin
- `7985a8b` fix(lecture): la lecture suit aussitôt le réglage des retours à la ligne et le papier
- `cef2b18` test(recette): mode lecture automatisé
- `5bb192a` fix(éditeur): Ctrl maintenu sur un lien montre bien son aperçu
- `98e42e5` fix(aperçu): l'aperçu d'un lien en bas de l'écran s'ouvre au-dessus
- `a21a38b` test(recette): aperçu au survol automatisé
- `d1c4aa7` fix(core): un nom cité dans un lien ou une adresse web n'est plus une mention
- `d04f0ba` fix(éditeur): Ctrl+[ et Ctrl+] masquent la barre latérale et la marge, même dans le texte
- `c3fd22b` fix(marge): message juste pour un canvas ou un graphe, tiroir fermé au départ
- `424975c` test(recette): marge automatisée
- `936dc2c` test(recette): palette et toutes les commandes automatisées
- `31f02f4` test(recette): note du jour et modèles automatisés
- `fe51d36` fix(recherche): section: marche pour les notes qui commencent par un titre
- `cc97909` test(recette): recherche avancée automatisée
- `2e8e816` test(lecture): rétablit les tests du rendu Markdown effacés par erreur
- `7cc79f7` fix(fichiers): une image modifiée par un autre programme s'affiche à jour
- `69b48aa` test(recette): fichiers joints automatisés
- `24ff61a` fix(app): le texte tapé pendant que le dossier du coffre disparaît n'est plus perdu
- `3cc23da` test(recette): opérations sur les fichiers et changements extérieurs automatisés
- `da2e2d6` fix(onglets): rouvrir les réglages revient à leur onglet au lieu d'en ouvrir un autre
- `f777ec1` test(recette): réglages automatisés
- `2861e62` fix(interface): la barre de note tient sur un écran de téléphone
- `a56037c` fix(éditeur): Ctrl+G ouvre le graphe même pendant l'écriture
- `b148318` test(recette): apparence, web, bureau, sécurité, robustesse et retour dans Obsidian automatisés
- `9c348d4` fix(canvas): un canvas modifié par un autre programme s'affiche à jour
- `ef23aeb` fix(canvas): le double-clic et les liens atteignent la carte visée
- `f114158` fix(canvas): glisser une sélection faite au Maj+clic déplace les cartes
- `ca9f6d4` fix(canvas): une flèche lâchée au milieu d'une carte arrive du bon côté
- `c1e4e92` fix(canvas): Maj+molette fait défiler de côté sur tous les systèmes
- `5512b29` test(recette): canvas automatisé
- `7cb46ee` test(graphe): le graphe laisse lire ce qu'il dessine
- `41a04a8` fix(graphe): double-cliquer un point épinglé le libère
- `10347b7` test(recette): graphe automatisé
- `b547684` ci(e2e): la CI passe la recette automatique
- `53ffaa8` chore: ignore le cache de Vitest
- `4a1f52e` docs(contribution): la recette suit chaque changement
- `df45282` test(recette): deux tests à la fois par défaut
