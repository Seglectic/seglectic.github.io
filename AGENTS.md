# AGENTS.md — Seglectic Systems Site

## Stack

- **Astro 6** (static output, no SSR)
- **Svelte 5** (component islands if needed)
- **MDX** (content authoring)
- **GitHub Pages** via GitHub Actions — deploys from `master`

## Branch Rules

- Work happens on `dev`, merge to `master` to publish
- Never edit `master` directly
- Push to `master` triggers deploy automatically

## Commands

```sh
npm run dev      # dev server at localhost:4321
npm run build    # production build → dist/
npm run preview  # preview built output
```

## Project Structure

```
src/
  components/     # Astro components
  content/
    projects/     # project MDX files
    devlog/       # devlog MDX files
  layouts/
    Layout.astro  # base HTML shell
  pages/          # routes
  styles/
    global.css    # design tokens — edit this for theme changes
public/
  fonts/          # ABSTRACT.ttf (logo font only)
  images/
    projects/     # hero images per project
    devlog/
scripts/
  import-obsidian-devlog.js  # vault import tool
```

## Design Tokens

All tokens are CSS custom properties in `src/styles/global.css`.

Key values:
- `--accent: #D4531A` — primary orange
- `--font-logo` — Abstract font, used ONLY in the site logo (SiteHeader)
- `--font-mono` — system monospace, used for labels/tags/nav
- `--font-sans` — system sans, used for body and headings
- `--container-max: 1400px` — site-wide max width

## Content Collections

### Projects (`src/content/projects/*.mdx`)

Required frontmatter: `title`, `tagline`, `status`, `category`, `summary`

`status` values: `active` | `prototype` | `released` | `shelved` | `archived`
`category` values: `software` | `hardware` | `embedded` | `ai` | `web` | `tool` | `other`

Optional: `heroImage`, `github`, `demo`, `docs`, `featured`, `order`

### Devlog (`src/content/devlog/*.mdx`)

Required frontmatter: `title`, `date`, `summary`

Set `publish: true` to make a post visible. Posts default to unpublished.
Use `project: <slug>` to link a post to a project.

## Obsidian Import

```sh
VAULT_PROJECTS=/path/to/vault/Projects node scripts/import-obsidian-devlog.js
```

Only processes folder-based projects. Slugs derive from `project/xxx` tags in frontmatter.

## Key Constraints

- Do NOT set `base` in `astro.config.mjs` (served from domain root)
- Abstract font is logo-only — do not apply `--font-logo` to anything except `.logo` in SiteHeader
- `scripts/kcloud.sh` must not be modified
- Astro must remain static/prerendered — no server-only features
