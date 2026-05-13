import fs from 'fs';
import path from 'path';

export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugExists(slug, projectsDir) {
  return fs.existsSync(path.join(projectsDir, slug));
}
