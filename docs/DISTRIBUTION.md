# Distribution

Comment une version arrive sur chaque plateforme : ce qui marche déjà, ce qui reste à faire, et les
décisions à prendre (surtout celles qui coûtent de l'argent). La publication elle-même est décrite
dans [contribution/REGLES.md](../contribution/REGLES.md#10-versions-et-publication).

## Publier une version (déjà en place)

1. `npm run release X.Y.Z` sur `main` : vérifications, numéros de version, CHANGELOG, commit, tag,
   push.
2. Le tag lance [release.yml](../.github/workflows/release.yml) : CI complète, release GitHub en
   brouillon, installeurs Linux, Windows et macOS, zip de l'app web.
3. On relit la release brouillon puis on la publie.

Tout part de la release GitHub : les autres canaux ci-dessous reprennent ses fichiers.

## Ordinateurs

| Plateforme | Canal                       | État                           | Coût                         |
| ---------- | --------------------------- | ------------------------------ | ---------------------------- |
| Linux      | AppImage et .deb sur GitHub | fait                           | gratuit                      |
| Linux      | Flathub                     | à faire (manifeste Flatpak)    | gratuit                      |
| Linux      | AUR, .rpm (Fedora)          | à faire                        | gratuit                      |
| Windows    | Installeur .exe sur GitHub  | fait, **non signé**            | gratuit                      |
| Windows    | winget                      | à faire (manifeste à proposer) | gratuit                      |
| Windows    | Microsoft Store             | à faire (paquet MSIX)          | compte individuel gratuit    |
| Windows    | Signature du code           | à décider                      | voir plus bas                |
| macOS      | .dmg sur GitHub             | fait, **non signé**            | gratuit                      |
| macOS      | Signature et notarisation   | à décider                      | Apple Developer, 99 $ par an |
| macOS      | Homebrew (cask)             | après la signature             | gratuit                      |

Sans signature, Windows affiche « Windows a protégé votre ordinateur » et macOS bloque la première
ouverture (il faut passer par Réglages Système). Ça marche, mais ça fait fuir. Options :

- **Windows** : SignPath Foundation signe gratuitement les projets open source (sur dossier) ; le
  Microsoft Store signe lui-même ce qu'il distribue ; un certificat payant coûte quelques centaines
  d'euros par an.
- **macOS** : pas d'alternative au programme Apple Developer. Le même compte sert pour l'App Store
  iOS.

**Mises à jour automatiques** (à faire) : electron-updater lit les releases GitHub. Elles marchent sur
Linux (AppImage) et Windows ; sur macOS, seulement pour une app signée.

## Web

- **Chacun chez soi** : le zip `Cobblestone-X.Y.Z-web.zip` se sert tel quel par n'importe quel
  serveur web (fait).
- **Version officielle en ligne** (à faire) : hébergement statique gratuit (Cloudflare Pages ou
  GitHub Pages), déployé à chaque release. Il faut un **nom de domaine** (environ 10 à 15 € par an).

## Téléphones

1. **Application web installable (PWA)**, à partir de l'app web : manifeste, service worker pour le
   hors-ligne, icônes, et une interface repensée pour le tactile (barre du bas, tiroirs, cibles de
   44 px, clavier virtuel). Elle s'installe depuis Chrome sur Android et via « Sur l'écran
   d'accueil » dans Safari sur iPhone. Limite : un téléphone ne laisse pas un site ouvrir un dossier ;
   les notes vivent dans le stockage du navigateur. La synchronisation (phase 2 de la
   [feuille de route](ROADMAP.md)) les fait entrer et sortir.
2. **Vraie application** : la même base emballée avec Capacitor, plus un accès aux fichiers natif
   (dossiers partagés sur Android, app Fichiers sur iPhone). Canaux :

| Plateforme | Canal       | Coût                                         |
| ---------- | ----------- | -------------------------------------------- |
| Android    | Google Play | 25 $ une fois                                |
| Android    | F-Droid     | gratuit (compilé par eux depuis les sources) |
| Android    | .apk GitHub | gratuit                                      |
| iPhone     | App Store   | compris dans Apple Developer (99 $ par an)   |

## Décisions à prendre

- Prendre ou non le compte **Apple Developer** (macOS sans alerte, puis iPhone).
- Pour Windows : demander **SignPath**, passer par le **Microsoft Store**, ou les deux.
- Choisir le **nom de domaine** de l'app web et du site.
- Placer la **PWA** avant ou après la synchronisation.
