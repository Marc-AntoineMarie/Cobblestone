---
date: 2026-09-29
branche: feat/largeur-texte
type: nouveauté
version: non publiée
---

# Largeur de lecture corrigée, taille du texte et largeur des lignes réglables

## Pourquoi

Retour de l'utilisateur : « les notes sont petites, serrées au centre ». La longueur de ligne était mesurée en caractères de l'interface (13 px) au lieu de ceux des notes : la colonne faisait 500 px sur un écran de 1920.

## Ajouté

- Réglages › Éditeur : « Taille du texte » (13 à 24 px) et « Largeur des lignes » (Étroite, Normale, Large, Toute la largeur), enregistrés par coffre.
- Import de la taille de police d'Obsidian (`.obsidian/appearance.json`, `baseFontSize`) à la première ouverture.

## Modifié

- La largeur lisible vaut 42 fois la taille du texte (environ 80 caractères, 690 px par défaut) ; étroite 34, large 54.
- Les titres des notes grandissent avec la taille du texte (em au lieu de rem).
- DESIGN.md décrit la nouvelle mesure et l'échelle des titres.

## Supprimé

- L'interrupteur « Garder des lignes de longueur lisible », remplacé par le choix « Toute la largeur ».

## Tests

- Unitaires : import de `baseFontSize` dans `settings.test.ts`.
- Captures à 1920 px : colonne de 693 px en Normale, 1026 px en Large à 19 px.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/settings.test.ts`
- modifié : `packages/app/src/settings.ts`
- modifié : `packages/app/src/styles/editor.css`
- modifié : `packages/app/src/styles/markdown.css`
- modifié : `packages/app/src/styles/tokens.css`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`

## Commits

- `d78a694` fix(éditeur): les notes gardent une largeur de lecture confortable
- `9a91cf8` feat(réglages): taille du texte et largeur des lignes, par coffre
