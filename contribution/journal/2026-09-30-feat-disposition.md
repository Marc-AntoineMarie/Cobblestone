---
date: 2026-09-30
branche: feat/disposition
type: nouveauté
version: non publiée
---

# Refonte, deuxième partie : la disposition, entièrement réglable

## Pourquoi

L'utilisateur veut une interface ergonomique, intuitive et personnalisable à fond, jusqu'à l'emplacement de chaque chose, avec un aperçu. Après l'apparence (`feat/themes`), cette partie réalise la disposition des maquettes Claude Design validées : barre du haut, barre d'activité, panneaux déplaçables, barre d'état.

## Ajouté

- Modèle de disposition (`packages/app/src/layout.ts`) : huit panneaux, chacun à gauche, à droite ou masqué, dans un ordre ; dispositions prêtes (Classique, Concentration, Chercheur, Miroir) ; onglets, barre d'état, barre d'activité et largeur des côtés. Réglage de l'appareil, complété à la lecture si des panneaux s'ajoutent un jour.
- Barre du haut : le coffre et son menu, le champ « Rechercher, ouvrir une note ou lancer une commande » avec son raccourci, les boutons des deux côtés.
- Barre d'activité : un bouton par panneau affiché (il ouvre son côté, le déplie, le montre ; Recherche prend le clavier), Aujourd'hui, Graphe, Réglages.
- Panneaux repliables par leur titre : Recherche, Favoris, Notes, Tags, Rétroliens, Plan, Liens sortants, Propriétés. Menu du titre (mettre de l'autre côté, monter, descendre, masquer), glisser du titre vers l'autre côté ou avant un autre panneau.
- Barre d'état : état du coffre, mots, caractères et rétroliens de la note active, et « Apparence » : thèmes, papier, taille du texte, largeur des lignes, disposition, lien vers tous les réglages.
- Réglages › Disposition : dispositions prêtes en miniature, place et ordre de chaque panneau, schéma de l'app qui suit chaque changement, interrupteurs des onglets et des barres, largeur des côtés, retour à la disposition classique.
- Commandes de la palette : « Afficher le panneau « … » » pour chaque panneau (un panneau masqué revient à sa place classique), « Disposition : … » pour chaque disposition prête.

## Modifié

- La barre latérale et la marge deviennent les côtés gauche et droit ; l'ancien bouton de réouverture dans les onglets et celui de la barre de note disparaissent au profit de la barre du haut.
- Les compteurs de la note passent du pied de la note à la barre d'état ; Aujourd'hui, Graphe et Réglages passent dans la barre d'activité.
- La barre de note s'ajuste à la largeur de son volet (requêtes de conteneur), plus seulement à celle de la fenêtre : écran divisé, ses boutons ne passent plus sous la poignée.
- La colonne centrale ne dépasse plus la fenêtre quand beaucoup d'onglets sont ouverts ; masquer les onglets les masque vraiment.
- DESIGN.md (disposition, panneaux), IDEES.md (fait, et ce qui reste pour plus tard).

## Supprimé

- `Rail.tsx` (réparti entre la barre du haut, la barre d'activité et les panneaux), la marge en un seul bloc (`Marginalia.tsx`, devenu `NotePanels.tsx`).

## Tests

- Unitaires : `layout.test.ts` (dispositions, déplacement, ordre, options, lecture d'un réglage ancien).
- Recette : sections 6, 8, 14 et 25 réécrites ; 6.25 à 6.32 et 25.28 à 25.31 ajoutées, automatisées sur le bureau et le web. Recette complète avant la fusion.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- ajouté : `packages/app/src/layout.test.ts`
- ajouté : `packages/app/src/layout.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/settings.ts`
- modifié : `packages/app/src/styles/tokens.css`
- modifié : `packages/app/src/styles/views.css`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `packages/app/src/ui/App.tsx`
- ajouté : `packages/app/src/ui/Bars.tsx`
- modifié : `packages/app/src/ui/BookmarkList.tsx`
- ajouté : `packages/app/src/ui/LayoutSettings.tsx`
- modifié : `packages/app/src/ui/LayoutView.tsx`
- renommé : `packages/app/src/ui/Marginalia.tsx` → `packages/app/src/ui/NotePanels.tsx`
- modifié : `packages/app/src/ui/NoteView.tsx`
- ajouté : `packages/app/src/ui/Panel.tsx`
- renommé : `packages/app/src/ui/Rail.tsx` → `packages/app/src/ui/SearchPanel.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- ajouté : `packages/app/src/ui/SideZone.tsx`
- modifié : `packages/app/src/ui/TagList.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `packages/app/src/ui/app-commands.ts`
- renommé : `packages/app/src/ui/marginalia.test.ts` → `packages/app/src/ui/note-panels.test.ts`
- modifié : `tests/recette/04-recherche-laterale.spec.ts`
- modifié : `tests/recette/06-barre-laterale.spec.ts`
- modifié : `tests/recette/08-barre-de-note.spec.ts`
- modifié : `tests/recette/09-editeur-ecriture.spec.ts`
- modifié : `tests/recette/14-marge.spec.ts`
- modifié : `tests/recette/19-graphe.spec.ts`
- modifié : `tests/recette/24-reglages.spec.ts`
- modifié : `tests/recette/25-apparence.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `1460999` feat(disposition): barres, panneaux à placer où l'on veut, dispositions prêtes
- `95fecc4` test(recette): la recette suit la nouvelle disposition
- `f36ee66` docs(design): la disposition dans DESIGN.md
