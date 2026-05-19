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
  assets/
    fonts/          # bundled local fonts
    favicon.svg     # bundled site favicon
  components/     # Astro components
  content/
    projects/     # project folders with local MDX + assets
  layouts/
    Layout.astro  # base HTML shell
  pages/
    [slug].astro          # primary project pages at /<project-id>
    projects/[slug].astro # canonical redirect → /<project-id>
  styles/
    global.css    # design tokens — edit this for theme changes
tools/
  obsidian/
    import-obsidian-devlog.js  # vault import tool
  projenitor/
    projenitor.mjs             # project scaffold TUI
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

### Projects (`src/content/projects/<slug>/index.mdx`)

Required frontmatter: `title`, `tagline`, `status`, `category`, `summary`

`status` values: `active` | `prototype` | `released` | `shelved` | `archived`
`category` values: `software` | `hardware` | `embedded` | `ai` | `web` | `tool` | `other`

Optional: `heroImage`, `github`, `demo`, `docs`, `featured`, `order`

### Devlog (`src/content/projects/<project>/devlog/<slug>/index.mdx`)

Required frontmatter: `title`, `date`, `summary`

Set `publish: true` to make a post visible. Posts default to unpublished.
Each devlog entry lives in its own folder so notes and local media stay colocated.

Devlog folder naming:
- Entries live under a project folder: `projects/<project-slug>/devlog/<entry-slug>/`
- Entry slug format: `YYDDD-MMMDD-hMMA-[title]`
- Example: `projects/canopticon/devlog/26121-May01-12AM-first-successful-boot-sequence/`

## Working Preferences

- Prefer a clean workspace and file tree; remove obsolete root-level files and legacy assets when they are no longer part of the active site
- Keep page content local to the folder it lives in; when a page, project, or devlog has dedicated assets, colocate them with that content instead of scattering them into shared directories
- Prefer folder-based content entries with `index.mdx` so a single directory can hold the document and all related media
- Use shared templates/components only for genuinely reusable patterns; keep one-off content structure and styling local when possible

## Obsidian Import

```sh
VAULT_PROJECTS=/path/to/vault/Projects node tools/obsidian/import-obsidian-devlog.js
```

Only processes folder-based projects. Slugs derive from `project/xxx` tags in frontmatter.
Future automation may create devlog folders directly in the repo or via GitHub Actions; generated entries should follow the same folder-based structure and naming rules as hand-authored entries.

## Repo Shortcuts

- `deploy` means: commit the current worktree on `dev`, push `dev` to `origin/dev`, fast-forward or merge those changes into `master`, push `master`, then return the checkout to `dev`. The push to `origin/dev` must happen before merging to `master` — skipping it leaves `origin/dev` out of sync with master.
- Prefer this deploy flow over editing or pushing `master` directly during normal work

## Known Bugs

- Projects page tag filtering currently has a reflow animation bug: when filtered cards are restored, especially when the first card in the grid returns, surviving cards can snap or animate to intermediate positions before settling. Revisit the `/projects` card animation logic before adding more polish there.

## Key Constraints

- Do NOT set `base` in `astro.config.mjs` (served from domain root)
- Abstract font is logo-only — do not apply `--font-logo` to anything except `.logo` in SiteHeader
- Astro must remain static/prerendered — no server-only features
- Avoid adding project-specific styling hooks or one-off classes to shared templates/components when the need is local to a single MDX document
- For page-specific layout/styling, prefer document-local markup or a dedicated local component; only add shared template styles when the pattern is clearly reusable across multiple project pages

## Projenitor

Run: `npm run projeni`
Aliases: `npm run proj`, `npm run project`

Projenitor opens a TUI for scaffolding a folder-based project page under:
`src/content/projects/<slug>/index.mdx`

Images can be dragged into the terminal or pasted as file paths. They are copied as-is into the project folder; Astro handles image optimization at build time.

Tool source lives in `tools/projenitor/`. Entry point is `projenitor.mjs`; UI components use Ink + React with `React.createElement` (no JSX/transpiler); lib modules handle slug generation, path resolution, media copying, project scanning, and file writing.
