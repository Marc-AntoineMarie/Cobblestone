---
date: 2026-11-17
branche: fix/temps-reel
type: correction
version: non publiée
---

# Temps réel : texte en double et lecture en direct

## Pourquoi

Signalé par l'utilisateur après la mise en ligne de la refonte téléphone : les appareils n'apparaissent plus en direct, les modifications arrivent en retard, et parfois une suppression sur un appareil ajoute des caractères ou des espaces sur un autre.

- Texte abîmé : la même note ouverte deux fois sur un appareil (deux onglets, une division ; tous les onglets restent montés) donnait deux éditeurs sur le même texte partagé. La seconde vue ignorait les frappes de la première (« même appareil »), puis les reprenait du fichier à l'enregistrement et les réécrivait dans le texte partagé : chaque frappe y passait deux fois. Reproduit par la recette 31.23, qui échoue sans le correctif.
- Direct perdu : sur téléphone les notes s'ouvrent désormais en lecture, et la lecture ne publiait pas de présence et ne se redessinait qu'après l'écriture du fichier.

## Ajouté

- `VaultSync.change(apply, writer)` : chaque éditeur écrit sous son propre nom, toujours « cet appareil » pour la synchro, mais distinct des autres vues.
- `SyncController` : `sharedText`, `watchText`, `reading`, `devicesOn`, `onPresence` ; type `NotePresence`.
- `NotePresenceList.tsx` : une pastille par autre appareil présent sur la note (point plein : il écrit ; anneau : il lit), dans la barre de note du bureau et la barre du haut du téléphone.
- Recette 31.23 et 31.24 ; tests unitaires dans `vault-sync.test.ts` et `collab.test.ts`.

## Modifié

- `sync.ts` (`liveSource`) : un éditeur n'ignore plus que ses propres changements ; les autres vues et les changements venus des fichiers lui arrivent par le texte partagé.
- `Editor.tsx` : relié au texte partagé, il ne reprend plus rien du fichier (double application, ou retour d'un texte dépassé).
- `vault-sync.ts` : une écriture attendue qui ne revient jamais (le fichier contenait déjà ce texte) expire après 10 s.
- `ReadingView.tsx` : dessine le texte partagé et suit la frappe des autres (au plus toutes les 120 ms) ; publie « lit cette note » quand elle est visible ; cocher une tâche part du texte partagé.
- `DESIGN.md` (présence) ; `IDEES.md` : points de synchro à vérifier, refonte PC, IA et MCP demandés.

## Supprimé

Rien.

## Tests

Unitaires : 237 réussis, dont 3 nouveaux. Recette bureau à deux appareils 31.23 et 31.24 réussies ; 31.23 échoue sur le code d'avant. Le reste de la recette n'a pas été relancé (demande de l'utilisateur) : les sections 9, 12, 23 et 31 sont celles que ce changement touche.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `contribution/IDEES.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/editor/collab.test.ts`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/styles/mobile.css`
- modifié : `packages/app/src/styles/sync.css`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/Editor.tsx`
- modifié : `packages/app/src/ui/MobileWorkbench.tsx`
- ajouté : `packages/app/src/ui/NotePresenceList.tsx`
- modifié : `packages/app/src/ui/NoteView.tsx`
- modifié : `packages/app/src/ui/ReadingView.tsx`
- modifié : `packages/sync/src/vault-sync.test.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `52f0737` fix(sync): distinguer les éditeurs d'un même appareil dans le texte partagé
- `f271e4c` fix(editor): ne plus reprendre du fichier ce que le texte partagé apporte déjà
- `4541800` feat(sync): lecture en direct et appareils présents sur la note
- `07db729` test(recette): deux vues d'une note et lecture en direct (31.23, 31.24)
- `bc3e315` docs: présence sur la note dans DESIGN.md ; refonte PC, IA et MCP dans IDEES.md
