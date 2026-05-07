# Seglectic Systems — Astro Rebuild Plan

## Context

The current site is a plain HTML/CSS static page (no build system, no framework) living on GitHub Pages. The goal is to rebuild it as a polished, dark, experimental R&D studio / product-lab website using Astro + Svelte, on a new `dev` branch. The existing `emojifier/` tool, `CNAME`, custom font (`ABSTRACT.ttf`), and favicon are preserved. The site must remain GitHub Pages compatible.

---

## Branch Setup

```bash
git checkout -b dev   # or: git checkout dev if it exists
```

All work happens on `dev`. Never touch `main` directly.

---

## File/Folder Structure

```
seglectic.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml              ← GitHub Actions: build & deploy dist/ to gh-pages
├── public/
│   ├── CNAME                       ← moved from repo root
│   ├── favicon.ico
│   ├── favicon.png
│   ├── fonts/
│   │   └── ABSTRACT.ttf            ← moved from assets/fonts/
│   ├── images/
│   │   ├── projects/
│   │   │   ├── canopticon-hero.png
│   │   │   └── segterm-hero.png
│   │   └── devlog/
├── src/
│   ├── content/
│   │   ├── config.ts               ← collection schemas (Zod)
│   │   ├── projects/
│   │   │   ├── canopticon.mdx
│   │   │   └── segterm.mdx
│   │   └── devlog/
│   │       ├── 2026-04-canopticon-mask-rendering.mdx
│   │       └── 2026-05-segterm-first-boot.mdx
│   ├── components/
│   │   ├── SiteHeader.astro
│   │   ├── SiteFooter.astro
│   │   ├── ProjectCard.astro
│   │   ├── StatusBadge.astro
│   │   ├── TagList.astro
│   │   ├── DevlogCard.astro
│   │   ├── Hero.astro
│   │   └── SectionHeader.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── projects/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── devlog/
│   │       ├── index.astro
│   │       └── [slug].astro
│   └── styles/
│       └── global.css
├── scripts/
│   ├── import-obsidian-devlog.js   ← Obsidian → Astro content import tool
│   └── kcloud.sh                  ← keep as-is
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Astro Setup

### `package.json` dependencies

```json
{
  "name": "seglectic-systems",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.x",
    "@astrojs/svelte": "^5.x",
    "@astrojs/mdx": "^3.x",
    "svelte": "^4.x"
  },
  "devDependencies": {
    "gray-matter": "^4.x"
  }
}
```

### `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.seglectic.com',
  integrations: [svelte(), mdx()],
  output: 'static',
});
```

### GitHub Actions deploy (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [dev]   # deploy from dev while building; switch to main when ready
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Content Collections (`src/content/config.ts`)

```ts
import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    status: z.enum(['active', 'prototype', 'released', 'shelved', 'archived']),
    category: z.enum(['software', 'hardware', 'embedded', 'ai', 'web', 'tool', 'other']),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    summary: z.string(),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    docs: z.string().url().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const devlog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    project: z.string().optional(),   // slug of related project
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    publish: z.boolean().default(false),
    hero: z.string().optional(),
  }),
});

export const collections = { projects, devlog };
```

---

## Theme Tokens (`src/styles/global.css`)

```css
@font-face {
  font-family: 'Abstract';
  src: url('/fonts/ABSTRACT.ttf') format('truetype');
}

