---
date: 2026-11-18
branche: feat/ecran-redemarrage-maj
type: nouveauté
version: non publiée
---

# Un écran de redémarrage pour la mise à jour, et son statut toujours visible

## Pourquoi

Cliquer sur « Redémarrer pour mettre à jour » fermait l'app sans aucun signal : elle semblait geler
puis planter avant de se relancer. Et sans ce clic, rien n'indiquait que la version en cours était
bien la dernière, ni comment la vérifier.

## Ajouté

- Écran plein écran « Mise à jour en cours » (`UpdateInstalling`), affiché ~900 ms avant que l'app ne
  quitte et s'installe, pour que le gel/relancement qui suit se lise comme prévu.
- Bandeau « Mise à jour effectuée » au relancement suivant, par comparaison avec une version en
  attente mémorisée (`platform.storage`) avant de quitter.
- Pastille de statut de mise à jour (`UpdateStatus`) dans le pied de la liste de notes, sur le modèle
  de la pastille de synchro : vérification, à jour, téléchargement, prête ; son popover propose
  « Vérifier les mises à jour » et, une fois prête, « Redémarrer pour mettre à jour ».

## Modifié

- Process main (`updates.ts`) : un état fermé (`UpdateStatus`) plutôt qu'un simple booléen « prête » ;
  une fonction pure (`nextStatus`) fait évoluer cet état à partir des events `autoUpdater`, testée
  sans vrai `autoUpdater`. Nouvel IPC `updates:check` pour une vérification manuelle.
- Pont IPC (`preload`, `renderer/platform.ts`) et `Platform.updates` (`packages/app`) : `ready/onReady`
  remplacés par `status/onStatus/check`.
- `docs/guide/interface.md` : nouvelle section « Automatic updates (desktop) ». `docs/DISTRIBUTION.md` :
  note « à faire » corrigée (la fonctionnalité existe).

## Supprimé

Rien.

## Tests

- Unitaire : `updates.test.ts`, la fonction `nextStatus` pour chaque event `autoUpdater`.
- `npm run check` (format, types, tests, recette, journal).
- Recette 27.11 reformulée et 27.12 ajoutée, toutes deux `recette.manuel` (il faut une version
  publiée sur GitHub et une app installée) ; `npm run recette -- sync` exécuté.

## Fichiers

- ajouté : `apps/desktop/src/main/updates.test.ts`
- modifié : `apps/desktop/src/main/updates.ts`
- modifié : `apps/desktop/src/preload/index.ts`
- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `docs/DISTRIBUTION.md`
- modifié : `docs/RECETTE.md`
- modifié : `docs/guide/interface.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/index.ts`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/app/src/styles/overlays.css`
- modifié : `packages/app/src/ui/DeskList.tsx`
- ajouté : `packages/app/src/ui/UpdateInstalling.tsx`
- modifié : `packages/app/src/ui/UpdateReady.tsx`
- ajouté : `packages/app/src/ui/UpdateStatus.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- modifié : `tests/recette/27-bureau.spec.ts`

## Commits

- `eeb3a0b` feat(bureau): écran de redémarrage et pastille de statut pour les mises à jour
