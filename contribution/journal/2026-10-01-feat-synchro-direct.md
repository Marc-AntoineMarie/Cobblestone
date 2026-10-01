---
date: 2026-10-01
branche: feat/synchro-direct
type: nouveauté
version: non publiée
---

# Écrire ensemble en temps réel

## Pourquoi

Demande de l'utilisateur : une note modifiée sur deux appareils doit se comporter comme dans Google
Docs, une seule version qui bouge sous les yeux, sans perte.

## Ajouté

- L'éditeur travaille sur le texte partagé de la note : chaque frappe part aussitôt, ce que les autres
  tapent arrive là où ils l'ont tapé ; le fichier est toujours enregistré.
- Le curseur et la sélection des autres appareils, à leur nom et dans leur encre (message « presence »).

## Modifié

- Le moteur reconnaît les enregistrements d'un éditeur branché sur le texte partagé : les comparer au
  texte partagé, qui avait avancé, effaçait ce que l'autre venait de taper (vu par la recette 31.16).

## Supprimé

- La limite connue « quelques caractères perdus en tapant en même temps » (IDEES, ARCHITECTURE).

## Tests

- `collab.test.ts` (frappes simultanées convergentes), présence (`protocol.test.ts`, `node.test.ts`).
- Recette 31.16 ajoutée ; sections 31 (bureau) et 09 (éditeur, bureau et web) passées.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/package.json`
- ajouté : `packages/app/src/editor/collab.test.ts`
- ajouté : `packages/app/src/editor/collab.ts`
- modifié : `packages/app/src/editor/setup.ts`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/Editor.tsx`
- modifié : `packages/sync/src/index.ts`
- modifié : `packages/sync/src/node.test.ts`
- modifié : `packages/sync/src/node.ts`
- modifié : `packages/sync/src/protocol.test.ts`
- modifié : `packages/sync/src/protocol.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `39b767c` feat(synchro): présence des appareils et texte partagé accessible à l'éditeur
- `3db1786` feat(synchro): écrire ensemble en temps réel, avec le curseur des autres
- `cb733f7` test(recette): écrire en même temps sur deux appareils (31.16)
- `29dc905` docs(synchro): l'écriture en temps réel dans l'architecture et les idées
