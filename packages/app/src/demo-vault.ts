/**
 * Sample vault shown by "Try the demo". Content is illustrative and labelled
 * as such; it exercises links, embeds, tags, tasks, callouts and math.
 */
export function demoVaultFiles(language = 'en'): Record<string, string> {
  return language.toLowerCase().startsWith('fr') ? FR : EN;
}

const today = new Date().toISOString().slice(0, 10);

const DIAGRAM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200" font-family="sans-serif">
<rect width="480" height="200" fill="#f5f5f1"/>
<g stroke="#22305a" stroke-width="3" fill="none"><path d="M110 100 L240 60 L370 100 L240 150 Z"/></g>
<g fill="#22305a"><circle cx="110" cy="100" r="22"/><circle cx="240" cy="60" r="22"/><circle cx="370" cy="100" r="22"/><circle cx="240" cy="150" r="22"/></g>
<g fill="#ff48b0" style="mix-blend-mode:multiply"><circle cx="116" cy="104" r="22"/></g>
</svg>`;

const FR: Record<string, string> = {
  'Bienvenue.md': `---
tags: [exemple]
aliases: [Accueil]
---
# Bienvenue dans Cobblestone

> [!info] Coffre d'exemple
> Ces notes sont un **exemple** pour découvrir l'application. Rien n'est enregistré : c'est un coffre de démonstration en mémoire.

Tes notes sont de simples fichiers Markdown. Relie-les entre elles avec des doubles crochets : [[Liens et rétroliens]], ou vers un titre précis : [[Mise en forme#Formules|les formules]].

## Par où commencer
- [ ] Ouvre [[Liens et rétroliens]] et regarde le panneau des rétroliens
- [ ] Essaie la palette de commandes avec \`Ctrl+K\`
- [ ] Crée une note du jour pour le ${today}
- [x] Ouvrir Cobblestone

![[schema.svg|360]]

Tu viens d'Obsidian ? Ouvre simplement ton coffre existant : les fichiers restent identiques. #migration
`,
  'Liens et rétroliens.md': `# Liens et rétroliens

Chaque [[Bienvenue|lien]] crée une relation dans les deux sens : la note liée affiche qui parle d'elle.

On peut intégrer une autre note entière avec \`![[...]]\` :

![[Projets/Jardin partagé#Objectif]]

Ou pointer un paragraphe précis grâce à son identifiant de bloc : [[Mise en forme#^idee-cle]].

Les liens vers des notes qui n'existent pas encore restent en attente : [[Idées pour plus tard]].
`,
  'Mise en forme.md': `# Mise en forme

Du **gras**, de l'*italique*, du ==surlignage==, du \`code\` et des ~~ratures~~.

Une idée importante à citer ailleurs. ^idee-cle

## Encadrés
> [!tip] Astuce
> Les encadrés se replient avec \`+\` ou \`-\` après leur type.

> [!warning]- Attention (replié)
> Contenu caché par défaut.

## Formules
L'aire d'un disque vaut $\\pi r^2$, et :

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

%% Ce commentaire n'apparaît qu'en mode édition. %%

## Tableau
| Fonction | Obsidian | Cobblestone |
| --- | --- | --- |
| Synchronisation | payante | gratuite |
| Partage | absent | intégré |
`,
  'Projets/Jardin partagé.md': `---
statut: en cours
responsable: "[[Bienvenue]]"
tags: [projet, exemple]
---
# Jardin partagé

## Objectif
Un exemple de projet : organiser un jardin partagé avec les voisins.

## Tâches
- [x] Trouver le terrain
- [ ] Faire la liste des graines #achats
  - [ ] Tomates
  - [ ] Basilic
- [-] Acheter une serre (abandonné)
`,
  'Journal/2026-09-29.md': `# Journal — exemple

Réunion sur le [[Projets/Jardin partagé|jardin]]. Idée : partager ce coffre avec l'association. #journal
`,
  'schema.svg': DIAGRAM,
};

const EN: Record<string, string> = {
  'Welcome.md': `---
tags: [sample]
aliases: [Home]
---
# Welcome to Cobblestone

> [!info] Sample vault
> These notes are a **sample** to explore the app. Nothing is saved: this demo vault lives in memory.

Your notes are plain Markdown files. Link them with double brackets: [[Links and backlinks]], or to a heading: [[Formatting#Math|math]].

## Getting started
- [ ] Open [[Links and backlinks]] and look at the backlinks
- [ ] Try the command palette with \`Ctrl+K\`
- [ ] Create a daily note for ${today}
- [x] Open Cobblestone

![[diagram.svg|360]]

Coming from Obsidian? Just open your existing vault: the files stay exactly the same. #migration
`,
  'Links and backlinks.md': `# Links and backlinks

Every [[Welcome|link]] works both ways: the linked note shows who mentions it.

Embed a whole note with \`![[...]]\`:

![[Projects/Community garden#Goal]]

Or point at one paragraph with its block id: [[Formatting#^key-idea]].

Links to notes that don't exist yet stay pending: [[Ideas for later]].
`,
  'Formatting.md': `# Formatting

**Bold**, *italic*, ==highlight==, \`code\` and ~~strikethrough~~.

An important idea worth quoting elsewhere. ^key-idea

## Callouts
> [!tip] Tip
> Callouts fold with \`+\` or \`-\` after their type.

> [!warning]- Careful (folded)
> Hidden by default.

## Math
The area of a disc is $\\pi r^2$, and:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

%% This comment only shows while editing. %%

## Table
| Feature | Obsidian | Cobblestone |
| --- | --- | --- |
| Sync | paid | free |
| Sharing | none | built in |
`,
  'Projects/Community garden.md': `---
status: active
owner: "[[Welcome]]"
tags: [project, sample]
---
# Community garden

## Goal
A sample project: run a community garden with the neighbours.

## Tasks
- [x] Find a plot
- [ ] List the seeds #shopping
  - [ ] Tomatoes
  - [ ] Basil
- [-] Buy a greenhouse (dropped)
`,
  'Journal/2026-09-29.md': `# Journal — sample

Meeting about the [[Projects/Community garden|garden]]. Idea: share this vault with the association. #journal
`,
  'diagram.svg': DIAGRAM,
};
