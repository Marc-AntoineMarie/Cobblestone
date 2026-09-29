---
date: 2026-09-29
branche: docs/recette-coffres
type: documentation
version: non publiée
---

# Recette complétée, plan de distribution et étape téléphones

## Pourquoi

Documenter les changements de la journée et répondre aux questions de l'utilisateur sur les téléphones et la distribution.

## Ajouté

- 37 vérifications dans `docs/RECETTE.md`, en fin de section pour garder les numéros déjà renseignés (coffres déplacés, gestionnaire de fichiers, taille et largeur du texte, icône, erreurs lisibles).
- `docs/DISTRIBUTION.md` : publication, canaux par plateforme (GitHub, Flathub, winget, Microsoft Store, Homebrew, Google Play, F-Droid, App Store), coûts, décisions à prendre.
- Étape « Phones » dans `docs/ROADMAP.md` : application web installable, puis applications natives avec Capacitor.

## Modifié

- Lignes 2.20, 12.12 et 24.5 de la recette, pour décrire le nouveau comportement.
- README : coffres retrouvés, gestionnaire de fichiers, taille du texte, dossier docs.

## Supprimé

- La mention « Mobile apps » de l'étape « Beyond Obsidian », remplacée par l'étape dédiée.

## Tests

- `npm run check` vérifie le format de la recette (551 lignes).

## Fichiers

- modifié : `README.md`
- ajouté : `docs/DISTRIBUTION.md`
- modifié : `docs/RECETTE.md`
- modifié : `docs/ROADMAP.md`

## Commits

- `953da02` docs(recette): 37 vérifications de plus pour les coffres déplacés, l'affichage et le gestionnaire de fichiers
- `7ea0835` docs: le README mentionne les coffres retrouvés, le gestionnaire de fichiers et la taille du texte
- `c6d51d4` docs: plan de distribution par plateforme et étape téléphones
