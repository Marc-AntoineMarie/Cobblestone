---
date: 2026-09-29
branche: feat/afficher-dans-dossier
type: nouveauté
version: non publiée
---

# Afficher une note ou un dossier dans le gestionnaire de fichiers

## Pourquoi

Demande de l'utilisateur : ouvrir l'explorateur de fichiers du système au bon endroit depuis une note ou un dossier du coffre.

## Ajouté

- « Afficher dans le gestionnaire de fichiers » (« dans le Finder » sur macOS, « dans l'Explorateur » sur Windows) dans le clic droit de l'arborescence et dans le menu « ⋯ » d'une note : le dossier parent s'ouvre avec l'élément sélectionné.
- « Ouvrir le dossier du coffre » dans le menu du nom du coffre.
- Commande de palette « Montrer cette note dans le gestionnaire de fichiers ».
- IPC `shell:reveal`, qui n'accepte que des chemins du coffre ouvert dans la fenêtre ; `revealInFolder` et `os` dans la plateforme.

## Modifié

Rien : le web n'a pas ce pouvoir, rien n'y est proposé.

## Supprimé

Rien.

## Tests

- Bout en bout : le menu du bureau propose l'entrée pour un dossier et pour le coffre ; le web ne la propose pas.

## Fichiers

- modifié : `apps/desktop/src/main/index.ts`
- modifié : `apps/desktop/src/preload/index.ts`
- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/ui/FileTree.tsx`
- modifié : `packages/app/src/ui/NoteView.tsx`
- modifié : `packages/app/src/ui/Rail.tsx`
- modifié : `packages/app/src/ui/app-commands.ts`
- modifié : `scripts/e2e-desktop.mjs`
- modifié : `scripts/e2e-web.mjs`

## Commits

- `de205df` feat(fichiers): afficher une note ou un dossier dans le gestionnaire de fichiers
