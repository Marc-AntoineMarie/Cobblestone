---
date: 2026-09-30
branche: feat/barre-activite-noms
type: amélioration
version: non publiée
---

# La barre d'activité nomme ses boutons

## Pourquoi

L'utilisateur ne savait pas à quoi servaient les nouveaux boutons de la barre de gauche : des icônes seules, dont le nom n'apparaissait qu'au survol.

## Ajouté

- Le nom de chaque bouton sous son icône, par défaut ; l'option « Noms sous les boutons de la barre d'activité » (Réglages › Disposition) les retire.

## Modifié

- La barre ne montre que les panneaux du côté gauche, puis Aujourd'hui, Graphe et Réglages. Les panneaux de droite restent à un clic (bouton de la barre du haut) ou dans la palette.
- Un panneau sans contenu (aucun favori) n'y a pas de bouton.

## Supprimé

Rien.

## Tests

- `layout.test.ts` : l'option des noms ne rend pas la disposition personnalisée.
- Recette 6.33 ajoutée ; sections 6, 7, 8, 24 et 25 sur le bureau et le web.

## Fichiers

- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/layout.test.ts`
- modifié : `packages/app/src/layout.ts`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `packages/app/src/ui/Bars.tsx`
- modifié : `packages/app/src/ui/LayoutSettings.tsx`
- modifié : `tests/recette/06-barre-laterale.spec.ts`

## Commits

- `b907af5` feat(disposition): la barre d'activité nomme ses boutons
