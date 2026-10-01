# Recette de Cobblestone

Toutes les vérifications à faire avant chaque version. Chaque ligne : identifiant, où la faire (Bureau,
Web ou Les deux), son **statut**, l'action, puis le résultat attendu après la flèche.

| Statut          | Qui la fait                                                           |
| --------------- | --------------------------------------------------------------------- |
| `auto`          | La recette automatique : `npm run e2e` (tests dans `tests/recette/`). |
| `ci`            | L'intégration continue, à chaque push (installation, vérifications).  |
| `manuel`        | Une personne : le test dit pourquoi une machine ne peut pas la faire. |
| `à automatiser` | Une personne en attendant que son test automatique soit écrit.        |

Un statut différent par plateforme s'écrit « auto bureau, manuel web ». Les statuts sont tenus à jour par
`npm run recette -- sync` ; `npm run check` refuse une ligne sans test (automatique, manuel, ci ou à
automatiser) et un statut pas à jour. Après `npm run e2e`, le résultat de chaque ligne est dans
`test-results/recette.md`.

Pour la partie manuelle, **toujours tester sur une copie d'un coffre**, jamais sur l'original :
Cobblestone écrit dans le coffre (renommages, `.cobblestone/`, `.trash/`).

Préparer :

1. `npm install` dans le dossier du projet.
2. Copier un coffre Obsidian : `cp -r ~/MonCoffre ~/MonCoffre-test`.
3. App de bureau : `npm run dev:desktop`. App web : `npm run dev:web` puis <http://localhost:5173> dans
   Chrome ou Edge (et Firefox pour les tests qui le mentionnent).
4. Remettre à zéro : bureau `rm -rf ~/.config/Cobblestone` (app fermée) ; web, outils de développement,
   Application, « Clear site data » ; dans le coffre de test, supprimer `.cobblestone/`.

Les raccourcis sont donnés pour Linux et Windows ; sur Mac, Ctrl devient Cmd.

## 1. Préparation et lancement

- **1.1** · Les deux · ci · `npm install` dans le dossier du projet → Les dépendances s'installent sans erreur.
- **1.2** · Les deux · manuel · Faire une copie du coffre Obsidian et ne tester que sur elle → La copie existe ; l'original n'est jamais ouvert pendant la recette.
- **1.3** · Bureau · auto · `npm run dev:desktop` → La fenêtre Cobblestone s'ouvre sur l'accueil, ou sur le dernier coffre ouvert.
- **1.4** · Bureau · manuel · Surveiller le terminal pendant toute la recette → Aucune erreur, hormis la ligne « NSS error code -8018 » de Chromium, sans conséquence.
- **1.5** · Web · auto · `npm run dev:web` puis ouvrir http://localhost:5173 dans Chrome ou Edge → L'accueil s'affiche.
- **1.6** · Web · auto · Ouvrir la même adresse dans Firefox → L'accueil s'affiche ; à la place de « Ouvrir un dossier », un message conseille Chrome, Edge ou l'app de bureau.
- **1.7** · Bureau · manuel · `npm run dist -w @cobblestone/desktop` → Un AppImage et un .deb apparaissent dans `apps/desktop/release/`.
- **1.8** · Bureau · manuel · Rendre l'AppImage exécutable (`chmod +x`) et la lancer → L'app démarre comme en développement.
- **1.9** · Bureau · manuel · Installer le .deb (`sudo apt install ./apps/desktop/release/Cobblestone-0.1.0-amd64.deb`) et lancer Cobblestone depuis le menu des applications → L'app figure dans le menu avec son icône et démarre.
- **1.10** · Les deux · ci · `npm run check` → Formatage, types et tests unitaires passent.
- **1.11** · Les deux · manuel · `npm run e2e` → La recette automatique passe : `test-results/recette.md` ne compte aucun échec.
- **1.12** · Bureau · auto · App fermée, `rm -rf ~/.config/Cobblestone` puis relancer → L'accueil n'affiche plus aucun coffre récent.
- **1.13** · Web · auto · Outils de développement, Application, « Clear site data », puis recharger → Plus de coffre récent ni de préférences.

## 2. Écran d'accueil

- **2.1** · Les deux · auto · Lancer sans coffre récent → Le nom « Cobblestone » en encre bleue avec le rose décalé, la phrase d'accroche, trois actions, et « Coffres récents » vide avec un message.
- **2.2** · Bureau · auto · Cliquer « Ouvrir un dossier » → La fenêtre de choix de dossier du système s'ouvre.
- **2.3** · Bureau · auto · Annuler la fenêtre de choix de dossier → Retour à l'accueil, rien ne change.
- **2.4** · Bureau · auto · Choisir la copie du coffre → Le coffre s'ouvre, puis figure dans les récents avec son chemin.
- **2.5** · Web · auto · Chrome ou Edge : « Ouvrir un dossier », choisir la copie du coffre et accepter l'accès → Le coffre s'ouvre.
- **2.6** · Web · auto · Refuser l'accès en écriture demandé par le navigateur → Un message d'erreur clair apparaît sur l'accueil, sans plantage.
- **2.7** · Les deux · auto · Cliquer « Nouveau coffre » → Un champ « Nom du coffre » apparaît avec les boutons Créer et Annuler.
- **2.8** · Les deux · auto · Dans le champ du nom, appuyer sur Échap → Le formulaire se referme.
- **2.9** · Les deux · auto · Cliquer « Annuler » → Le formulaire se referme.
- **2.10** · Bureau · auto · Taper un nom puis « Créer » → Choix du dossier parent ; un dossier de ce nom y est créé et s'ouvre, vide.
- **2.11** · Bureau · auto · Créer un coffre nommé `a/b:c*d` → Les caractères interdits sont retirés du nom du dossier créé.
- **2.12** · Les deux · auto · Laisser le nom vide puis « Créer » → Le coffre s'appelle « Mes notes ».
- **2.13** · Web · auto · « Nouveau coffre » puis « Créer » → Un coffre stocké dans le navigateur s'ouvre, vide.
- **2.14** · Les deux · auto · Cliquer « Essayer la démo » → Le coffre de démonstration s'ouvre sur « Bienvenue » (« Welcome » en anglais).
- **2.15** · Les deux · auto · Cliquer une ligne des coffres récents → Le coffre s'ouvre ; la date affichée est celle de la dernière ouverture.
- **2.16** · Bureau · auto · Cliquer la croix d'un coffre récent → Il quitte la liste ; son dossier sur le disque n'est pas touché.
- **2.17** · Web · auto · Cliquer la croix d'un coffre stocké dans le navigateur → La ligne propose « Supprimer ce coffre » et « Annuler ».
- **2.18** · Web · auto · Confirmer « Supprimer ce coffre » → Le coffre disparaît définitivement.
- **2.19** · Web · auto · Cliquer « Annuler » à la place → La ligne redevient normale, le coffre est intact.
- **2.20** · Bureau · auto · Renommer sur le disque le dossier d'un coffre récent, puis cliquer sa ligne → Encadré « « Ancien nom » s'appelle maintenant « Nouveau nom » » avec les chemins Avant et Maintenant ; aucun message technique.
- **2.21** · Bureau · auto · Fermer l'app avec un coffre ouvert, puis la relancer → Le coffre se rouvre directement, avec ses onglets.
- **2.22** · Web · auto · Recharger la page avec un coffre du navigateur ouvert → Le coffre se rouvre directement.
- **2.23** · Web · auto · Recharger la page avec un dossier (Chrome) ouvert → Retour à l'accueil, car le navigateur exige un clic ; cliquer la ligne du récent le rouvre après accord.
- **2.24** · Les deux · auto · Ouvrir un gros coffre → Le message « Ouverture de … » s'affiche et les boutons sont désactivés pendant le chargement.
- **2.25** · Les deux · auto · Réduire la fenêtre à la largeur d'un téléphone → L'accueil reste lisible, sans défilement horizontal.
- **2.26** · Bureau · auto · App fermée, renommer le dossier d'un coffre, relancer l'app → L'encadré « … s'appelle maintenant … » s'affiche sur l'accueil ; « Suivre et ouvrir » ouvre le coffre avec ses onglets.
- **2.27** · Bureau · auto · Déplacer le dossier d'un coffre dans un dossier voisin (ex. Documents vers Documents/Archives), puis cliquer sa ligne → Le nouveau chemin est retrouvé ; « Suivre et ouvrir » ouvre le coffre.
- **2.28** · Bureau · auto · Mettre à la corbeille le dossier d'un coffre récent, revenir à l'accueil → Sa ligne affiche « Introuvable » avec un rond vide à la place de la date.
- **2.29** · Bureau · auto · Cliquer la ligne d'un coffre introuvable → « Le dossier de « … » est introuvable », avec « Retrouver le dossier… », « Retirer de la liste » et « Pas maintenant ».
- **2.30** · Bureau · auto · « Retrouver le dossier… » puis choisir le bon dossier → Le coffre s'ouvre avec ses onglets ; la liste n'a qu'une ligne pour lui, avec le nouveau nom.
- **2.31** · Bureau · auto · « C'est un autre dossier… » puis Annuler dans la fenêtre de choix → Rien ne change ; l'encadré reste.
- **2.32** · Bureau · auto · « Pas maintenant » puis « Retirer de la liste » sur un autre coffre introuvable → L'encadré se ferme ; le coffre retiré disparaît de la liste, son dossier n'est pas touché.
- **2.33** · Web · auto · Renommer sur le disque un dossier ouvert dans Chrome, puis cliquer sa ligne → Encadré « introuvable » ; « Retrouver le dossier… » ouvre le sélecteur et le coffre rouvre avec ses onglets.
- **2.34** · Bureau · auto · « Ouvrir un dossier » ou « Nouveau coffre » dans ~/.config/Cobblestone → Refus : « ce dossier contient les réglages de Cobblestone lui-même. Choisis-en un autre. »
- **2.35** · Bureau · auto · Lire le chemin des coffres récents → Il commence par « / » et ne finit pas par une barre oblique ; un chemin trop long est coupé par la gauche.
- **2.36** · Bureau · auto · App ouverte, supprimer ~/.config/Cobblestone, essayer la démo, revenir à l'accueil et créer un coffre → Aucune erreur « storage.json.tmp » ; le coffre s'ouvre.
- **2.37** · Bureau · auto · Ouvrir un coffre, la démo, puis un autre coffre, très vite l'un après l'autre → Aucune erreur ; la liste des récents est juste.
- **2.38** · Bureau · auto · Retrouver un coffre introuvable et, dans la fenêtre de choix, valider sans entrer dans le dossier du coffre → Refus : « c'est le dossier qui contenait le coffre, pas le coffre lui-même… » ; l'app reste utilisable.
- **2.39** · Bureau · auto · « Ouvrir un dossier » sur son dossier personnel ou sur « / » → Refus : « c'est ton dossier personnel entier ou tout un disque… ».
- **2.40** · Les deux · auto · Ouvrir un gros coffre → « Ouverture de … : N notes lues sur M » et un bouton Annuler ; Annuler rend l'accueil utilisable aussitôt.
- **2.41** · Bureau · auto · Retrouver un coffre en choisissant le dossier d'un autre coffre de la liste → Refus : « ce dossier est déjà un autre coffre de ta liste ».
- **2.42** · Bureau · auto · Cliquer un ancien coffre situé dans ~/.config/Cobblestone → Refus expliqué ; la croix le retire de la liste.

## 3. Migration d'un coffre Obsidian

