---
date: 2026-09-29
branche: fix/erreurs-lisibles
type: correction
version: non publiée
---

# Des phrases claires à la place des messages techniques

## Pourquoi

Test de recette 2.20 en KO : un coffre renommé affichait « Impossible d'ouvrir ce coffre : Error invoking remote method 'vaults:open': Error: ENOENT… ». Les erreurs système arrivaient brutes à l'écran. Les erreurs du choix ou de la création d'un dossier restaient invisibles, et le chemin des coffres récents s'affichait à l'envers (« home/zera/Notes/ »).

## Ajouté

- `packages/app/src/errors.ts` : `describeError` transforme une erreur en phrase courte (fichier introuvable, accès refusé, disque plein, lecture seule, fichier utilisé, nom trop long) et lit les codes nommés que le processus principal envoie (`cobblestone:<code>`).
- Codes `vault-missing` (le dossier du coffre n'est plus là) et `app-data-folder` (le dossier des réglages de l'app choisi comme coffre, refusé : réinitialiser l'app aurait effacé les notes).
- Textes anglais et français de ces erreurs, et « Impossible de créer le coffre : … ».

## Modifié

- L'accueil, les notifications d'erreur et l'ouverture des coffres utilisent `describeError`.
- L'accueil affiche les échecs de « Ouvrir un dossier » et de « Nouveau coffre ».
- Le chemin des coffres récents garde sa barre oblique au début (marques de sens d'écriture autour du chemin, coupé par la gauche).

## Supprimé

Rien.

## Tests

- Unitaires : `errors.test.ts` (codes système, codes de l'app, erreurs du navigateur, message sans l'enveloppe IPC).

## Fichiers

- modifié : `apps/desktop/src/main/index.ts`
- ajouté : `packages/app/src/errors.test.ts`
- ajouté : `packages/app/src/errors.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/ui/App.tsx`
- modifié : `packages/app/src/ui/Launcher.tsx`

## Commits

- `de87d2c` fix(interface): des phrases claires à la place des messages techniques
- `ebc6616` fix(accueil): les échecs d'ouverture ou de création de dossier s'affichent
- `7d0d8c3` fix(accueil): le chemin des coffres récents garde sa barre oblique au début
