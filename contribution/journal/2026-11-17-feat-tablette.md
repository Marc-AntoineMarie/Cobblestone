---
date: 2026-11-17
branche: feat/tablette
type: nouveauté
version: non publiée
---

# Tablette : liste et note côte à côte

## Pourquoi

Sur tablette tactile, l'atelier de bureau (tiroirs, petites cibles, survol) se manie mal au doigt. Dernière étape de mise en page de la refonte téléphone décidée le 2026-11-16.

## Ajouté

- Mode `split` de `MobileWorkbench` : de 768 à 1180 px avec un écran tactile (`pointer: coarse`), l'accueil reste à gauche (300 à 380 px) et la pile d'écrans occupe la droite ; état vide « Choisis une note… ».
- La note affichée est surlignée dans la liste (`aria-current`).
- Recette 32.18 ; option `tablet` de `app.start()` (iPad : agent Mac, tactile, 1024 × 768).

## Modifié

- `Workbench.tsx` : choisit l'atelier téléphone pour les tablettes tactiles ; à la souris, la même largeur garde l'atelier de bureau.
- `MobileHome.tsx`, `mobile.css` : liste marquée, colonnes ; le bouton retour disparaît au bas de la pile.
- `DESIGN.md` (section Phone, Layout) ; `IDEES.md` : étape faite.

## Supprimé

Rien.

## Tests

Recette web 32.1 à 32.18, 25.6 et 25.7 réussies (19 tests). Capture relue sur iPad émulé : état vide, note ouverte et surlignée.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/mobile.css`
- modifié : `packages/app/src/ui/MobileHome.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `tests/recette/32-telephone.spec.ts`
- modifié : `tests/recette/lib/cobble.ts`

## Commits

- `dd2d0e4` feat(mobile): tablette tactile, liste à gauche et note à droite
- `4bab661` test(recette): tablette (32.18)
- `5d5139e` docs: tablette dans DESIGN.md, étape faite dans IDEES.md
