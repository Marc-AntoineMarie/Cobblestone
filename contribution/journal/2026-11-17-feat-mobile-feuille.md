---
date: 2026-11-17
branche: feat/mobile-feuille
type: nouveauté
version: non publiée
---

# Téléphone : feuille d'infos de la note

## Pourquoi

Sur téléphone, les rétroliens, liens sortants, plan et propriétés (la marge du bureau) étaient relégués dans l'onglet Chercher, loin de la note. Deuxième étape de la refonte décidée le 2026-11-16.

## Ajouté

- `MobileNoteSheet.tsx` : feuille qui monte du bas, pastilles Rétroliens, Liens sortants (avec leurs nombres), Plan, Propriétés, Graphe local ; environ 60 % de hauteur, plein écran en touchant la poignée, fermeture en glissant vers le bas ou sur le voile.
- Barre flottante de la note : bouton des liens (nombre total) et bouton du plan.
- Appui long sur un lien en lecture : aperçu de la note liée en bas de l'écran, sans suivre le lien ; un toucher ailleurs le ferme.
- `PanelChrome` (`Panel.tsx`) : un panneau rendu sans en-tête ni pliage, quand son conteneur le nomme déjà.
- Recette 32.13 à 32.15.

## Modifié

- `MobileWorkbench.tsx` : la recherche et la feuille partagent une entrée d'historique (le retour les ferme ; une note ouverte depuis elles la reprend) ; les commandes « Afficher le panneau … » ouvrent la feuille sur ce panneau.
- `mobile.css` : feuille, voile, aperçu en bas ; `DESIGN.md` (section Phone) ; `IDEES.md` : étape faite.

## Supprimé

Rien.

## Tests

Recette web 32.1 à 32.15 réussie (14 tests, 32.12 manuelle). Captures relues sur iPhone émulé : chaque pastille, plein écran, fermeture par retour, aperçu par appui long.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/mobile.css`
- ajouté : `packages/app/src/ui/MobileNoteSheet.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- modifié : `packages/app/src/ui/Panel.tsx`
- modifié : `tests/recette/32-telephone.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `e50c4ab` feat(mobile): feuille d'infos de la note et aperçu par appui long
- `a55c301` test(recette): feuille d'infos et aperçu sur téléphone (32.13 à 32.15)
- `225eaa6` docs: feuille de la note dans DESIGN.md, étape faite dans IDEES.md
