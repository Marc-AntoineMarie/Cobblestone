# Contribuer à Cobblestone

Ce dossier rassemble la façon de travailler sur Cobblestone : les règles, le journal de chaque
changement et la liste des idées à faire.

| Fichier                  | Ce qu'il contient                                                                |
| ------------------------ | -------------------------------------------------------------------------------- |
| [REGLES.md](REGLES.md)   | La méthode : branches, commits, code, design, vérifications, journal, versions.  |
| [JOURNAL.md](JOURNAL.md) | Le sommaire du journal : un changement par ligne, du plus récent au plus ancien. |
| [journal/](journal/)     | Une fiche par changement : pourquoi, ajouté, modifié, supprimé, tests, fichiers. |
| [IDEES.md](IDEES.md)     | Tout ce qui reste à faire ou à décider, du plus prioritaire au plus lointain.    |

## Le parcours d'un changement

1. **Idée** : elle est notée dans [IDEES.md](IDEES.md).
2. **Branche** : `git switch -c feat/mon-sujet` depuis `main`.
3. **Code** : petits commits `type(portée): message` en français, chacun avec ses tests.
4. **Vérifications** : `npm run check`, et `npm run e2e` si un parcours de l'app change.
5. **Recette** : les nouvelles vérifications manuelles vont à la fin de leur section de
   [docs/RECETTE.md](../docs/RECETTE.md).
6. **Journal** : `npm run journal -- new`, compléter la fiche, `npm run journal -- index`.
7. **Fusion** : `git switch main && git merge --no-ff feat/mon-sujet`, puis suppression de la branche.
   L'idée sort d'IDEES.md.
8. **Version** : quand un ensemble de changements est prêt et la recette passée,
   `npm run release X.Y.Z`.

Les droits sur les contributions (licence accordée au mainteneur) sont dans
[CONTRIBUTING.md](../CONTRIBUTING.md#droits-sur-les-contributions).
