# Versions et publication

Comment Cobblestone numérote ses versions, ce qu'un push déclenche ou non, et la procédure complète
pour publier une version avec `npm run release`.

## En bref

- **Un push ne publie rien.** Il lance seulement la CI : formatage, types, tests unitaires,
  construction des deux apps, audit des dépendances.
- **Une version se publie à la main**, depuis `main`, avec `npm run release X.Y.Z`. Le script
  vérifie tout, lance la recette automatique, crée le commit et le tag `vX.Y.Z`, puis les pousse.
- **Le tag construit et publie la release sur GitHub** : les installeurs pour Linux, Windows et macOS,
  plus un zip de l'app web.
- **On ne publie jamais sans l'accord du mainteneur.**

## Les numéros

[Versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

| Changement                                      | Avant 1.0            | À partir de 1.0       |
| ----------------------------------------------- | -------------------- | --------------------- |
| Correction de bug seulement                     | `0.2.0` → `0.2.1`    | `1.2.0` → `1.2.1`     |
| Nouvelle fonctionnalité                         | `0.2.1` → `0.3.0`    | `1.2.1` → `1.3.0`     |
| Changement cassant (format, réglage renommé, …) | `0.3.0` → `0.4.0`    | `1.3.0` → `2.0.0`     |
| Préversion à essayer avant la vraie             | `0.3.0-beta.1`, `-2` | `2.0.0-rc.1`, `-rc.2` |

- Tant qu'on est en `0.x`, tout peut encore bouger : c'est la période de construction.
- `1.0.0` est une promesse : les formats de fichiers, les réglages et la synchronisation ne cassent
  plus sans une version majeure et une migration.
- Une préversion (`-beta.1`, `-rc.1`) est publiée comme « Pre-release » sur GitHub : elle se
  télécharge, mais n'est pas proposée comme la dernière version.
- Les versions publiées sont les tags `vX.Y.Z` et les
  [releases GitHub](https://github.com/Marc-AntoineMarie/Cobblestone/releases). La version en cours
  de préparation est celle des `package.json`.

## Le plan

| Version | Contenu                                                                   |
| ------- | ------------------------------------------------------------------------- |
| `0.1.0` | Première version installable : l'éditeur, le coffre Obsidian, la recette  |
| `0.2.0` | La refonte du design, entièrement personnalisable                         |
| `0.3.0` | La synchronisation directe entre ses appareils                            |
| `1.0.0` | Quand tout fonctionne ensemble, après une période d'essai (voir plus bas) |

Conditions pour la `1.0.0` :

- la refonte et la synchronisation sont faites ;
- la synchronisation a servi chaque jour, sur au moins deux ordinateurs, pendant quelques semaines,
  sans perte de note ;
- la recette entière passe, lignes manuelles comprises, sur Linux, Windows et macOS ;
- un audit récent ne laisse aucun problème de sécurité ou de perte de données ouvert ;
- au moins une préversion `1.0.0-rc.1` a été essayée avant.

Les téléphones, les importeurs et le reste de la parité avec Obsidian viennent ensuite, en `1.x`.

## Ce que fait chaque étape

| Quand                         | Où                                                      | Quoi                                                                             |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Chaque commit                 | ta machine                                              | `npm run check` : formatage, types, tests unitaires, recette à jour, journal     |
| Avant chaque fusion dans main | ta machine                                              | `npm run e2e` si l'app change : la recette automatique, une vingtaine de minutes |
| Chaque push                   | GitHub, [ci.yml](../.github/workflows/ci.yml)           | Formatage, types, tests unitaires, construction, audit des dépendances           |
| À la demande                  | GitHub, [recette.yml](../.github/workflows/recette.yml) | La recette automatique complète (Actions → Recette → Run workflow)               |
| `npm run release X.Y.Z`       | ta machine, puis GitHub                                 | Tout ce qui suit                                                                 |

## Publier une version, pas à pas

### 1. Avant

- [ ] Tout est fusionné dans `main`, et `main` est à jour : `git switch main && git pull`.
- [ ] Rien n'est en cours : `git status` ne montre aucune modification.
- [ ] La recette manuelle est faite : les lignes `manuel` de [docs/RECETTE.md](../docs/RECETTE.md),
      sur une copie d'un vrai coffre, sur le bureau et le web.
- [ ] Pour une version mineure (`0.2.0`, `0.3.0`…) : l'audit `docs/audit-AAAA-MM-JJ.md` est écrit
      (sécurité, stockage des données, dépendances, performance), et ses problèmes graves corrigés.
- [ ] [IDEES.md](IDEES.md) et [docs/ROADMAP.md](../docs/ROADMAP.md) sont à jour.

### 2. Lancer la publication

```bash
npm run release 0.1.0
```

Le script [scripts/release.mjs](../scripts/release.mjs) fait, dans l'ordre, et s'arrête à la
première erreur :

1. Il vérifie qu'on est sur `main`, que rien n'est en cours, et que le tag `v0.1.0` n'existe pas.
2. `npm run check` : formatage, types, tests unitaires, recette à jour, journal.
3. `npm run e2e` : la recette automatique, sur le bureau et le web (une vingtaine de minutes).
4. Il écrit la version dans tous les `package.json` et dans `package-lock.json`.
5. Il note la version dans les fiches du journal marquées « non publiée ».
6. Il complète [CHANGELOG.md](../CHANGELOG.md) à partir des messages de commit depuis la version
   précédente, classés par type : nouveautés (`feat`), corrections (`fix`), performances,
   documentation, maintenance.
7. Il crée le commit `chore(release): v0.1.0` et le tag annoté `v0.1.0`.
8. Il pousse `main` et le tag ensemble (`git push --atomic`).

Options :

- `--no-push` prépare tout sans rien pousser ; on relit, puis on pousse :
  `git push --atomic origin main v0.1.0`.
- `--sans-recette` saute la recette automatique. À éviter : seulement pour un correctif urgent, la
  recette passée juste avant à la main.

### 3. Sur GitHub

Le tag lance [release.yml](../.github/workflows/release.yml), visible dans l'onglet **Actions** du
dépôt :

1. **CI** : les mêmes vérifications qu'à chaque push. Si elles échouent, rien n'est publié.
2. **Brouillon** : vérifie que le tag et les `package.json` portent la même version, puis crée une
   release en brouillon avec les notes du CHANGELOG et le guide
   [« Quel fichier télécharger ? »](../.github/release-download.md).
3. **Installeurs**, en parallèle : AppImage et `.deb` (Linux), `.exe` (Windows), `.dmg` (macOS, puces
   Apple et Intel), plus `Cobblestone-X.Y.Z-web.zip` (l'app web à héberger soi-même).
4. **Publication** : la release sort du brouillon et apparaît sur la page des releases.

Compter une vingtaine de minutes. Les installeurs ne sont pas encore signés : Windows et macOS
affichent un avertissement à la première ouverture (voir [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md)).

### 4. Après

- Télécharger un installeur de la release et vérifier qu'il s'installe et s'ouvre.
- Si une étape a échoué sur GitHub : voir « Quand ça rate » ci-dessous.

## Quand ça rate

- **Le script s'arrête avant le commit** (tests, recette) : rien n'a changé. On corrige, on fusionne,
  on relance la même commande.
- **Le script s'arrête après le commit mais avant le push** : annuler en local, corriger, relancer.

  ```bash
  git tag -d v0.1.0
  git reset --hard HEAD~1
  ```

- **La release échoue sur GitHub** (CI rouge, installeur en échec) : supprimer la release brouillon et
  le tag, corriger dans une branche, fusionner, puis publier **le numéro suivant** (`0.1.1`). Un
  numéro déjà poussé n'est jamais réutilisé.

  ```bash
  gh release delete v0.1.0 --yes
  git push origin :refs/tags/v0.1.0
  git tag -d v0.1.0
  ```

- **Un bug dans une version publiée** : branche `fix/…`, fusion, puis `npm run release 0.1.1`.

## Suivre la CI depuis le terminal

L'outil [GitHub CLI](https://cli.github.com/) (`gh`) montre la CI sans ouvrir le navigateur. Sur
Debian ou Ubuntu :

```bash
sudo apt install gh
gh auth login          # GitHub.com → HTTPS → se connecter avec le navigateur
```

Puis :

```bash
gh run list                      # les dernières exécutions de la CI
gh run watch                     # suivre celle en cours
gh run view --log-failed         # les journaux des étapes en échec
gh workflow run recette.yml      # lancer la recette complète sur GitHub
gh release view v0.1.0           # une release et ses fichiers
```
