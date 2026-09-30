---
date: 2026-09-30
branche: fix/palette-entree
type: correction
version: non publiée
---

# Palette : Entrée ouvre le premier résultat, même tapée aussitôt

## Pourquoi

La recette complète échouait parfois sur 15.3. Après une flèche vers le bas dans la palette, taper une nouvelle recherche puis Entrée tout de suite ne faisait rien : la sélection restait le temps d'un rendu sur le deuxième résultat de l'ancienne liste, absent de la nouvelle.

## Ajouté

Rien.

## Modifié

- La sélection revient au premier résultat au moment de la frappe, et plus après le rendu.

## Supprimé

Rien.

## Tests

- 15.3 passe dix fois de suite sur le bureau (elle échouait une fois sur trois) ; sections 15 et 16 sur le bureau et le web.

## Fichiers

- modifié : `packages/app/src/ui/Finder.tsx`

## Commits

- `9218c9d` fix(palette): Entrée ouvre le premier résultat même tapée aussitôt
