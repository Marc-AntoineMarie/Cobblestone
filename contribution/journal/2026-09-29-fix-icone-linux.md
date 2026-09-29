---
date: 2026-09-29
branche: fix/icone-linux
type: correction
version: non publiée
---

# L'icône de l'app s'affiche dans le menu et le dock sous Linux

## Pourquoi

Le menu des applications et le dock de GNOME montraient un engrenage générique : le paquet .deb n'installait l'icône qu'en 1024 px, taille que le thème d'icônes hicolor ne cherche pas.

## Ajouté

- `apps/desktop/build/icons/` : l'icône en 16, 24, 32, 48, 64, 128, 256 et 512 px.
- Icône de fenêtre (`dist/icon.png`, copiée au build et en développement) pour les bureaux qui la lisent sur la fenêtre (X11).

## Modifié

- `electron-builder.yml` : l'icône Linux vient du dossier `build/icons`.

## Supprimé

Rien.

## Tests

- Vérifié dans le paquet construit : `dpkg -c` liste l'icône dans chaque taille de `/usr/share/icons/hicolor`.

## Fichiers

- ajouté : `apps/desktop/build/icons/128x128.png`
- ajouté : `apps/desktop/build/icons/16x16.png`
- ajouté : `apps/desktop/build/icons/24x24.png`
- ajouté : `apps/desktop/build/icons/256x256.png`
- ajouté : `apps/desktop/build/icons/32x32.png`
- ajouté : `apps/desktop/build/icons/48x48.png`
- ajouté : `apps/desktop/build/icons/512x512.png`
- ajouté : `apps/desktop/build/icons/64x64.png`
- modifié : `apps/desktop/electron-builder.yml`
- modifié : `apps/desktop/scripts/build.mjs`
- modifié : `apps/desktop/scripts/dev.mjs`
- modifié : `apps/desktop/src/main/index.ts`

## Commits

- `fc75657` fix(bureau): l'icône de l'app s'affiche dans le menu et le dock sous Linux
