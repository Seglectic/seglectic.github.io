#!/usr/bin/env node
/**
 * import-obsidian-devlog.js
 *
 * Imports folder-based Obsidian projects (and their devlogs) into Astro
 * content collections. Flat .md files at the vault projects root are ignored.
 *
 * Usage:
 *   VAULT_PROJECTS=/path/to/vault/Projects node scripts/import-obsidian-devlog.js
 */

import fs   from 'fs';
import path  from 'path';
import matter from 'gray-matter';

// ---------------------------------------------------------------------------
// Config — override via environment variables
// ---------------------------------------------------------------------------
const VAULT_PROJECTS_DIR = process.env.VAULT_PROJECTS || '/path/to/vault/Projects';
const ASTRO_DEVLOG_DIR   = './src/content/devlog';
const ASTRO_PROJECTS_DIR = './src/content/projects';
const PUBLIC_IMAGES_DIR  = './public/images';

// ---------------------------------------------------------------------------
// Status mapping: Obsidian vault status → Astro site status
// ---------------------------------------------------------------------------
const STATUS_MAP = {
  concept:  'prototype',
  active:   'active',
  complete: 'released',
  shelved:  'shelved',
  archived: 'archived',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure a directory exists, creating it recursively if needed. */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Serialise a frontmatter object to a YAML string.
 * Keeps it simple — strings, numbers, booleans, and flat arrays of primitives.
 */
function toYaml(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else if (value instanceof Date) {
      // Render as YYYY-MM-DD without timezone conversion
      const iso = value.toISOString().slice(0, 10);
      lines.push(`${key}: ${iso}`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      // String — quote if it contains a colon or leading/trailing whitespace
      const str = String(value);
      const needsQuotes = /[:#\[\]{},]/.test(str) || str !== str.trim() || str === '';
      lines.push(needsQuotes ? `${key}: "${str.replace(/"/g, '\\"')}"` : `${key}: ${str}`);
    }
  }
  return lines.join('\n');
}

/** Build a complete .mdx file string from a frontmatter object and body. */
function buildMdx(frontmatter, body) {
  return `---\n${toYaml(frontmatter)}\n---\n\n${body.trim()}\n`;
}

/**
 * Extract the slug from a tags array.
 * Looks for a tag starting with "project/", returns the part after the slash.
 */
function extractProjectSlug(tags) {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (typeof tag === 'string' && tag.startsWith('project/')) {
      const slug = tag.split('/')[1]?.trim();
      return slug || null;
    }
  }
  return null;
}

/**
 * Extract summary/tagline from a `^head` block reference.
 * Matches lines of the form:  - Some text ^head
 * Returns the text portion, or null if not found.
 */
function extractHeadSummary(content) {
  const match = content.match(/^[ \t]*-[ \t]+(.+?)\s+\^head\s*$/m);
  return match ? match[1].trim() : null;
}

/**
 * Remove tags that start with "project/" from a tags array.
 */
function filterProjectTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter(t => typeof t === 'string' && !t.startsWith('project/'));
}

/**
 * Strip Dataview code blocks from markdown content.
 * Removes ` ```dataview ... ``` ` blocks (including the fences).
 */
function stripDataviewBlocks(content) {
  return content.replace(/```dataview[\s\S]*?```/g, '');
}

/**
 * Warn about unsupported Obsidian syntax present in content.
 */
