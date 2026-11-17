---
date: 2026-11-17
branche: feat/mobile-clavier
type: nouveauté
version: non publiée
---

# Téléphone : barre au-dessus du clavier

## Pourquoi

Écrire du Markdown au doigt est lent : crochets, dièses et astérisques sont cachés dans les claviers secondaires. Troisième étape de la refonte téléphone décidée le 2026-11-16.

## Ajouté

- `MobileKeyboardBar.tsx` : barre posée sur le clavier pendant l'écriture : `[[ ]]`, `#`, case à cocher, titre, gras, italique, liste, pièce jointe (photo ou fichier, enregistrée comme un collage), annuler, rétablir, masquer le clavier, « Terminé ». Les boutons gardent le focus dans le texte.
- `editor/commands.ts` : `cycleHeading` (texte → # → ## → ### → texte), `toggleBullet` (une tâche garde sa puce), `insertText` ; tests dans `commands.test.ts`.
- Recette 32.16, 32.17 ; aide `ui.phone.keyboard()` qui simule le clavier (le viewport visuel rétrécit comme sur iOS).

## Modifié

- `mobile-hooks.ts` : `--vv-top` en plus de `--vvh` pour suivre le viewport visuel d'iOS.
- `mobile.css` : la barre suit le bas du viewport visuel ; l'écran s'arrête à la barre pendant la saisie ; les suggestions de liens deviennent un bandeau au-dessus de la barre.
- `session.ts` : `fail()` publique (erreurs d'enregistrement des pièces jointes).
- `DESIGN.md` (section Phone) ; `IDEES.md` : étape faite, vérification à faire sur un vrai iPhone.

## Supprimé

Rien.

## Tests

`commands.test.ts` (2 tests). Recette web 32.16 et 32.17 réussies. Capture relue avec clavier simulé : barre, bandeau de suggestions, titre appliqué, retour en lecture. À confirmer sur un vrai iPhone (défilement de Safari sous le clavier).

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- ajouté : `packages/app/src/editor/commands.test.ts`
- modifié : `packages/app/src/editor/commands.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/mobile.css`
- ajouté : `packages/app/src/ui/MobileKeyboardBar.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- modifié : `packages/app/src/ui/mobile-hooks.ts`
- modifié : `tests/recette/32-telephone.spec.ts`
- modifié : `tests/recette/lib/ui.ts`

## Commits

- `5b28f81` feat(editor): commandes titre en cycle, liste et insertion de texte
- `39f5c82` feat(mobile): barre de mise en forme au-dessus du clavier
- `2309a54` test(recette): barre du clavier et pièce jointe sur téléphone (32.16, 32.17)
- `cdf0c1d` docs: barre du clavier dans DESIGN.md, étape faite dans IDEES.md
