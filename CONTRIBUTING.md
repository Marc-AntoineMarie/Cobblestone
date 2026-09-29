# Contribuer à Cobblestone

Merci de ton intérêt ! Les bugs et les idées sont bienvenus dans les
[issues](https://github.com/Marc-AntoineMarie/Cobblestone/issues). Pour une faille de sécurité, suis
plutôt [SECURITY.md](SECURITY.md).

Toute la méthode est dans le dossier [contribution/](contribution/) :

- [contribution/REGLES.md](contribution/REGLES.md) : branches, commits, code, design, vérifications,
  journal, versions ;
- [contribution/JOURNAL.md](contribution/JOURNAL.md) : chaque changement, détaillé dans sa fiche ;
- [contribution/IDEES.md](contribution/IDEES.md) : ce qui reste à faire ou à décider.

En bref : une branche courte par changement, des commits `type(portée): message` en français,
`npm run check` avant chaque commit, `npm run e2e` pour les parcours de l'app, une fiche de journal
(`npm run journal -- new`) avant de fusionner, et `npm run release X.Y.Z` pour publier.

## Droits sur les contributions

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

- The full method, written in French, is in [contribution/](contribution/): rules, a journal entry
  for every change (`npm run journal -- new`) and the list of ideas still to do.
- Commits follow Conventional Commits, written in French: `type(scope): message`. One meaningful
  change per commit; every commit builds and passes its tests.
- Run `npm run check` before committing and `npm run e2e` before a pull request.
- Versions follow SemVer and are published with `npm run release X.Y.Z` from `main`.
- By submitting a contribution you certify you have the right to submit it, and you grant
  Marc-Antoine Marie a worldwide, royalty-free, non-exclusive, irrevocable license to use,
  reproduce, modify, distribute and **sublicense** it, including under other licenses, commercial
  or not. You keep ownership of your contribution.
