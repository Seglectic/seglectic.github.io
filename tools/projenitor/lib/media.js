import fs from 'fs';
import path from 'path';

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg']);

export function parsePaths(text) {
  // Normalize: strip file:// URIs, unescape backslash-spaces
  let cleaned = text
    .replace(/file:\/\//g, '')
    .replace(/\\ /g, '\x00'); // temp-encode escaped spaces

  // Strip surrounding quotes (handles 'path' or "path" wrapping)
  cleaned = cleaned.replace(/['"]((?:[^\x00]|\x00)*?)['"]/g, (_, inner) => inner);

  // Restore escaped spaces
  cleaned = cleaned.replace(/\x00/g, ' ');

  // Split on whitespace runs that separate path-like tokens
  // A token starts with /, ~/, ./, or a Windows drive letter
  const tokens = [];
  const pattern = /(?:^|\s)((?:\/|~\/|\.\/)[^\s]*(?:\\ [^\s]*)*)/g;
  let match;
  while ((match = pattern.exec(cleaned)) !== null) {
    tokens.push(match[1].trim());
  }

  // Fallback: if no absolute/relative paths found, treat the whole thing as one path
  if (tokens.length === 0 && cleaned.trim().length > 0) {
    tokens.push(cleaned.trim());
  }

  return tokens.map(t => t.replace(/\\ /g, ' '));
}

export function validatePaths(paths) {
  const valid = [];
  const errors = [];

  for (const p of paths) {
    const resolved = path.resolve(p);
    if (!fs.existsSync(resolved)) {
      errors.push(`File not found: ${p}`);
      continue;
    }
    const ext = path.extname(resolved).slice(1).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      errors.push(`Unsupported file type (.${ext}): ${p}`);
      continue;
    }
    valid.push(resolved);
  }

  return { valid, errors };
}

export function copyImage(srcPath, destDir, baseName) {
  const ext = path.extname(srcPath);
  let destPath = path.join(destDir, baseName + ext);

  // Auto-increment if destination exists
  if (fs.existsSync(destPath)) {
    let n = 2;
    while (fs.existsSync(path.join(destDir, baseName + `-${n}` + ext))) n++;
    destPath = path.join(destDir, baseName + `-${n}` + ext);
  }

  try {
    fs.copyFileSync(srcPath, destPath);
    return { dest: destPath, error: null };
  } catch (err) {
    return { dest: null, error: err.message };
  }
}
