---
date: 2026-09-30
branche: feat/synchro-reseau-local
type: nouveauté
version: non publiée
---

# Les apps de bureau se trouvent et se relient sur le réseau local

## Pourquoi

Troisième étape de la synchronisation : le moteur et le chiffrement existent, il faut que deux appareils
se trouvent et se parlent. Le plan validé commence par le réseau local entre deux apps de bureau, sans
aucun serveur ; Internet et l'app web viendront avec WebRTC.

## Ajouté

- `SyncNode` (`packages/sync/src/node.ts`) : la part d'un appareil dans la synchro d'un coffre.
  - Annonce le coffre sur le réseau sous une étiquette tirée de son identifiant (qui n'en révèle
    rien), ouvre une session chiffrée avec chaque appareil trouvé ou qui l'appelle.
  - Une seule session par appareil : si deux se croisent, les deux côtés gardent la même.
  - Pause et reprise : pendant la pause, les modifications restent sur l'appareil.
  - Retrait d'un appareil : sa session est coupée un instant plus tard (pour qu'il l'apprenne), il est
    refusé ensuite ; un appareil refusé par tous les autres se sait retiré.
  - Appairage : `startPairing` montre un code valable cinq minutes et trois essais ; un appareil
    refusé par l'utilisateur y met fin. `receiveVault`, de l'autre côté, essaie chaque appareil qui
    propose un appairage jusqu'à celui qui a le même code, puis attend l'accord de son utilisateur.
- L'interface `Network` (annoncer, trouver, se connecter, recevoir) et `MemoryNetworkHub`, un réseau
  simulé en mémoire pour les tests.
- Le réseau local de l'app de bureau (`apps/desktop/src/main/lan.ts`) : annonces par multidiffusion
  UDP (identifiant de l'appareil, étiquettes attendues, port), liens TCP découpés en messages dont le
  premier nomme l'étiquette. Protections : étiquette inconnue, présentation trop lente (10 s), message
  de plus de 256 Mo ou plus de 64 liens ouverts : refusé.
- Le prêt du réseau aux fenêtres (`lan-ipc.ts`) : une fenêtre n'atteint que ses propres liens et ne se
  connecte qu'aux adresses annoncées ; ses liens se ferment avec elle. `DesktopNetwork` côté fenêtre, et
  `Platform.syncNetwork` pour l'app (bureau seulement pour l'instant).

## Modifié

- `VaultSync.change()` modifie le CRDT au nom de l'appareil (liste des appareils) ; l'appairage
  prévient quand le code est prouvé (`onProven`), avant l'accord de l'autre utilisateur.
- `docs/ARCHITECTURE.md` et `contribution/IDEES.md` : le réseau local fait, la suite (interface,
  écriture en temps réel, Internet).

## Supprimé

Rien.

## Tests

- `node.test.ts` : appairage par code puis coffre reçu ; modifications gardées pendant une pause puis
  envoyées à la reprise ; appareils retrouvés seuls après un redémarrage ; un troisième appareil admis
  par n'importe quel autre, puis retiré et mis dehors ; appairage fini après trois codes faux ou un refus.
- `lan.test.ts` : messages petits et gros (5 Mo) dans les deux sens ; lien pour une étiquette inconnue et
  message trop gros refusés ; appareils trouvés par multidiffusion (sauté sur la CI, qui peut en manquer).
- `network.test.ts` (fenêtre) : messages arrivés avant que la fenêtre connaisse leur lien ; liens
  entrants ; écoute comptée par étiquette.
- Recette 27 (bureau) repassée : le processus principal démarre comme avant. Pas de nouvelle ligne :
  rien de visible pour l'instant, les cas viendront avec l'interface.

## Fichiers

- modifié : `apps/desktop/package.json`
- modifié : `apps/desktop/src/main/index.ts`
- ajouté : `apps/desktop/src/main/lan-ipc.ts`
- ajouté : `apps/desktop/src/main/lan.test.ts`
- ajouté : `apps/desktop/src/main/lan.ts`
- modifié : `apps/desktop/src/preload/index.ts`
- ajouté : `apps/desktop/src/renderer/network.test.ts`
- ajouté : `apps/desktop/src/renderer/network.ts`
- modifié : `apps/desktop/src/renderer/platform.ts`
- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `package-lock.json`
- modifié : `packages/app/package.json`
- modifié : `packages/app/src/platform.ts`
- modifié : `packages/sync/src/index.ts`
- ajouté : `packages/sync/src/network.ts`
- ajouté : `packages/sync/src/node.test.ts`
- ajouté : `packages/sync/src/node.ts`
- modifié : `packages/sync/src/pairing.ts`
- modifié : `packages/sync/src/vault-sync.ts`

## Commits

- `99a0439` feat(synchro): chaque appareil trouve les autres et s'y relie
- `cb94dd7` feat(bureau): le réseau local, sans serveur
- `2a41083` feat(bureau): les fenêtres atteignent le réseau local
- `8365350` docs(synchro): le réseau local dans l'architecture
