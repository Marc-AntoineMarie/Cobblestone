---
date: 2026-09-30
branche: feat/synchro-chiffrement
type: nouveauté
version: non publiée
---

# Le chiffrement de bout en bout et l'appairage par code

## Pourquoi

Deuxième étape de la synchronisation, après le moteur : avant que deux appareils ne se parlent par le
réseau, il faut qu'ils se reconnaissent et que personne d'autre ne puisse lire ce qui passe. La
maquette de l'interface (Réglages › Synchronisation, ajout d'un appareil par un code) a été validée par
l'utilisateur ; cette branche écrit ce qu'il y a dessous, sans interface ni réseau.

## Ajouté

- `identity.ts` : chaque appareil a une paire de clés X25519 ; son identifiant est tiré de sa clé
  publique (un appareil ne peut pas se faire passer pour un autre). La clé secrète reste dans le
  stockage de l'appareil, jamais dans le coffre : un dossier de coffre copié ne contient aucun secret.
- Dans le CRDT du coffre : la liste de ses appareils (nom, type, clé publique) et son identifiant de
  synchronisation. Un appareil retiré reste listé, pour qu'il soit refusé.
- `session.ts` : deux appareils appairés ouvrent une session par un accord de clés à trois échanges
  (3DH, comme X3DH de Signal) : chacun prouve qu'il détient sa clé avant que rien ne passe ; une
  session enregistrée reste illisible même si la clé d'un appareil fuit plus tard. Refus motivés :
  appareil inconnu ou retiré, autre coffre, preuve fausse.
- `channel.ts` : l'interface `ByteChannel` (un transport ne fait que passer des octets), et le canal
  chiffré : AES-256-GCM, une clé par sens, un compteur comme nonce (un message rejoué, perdu ou
  déplacé ferme le lien). `SyncRefusal` porte le motif d'un refus, pour le traduire en phrase.
- `pairing.ts` : l'appairage par un code de neuf caractères (45 bits), sans lettres qui ressemblent à
  des chiffres ; la saisie tolère minuscules, espaces, tirets, O pour 0, I et L pour 1. Le code ne
  circule jamais : les deux appareils mènent un échange CPace (échange de clé authentifié par mot de
  passe, sur ristretto255). Un espion n'en apprend rien ; un faux appareil n'a droit qu'à un essai, et
  l'utilisateur n'est sollicité qu'une fois le code prouvé. Il accepte ou refuse l'appareil ; accepté,
  le coffre passe aussitôt par le même lien chiffré.
- Dépendances `@noble/curves` et `@noble/hashes` (auditées, sans code natif, licence MIT).

## Modifié

- `docs/ARCHITECTURE.md` décrit les appareils, les sessions et l'appairage.
- `contribution/IDEES.md` : la suite dans l'ordre (réseau local, interface, écriture en temps réel
  comme dans Google Docs, demandée par l'utilisateur, puis Internet), et la limite du retrait d'un
  appareil (il garde ce qu'il a déjà reçu).

## Supprimé

Rien.

## Tests

- `pairing.test.ts` : forme des codes et lecture de la saisie ; appairage réussi puis messages dans
  les deux sens ; code faux refusé des deux côtés sans solliciter l'utilisateur ; appareil refusé par
  l'utilisateur ; rien du code, des noms, du coffre ni des notes n'apparaît dans les octets échangés ;
  un message altéré en route arrête l'appairage.
- `session.test.ts` : session entre appareils appairés, messages dans les deux sens ; appareil jamais
  appairé refusé ; appareil qui montre la clé d'un autre sans son secret refusé ; autre coffre refusé ;
  rien de lisible dans les octets enregistrés, et un message rejoué ferme le lien.
- `model.test.ts` : liste des appareils (ajout, renommage, retrait, confiance) et identifiant de
  synchronisation posé une seule fois.
- Pas de recette : rien de visible dans l'app pour l'instant.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/ARCHITECTURE.md`
- modifié : `package-lock.json`
- modifié : `packages/sync/package.json`
- ajouté : `packages/sync/src/channel.ts`
- ajouté : `packages/sync/src/crypto.ts`
- ajouté : `packages/sync/src/identity.ts`
- modifié : `packages/sync/src/index.ts`
- modifié : `packages/sync/src/model.test.ts`
- modifié : `packages/sync/src/model.ts`
- ajouté : `packages/sync/src/pairing.test.ts`
- ajouté : `packages/sync/src/pairing.ts`
- ajouté : `packages/sync/src/session.test.ts`
- ajouté : `packages/sync/src/session.ts`
- ajouté : `packages/sync/src/wire.test-helpers.ts`

## Commits

- `9b24705` feat(synchro): des liens chiffrés entre appareils appairés
- `e647a68` feat(synchro): l'appairage par un code à saisir
- `f00f1ca` docs(synchro): le chiffrement dans l'architecture, et la suite avec l'écriture en temps réel
