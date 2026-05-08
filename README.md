# seglectic.github.io

Personal site for Seglectic Systems. Built with Astro + Svelte + MDX, deployed to GitHub Pages at [seglectic.com](https://www.seglectic.com).

## Dev

```sh
npm run dev      # localhost:4321
npm run build    # production build → dist/
npm run preview  # preview built output
```

## Content

- **Projects** — `src/content/projects/*.mdx`
- **Devlog** — `src/content/devlog/*.mdx`

To import from an Obsidian vault:

```sh
VAULT_PROJECTS=/path/to/vault/Projects node scripts/import-obsidian-devlog.js
```

## Deploy

Push to `master` — GitHub Actions builds and deploys automatically.
