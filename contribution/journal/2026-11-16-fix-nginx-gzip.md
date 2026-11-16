---
date: 2026-11-16
branche: fix/nginx-gzip
type: correction
version: non publiée
---

# Avertissement gzip Nginx

## Pourquoi

Nginx signalait `duplicate MIME type "text/html"` au rechargement : `text/html` est toujours compressé quand `gzip on`, le lister dans `gzip_types` est redondant.

## Ajouté

Rien.

## Modifié

- `deploy/web/cobblestone.nginx.conf` : `text/html` retiré de `gzip_types` (le HTML reste compressé).

## Supprimé

Rien.

## Tests

Config seule : `sudo nginx -t` sur le VPS ne doit plus afficher l'avertissement.

## Fichiers

- modifié : `deploy/web/cobblestone.nginx.conf`

## Commits

- `e2f7e20` fix(deploy): retirer text/html de gzip_types
