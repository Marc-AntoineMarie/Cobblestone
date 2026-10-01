---
date: 2026-10-01
branche: fix/synchro-dossiers
type: correction
version: non publiée
---

# Les dossiers se synchronisent

## Pourquoi

Signalé par l'utilisateur : un dossier créé sur un appareil n'apparaissait pas sur l'autre.

## Ajouté

- Événement `create-folder` du coffre (dossier créé ici, par un autre programme, ou pour une note).
- Entrées « dossier » dans la synchronisation : création, renommage, suppression.

## Modifié

- Un dossier renommé sur un appareil ne laisse plus son ancien dossier vide sur l'autre.
- IDEES : le partage avec d'autres personnes (demande), le coffre reçu qui ne s'ouvre pas seul sur
  Windows (à reproduire).

## Supprimé

Rien.

## Tests

- `vault-sync.test.ts` : dossiers vides créés, renommés, supprimés. Recette 31.17 ajoutée, 31.5 et
  31.17 passées.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/ui/hooks.ts`
- modifié : `packages/core/src/vault.ts`
- modifié : `packages/sync/src/model.ts`
- modifié : `packages/sync/src/vault-sync.test.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `9888fd6` fix(synchro): les dossiers se synchronisent, vides compris
- `c83e9dd` test(recette): un dossier vide passe d'un appareil à l'autre (31.17)
- `9e117c6` docs(idees): le partage avec d'autres personnes, et l'ouverture du coffre reçu sur Windows
