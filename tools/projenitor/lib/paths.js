import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not locate repo root (no package.json found)');
    dir = parent;
  }
}

const _toolDir = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = findRepoRoot(_toolDir);

export function projectsDir() {
  return path.join(REPO_ROOT, 'src', 'content', 'projects');
}

export function resolveOutDir(slug) {
  return path.join(projectsDir(), slug);
}

export function assertWithinRepo(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(REPO_ROOT + path.sep) && resolved !== REPO_ROOT) {
    throw new Error(`Path escapes repo root: ${filePath}`);
  }
}
