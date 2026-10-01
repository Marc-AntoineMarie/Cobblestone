---
date: 2026-10-01
branche: fix/relais-env-exemple
type: correction
version: non publiée
---

# Le modèle de configuration du relais est publié

## Pourquoi

Sur le VPS, `cp .env.example .env` échouait : la règle `.env.*` du `.gitignore` écartait le fichier.

## Ajouté

Rien.

## Modifié

- `.gitignore` : exception pour `deploy/relay/.env.example`, désormais dans le dépôt.

## Supprimé

Rien.

## Tests

- `git ls-files` liste le fichier.

## Fichiers

- modifié : `.gitignore`
- ajouté : `deploy/relay/.env.example`

## Commits

- `0e65454` fix(relais): publier .env.example, que le .gitignore écartait
