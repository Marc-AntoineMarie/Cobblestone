---
date: 2026-10-01
branche: feat/relais-officiel
type: nouveauté
version: non publiée
---

# Le relais officiel par défaut

## Pourquoi

Le relais tourne sur le VPS de l'utilisateur, derrière son nginx, en HTTPS.

## Ajouté

- `DEFAULT_RELAY` : `cobblestone.marc-antoinemarie.com` ; la synchronisation par Internet marche sans
  réglage.

## Modifié

- La recette coupe le relais par défaut (pas de dépendance au réseau ni au serveur réel).
- IDEES : relais en service ; clé d'accès proposée.

## Supprimé

Rien.

## Tests

- `/health` et poignée de main WebSocket vérifiés sur le relais réel ; 31.14 et 31.19 passées.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `packages/app/src/sync.ts`
- modifié : `tests/recette/lib/cobble.ts`

## Commits

- `cd760d2` feat(synchro): le relais officiel par défaut (cobblestone.marc-antoinemarie.com)
- `9ce7dce` docs(idees): relais officiel en service, clé d'accès proposée
