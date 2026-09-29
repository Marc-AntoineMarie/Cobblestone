# Contribuer à Cobblestone

Merci de ton intérêt ! Les bugs et les idées sont bienvenus dans les
[issues](https://github.com/Marc-AntoineMarie/Cobblestone/issues). Pour une faille de sécurité, suis
plutôt [SECURITY.md](SECURITY.md).

Ce document est **la méthode du projet**. Elle s'applique à tout le monde, mainteneurs compris.

## 1. Avant de coder

- Un changement important commence par une issue, pour en discuter avant d'écrire le code.
- Le produit est décrit dans [PRODUCT.md](PRODUCT.md), le design dans [DESIGN.md](DESIGN.md),
  l'architecture dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et la suite dans
  [docs/ROADMAP.md](docs/ROADMAP.md). Un changement qui les contredit les met à jour dans le même
  lot de commits.
- Compatibilité : Cobblestone ouvre un coffre Obsidian tel quel et n'écrit jamais dans
  `.obsidian/`. Tout changement du format des fichiers doit rester lisible par Obsidian.

## 2. Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/), **en français** :

```
type(portée): message au présent, sans majuscule ni point final
```

Exemples : `feat(editor): coche les tâches d'un clic`, `fix(desktop): ne perd plus la dernière frappe à la fermeture`.

| Type       | Quand                                                            |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | nouvelle fonctionnalité visible                                  |
| `fix`      | correction de bug                                                |
| `perf`     | amélioration de performance                                      |
| `refactor` | réorganisation du code sans changement de comportement           |
| `test`     | ajout ou correction de tests                                     |
| `docs`     | documentation (README, docs/, PRODUCT.md, DESIGN.md)             |
| `style`    | mise en forme du code (Prettier), sans effet sur le comportement |
| `build`    | dépendances, empaquetage, scripts de build                       |
| `ci`       | intégration continue                                             |
| `chore`    | maintenance, releases (`chore(release): v0.2.0`)                 |
| `revert`   | annulation d'un commit précédent                                 |

Portées courantes : `core`, `node`, `app`, `editor`, `search`, `graph`, `settings`, `design`, `web`,
`desktop`, `sync`, `e2e`, `release`.

Règles :

- **Un commit = un changement qui a du sens seul.** Pas de gros commit fourre-tout, pas de
  « wip ». Une fonctionnalité se découpe en plusieurs commits (modèle, interface, tests…).
- Chaque commit laisse le projet dans un état qui compile et dont les tests passent.
- Un changement cassant (format de fichier, réglage renommé, API) le signale avec `!` :
  `feat(core)!: …`, et explique la migration dans le corps du commit.
- Un bug corrigé arrive avec le test qui le reproduit.

## 3. Vérifications

Avant chaque commit :

```bash
npm run check        # formatage, types et tests unitaires
```

Avant une pull request ou une release, en plus :

```bash
npm run e2e          # scénarios de bout en bout sur l'app web et l'app de bureau
```

La CI refait tout ça sur chaque push et chaque pull request ; une branche rouge ne se fusionne pas.

## 4. Branches et pull requests

- `main` est toujours publiable.
- Le travail se fait sur une branche courte : `feat/partage-par-lien`, `fix/titre-renommage`.
- La pull request décrit le changement et pourquoi, coche la liste du modèle, et se fusionne
  en gardant les commits (pas de squash) quand ils respectent les règles ci-dessus.

## 5. Versions

[Versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

- Tant que la version est `0.x` : une nouvelle fonctionnalité monte le MINEUR (`0.2.0`), une
  correction monte le CORRECTIF (`0.2.1`).
- À partir de `1.0.0` : un changement cassant monte le MAJEUR.
- Préversions : `0.3.0-beta.1`, publiées comme « pre-release ».

## 6. Publier une version

Depuis `main`, arbre propre :

```bash
npm run release 0.2.0
```

Le script :

1. vérifie que l'arbre est propre, que la branche est `main` et que le tag n'existe pas ;
2. lance `npm run check` ;
3. met la version à jour dans tous les `package.json` ;
4. ajoute au [CHANGELOG.md](CHANGELOG.md) les commits depuis la version précédente, classés par type ;
5. crée le commit `chore(release): v0.2.0` et le tag annoté `v0.2.0`, puis les pousse.

Le tag déclenche [.github/workflows/release.yml](.github/workflows/release.yml) : la CI complète,
puis une release GitHub brouillon, la construction des installeurs (Linux, Windows, macOS) et de
l'app web, et enfin la publication.

Un audit de sécurité et de performance (`docs/audit-AAAA-MM-JJ.md`) précède chaque version
mineure : frontières de confiance, notes partagées, stockage, dépendances.

## 7. Droits sur les contributions

Cobblestone est publié sous [AGPL-3.0](LICENSE) et ses fonctions pour les organisations seront
proposées sous licence commerciale. Pour que ce double modèle reste possible, en soumettant une
contribution (code, documentation, traduction, image…) :

1. tu certifies en être l'auteur, ou avoir le droit de la soumettre ;
2. tu accordes à Marc-Antoine Marie une licence mondiale, gratuite, non exclusive, irrévocable et
   pour toute la durée des droits, d'utiliser, reproduire, modifier, distribuer et
   **sous-licencier** ta contribution, y compris sous d'autres licences, commerciales ou non ;
3. tu restes propriétaire de ta contribution et libre de l'utiliser ailleurs.

Coche la case correspondante dans la description de la pull request pour l'indiquer.

---

## Contributing (English)

- Commits follow Conventional Commits, written in French: `type(scope): message`. One meaningful
  change per commit; every commit builds and passes its tests.
- Run `npm run check` before committing and `npm run e2e` before a pull request.
- Versions follow SemVer and are published with `npm run release X.Y.Z` from `main`.
- By submitting a contribution you certify you have the right to submit it, and you grant
  Marc-Antoine Marie a worldwide, royalty-free, non-exclusive, irrevocable license to use,
  reproduce, modify, distribute and **sublicense** it, including under other licenses, commercial
  or not. You keep ownership of your contribution.
