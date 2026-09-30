---
name: Cobblestone
description: Your notes as sheets you own, printed in spot inks — shared by distribution, edited together by overprint.
colors:
  paper: '#F4F4F0'
  paper-2: '#EBEBE4'
  paper-3: '#E1E1D8'
  ink: '#1E2A4F'
  ink-2: '#4B5575'
  ink-3: '#6E7797'
  rule: '#1E2A4F26'
  accent: '#FF48B0'
  accent-deep: '#C0277E'
  yellow: '#FFE800'
  green: '#00A95C'
  green-deep: '#0E7A4A'
  red: '#F15060'
  red-deep: '#C8283C'
  teal: '#00838A'
  orange: '#FF6C2F'
  purple: '#765BA7'
  night-paper: '#15192A'
  night-paper-2: '#1B2034'
  night-paper-3: '#232942'
  night-ink: '#ECEBE4'
  night-ink-2: '#A3A9C0'
  night-accent: '#FF5CBA'
  night-yellow: '#FFE14D'
  danger-plate: '#C8283C'
  on-danger: '#FFFFFF'
  night-danger-plate: '#A51F31'
  night-mark-ink: '#FFF6C4'
typography:
  chrome:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 450
    lineHeight: 1.4
    fontVariation: "'wdth' 92"
  chrome-label:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 650
    letterSpacing: '0.06em'
    fontVariation: "'wdth' 80"
  title:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)'
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: '-0.02em'
    fontVariation: "'wdth' 118"
  body:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '16.5px'
    fontWeight: 400
    lineHeight: 1.65
    fontVariation: "'wdth' 100"
  heading-1:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.84em'
    fontWeight: 780
    lineHeight: 1.25
    fontVariation: "'wdth' 112"
  heading-2:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.4em'
    fontWeight: 740
    fontVariation: "'wdth' 106"
  heading-3:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.16em'
    fontWeight: 720
  settings-title:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 800
    fontVariation: "'wdth' 118"
  launcher-display:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: 'clamp(3rem, 9vw, 5.6rem)'
    fontWeight: 850
    lineHeight: 0.92
    letterSpacing: '-0.035em'
    fontVariation: "'wdth' 125"
  lead:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.15rem'
    lineHeight: 1.5
  code:
    fontFamily: 'Commit Mono, ui-monospace, monospace'
    fontSize: '0.86rem'
rounded:
  none: '0px'
  hairline: '1px'
  image: '2px'
  cut: '3px'
  sheet: '4px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '20px'
  xl: '32px'
  xxl: '56px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.ink}'
    rounded: '{rounded.cut}'
    padding: '6px 14px'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.cut}'
    padding: '6px 12px'
  tree-item-selected:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
  mark:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
---

# Design System: Cobblestone

## Overview

**Creative North Star: "The Community Print Shop"**

Cobblestone looks like a risograph print shop run by the people who use it. A note is a sheet of bright uncoated stock printed in a few spot inks: navy for words, fluorescent pink for what you can act on, yellow for what you marked. Sharing a note is handing out copies; editing together is overprinting, each collaborator one ink drum. The world is flat and printed, never glossy.

It is an operating surface first. The sheet leads and the chrome recedes: a newcomer sees one page to write on, while links, backlinks, search and commands sit where hands expect them. Expression lives in precise details (ink colours, overprint, a type family that stretches from condensed labels to expanded poster titles), never in effects that slow work down.

Rejected on purpose: the charcoal IDE shell with a purple accent, the grey-sidebar white page with emoji icons, any Obsidian look-alike, and cold developer aesthetics.

**Key Characteristics:**

- Paper grounds, ink text: body text is navy ink, never pure black or grey.
- Spot colours have jobs: the accent (pink in the house theme) acts, the mark (yellow) marks, green and red report state. Nothing is decorative.
- Everyone prints their own run: eight themes, colours by role, fonts, density and corners are set in Réglages › Apparence, with a live preview. The roles never change; only their inks do.
- Overprint is the signature: selection, link hover and highlights multiply ink over ink.
- One chrome size (13px): hierarchy comes from weight, case, width, ink and rules.
- Fixed stations: every panel has one place and one job.

## Colors

A restrained print palette: two neutrals (paper and ink) and a small set of spot inks with fixed roles. The values below are the house theme, **Atelier** (day) and **Atelier nuit** (night); every other theme keeps the same roles with other inks (see Themes).