- **3.1** · Les deux · auto · Ouvrir la copie du coffre → Notes, dossiers et pièces jointes apparaissent ; `.obsidian`, `.trash`, `.git` et les autres dossiers cachés n'apparaissent pas.
- **3.2** · Les deux · auto · Regarder le dossier du coffre sur le disque → Un dossier `.cobblestone/` contient `app.json`, et `bookmarks.json` si le coffre avait des favoris.
- **3.3** · Les deux · auto · Comparer `.obsidian/` avant et après la recette → Aucun fichier de `.obsidian/` n'a changé.
- **3.4** · Les deux · auto · Si Obsidian rangeait les pièces jointes dans un dossier, coller une image dans une note → L'image va dans ce même dossier.
- **3.5** · Les deux · auto · Si Obsidian créait les nouvelles notes dans un dossier précis, créer une note → Elle est créée dans ce dossier.
- **3.6** · Les deux · auto · Ouvrir la note du jour (Ctrl+Maj+D) → Même dossier, même format de nom et même modèle que dans Obsidian.
- **3.7** · Les deux · auto · Regarder la section « Favoris » → Les favoris d'Obsidian y sont, groupes compris.
- **3.8** · Les deux · auto · Si Obsidian ouvrait les notes en mode lecture, ouvrir une note → Elle s'ouvre en mode Lire.
- **3.9** · Les deux · auto · Si les « sauts de ligne stricts » étaient activés dans Obsidian → En mode Lire, un simple retour à la ligne ne crée pas de nouvelle ligne.
- **3.10** · Les deux · manuel · Parcourir une vingtaine de notes variées (encadrés, tableaux, code, images, intégrations, formules, Mermaid, notes de bas de page) → Tout s'affiche comme dans Obsidian, en écriture comme en lecture.
- **3.11** · Les deux · manuel · Comparer la section Tags avec Obsidian → Mêmes tags, mêmes compteurs, tags imbriqués compris.
- **3.12** · Les deux · manuel · Comparer les rétroliens d'une note très liée avec Obsidian → Les mêmes notes.
- **3.13** · Les deux · auto · Ouvrir un canvas créé dans Obsidian → Cartes, notes, flèches et couleurs s'affichent.
- **3.14** · Les deux · auto · Ouvrir les réglages de Cobblestone → Les valeurs reprennent celles d'Obsidian ; les changer n'affecte pas Obsidian.
- **3.15** · Les deux · auto · Changer un réglage, fermer puis rouvrir le coffre → Le réglage est conservé : l'import depuis `.obsidian/` n'a lieu qu'une fois.

## 4. Barre latérale : champ de recherche

- **4.1** · Les deux · auto · Taper un nom approximatif dans « Chercher ou créer une note » (ex. « bnvnu ») → Section « Noms » avec les notes correspondantes, lettres trouvées soulignées de rose.
- **4.2** · Les deux · auto · Taper un mot sans accent (ex. « etude ») → Les notes avec accent (« Étude ») sont trouvées.
- **4.3** · Les deux · auto · Taper un mot présent dans le texte des notes → Section « Dans le texte » avec le nombre de notes et un extrait où le mot est surligné en jaune.
- **4.4** · Les deux · auto · Taper un nom qui n'existe pas, puis Entrée sur « Créer « … » » → La note est créée et s'ouvre.
- **4.5** · Les deux · auto · Flèches haut et bas → La sélection se déplace (liseré rose) et la liste défile avec.
- **4.6** · Les deux · auto · Entrée sur un résultat → La note s'ouvre dans l'onglet courant et le champ se vide.
- **4.7** · Les deux · auto · Ctrl+Entrée sur un résultat → La note s'ouvre dans un nouvel onglet.
- **4.8** · Les deux · auto · Ctrl+clic sur un résultat → La note s'ouvre dans un nouvel onglet.
- **4.9** · Les deux · auto · Échap dans le champ → Le champ se vide et perd le focus ; l'arborescence réapparaît.
- **4.10** · Les deux · auto · Cliquer la croix à droite du champ → Le champ se vide.
- **4.11** · Les deux · auto · Taper un opérateur (`tag:#projet`, `path:Journal`) → Seule la section « Dans le texte » s'affiche, avec les notes correspondantes.
- **4.12** · Les deux · auto · Taper une expression régulière incomplète (`/abc`) → Aucune erreur ; seuls les noms correspondants s'affichent.
- **4.13** · Les deux · auto · Taper un nom contenant `/` ou `#` → Aucune ligne « Créer » (caractères interdits dans un nom).
- **4.14** · Les deux · auto · Chercher dans un gros coffre → Les résultats arrivent sans bloquer la frappe.

## 5. Arborescence des fichiers

- **5.1** · Les deux · auto · Cliquer un dossier → Il s'ouvre et son chevron tourne ; recliquer le referme.
- **5.2** · Les deux · auto · Regarder le chiffre à droite d'un dossier → Nombre de notes qu'il contient, sous-dossiers compris.
- **5.3** · Les deux · auto · Regarder les fichiers qui ne sont pas des notes → Badge d'extension (PNG, PDF, SVG…) ; notes et canvas s'affichent sans extension.
- **5.4** · Les deux · auto · Regarder les icônes → Notes, images, audio, vidéo, PDF, canvas et autres fichiers ont chacun la leur.
- **5.5** · Les deux · auto · Cliquer une note → Elle s'ouvre dans l'onglet courant et sa ligne passe sur fond jaune.
- **5.6** · Les deux · auto · Ctrl+clic sur une note → Elle s'ouvre dans un nouvel onglet.
- **5.7** · Les deux · auto · Ouvrir des dossiers imbriqués → Un trait vertical fin par niveau d'imbrication.
- **5.8** · Les deux · auto · Cliquer une ligne, puis flèches haut et bas → Le focus (contour rose) passe de ligne en ligne.
- **5.9** · Les deux · auto · Flèche droite sur un dossier fermé, puis sur un dossier ouvert → Le dossier s'ouvre, puis le focus descend dans son contenu.
- **5.10** · Les deux · auto · Flèche gauche sur un dossier ouvert, puis sur un fichier → Le dossier se ferme ; depuis un fichier, le focus remonte au dossier parent.
- **5.11** · Les deux · auto · Entrée sur une ligne, puis Ctrl+Entrée → Entrée ouvre la note (ou bascule le dossier) ; Ctrl+Entrée l'ouvre dans un nouvel onglet.
- **5.12** · Les deux · auto · F2 sur une ligne → Le nom passe en modification sur place.
- **5.13** · Les deux · auto · Suppr sur une ligne → L'élément part à la corbeille.
- **5.14** · Les deux · auto · Clic droit sur un dossier → Menu : Nouvelle note ici, Nouveau dossier ici, Nouveau canvas ici, Ajouter aux favoris, Renommer, Mettre à la corbeille.
- **5.15** · Les deux · auto · Clic droit sur un fichier → Menu : Ouvrir dans un nouvel onglet, Ouvrir à droite, Dupliquer, Ajouter aux favoris, Renommer, Mettre à la corbeille (en rouge).
- **5.16** · Les deux · auto · Dans un menu contextuel : flèches haut et bas, Entrée, Échap, clic à côté → Navigation, exécution de l'entrée, fermeture dans les deux derniers cas.
- **5.17** · Les deux · auto · Clic droit tout près du bord droit ou bas de la fenêtre → Le menu reste entièrement visible.
- **5.18** · Les deux · auto · « Nouvelle note ici » → Une note « Sans titre » est créée dans le dossier et s'ouvre, titre sélectionné.
- **5.19** · Les deux · auto · « Nouvelle note ici » deux fois de plus → « Sans titre 1 » puis « Sans titre 2 ».
- **5.20** · Les deux · auto · « Nouveau dossier ici » → « Nouveau dossier » est créé, le parent s'ouvre et le nom est en modification.
- **5.21** · Les deux · auto · « Ouvrir à droite » sur une note → L'écran se divise et la note s'ouvre à droite.
- **5.22** · Les deux · auto · « Dupliquer » une note → Une copie « Nom 1 » est créée à côté et s'ouvre, avec le même contenu.
- **5.23** · Les deux · auto · « Dupliquer » une image → Une copie identique est créée.
- **5.24** · Les deux · auto · Renommer sur place, puis Entrée → Le fichier est renommé (extension conservée) et les liens sont mis à jour partout.
- **5.25** · Les deux · auto · Renommer sur place, puis Échap → Le nom ne change pas.
- **5.26** · Les deux · auto · Renommer sur place, puis cliquer ailleurs → Le renommage est validé.
- **5.27** · Les deux · auto · Renommer avec un caractère interdit (`\ / : * ? " < > | # ^ [ ]`) → Message rouge, nom inchangé.
- **5.28** · Les deux · auto · Renommer vers un nom déjà pris dans le même dossier → Message rouge « Un fichier nommé … existe déjà ici », nom inchangé.
- **5.29** · Les deux · auto · Renommer en changeant seulement la casse (« note » en « Note ») → Renommage réussi, liens mis à jour.
- **5.30** · Les deux · auto · Glisser une note sur un dossier → Le dossier est surligné en rose pendant le survol ; la note y est déplacée et ses liens restent valides.
- **5.31** · Les deux · auto · Glisser un dossier dans un autre dossier → Il est déplacé avec tout son contenu.
- **5.32** · Les deux · auto · Glisser un élément dans le vide sous l'arborescence → Il est déplacé à la racine du coffre.
- **5.33** · Les deux · auto · Glisser un dossier dans l'un de ses sous-dossiers → Rien ne se passe.
- **5.34** · Les deux · auto · Glisser une note sur un fichier de son propre dossier → Rien ne se passe (elle y est déjà).
- **5.35** · Les deux · auto · Glisser une note de l'arborescence dans le texte d'une note en écriture → Un lien `[[Nom]]` est inséré à l'endroit du dépôt.
- **5.36** · Les deux · auto · Glisser une note sur la barre d'onglets → Elle s'ouvre dans un nouvel onglet de ce panneau.
- **5.37** · Les deux · auto · Dans un coffre de plusieurs milliers de fichiers, tout déplier et faire défiler → Le défilement reste fluide.
- **5.38** · Les deux · auto · Ouvrir un coffre vide → Message « Ce coffre est vide » et bouton « Nouvelle note ».
- **5.39** · Les deux · auto · Icônes « Nouvelle note » et « Nouveau dossier » à côté de NOTES → Création à la racine, ou dans le dossier réglé pour les nouvelles notes.
- **5.40** · Les deux · auto · Commande « Montrer cette note dans la barre latérale » → Les dossiers parents s'ouvrent, la ligne est encadrée de rose un instant et défile dans la vue, sans voler le focus du texte.
- **5.41** · Bureau · auto · Clic droit sur une note › « Afficher dans le gestionnaire de fichiers » → Le gestionnaire de fichiers s'ouvre sur son dossier, la note sélectionnée.
- **5.42** · Bureau · auto · Même chose sur un dossier → Son dossier parent s'ouvre, le dossier sélectionné.
- **5.43** · Bureau · auto · Même chose sur un canvas, une image, un PDF → Le bon fichier est sélectionné.
- **5.44** · Web · auto · Clic droit sur une note ou un dossier → Aucune entrée « gestionnaire de fichiers ».

## 6. Barres et panneaux : coffre, favoris, tags, barre d'état

