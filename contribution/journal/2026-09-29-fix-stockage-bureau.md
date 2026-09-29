---
date: 2026-09-29
branche: fix/stockage-bureau
type: correction
version: non publiée
---

# Les enregistrements simultanés ne se marchent plus dessus

## Pourquoi

Test de recette : après avoir supprimé un coffre, lancé la démo puis recréé un coffre, l'accueil affichait « Impossible d'ouvrir ce coffre : Error invoking remote method 'storage:set': ENOENT … rename storage.json.tmp ». Deux enregistrements lancés en même temps passaient par le même fichier temporaire : le second renommage échouait, et une valeur pouvait être perdue.

## Ajouté

- `JsonFile` (`apps/desktop/src/main/json-file.ts`) : petit fichier JSON gardé en mémoire, dont les modifications passent une par une, avec un fichier temporaire unique à chaque écriture. Le dossier est recréé s'il a été supprimé pendant que l'app tourne.

## Modifié

- Le processus principal de l'app de bureau lit et écrit `storage.json` et `vaults.json` avec `JsonFile` au lieu de relire et réécrire le fichier à chaque appel.
- L'ouverture d'un coffre ne signale plus d'erreur si seule la mémorisation du « dernier coffre ouvert » échoue : le coffre est ouvert, l'échec est écrit dans la console.

## Supprimé

- Les fonctions `readJson` et `writeJson` du processus principal.

## Tests

- Unitaires : `json-file.test.ts` (40 modifications simultanées toutes gardées, aucun fichier temporaire restant, dossier recréé, reprise après une erreur).

## Fichiers

- modifié : `apps/desktop/src/main/index.ts`
- ajouté : `apps/desktop/src/main/json-file.test.ts`
- ajouté : `apps/desktop/src/main/json-file.ts`
- modifié : `packages/app/src/ui/App.tsx`

## Commits

- `a321a17` fix(bureau): les enregistrements simultanés ne se marchent plus dessus
- `f3c9a05` fix(accueil): un échec d'enregistrement n'empêche plus d'ouvrir un coffre