- **Paper** `#F4F4F0` (day stock): the ground of every surface. `paper-2` for the bars, the left zone and inputs, `paper-3` for hover.
- **Ink** `#1E2A4F` (navy): all text and icons. `ink-2` for secondary text (6.7:1), `ink-3` for rules and non-text marks only (4.0:1, never body text).
- **Accent**, fluorescent pink `#FF48B0` in Atelier: the action ink. Primary buttons (accent fill, `on-accent` text, 4.5:1), link underlines, focus rings, the selection overprint. `accent-deep` when the accent must carry text on paper. Tokens: `--accent`, `--accent-deep`, `--on-accent`, `--accent-overprint`.
- **Yellow** `#FFE800`: the marking ink. `==highlights==`, the selected item in lists, search hits.
- **Green / Red** (`green-deep`, `red-deep` for text): sync and task states, always paired with a word and a shape. Destructive actions and error notices print on the `danger-plate` with white text.
- **Plates**: the pressed segment of a control and notices print as a reversed ink plate (`plate` / `on-plate`).
- **Collaborator inks**: pink, teal, orange, purple, green, blue, assigned per person like drums on the press.
- **Night stock** (dark theme): `night-paper` `#15192A` ground with white ink `#ECEBE4`; spot inks brighten, overprint switches from multiply to screen.

Light or dark follows the reading scene: long writing sessions at a desk by daylight get day stock; evening sessions get night stock. Both are complete; the system follows the OS unless the user chooses.

### Themes

A theme is a set of inks for the roles, printed on day stock (light) or night stock (dark). The reader picks one theme for each stock.

- **Built in** (`packages/app/src/themes.ts`): Atelier, Papier (serif notes), Kraft (warm, serif notes), Forêt, Contraste élevé (Atkinson Hyperlegible) by day; Atelier nuit, Minuit (OLED black), Crépuscule (warm, serif notes) by night.
- **Roles a theme sets**: `paper`, `paper-2`, `paper-3`, `ink`, `ink-2`, `ink-3`, `accent`, `on-accent`, `mark`, `mark-ink`, and optionally the font of the notes. `paper-3` and `ink-3` are derived when left out; rules, hover, plates, overprint and the grain are always derived from the roles, so a theme made by a reader is as complete as the built-in ones.
- **Legibility is checked, not hoped for**: every built-in theme passes text 4.5:1 (ink and ink-2 on paper, ink-2 on paper-2, on-accent on accent, mark-ink on mark) and hints 3:1 (ink-3 on paper), in a unit test. The settings run the same check on a reader's colours and say which pair becomes hard to read.
- **Readers' changes**: colours retouched role by role on any theme (kept per theme, with a way back), themes of their own (copied from any theme, renamed, exported as `.cobblestone-theme.json` and imported elsewhere), and CSS snippets (`.cobblestone/snippets`, Obsidian's `.obsidian/snippets` read too).
- Atelier and Atelier nuit are written out in `tokens.css`; other themes set the same custom properties on the root element.

## Typography

One family, Archivo (variable weight and width), carries the whole system; Commit Mono is reserved for code. Readers may change three fonts in the appearance settings, each a token: the interface (`--font`: Archivo, Atkinson Hyperlegible, the system's), the notes (`--font-note`: the theme's, Archivo, Literata, Atkinson Hyperlegible, the system's with or without serifs) and code (`--mono`: Commit Mono or the system's). Titles stay in the interface font, like a poster headline over the text. All fonts ship with the app, so it works offline.

- **Chrome** 13px, weight 450, width 92: every label, button, tab, tree row and menu. No other chrome size exists.
- **Chrome labels** 13px, weight 650, width 80, uppercase, +0.06em tracking: panel titles and section labels.
- **Title** expanded (width 118), weight 800, tight leading: the note title prints like a poster headline.
- **Body** 16.5px/1.65 by default (each vault picks 13 to 24px), width 100, measure 42 times the body size (about 80 characters; 34 narrow, 54 wide). Note headings scale with the body and step down in width and weight from the title (h1 width 112/760, h2 106/720, h3 100/700).
- **Numbers** in dates, counts, sizes and word counts use tabular figures and align in columns.
- **Other steps**: the launcher prints the name at display size (expanded 125, weight 850) with a 1.15rem lead; the settings page title uses 2rem; code is Commit Mono at 0.86rem.

## Layout