- **6.1** · Les deux · auto · Cliquer le nom du coffre en haut → Menu : Réglages, Changer de coffre.
- **6.2** · Les deux · auto · « Changer de coffre » juste après avoir écrit → Retour à l'accueil ; ce qui a été tapé est enregistré.
- **6.3** · Les deux · auto · Bouton « panneau de gauche » de la barre du haut → Le panneau de gauche disparaît ; le bouton reste, non enfoncé.
- **6.4** · Les deux · auto · Cliquer de nouveau ce bouton → Le panneau de gauche revient.
- **6.5** · Les deux · auto · Bouton « Aujourd'hui » de la barre d'activité → La note du jour s'ouvre, créée si besoin.
- **6.6** · Les deux · auto · Bouton « Graphe » de la barre d'activité → Le graphe s'ouvre dans un nouvel onglet.
- **6.7** · Les deux · auto · Coffre sans favori → La section « Favoris » n'apparaît pas.
- **6.8** · Les deux · auto · Ajouter une note aux favoris → La section « Favoris » apparaît avec elle.
- **6.9** · Les deux · auto · Cliquer un favori, puis Ctrl+clic → La note s'ouvre, puis dans un nouvel onglet ; le favori de la note active est sur fond jaune.
- **6.10** · Les deux · auto · Cliquer un favori de titre importé d'Obsidian → La note s'ouvre à ce titre.
- **6.11** · Les deux · auto · Cliquer un favori de dossier → Le dossier est montré dans l'arborescence.
- **6.12** · Les deux · auto · Cliquer un favori de recherche → Le champ de recherche se remplit avec la requête.
- **6.13** · Les deux · auto · Cliquer un groupe de favoris → Il s'ouvre et se ferme ; son contenu est indenté.
- **6.14** · Les deux · auto · Clic droit sur un favori, puis « Retirer des favoris » → Il disparaît de la liste.
- **6.15** · Les deux · auto · Cliquer le titre « FAVORIS » → La section se replie puis se déplie.
- **6.16** · Les deux · auto · Regarder la section TAGS → Tags triés, compteurs alignés, `#` en rose.
- **6.17** · Les deux · auto · Tag imbriqué (`#projet/alpha`) → Un chevron affiche les sous-tags ; le parent compte aussi les notes des enfants.
- **6.18** · Les deux · auto · Cliquer un tag → Le champ de recherche contient `tag:#nom` et liste les notes.
- **6.19** · Les deux · auto · Cliquer le titre « TAGS » → La section se replie puis se déplie.
- **6.20** · Les deux · auto · Regarder la barre d'état → « Sur cet appareil » avec un petit carré, les compteurs de la note active et un bouton « Apparence ».
- **6.21** · Les deux · auto · Bouton Réglages en bas de la barre d'activité → Les réglages s'ouvrent dans un onglet.
- **6.22** · Bureau · auto · Menu du nom du coffre › « Ouvrir le dossier du coffre » → Le gestionnaire de fichiers montre le contenu du coffre.
- **6.23** · Web · auto · Menu du nom du coffre → Pas d'entrée « Ouvrir le dossier du coffre ».
- **6.24** · Les deux · auto · Menu du nom du coffre dans la démo → Pas d'entrée « Ouvrir le dossier du coffre » (rien n'est sur le disque).
- **6.25** · Les deux · auto · Champ « Rechercher, ouvrir une note ou lancer une commande » au milieu de la barre du haut → La palette s'ouvre pour chercher une note ; le raccourci (Ctrl+K) est écrit dans le champ.
- **6.26** · Les deux · auto · Barre d'activité : le bouton d'un panneau, son côté fermé → Le côté s'ouvre, le panneau se déplie et se montre ; celui de Recherche met le curseur dans le champ.
- **6.27** · Les deux · auto · Clic droit sur le titre d'un panneau → « Mettre à droite » (ou à gauche), « Monter », « Descendre », « Masquer ce panneau » ; chaque choix s'applique aussitôt.
- **6.28** · Les deux · auto · Glisser le titre d'un panneau de l'autre côté, sur un autre panneau → Il se place juste avant lui ; un pointillé rose montre la zone pendant le glisser.
- **6.29** · Les deux · auto · Masquer « Tags », puis palette › « Afficher le panneau « Tags » » → Il revient à sa place classique, déplié, son côté ouvert.
- **6.30** · Les deux · auto · Barre d'état › « Apparence » → Un panneau rapide : thèmes, papier, taille du texte, largeur des lignes, disposition, et « Tous les réglages d'apparence » ; chaque choix s'applique aussitôt ; Échap ou un clic ailleurs le ferme.
- **6.31** · Les deux · auto · Fenêtre de moins de 760 px → La barre du haut garde le coffre, une loupe et les boutons des panneaux ; pas de barre d'activité.
- **6.32** · Les deux · auto · « Concentration » depuis l'apparence rapide, puis palette › « Disposition : Classique » (et les autres) → Panneaux et barres disparaissent ; la commande les rend.
- **6.33** · Les deux · auto · Regarder la barre d'activité, puis décocher « Noms sous les boutons de la barre d'activité » (Réglages › Disposition) → Chaque bouton porte son nom : les panneaux du côté gauche, puis Aujourd'hui, Graphe, Réglages ; sans les noms, la barre rétrécit aux seules icônes.

## 7. Onglets et divisions

- **7.1** · Les deux · auto · Ouvrir une note depuis l'arborescence, puis une autre → La deuxième remplace la première dans l'onglet ; le bouton précédent revient à la première.
- **7.2** · Les deux · auto · Bouton « + » de la barre d'onglets → Un onglet vide propose Créer une note, Chercher une note et Ouvrir la note du jour, avec leurs raccourcis.
- **7.3** · Les deux · auto · Cliquer chacune des trois actions de l'onglet vide → Chacune fait ce qu'elle annonce.
- **7.4** · Les deux · auto · Cliquer un onglet → Il devient actif, avec un trait bleu en haut.
- **7.5** · Les deux · auto · Croix d'un onglet → Il se ferme et l'onglet voisin devient actif.
- **7.6** · Les deux · auto · Clic molette sur un onglet → Il se ferme.
- **7.7** · Bureau · auto · Ctrl+W → L'onglet actif se ferme.
- **7.8** · Web · auto · Alt+W → L'onglet actif se ferme (Ctrl+W fermerait l'onglet du navigateur).
- **7.9** · Les deux · auto · Fermer le dernier onglet → Un onglet vide le remplace.
- **7.10** · Les deux · auto · Clic droit sur un onglet → Menu : Épingler, Fermer.
- **7.11** · Les deux · auto · Épingler un onglet, puis ouvrir une autre note → L'épingle remplace la croix ; la note s'ouvre dans un nouvel onglet au lieu de remplacer l'onglet épinglé.
- **7.12** · Les deux · auto · Désépingler → La croix revient.
- **7.13** · Les deux · auto · Glisser un onglet parmi les autres → Un trait rose indique la position ; l'onglet est déplacé.
- **7.14** · Les deux · auto · Ctrl+clic sur une note déjà ouverte dans un autre onglet du panneau → L'onglet existant est activé, sans doublon.
- **7.15** · Les deux · auto · Ctrl+\ → Deux panneaux côte à côte ; la note active est aussi ouverte à droite.
- **7.16** · Les deux · auto · « Diviser en bas » (menu … ou palette) → Deux panneaux l'un au-dessus de l'autre.
- **7.17** · Les deux · auto · Glisser la séparation entre deux panneaux → Les tailles changent ; la poignée devient rose au survol.
- **7.18** · Les deux · auto · Cliquer dans un panneau puis dans l'autre → L'onglet actif du panneau actif a un trait bleu foncé ; celui de l'autre est grisé.
- **7.19** · Les deux · auto · Fermer le dernier onglet d'un des deux panneaux → Ce panneau disparaît, l'autre prend toute la place.
- **7.20** · Les deux · auto · Diviser à droite, puis en bas dans le panneau de droite → Les divisions s'imbriquent correctement.
- **7.21** · Les deux · auto · Même note dans deux panneaux, écrire dans l'un → Le texte apparaît dans l'autre.
- **7.22** · Les deux · auto · Boutons précédent et suivant de la barre de note → Navigation dans l'historique de l'onglet ; grisés quand il n'y a rien.
- **7.23** · Les deux · auto · Ctrl+Alt+Gauche et Ctrl+Alt+Droite, curseur dans le texte → Précédent et suivant.
- **7.24** · Les deux · auto · Alt+Gauche et Alt+Droite hors de l'éditeur → Précédent et suivant (dans l'éditeur, ces touches déplacent le curseur).
- **7.25** · Les deux · auto · Relancer l'app ou recharger la page → Onglets, divisions et tailles sont restaurés.
- **7.26** · Les deux · auto · Mettre à la corbeille une note ouverte dans un onglet → L'onglet se ferme.
- **7.27** · Les deux · auto · Renommer une note ouverte → L'onglet affiche le nouveau nom, sans recharger l'éditeur : le curseur reste en place.
- **7.28** · Les deux · auto · Ouvrir une vingtaine d'onglets → La barre défile horizontalement ; les titres longs sont tronqués.

## 8. Barre d'une note et titre

- **8.1** · Les deux · auto · Cliquer un dossier du fil d'Ariane au-dessus de la note → Le dossier est montré dans l'arborescence ; le nom de la note est en gras.
- **8.2** · Les deux · auto · Boutons « Écrire » et « Lire » → Bascule entre l'aperçu en direct et la lecture ; le mode actif est sur fond bleu foncé.
- **8.3** · Les deux · auto · Ctrl+E, curseur dans le texte, puis en lecture → Bascule d'écriture en lecture, puis retour.
- **8.4** · Les deux · auto · Menu …, « Afficher la source Markdown » → Le bouton affiche « Source » et tout le Markdown brut est visible ; recommencer revient à l'aperçu.
- **8.5** · Les deux · auto · Bouton rose « Partager » → Une fenêtre explique que le partage arrive avec la synchronisation et propose « Copier un lien vers cette note » et « Markdown ».
- **8.6** · Les deux · auto · « Copier un lien vers cette note », puis coller ailleurs → `[[Nom de la note]]` ; l'icône devient une coche un instant.
- **8.7** · Les deux · auto · « Markdown », puis coller ailleurs → Le contenu complet de la note.
- **8.8** · Les deux · auto · Fermer la fenêtre Partager avec la croix, avec Échap, puis par un clic à côté → Elle se ferme dans les trois cas.
- **8.9** · Les deux · auto · Icône de marque-page de la barre de note → Elle devient rose et la note entre dans les favoris ; recliquer la retire.
- **8.10** · Les deux · auto · Chaque entrée du menu … (diviser à droite, diviser en bas, source, graphe autour de cette note, montrer dans la barre latérale, copier un lien, mettre à la corbeille) → Chacune fait ce qu'elle dit.
- **8.11** · Les deux · auto · Masquer le panneau de droite → La note prend la place ; le bouton de la barre du haut le rouvre.
- **8.12** · Les deux · auto · Modifier le grand titre de la note, puis Entrée → Le fichier est renommé et tous les liens sont mis à jour.
- **8.13** · Les deux · auto · Titre modifié, Entrée, puis taper aussitôt → La frappe va dans le texte, même si le renommage prend un instant.
- **8.14** · Les deux · auto · Modifier le titre, puis Échap → Rien n'est renommé, l'ancien titre revient.
- **8.15** · Les deux · auto · Modifier le titre, puis cliquer ailleurs → Le renommage est validé.
- **8.16** · Les deux · auto · Vider le titre, puis valider → L'ancien nom revient.
- **8.17** · Les deux · auto · Mettre un caractère interdit dans le titre (`/`, `#`, `:`…) → Message rouge, ancien nom rétabli.
- **8.18** · Les deux · auto · Donner au titre le nom d'une note du même dossier → Message rouge, ancien nom rétabli.
- **8.19** · Les deux · auto · Écrire un titre très long → Le titre passe sur plusieurs lignes.
- **8.20** · Les deux · auto · Créer une note (Ctrl+N, ou Alt+N sur le web) → Le titre « Sans titre » est sélectionné : taper le remplace directement.
- **8.21** · Les deux · auto · F2 dans une note → Le titre prend le focus, texte sélectionné.
- **8.22** · Les deux · auto · Écrire en regardant la barre d'état en bas → Mots, caractères et rétroliens se mettent à jour, chiffres alignés.
- **8.23** · Les deux · auto · Cliquer « N rétroliens » dans la barre d'état, le panneau de droite masqué → Il s'ouvre sur les rétroliens.
- **8.24** · Les deux · auto · Supprimer avec un autre programme une note ouverte → Son onglet se ferme.
- **8.25** · Bureau · auto · Menu « ⋯ » d'une note › « Afficher dans le gestionnaire de fichiers » → Son dossier s'ouvre, la note sélectionnée.
- **8.26** · Les deux · auto · Ouvrir une note que le système refuse de lire (droits retirés : chmod 000) → « Impossible de lire cette note : le système refuse l'accès à cet emplacement. » au lieu d'une page vide.

