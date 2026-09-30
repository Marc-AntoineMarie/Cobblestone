---
date: 2026-09-30
branche: docs/versions
type: documentation
version: non publiée
---

# Guide des versions, et la recette avant chaque version plutôt qu'à chaque push

## Pourquoi

L'utilisateur demandait comment se font les versions, si chaque push publie quelque chose et où on en est : la réponse était éparpillée entre les règles, la distribution et le script. Sur GitHub, la recette complète durait longtemps et Chrome y plantait encore, sans rien apprendre de plus qu'en local ; il a proposé de ne plus la lancer à chaque push.

## Ajouté

- `contribution/VERSIONS.md` :
  - les numéros de version, avant et après 1.0, et les préversions ;
  - le plan (0.1.0 installable, 0.2.0 la refonte, 0.3.0 la synchronisation, 1.0.0 et ses conditions) ;
  - ce que font un commit, une fusion, un push et une version ;
  - `npm run release` pas à pas, ses options, les étapes sur GitHub, et quoi faire quand ça rate ;
  - GitHub CLI pour suivre la CI.
- `.github/workflows/recette.yml` : la recette complète sur GitHub, lancée à la main (Actions → Recette → Run workflow).
- `npm run release` lance la recette automatique avant de publier (`--sans-recette` pour un correctif urgent), et note la version dans les fiches du journal « non publiée ».

## Modifié

- La CI de chaque push ne lance plus la recette : formatage, types, tests unitaires, construction et audit des dépendances seulement.
- Ligne 1.11 de la recette : son résultat attendu décrit la recette actuelle ; elle devient manuelle (c'est la recette elle-même).
- REGLES.md (sections 6 et 10), README de contribution, CLAUDE.md et DISTRIBUTION.md renvoient au guide ; DISTRIBUTION.md dit que la release se publie seule une fois ses fichiers ajoutés.
- ROADMAP.md ne parle plus d'une version 0.2 déjà sortie : rien n'est encore publié.

## Supprimé

- Le job `e2e` de `.github/workflows/ci.yml` (il vit dans `recette.yml`).

## Tests

- `npm run check`.
- `scripts/release.mjs` relu et vérifié par `node --check` ; il n'a pas été lancé, puisqu'il publie.

## Fichiers

- modifié : `.github/workflows/ci.yml`
- ajouté : `.github/workflows/recette.yml`
- modifié : `CLAUDE.md`
- modifié : `contribution/README.md`
- modifié : `contribution/REGLES.md`
- ajouté : `contribution/VERSIONS.md`
- modifié : `docs/DISTRIBUTION.md`
- modifié : `docs/RECETTE.md`
- modifié : `docs/ROADMAP.md`
- modifié : `scripts/release.mjs`
- modifié : `tests/recette/01-preparation.spec.ts`

## Commits

- `da1a8c7` ci(recette): la recette complète passe avant chaque version, plus à chaque push
- `0e262fc` docs(versions): guide des versions et de la publication
