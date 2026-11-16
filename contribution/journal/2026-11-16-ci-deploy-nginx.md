---
date: 2026-11-16
branche: ci/deploy-nginx
type: maintenance
version: non publiée
---

# Déploiement Nginx + CI/CD

## Pourquoi

Remplacer Caddy par Nginx (déjà installé sur le VPS) et automatiser le déploiement via GitHub Actions pour chaque push sur `main`.

## Ajouté

- `deploy/web/cobblestone.nginx.conf` : config Nginx pour l'app web (SPA fallback, cache assets Vite, no-cache `sw.js`, gzip).
- `deploy/relay/sync.nginx.conf` : config Nginx pour le relay (reverse proxy WebSocket vers `127.0.0.1:8787`).
- `.github/workflows/deploy.yml` : build web, rsync vers le VPS, relance du relay Docker.

## Modifié

- `deploy/relay/docker-compose.yml` : retiré le service Caddy et son volume ; simplifié les commentaires.

## Supprimé

- `deploy/web/Caddyfile`, `deploy/web/docker-compose.yml`, `deploy/relay/Caddyfile` : remplacés par Nginx.

## Tests

Le workflow sera validé au premier push sur `main` via GitHub Actions.

## Fichiers

- ajouté : `.github/workflows/deploy.yml`
- supprimé : `deploy/relay/Caddyfile`
- modifié : `deploy/relay/docker-compose.yml`
- ajouté : `deploy/relay/sync.nginx.conf`
- supprimé : `deploy/web/Caddyfile`
- ajouté : `deploy/web/cobblestone.nginx.conf`
- supprimé : `deploy/web/docker-compose.yml`

## Commits

- `1b12d22` ci(deploy): nginx + workflow de déploiement automatique
