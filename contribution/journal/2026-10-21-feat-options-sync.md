---
date: 2026-10-21
branche: feat/options-sync
type: nouveauté
version: non publiée
---

# Options de synchronisation manquantes

## Pourquoi

Plusieurs options prévues dans la maquette n'étaient pas encore disponibles : masquer les curseurs, contrôler les pièces jointes, et garder certains dossiers hors de la sync.

## Ajouté

- **Curseurs** (global) : bascule « Curseurs des autres appareils » dans les réglages de sync ; masquer les curseurs ne coupe pas la sync, seulement leur affichage.
- **Pièces jointes** (par coffre) : bascule oui/non + champ taille maximale (Mo). Un coffre peut ne recevoir aucune pièce jointe, ou seulement les petites.
- **Dossiers locaux** (par coffre) : liste de chemins qui restent sur cet appareil ; ni envoyés ni reçus des autres appareils. Ajout par saisie, retrait par croix.
- `SyncPrefs` + `syncPrefs` / `setSyncPrefs` dans `sync.ts` : réglages globaux de l'appareil.
- `VaultSyncOptions` + `vaultSyncOptions` / `setVaultSyncOptions` dans `sync.ts` : réglages par coffre.

## Modifié

- `VaultSync` : nouvelles options `localPaths`, `skipAttachments`, `maxAttachmentBytes`.
- `SyncNodeOptions` : les mêmes options, passées à `VaultSync` via `SyncNode`.
- `SyncController` et `BackgroundSyncManager` : lisent les options du coffre et les passent au nœud.
- `SyncSettings.tsx` : nouveaux composants `CursorsRow` et `VaultSyncOptionsRows`.
- `i18n.ts` : clés anglaises et françaises pour les nouvelles options.
- `sync.css` : styles pour les tags de chemins locaux et le champ avec unité.

## Supprimé

Rien.

## Tests

Tests unitaires existants (36 fichiers, 224 tests) : tous passent.

## Fichiers

- `packages/sync/src/vault-sync.ts`
- `packages/sync/src/node.ts`
- `packages/app/src/sync.ts`
- `packages/app/src/ui/SyncSettings.tsx`
- `packages/app/src/i18n.ts`
- `packages/app/src/styles/sync.css`

## Commits

À venir.
