---
date: 2026-10-01
branche: fix/synchro-disque-plein
type: correction
version: non publiée
---

# Disque plein : rien de perdu, réécrit plus tard, et l'app le dit

## Pourquoi

Question de l'utilisateur : que se passe-t-il si un appareil n'a plus de place ? Un fichier refusé
n'était jamais réessayé, et rien ne le signalait.

## Ajouté

- Nouvel essai toutes les 30 s des fichiers non écrits (ils restent dans la synchronisation).
- Barre d'état « N fichiers non écrits » ; dans les réglages, la raison (disque plein…).

## Modifié

- Réception d'un coffre : « Où ranger le coffre ? » en titre, avec une phrase d'explication.
- IDEES : partage décidé, sans compte (code et lien) ou avec de vrais comptes.

## Supprimé

Rien.

## Tests

- `vault-sync.test.ts` : disque plein puis libéré, le fichier arrive. Recette 31.18 (manuelle) ; 31.3
  et 31.8 passées.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/ReceiveVault.tsx`
- modifié : `packages/app/src/ui/SyncStatus.tsx`
- modifié : `packages/sync/src/vault-sync.test.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `d12bc5a` fix(synchro): un fichier refusé par un disque plein est réécrit plus tard
- `3a583d9` feat(synchro): l'app dit quels fichiers n'ont pas pu être écrits, et pourquoi
- `07bfc23` docs(idees): partage sans compte (code et lien) ou avec de vrais comptes
