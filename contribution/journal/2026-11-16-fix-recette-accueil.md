---
date: 2026-11-16
branche: fix/recette-accueil
type: correction
version: non publiée
---

# Recette de l'accueil : quatre actions

## Pourquoi

La vérification 2.1 attendait trois actions sur l'accueil ; « Recevoir un coffre » (synchronisation) en a ajouté une quatrième et le test échouait.

## Ajouté

Rien.

## Modifié

- `docs/RECETTE.md` 2.1 : quatre actions, nommées.
- `tests/recette/02-accueil.spec.ts` : compte 4 actions.

## Supprimé

Rien.

## Tests

Recette 2.1 sur bureau et web : réussie.

## Fichiers

- modifié : `docs/RECETTE.md`
- modifié : `tests/recette/02-accueil.spec.ts`

## Commits

- `b8bddf4` fix(recette): l'accueil a quatre actions depuis « Recevoir un coffre » (2.1)
