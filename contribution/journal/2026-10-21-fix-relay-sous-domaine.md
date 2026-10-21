---
date: 2026-10-21
branche: fix/relay-sous-domaine
type: correction
version: non publiée
---

# Relay déplacé sur sync.cobblestone.marc-antoinemarie.com

## Pourquoi

Le domaine `cobblestone.marc-antoinemarie.com` est réservé à l'app web (PWA) ; le relay a son propre
sous-domaine `sync.cobblestone.marc-antoinemarie.com` pour que les deux cohabitent proprement sur le
même VPS sans se gêner.

## Ajouté

- `deploy/web/` : Caddyfile et docker-compose.yml pour héberger l'app web statique (PWA) sur le VPS ;
  instructions dans `docs/RELAIS.md`.

## Modifié

- `DEFAULT_RELAY` : `sync.cobblestone.marc-antoinemarie.com` (était `cobblestone.marc-antoinemarie.com`).
- `docs/RELAIS.md` : titre et section « App web » ajoutée.
- `contribution/IDEES.md` : nouvelle adresse du relais officiel.

## Supprimé

Rien.

## Tests

Aucun test automatique touché ; la vérification (`npm run check`) passe.

## Fichiers

- modifié : `contribution/IDEES.md`
- ajouté : `deploy/web/Caddyfile`
- ajouté : `deploy/web/docker-compose.yml`
- modifié : `docs/RELAIS.md`
- modifié : `packages/app/src/sync.ts`

## Commits

À venir.
