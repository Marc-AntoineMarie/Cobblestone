---
date: 2026-11-18
branche: fix/synchro-double-noeud
type: correction
version: non publiée
---

# Texte en double, curseurs disparus : un seul nœud par coffre, un relais qu'on ne coupe plus

## Pourquoi

Signalé à l'usage : les curseurs des autres appareils ne s'affichaient plus, du texte arrivait en
double sur un appareil et pas sur l'autre, une suppression repartait puis revenait en double, et le
temps réel « avait beaucoup de mal ». Deux causes, toutes deux hors de l'éditeur.

**Deux nœuds sur le coffre ouvert.** `BackgroundSyncManager.start()` monte un nœud par coffre connu
pendant que l'app démarre ; la session du coffre ouvert appelle `release()` pour lui reprendre le
sien. Les deux courses se croisaient : quand `release()` passait avant que la boucle d'arrière-plan
n'ait fini de monter ce coffre-là, le nœud d'arrière-plan s'ajoutait quand même **après**. Deux
`VaultSync`, deux documents, les mêmes fichiers : chacun relisait dans le fichier ce que l'autre
venait d'y écrire et l'envoyait comme sa propre modification — le texte arrivait donc deux fois sur
les autres appareils. Et comme les deux nœuds partagent l'identité de l'appareil, l'appareil d'en
face ne garde qu'une session des deux : souvent celle de l'arrière-plan, celle que la note ouverte
n'écoute pas, d'où les curseurs absents et les modifications qui n'arrivaient plus dans la note.

**Le réveil du relais coupait des sockets vivants.** Le battement du relais est un ping de protocole
WebSocket : un navigateur y répond tout seul et le code ne le voit jamais. `lastHeard` ne bougeait
donc qu'avec du trafic utile, et `wake()` — appelé à chaque retour sur l'app — coupait tout socket
silencieux depuis plus d'une minute. Un coffre tranquille perdait ainsi ses sessions à chaque fois
que la fenêtre revenait au premier plan : curseurs perdus, poignée de main à refaire, état complet
réexpédié, et un dépôt chiffré de tout le coffre envoyé au relais au passage.

## Ajouté

- `packages/app/src/sync.test.ts` : la synchronisation d'arrière-plan laisse son coffre à la session
  ouverte, même repris pendant qu'elle démarre.
- `packages/app/src/editor/live-sync.test.ts` : deux appareils montés comme dans l'app (éditeur lié
  au texte partagé, enregistrement du fichier après la frappe) qui écrivent chacun leur tour, en
  même temps, lettre par lettre, et à travers un lien coupé puis revenu.
- Protocole du relais : `ping` du client, `pong` du relais, et un `ping` en texte dans le battement
  des 30 s (le ping de protocole n'atteint pas le code d'un navigateur).

## Modifié

- `BackgroundSyncManager` : `release()` retient le coffre comme pris ; la boucle de démarrage le
  saute, et un nœud monté entre-temps est arrêté au lieu d'être gardé.
- `RelayNetwork.wake()` : demande d'abord au relais de réintroduire les appareils ; au-delà d'une
  minute de silence, envoie un `ping` et ne coupe que si rien ne répond en cinq secondes. Un socket
  qui répond garde ses liens.
- `wakeOnReturn()` ne s'installe que s'il y a un document (hors navigateur, rien à écouter).
- Recette 31.16 : le curseur de l'autre appareil, que la ligne promet, est enfin vérifié.
- Guide : [docs/guide/sync.md](../../docs/guide/sync.md) (un nœud par coffre, réveil du relais) et
  [docs/guide/accounts-and-relay.md](../../docs/guide/accounts-and-relay.md) (protocole `ping`/`pong`).

## Supprimé

Rien.

## Tests

- `npm run check` : 257 tests unitaires, dont les deux nouveaux fichiers et les deux cas de réveil
  du relais (socket qui répond : gardé ; socket devenu sourd : refait).
- Recette 31 (synchronisation) et 9 (éditeur), bureau et web.
- Vérifié qu'ôter le correctif fait échouer le test de l'arrière-plan.

## À déployer

Le relais doit être redéployé pour répondre `pong` : sans cela, un appareil resté silencieux plus
d'une minute se reconnecte une fois à chaque retour (comme aujourd'hui), sans rien casser.

## Fichiers

- modifié : `apps/relay/src/relay.test.ts`
- modifié : `apps/relay/src/relay.ts`
- modifié : `docs/guide/accounts-and-relay.md`
- modifié : `docs/guide/sync.md`
- ajouté : `packages/app/src/editor/live-sync.test.ts`
- ajouté : `packages/app/src/sync.test.ts`
- modifié : `packages/app/src/sync.ts`
- modifié : `packages/sync/src/relay.ts`
- modifié : `tests/recette/31-synchronisation.spec.ts`

## Commits

- `f346e47` fix(synchro): un seul nœud de synchronisation par coffre
- `9c1958c` fix(synchro): ne couper un socket de relais que s'il ne répond plus
- `8f3c839` test(synchro): le curseur de l'autre appareil et l'écriture à deux avec le fichier
- `eac5c94` docs(guide): un nœud par coffre, et le réveil du relais qui ne coupe plus
