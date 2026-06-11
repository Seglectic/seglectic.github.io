#!/usr/bin/env node
/**
 * seglog.js
 *
 * Imports log entries from Obsidian daily notes into the Astro devlog
 * content collection. Scans every daily note for entries tagged
 * #project/<slug> and writes them as MDX files under:
 *   src/content/projects/<slug>/devlog/<entry-slug>/index.mdx
 *
 * Entry format in daily notes:
 *   - ## Title <time>「HH:MM:SS」</time> #project/<slug> ^block-ref
 *     - content line
 *       - nested content
 *
 * Slug format: YYDDD-MmmDD-HHMM-<block-ref>
 *   e.g. 26161-Jun10-2357-mobilizing
 *
 * Usage:
 *   VAULT_ROOT=~/Seglectome node tools/obsidian/seglog.js [--deploy]
 *
 * --deploy  After syncing, commit changed content files and push to the
 *           remote following the AGENTS.md deploy flow.
 *
 * Obsidian is the source of truth — existing entries are overwritten if
 * their content has changed. Re-running is always safe.
 */

import fs            from 'fs';
import path          from 'path';
import os            from 'os';
import { execSync }  from 'child_process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VAULT_ROOT     = (process.env.VAULT_ROOT || '').replace(/^~/, os.homedir());
const DAILIES_SUBDIR = '一Dailies';
const ASTRO_PROJECTS = './src/content/projects';
const DEPLOY         = process.argv.includes('--deploy');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function git(cmd, { silent = false } = {}) {
  return execSync(`git ${cmd}`, {
    encoding: 'utf8',
    stdio: silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  }).trim();
}

/**
 * Parse YYDDD prefix from a daily note filename.
 * Returns null if the filename doesn't start with YYDDD.
 */
function parseDailyFilename(filename) {
  const m = filename.match(/^(\d{2})(\d{3})\b/);
  if (!m) return null;

  const year = 2000 + Number(m[1]);
  const doy  = Number(m[2]);

  const dt = new Date(Date.UTC(year, 0, 1));
  dt.setUTCDate(dt.getUTCDate() + (doy - 1));

  return {
    yyddd:   m[1] + m[2],
    dateStr: dt.toISOString().slice(0, 10),
    month:   MONTHS[dt.getUTCMonth()],
    day:     String(dt.getUTCDate()).padStart(2, '0'),
  };
}

function buildSlug(daily, hhmm, blockRef) {
  return `${daily.yyddd}-${daily.month}${daily.day}-${hhmm}-${blockRef}`;
}

function toYaml(obj) {
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      lines.push(`${key}: [${val.join(', ')}]`);
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else {
      const s = String(val);
      const needsQuotes = /[:#\[\]{},]/.test(s) || s !== s.trim() || s === '';
      lines.push(needsQuotes ? `${key}: "${s.replace(/"/g, '\\"')}"` : `${key}: ${s}`);
    }
  }
  return lines.join('\n');
}

function buildMdx(fm, body, images = []) {
  const frontmatter = `---\n${toYaml(fm)}\n---`;
  const imports     = images.map(({ varName, filename }) =>
    `import ${varName} from './${filename}'`
  ).join('\n');
  const parts = [frontmatter];
  if (imports) parts.push(imports);
  parts.push(body.trim());
  return parts.join('\n\n') + '\n';
}

function warnObsidianSyntax(text, label) {
  if (/(?<!!)\[\[.+?\]\]/.test(text)) console.warn(`  ⚠  Wikilink (not converted): [[…]] in ${label}`);
}

/**
 * Resolve Obsidian image embeds (![[file.ext|width]]) in a body string.
 * Searches <dailiesDir>/attach/ then <vaultRoot>/attach/ for each file.
 * Returns the converted body and a list of { srcPath, filename } to copy.
 * Unresolved embeds are left as-is with a warning.
 */
