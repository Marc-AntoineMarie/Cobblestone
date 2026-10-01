---
date: 2026-10-01
branche: fix/relais-proxy-existant
type: correction
version: non publiée
---

# Le relais derrière un serveur web déjà en place

## Pourquoi

Sur le VPS de l'utilisateur, les ports 80 et 443 sont déjà pris : Caddy ne démarrait pas.

## Ajouté

- docs/RELAIS.md : repérer ce qui tourne, bloc nginx (WebSocket) et certbot.

## Modifié

- `deploy/relay/docker-compose.yml` : le relais seul par défaut, sur `127.0.0.1:8787` ; Caddy en
  profil facultatif (`--profile caddy`).

## Supprimé

Rien.

## Tests

- Rien d'automatique (déploiement) ; vérifié par l'utilisateur sur son VPS.

## Fichiers

- modifié : `deploy/relay/docker-compose.yml`
- modifié : `docs/RELAIS.md`

## Commits

- `81a56b2` fix(relais): le relais seul par défaut, derrière le serveur web déjà en place
