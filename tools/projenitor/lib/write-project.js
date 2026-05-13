import fs from 'fs';
import path from 'path';
import { resolveOutDir, assertWithinRepo } from './paths.js';
import { copyImage } from './media.js';

function toYaml(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}: [${value.join(', ')}]`);
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      const str = String(value);
      const needsQuotes = /[:#\[\]{},]/.test(str) || str !== str.trim() || str === '';
      lines.push(needsQuotes ? `${key}: "${str.replace(/"/g, '\\"')}"` : `${key}: ${str}`);
    }
  }
  return lines.join('\n');
}

function buildFrontmatter(fields, mediaList) {
  const hero = mediaList.find(m => m.role === 'hero');
  const logo = mediaList.find(m => m.role === 'logo');

  const fm = {
    title: fields.title,
    tagline: fields.tagline,
    status: fields.status,
    label: fields.label,
    tags: fields.tags.length > 0 ? fields.tags : [],
    ...(hero ? { heroImage: `./${fields.slug}-hero${path.extname(hero.src)}` } : {}),
    ...(logo ? { logoImage: `./${fields.slug}-logo${path.extname(logo.src)}` } : {}),
    summary: fields.summary,
    ...(fields.github ? { github: fields.github } : {}),
    ...(fields.demo ? { demo: fields.demo } : {}),
    ...(fields.docs ? { docs: fields.docs } : {}),
    featured: fields.featured,
    order: Number(fields.order),
  };

  return `---\n${toYaml(fm)}\n---`;
}

function buildMdxBody() {
  return `
Intro paragraph goes here.

## What it is

Describe the project.

## Why it exists

Describe the problem, motivation, or deeply unnecessary rabbit hole.

## Features

- Feature one
- Feature two
- Feature three

## Build notes

Implementation notes, hardware notes, design notes, or general weirdness.

## Media

Add project-specific components, imports, image comparisons, model viewers, or custom layouts here.
`.trimStart();
}

export function dryRunReport(fields, mediaList) {
  const outDir = resolveOutDir(fields.slug);
  const lines = [];

  lines.push('=== DRY RUN ===\n');
  lines.push(`Target directory:  ${outDir}`);
  lines.push(`MDX path:          ${path.join(outDir, 'index.mdx')}\n`);
  lines.push('--- Frontmatter ---');
  lines.push(buildFrontmatter(fields, mediaList));
  lines.push('\n--- MDX body (template) ---');
  lines.push(buildMdxBody());
  lines.push('\n--- Media copies ---');

  if (mediaList.length === 0) {
    lines.push('  (no media)');
  } else {
    let imageIndex = 1;
    for (const m of mediaList) {
      const ext = path.extname(m.src);
      let baseName;
      if (m.role === 'hero') baseName = `${fields.slug}-hero`;
      else if (m.role === 'preview') baseName = `${fields.slug}-preview`;
      else if (m.role === 'logo') baseName = `${fields.slug}-logo`;
      else baseName = `${fields.slug}-image-${String(imageIndex++).padStart(2, '0')}`;
      lines.push(`  ${m.src}\n  → ${path.join(outDir, baseName + ext)}`);
    }
  }

  return lines.join('\n');
}

export async function writeProject(fields, mediaList, { dryRun = false } = {}) {
  const outDir = resolveOutDir(fields.slug);

  if (dryRun) {
    return { ok: true, report: dryRunReport(fields, mediaList), written: [], errors: [] };
  }

  assertWithinRepo(outDir);

  const written = [];
  const errors = [];

  // Create directory
  fs.mkdirSync(outDir, { recursive: true });

  // Copy media files
  let imageIndex = 1;
  for (const m of mediaList) {
    const ext = path.extname(m.src);
    let baseName;
    if (m.role === 'hero') baseName = `${fields.slug}-hero`;
    else if (m.role === 'preview') baseName = `${fields.slug}-preview`;
    else if (m.role === 'logo') baseName = `${fields.slug}-logo`;
    else baseName = `${fields.slug}-image-${String(imageIndex++).padStart(2, '0')}`;

    const { dest, error } = copyImage(m.src, outDir, baseName);
    if (error) {
      errors.push(`Failed to copy ${m.src}: ${error}`);
    } else {
      written.push(dest);
    }
  }

  // Write index.mdx last so partial failure is visible
  const mdxPath = path.join(outDir, 'index.mdx');
  assertWithinRepo(mdxPath);
  try {
    const content = buildFrontmatter(fields, mediaList) + '\n\n' + buildMdxBody();
    fs.writeFileSync(mdxPath, content, 'utf8');
    written.push(mdxPath);
  } catch (err) {
    errors.push(`Failed to write index.mdx: ${err.message}`);
  }

  return { ok: errors.length === 0, written, errors };
}
