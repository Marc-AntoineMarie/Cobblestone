---
date: 2026-09-30
branche: docs/recette-ciblee
type: documentation
version: non publiée
---

# La recette se lance là où le changement a un effet

## Pourquoi

L'utilisateur a remarqué que toute la recette (une vingtaine de minutes) était relancée à chaque fusion, même pour un changement limité.

## Ajouté

- Dans REGLES.md (section 6), CLAUDE.md, VERSIONS.md et le README de contribution : trois niveaux. Les sections touchées pendant le travail et avant de fusionner (`npm run e2e -- tests/recette/…`) ; toute la recette quand une base commune change (disposition, styles partagés, moteur des notes, stockage) ; toute la recette avant chaque version, lancée par `npm run release`.

## Modifié

- La liste à cocher avant une fusion (REGLES.md) suit ces niveaux.

## Supprimé

Rien.

## Tests

Rien : documentation seulement.

## Fichiers

- modifié : `CLAUDE.md`
- modifié : `contribution/README.md`
- modifié : `contribution/REGLES.md`
- modifié : `contribution/VERSIONS.md`

## Commits

- `1fea8db` docs(contribution): la recette se lance là où le changement a un effet
