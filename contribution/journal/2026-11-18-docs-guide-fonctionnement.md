---
date: 2026-11-18
branche: docs/guide-fonctionnement
type: documentation
version: non publiée
---

# Un guide du fonctionnement, pour tout comprendre avec la seule documentation

## Pourquoi

Chaque changement avait sa fiche, mais le **fonctionnement** n'était écrit nulle part : une personne
qui arrive, ou qui revient après des mois, devait relire le code. La question de départ en est un
exemple — « comment le coffre est-il stocké sur le web, et qui peut le lire ? » n'avait pas de
réponse dans la documentation. Trois documents étaient devenus faux : le relais ne garde plus
« rien » depuis les dépôts pour appareil hors ligne, RELAIS.md décrivait Caddy alors que `deploy/`
utilise nginx et certbot, et la feuille de route annonçait la synchronisation comme « à faire ».

## Ajouté

- `docs/guide/` : neuf documents, en anglais comme le code.
  - `orientation.md` : les couches et qui peut dépendre de qui, les sept invariants, un tableau
    « je veux changer X → va là », l'ordre de lecture.
  - `vault-and-storage.md` : le modèle du coffre, l'interface d'adaptateur, la file d'attente des
    opérations, le renommage qui réécrit les liens, et **où sont les octets sur chaque hôte** avec
    ce que ça implique pour la confidentialité (dossier choisi, OPFS, démo, IndexedDB, localStorage).
  - `engine.md` : l'analyse d'une note et le masquage qui garde les décalages exacts, l'index
    incrémental, la résolution des liens à la façon d'Obsidian, la recherche, le canvas.
  - `interface.md` : `Session`, le modèle d'espace de travail, les écrans (bureau, téléphone,
    tablette), les commandes, réglages et préférences, thèmes et apparence, i18n, erreurs.
  - `editor-and-rendering.md` : CodeMirror et l'aperçu en direct, la syntaxe Obsidian, la vue
    lecture et son nettoyage obligatoire.
  - `sync.md` : le CRDT, les fichiers qui restent la référence, identités, sessions, appairage,
    transports, dépôts, écriture en direct.
  - `accounts-and-relay.md` : le protocole du relais et ses limites, l'API des comptes, le tableau
    de ce que le serveur voit et ne voit pas.
  - `security.md` : les promesses, les frontières de confiance, l'inventaire cryptographique, les
    menaces, et les **limites connues** écrites noir sur blanc.
  - `testing-and-tooling.md` : `npm run check`, les tests unitaires, la recette et ses statuts, les
    captures, le journal, les versions, la CI, les particularités locales.
- `docs/README.md` : la carte de toute la documentation, avec ce que chaque document répond.
- `contribution/REGLES.md` section 8 « Documentation du fonctionnement » : la règle, et la case dans
  la liste d'avant-fusion.
- `contribution/IDEES.md`, section « Sécurité de l'app web » : les limites repérées en écrivant le
  guide (en-têtes de sécurité absents côté nginx, clé d'appareil en clair au repos, pas de
  `navigator.storage.persist()`, métadonnées des dépôts).
- La fiche manquante de `feat/barre-mise-en-forme`, écrite d'après ses commits.

## Modifié

- `docs/ARCHITECTURE.md` : renvoie au guide, décrit les dépôts du relais (48 h, scellés, illisibles
  par lui) et ne dit plus que la synchronisation n'a pas d'hôte.
- `docs/RELAIS.md` : réécrit pour correspondre à `deploy/` (Docker sur `127.0.0.1:8787` + nginx +
  certbot, plus Caddy), avec le tableau des variables d'environnement et les limites réelles.
- `docs/ROADMAP.md` : l'étape 2 devient « en cours », ce qui est fait est barré ; la PWA aussi.
- `README.md` : la synchronisation entre appareils entre dans « ce qui marche aujourd'hui », une
  section Documentation renvoie au guide, et le tableau du dépôt cite `packages/sync` et
  `apps/relay`.
- `CLAUDE.md` : la règle de documentation en aide-mémoire.
- Les sections de REGLES.md après la 7 sont décalées d'un numéro.

## Supprimé

Rien.

## Tests

`npm run check` (formatage, types, 239 tests unitaires, recette, journal). Changement de
documentation seul : aucun test unitaire ni ligne de recette à ajouter, aucune exécution de la
recette (rien dans l'app ne change). Chaque affirmation du guide a été vérifiée dans le code au
moment de l'écrire.

## Fichiers

- modifié : `CLAUDE.md`
- modifié : `README.md`
- modifié : `contribution/IDEES.md`
- modifié : `contribution/JOURNAL.md`
- modifié : `contribution/REGLES.md`
- ajouté : `contribution/journal/2026-11-18-feat-barre-mise-en-forme.md`
- modifié : `docs/ARCHITECTURE.md`
- ajouté : `docs/README.md`
- modifié : `docs/RELAIS.md`
- modifié : `docs/ROADMAP.md`
- ajouté : `docs/guide/accounts-and-relay.md`
- ajouté : `docs/guide/editor-and-rendering.md`
- ajouté : `docs/guide/engine.md`
- ajouté : `docs/guide/interface.md`
- ajouté : `docs/guide/orientation.md`
- ajouté : `docs/guide/security.md`
- ajouté : `docs/guide/sync.md`
- ajouté : `docs/guide/testing-and-tooling.md`
- ajouté : `docs/guide/vault-and-storage.md`

## Commits

- `8f1474b` docs(guide): guide de fonctionnement, domaine par domaine
- `6142ee9` docs: remettre architecture, relais, feuille de route et README à jour
- `c88f0f6` docs(regles): chaque changement met à jour la page du guide
- `d41f761` docs(idees): sécurité de l'app web repérée en écrivant le guide
- `a3bee78` docs(journal): fiche de la barre de mise en forme
