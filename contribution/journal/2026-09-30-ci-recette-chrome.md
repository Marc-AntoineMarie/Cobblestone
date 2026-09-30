---
date: 2026-09-30
branche: ci/recette-chrome
type: maintenance
version: non publiée
---

# CI : la recette résiste à un plantage de Chrome

## Pourquoi

Au premier passage de la recette automatique sur GitHub, Chrome a planté (SIGTRAP) pendant les tests web. Le même Chrome servait à tous les tests d'un processus : après le plantage, chacun échouait à son tour (« page, context or browser has been closed »), soit 514 échecs pour un seul incident. En local, la recette passait entièrement.

## Ajouté

- Relance de Chrome : avant chaque test web, un Chrome qui ne répond plus est relancé. Seul le test en cours échoue, et la CI le rejoue une fois.
- CI : la recette tourne sur deux machines en parallèle, une par plateforme (`bureau` à deux tests à la fois, `web` à un seul), chacune avec son état de la recette et ses traces (`recette-bureau`, `recette-web`).

## Modifié

- Chrome est lancé avec `--disable-dev-shm-usage` : il n'utilise plus la mémoire partagée, trop petite sur les machines de CI.
- La machine du web ne construit que l'app web ; celle du bureau construit les deux (le serveur de la recette sert l'app web avant les tests).

## Supprimé

Rien.

## Tests

- Plantage simulé en local (Chrome fermé en plein test) : le test suivant repart sur un Chrome neuf.
- Sections 2 et 26 sur le web, et `npm run check`.
- Le résultat sur GitHub se verra au prochain push.

## Fichiers

- modifié : `.github/workflows/ci.yml`
- modifié : `tests/recette/lib/recette.ts`

## Commits

- `80181e5` ci(e2e): la recette résiste à un plantage de Chrome sur la CI
