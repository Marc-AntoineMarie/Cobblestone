---
date: 2026-10-21
branche: feat/interface-mobile
type: nouveauté
version: non publiée
---

# Interface mobile dédiée

## Pourquoi

Sur téléphone, l'interface bureau (barres d'activité, panneaux latéraux, onglets) n'est pas ergonomique. Il faut des écrans séparés, une navigation en bas, et des interactions tactiles.

## Ajouté

- `MobileWorkbench.tsx` : workbench dédié aux écrans ≤ 767 px. Cinq onglets en bas (Fichiers, Note, Graphe, Chercher, Réglages), chacun remplace l'écran complet.
  - Fichiers : arborescence + marque-pages + tags.
  - Note : le `LayoutView` tel quel (éditeur, canvas, graphe de l'onglet actif).
  - Graphe : `GraphView` en plein écran.
  - Chercher : recherche + panneaux de la note ouverte (rétroliens, plan, etc.).
  - Réglages : `SettingsView` défilable.
- `useMobile()` dans `hooks.ts` : `useMediaQuery('(max-width: 767px)')`.
- Pinch-to-zoom dans `GraphView.tsx` : deux pointeurs actifs → scale + pan.
- `mobile.css` : layout `100dvh`, barre de navigation, safe-area insets, `touch-action: none` sur le canvas, taille de police minimale 16 px sur les champs (évite le zoom iOS).
- Clés i18n `mobile.nav.*` en anglais et en français.

## Modifié

- `Workbench.tsx` : route vers `MobileWorkbench` si mobile, sinon `DesktopWorkbench` (même comportement qu'avant).
- `hooks.ts` : ajout de `useMobile()`.
- `styles/index.css` : import de `mobile.css`.

## Supprimé

Rien.

## Tests

Tests unitaires existants : tous passent. Interface à vérifier visuellement sur téléphone après déploiement PWA.

## Fichiers

- `packages/app/src/ui/MobileWorkbench.tsx`
- `packages/app/src/ui/Workbench.tsx`
- `packages/app/src/ui/hooks.ts`
- `packages/app/src/ui/GraphView.tsx`
- `packages/app/src/styles/mobile.css`
- `packages/app/src/styles/index.css`
- `packages/app/src/i18n.ts`

## Commits

À venir.