function resolveEmbeds(body, dailiesDir, label) {
  const EMBED_RE = /!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g;
  const images   = [];
  let   imgIdx   = 0;

  const attachDirs = [
    path.join(dailiesDir, 'attach'),
    path.join(path.dirname(dailiesDir), 'attach'),
  ];

  const converted = body.replace(EMBED_RE, (match, filename, width) => {
    let srcPath = null;
    for (const dir of attachDirs) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) { srcPath = candidate; break; }
    }

    if (!srcPath) {
      console.warn(`  ⚠  Embed not found: ${filename} in ${label}`);
      return match;
    }

    const varName = `_img${imgIdx++}`;
    images.push({ srcPath, filename, varName });
    // Reference the imported variable so Vite processes the asset correctly
    const widthAttr = width ? ` width="${width}"` : '';
    return `<img src={${varName}.src}${widthAttr} />`;
  });

  return { body: converted, images };
}

/**
 * Parse all #project/<slug> log entries from a daily note's content.
 * Returns { title, hhmm, blockRef, projectSlug, tags, body }[].
 *
 * Heading format:
 *   - ## Title <time>「HH:MM:SS」</time> [#tags…] ^block-ref
 * Content: indented lines following the heading until the next heading.
 * One leading tab is stripped (de-indent one level).
 */
