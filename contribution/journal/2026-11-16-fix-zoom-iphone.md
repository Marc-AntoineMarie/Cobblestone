---
date: 2026-11-16
branche: fix/zoom-iphone
type: correction
version: non publiée
---

# Zoom automatique sur iPhone

## Pourquoi

Sur iPhone (Safari et app installée), les pages paraissaient zoomées et il fallait dézoomer à chaque changement d'écran. Safari zoome quand un champ de moins de 16 px prend le focus (la recherche était à 13 px : le plancher de `mobile.css` était écrasé par des sélecteurs plus précis) ou au double toucher, et garde ce zoom puisque l'app ne recharge jamais la page.

## Ajouté

- `packages/app/src/viewport.ts` : `lockIosAutoZoom()` ajoute `maximum-scale=1` à la balise viewport sur iOS seulement (le pincement reste permis par iOS ; ailleurs il serait bloqué).
- Recette : section 32 « Téléphone », ligne 32.1 ; option `iphone` de `app.start()` (agent iOS, tactile, 390 × 844).

## Modifié

- `mobile.css` : plancher de 16 px en `!important` sur les champs, éditeur à 16 px minimum, `touch-action: manipulation` contre le zoom au double toucher ; le titre de note garde sa taille.
- `index.html` (web) : `interactive-widget=resizes-content` pour que le clavier raccourcisse la page.
- Aides de la recette : acceptent l'atelier mobile (`.mobile-workbench`).

## Supprimé

Rien.

## Tests

`viewport.test.ts` (détection iOS, iPad vu comme un Mac tactile, pas de doublon). Recette 32.1 (web) : titre, texte et recherche touchés sur iPhone émulé, échelle 1 et texte ≥ 16 px.

## Fichiers

- modifié : `apps/web/index.html`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/index.ts`
- modifié : `packages/app/src/styles/mobile.css`
- ajouté : `packages/app/src/viewport.test.ts`
- ajouté : `packages/app/src/viewport.ts`
- ajouté : `tests/recette/32-telephone.spec.ts`
- modifié : `tests/recette/lib/cobble.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `e699d1a` fix(mobile): empêcher le zoom automatique de Safari sur iPhone
- `9e9b79f` test(recette): section 32 Téléphone, zoom sur iPhone (32.1)
