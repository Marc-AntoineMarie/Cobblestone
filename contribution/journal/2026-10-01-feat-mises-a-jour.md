---
date: 2026-10-01
branche: feat/mises-a-jour
type: nouveauté
version: non publiée
---

# Une version de test à chaque push, et l'app qui se met à jour seule

## Pourquoi

L'utilisateur veut installer l'app sur son PC Windows sans compiler le dépôt, et qu'elle se mette à
jour d'elle-même à chaque changement de `main`.

## Ajouté

- Workflow « Version de test » : après la CI, pré-version `X.Y.Z-main.N` (installeur Windows,
  AppImage, .deb, fichiers de mise à jour) ; les 5 dernières gardées.
- Mise à jour automatique (electron-updater) : vérification au lancement et toutes les heures,
  téléchargement en arrière-plan, bandeau « Redémarrer pour mettre à jour » (ou installation à la
  fermeture).

## Modifié

- Les versions officielles portent aussi les fichiers de mise à jour (`latest*.yml`, `.blockmap`).
- VERSIONS.md : les versions de test.

## Supprimé

Rien.

## Tests

- Build local de l'AppImage : `app-update.yml` pointe sur les versions GitHub. Recette 27.11 manuelle
  (il faut une version publiée).

## Fichiers

- ajouté : `.github/workflows/main-builds.yml`
- modifié : `.github/workflows/release.yml`
- modifié : `apps/desktop/electron-builder.yml`
- modifié : `apps/desktop/package.json`
- modifié : `apps/desktop/src/main/index.ts`
- ajouté : `apps/desktop/src/main/updates.ts`
- modifié : `apps/desktop/src/preload/index.ts`
- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `contribution/VERSIONS.md`
- modifié : `docs/RECETTE.md`
- modifié : `package-lock.json`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/app/src/styles/overlays.css`
- modifié : `packages/app/src/ui/App.tsx`
- ajouté : `packages/app/src/ui/UpdateReady.tsx`
- modifié : `tests/recette/27-bureau.spec.ts`

## Commits

- `7cc3729` feat(bureau): mise à jour automatique depuis les versions GitHub
- `3a7ab18` ci(versions): une version de test à chaque push sur main
