---
date: 2026-09-29
branche: avant-le-journal
type: nouveauté
version: non publiée
---

# Tout ce qui existait avant le journal

## Pourquoi

Le journal commence le 29 septembre 2026. Cette fiche résume les 71 premiers commits (de `2389288` à
`c0f53aa`), faits avant qu'il existe, pour que le journal parte d'un état connu. Le détail commit par
commit reste dans `git log`.

## Ajouté

- **Monorepo** npm (workspaces, TypeScript, Vitest, Prettier), licence AGPL-3.0, PRODUCT.md,
  DESIGN.md (univers « Atelier Riso »), README, CONTRIBUTING, SECURITY, CLAUDE.md.
- **`packages/core`** : chemins, adaptateur de stockage, lecture des métadonnées Markdown (liens,
  intégrations, titres, blocs, tags, propriétés), résolution des liens avec les règles d'Obsidian,
  réécriture des liens au renommage, index du coffre, recherche avec la syntaxe d'Obsidian, mentions
  non liées, format JSON Canvas.
- **`packages/node`** : stockage sur disque surveillé (chokidar), chemins confinés au coffre.
- **`packages/app`** : éditeur CodeMirror 6 avec aperçu en direct, mode lecture et mode source,
  intégrations, encadrés, maths (KaTeX), diagrammes (Mermaid), rétroliens, plan, propriétés, tags,
  graphe, notes du jour, modèles, favoris, aperçu au survol, canvas, onglets et divisions, palette de
  commandes, réglages, import des réglages d'Obsidian, papier de jour et de nuit, anglais et
  français.
- **`apps/web`** : dossiers via l'API File System Access, coffres dans le stockage du navigateur,
  démo.
- **`apps/desktop`** : Electron avec rendu isolé et pont IPC étroit, installeurs Linux, Windows et
  macOS.
- **Méthode** : commits conventionnels en français, `npm run check`, `npm run e2e`,
  `npm run release`, CI GitHub Actions (vérifications, bout en bout, audit des dépendances), release
  automatique sur tag, recette manuelle de 514 vérifications.
- Branches fusionnées : `perf/chargement-web`, `feat/fonctions-obsidian`, `ci/reparer-e2e`,
  `feat/canvas`, `fix/ctrl-e`, `docs/recette`.

## Modifié

Rien : point de départ.

## Supprimé

Rien.

## Tests

- 101 tests unitaires ; 10 vérifications de bout en bout sur l'app de bureau et 9 sur l'app web.

## Fichiers

Tout le dépôt à `c0f53aa`.

## Commits

71 commits, de `2389288` (initial commit) à `c0f53aa` (Merge branch 'docs/recette').