function parseEntries(content) {
  const lines     = content.split('\n');
  const headingRe = /^-\s+##\s+(.+?)\s+<time>「(\d{2}):(\d{2}):\d{2}」<\/time>(.*?)\^([A-Za-z0-9_-]+)\s*$/;

  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (m) headings.push({ i, m });
  }

  const entries = [];

  for (let h = 0; h < headings.length; h++) {
    const { i, m } = headings[h];
    const [, rawTitle, hh, mm, rest, blockRef] = m;

    const projectMatch = rest.match(/#project\/([A-Za-z0-9_-]+)/i);
    if (!projectMatch) continue;

    const projectSlug = projectMatch[1].toLowerCase();
    const title       = rawTitle.trim();
    const hhmm        = hh + mm;

    const tags = (rest.match(/#([A-Za-z0-9/_-]+)/g) || [])
      .map(t => t.slice(1))
      .filter(t => !t.toLowerCase().startsWith('project/'));

    const nextI = h + 1 < headings.length ? headings[h + 1].i : lines.length;
    const body  = lines
      .slice(i + 1, nextI)
      .map(l => l.replace(/^\t/, ''))
      .join('\n')
      .trimEnd();

    const firstBullet = body.split('\n').find(l => /^- /.test(l));
    const summary = firstBullet
      ? firstBullet.replace(/^- /, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
      : undefined;

    entries.push({ title, hhmm, blockRef, projectSlug, tags, body, summary });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

function deploy(changedDirs) {
  console.log('\n=== deploying ===\n');

  const branch = git('rev-parse --abbrev-ref HEAD', { silent: true });
  console.log(`Current branch: ${branch}`);

  // Stage entry directories so both MDX and images are included
  for (const d of changedDirs) git(`add "${d}"`);

  const staged = git('diff --cached --name-only', { silent: true });
  if (!staged) {
    console.log('Nothing to commit — working tree clean.');
    return;
  }

  const count   = changedDirs.length;
  const slugs   = changedDirs.map(d => path.basename(d)).join(', ');
  const message = `devlog: sync ${count} entr${count === 1 ? 'y' : 'ies'} (${slugs})`;

  git(`commit -m "${message}"`);
  console.log(`\nCommitted: ${message}`);

  if (branch === 'dev') {
    // Full AGENTS.md flow: push dev → fast-forward master → push master → back to dev
    git('push origin dev');
    git('checkout master');
    git('merge --ff-only dev');
    git('push origin master');
    git('checkout dev');
    console.log('\nDeployed: dev pushed, master fast-forwarded and pushed.');
  } else if (branch === 'master') {
    git('push origin master');
    console.log('\nPushed master — GitHub Actions deploy triggered.');
  } else {
    console.log(`\nOn branch "${branch}" — committed but not pushed.`);
    console.log('Merge to master manually to deploy.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('=== seglog: daily notes → Astro devlog ===\n');

  if (!VAULT_ROOT) {
    console.error('✗ VAULT_ROOT is not set.');
    console.error('  Usage: VAULT_ROOT=~/Seglectome node tools/obsidian/seglog.js [--deploy]');
    process.exit(1);
  }

  const dailiesDir = path.join(VAULT_ROOT, DAILIES_SUBDIR);

  if (!fs.existsSync(dailiesDir)) {
    console.error(`✗ Dailies folder not found: ${dailiesDir}`);
    process.exit(1);
  }

  const projectDirMap = new Map(
    fs.readdirSync(ASTRO_PROJECTS)
      .filter(d => fs.statSync(path.join(ASTRO_PROJECTS, d)).isDirectory())
      .map(d => [d.toLowerCase(), d])
  );

  const files = fs.readdirSync(dailiesDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Scanning ${files.length} daily notes in ${dailiesDir}\n`);

  let added   = 0;
  let updated = 0;
  let skipped = 0;
  let warned  = 0;
  const changedDirs = []; // track entry dirs so --deploy stages images too

  for (const filename of files) {
    const daily = parseDailyFilename(filename);
    if (!daily) continue;

    const content = fs.readFileSync(path.join(dailiesDir, filename), 'utf8');
    const entries = parseEntries(content).filter(e => e.projectSlug);
    if (entries.length === 0) continue;

    console.log(`${filename}  [${daily.dateStr}]`);

    for (const { title, hhmm, blockRef, projectSlug, tags, body, summary } of entries) {
      const actualDirName = projectDirMap.get(projectSlug);
      if (!actualDirName) {
        console.warn(`  ⚠  Unknown project "${projectSlug}" — scaffold it with projenitor first`);
        warned++;
        continue;
      }

      const entrySlug = buildSlug(daily, hhmm, blockRef);
      const destDir   = path.join(ASTRO_PROJECTS, actualDirName, 'devlog', entrySlug);
      const mdxPath   = path.join(destDir, 'index.mdx');
      const label     = `${filename} ^${blockRef}`;

      warnObsidianSyntax(body, label);
      const { body: resolvedBody, images } = resolveEmbeds(body, dailiesDir, label);

      const fm = {
        title,
        date:    daily.dateStr,
        project: projectSlug,
        ...(summary ? { summary } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        publish: true,
      };

      const generated = buildMdx(fm, resolvedBody, images);
      const existing  = fs.existsSync(mdxPath) ? fs.readFileSync(mdxPath, 'utf8') : null;

      if (existing === generated && images.every(({ filename: f }) => fs.existsSync(path.join(destDir, f)))) {
        console.log(`  ·  ${entrySlug}  (unchanged)`);
        skipped++;
        continue;
      }

      ensureDir(destDir);
      for (const { srcPath, filename: imgFile } of images) {
        fs.copyFileSync(srcPath, path.join(destDir, imgFile));
      }
      fs.writeFileSync(mdxPath, generated, 'utf8');
      changedDirs.push(destDir);

      if (existing) {
        console.log(`  ↺  ${entrySlug}  (updated${images.length ? `, ${images.length} image(s)` : ''})`);
        updated++;
      } else {
        console.log(`  ✓  ${entrySlug}  (new${images.length ? `, ${images.length} image(s)` : ''})`);
        added++;
      }
    }
  }

  console.log(`\n=== Done: ${added} new, ${updated} updated, ${skipped} unchanged, ${warned} warned ===`);

  if (DEPLOY) {
    if (changedDirs.length > 0) {
      deploy(changedDirs);
    } else {
      console.log('\nNothing changed — skipping deploy.');
    }
  }
}

main();