## 9. Éditeur : écriture et mise en forme

- **9.1** · Les deux · auto · Taper du texte, puis ouvrir le fichier dans un autre éditeur → Le curseur est rose ; le fichier est enregistré un instant après la frappe.
- **9.2** · Les deux · auto · Écrire puis fermer aussitôt l'app (ou l'onglet du navigateur) → Rien n'est perdu à la réouverture.
- **9.3** · Les deux · auto · Ctrl+Z, Ctrl+Maj+Z et Ctrl+Y → Annuler, puis rétablir.
- **9.4** · Les deux · auto · Sélectionner du texte → Fond rose translucide.
- **9.5** · Les deux · auto · Écrire des titres de `#` à `######` → Titres de tailles décroissantes ; les `#` n'apparaissent que sur la ligne du curseur.
- **9.6** · Les deux · auto · `**gras**`, puis Ctrl+B sur une sélection, puis Ctrl+B encore → Gras, puis le gras est retiré.
- **9.7** · Les deux · auto · `*italique*`, puis Ctrl+I sur une sélection → Italique ; Ctrl+I encore le retire.
- **9.8** · Les deux · auto · `==surligné==`, puis Ctrl+Maj+H sur une sélection → Fond jaune.
- **9.9** · Les deux · auto · `~~barré~~`, puis Ctrl+Maj+X sur une sélection → Texte barré.
- **9.10** · Les deux · auto · Code en ligne entre accents graves → Police à chasse fixe sur fond gris.
- **9.11** · Les deux · auto · Déplacer le curseur sur une ligne mise en forme puis ailleurs → Les marqueurs (`**`, `==`, accents graves) apparaissent grisés sur la ligne du curseur et disparaissent ailleurs.
- **9.12** · Les deux · auto · Cliquer hors de l'éditeur → Plus aucune syntaxe visible ; la note se lit comme en lecture.
- **9.13** · Les deux · auto · Liste `- ` puis Entrée, puis Entrée sur un élément vide → Un nouveau `- ` est ajouté, puis la liste se termine.
- **9.14** · Les deux · auto · Tab et Maj+Tab dans une liste → Indentation, puis désindentation.
- **9.15** · Les deux · auto · Liste à puces, curseur ailleurs → Les `-` deviennent des points ronds.
- **9.16** · Les deux · auto · Liste numérotée `1. ` puis Entrée → `2. ` est ajouté automatiquement.
- **9.17** · Les deux · auto · Tâche `- [ ] `, puis cliquer la case → Case à cocher ; le clic la coche (`[x]` dans le fichier) et barre la ligne.
- **9.18** · Les deux · auto · Ctrl+L trois fois sur une ligne de texte → `- [ ] texte`, puis tâche cochée, puis décochée.
- **9.19** · Les deux · auto · Tâches `- [-]` et `- [/]` → Cases cochées, lignes barrées (statuts d'Obsidian).
- **9.20** · Les deux · auto · Citation `> texte` → Barre de points en demi-teinte à gauche, texte grisé.
- **9.21** · Les deux · auto · Encadrés `[!tip]`, `[!warning]`, `[!danger]`, `[!note]`, `[!question]`, `[!quote]` → Fonds teintés vert, orange, rouge, bleu, violet, gris, avec un badge au nom du type.
- **9.22** · Les deux · auto · Encadré repliable `> [!note]- Titre` → En écriture, le contenu reste visible ; en lecture, il est replié.
- **9.23** · Les deux · auto · Blocs de code avec langage (js, python, css, bash…) → Coloration syntaxique sur fond gris.
- **9.24** · Les deux · auto · `---` seul sur une ligne, curseur ailleurs → Une ligne de points horizontale.
- **9.25** · Les deux · auto · Formule `$x^2$`, curseur ailleurs → Formule rendue ; à la première formule, la source s'affiche une fraction de seconde.
- **9.26** · Les deux · auto · Bloc `$$` sur plusieurs lignes, puis cliquer dessus → Formule centrée ; le clic montre la source.
- **9.27** · Les deux · auto · Commentaire `%%texte%%` et bloc entre deux lignes `%%` → Texte grisé en italique.
- **9.28** · Les deux · auto · Identifiant de bloc ` ^mon-bloc` en fin de ligne → Petit texte grisé.
- **9.29** · Les deux · auto · Tableau Markdown en écriture → Il reste en source (le rendu des tableaux se fait en lecture).
- **9.30** · Les deux · auto · Ctrl+F dans l'éditeur → Panneau de recherche en haut de la note : chercher, suivant, précédent, remplacer, casse, expressions régulières.
- **9.31** · Les deux · auto · Réglage « Vérifier l'orthographe » activé, écrire une faute → Elle est soulignée.
- **9.32** · Les deux · auto · Coller du texte copié depuis une page web → Collé en texte.
- **9.33** · Les deux · auto · Note de plusieurs milliers de lignes → Frappe et défilement restent fluides.
- **9.34** · Les deux · auto · Fichier aux fins de ligne Windows (CRLF) → Il s'affiche et se modifie normalement.

## 10. Éditeur : liens, intégrations, tags, propriétés

- **10.1** · Les deux · auto · `[[Note existante]]`, curseur ailleurs → Lien souligné de rose, sans crochets.
- **10.2** · Les deux · auto · Cliquer un lien hors de la ligne du curseur → La note s'ouvre.
- **10.3** · Les deux · auto · Ctrl+clic sur un lien → La note s'ouvre dans un nouvel onglet.
- **10.4** · Les deux · auto · Clic simple sur un lien de la ligne du curseur, puis Ctrl+clic → Le clic place le curseur pour modifier ; Ctrl+clic ouvre.
- **10.5** · Les deux · auto · `[[Note|alias]]` → Le lien affiche « alias ».
- **10.6** · Les deux · auto · Cliquer `[[Note#Titre]]` → La note s'ouvre et défile jusqu'au titre.
- **10.7** · Les deux · auto · Cliquer `[[Note#^bloc]]` → La note s'ouvre au bloc.
- **10.8** · Les deux · auto · Cliquer `[[#Titre]]` → Défilement jusqu'au titre dans la même note.
- **10.9** · Les deux · auto · `[[Note qui n'existe pas]]`, puis clic → Pointillés gris ; le clic crée la note (dans le dossier des nouvelles notes) et l'ouvre.
- **10.10** · Les deux · auto · Cliquer `[[Dossier/Note inexistante]]` → La note est créée dans ce dossier.
- **10.11** · Les deux · auto · Cliquer un lien Markdown `[texte](Note.md)` → La note s'ouvre.
- **10.12** · Les deux · auto · Lien externe `[site](https://…)` ou adresse nue, puis clic → Petite flèche après le lien ; le navigateur s'ouvre (navigateur du système sur le bureau, nouvel onglet sur le web).
- **10.13** · Les deux · auto · `![[image.png]]`, curseur ailleurs → L'image s'affiche.
- **10.14** · Les deux · auto · `![[image.png|200]]` et `![[image.png|200x100]]` → L'image est redimensionnée.
- **10.15** · Les deux · auto · `![](https://…/image.png)` → L'image distante s'affiche.
- **10.16** · Les deux · auto · `![[Note]]` seul sur sa ligne → Note intégrée avec un en-tête (son nom en capitales, cliquable).
- **10.17** · Les deux · auto · `![[Note#Titre]]` et `![[Note#^bloc]]` → Seule la section ou le bloc est intégré.
- **10.18** · Les deux · auto · `![[fichier.pdf]]`, `![[son.mp3]]`, `![[video.mp4]]` → Lecteurs PDF, audio et vidéo intégrés.
- **10.19** · Les deux · auto · `![[Inexistant.png]]` → Le nom s'affiche souligné en pointillés.
- **10.20** · Les deux · auto · Cliquer sur une intégration → La syntaxe apparaît pour la modifier.
- **10.21** · Les deux · auto · Une note qui s'intègre elle-même → Message « Cette note s'intègre elle-même », sans boucle.
- **10.22** · Les deux · auto · `#tag` dans le texte, puis clic → Pastille grise ; le clic filtre la barre latérale sur ce tag.
- **10.23** · Les deux · auto · `#123` → Pas un tag (Obsidian exige une lettre).
- **10.24** · Les deux · auto · En-tête YAML en tête de note, curseur ailleurs → Carte « PROPRIÉTÉS » lisible, tags en pastilles.
- **10.25** · Les deux · auto · Cliquer la carte Propriétés, puis placer le curseur ailleurs → Le YAML apparaît pour être modifié, puis la carte revient.
- **10.26** · Les deux · auto · YAML invalide → La carte affiche le message d'erreur en rouge, sans plantage.
- **10.27** · Les deux · auto · Taper `---` en première ligne d'une note existante, sans fermer → Rien ne se transforme tant que le second `---` n'est pas écrit.

## 11. Autocomplétion et pièces jointes

- **11.1** · Les deux · auto · Taper `[[` → `]]` est ajouté automatiquement et la liste des notes s'ouvre.
- **11.2** · Les deux · auto · Continuer à taper un nom approximatif → Liste filtrée, dossier affiché à droite.
- **11.3** · Les deux · auto · Entrée ou Tab sur une suggestion → Lien complété, curseur après `]]`.
- **11.4** · Les deux · auto · Choisir une suggestion d'alias (l'alias suivi du nom de sa note) → `[[Note|alias]]` est inséré.
- **11.5** · Les deux · auto · Choisir une note dont le nom existe dans deux dossiers → Le lien inséré contient le chemin.
- **11.6** · Les deux · auto · Taper `[[Note#` → Liste des titres de la note.
- **11.7** · Les deux · auto · Taper `[[Note#^` → Liste des identifiants de blocs avec leur texte.
- **11.8** · Les deux · auto · Taper `[[#` → Titres de la note courante.
- **11.9** · Les deux · auto · Taper `#ta`, puis `# ` (dièse et espace) → Tags existants proposés ; rien pour `# `, qui est un titre.
- **11.10** · Les deux · auto · Échap pendant les suggestions → La liste se ferme.
- **11.11** · Les deux · auto · Coller une capture d'écran (Ctrl+V) → Image enregistrée sous « Pasted image AAAAMMJJHHmmss.png » dans le dossier des pièces jointes ; `![[…]]` est inséré.
- **11.12** · Les deux · auto · Glisser une image depuis le gestionnaire de fichiers dans une note → Elle est copiée dans le coffre et intégrée à l'endroit du dépôt.
- **11.13** · Les deux · auto · Glisser plusieurs fichiers d'un coup → Tous sont copiés, une intégration par ligne.
- **11.14** · Les deux · auto · Réglage des pièces jointes sur « ./ », puis coller une image → Elle va dans le dossier de la note.
- **11.15** · Les deux · auto · Coller deux fois la même image → Deux fichiers distincts ; rien n'est écrasé.

## 12. Mode lecture

