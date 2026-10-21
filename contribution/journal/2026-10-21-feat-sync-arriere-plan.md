---
date: 2026-10-21
branche: feat/sync-arriere-plan
type: nouveauté
version: non publiée
---

# Synchronisation en arrière-plan de tous les coffres du compte

## Pourquoi

Jusqu'ici, un coffre ne se synchronisait que s'il était ouvert dans l'app. L'utilisateur ayant
plusieurs coffres devait ouvrir chacun pour qu'il reçoive les modifications des autres appareils.
Désormais, tous les coffres connus restent à jour pendant que l'app tourne, même s'ils sont fermés.

## Ajouté

- `BackgroundSyncManager` (singleton `backgroundSync`) dans `packages/app/src/sync.ts` : au lancement
  de l'app, ouvre un `SyncNode` léger pour chaque coffre connu accessible en silence (OPFS sur le web,
  tous les coffres sur le bureau) ; s'arrête proprement quand l'app se ferme.
- `Platform.openVaultSilent` : ouvre le stockage d'un coffre sans interaction ni invite de permission ;
  retourne `null` si le coffre n'est pas accessible sans prompt (dossier natif sur le web).

## Modifié

- `SyncController.attach()` : relâche le nœud d'arrière-plan du coffre avant de démarrer le nœud
  de premier plan, pour éviter deux `SyncNode` concurrents sur le même coffre.
- `App.tsx` : démarre `backgroundSync` au montage et l'arrête au démontage.
- `apps/web/src/platform.ts` : implémentation de `openVaultSilent` pour les coffres OPFS.
- `apps/desktop/src/renderer/platform.ts` : implémentation de `openVaultSilent` via IPC.
- `packages/app/src/platform.ts` : nouvelle méthode optionnelle `openVaultSilent`.

## Supprimé

Rien.

## Tests

Aucun test automatique ajouté (le comportement est couvert par les tests d'intégration de sync
existants) ; `npm run check` passe, 224 tests passent.

## Fichiers

- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `apps/web/src/platform.ts`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/App.tsx`

## Commits

À venir.
