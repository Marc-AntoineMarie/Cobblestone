---
date: 2026-11-17
branche: feat/atelier
type: nouveauté
version: non publiée
---

# Ordinateur : la liste, la note, la marge

## Pourquoi

Refonte de l'atelier sur ordinateur, décidée avec l'utilisateur sur trois directions puis leur fusion (canevas : https://claude.ai/artifact/PR9EAJFJiVj61hjGTrV4FL). L'interface reprenait Obsidian : barre du haut, barre d'activité, huit panneaux déplaçables entre deux zones. Au repos la fenêtre doit être calme ; les outils n'apparaissent qu'au travail. La continuité avec le téléphone était aussi à faire : la liste est maintenant la même des deux côtés.

## Ajouté

- `NoteList.tsx` : la liste des notes, commune au téléphone et à l'ordinateur (récentes avec extrait et heure, dossiers, tags) ; sur ordinateur les dossiers restent l'arborescence (glisser-déposer, clavier), sur téléphone un niveau par écran.
- `DeskList.tsx` : la colonne de gauche — coffre et son menu, champ « Chercher, créer, demander » (noms et texte, « Créer »), la liste, puis Nouvelle note (clic droit : note du jour, canevas, dossier), graphe, réglages et état de la synchronisation.
- `Marge.tsx` : la colonne de droite — rail de boutons (Liens avec son compteur, Plan, Propriétés, Graphe local), un panneau à la fois, refermé par le même bouton.
- `layout.ts` : nouveau modèle (liste, marge, rail, onglets, barre d'état, largeur) et trois dispositions prêtes : Complet, Lecture, Concentré ; tests dans `layout.test.ts`.
- Réglages › Disposition : les boutons de la marge s'activent et se réordonnent ; « Onglets au-dessus des notes » : toujours, plusieurs notes, jamais.
- `session.unpin()` ; menu d'une carte épinglée ; Ctrl+clic sur une note de la liste.

## Modifié

- `Workbench.tsx` : la liste, les notes, la marge ; sous 1000 px la liste passe par-dessus avec un voile. Commande « Afficher ou masquer la liste des notes » (Ctrl+Maj+\\, Ctrl+[) ; Ctrl+] masque la marge.
- `Bars.tsx` : la barre d'état ne garde que les compteurs de la note et l'apparence rapide.
- `Panel.tsx` : un panneau est un titre et un corps ; plus de pliage, de menu ni de glisser-déposer entre zones.
- `LayoutView.tsx` : les onglets apparaissent à la deuxième note ouverte.
- `mobile.css` scindé : `list.css` porte la liste commune ; la commande « Montrer cette note dans son dossier » remplace « …dans la barre latérale ».
- Recette : section 6 réécrite (la liste), section 14 (la marge, un panneau à la fois), 25.5 et 25.28 à 25.31 (dispositions), 5.39, 5.40, 8.9, 8.11, 8.23, 3.7, 13.x, 16.13, 24.1.
- `DESIGN.md` (Layout, Components) ; `IDEES.md` : étapes restantes.

## Supprimé

- `SideZone.tsx`, `PressStatus.tsx`, `TagList.tsx`, `BookmarkList.tsx`, et les panneaux Recherche et Fichiers de `SearchPanel.tsx` : la liste les remplace.
- La barre du haut, la barre d'activité, les dispositions Classique, Concentration, Chercheur et Miroir, le déplacement des panneaux entre zones.

## Tests

Unitaires : 237 réussis (6 nouveaux pour le modèle de disposition). Recette web section 6 lancée pendant le travail : 26 réussis, 2 corrigés depuis. **La recette complète reste à lancer** (demande de l'utilisateur) : `npm run e2e -- tests/recette/03 tests/recette/05 tests/recette/06 tests/recette/08 tests/recette/13 tests/recette/14 tests/recette/16 tests/recette/24 tests/recette/25`.
Relecture visuelle : captures de l'accueil, d'une note, du panneau Liens, des dossiers, de la recherche et des réglages à 1440 px.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/layout.test.ts`
- modifié : `packages/app/src/layout.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/index.css`
- ajouté : `packages/app/src/styles/list.css`
- modifié : `packages/app/src/styles/mobile.css`
- modifié : `packages/app/src/styles/views.css`
- modifié : `packages/app/src/styles/workbench.css`
- modifié : `packages/app/src/ui/Bars.tsx`
- supprimé : `packages/app/src/ui/BookmarkList.tsx`
- ajouté : `packages/app/src/ui/DeskList.tsx`
- modifié : `packages/app/src/ui/LayoutSettings.tsx`
- modifié : `packages/app/src/ui/LayoutView.tsx`
- ajouté : `packages/app/src/ui/Marge.tsx`
- modifié : `packages/app/src/ui/MobileHome.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- ajouté : `packages/app/src/ui/NoteList.tsx`
- modifié : `packages/app/src/ui/Panel.tsx`
- supprimé : `packages/app/src/ui/PressStatus.tsx`
- modifié : `packages/app/src/ui/SearchPanel.tsx`
- supprimé : `packages/app/src/ui/SideZone.tsx`
- supprimé : `packages/app/src/ui/TagList.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `packages/app/src/ui/app-commands.ts`
- modifié : `tests/recette/03-migration-obsidian.spec.ts`
- modifié : `tests/recette/05-arborescence-des-fichiers.spec.ts`
- modifié : `tests/recette/06-barre-laterale.spec.ts`
- modifié : `tests/recette/08-barre-de-note.spec.ts`
- modifié : `tests/recette/13-apercu-au-survol.spec.ts`
- modifié : `tests/recette/14-marge.spec.ts`
- modifié : `tests/recette/16-toutes-les-commandes.spec.ts`
- modifié : `tests/recette/24-reglages.spec.ts`
- modifié : `tests/recette/25-apparence.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `2f91de0` refactor(app): nouveau modèle de disposition pour l'atelier
- `f540550` feat(app): la liste des notes, commune au téléphone et à l'ordinateur
- `40bd8b3` feat(app): la marge à rail et l'atelier sans barres
- `97d701b` style(app): styles de la liste, de la marge et des réglages de disposition
- `527970b` test(recette): adapter la recette à la nouvelle ossature (sections 6, 14, 25)
- `f13d570` docs: ossature de l'atelier dans DESIGN.md, étapes restantes dans IDEES.md
