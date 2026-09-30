---
date: 2026-09-30
branche: feat/synchro-moteur
type: nouveauté
version: non publiée
---

# Le moteur de synchronisation entre appareils

## Pourquoi

La synchronisation directe entre ses propres appareils est le but premier de Cobblestone (troisième
priorité donnée par l'utilisateur, après la recette automatique et la refonte). Cette première étape
écrit le moteur, sans interface ni réseau : ce qui garde un coffre et ses copies d'accord, quoi qu'on y
fasse et sur quelque appareil que ce soit. L'appairage, le chiffrement et le transport viennent
ensuite.

## Ajouté

- Le paquet `@cobblestone/sync` (Yjs, fast-diff), vérifié par `npm run typecheck`.
- `VaultDoc` (`model.ts`) : le coffre en un seul CRDT, une entrée par fichier sous un identifiant
  stable qui survit aux renommages.
  - Une note (et tout fichier texte : `.md`, `.canvas`, `.css`, `.json`…) garde son contenu en texte
    partagé, fusionné caractère par caractère.
  - Une pièce jointe garde l'empreinte SHA-256 et la taille de ses octets ; les octets sont demandés
    par empreinte à un appareil qui les a, et vérifiés à l'arrivée.
  - Une suppression laisse une trace, pour qu'une vieille copie ne ramène pas le fichier.
  - Deux fichiers vivants au même nom (sans tenir compte de la casse) : le plus petit identifiant garde
    le nom, une copie identique est fusionnée (deux appareils partis du même dossier), une copie
    différente devient « Nom (conflit abcd).md ». Chaque appareil tranche de la même façon.
- Le protocole (`protocol.ts`) : `hello` avec le vecteur d'état, `update`, demande et envoi d'une
  pièce jointe ; codage en octets pour tout transport ; `SyncChannel`, l'interface d'un lien vers un
  autre appareil ; `channelPair()`, deux appareils reliés en mémoire.
- `VaultSync` (`vault-sync.ts`), le moteur :
  - Suit le coffre : création, modification (réduite au plus petit changement de texte), renommage
    d'un fichier ou d'un dossier, suppression.
  - Écrit dans les fichiers ce que les autres appareils ont changé, par le coffre, pour que l'app
    l'affiche comme tout autre changement : suppressions (vers la corbeille), puis déplacements (un
    échange de noms passe par un nom libre), puis contenus.
  - Reconnaît l'écho de ses propres écritures, renommages et suppressions, pour ne pas les renvoyer.
  - Garde son état dans `.cobblestone/sync/vault.bin` ; au démarrage, rattrape ce qui a été créé,
    changé ou supprimé pendant que l'app était fermée.
- Dans le coffre (`@cobblestone/core`) : `rename(de, vers, { updateLinks: false })`, un renommage qui
  ne réécrit pas les liens (un renommage reçu arrive avec ses propres corrections de liens, sinon elles
  seraient faites deux fois) ; `modifyBinary`, qui remplace les octets d'une pièce jointe.

## Modifié

- `docs/ARCHITECTURE.md` décrit le moteur à la place du projet ; `contribution/IDEES.md` passe la
  synchronisation « en cours », avec la suite dans l'ordre.

## Supprimé

Rien.

## Tests

- `vault-sync.test.ts`, onze scénarios entre appareils simulés : un nouvel appareil reçoit tout le
  coffre ; modifications dans les deux sens et fusion de modifications faites séparément ; renommage
  suivi une fois, liens compris, sans doublon ; dossier renommé ; deux notes qui échangent leurs noms ;
  suppression envoyée à la corbeille de l'autre ; même nom créé sur deux appareils (les deux notes
  gardées) ; deux copies du même coffre fusionnées sans doublon ; pièces jointes par leurs octets ;
  redémarrage avec fusion de ce que chacun a écrit à part ; suppression faite app fermée.
- `model.test.ts` : nature texte ou octets, nom de conflit, fusion de deux modifications d'un même
  texte, départage des noms en double, empreinte SHA-256.
- `protocol.test.ts` : chaque message revient identique de ses octets ; les deux bouts d'un lien en
  mémoire, jusqu'à sa fermeture.
- `vault.test.ts` : renommage sans toucher aux liens ; remplacement d'une pièce jointe annoncé.
- Pas de recette : rien de visible dans l'app pour l'instant. Les cas viendront avec la page
  Réglages › Synchronisation.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `package-lock.json`
- modifié : `package.json`
- modifié : `packages/core/src/vault.test.ts`
- modifié : `packages/core/src/vault.ts`
- ajouté : `packages/sync/package.json`
- ajouté : `packages/sync/src/index.ts`
- ajouté : `packages/sync/src/model.test.ts`
- ajouté : `packages/sync/src/model.ts`
- ajouté : `packages/sync/src/protocol.test.ts`
- ajouté : `packages/sync/src/protocol.ts`
- ajouté : `packages/sync/src/vault-sync.test.ts`
- ajouté : `packages/sync/src/vault-sync.ts`
- ajouté : `packages/sync/tsconfig.json`

## Commits

- `a6530e7` feat(coffre): renommer sans réécrire les liens et remplacer une pièce jointe
- `da02257` feat(synchro): le coffre en CRDT et les messages entre appareils
- `e66a765` feat(synchro): le moteur qui tient fichiers et CRDT au même pas
- `73abb11` docs(synchro): le moteur dans l'architecture, et la suite
