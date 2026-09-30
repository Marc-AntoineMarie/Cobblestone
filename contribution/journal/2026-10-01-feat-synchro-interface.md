---
date: 2026-10-01
branche: feat/synchro-interface
type: nouveauté
version: non publiée
---

# La synchronisation dans l'app : ajouter un appareil, recevoir un coffre

## Pourquoi

Dernière étape pour que la synchronisation serve vraiment : l'interface, d'après la maquette validée
par l'utilisateur, et l'épreuve de deux apps réelles qui s'appairent et échangent.

## Ajouté

- Réglages › Synchronisation : la première fois, l'explication, « Ajouter un appareil », les trois
  étapes et le nom de cet appareil ; ensuite l'état (à jour, hors ligne, réception, en pause, retiré),
  les appareils (renommer celui-ci, retirer un autre après confirmation), les notes à vérifier, la pause.
- Fenêtre « Ajouter un appareil » : le code (valable 5 min, à copier), l'accord de l'appareil qui l'a
  saisi, puis la copie ; en cas d'échec, la raison et « Nouveau code ».
- « Recevoir un coffre » à l'accueil (bureau) : code et nom de l'appareil, attente de l'accord, puis
  un nouveau dossier ou un dossier qui a déjà une copie (fusion sans doublon) ; le coffre s'ouvre et se
  remplit.
- Barre d'état : l'état de la synchro, les notes à vérifier ; un clic montre les appareils, la pause et
  les réglages. Commande de la palette « Ajouter un appareil pour synchroniser ce coffre ».
- `SyncController` : identité de l'appareil et coffres synchronisés gardés dans le stockage de
  l'appareil, jamais dans le coffre ; appareils connus retenus pour se retrouver si
  `.cobblestone/sync` est perdu.
- Un appareil retiré est refusé avec ce motif et l'affiche ; ses messages sont ignorés dès le retrait.
- Web : un message dit que la synchronisation arrive ; pas de « Recevoir un coffre ».

## Modifié

- L'état de synchro s'enregistre aussi à la fermeture de la fenêtre, en un seul appel.
- Après un code faux, la recherche d'un autre appareil ne dure plus que 3 s (au lieu de 30).
- `DESIGN.md`, `docs/ARCHITECTURE.md`, `contribution/IDEES.md` (options de la maquette restant à faire).

## Supprimé

- La déduction « refusé par tous les autres, donc retiré », qui se trompait quand un appareil avait
  perdu son état : remplacée par le motif de refus explicite.

## Tests

- Corrections avec leur test : le lien réseau donnait son étiquette à la fenêtre (`lan.test.ts`,
  échoue sans la correction) ; les vues rataient les fichiers arrivés pendant leur premier affichage
  (recette 31.3) ; un appareil retiré pouvait encore envoyer pendant la coupure (`node.test.ts`,
  échoue sans la correction).
- `node.test.ts` : appareil qui a perdu son état retrouvant les autres (les deux versions gardées).
- Recette 31 (15 lignes, 13 automatiques sur deux apps de bureau réelles, 1 sur le web, 1 manuelle :
  deux ordinateurs sur un Wi-Fi). Passée : section 31, bureau et web.
- Pas de captures d'écran relues, par économie : à faire à la prochaine revue visuelle.

## Fichiers

- modifié : `DESIGN.md`
- modifié : `apps/desktop/src/main/lan.test.ts`
- modifié : `apps/desktop/src/main/lan.ts`
- modifié : `apps/desktop/src/renderer/network.ts`
- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `docs/RECETTE.md`
- modifié : `packages/app/src/i18n.ts`
- modifié : `packages/app/src/session.ts`
- modifié : `packages/app/src/styles/index.css`
- ajouté : `packages/app/src/styles/sync.css`
- ajouté : `packages/app/src/sync.ts`
- modifié : `packages/app/src/ui/Bars.tsx`
- modifié : `packages/app/src/ui/Launcher.tsx`
- ajouté : `packages/app/src/ui/PairingDialog.tsx`
- ajouté : `packages/app/src/ui/ReceiveVault.tsx`
- modifié : `packages/app/src/ui/SettingsView.tsx`
- ajouté : `packages/app/src/ui/SyncSettings.tsx`
- ajouté : `packages/app/src/ui/SyncStatus.tsx`
- modifié : `packages/app/src/ui/Workbench.tsx`
- modifié : `packages/app/src/ui/app-commands.ts`
- modifié : `packages/app/src/ui/hooks.ts`
- modifié : `packages/sync/src/channel.ts`
- modifié : `packages/sync/src/node.test.ts`
- modifié : `packages/sync/src/node.ts`
- modifié : `packages/sync/src/session.ts`
- modifié : `packages/sync/src/vault-sync.ts`
- ajouté : `tests/recette/31-synchronisation.spec.ts`
- modifié : `tests/recette/lib/cobble.ts`
- ajouté : `tests/recette/lib/sync.ts`

## Commits

- `1ebddfa` fix(bureau): le lien réseau garde son étiquette pour lui
- `797b29c` feat(synchro): un appareil retiré le sait, un appareil qui a perdu son état retrouve les autres
- `8ae019f` fix(interface): les vues voient les fichiers arrivés pendant leur premier affichage
- `e8cab9d` feat(synchro): la synchro du coffre ouvert dans l'app
- `07a5f16` feat(synchro): Réglages › Synchronisation, ajout d'un appareil et état dans la barre d'état
- `984661f` test(recette): la synchronisation entre deux apps de bureau
- `3258f8e` docs(synchro): l'interface dans le design, l'architecture et la suite
