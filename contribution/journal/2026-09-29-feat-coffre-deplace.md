---
date: 2026-09-29
branche: feat/coffre-deplace
type: nouveauté
version: non publiée
---

# Suivre un coffre renommé ou déplacé

## Pourquoi

Demande de l'utilisateur après le test 2.20 : quand le dossier d'un coffre change de nom, Cobblestone doit le voir et proposer « ce coffre est devenu « nouveau nom », le prendre en compte ? ». En creusant, deux effets de bord sont apparus : renommer le dossier d'un coffre ouvert faisait croire à la suppression de toutes les notes (onglets fermés), et une sauvegarde tardive recréait l'ancien dossier avec une seule note.

## Ajouté

- Identité des dossiers (périphérique et inode, `relocate.ts`) enregistrée avec chaque coffre récent ; elle survit à un renommage ou un déplacement sur le même disque, alors qu'une copie en reçoit une nouvelle.
- Recherche du dossier disparu autour de l'ancien emplacement puis dans le dossier personnel, sans les dossiers cachés (dont la corbeille), limitée à 20 000 dossiers.
- Encadré `LostVault` : « « Ancien » s'appelle maintenant « Nouveau » », chemins Avant et Maintenant, boutons « Suivre et ouvrir », « C'est un autre dossier… », « Retrouver le dossier… », « Retirer de la liste », « Pas maintenant ».
- Sur l'accueil, état « Introuvable » (mot et rond vide) pour les coffres dont le dossier a disparu.
- Pendant l'usage, l'app de bureau vérifie les coffres ouverts au retour sur la fenêtre et toutes les 3 secondes, et affiche l'encadré par-dessus le coffre ; s'il revient à sa place, le coffre se rouvre.
- IPC `vaults:findMoved`, `vaults:relocate`, événement `vaults:missing` ; méthodes `findMovedVault`, `relocateVault`, `onVaultMissing` de la plateforme.
- Web : « Retrouver le dossier… » rouvre le sélecteur et garde l'identifiant du coffre (onglets conservés).
- Un éditeur dont la note est illisible affiche « Impossible de lire cette note : … » au lieu d'une page vide.

## Modifié

- L'adaptateur fichiers ignore les suppressions annoncées quand c'est le dossier du coffre lui-même qui a disparu, et refuse de recréer la racine du coffre en écrivant.
- Chaque surveillance de fichiers a son jeton : en rouvrant le même coffre, l'ancienne session n'arrête plus celle de la nouvelle.
- Le plan de travail est recréé à chaque ouverture, même du même coffre.

## Supprimé

Rien.

## Tests

- Unitaires : `relocate.test.ts` (renommé, déplacé, copie et corbeille refusées, budget), `fs-adapter.test.ts` (racine non recréée, silence au renommage de la racine).
- Bout en bout (bureau) : suit un coffre renommé pendant l'usage, enregistre au nouvel endroit sans rien recréer à l'ancien, retrouve un coffre déplacé app fermée, une seule entrée dans la liste.

## Fichiers

- modifié : `apps/desktop/src/main/index.ts`
- modifié : `apps/desktop/src/main/ipc-types.ts`
- ajouté : `apps/desktop/src/main/relocate.test.ts`
- ajouté : `apps/desktop/src/main/relocate.ts`
- modifié : `apps/desktop/src/preload/index.ts`
- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `apps/web/src/platform.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/index.ts`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/app/src/styles/editor.css`
- modifié : `packages/app/src/styles/launcher.css`
- modifié : `packages/app/src/styles/overlays.css`
- modifié : `packages/app/src/ui/App.tsx`
- modifié : `packages/app/src/ui/Editor.tsx`
- modifié : `packages/app/src/ui/Launcher.tsx`
- ajouté : `packages/app/src/ui/LostVault.tsx`
- modifié : `packages/node/src/fs-adapter.test.ts`
- modifié : `packages/node/src/fs-adapter.ts`
- modifié : `scripts/e2e-desktop.mjs`

## Commits

- `b39b7cd` fix(fichiers): renommer le dossier d'un coffre ouvert ne vide ni ne recrée rien
- `67875a0` feat(bureau): retrouver le dossier d'un coffre renommé ou déplacé
- `f3b5152` feat(coffres): suivre un coffre renommé ou déplacé, à l'ouverture comme en cours d'usage
- `b68823b` fix(éditeur): une note illisible affiche l'erreur au lieu d'une page vide