function warnObsidianSyntax(content, filePath) {
  const rel = path.relative(process.cwd(), filePath);

  if (/!\[\[.+?\]\]/.test(content)) {
    console.warn(`  ⚠  Embed found (not converted):  ![[…]]  in ${rel}`);
  }
  if (/\[\[.+?\]\]/.test(content)) {
    console.warn(`  ⚠  Wikilink found (not converted): [[…]]  in ${rel}`);
  }
  if (/```dataview/.test(content)) {
    console.warn(`  ⚠  Dataview block found (will be stripped) in ${rel}`);
  }
}

/**
 * Copy all non-.md files from srcDir to destDir.
 * Returns the number of files copied.
 */
function copyImages(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;

  const files = fs.readdirSync(srcDir).filter(f => !f.endsWith('.md'));
  if (files.length === 0) return 0;

  ensureDir(destDir);
  let count = 0;
  for (const file of files) {
    const src  = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Core processing functions
// ---------------------------------------------------------------------------

/**
 * Process all publishable devlog entries for a project.
 */
function processDevlog(devlogDir, slug) {
  if (!fs.existsSync(devlogDir)) return; // silently skip — no devlog folder

  const entries = fs.readdirSync(devlogDir).filter(f => f.endsWith('.md'));
  if (entries.length === 0) return;

  let published = 0;
  let skipped   = 0;

  for (const filename of entries) {
    const srcPath = path.join(devlogDir, filename);
    const raw     = fs.readFileSync(srcPath, 'utf8');
    const parsed  = matter(raw);
    const fm      = parsed.data;

    if (fm.publish !== true) {
      skipped++;
      continue;
    }

    // Warn about unsupported syntax
    warnObsidianSyntax(parsed.content, srcPath);

    // Clean body
    const body = stripDataviewBlocks(parsed.content);

    // Build output frontmatter
    const outTags = filterProjectTags(fm.tags);

    const outFm = {
      title:   fm.title   ?? path.basename(filename, '.md'),
      date:    fm.date    ?? undefined,
      project: slug,                    // injected
      ...(outTags.length > 0 ? { tags: outTags } : {}),
      ...(fm.summary ? { summary: fm.summary } : {}),
      publish: true,
    };

    // Remove undefined keys
    for (const key of Object.keys(outFm)) {
      if (outFm[key] === undefined) delete outFm[key];
    }

    // Write .mdx — replace .md extension
    const outFilename = filename.replace(/\.md$/, '.mdx');
    const destPath    = path.join(ASTRO_DEVLOG_DIR, outFilename);
    ensureDir(ASTRO_DEVLOG_DIR);
    fs.writeFileSync(destPath, buildMdx(outFm, body), 'utf8');
    published++;
  }

  if (published > 0) {
    console.log(`    ✓ Devlog: ${published} entr${published === 1 ? 'y' : 'ies'} imported` +
                (skipped > 0 ? `, ${skipped} skipped (publish != true)` : ''));
  } else if (skipped > 0) {
    console.log(`    - Devlog: all ${skipped} entries skipped (publish != true)`);
  }
}

/**
 * Process a single folder-based project.
 */
function processProject(projectDir) {
  const folderName = path.basename(projectDir);

  // Find the main project .md file (same name as folder, or any .md at folder root)
  const rootFiles   = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
  const mainFilename = rootFiles.find(f => f === `${folderName}.md`) ?? rootFiles[0];

  if (!mainFilename) {
    console.warn(`  ⚠  No .md file found in "${folderName}" — skipping`);
    return;
  }

  const mainFilePath = path.join(projectDir, mainFilename);
  const raw          = fs.readFileSync(mainFilePath, 'utf8');
  const parsed       = matter(raw);
  const fm           = parsed.data;

  // Extract slug
  const slug = extractProjectSlug(fm.tags);
  if (!slug) {
    console.warn(`  ⚠  No "project/<slug>" tag found in "${folderName}" — skipping`);
    return;
  }

  console.log(`  → ${folderName}  [slug: ${slug}]`);

  // Copy images
  const attachDir = path.join(projectDir, 'attach');
  const imgDest   = path.join(PUBLIC_IMAGES_DIR, 'projects', slug);
  const copied    = copyImages(attachDir, imgDest);
  if (copied > 0) {
    console.log(`    ✓ Images: ${copied} file${copied === 1 ? '' : 's'} copied to ${imgDest}`);
  }

  // Process devlog
  processDevlog(path.join(projectDir, 'devlog'), slug);

  // Import project file itself if publish: true
  if (fm.publish !== true) {
    console.log(`    - Project file: not published (publish != true)`);
    return;
  }

  // Determine status
  let status;
  if (fm.site_status) {
    status = fm.site_status;
  } else {
    const rawStatus = fm.status ?? '';
    status = STATUS_MAP[rawStatus] ?? rawStatus ?? 'prototype';
  }

  // Extract tagline/summary from ^head block
  const headSummary = extractHeadSummary(parsed.content);

  // Warn and clean body
  warnObsidianSyntax(parsed.content, mainFilePath);
  const body = stripDataviewBlocks(parsed.content);

  // Filter tags
  const outTags = filterProjectTags(fm.tags);

  const outFm = {
    title:    fm.title    ?? folderName,
    tagline:  headSummary ?? fm.tagline ?? '',
    status,
    category: fm.category ?? 'other',
    ...(outTags.length > 0 ? { tags: outTags } : {}),
    summary:  headSummary ?? fm.summary ?? '',
    ...(fm.github  ? { github: fm.github }   : {}),
    featured: false,
    order:    99,
  };

  const destPath = path.join(ASTRO_PROJECTS_DIR, `${slug}.mdx`);
  ensureDir(ASTRO_PROJECTS_DIR);
  fs.writeFileSync(destPath, buildMdx(outFm, body), 'utf8');
  console.log(`    ✓ Project: written to ${destPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('=== Obsidian → Astro import ===\n');

  // Validate source directory
  if (!fs.existsSync(VAULT_PROJECTS_DIR)) {
    console.error(`✗ VAULT_PROJECTS_DIR not found: ${VAULT_PROJECTS_DIR}`);
    console.error('  Set the VAULT_PROJECTS environment variable to the correct path.');
    process.exit(1);
  }

  const entries = fs.readdirSync(VAULT_PROJECTS_DIR);

  // Only process subdirectories — ignore flat .md files
  const projectDirs = entries
    .map(name => path.join(VAULT_PROJECTS_DIR, name))
    .filter(fullPath => fs.statSync(fullPath).isDirectory());

  const flatFiles = entries.filter(name => name.endsWith('.md'));
  if (flatFiles.length > 0) {
    console.log(`Ignored ${flatFiles.length} flat .md file(s) at vault root (not folder-based projects).\n`);
  }

  if (projectDirs.length === 0) {
    console.log('No folder-based projects found.');
    return;
  }

  console.log(`Found ${projectDirs.length} project folder(s):\n`);

  let processed = 0;
  let skipped   = 0;

  for (const dir of projectDirs) {
    try {
      processProject(dir);
      processed++;
    } catch (err) {
      console.error(`  ✗ Error processing "${path.basename(dir)}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n=== Done: ${processed} project(s) processed, ${skipped} error(s) ===`);
}

main();
