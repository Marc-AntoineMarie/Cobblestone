---
date: 2026-09-30
branche: feat/themes
type: nouveauté
version: non publiée
---

# Refonte, première partie : thèmes et apparence réglable, avec aperçu

## Pourquoi

L'utilisateur veut une interface ergonomique, intuitive et personnalisable à fond, avec des thèmes par défaut et un aperçu dans les réglages ; il a validé les maquettes Claude Design (carte blanche). Cette première partie livre toute l'apparence ; la disposition (panneaux, barre d'activité, dispositions prêtes) vient ensuite.

## Ajouté

- Moteur de thèmes (`packages/app/src/themes.ts`) : un thème donne les couleurs de ses rôles (fond, surfaces, creux, texte, texte secondaire, indications, accent, texte sur l'accent, surlignage, texte surligné) ; toutes les autres encres en sont déduites.
- Huit thèmes : Atelier, Papier, Kraft, Forêt, Contraste élevé (jour) ; Atelier nuit, Minuit, Crépuscule (nuit). Un thème pour le papier de jour, un pour la nuit.
- Contrôle du contraste : les thèmes intégrés passent les seuils WCAG (4,5:1 pour le texte, 3:1 pour les indications, testés) ; la page dit quelle paire devient difficile à lire quand on retouche des couleurs.
- Couleurs retouchables rôle par rôle, par thème, avec « Revenir aux couleurs du thème ».
- Thèmes à soi : « Nouveau thème à partir de … », renommer, changer ses couleurs, exporter (`.cobblestone-theme.json`), importer, supprimer.
- Polices de l'interface, des notes (celle du thème, Archivo, Literata, Atkinson Hyperlegible, celles du système) et du code ; Literata et Atkinson Hyperlegible embarquées.
- Densité des listes (compacte, normale, aérée) et forme des coins (droits, doux, ronds).
- Extraits CSS : `.cobblestone/snippets`, et ceux d'Obsidian (`.obsidian/snippets`) repris avec leur état, sans jamais écrire dans `.obsidian/` ; « Recharger », « Ouvrir le dossier ».
- Réglages en sections (Général, Apparence, Éditeur, Fichiers et liens, Aujourd'hui, Modèles, À propos) : liste qui suit le défilement, recherche, aperçu en direct du thème pointé.

## Modifié

- L'encre d'action s'appelle `--accent` (au lieu de `--pink`) ; les notes ont leur police (`--font-note`) ; les lignes de liste ont leur hauteur (`--row`).
- La langue passe dans la section Général ; la taille et la largeur du texte, dans Apparence.
- Le graphe relit ses encres à chaque changement de thème (il ne le faisait qu'au passage jour/nuit).
- DESIGN.md décrit les thèmes et l'apparence réglable ; IDEES.md, l'étape suivante de la refonte.

## Supprimé

Rien.

## Tests

- Unitaires : `themes.test.ts` (thèmes, contraste, jetons, fichiers de thème), `appearance.test.ts`, `snippets.test.ts`, import des extraits d'Obsidian dans `settings.test.ts`.
- Recette : 24.1 mise à jour ; 24.22 et 25.10 à 25.27 ajoutées, toutes automatisées sur le bureau et le web (25.26 : bureau seul).
- Tests de la recette rendus robustes sous la charge : l'aperçu au survol est redemandé si le lien a été redessiné sous la souris ; le dossier de l'app est supprimé en réessayant pendant qu'Electron écrit son cache. L'outil du canvas lit l'encre `--accent`.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `package-lock.json`
- modifié : `packages/app/package.json`
- ajouté : `packages/app/src/appearance.test.ts`
- ajouté : `packages/app/src/appearance.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/settings.test.ts`
- modifié : `packages/app/src/settings.ts`
- ajouté : `packages/app/src/snippets.test.ts`
- ajouté : `packages/app/src/snippets.ts`
- modifié : `packages/app/src/styles/base.css`
- modifié : `packages/app/src/styles/canvas.css`
- modifié : `packages/app/src/styles/editor.css`
- modifié : `packages/app/src/styles/index.css`
- modifié : `packages/app/src/styles/launcher.css`
- modifié : `packages/app/src/styles/markdown.css`
- modifié : `packages/app/src/styles/overlays.css`
- modifié : `packages/app/src/styles/tokens.css`
- modifié : `packages/app/src/styles/views.css`
- modifié : `packages/app/src/styles/workbench.css`
- ajouté : `packages/app/src/themes.test.ts`
- ajouté : `packages/app/src/themes.ts`
- modifié : `packages/app/src/ui/App.tsx`
- ajouté : `packages/app/src/ui/AppearanceSettings.tsx`
- modifié : `packages/app/src/ui/FileTree.tsx`
- modifié : `packages/app/src/ui/GraphView.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `packages/app/src/ui/preferences.ts`
- ajouté : `packages/app/src/ui/settings-parts.tsx`
- modifié : `tests/recette/24-reglages.spec.ts`
- modifié : `tests/recette/25-apparence.spec.ts`

## Commits

- `ba2bf54` refactor(design): l'encre d'action s'appelle --accent
- `c13e778` feat(apparence): moteur de thèmes, huit thèmes, polices, densité et coins
- `8bb6e82` feat(réglages): sections, recherche, et page Apparence avec aperçu en direct
- `b774d0f` feat(apparence): thèmes à soi, à exporter et à importer
- `c5c54f8` feat(apparence): extraits CSS, repris d'Obsidian
- `146514b` fix(graphe): les points prennent l'encre du thème choisi
- `f7e942f` docs(design): les thèmes et l'apparence réglable dans DESIGN.md
