---
date: 2026-09-30
branche: docs/dossier-contribution
type: documentation
version: non publiée
---

# Le dossier contribution : règles, journal et idées

## Pourquoi

Demande de l'utilisateur le 30 septembre : un dossier de contribution avec des règles et des méthodes, où **chaque changement est inscrit et détaillé** (ajouts, suppressions…), et un fichier qui garde les idées pas encore réalisées, comme la partie téléphone. Il demande aussi d'arrêter les compétences (skills) pour le design et de passer par Claude Design.

## Ajouté

- `contribution/README.md` : à quoi sert le dossier et le parcours d'un changement, de l'idée à la version.
- `contribution/REGLES.md` : la méthode complète (avant de coder, branches, commits, code, interface et design, vérifications, journal, idées, liste avant fusion, versions et publication), reprise de CONTRIBUTING.md et complétée.
- `contribution/IDEES.md` : synchronisation entre appareils, refonte personnalisable, recette automatisée, téléphone, distribution, logo, parité Obsidian, au-delà, organisations, petites améliorations repérées.
- `contribution/journal/` : le modèle de fiche, une fiche qui résume les 71 commits d'avant le journal, et une fiche par branche fusionnée depuis.
- `contribution/JOURNAL.md` : le sommaire, généré.
- `scripts/journal.mjs` et `npm run journal` : `new` prépare la fiche de la branche (date, fichiers, commits), `index` régénère le sommaire, sans argument il vérifie les fiches, le sommaire et qu'aucune branche fusionnée n'est sans fiche.
- Recette 2.38 à 2.42 : dossiers refusés et ouverture annulable.

## Modifié

- `npm run check` vérifie aussi le journal.
- CONTRIBUTING.md résume la méthode et renvoie vers `contribution/` ; il garde la clause de droits.
- Le modèle de pull request demande les lignes de recette et la fiche du journal.
- CLAUDE.md : journal et idées obligatoires ; maquettes dans Claude Design au lieu de la compétence Impeccable ; la page de recette n'est plus republiée.
- Liens de README.md, CHANGELOG.md et docs/DISTRIBUTION.md vers le nouveau dossier.

## Supprimé

- Les sections 1 à 6 de CONTRIBUTING.md (avant de coder, commits, vérifications, branches, versions, publication), déplacées dans `contribution/REGLES.md`.

## Tests

- `npm run journal` repère une fiche retirée (branche fusionnée sans fiche) et un sommaire pas à jour.
- `npm run check` passe : 122 tests unitaires, 556 lignes de recette, 10 fiches.

## Fichiers

- modifié : `.github/pull_request_template.md`
- modifié : `CHANGELOG.md`
- modifié : `CLAUDE.md`
- modifié : `CONTRIBUTING.md`
- modifié : `README.md`
- ajouté : `contribution/IDEES.md`
- ajouté : `contribution/JOURNAL.md`
- ajouté : `contribution/README.md`
- ajouté : `contribution/REGLES.md`
- ajouté : `contribution/journal/2026-09-29-0-avant-le-journal.md`
- ajouté : `contribution/journal/2026-09-29-docs-recette-coffres.md`
- ajouté : `contribution/journal/2026-09-29-feat-afficher-dans-dossier.md`
- ajouté : `contribution/journal/2026-09-29-feat-coffre-deplace.md`
- ajouté : `contribution/journal/2026-09-29-feat-largeur-texte.md`
- ajouté : `contribution/journal/2026-09-29-fix-erreurs-lisibles.md`
- ajouté : `contribution/journal/2026-09-29-fix-icone-linux.md`
- ajouté : `contribution/journal/2026-09-29-fix-stockage-bureau.md`
- ajouté : `contribution/journal/2026-09-30-fix-ouverture-bloquee.md`
- ajouté : `contribution/journal/_modele.md`
- modifié : `docs/DISTRIBUTION.md`
- modifié : `docs/RECETTE.md`
- modifié : `package.json`
- ajouté : `scripts/journal.mjs`

## Commits

- `8ef97f4` build(journal): script qui prépare, vérifie et résume les fiches du journal
- `0cc120a` docs(journal): une fiche pour chaque changement depuis le 29 septembre
- `1eae92b` build: npm run check vérifie aussi le journal
- `6c3afc5` docs(contribution): règles, idées et parcours d'un changement
- `9221c58` docs: CLAUDE.md impose le journal et les maquettes Claude Design
- `dd8eff9` docs(recette): dossiers refusés et ouverture annulable