- **Top bar** (44px): the vault on the left (its menu: settings, vault folder, switch vault), the command field in the middle ("Search, open a note or run a command", with its shortcut), and the buttons that show or hide the left and right zones.
- **Activity bar** (48px, left edge): one button per shown panel (it opens the panel's zone, unfolds it and brings it into view), then Today and Graph, and Settings at the bottom.
- **Side zones**, left and right, 272px by default (232 narrow, 320 wide): panels stacked in order, each folding by its title. Panels: Search, Bookmarks, Notes (the tree), Tags, Backlinks, Outline, Links out, Properties. A panel goes left, right or hidden — from its title's menu, by dragging its title to the other zone, or in Settings › Layout. The panels about a note show a single line when no note is open.
- **Ready-made layouts**: Classic (finding and files left, the note's context right), Focus (nothing around the text: no panels, tabs or bars), Researcher (search and files left; backlinks, links and outline right), Mirror (Classic swapped). Changing one panel makes the layout Custom. Layouts are a preference of the device; each is also a command in the palette.
- **Sheet** (center): tabs across the top (they can be hidden), then the note at a 70ch measure with generous margins. Sheets can split right or down.
- **Status bar** (28px, can be hidden): where the vault stands (sync status), the active note's words, characters and backlinks, and the Appearance button that opens quick settings (themes, paper, text size, line length, layout).
- Spacing rhythm 4 / 8 / 12 / 20 / 32 / 56. More space above a heading than below it.
- Narrow screens (under 760px): the top bar keeps the vault, a magnifier and the zone buttons; no activity bar; zones open as drawers over the sheet with a scrim; the sheet keeps a 16px gutter. Under 1180px the right zone is a drawer.

## Elevation & Depth

Flat print. Surfaces separate by paper tone and 1px ink rules, not shadows. The only lifted surfaces are sheets laid on top (command palette, menus, dialogs): a real paper shadow with offset and soft blur, `0 12px 32px -8px rgba(20, 25, 50, 0.28)` on day stock. No glass, no glow, no hard zero-blur offset shadows.

## Shapes

Paper is cut, not moulded: `--radius` corners on controls (3px by default; the reader picks square 0, soft 3 or round 8), 4px on sheets laid on top (finder, menus, share), 2px on images, a 1px hairline on marks, square pages, pills only for tags and collaborator badges. Rules are 1px ink at 15% opacity. Halftone dots are the one texture, used for graph nodes and empty-state illustrations; the paper carries a static grain below 3% opacity.

## Components

- **Buttons**: primary is an accent ink block with on-accent text (pink and navy in Atelier); secondary is paper with a 1px ink rule; ghost is ink text that gains a paper-3 ground on hover. 13px, weight 600.
- **Links in notes**: ink text, 2px accent underline offset 3px; hover overprints an accent block behind the word. Unresolved links use a dashed underline in ink-3.
- **Tree rows**: `--row` tall (28px by default; the density setting makes it 24 compact or 34 airy, tags follow), icon and name, tabular counts right-aligned; hover paper-3, selected yellow overprint.
- **Settings**: one page, the sections listed on the left (following the scroll), a search field that keeps only matching settings, and on wide screens a live preview on the right: the app in miniature, painted with the theme pointed at.
- **Tabs**: paper tabs whose active sheet shares the sheet's ground; inactive tabs sit on paper-2.
- **Panels**: a 36px title in chrome labels with a fold chevron and a count; right-click for Move left/right, Up, Down, Hide; drag the title to move it (a dashed accent outline marks the zone, an accent rule the place).
- **Focus**: 2px accent ring offset 2px on every interactive element.
- **Sync status**: named states, each a word and a shape: Synced (filled dot), Syncing (half dot), Offline (hollow dot), Conflict (triangle).
- **Callouts**: a tinted ground of their ink at low strength with an ink title; no coloured side stripe.

## Do's and Don'ts

- **Do** give every spot ink one job and keep it, in every theme.
- **Do** write colours as role tokens (`--accent`, `--mark`…), never as a theme's values: the reader's theme must reach every surface.
- **Do** keep body text in navy ink on paper; check 4.5:1 for every text pair.
- **Do** use overprint (multiply on day stock, screen on night stock) for selection, hover and marks.
- **Do** keep motion damped: sheets feed in with a short ease-out; nothing bounces or snaps.
- **Don't** add a second chrome size, gradients, glass, glow or decorative shadows.
- **Don't** use colour alone for state; always add a word or a shape.
- **Don't** use misregistration or grain anywhere text must be read; the mark and illustrations only.
- **Don't** copy Obsidian's layout, iconography or purple accent.