- **12.1** · Les deux · auto · Passer une note riche en mode Lire → Titres, listes, tableaux (en-têtes en petites capitales), code, citations, encadrés, formules et images sont rendus.
- **12.2** · Les deux · auto · Cocher une tâche en lecture → Le fichier passe à `[x]` et la ligne se barre.
- **12.3** · Les deux · auto · Cliquer le titre d'un encadré repliable, puis Tab et Entrée ou Espace → Il se replie et se déplie, à la souris comme au clavier.
- **12.4** · Les deux · auto · Liens internes, externes et tags en lecture → Mêmes comportements qu'en écriture, Ctrl+clic compris.
- **12.5** · Les deux · auto · Note intégrée en lecture → Son en-tête ouvre la note ; ses tâches ne sont pas cochables.
- **12.6** · Les deux · auto · Bloc de code `mermaid` → Diagramme dessiné, clair ou sombre selon le papier.
- **12.7** · Les deux · auto · Diagramme Mermaid invalide → Message d'erreur rouge dans le bloc, sans plantage.
- **12.8** · Les deux · auto · Notes de bas de page `[^1]` → Rendues en bas de la note, avec renvois.
- **12.9** · Les deux · auto · HTML simple dans une note (`<details>`, `<b>`) → Rendu ; les scripts sont supprimés (voir Sécurité).
- **12.10** · Les deux · auto · Modifier la note dans un autre panneau pendant qu'elle est en lecture → La lecture se met à jour sans perdre la position de défilement.
- **12.11** · Les deux · auto · Changer le réglage des retours à la ligne simples → Le rendu des retours simples change en lecture.
- **12.12** · Les deux · auto · Réglages › Largeur des lignes « Toute la largeur » → Le texte occupe toute la largeur, en écriture comme en lecture.

## 13. Aperçu au survol

- **13.1** · Les deux · auto · En lecture, laisser la souris sur un lien interne une demi-seconde → Une fenêtre d'aperçu montre la note rendue.
- **13.2** · Les deux · auto · Passer rapidement sur un lien → Aucun aperçu.
- **13.3** · Les deux · auto · Déplacer la souris du lien vers l'aperçu → Il reste ouvert ; on peut y faire défiler le texte.
- **13.4** · Les deux · auto · Quitter l'aperçu avec la souris → Il se ferme après un court instant.
- **13.5** · Les deux · auto · Survoler un lien vers un titre ou un bloc → Seule cette section est affichée.
- **13.6** · Les deux · auto · Survoler un lien vers une image → L'image s'affiche.
- **13.7** · Les deux · auto · Survoler un lien vers une note inexistante → « … n'existe pas encore ».
- **13.8** · Les deux · auto · Bouton d'ouverture en haut de l'aperçu, puis Ctrl+clic → La note s'ouvre, puis dans un nouvel onglet ; l'aperçu se ferme.
- **13.9** · Les deux · auto · Cliquer un lien à l'intérieur de l'aperçu → La note visée s'ouvre.
- **13.10** · Les deux · auto · Échap, ou molette hors de l'aperçu → L'aperçu se ferme.
- **13.11** · Les deux · auto · Survoler un lien tout en bas de l'écran → L'aperçu s'ouvre au-dessus du lien, entièrement visible.
- **13.12** · Les deux · auto · En écriture, survoler un lien sans Ctrl, puis avec Ctrl maintenu → Pas d'aperçu, puis aperçu.
- **13.13** · Les deux · auto · Survoler un nom dans la marge (rétroliens, liens sortants) → Aperçu de la note.

## 14. Panneaux de la note (à droite par défaut)

- **14.1** · Les deux · auto · Ctrl+], puis le bouton « panneau de droite » de la barre du haut → Masque puis affiche le panneau de droite.
- **14.2** · Les deux · auto · Regarder RÉTROLIENS → Les notes qui pointent ici, avec un compteur ; chaque extrait montre le lien surligné, sans `[[ ]]`.
- **14.3** · Les deux · auto · Cliquer le nom d'un rétrolien, puis Ctrl+clic → La note s'ouvre, puis dans un nouvel onglet.
- **14.4** · Les deux · auto · Cliquer un extrait de rétrolien → La note s'ouvre avec le curseur sur la ligne du lien.
- **14.5** · Les deux · auto · Rétrolien venant d'une propriété (`responsable: "[[Note]]"`) → Le nom de la propriété s'affiche sous la note.
- **14.6** · Les deux · auto · Cliquer « MENTIONS NON LIÉES » → La section se déplie avec un compteur : les notes qui citent le nom ou un alias sans lien.
- **14.7** · Les deux · auto · Bouton « Lier » d'une mention → Elle devient `[[Note]]`, ou `[[Note|texte]]` si la casse diffère ; elle quitte la liste et entre dans les rétroliens.
- **14.8** · Les deux · auto · Citer le nom de la note dans du code, un lien ou un commentaire → Ces citations ne comptent pas comme mentions.
- **14.9** · Les deux · auto · Cliquer un titre du PLAN, en écriture puis en lecture → Défilement jusqu'au titre dans les deux modes.
- **14.10** · Les deux · auto · LIENS SORTANTS → Notes liées (cliquables, aperçu au survol) et notes inexistantes marquées « pas encore créée », qu'un clic crée.
- **14.11** · Les deux · auto · PROPRIÉTÉS, puis clic sur un tag → Alias, valeurs du YAML et tags en pastilles ; le clic liste ses notes dans le panneau Recherche.
- **14.12** · Les deux · auto · Ouvrir un canvas, un graphe ou une image avec le panneau de droite ouvert → Message « Ces panneaux suivent la note ouverte… ».
- **14.13** · Les deux · auto · Fenêtre de moins de 1180 px de large, ouvrir le panneau de droite, puis cliquer à côté → Il s'ouvre en tiroir par-dessus avec un voile ; le clic sur le voile le ferme.

## 15. Palette

