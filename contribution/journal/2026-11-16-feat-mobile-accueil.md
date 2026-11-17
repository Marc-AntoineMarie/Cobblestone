---
date: 2026-11-16
branche: feat/mobile-accueil
type: nouveauté
version: non publiée
---

# Téléphone : accueil et navigation en pile

## Pourquoi

Sur téléphone, l'app reprenait l'atelier de bureau en petit : barre à 5 onglets, note cachée derrière l'onglet Fichiers, panneaux empilés, texte minuscule. Refonte décidée avec l'utilisateur sur un prototype : un écran à la fois, l'accueil des notes, les actions sous le pouce.

## Ajouté

- `MobileHome.tsx` : accueil « Notes » ; pastilles Récentes (Aujourd'hui et épinglées, puis notes modifiées avec heure, dossier et extrait), Dossiers (un niveau par écran, renommage en place), Tags ; recherche et « + » en bas (appui long : note du jour, canevas, dossier).
- `MobileSearch.tsx` : recherche plein écran, champ en bas au-dessus du clavier, filtres `tag:`, `path:`, `file:`, `task-todo:`, `line:`, accès à la palette de commandes, notes ouvertes récemment.
- `mobile-nav.ts` (+ tests) : la pile est l'historique de l'onglet ; retour, écran affiché, vue précédente, notes récentes, extrait, date relative.
- `mobile-menus.ts` : menus de note et de dossier (épingler, partager, renommer, déplacer vers…, dupliquer, corbeille).
- `mobile-hooks.ts` : appui long (iOS n'envoie pas `contextmenu`), hauteur laissée par le clavier (`--vvh`), app installée.
- `workbench-basics.ts` : commandes, raccourcis, extraits CSS et taille du texte, communs aux deux ateliers.
- Recette 32.2 à 32.12 ; aides `ui.phone` dans `tests/recette/lib/ui.ts`.

## Modifié

- `MobileWorkbench.tsx` réécrit : pile d'écrans avec retour par bouton, par l'historique du navigateur (geste de Safari, bouton d'Android) ou glissement du bord gauche dans l'app installée ; barre du haut « ‹ précédent », épingler, « … » ; barre flottante Modifier/Terminé et Chercher ; menus en feuille en bas.
- `session.ts` : `phone` ; sur téléphone les vues s'empilent dans l'onglet (pas de divisions), les notes s'ouvrent en lecture, une note créée en écriture.
- `Workbench.tsx` : utilise `useWorkbenchBasics` ; `TabView` et `FindResults` exportés.
- `mobile.css` réécrit ; `DESIGN.md` : section Phone (et ses exceptions : verre, pastilles, plaque décalée) ; recette 25.6 réécrite (l'atelier téléphone remplace les tiroirs sous 768 px) ; `IDEES.md` : étapes restantes.

## Supprimé

- La barre de navigation à 5 onglets et les clés `mobile.nav.*`.

## Tests

`mobile-nav.test.ts` (6 tests). Recette web 32.1 à 32.11 et 25.6, 25.20 réussies ; 32.12 manuelle (geste de l'app installée). Captures relues sur iPhone émulé (accueil, dossiers, tags, note, lien, menu, recherche, nouvelle note), sans débordement ni zoom.

## Fichiers

- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/mobile.css`
- modifié : `packages/app/src/ui/LayoutView.tsx`
- ajouté : `packages/app/src/ui/MobileHome.tsx`
- ajouté : `packages/app/src/ui/MobileSearch.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- modifié : `packages/app/src/ui/SearchPanel.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- ajouté : `packages/app/src/ui/mobile-hooks.ts`
- ajouté : `packages/app/src/ui/mobile-menus.ts`
- ajouté : `packages/app/src/ui/mobile-nav.test.ts`
- ajouté : `packages/app/src/ui/mobile-nav.ts`
- ajouté : `packages/app/src/ui/workbench-basics.ts`
- modifié : `tests/recette/25-apparence.spec.ts`
- modifié : `tests/recette/32-telephone.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `f250c97` refactor(app): mettre en commun les bases des ateliers
- `a9ef542` feat(mobile): pile de navigation et mode téléphone de la session
- `61fdf01` feat(mobile): accueil, recherche en bas et écran de note
- `add4300` test(recette): parcours téléphone (32.2 à 32.12), 25.6 réécrite