:root {
  /* Backgrounds */
  --bg:            #0f0f0f;
  --bg-surface:    #161616;
  --bg-elevated:   #1e1e1e;
  --bg-muted:      #252525;

  /* Text */
  --text:          #e8e8e6;
  --text-muted:    #888882;
  --text-dim:      #555550;

  /* Borders */
  --border:        #2a2a2a;
  --border-subtle: #222222;

  /* Accents */
  --accent:        #D4531A;   /* industrial orange — primary brand accent */
  --accent-cyan:   #4eb8c4;
  --accent-amber:  #c4964e;

  /* Typography */
  --font-mono:     'Abstract', 'Courier New', monospace;
  --font-sans:     system-ui, -apple-system, sans-serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 32px;
  --space-xl: 64px;

  /* Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
}

*, *::before, *::after { box-sizing: border-box; }

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
}

body { margin: 0; min-height: 100vh; }

a { color: var(--text); text-decoration: none; }
a:hover { color: var(--accent); }

:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }
```

---

## Key Components

### `Layout.astro`
- `<html>` shell with `<head>` (meta, global CSS, OG tags), `<SiteHeader />`, `<slot />`, `<SiteFooter />`
- Props: `title`, `description`

### `SiteHeader.astro`
- Logo: "SEG" in `--accent`, "LECTIC" in `--text`, "SYSTEMS" smaller in `--text-muted`
- Nav links: Projects / Devlog / About
- Hover states use `--accent`
- Thin `--border` bottom separator

### `SiteFooter.astro`
- Simple: "Seglectic Systems", year, links to GitHub
- Thin top border, muted text

### `ProjectCard.astro`
- Props: `project` (collection entry)
- Product-tile style: dark `--bg-elevated` surface, title, tagline, `<StatusBadge />`, `<TagList />`
- Category label in `--accent` (small, uppercase)
- Hover: subtle border-color lift to `--accent`

### `StatusBadge.astro`
- Props: `status: string`
- Tiny colored dot + label
- active → `--accent-cyan`, prototype → `--accent-amber`, released → dim green, shelved/archived → `--text-dim`

### `TagList.astro`
- Props: `tags: string[]`
- Inline tags, monospace, muted

### `DevlogCard.astro`
- Props: `post` (collection entry)
- Date, title, project link, summary, tags

### `Hero.astro`
- Props: `title`, `tagline`, optional `eyebrow`
- Large type, eyebrow in `--accent`, no giant background gradients

### `SectionHeader.astro`
- Props: `title`, optional `href` (link to section page)
- Title + thin `--accent` left-border accent

---

## Pages

### `index.astro` (Home)
1. `<Hero>` — "Seglectic Systems" + positioning statement
2. Featured projects (2–3 `<ProjectCard>` tiles, `featured: true` filter)
3. Latest devlog (3 most recent published `<DevlogCard>` entries)
4. "Active Systems" area — list of projects with `status: active`
5. Footer links: GitHub, Projects, Devlog, About

### `projects/index.astro`
- Grid of all `<ProjectCard>` components, sorted by `order`
- No filter in phase 1 (static), placeholder comment for future `ProjectFilter.svelte`

### `projects/[slug].astro`
- Hero section: title, tagline, `<StatusBadge>`, category, hero image
- Quick links: GitHub / demo / docs / devlog
- MDX body (overview, features, tech, status)
- Related devlog posts (filter by matching `project` slug)

### `devlog/index.astro`
- Chronological list of published posts (`publish: true`)
- Project and tag shown per card

### `devlog/[slug].astro`
- Date, title, project backlink, tags, MDX body

### `about.astro`
- Short studio description (markdown prose)
- Links to GitHub and projects

---

## Sample Content

### `src/content/projects/canopticon.mdx`
```yaml
---
title: Canopticon
tagline: Canopy cover analysis from photos.
status: active
category: ai
tags: [computer-vision, ai, raspberry-pi]
heroImage: /images/projects/canopticon-hero.png
summary: A computer vision tool for estimating canopy cover percentage from photos using sky segmentation.
github: https://github.com/Seglectic/Canopticon
featured: true
order: 10
---
```

### `src/content/projects/segterm.mdx`
```yaml
---
title: Segterm
tagline: A minimal terminal emulator experiment.
status: prototype
category: software
tags: [terminal, rust, embedded]
heroImage: /images/projects/segterm-hero.png
summary: An experimental terminal emulator built to explore low-level rendering and VT escape handling.
github: https://github.com/Seglectic/Segterm
featured: true
order: 20
---
```

### `src/content/devlog/2026-04-canopticon-mask-rendering.mdx`
```yaml
---
title: Better mask overlay rendering
date: 2026-04-15
project: canopticon
tags: [devlog, computer-vision]
summary: Improved the way sky masks are rendered and exported.
publish: true
---
```

### `src/content/devlog/2026-05-segterm-first-boot.mdx`
```yaml
---
title: First successful boot sequence
date: 2026-05-01
project: segterm
tags: [devlog, terminal, rust]
summary: Got the first real framebuffer output working on the test hardware.
publish: true
---
```

---

## Obsidian Import Script (`scripts/import-obsidian-devlog.js`)

Node.js script. Configurable at the top of the file:

```js
// CONFIGURE these paths:
const VAULT_PROJECTS_DIR = process.env.VAULT_PROJECTS || '/path/to/vault/Projects';
const ASTRO_DEVLOG_DIR   = './src/content/devlog';
const ASTRO_PROJECTS_DIR = './src/content/projects';
const PUBLIC_IMAGES_DIR  = './public/images';
```

### Vault structure assumed

```
VaultRoot/
  Projects/
    Canopticon/
      devlog/
        2026-04-mask-rendering.md   ← publish: true → imported
        2026-05-wip-notes.md        ← publish: false → skipped
      Canopticon.md                 ← optional: project body content
    Segterm/
      devlog/
        2026-05-first-boot.md
```

### Behavior

1. Scan `VAULT_PROJECTS_DIR` for subdirectories (each is a project)
2. Derive project slug from folder name: lowercase, spaces → hyphens (e.g. `My Project` → `my-project`); override with `slug:` frontmatter if present
3. For each project, check if a `devlog/` subfolder exists
4. Scan `devlog/` for `.md` files; parse frontmatter with `gray-matter`
5. Skip files where `publish !== true`
6. Auto-inject `project: <slug>` into output frontmatter (no need to set it manually per note)
7. Warn about unsupported Obsidian syntax: `[[wikilinks]]`, `![[embeds]]`
8. Copy cleaned `.mdx` files into `ASTRO_DEVLOG_DIR`
9. Copy local images (from `devlog/` or project root) into `PUBLIC_IMAGES_DIR/projects/<slug>/`
10. Normalize frontmatter fields (dates, output slugs)
11. Optionally: if a `[Project Name].md` or `README.md` exists at the project root and has `publish: true`, import it as project body content into `ASTRO_PROJECTS_DIR`

---

## Responsive / Mobile

- Single-column below 640px
- Two-column project grid at 768px+
- Container max-width ~900px, centered with horizontal padding

---

## Preserved Files

| File | Action |
|------|--------|
| `CNAME` | Move to `public/CNAME` |
| `assets/fonts/ABSTRACT.ttf` | Move to `public/fonts/ABSTRACT.ttf` |
| `favicon.ico`, `favicon.png` | Move to `public/` |
| `scripts/kcloud.sh` | Keep in `scripts/`, untouched |
| `emojifier/` | Drop — not included in the new site |

---

## Implementation Order

1. `git checkout -b dev`
2. Initialize Astro project: `npm create astro@latest . -- --template minimal --no-git`
3. Add integrations: `npx astro add svelte mdx`
4. Copy preserved files into `public/`
5. Write `src/content/config.ts`
6. Write `src/styles/global.css`
7. Write layout and components (Layout, SiteHeader, SiteFooter, ProjectCard, StatusBadge, TagList, DevlogCard, Hero, SectionHeader)
8. Write all pages (index, projects/index, projects/[slug], devlog/index, devlog/[slug], about)
9. Add sample MDX content (2 projects, 2 devlog posts)
10. Write `scripts/import-obsidian-devlog.js`
11. Add `.github/workflows/deploy.yml`
12. Test locally: `npm run dev`
13. Commit and push `dev`

---

## Verification

```bash
npm run dev         # should serve at localhost:4321
# Visit /  /projects  /projects/canopticon  /devlog  /devlog/<slug>  /about
npm run build       # dist/ should build cleanly with no type errors
npm run preview     # verify built output
```

Check:
- CNAME present in `dist/`
- All project cards link correctly
- StatusBadge colors render per status
- Fonts load from `/fonts/ABSTRACT.ttf`
- No broken image references

---

## Assumptions

- Astro v4 (latest stable at time of plan)
- GitHub Pages served from `gh-pages` branch via Actions workflow
- Sample project slugs (canopticon, segterm) are placeholders — real content added later
- Hero images are placeholders until real screenshots exist
- `ProjectFilter.svelte` is deferred to phase 2 (projects page starts static)
- `emojifier/` is dropped from the new site entirely
- `assets/AR/Tap-Kun.usdz` is not included in the new build (can be added to `public/` manually if needed)