- **15.1** · Les deux · auto · Ctrl+K ou Ctrl+O, sans rien taper → Palette « Chercher une note » : notes récentes, puis notes modifiées récemment.
- **15.2** · Les deux · auto · Taper un nom approximatif ou un alias → Correspondances sur les noms, les chemins et les alias (l'alias suivi du nom de sa note).
- **15.3** · Les deux · auto · Flèches, Entrée, Ctrl+Entrée, clic → Navigation ; ouverture ; ouverture dans un nouvel onglet ; ouverture.
- **15.4** · Les deux · auto · Taper un nom inexistant, puis Maj+Entrée → La dernière ligne propose « Créer la note « … » » ; Maj+Entrée la crée directement.
- **15.5** · Les deux · auto · Taper `Dossier/Nouvelle note`, puis Maj+Entrée → La note est créée dans ce dossier, créé si besoin.
- **15.6** · Les deux · auto · Échap, puis clic hors de la palette → La palette se ferme dans les deux cas.
- **15.7** · Les deux · auto · Ctrl+P ou Ctrl+Maj+P → Palette en mode commandes (`> `), chaque commande avec son raccourci.
- **15.8** · Les deux · auto · Taper `>` dans la palette des notes, puis l'effacer → Passage en mode commandes, puis retour aux notes.
- **15.9** · Les deux · auto · Taper une commande introuvable → « Aucune commande ne correspond ».
- **15.10** · Les deux · auto · Palette des commandes sans note ouverte → Les commandes propres aux notes n'apparaissent pas.
- **15.11** · Les deux · auto · Regarder le bas de la palette → Rappel des touches : flèches, Entrée pour ouvrir, Ctrl+Entrée pour un nouvel onglet, Échap pour fermer.

## 16. Toutes les commandes

- **16.1** · Bureau · auto · Ctrl+N « Créer une note » → Une note « Sans titre » est créée et ouverte, titre sélectionné.
- **16.2** · Web · auto · Alt+N « Créer une note » → Une note « Sans titre » est créée et ouverte, titre sélectionné.
- **16.3** · Les deux · auto · Ctrl+K et Ctrl+O « Chercher une note » → La palette des notes s'ouvre.
- **16.4** · Les deux · auto · Ctrl+P et Ctrl+Maj+P « Afficher les commandes » → La palette des commandes s'ouvre.
- **16.5** · Les deux · auto · Ctrl+Maj+D « Ouvrir la note du jour » → La note du jour s'ouvre.
- **16.6** · Les deux · auto · Ctrl+E « Basculer entre écriture et lecture » → Le mode change.
- **16.7** · Les deux · auto · Palette : « Afficher la source Markdown » → Mode source, puis retour à l'aperçu.
- **16.8** · Bureau · auto · Ctrl+W « Fermer l'onglet » → L'onglet actif se ferme.
- **16.9** · Web · auto · Alt+W « Fermer l'onglet » → L'onglet actif se ferme.
- **16.10** · Les deux · auto · Ctrl+Alt+Gauche, Ctrl+Alt+Droite « Revenir en arrière », « Aller en avant » → Navigation dans l'historique.
- **16.11** · Les deux · auto · Ctrl+\ « Diviser à droite » → Nouveau panneau à droite.
- **16.12** · Les deux · auto · Palette : « Diviser en bas » → Nouveau panneau en bas.
- **16.13** · Les deux · auto · Ctrl+Maj+\ et Ctrl+[ « Afficher ou masquer la barre latérale » → La barre latérale bascule.
- **16.14** · Les deux · auto · Ctrl+] « Afficher ou masquer la marge » → La marge bascule.
- **16.15** · Les deux · auto · Ctrl+G « Ouvrir le graphe » → Le graphe s'ouvre dans un nouvel onglet.
- **16.16** · Les deux · auto · Palette : « Ouvrir le graphe autour de cette note » → Graphe local à droite.
- **16.17** · Les deux · auto · Ctrl+, « Ouvrir les réglages » → Onglet des réglages.
- **16.18** · Les deux · auto · Palette : « Changer de coffre » → Retour à l'accueil.
- **16.19** · Les deux · auto · Palette : « Basculer entre papier de jour et de nuit » → Le thème change.
- **16.20** · Les deux · auto · F2 « Renommer cette note » → Le titre prend le focus.
- **16.21** · Les deux · auto · Palette : « Mettre cette note à la corbeille » → La note part à la corbeille.
- **16.22** · Les deux · auto · Palette : « Montrer cette note dans la barre latérale » → Voir 5.40.
- **16.23** · Les deux · auto · Palette : « Copier un lien vers cette note » → `[[Nom]]` dans le presse-papiers.
- **16.24** · Les deux · auto · Palette : « Ajouter ou retirer cette note des favoris » → Le favori bascule.
- **16.25** · Les deux · auto · Alt+T « Insérer un modèle » → La liste des modèles s'ouvre.
- **16.26** · Les deux · auto · Palette : « Créer un canvas » → Un canvas « Sans titre » est créé et ouvert.
- **16.27** · Les deux · manuel · Sur Mac (si disponible) → Les raccourcis utilisent Cmd et s'affichent ⌘ ⇧ ⌥.
- **16.28** · Bureau · auto · Palette, taper « gestionnaire » → « Montrer cette note dans le gestionnaire de fichiers » ; l'exécuter sélectionne la note dans son dossier.
- **16.29** · Web · auto · Palette, taper « gestionnaire » → La commande n'existe pas.

## 17. Note du jour et modèles

- **17.1** · Les deux · auto · Note du jour pour la première fois → Une note nommée selon le format (par défaut AAAA-MM-JJ) est créée dans le dossier réglé et s'ouvre.
- **17.2** · Les deux · auto · Rouvrir la note du jour le même jour → La même note s'ouvre, sans copie.
- **17.3** · Les deux · auto · Format `dddd D MMMM YYYY` dans les réglages, puis note du jour → Nom du type « mardi 29 septembre 2026 », en français si l'interface l'est.
- **17.4** · Les deux · auto · Modèle de note du jour importé d'Obsidian → La note reprend le modèle, variables remplies.
- **17.5** · Les deux · auto · Créer un dossier « Modèles » (ou « Templates ») avec une note contenant `# {{title}}` et `{{date}} {{time}}` → Le dossier est reconnu sans réglage.
- **17.6** · Les deux · auto · Dans une note, Alt+T, filtrer, Entrée → Le modèle est inséré au curseur, variables remplies (titre de la note, date, heure).
- **17.7** · Les deux · auto · Sélectionner du texte, puis insérer un modèle → Le modèle remplace la sélection.
- **17.8** · Les deux · auto · Modèle avec `{{date:DD/MM/YYYY}}`, `{{time:HH[h]mm}}` et `{{TITLE}}` → Formats personnalisés respectés, casse des variables ignorée.
- **17.9** · Les deux · auto · Alt+T en mode lecture → Le modèle est ajouté à la fin de la note.
- **17.10** · Les deux · auto · Alt+T dans un coffre sans dossier de modèles → Message rouge : créer un dossier « Modèles » ou en choisir un dans les réglages.
- **17.11** · Les deux · auto · Alt+T avec un dossier de modèles vide → Message rouge : le dossier ne contient aucune note.
- **17.12** · Les deux · auto · Choisir un autre dossier dans Réglages, Modèles → C'est lui qui est proposé.
- **17.13** · Les deux · auto · Changer les formats de date et d'heure dans Réglages, Modèles → `{{date}}` et `{{time}}` les utilisent.
- **17.14** · Les deux · auto · Créer une note, taper son titre, Entrée puis Alt+T aussitôt → Le modèle arrive bien dans la note renommée.

## 18. Recherche avancée

- **18.1** · Les deux · auto · `mot1 mot2` dans le champ de la barre latérale → Notes contenant les deux mots.
- **18.2** · Les deux · auto · `mot1 OR mot2` → Notes contenant l'un ou l'autre.
- **18.3** · Les deux · auto · `mot -autre` → Notes contenant « mot » sans « autre ».
- **18.4** · Les deux · auto · `"expression exacte"` → Seulement cette expression, dans cet ordre.
- **18.5** · Les deux · auto · `/\d{4}-\d{2}/` → Recherche par expression régulière.
- **18.6** · Les deux · auto · `file:nom` → Recherche dans les noms de fichiers.
- **18.7** · Les deux · auto · `path:Dossier` → Recherche dans les chemins.
- **18.8** · Les deux · auto · `content:mot` → Recherche dans le texte seulement.
- **18.9** · Les deux · auto · `tag:#projet` → Notes avec ce tag ou un sous-tag (`#projet/alpha`).
- **18.10** · Les deux · auto · `line:(a b)` → a et b sur une même ligne.
- **18.11** · Les deux · auto · `block:(a b)` → a et b dans un même paragraphe.
- **18.12** · Les deux · auto · `section:(a b)` → a et b sous un même titre.
- **18.13** · Les deux · auto · `task:x`, `task-todo:x`, `task-done:x` → Dans les tâches : toutes, à faire, faites.
- **18.14** · Les deux · auto · `match-case:Mot` et `ignore-case:mot` → Casse respectée, puis ignorée.
- **18.15** · Les deux · auto · `[statut]` et `[statut:actif]` → Notes ayant la propriété, puis cette valeur (listes comprises).
- **18.16** · Les deux · auto · `path:(Projets OR Journal) tag:#x` → Les combinaisons avec parenthèses fonctionnent.
- **18.17** · Les deux · auto · Regarder un résultat → Extrait avec la correspondance surlignée et le dossier de la note.

## 19. Graphe

- **19.1** · Les deux · auto · Ctrl+G → Les notes en points d'encre, les liens en traits ; la vue se cadre sur l'ensemble.
- **19.2** · Les deux · auto · Comparer les points → Leur taille grandit avec le nombre de liens.
- **19.3** · Les deux · auto · Survoler un point → Lui et ses voisins restent nets, le reste s'estompe ; ses liens passent en rose, son nom s'affiche.
- **19.4** · Les deux · auto · Cliquer un point, puis Ctrl+clic → La note s'ouvre, puis dans un nouvel onglet.
- **19.5** · Les deux · auto · Glisser un point, fermer puis rouvrir le graphe → Il reste épinglé où il a été lâché (cercle autour), même après réouverture.
- **19.6** · Les deux · auto · Double-cliquer un point épinglé → Il est libéré.
- **19.7** · Les deux · auto · Bouton « Réinitialiser » → Tous les points sont libérés.
- **19.8** · Les deux · auto · Molette → Zoom autour du pointeur ; les noms apparaissent en zoomant.
- **19.9** · Les deux · auto · Glisser le fond → La vue se déplace.
- **19.10** · Les deux · auto · Champ « Filtrer les notes » → Seules les notes correspondantes restent.
- **19.11** · Les deux · auto · Décocher « Notes isolées » → Les notes sans lien disparaissent.
- **19.12** · Les deux · auto · Cocher « Pièces jointes » → Images, PDF et autres apparaissent en points gris.
- **19.13** · Les deux · auto · Cocher « Notes manquantes », puis cliquer l'une d'elles → Points tramés ; le clic crée la note.
- **19.14** · Les deux · auto · Menu … d'une note, « Graphe autour de cette note », puis le curseur « Autour de cette note » → Graphe à droite centré sur la note (en rose) ; 1 à 3 niveaux de voisins.
- **19.15** · Les deux · auto · Fermer puis rouvrir le graphe sans rien épingler → Même disposition.
- **19.16** · Les deux · auto · Graphe en papier de nuit → Couleurs claires, lisibles.
- **19.17** · Les deux · auto · Graphe d'un coffre de plusieurs milliers de notes → Il reste manipulable.
- **19.18** · Les deux · auto · Créer, renommer ou supprimer une note avec le graphe ouvert → Le graphe se met à jour.

## 20. Canvas

- **20.1** · Les deux · auto · Ouvrir « Carte des idées » (démo) ou un canvas Obsidian → Trame de points, groupe, cartes teintées, note intégrée, flèche étiquetée ; la vue se cadre sur l'ensemble.
- **20.2** · Les deux · auto · Palette, « Créer un canvas » → « Sans titre.canvas » est créé et s'ouvre avec un message d'aide.
- **20.3** · Les deux · auto · Clic droit sur un dossier, « Nouveau canvas ici » → Le canvas est créé dans ce dossier.
- **20.4** · Les deux · auto · Glisser le fond → La vue se déplace.
- **20.5** · Les deux · auto · Molette, puis Maj+molette ou pavé tactile → La vue défile verticalement, puis horizontalement.
- **20.6** · Les deux · auto · Ctrl+molette ou pincement → Zoom autour du pointeur ; le pourcentage se met à jour.
- **20.7** · Les deux · auto · Boutons moins, plus et « Tout afficher » → Dézoom, zoom, cadrage sur l'ensemble.
- **20.8** · Les deux · auto · Double-clic sur le fond → Nouvelle carte à cet endroit, en modification.
- **20.9** · Les deux · auto · Écrire du Markdown dans une carte, puis Échap ou clic dehors → La carte affiche le rendu : titres, gras, liens cliquables, tags.
- **20.10** · Les deux · auto · Double-clic sur une carte de texte → Retour en modification.
- **20.11** · Les deux · auto · Entrée avec une seule carte sélectionnée → Elle passe en modification.
- **20.12** · Les deux · auto · Cliquer une carte → Contour rose, poignées sur les quatre côtés, coin rose de redimensionnement ; barre de couleurs en bas.
- **20.13** · Les deux · auto · Maj+clic sur d'autres cartes → Elles s'ajoutent à la sélection ou la quittent.
- **20.14** · Les deux · auto · Maj+glisser sur le fond → Un lasso rose sélectionne les cartes qu'il touche.
- **20.15** · Les deux · auto · Ctrl+A, puis Échap → Tout est sélectionné, puis plus rien.
- **20.16** · Les deux · auto · Glisser une carte, puis avec Alt maintenu → Déplacement par pas de grille de 20 px, puis librement.
- **20.17** · Les deux · auto · Glisser une sélection de plusieurs cartes → Elles bougent ensemble.
- **20.18** · Les deux · auto · Glisser un groupe → Les cartes qu'il contient suivent.
- **20.19** · Les deux · auto · Flèches du clavier, puis Maj+flèches → La sélection bouge de 20 px, puis de 1 px.
- **20.20** · Les deux · auto · Tirer le coin rose → La carte est redimensionnée, avec une taille minimale.
- **20.21** · Les deux · auto · Tirer depuis une poignée de côté jusqu'à une autre carte → Une flèche relie les deux côtés les plus logiques ; pointillés roses pendant le tirage.
- **20.22** · Les deux · auto · Relâcher une flèche dans le vide ou sur la même carte → Rien n'est créé.
- **20.23** · Les deux · auto · Cliquer une flèche → Elle est sélectionnée, en rose.
- **20.24** · Les deux · auto · Double-cliquer une flèche, taper une étiquette, Entrée → L'étiquette s'affiche au milieu ; la vider la retire.
- **20.25** · Les deux · auto · Double-cliquer une étiquette existante → Elle passe en modification.
- **20.26** · Les deux · auto · Suppr ou Retour arrière → Supprime la sélection : cartes avec leurs flèches, ou flèches.
- **20.27** · Les deux · auto · Pastilles de couleur (six couleurs et « Sans couleur ») → Les cartes et flèches sélectionnées changent de teinte ; la pastille courante est cerclée.
- **20.28** · Les deux · auto · Bouton « Grouper la sélection » ou Ctrl+G → Un groupe entoure les cartes, son nom en modification.
- **20.29** · Les deux · auto · Double-cliquer le nom d'un groupe, puis Entrée ou Échap → Renommage, validé dans les deux cas.
- **20.30** · Les deux · auto · Bouton « Dupliquer » ou Ctrl+D → Une copie décalée, flèches internes comprises.
- **20.31** · Les deux · auto · Ctrl+Z, Ctrl+Maj+Z, Ctrl+Y après chaque type d'action (déplacer, redimensionner, supprimer, colorer, texte, flèche) → Annuler et rétablir fonctionnent pour toutes.
- **20.32** · Les deux · auto · Bouton « Ajouter une note ou une image » → Liste des notes et images ; le choix ajoute une carte au centre.
- **20.33** · Les deux · auto · Glisser une note ou une image de l'arborescence sur le canvas → Une carte apparaît à l'endroit du dépôt.
- **20.34** · Les deux · auto · Glisser une image depuis le gestionnaire de fichiers → Elle est copiée en pièce jointe et ajoutée en carte.
- **20.35** · Les deux · auto · En-tête d'une carte de note, puis Ctrl+clic, puis double-clic sur la carte → La note s'ouvre, puis dans un nouvel onglet, puis de nouveau.
- **20.36** · Les deux · auto · Modifier dans un autre onglet une note affichée dans le canvas → La carte se met à jour.
- **20.37** · Les deux · auto · Molette sur une carte de note longue → Le contenu de la carte défile, la vue ne bouge pas.
- **20.38** · Les deux · auto · Carte de lien web → Nom du site, adresse et bouton « Ouvrir » qui ouvre le navigateur.
- **20.39** · Les deux · auto · Groupe avec image de fond (canvas Obsidian) → L'image s'affiche atténuée en fond.
- **20.40** · Les deux · auto · Modifier, fermer puis rouvrir le canvas → Tout est conservé.
- **20.41** · Les deux · auto · Ouvrir un canvas Obsidian sans rien changer, puis vérifier le fichier (git diff ou date) → Le fichier n'a pas été réécrit.
- **20.42** · Les deux · auto · Renommer une note affichée dans un canvas → La carte suit ; le fichier .canvas est mis à jour.
- **20.43** · Les deux · auto · Modifier le .canvas avec un autre programme ou Obsidian pendant qu'il est ouvert → Cobblestone affiche la nouvelle version.
- **20.44** · Les deux · manuel · Rouvrir dans Obsidian un canvas modifié par Cobblestone → Obsidian l'affiche correctement.
- **20.45** · Les deux · auto · Canvas en papier de nuit → Cartes, couleurs et flèches restent lisibles.

## 21. Fichiers joints

- **21.1** · Les deux · auto · Ouvrir une image depuis l'arborescence → Affichée en entier dans l'onglet.
- **21.2** · Les deux · auto · Ouvrir un PDF → Lecteur PDF.
- **21.3** · Les deux · auto · Ouvrir un audio, puis une vidéo → Lecteurs avec contrôles.
- **21.4** · Les deux · auto · Ouvrir un .txt, .json, .csv ou .css → Texte brut.
- **21.5** · Les deux · auto · Ouvrir un format inconnu (.zip) → « Cobblestone ne sait pas encore afficher ce fichier. »
- **21.6** · Les deux · auto · Modifier une image avec un autre programme, puis revenir sur son onglet → La nouvelle version s'affiche.

## 22. Opérations sur les fichiers et liens

- **22.1** · Les deux · auto · Renommer une note liée depuis dix autres notes → Les dix notes sont mises à jour sur le disque.
- **22.2** · Les deux · auto · Renommer une note visée par des liens avec alias, titre, bloc, intégration, lien Markdown et lien dans un tableau (`[[Note\|alias]]`) → Tous sont mis à jour sans perdre alias ni sous-chemin.
- **22.3** · Les deux · auto · Renommer une note vers un nom qui existe dans un autre dossier → Les liens deviennent `[[Dossier/Nom]]` pour rester sans ambiguïté.
- **22.4** · Les deux · auto · Déplacer un dossier de notes → Les liens vers ces notes et les liens relatifs qu'elles contiennent restent valides.
- **22.5** · Les deux · auto · Désactiver « Mettre à jour les liens » dans les réglages, puis renommer → Les liens ne sont pas modifiés et deviennent « pas encore créée ».
- **22.6** · Les deux · auto · Mettre une note à la corbeille → Elle va dans `.trash/` du coffre ; ses liens passent en pointillés.
- **22.7** · Les deux · auto · Mettre à la corbeille deux notes du même nom → `.trash/Nom.md` puis `.trash/Nom 1.md`.
- **22.8** · Les deux · auto · Réglage « suppression définitive », puis mettre une note à la corbeille → Le fichier est supprimé du disque.
- **22.9** · Les deux · auto · Mettre un dossier à la corbeille → Tout son contenu part avec ; les onglets concernés se ferment.
- **22.10** · Les deux · auto · Recréer une note supprimée sous le même nom → Les anciens liens pointent de nouveau dessus.
- **22.11** · Les deux · auto · Créer une note portant le nom d'un lien en attente → Le lien devient actif partout.
- **22.12** · Les deux · auto · Noms avec accents, espaces, parenthèses, emoji et apostrophes → Création, renommage et liens fonctionnent.
- **22.13** · Les deux · auto · Deux notes « Nom » dans deux dossiers ; `[[Nom]]` depuis un troisième dossier, puis depuis l'un des deux → Le lien vise la note au chemin le plus court, puis celle du même dossier (comme Obsidian).

## 23. Changements faits par un autre programme

- **23.1** · Les deux · auto · Modifier une note ouverte avec un autre éditeur ou Obsidian → Le texte se met à jour dans Cobblestone, curseur conservé.
- **23.2** · Les deux · auto · Créer une note avec un autre programme → Elle apparaît dans l'arborescence (sur le web, au retour sur la page ou dans les secondes qui suivent).
- **23.3** · Les deux · auto · Supprimer une note avec un autre programme → Elle disparaît et son onglet se ferme.
- **23.4** · Les deux · auto · Renommer une note avec un autre programme → Elle apparaît sous son nouveau nom ; les liens ne sont pas réécrits, puisque c'est l'autre programme qui a renommé.
- **23.5** · Les deux · auto · `git pull` qui modifie plusieurs notes → Tout est pris en compte.
- **23.6** · Les deux · auto · Écrire dans une note pendant qu'un autre programme la modifie → Rien de ce qui est tapé n'est perdu.
- **23.7** · Les deux · auto · Créer un dossier caché (`.git`, `.stfolder`) dans le coffre → Il est ignoré.
- **23.8** · Bureau · auto · Renommer le dossier du coffre ouvert dans le gestionnaire de fichiers, revenir dans l'app → En 3 s au plus, encadré « « … » s'appelle maintenant « … » » ; les onglets restent derrière.
- **23.9** · Bureau · auto · « Suivre ce changement » → Le coffre se rouvre à sa nouvelle place, mêmes onglets, nouveau nom en haut de la barre latérale ; écrire enregistre dans le nouveau dossier.
- **23.10** · Bureau · auto · Pendant l'encadré, redonner au dossier son ancien nom → L'encadré disparaît et le coffre continue normalement.
- **23.11** · Bureau · auto · Renommer le dossier du coffre pendant qu'on écrit → L'ancien dossier n'est jamais recréé ; aucune note n'est perdue.
- **23.12** · Bureau · auto · Mettre le dossier du coffre ouvert à la corbeille → Encadré « introuvable » ; « Fermer le coffre » ramène à l'accueil.
- **23.13** · Bureau · auto · Déplacer le dossier du coffre ouvert sur une clé USB → Encadré « introuvable » (autre disque) ; « Retrouver le dossier… » permet de l'indiquer.

## 24. Réglages

- **24.1** · Les deux · auto · Ctrl+, (ou le pied de la barre, ou le menu du coffre) → Onglet « Réglages » : Général, Apparence, Disposition, Éditeur, Fichiers et liens, Aujourd'hui, Modèles, À propos ; la liste des sections à gauche suit le défilement, et un clic y mène.
- **24.2** · Les deux · auto · Papier : Suivre le système, Papier de jour, Papier de nuit → Le thème change aussitôt ; « Suivre le système » suit le système en direct.
- **24.3** · Les deux · auto · Langue : Auto, English, Français → Toute l'interface change, commandes et palette comprises ; Auto suit la langue du système ou du navigateur.
- **24.4** · Les deux · auto · « Les nouveaux onglets s'ouvrent en » : Écrire, Lire, Source → Appliqué aux notes ouvertes ensuite.
- **24.5** · Les deux · auto · Largeur des lignes : Étroite, Normale, Large, Toute la largeur → La colonne de texte change aussitôt ; le bouton choisi est marqué.
- **24.6** · Les deux · auto · Interrupteur des retours à la ligne simples → Le rendu en lecture change.
- **24.7** · Les deux · auto · Interrupteur « Vérifier l'orthographe » → Le soulignement des fautes s'active et se désactive.
- **24.8** · Les deux · auto · « Les nouvelles notes vont dans » : racine, dossier de la note active, dossier précis → Respecté par Ctrl+N, la palette et les liens en attente.
- **24.9** · Les deux · auto · « Les pièces jointes vont dans » : racine, `./`, dossier précis → Respecté au collage.
- **24.10** · Les deux · auto · Interrupteur « Mettre à jour les liens » → Voir 22.5.
- **24.11** · Les deux · auto · « Les fichiers supprimés vont » : corbeille du coffre, suppression définitive → Voir 22.6 et 22.8.
- **24.12** · Les deux · auto · Aujourd'hui : format et dossier → Voir 17.1 à 17.3.
- **24.13** · Les deux · auto · Modèles : dossier, formats de date et d'heure → Voir 17.12 et 17.13.
- **24.14** · Les deux · auto · À propos → Version et licence AGPL-3.0.
- **24.15** · Les deux · auto · Fermer puis rouvrir le coffre, puis l'app → Réglages du coffre conservés (`.cobblestone/app.json`) ; thème et langue aussi (réglages de l'appareil).
- **24.16** · Les deux · auto · Tab jusqu'à un interrupteur, puis Espace → Il bascule ; contour rose au focus.
- **24.17** · Les deux · auto · Taille du texte : 20 px → Le texte et les titres des notes grossissent en écriture et en lecture ; l'interface garde sa taille.
- **24.18** · Les deux · auto · Écran de 1920 px, largeur « Normale », taille par défaut → Colonne d'environ 700 px, environ 80 caractères par ligne.
- **24.19** · Les deux · auto · Fermer puis rouvrir le coffre → Taille du texte et largeur des lignes conservées.
- **24.20** · Les deux · auto · Ouvrir pour la première fois un coffre Obsidian dont la taille de police est 18 → Cobblestone reprend 18 px.
- **24.21** · Les deux · auto · Grande taille et largeur « Large » dans un canvas, un aperçu au survol, une intégration → Tout reste lisible, rien ne déborde.
- **24.22** · Les deux · auto · Champ « Chercher un réglage » : taper « police », puis un mot sans réglage → Seuls les réglages de police restent, sous leur section ; puis « Aucun réglage ne correspond ».

