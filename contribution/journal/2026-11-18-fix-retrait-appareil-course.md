---
date: 2026-11-18
branche: fix/retrait-appareil-course
type: correction
version: non publiée
---

# Retrait d'un appareil : vérifié sans course, limite documentée

## Pourquoi

La CI (« Version de test ») a échoué sur `packages/sync/src/node.test.ts:172` : l'appareil A gardait
« début, écrit par C après son retrait » au lieu de « début », alors que le workflow CI passait sur
le même commit. Le test était instable : il retirait C puis faisait écrire C aussitôt, en attendant
que ni A ni B ne prennent la modification. Or le retrait voyage de A vers B en même temps que la
modification de C vers B, et rien ne met ces deux événements dans un ordre commun : B peut prendre
la modification avant d'apprendre le retrait, puis la repasser à A. Ce n'est pas un défaut du moteur
mais une limite d'une synchronisation sans autorité d'ordre ; le test promettait plus que le code ne
peut tenir, et la limite n'était écrite nulle part.

## Ajouté

Rien.

## Modifié

- `packages/sync/src/node.test.ts` : le test attend que B ait reçu le retrait (`settle(a, b)`, puis
  une vérification explicite de `devices()`) avant que C écrive. Le filtre des messages d'un
  appareil retiré est alors vérifié sans course, comme les sessions coupées et le refus d'une
  nouvelle session.
- `docs/guide/sync.md` : ce qu'un appareil retiré subit dès que le document partagé le dit (messages
  ignorés, session coupée 300 ms plus tard, nouvelle session refusée).
- `docs/guide/security.md` : nouvelle limite connue — un retrait ne vaut que pour les appareils qui
  l'ont reçu.
- `contribution/IDEES.md` : la même limite dans la section Synchronisation, avec la piste d'un bail
  de participation à renouveler pour borner la fenêtre.

## Supprimé

Rien.

## Tests

- `npm run check` : formatage, types, 249 tests unitaires, recette et journal.
- `packages/sync/src/node.test.ts` relancé en boucle, sous charge CPU et avec `CI=true` : stable.
- Pas de ligne de recette : aucun comportement visible dans l'app ne change.

## Fichiers

- modifié : `contribution/IDEES.md`
- modifié : `docs/guide/security.md`
- modifié : `docs/guide/sync.md`
- modifié : `packages/sync/src/node.test.ts`

## Commits

- `7b8f2fc` test(synchro): vérifier le refus d'un appareil retiré sans course
- `6ea7acd` docs(guide): un retrait ne vaut que pour les appareils qui l'ont reçu
