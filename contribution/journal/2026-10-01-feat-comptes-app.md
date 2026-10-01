---
date: 2026-10-01
branche: feat/comptes-app
type: nouveauté
version: non publiée
---

# Réglages › Compte

## Pourquoi

Deuxième étape des comptes : les créer et s'y connecter depuis l'app.

## Ajouté

- Réglages › Compte : créer un compte, code reçu par e-mail, se connecter, mot de passe oublié ;
  connecté : appareils du compte (vus quand), déconnecter un appareil, se déconnecter, supprimer le
  compte (avec le mot de passe).
- Le relais reçoit le jeton du compte : l'appareil peut rejoindre l'étiquette de son compte.

## Modifié

- Politique de sécurité de la fenêtre du bureau : les requêtes HTTPS sont permises (sinon le serveur
  des comptes était injoignable).

## Supprimé

Rien.

## Tests

- Recette 31.20 (relais local avec comptes, code capturé) ; 31.21 manuelle (vraie boîte e-mail).

## Fichiers

- modifié : `apps/desktop/src/renderer/index.html`
- modifié : `docs/RECETTE.md`
- ajouté : `packages/app/src/account.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/sync.ts`
- ajouté : `packages/app/src/ui/AccountSettings.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- modifié : `packages/sync/src/relay.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `7a39f35` feat(comptes): l'app ouvre une session de compte et la présente au relais
- `a3ba78c` feat(comptes): Réglages › Compte
- `74dadd2` test(recette): créer un compte et s'y connecter (31.20, 31.21)
