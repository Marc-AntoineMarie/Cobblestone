# Règles de contribution

La méthode du projet. Elle s'applique à tout le monde, mainteneurs compris, et à chaque changement,
même d'une ligne. Proposition du 30 septembre 2026, à valider et faire évoluer ensemble : une règle qui
change passe elle aussi par une branche et une fiche du journal.

## 1. Avant de coder

- L'idée existe dans [IDEES.md](IDEES.md) (sinon on l'y ajoute). Un changement important commence
  par une issue ou une discussion, avant d'écrire le code.
- Le produit est décrit dans [PRODUCT.md](../PRODUCT.md), le design dans [DESIGN.md](../DESIGN.md),
  l'architecture dans [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) et les grandes étapes dans
  [docs/ROADMAP.md](../docs/ROADMAP.md). Un changement qui les contredit les met à jour dans la même
  branche.
- **Compatibilité Obsidian** : Cobblestone ouvre un coffre Obsidian tel quel et n'écrit jamais dans
  `.obsidian/` ; ses propres réglages vont dans `.cobblestone/`. Un fichier que Cobblestone écrit
  reste lisible par Obsidian.

## 2. Branches

- `main` est toujours publiable. On n'y travaille jamais directement.
- Une branche courte par changement, nommée `type/sujet-en-francais` : `feat/partage-par-lien`,
  `fix/ouverture-bloquee`, `docs/dossier-contribution`.
- Elle se fusionne dans `main` avec `git merge --no-ff` (les commits restent visibles, pas de squash),
  puis elle est supprimée.

## 3. Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/), **en français** :

```
type(portée): message au présent, sans majuscule ni point final
```

Le corps du commit explique le pourquoi quand il n'est pas évident.

| Type       | Quand                                                            |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | nouvelle fonctionnalité visible                                  |
| `fix`      | correction de bug                                                |
| `perf`     | amélioration de performance                                      |
| `refactor` | réorganisation du code sans changement de comportement           |
| `test`     | ajout ou correction de tests                                     |
| `docs`     | documentation (README, docs/, contribution/, PRODUCT, DESIGN)    |
| `style`    | mise en forme du code (Prettier), sans effet sur le comportement |
| `build`    | dépendances, empaquetage, scripts de build                       |
| `ci`       | intégration continue                                             |
| `chore`    | maintenance, releases (`chore(release): v0.2.0`)                 |
| `revert`   | annulation d'un commit précédent                                 |

Portées courantes : `core`, `node`, `app`, `editor`, `search`, `graph`, `settings`, `design`, `web`,
`desktop`, `canvas`, `sync`, `e2e`, `release`, `journal`.

- **Un commit = un changement qui a du sens seul.** Pas de gros commit fourre-tout, pas de « wip ».
- Chaque commit compile et passe ses tests.
- Un changement cassant (format de fichier, réglage renommé, API) le signale avec `!`
  (`feat(core)!: …`) et explique la migration dans le corps.
- Aucune ligne `Co-Authored-By` : le crédit des contributeurs est géré dans le dépôt.

## 4. Code

- Code, identifiants et commentaires en anglais ; tout texte visible passe par
  `packages/app/src/i18n.ts`, en anglais et en français.
- Un bug corrigé arrive avec le test qui le reproduit.
- Aucune donnée ne quitte l'appareil sans une action explicite de l'utilisateur.

## 5. Interface et design

- Toute interface respecte [DESIGN.md](../DESIGN.md) ; un changement de design le met à jour.
- Une refonte ou un nouvel écran important passe d'abord par des maquettes dans **Claude Design**,
  validées avant d'écrire le code.
- Ergonomie avant décoration : chaque action se trouve là où la main l'attend, au clavier comme à la
  souris, et tout ce qui peut se personnaliser se règle dans les réglages, avec un aperçu.
- Captures avant de dire « c'est fait » : `node scripts/shoot.mjs <dossier>`, relues à l'œil.

## 6. Vérifications

```bash
npm run check   # formatage, types, tests unitaires, format de la recette, journal
npm run e2e     # parcours complets sur l'app de bureau et l'app web
```

- `npm run check` passe avant chaque commit ; `npm run e2e` avant chaque fusion qui touche un
  parcours de l'app, avec un scénario ajouté dans `scripts/e2e-*.mjs` pour chaque nouveau parcours.
- Chaque fonctionnalité ajoute ses lignes à [docs/RECETTE.md](../docs/RECETTE.md), en fin de section
  pour ne pas décaler les numéros déjà testés.
- La CI refait tout sur chaque push ; une branche rouge ne se fusionne pas.

## 7. Journal

**Chaque changement fusionné a sa fiche** dans [journal/](journal/), sans exception. Elle raconte le
pourquoi et liste en détail ce qui a été ajouté, modifié et supprimé, les tests, les fichiers et les
commits.

1. Sur la branche, une fois le travail fini : `npm run journal -- new`. La fiche est créée avec la
   date, les fichiers et les commits.
2. Écrire les sections Pourquoi, Ajouté, Modifié, Supprimé et Tests (« Rien. » quand elle ne s'applique
   pas). Voir le [modèle](journal/_modele.md).
3. `npm run journal -- index` met à jour le sommaire [JOURNAL.md](JOURNAL.md).
4. Commit `docs(journal): …` dans la branche, puis fusion.

`npm run check` refuse une fiche incomplète, un sommaire pas à jour, ou une branche fusionnée sans
fiche.

## 8. Idées

[IDEES.md](IDEES.md) garde tout ce qui n'est pas encore fait : idées, demandes, bugs repérés,
décisions à prendre. Chaque idée a un statut (**à faire**, **à décider**, **en cours**,
**plus tard**). Quand une idée est réalisée, elle sort d'IDEES.md et sa fiche du journal la remplace.

## 9. Avant de fusionner

- [ ] Les commits suivent la section 3.
- [ ] `npm run check` et, si un parcours est touché, `npm run e2e` passent.
- [ ] Les lignes de recette sont ajoutées.
- [ ] Les documents concernés sont à jour (README, docs/, PRODUCT.md, DESIGN.md, IDEES.md).
- [ ] La fiche du journal est écrite et le sommaire régénéré.

## 10. Versions et publication

[Versionnage sémantique](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`.

- En `0.x`, une nouvelle fonctionnalité monte le MINEUR (`0.2.0`), une correction le CORRECTIF
  (`0.2.1`). À partir de `1.0.0`, un changement cassant monte le MAJEUR. Préversions : `0.3.0-beta.1`.
- Avant une version : la recette de [docs/RECETTE.md](../docs/RECETTE.md) sur une copie d'un vrai
  coffre, bureau et web ; avant une version mineure, un audit `docs/audit-AAAA-MM-JJ.md` (frontières
  de confiance, stockage, dépendances, performance).
- On publie uniquement depuis `main`, arbre propre, avec `npm run release X.Y.Z` : vérifications,
  versions de tous les `package.json`, CHANGELOG, commit `chore(release): vX.Y.Z`, tag, push. Le tag
  lance [release.yml](../.github/workflows/release.yml) (installeurs et app web), voir
  [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md).
- Rien n'est poussé, tagué ou publié sans l'accord du mainteneur.
