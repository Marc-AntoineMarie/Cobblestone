---
date: 2026-10-01
branche: feat/synchro-internet
type: nouveauté
version: non publiée
---

# Synchroniser par Internet, par un relais sur le VPS de l'utilisateur

## Pourquoi

Synchroniser des appareils qui ne sont pas sur le même réseau, et l'app web ; l'utilisateur fournit
son VPS et un sous-domaine.

## Ajouté

- `apps/relay` : serveur WebSocket qui rapproche les appareils par étiquette et fait passer leurs
  messages chiffrés, sans rien lire ni garder ; limites (taille, connexions, liens) et `/health`.
- Déploiement : Dockerfile, `deploy/relay` (Docker Compose et Caddy pour le HTTPS), `docs/RELAIS.md`.
- `RelayNetwork` et `NetworkSet` (réseau local et relais ensemble, relais activable à chaud).
- Réglages › Synchronisation : « Synchroniser par Internet » et l'adresse du relais.

## Modifié

- L'étiquette d'un appairage vient des trois premiers caractères du code (un relais public réunit les
  bons appareils sans apprendre le code) ; la recherche dure 15 s.
- L'app web propose la synchronisation et « Recevoir un coffre ».

## Supprimé

- Le message « la synchronisation arrive dans l'app web ».

## Tests

- `apps/relay/src/relay.test.ts` : appairage et synchro par le relais seul, étiquettes, liens
  refusés. Image Docker construite et lancée (`/health`). Recette 31.19 ajoutée, 31.14 modifiée ;
  31.1, 31.3, 31.14 et 31.19 passées.

## Fichiers

- modifié : `apps/desktop/src/main/lan-ipc.ts`
- ajouté : `apps/relay/Dockerfile`
- ajouté : `apps/relay/package.json`
- ajouté : `apps/relay/src/main.ts`
- ajouté : `apps/relay/src/relay.test.ts`
- ajouté : `apps/relay/src/relay.ts`
- ajouté : `apps/relay/tsconfig.json`
- modifié : `contribution/IDEES.md`
- ajouté : `deploy/relay/Caddyfile`
- ajouté : `deploy/relay/docker-compose.yml`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `docs/RECETTE.md`
- ajouté : `docs/RELAIS.md`
- modifié : `package-lock.json`
- modifié : `package.json`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/Launcher.tsx`
- modifié : `packages/app/src/ui/ReceiveVault.tsx`
- modifié : `packages/app/src/ui/SyncSettings.tsx`
- modifié : `packages/sync/src/index.ts`
- modifié : `packages/sync/src/network.ts`
- modifié : `packages/sync/src/node.test.ts`
- modifié : `packages/sync/src/node.ts`
- ajouté : `packages/sync/src/relay.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`
- modifié : `tests/recette/lib/cobble.ts`
- modifié : `tests/recette/lib/sync.ts`

## Commits

- `80ab11b` feat(synchro): le relais côté appareil, et un code d'appairage qui trouve son appareil
- `9ce9675` feat(relais): le serveur relais, à installer sur un VPS
- `ed9b4b0` feat(synchro): synchroniser par Internet, depuis le bureau comme le web
- `82cbee8` test(recette): synchronisation par le relais, réseau local coupé (31.19)
- `55cdef9` docs(synchro): le relais dans l'architecture et la suite
