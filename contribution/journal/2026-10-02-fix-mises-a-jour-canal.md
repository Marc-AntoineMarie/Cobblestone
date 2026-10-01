---
date: 2026-10-02
branche: fix/mises-a-jour-canal
type: correction
version: non publiée
---

# Les versions de test se proposent de nouveau

## Pourquoi

Signalé par l'utilisateur : l'app ne proposait plus de mise à jour. Les versions de test depuis la
0.1.0-main.6 n'avaient pas de fichier de mise à jour.

## Ajouté

Rien.

## Modifié

- La CI publie aussi `main*.yml` : pour une version « -main.N », electron-builder nomme ainsi le
  fichier que l'app interroge.

## Supprimé

Rien.

## Tests

- Build local avec une version 0.1.0-main.99 : il produit `main-linux.yml`, désormais publié.

## Fichiers

- modifié : `.github/workflows/main-builds.yml`

## Commits

- `8085290` fix(versions): publier aussi main.yml, le fichier de mise à jour des versions de test