## 25. Apparence et tailles d'écran

- **25.1** · Les deux · auto · Papier de jour → Fond papier clair, encre bleu nuit, roses et jaunes vifs, grain léger.
- **25.2** · Les deux · auto · Papier de nuit → Fond bleu nuit, encre claire, surlignages lisibles.
- **25.3** · Les deux · auto · Basculer jour et nuit avec une note, un graphe et un canvas ouverts → Tout change de papier ; rien ne devient illisible.
- **25.4** · Les deux · auto · Parcourir toute l'interface avec Tab → Chaque élément qui prend le focus a un contour rose.
- **25.5** · Les deux · auto · Fenêtre de moins de 1180 px → Le panneau de droite devient un tiroir.
- **25.6** · Les deux · auto · Fenêtre de moins de 760 px ou téléphone → Panneaux fermés par défaut, en tiroirs avec voile ; le fil d'Ariane ne garde que le nom.
- **25.7** · Les deux · auto · Redimensionner la fenêtre en continu → Pas de chevauchement ni de défilement horizontal.
- **25.8** · Les deux · auto · Activer « réduire les animations » dans le système → Plus d'animations (tiroirs, apparition des notes).
- **25.9** · Les deux · auto bureau, manuel web · Zoomer et dézoomer (Ctrl+plus, Ctrl+moins) → L'interface reste cohérente.
- **25.10** · Les deux · auto · Réglages › Apparence : thèmes de jour (Atelier, Papier, Kraft, Forêt, Contraste élevé) et de nuit (Atelier nuit, Minuit, Crépuscule) → Un clic applique le thème à toute l'app ; la carte choisie est cochée.
- **25.11** · Les deux · auto · Pointer un thème sans cliquer → L'aperçu en direct le montre ; l'app ne change pas.
- **25.12** · Les deux · auto · Papier de jour choisi, cliquer un thème de nuit → L'app passe en papier de nuit, avec ce thème.
- **25.13** · Les deux · auto · Couleurs du thème : changer l'accent, puis « Revenir aux couleurs du thème » → Liens, boutons et focus prennent la couleur, puis la rendent.
- **25.14** · Les deux · auto · Mettre le texte presque de la couleur du fond → Le message de contraste dit ce qui devient difficile à lire.
- **25.15** · Les deux · auto · Police des notes : Literata ; puis « Celle du thème » avec le thème Papier → Les notes changent de police, en écriture et en lecture ; les titres et l'interface gardent la leur.
- **25.16** · Les deux · auto · Police de l'interface : Atkinson Hyperlegible ; police du code : celle du système → L'interface, puis le code, changent de police.
- **25.17** · Les deux · auto · Densité : Compacte, puis Aérée → Les lignes de l'arborescence et des tags rapetissent, puis grandissent ; le défilement de l'arborescence reste juste.
- **25.18** · Les deux · auto · Coins : Droits, puis Ronds → Boutons, champs et cartes perdent leur arrondi, puis l'accentuent.
- **25.19** · Les deux · auto · Fermer puis rouvrir l'app → Thèmes, couleurs, polices, densité et coins conservés (réglages de l'appareil).
- **25.20** · Les deux · auto · Réglages dans une fenêtre étroite → Les sections passent au-dessus de la page, sans aperçu ; rien ne déborde.
- **25.21** · Les deux · auto · « Nouveau thème à partir de … », le renommer, changer une couleur → Une copie du thème en cours apparaît, choisie ; son nom et ses couleurs se changent directement.
- **25.22** · Les deux · auto · « Exporter », puis « Importer… » ce fichier (sur un autre appareil) ; puis importer un fichier qui n'est pas un thème → Le fichier `.cobblestone-theme.json` garde nom, papier, couleurs et police ; importé, le thème apparaît et s'applique ; le mauvais fichier est refusé avec un message clair.
- **25.23** · Les deux · auto · « Supprimer ce thème » sur un thème à soi → Il disparaît ; l'app revient au thème par défaut de ce papier.
- **25.24** · Les deux · auto · Un fichier .css dans `.cobblestone/snippets` : l'activer dans « Extraits CSS » ; le modifier ailleurs puis « Recharger » ; redémarrer → Il s'applique aussitôt, puis dans sa nouvelle version, et reste actif au prochain lancement.
- **25.25** · Les deux · auto · Ouvrir un coffre Obsidian dont un extrait CSS est activé dans Obsidian → L'extrait est listé avec l'étiquette « Obsidian » et déjà actif ; `.obsidian/` n'est pas modifié.
- **25.26** · Bureau · auto · « Ouvrir le dossier » des extraits CSS → Le dossier `.cobblestone/snippets` est créé s'il manque et s'affiche dans le gestionnaire de fichiers.
- **25.27** · Les deux · auto · Changer de thème de jour (Atelier puis Kraft) avec le graphe ouvert dans un autre onglet → Revenu au graphe, les points ont l'encre du nouveau thème.
- **25.28** · Les deux · auto · Réglages › Disposition : Classique, Concentration, Chercheur, Miroir → Chaque disposition place aussitôt panneaux et barres ; la carte choisie est marquée.
- **25.29** · Les deux · auto · Changer la place d'un panneau (Gauche, Droite, Masqué), puis « Monter » ou « Descendre » → Le schéma et l'app suivent ; la disposition devient « Personnalisée » ; « Revenir à la disposition classique » la rétablit.
- **25.30** · Les deux · auto · Interrupteurs des onglets, de la barre d'état et de la barre d'activité ; largeur des panneaux → Chaque élément apparaît ou disparaît ; les panneaux s'élargissent ou rétrécissent.
- **25.31** · Les deux · auto · Fermer puis rouvrir l'app → La disposition est conservée (réglage de l'appareil).

