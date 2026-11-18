---
date: 2026-11-18
branche: fix/popovers-coupes
type: correction
version: non publiée
---

# Popovers coupés et boutons « Papier » trop petits

## Pourquoi

Les popovers de synchronisation et de mise à jour sortaient de la fenêtre par la gauche : ancrés à droite (`right: 0`) alors que leur pastille est dans le pied de la liste, à gauche. Dans le panneau rapide d'apparence, « Papier de jour », « Papier de nuit » et « Suivre le système » passaient à la ligne dans des boutons de 24 px fixes et débordaient.

## Ajouté

Rien.

## Modifié

- `.sync-popover` et `.update-popover` s'ancrent à gauche (`left: 0`).
- `.segmented button` : hauteur minimale de 24 px au lieu d'une hauteur fixe, un peu de marge verticale et `text-wrap: balance` ; un libellé long tient sur deux lignes dans son bouton.
- Dans le panneau rapide, les options d'un contrôle segmenté se partagent la largeur (`flex: 1`).

## Supprimé

Rien.

## Tests

- Recette 6.27 : aucun bouton segmenté du panneau rapide ne déborde de son texte.
- Recette 31.8 : le popover de synchronisation est entièrement dans la fenêtre ; l'attente « En ligne, sur le même réseau », périmée, devient « En ligne ».
- `npm run e2e -- tests/recette/06 tests/recette/31 -g …` : 6.27 et 31.8 passent, bureau et web.

## Fichiers

- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/styles/base.css`
- modifié : `packages/app/src/styles/overlays.css`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `tests/recette/06-barre-laterale.spec.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `60eee07` fix(interface): popovers de la liste dans la fenêtre, boutons segmentés à la taille du texte
- `23bf7dd` test(recette): 6.27 et 31.8 vérifient libellés entiers et popover dans la fenêtre
