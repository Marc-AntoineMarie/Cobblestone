---
date: 2026-11-18
branche: feat/barre-mise-en-forme
type: nouveauté
version: non publiée
---

# Une barre de mise en forme sous la barre de la note, en écriture

## Pourquoi

Écrire demandait de connaître le Markdown : rien dans l'interface ne disait comment mettre un mot en
gras, faire un titre ou poser un tableau. La refonte de l'ordinateur prévoyait cette barre (voir
IDEES.md, « Refonte de l'interface sur ordinateur ») ; fiche écrite après la fusion, la branche
étant partie sans la sienne.

## Ajouté

- `ui/NoteToolbar.tsx` : la barre de mise en forme, affichée sous la barre de la note en mode
  écriture seulement. Menu du style de la ligne (Texte, Titre 1, 2, 3, qui montre le niveau de la
  ligne du curseur), gras, italique, surlignage, liste, case à cocher, « Lier une note », tableau,
  « Image ou fichier », annuler et rétablir, et la bascule « Document » / « Markdown ».
- Commandes de texte dans `editor/commands.ts` : `cycleHeadingSpec`, `headingLevelAt`,
  `setHeadingLevel` / `setHeadingSpec`, `toggleBulletSpec`, `insertText`, `tableMarkdown` et
  `insertTable`, pour que la barre et les raccourcis partagent le même code.
- Textes `toolbar.*` dans `i18n.ts`, en anglais et en français.
- Styles de la barre dans `styles/workbench.css` et `styles/base.css`.
- Recette 8.27 à 8.34, et l'aide `ui.ts` qui les sert.

## Modifié

- `ui/NoteView.tsx` monte la barre au-dessus de l'éditeur.
- `editor/commands.ts` : les opérations existantes rendent une `TransactionSpec` réutilisable au lieu
  d'agir seulement sur la vue, pour servir aussi la barre.

## Supprimé

Rien.

## Tests

- Unitaires : `editor/commands.test.ts` complété (niveaux de titre, puces, tableau inséré sur ses
  propres lignes).
- Recette : section 8, lignes 8.27 à 8.34, automatiques sur les deux plateformes
  (`tests/recette/08-barre-de-note.spec.ts`).

## Fichiers

- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/editor/commands.test.ts`
- modifié : `packages/app/src/editor/commands.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/base.css`
- modifié : `packages/app/src/styles/workbench.css`
- ajouté : `packages/app/src/ui/NoteToolbar.tsx`
- modifié : `packages/app/src/ui/NoteView.tsx`
- modifié : `tests/recette/08-barre-de-note.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `f266dfc` feat(editor): barre de mise en forme de la note
