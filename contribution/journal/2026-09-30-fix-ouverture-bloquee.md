---
date: 2026-09-30
branche: fix/ouverture-bloquee
type: correction
version: non publiée
---

# Ouverture bloquée : dossiers refusés, progression et Annuler

## Pourquoi

L'utilisateur, en retrouvant un coffre renommé, a validé la fenêtre de choix sur son dossier personnel (elle s'ouvre sur le dossier qui contenait le coffre, et « Sélectionner » sans rien cliquer prend ce dossier). L'app s'est mise à lire tout `/home/zera` et les boutons de l'accueil sont restés désactivés : plus rien ne répondait.

## Ajouté

- `locations.ts` : refuse comme coffre le dossier des réglages de l'app, le dossier personnel, la racine d'un disque, le dossier qui contenait un coffre perdu, et un dossier déjà présent dans la liste sous un autre nom. Chaque refus a sa phrase.
- Progression de l'ouverture sur l'accueil (« 1 200 notes lues sur 5 000 ») et bouton « Annuler ».
- `Vault.load` accepte `signal` (arrêt entre deux lots de notes) et `onProgress`.

## Modifié

- L'ouverture d'une ancienne entrée qui pointe vers un dossier refusé échoue avec l'explication au lieu de figer l'app.
- Au démarrage, un coffre qui tarde à se rouvrir affiche l'accueil avec sa progression et Annuler, au lieu d'une fenêtre vide.

## Supprimé

Rien.

## Tests

- Unitaires : `locations.test.ts`, progression et arrêt dans `vault.test.ts`, nouvelles phrases dans `errors.test.ts`.
- Bout en bout (bureau) : refuse le dossier qui contenait le coffre, refuse le dossier personnel, ouvre le dossier indiqué (fenêtre de choix simulée depuis le processus principal).

## Fichiers

- modifié : `apps/desktop/src/main/index.ts`
- ajouté : `apps/desktop/src/main/locations.test.ts`
- ajouté : `apps/desktop/src/main/locations.ts`
- modifié : `packages/app/src/errors.test.ts`
- modifié : `packages/app/src/errors.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/launcher.css`
- modifié : `packages/app/src/ui/App.tsx`
- modifié : `packages/app/src/ui/Launcher.tsx`
- modifié : `packages/core/src/vault.test.ts`
- modifié : `packages/core/src/vault.ts`
- modifié : `scripts/e2e-desktop.mjs`

## Commits

- `fa495ee` fix(bureau): refuser le dossier personnel, la racine d'un disque et le dossier parent d'un coffre perdu
- `1b06a88` feat(accueil): suivre et annuler l'ouverture d'un coffre
