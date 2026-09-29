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
  pink: '#FF48B0'
  pink-deep: '#C0277E'
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
  night-pink: '#FF5CBA'
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
    fontSize: '1.9rem'
    fontWeight: 780
    lineHeight: 1.25
    fontVariation: "'wdth' 112"
  heading-2:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.45rem'
    fontWeight: 740
    fontVariation: "'wdth' 106"
  heading-3:
    fontFamily: 'Archivo Variable, Archivo, system-ui, sans-serif'
    fontSize: '1.2rem'
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
    backgroundColor: '{colors.pink}'
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
- Spot colours have jobs: pink acts, yellow marks, green and red report state. Nothing is decorative.
- Overprint is the signature: selection, link hover and highlights multiply ink over ink.
- One chrome size (13px): hierarchy comes from weight, case, width, ink and rules.
- Fixed stations: every panel has one place and one job.

## Colors

A restrained print palette: two neutrals (paper and ink) and a small set of spot inks with fixed roles.

- **Paper** `#F4F4F0` (day stock): the ground of every surface. `paper-2` for the stack rail and inputs, `paper-3` for hover.
- **Ink** `#1E2A4F` (navy): all text and icons. `ink-2` for secondary text (6.7:1), `ink-3` for rules and non-text marks only (4.0:1, never body text).
- **Fluorescent Pink** `#FF48B0`: the action ink. Primary buttons (pink fill, navy text, 4.5:1), link underlines, focus rings, the selection overprint. `pink-deep` when pink must carry text on paper.
- **Yellow** `#FFE800`: the marking ink. `==highlights==`, the selected item in lists, search hits.
- **Green / Red** (`green-deep`, `red-deep` for text): sync and task states, always paired with a word and a shape. Destructive actions and error notices print on the `danger-plate` with white text.
- **Plates**: the pressed segment of a control and notices print as a reversed ink plate (`plate` / `on-plate`).
- **Collaborator inks**: pink, teal, orange, purple, green, blue, assigned per person like drums on the press.
- **Night stock** (dark theme): `night-paper` `#15192A` ground with white ink `#ECEBE4`; spot inks brighten, overprint switches from multiply to screen.

Light or dark follows the reading scene: long writing sessions at a desk by daylight get day stock; evening sessions get night stock. Both are complete; the system follows the OS unless the user chooses.

## Typography

One family, Archivo (variable weight and width), carries the whole system; Commit Mono is reserved for code.

- **Chrome** 13px, weight 450, width 92: every label, button, tab, tree row and menu. No other chrome size exists.
- **Chrome labels** 13px, weight 650, width 80, uppercase, +0.06em tracking: section labels in the rail and marginalia.
- **Title** expanded (width 118), weight 800, tight leading: the note title prints like a poster headline.
- **Body** 16.5px/1.65, width 100, measure 70ch. Note headings step down in width and weight from the title (h1 width 112/760, h2 106/720, h3 100/700).
- **Numbers** in dates, counts, sizes and word counts use tabular figures and align in columns.
- **Other steps**: the launcher prints the name at display size (expanded 125, weight 850) with a 1.15rem lead; the settings page title uses 2rem; code is Commit Mono at 0.86rem.

## Layout

- **Stack rail** (left, 260px, collapsible): vault name, find field, note tree, tags, and the press status at the bottom.
- **Sheet** (center): tabs across the top, then the note at a 70ch measure with generous margins. Sheets can split right or down.
- **Marginalia** (right, 280px on wide screens): backlinks, outline and properties set in the margin as annotations, not a boxed panel. Below 1200px they fold into a drawer.
- Spacing rhythm 4 / 8 / 12 / 20 / 32 / 56. More space above a heading than below it.
- Narrow screens: rail and marginalia become drawers; the sheet keeps a 16px gutter.

## Elevation & Depth

Flat print. Surfaces separate by paper tone and 1px ink rules, not shadows. The only lifted surfaces are sheets laid on top (command palette, menus, dialogs): a real paper shadow with offset and soft blur, `0 12px 32px -8px rgba(20, 25, 50, 0.28)` on day stock. No glass, no glow, no hard zero-blur offset shadows.

## Shapes

Paper is cut, not moulded: 3px corners on controls, 4px on sheets laid on top (finder, menus, share), 2px on images, a 1px hairline on marks, square pages, pills only for tags and collaborator badges. Rules are 1px ink at 15% opacity. Halftone dots are the one texture, used for graph nodes and empty-state illustrations; the paper carries a static grain below 3% opacity.

## Components

- **Buttons**: primary is a pink ink block with navy text; secondary is paper with a 1px ink rule; ghost is ink text that gains a paper-3 ground on hover. 13px, weight 600.
- **Links in notes**: navy text, 2px pink underline offset 3px; hover overprints a pink block behind the word. Unresolved links use a dashed underline in ink-3.
- **Tree rows**: 28px tall, icon and name, tabular counts right-aligned; hover paper-3, selected yellow overprint.
- **Tabs**: paper tabs whose active sheet shares the sheet's ground; inactive tabs sit on paper-2.
- **Focus**: 2px pink ring offset 2px on every interactive element.
- **Sync status**: named states, each a word and a shape: Synced (filled dot), Syncing (half dot), Offline (hollow dot), Conflict (triangle).
- **Callouts**: a tinted ground of their ink at low strength with an ink title; no coloured side stripe.

## Do's and Don'ts

- **Do** give every spot ink one job and keep it.
- **Do** keep body text in navy ink on paper; check 4.5:1 for every text pair.
- **Do** use overprint (multiply on day stock, screen on night stock) for selection, hover and marks.
- **Do** keep motion damped: sheets feed in with a short ease-out; nothing bounces or snaps.
- **Don't** add a second chrome size, gradients, glass, glow or decorative shadows.
- **Don't** use colour alone for state; always add a word or a shape.
- **Don't** use misregistration or grain anywhere text must be read; the mark and illustrations only.
- **Don't** copy Obsidian's layout, iconography or purple accent.
