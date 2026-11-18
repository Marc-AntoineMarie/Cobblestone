---
date: 2026-11-18
branche: fix/editeur-lie-synchro
type: correction
version: non publiée
---

# Notes qui reviennent en arrière, et téléphone qui ne reçoit plus

## Pourquoi

Deux causes de modifications perdues entre appareils.

L'éditeur ne se liait au texte partagé d'une note qu'une seule fois, au montage. Une note déjà ouverte au lancement (la synchronisation démarre après) restait liée à rien : elle ne recevait plus ce que les autres écrivaient, et la première frappe renvoyait son texte périmé par-dessus — une suppression ou une modification faite ailleurs revenait.

Sur téléphone, un socket endormi par le système revient souvent ouvert mais sourd : plus rien n'arrive et aucune fermeture n'est signalée, donc aucune reconnexion n'était tentée. L'appareil se croyait en ligne et ne recevait rien.

## Ajouté

- `LiveBinding` (`packages/app/src/editor/collab.ts`) : la liaison d'un éditeur au texte partagé du moment, et `followShared(view)` pour la refaire à chaque changement extérieur du fichier.
- `RelayNetwork.wake()` : abandonne un socket muet depuis plus d'une minute (le relais ping toutes les 30 s) et se reconnecte aussitôt.
- Recette 31.25 (note ouverte avant le démarrage de la synchronisation) et 31.26 (appareil en veille, manuel).

## Modifié

- `Editor.tsx` : un changement extérieur passe d'abord par `followShared`.
- `sync.ts` : les notes ouvertes sont prévenues dès que le nœud démarre ; `wake()` est appelé au retour de l'appareil (`visibilitychange`, `focus`, `online`, `pageshow`).
- Une modification venue du fichier ne compte plus comme une frappe.
- Guide : [docs/guide/sync.md](../../docs/guide/sync.md), sections « Writing together » et « Finding each other ».

## Supprimé

Rien.

## Tests

- `collab.test.ts` : quatre cas de liaison (texte partagé arrivé après coup, frappe gardée, passage à un autre texte partagé, frappe des autres).
- `relay.test.ts` : un socket endormi puis réveillé fait une nouvelle connexion et retrouve ses tags.
- Recette 31 et 9 (bureau et web).

## Fichiers

- modifié : `apps/relay/src/relay.test.ts`
- modifié : `docs/RECETTE.md`
- modifié : `docs/guide/sync.md`
- modifié : `packages/app/src/editor/collab.test.ts`
- modifié : `packages/app/src/editor/collab.ts`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/Editor.tsx`
- modifié : `packages/sync/src/relay.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `e6d7a75` fix(synchro): garder l'éditeur sur le texte partagé du moment
- `17a4c0c` fix(synchro): réveiller le relais quand l'appareil revient
- `9dd4576` docs(guide): liaison de l'éditeur au texte partagé et réveil du relais
