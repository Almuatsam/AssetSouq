# Design Brief

## Direction

**Contemporary Business** — chosen from five full visual directions explored
and scored on usability, aesthetics, accessibility, and long-term
maintainability. One disciplined system applied without exception: an 8px
radius everywhere, flat cards with a hairline border, and a single accent
color that carries every button, link, and active state. See the
[recommendation writeup](#why-this-direction) below for the reasoning and
runner-up.

## Style

Professional, disciplined, quiet. Personality comes from precisely-held
hierarchy and spacing, not decoration — nothing here should look louder than
the device someone's trying to register for.

## Colors

One accent (Dusty Blue) carries every interactive element. Semantic colors
(success/warning/danger) are a deliberately different hue family so they're
never confused with the accent.

| Token | Name | Hex | Use |
|---|---|---|---|
| `--color-bg` | Warm Ivory | `#F6F2EA` | Page canvas |
| `--color-surface` | White | `#FFFFFF` | Cards, inputs |
| `--color-surface-alt` | Ivory tint | `#EFE8DA` | Sidebar / top bar |
| `--color-border` | — | `#E2DCCC` | Dividers, table rules |
| `--color-card-border` | — | `#E7E1D3` | Card hairline |
| `--color-ink` | Slate | `#47535F` | Primary text |
| `--color-muted` | — | `#7C8894` | Secondary text |
| `--color-accent` | Dusty Blue | `#6D8698` | Links, icons, tints |
| `--color-accent-strong` | — | `#4F6A7B` | Solid buttons, focus rings (AA on white) |
| `--color-accent-tint` | — | `#E3EBEE` | Active nav / selected state background |
| `--color-success` | Sage (deepened) | `#4C6547` | Positive status only |
| `--color-warning` | Coffee-amber | `#83621F` | Attention-needed status only |
| `--color-danger` | — | `#A24638` | Errors, destructive actions |

Status is never color-only: every chip pairs its color with a text label
(and a dot, not a full fill) so it still reads for colorblind users and in
print.

## Fonts

- **English:** IBM Plex Sans (400 / 500 / 600), self-hosted in
  `frontend/public/fonts/`.
- **Arabic:** IBM Plex Sans Arabic (400 / 500 / 600), same directory —
  deliberately the same type family as the English face so the Arabic build
  never looks like an afterthought next to the English one.
- Both are loaded via `@font-face` in `frontend/src/styles/tokens.css`
  (`font-display: swap`), not a Google Fonts CDN link, so there's no
  external runtime dependency.

## Shape & Elevation

- **Radius:** `8px` everywhere — buttons, cards, inputs, chips. One number,
  no exceptions.
- **Shadow:** none on standard cards (a `1px` border does the separating).
  `--shadow-pop` (a single soft shadow) is reserved for modals, dropdowns,
  and menus only.

## Components

- Dashboard cards — flat, hairline border, optional 3px left-edge stripe in
  a semantic color for at-a-glance status
- Data tables — dense, tabular numerals, sortable headers, pagination
- Filters / search
- Modal / dialog
- Drawer
- Wizard form
- Charts
- Badges / status chips (dot + label, never color-fill only)
- Pagination

## Navigation

Tinted-ivory sidebar (`--color-surface-alt`) plus a slim top bar for search
and account actions. The active sidebar item gets a 2px left accent bar and
a light accent-tint background — not a solid fill, so text stays fully
legible.

## Icons

Lucide Icons, 1.5px stroke, monochrome inheriting the surrounding text
color; switches to the accent color only in an active/selected state.

## Responsive

- Desktop (primary design target)
- Tablet
- Mobile — sidebar/top bar collapse into a single bottom tab bar

## Languages

- English (LTR)
- Arabic (RTL)
- Runtime language switching. The sidebar's left accent bar mirrors to a
  right accent bar in RTL without any direction-specific asset changes.

## Why this direction

Scored against how AssetSouq actually gets used — admins running dense
tables and draws all day, employees dropping in for thirty seconds to
register interest — Contemporary Business won on usability, accessibility,
and long-term maintainability, tying for aesthetics with the next-best
option. Its restraint is the point: the same 8px/one-accent/flat-card system
should still look like one product after years of new screens being added
by different engineers, without a design review re-litigating it each time.

**Runner-up:** Nordic Nature (soft rounded cards, ambient shadow, a warm
gold "winner" accent) scored close behind and is worth revisiting
specifically for the employee-facing device gallery, where a little warmth
pays off more than on an admin table.

Five full directions — including this one, live-built with real dashboard,
table, form, login, dialog, and mobile mockups — were explored before this
choice was made.
