---
date: 2026-10-01
branche: feat/comptes-appareils
type: nouveauté
version: non publiée
---

# Les appareils d'un compte se trouvent, avec ton accord

## Pourquoi

Demande de l'utilisateur : se connecter sur un nouvel appareil et retrouver ses coffres, avec son
consentement, en choisissant les coffres partagés.

## Ajouté

- Lien entre appareils d'un compte (`account-link`) : demande d'entrée, code de vérification à six
  chiffres tiré des deux clés (le serveur ne peut pas glisser un appareil), échange des coffres
  proposés entre appareils de confiance.
- Dialogue « Un nouvel appareil sur ton compte » (code, Refuser / Autoriser), bandeau du code sur le
  nouvel appareil, « Les coffres de ton compte » à l'accueil (Recevoir… / Dans un dossier…).
- Réglages › Synchronisation : « Sur tous mes appareils », coffre par coffre.

## Modifié

- Relais : l'étiquette du compte s'appelle « account » pour l'appareil (elle portait son nom interne).
- Un appareil connu du compte qui rejoint un coffre proposé entre dans sa liste d'appareils.

## Supprimé

Rien.

## Tests

- `account-link.test.ts` (accord avec le même code des deux côtés, refus sans rien donner), test du
  relais pour l'étiquette du compte ; recette 31.22 ajoutée (deux apps, compte, accord, coffre reçu),
  31.3, 31.19 et 31.20 repassées.

## Fichiers

- modifié : `apps/relay/src/accounts.test.ts`
- modifié : `apps/relay/src/relay.ts`
- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `docs/RECETTE.md`
- ajouté : `packages/app/src/account-link.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/sync.ts`
- ajouté : `packages/app/src/ui/AccountLinkDialogs.tsx`
- ajouté : `packages/app/src/ui/AccountOffers.tsx`
- modifié : `packages/app/src/ui/App.tsx`
- modifié : `packages/app/src/ui/Launcher.tsx`
- modifié : `packages/app/src/ui/SyncSettings.tsx`
- ajouté : `packages/sync/src/account-link.test.ts`
- ajouté : `packages/sync/src/account-link.ts`
- modifié : `packages/sync/src/index.ts`
- modifié : `packages/sync/src/node.ts`
- modifié : `packages/sync/src/protocol.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`
- modifié : `tests/recette/lib/sync.ts`

## Commits

- `70a3542` feat(comptes): les appareils d'un compte se reconnaissent, avec un code à comparer
- `f3d51b3` fix(relais): l'étiquette du compte garde son nom pour l'appareil
- `bdc7862` feat(comptes): autoriser un nouvel appareil et recevoir les coffres du compte
- `c8a29c2` test(recette): un nouvel appareil autorisé reçoit un coffre du compte (31.22)
