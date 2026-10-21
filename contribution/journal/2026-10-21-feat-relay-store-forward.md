---
date: 2026-10-21
branche: feat/relay-store-forward
type: nouveauté
version: non publiée
---

# Relay store-and-forward (dépôt pour appareils hors ligne)

## Pourquoi

Quand un appareil est hors ligne, les mises à jour CRDT des autres appareils sont perdues. Le relay peut maintenant les conserver le temps que l'appareil se reconnecte.

## Ajouté

- `sealDeposit` / `openDeposit` dans `packages/sync/src/crypto.ts` : chiffrement ECDH X25519 éphémère + AES-256-GCM pour les dépôts.
- Interface `DepositTransport` dans `packages/sync/src/node.ts` : canal pluggable de dépôt/récupération.
- Logique de dépôt dans `SyncNode` : dépose l'état CRDT complet pour un pair à sa déconnexion ; applique les dépôts reçus au démarrage.
- Boîtes aux lettres dans `apps/relay/src/relay.ts` : stocke un dépôt par paire (expéditeur → destinataire), livré à la reconnexion.
- `depositRaw` / `onDepositRaw` dans `RelayNetwork` (`packages/sync/src/relay.ts`).
- `relayDepositTransport()` dans `packages/app/src/sync.ts` : branche le relay comme transport de dépôt pour tous les nœuds (foreground et arrière-plan).
- Variable d'environnement `RELAY_STORE_HOURS` (défaut : 48 h) pour configurer la durée de rétention.

## Modifié

- `packages/sync/src/index.ts` : exporte `DepositTransport`.
- `packages/app/src/sync.ts` : `SyncController` et `BackgroundSyncManager` passent un `DepositTransport` à chaque `SyncNode`.

## Supprimé

Rien.

## Tests

Tests unitaires existants (36 fichiers, 224 tests) : tous passent.

## Fichiers

- `packages/sync/src/crypto.ts`
- `packages/sync/src/node.ts`
- `packages/sync/src/relay.ts`
- `packages/sync/src/index.ts`
- `apps/relay/src/relay.ts`
- `apps/relay/src/main.ts`
- `packages/app/src/sync.ts`

## Commits

À venir.