## 26. Spécifique à l'app web

- **26.1** · Web · auto · Chrome : ouvrir un vrai dossier, écrire, vérifier le fichier sur le disque → Le fichier est modifié.
- **26.2** · Web · manuel · Firefox : créer un coffre du navigateur, écrire, recharger → Le contenu est conservé.
- **26.3** · Web · auto · Regarder l'onglet vide et la palette → Alt+N et Alt+W sont affichés à la place de Ctrl+N et Ctrl+W.
- **26.4** · Web · manuel · Firefox : Alt+T dans une note → La liste des modèles s'ouvre, pas le menu Outils du navigateur.
- **26.5** · Web · auto · Ctrl+P, Ctrl+O, Ctrl+G, Ctrl+K → Les commandes de Cobblestone s'ouvrent, pas l'impression, l'ouverture ou la recherche du navigateur.
- **26.6** · Web · auto · Fermer l'onglet du navigateur juste après avoir écrit → Le texte est enregistré.
- **26.7** · Web · auto · Chrome : modifier un fichier du dossier ouvert avec un autre programme, puis revenir sur la page → Le changement est pris en compte.
- **26.8** · Web · auto · Fenêtre de navigation privée → Les coffres du navigateur disparaissent à la fermeture (comportement normal).
- **26.9** · Web · manuel · Deux onglets du navigateur sur le même coffre → Limite connue : chacun a sa propre vue ; ne pas écrire dans les deux.

## 27. Spécifique à l'app de bureau

- **27.1** · Bureau · auto · Cliquer un lien externe → Il s'ouvre dans le navigateur du système, jamais dans la fenêtre de l'app.
- **27.2** · Bureau · auto · Réduire la fenêtre au minimum → Elle ne descend pas sous 480 × 360.
- **27.3** · Bureau · auto · Regarder le haut de la fenêtre, puis appuyer sur Alt → La barre de menu est masquée ; Alt l'affiche.
- **27.4** · Bureau · auto · Coffres récents avec un long chemin → Le chemin complet est affiché, tronqué par la gauche.
- **27.5** · Bureau · manuel · Coffre sur un disque externe ou un dossier synchronisé (Nextcloud, Syncthing) → Tout fonctionne ; les changements extérieurs sont pris en compte.
- **27.6** · Bureau · auto · Regarder `~/.config/Cobblestone/` → `vaults.json` et `storage.json` y sont.
- **27.7** · Bureau · manuel · Version installée (AppImage ou .deb) → Icône et nom « Cobblestone » dans le menu et la barre des tâches.
- **27.8** · Bureau · auto · Fermer la fenêtre → L'app se quitte.
- **27.9** · Bureau · manuel · Installer le .deb produit par `npm run dist -w @cobblestone/desktop` → L'icône Cobblestone (les pavés) apparaît dans le menu des applications et le dock, pas un engrenage.
- **27.10** · Bureau · manuel · `npm run dev:desktop` sous X11 → La fenêtre porte l'icône Cobblestone.
- **27.11** · Bureau · manuel · App installée depuis une version de test, puis un push sur `main` → Dans l'heure (ou au lancement suivant), « La version … est prête » ; « Redémarrer pour mettre à jour » relance l'app dans la nouvelle version.

## 28. Sécurité

- **28.1** · Les deux · auto · Note contenant `<script>alert(1)</script>`, en écriture puis en lecture → Rien ne s'exécute.
- **28.2** · Les deux · auto · Note contenant `<img src=x onerror="alert(1)">` → Rien ne s'exécute.
- **28.3** · Les deux · auto · Lien `[clic](javascript:alert(1))` → Le clic n'exécute rien.
- **28.4** · Les deux · auto · `<iframe src="https://example.org">` dans une note → Aucune page intégrée ne s'affiche.
- **28.5** · Les deux · auto · Image SVG contenant un script, intégrée avec `![[x.svg]]` → Elle s'affiche comme image ; le script ne s'exécute pas.
- **28.6** · Les deux · auto · Diagramme Mermaid contenant du HTML ou un lien `javascript:` → Neutralisé.
- **28.7** · Les deux · auto · Lien `[x](../../etc/passwd)` → Traité comme une note inexistante ; rien n'est lu hors du coffre.

## 29. Robustesse et performance

- **29.1** · Les deux · auto · Coffre de plus de 5 000 notes → Ouverture en quelques secondes ; recherche et arborescence fluides.
- **29.2** · Les deux · auto · Note de 1 Mo → Elle s'ouvre et se modifie.
- **29.3** · Les deux · auto · Fichier vide et fichier sans extension → Aucune erreur.
- **29.4** · Les deux · auto · Liens cassés partout et intégrations circulaires → Ni boucle ni plantage.
- **29.5** · Les deux · auto · Couper le réseau → Tout fonctionne : les notes sont locales.
- **29.6** · Les deux · manuel · Une heure d'utilisation avec beaucoup d'onglets → Pas de ralentissement notable.
- **29.7** · Les deux · auto · Quitter l'app pendant le déplacement d'un gros dossier → Aucun fichier perdu.
- **29.8** · Les deux · auto · Provoquer des erreurs (dossier supprimé, disque plein, droits retirés) → Toujours une phrase en français ; jamais « Error invoking remote method » ni un code brut comme ENOENT.

## 30. Retour dans Obsidian

- **30.1** · Les deux · manuel · Après la recette, ouvrir la copie du coffre dans Obsidian → Toutes les notes s'ouvrent, rien n'est cassé.
- **30.2** · Les deux · manuel · Suivre dans Obsidian des liens réécrits par Cobblestone → Ils fonctionnent.
- **30.3** · Les deux · manuel · Ouvrir dans Obsidian les canvas créés ou modifiés par Cobblestone → Ils s'affichent.
- **30.4** · Les deux · auto · Regarder les réglages d'Obsidian → Inchangés.
- **30.5** · Les deux · auto · Chercher dans Obsidian les favoris ajoutés dans Cobblestone → Absents, c'est normal : ils sont dans `.cobblestone/`.
- **30.6** · Les deux · manuel · Regarder `.cobblestone/` et `.trash/` dans Obsidian → Obsidian les ignore (dossiers cachés).

## 31. Synchronisation entre appareils

Deux apps de bureau sur le même réseau (la recette automatique lance deux apps sur la même machine).

- **31.1** · Bureau · auto · Réglages › Synchronisation d'un coffre jamais synchronisé → Explication, bouton « Ajouter un appareil », les trois étapes, et le nom de cet appareil, modifiable.
- **31.2** · Bureau · auto · « Ajouter un appareil » sur un premier ordinateur, puis à l'accueil d'un second : « Recevoir un coffre », saisir le code et un nom → Le premier demande d'accepter l'appareil, sous le nom saisi sur le second.
- **31.3** · Bureau · auto · Accepter, puis « Dans un nouveau dossier… » sur le second → Le coffre s'ouvre sur le second avec toutes ses notes et ses pièces jointes, octet pour octet.
- **31.4** · Bureau · auto · Écrire dans une note sur l'un des deux → Le texte arrive sur l'autre en quelques secondes, dans le fichier et dans la note ouverte.
- **31.5** · Bureau · auto · Créer, renommer puis supprimer une note sur l'un → L'autre suit : même nom, liens compris ; la note supprimée part dans sa corbeille.
- **31.6** · Bureau · auto · Saisir un code faux, puis un code mal formé → « Aucun appareil autour n'affiche ce code », puis « Un code a neuf lettres et chiffres » ; rien n'est reçu.
- **31.7** · Bureau · auto · Refuser l'appareil sur le premier → Le second affiche « L'autre appareil a refusé celui-ci » ; le premier propose un nouveau code.
- **31.8** · Bureau · auto · Barre d'état des deux côtés → « À jour · 2 appareils » ; un clic montre l'autre appareil en ligne, « Mettre en pause » et les réglages.
- **31.9** · Bureau · auto · Mettre en pause sur l'un, écrire, reprendre → Rien ne passe pendant la pause ; tout arrive à la reprise.
- **31.10** · Bureau · auto · Retirer le second depuis les réglages du premier → Il quitte la liste ; ce qu'il écrit ensuite n'arrive plus ; sa barre d'état dit « Retiré de ce coffre ».
- **31.11** · Bureau · auto · Fermer le second, écrire sur le premier, rouvrir le second → Il se reconnecte seul et reçoit le texte.
- **31.12** · Bureau · auto · Pendant une pause, créer une note du même nom sur les deux, puis reprendre → Les deux versions sont gardées, l'une nommée « (conflit xxxx) » ; « 1 à vérifier » dans la barre d'état, et la copie est proposée dans les réglages.
- **31.13** · Bureau · auto · Regarder le coffre après la synchronisation → `.cobblestone/sync/vault.bin` y est ; aucune clé secrète dans le coffre ; rien dans `.obsidian/`.
- **31.14** · Web · auto · Réglages › Synchronisation, puis l'accueil, sur le web → Un message dit que la synchronisation arrive dans l'app web ; pas de « Recevoir un coffre » à l'accueil.
- **31.15** · Bureau · manuel · Deux ordinateurs différents sur le même réseau Wi-Fi → Ils se trouvent et se synchronisent comme ci-dessus (le pare-feu peut demander d'autoriser Cobblestone la première fois).
- **31.16** · Bureau · auto · Ouvrir la même note sur les deux et y écrire en même temps → Chaque frappe arrive aussitôt sur l'autre, rien n'est perdu, les deux notes finissent identiques ; le curseur de l'autre appareil s'affiche à son nom.
- **31.17** · Bureau · auto · Créer un dossier vide sur l'un, puis le supprimer → Il apparaît sur l'autre, puis en disparaît.
- **31.18** · Bureau · manuel · Disque plein sur l'un des deux pendant une synchronisation → Barre d'état « N fichiers non écrits » et la raison dans les réglages ; une fois de la place libérée, les fichiers s'écrivent seuls.
