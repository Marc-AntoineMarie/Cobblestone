# Journal des changements

Chaque changement fusionné dans `main` a sa fiche dans [journal/](journal/) : pourquoi, ce qui a été
ajouté, modifié et supprimé, les tests, les fichiers et les commits. Ce sommaire est régénéré par
`npm run journal -- index` ; `npm run check` vérifie qu’il est à jour et qu’aucune fusion ne manque.

| Date       | Changement                                                                                                                     | Type          | Branche                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------- |
| 2026-10-02 | [La vraie version, des mises à jour d'un coup, et l'e-mail qui ne part pas](journal/2026-10-02-fix-version-et-mises-a-jour.md) | correction    | `fix/version-et-mises-a-jour` |
| 2026-10-01 | [Le modèle de configuration du relais est publié](journal/2026-10-01-fix-relais-env-exemple.md)                                | correction    | `fix/relais-env-exemple`      |
| 2026-10-01 | [Les appareils d'un compte se trouvent, avec ton accord](journal/2026-10-01-feat-comptes-appareils.md)                         | nouveauté     | `feat/comptes-appareils`      |
| 2026-10-01 | [Réglages › Compte](journal/2026-10-01-feat-comptes-app.md)                                                                    | nouveauté     | `feat/comptes-app`            |
| 2026-10-01 | [Les comptes, côté serveur](journal/2026-10-01-feat-comptes-serveur.md)                                                        | nouveauté     | `feat/comptes-serveur`        |
| 2026-10-01 | [Le relais officiel par défaut](journal/2026-10-01-feat-relais-officiel.md)                                                    | nouveauté     | `feat/relais-officiel`        |
| 2026-10-01 | [Le relais derrière un serveur web déjà en place](journal/2026-10-01-fix-relais-proxy-existant.md)                             | correction    | `fix/relais-proxy-existant`   |
| 2026-10-01 | [Synchroniser par Internet, par un relais sur le VPS de l'utilisateur](journal/2026-10-01-feat-synchro-internet.md)            | nouveauté     | `feat/synchro-internet`       |
| 2026-10-01 | [Disque plein : rien de perdu, réécrit plus tard, et l'app le dit](journal/2026-10-01-fix-synchro-disque-plein.md)             | correction    | `fix/synchro-disque-plein`    |
| 2026-10-01 | [Les dossiers se synchronisent](journal/2026-10-01-fix-synchro-dossiers.md)                                                    | correction    | `fix/synchro-dossiers`        |
| 2026-10-01 | [Une version de test à chaque push, et l'app qui se met à jour seule](journal/2026-10-01-feat-mises-a-jour.md)                 | nouveauté     | `feat/mises-a-jour`           |
| 2026-10-01 | [Écrire ensemble en temps réel](journal/2026-10-01-feat-synchro-direct.md)                                                     | nouveauté     | `feat/synchro-direct`         |
| 2026-10-01 | [Plus d'artifacts, et des règles pour économiser les tokens](journal/2026-10-01-docs-economie.md)                              | documentation | `docs/economie`               |
| 2026-10-01 | [La synchronisation dans l'app : ajouter un appareil, recevoir un coffre](journal/2026-10-01-feat-synchro-interface.md)        | nouveauté     | `feat/synchro-interface`      |
| 2026-09-30 | [Les apps de bureau se trouvent et se relient sur le réseau local](journal/2026-09-30-feat-synchro-reseau-local.md)            | nouveauté     | `feat/synchro-reseau-local`   |
| 2026-09-30 | [Le chiffrement de bout en bout et l'appairage par code](journal/2026-09-30-feat-synchro-chiffrement.md)                       | nouveauté     | `feat/synchro-chiffrement`    |
| 2026-09-30 | [Le moteur de synchronisation entre appareils](journal/2026-09-30-feat-synchro-moteur.md)                                      | nouveauté     | `feat/synchro-moteur`         |
| 2026-09-30 | [La barre d'activité nomme ses boutons](journal/2026-09-30-feat-barre-activite-noms.md)                                        | amélioration  | `feat/barre-activite-noms`    |
| 2026-09-30 | [Refonte, deuxième partie : la disposition, entièrement réglable](journal/2026-09-30-feat-disposition.md)                      | nouveauté     | `feat/disposition`            |
| 2026-09-30 | [La recette se lance là où le changement a un effet](journal/2026-09-30-docs-recette-ciblee.md)                                | documentation | `docs/recette-ciblee`         |
| 2026-09-30 | [Palette : Entrée ouvre le premier résultat, même tapée aussitôt](journal/2026-09-30-fix-palette-entree.md)                    | correction    | `fix/palette-entree`          |
| 2026-09-30 | [Refonte, première partie : thèmes et apparence réglable, avec aperçu](journal/2026-09-30-feat-themes.md)                      | nouveauté     | `feat/themes`                 |
| 2026-09-30 | [Guide des versions, et la recette avant chaque version plutôt qu'à chaque push](journal/2026-09-30-docs-versions.md)          | documentation | `docs/versions`               |
| 2026-09-30 | [CI : la recette résiste à un plantage de Chrome](journal/2026-09-30-ci-recette-chrome.md)                                     | maintenance   | `ci/recette-chrome`           |
| 2026-09-30 | [Idée : importer depuis n'importe quel logiciel Markdown](journal/2026-09-30-docs-idee-import-universel.md)                    | documentation | `docs/idee-import-universel`  |
| 2026-09-30 | [Recette automatique : les 556 vérifications passent par des tests](journal/2026-09-30-test-recette-automatique.md)            | amélioration  | `test/recette-automatique`    |
| 2026-09-30 | [Premières maquettes de la refonte personnalisable](journal/2026-09-30-docs-maquettes-refonte.md)                              | documentation | `docs/maquettes-refonte`      |
| 2026-09-30 | [Le dossier contribution : règles, journal et idées](journal/2026-09-30-docs-dossier-contribution.md)                          | documentation | `docs/dossier-contribution`   |
| 2026-09-30 | [Ouverture bloquée : dossiers refusés, progression et Annuler](journal/2026-09-30-fix-ouverture-bloquee.md)                    | correction    | `fix/ouverture-bloquee`       |
| 2026-09-29 | [Recette complétée, plan de distribution et étape téléphones](journal/2026-09-29-docs-recette-coffres.md)                      | documentation | `docs/recette-coffres`        |
| 2026-09-29 | [Largeur de lecture corrigée, taille du texte et largeur des lignes réglables](journal/2026-09-29-feat-largeur-texte.md)       | nouveauté     | `feat/largeur-texte`          |
| 2026-09-29 | [L'icône de l'app s'affiche dans le menu et le dock sous Linux](journal/2026-09-29-fix-icone-linux.md)                         | correction    | `fix/icone-linux`             |
| 2026-09-29 | [Afficher une note ou un dossier dans le gestionnaire de fichiers](journal/2026-09-29-feat-afficher-dans-dossier.md)           | nouveauté     | `feat/afficher-dans-dossier`  |
| 2026-09-29 | [Suivre un coffre renommé ou déplacé](journal/2026-09-29-feat-coffre-deplace.md)                                               | nouveauté     | `feat/coffre-deplace`         |
| 2026-09-29 | [Des phrases claires à la place des messages techniques](journal/2026-09-29-fix-erreurs-lisibles.md)                           | correction    | `fix/erreurs-lisibles`        |
| 2026-09-29 | [Les enregistrements simultanés ne se marchent plus dessus](journal/2026-09-29-fix-stockage-bureau.md)                         | correction    | `fix/stockage-bureau`         |
| 2026-09-29 | [Tout ce qui existait avant le journal](journal/2026-09-29-0-avant-le-journal.md)                                              | nouveauté     | `avant-le-journal`            |
