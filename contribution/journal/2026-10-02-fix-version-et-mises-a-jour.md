---
date: 2026-10-02
branche: fix/version-et-mises-a-jour
type: correction
version: non publiée
---

# La vraie version, des mises à jour d'un coup, et l'e-mail qui ne part pas

## Pourquoi

Signalé par l'utilisateur : À propos affichait toujours 0.1.0 ; une app en retard devait rattraper
les versions une à une ; un échec d'envoi d'e-mail donnait « Le serveur a eu un problème ».

## Ajouté

- Pré-version fixe `main-latest`, copie de la dernière version de test ; les apps de test s'y mettent
  à jour (`electron-builder.main.cjs`, fournisseur generic).
- Erreur « mail » côté serveur et message clair dans l'app.

## Modifié

- À propos : version donnée par le build (`__APP_VERSION__`).
- VERSIONS.md : numérotation des versions de test et `main-latest`.

## Supprimé

- La version écrite en dur dans les réglages.

## Tests

- Build AppImage local : `app-update.yml` pointe sur `main-latest`. `accounts.test.ts` : e-mail qui ne
  part pas.

## Fichiers

- modifié : `.github/workflows/main-builds.yml`
- ajouté : `apps/desktop/electron-builder.main.cjs`
- modifié : `apps/desktop/package.json`
- modifié : `apps/desktop/vite.config.ts`
- modifié : `apps/relay/src/accounts.test.ts`
- modifié : `apps/relay/src/accounts.ts`
- modifié : `apps/relay/src/api.ts`
- modifié : `apps/web/vite.config.ts`
- modifié : `contribution/VERSIONS.md`
- modifié : `package-lock.json`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/ui/AccountSettings.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`

## Commits

- `f90464e` fix(app): À propos montre la vraie version de l'app
- `bae5578` fix(versions): une app en retard passe directement à la dernière version de test
- `ef83240` fix(comptes): un e-mail qui ne part pas est dit clairement
