import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { projectsDir } from './paths.js';

export function scanProjects() {
  const dir = projectsDir();
  if (!fs.existsSync(dir)) return { existingLabels: [], existingSlugs: [], nextOrder: 10 };

  const slugs = fs.readdirSync(dir).filter(name => {
    const entry = path.join(dir, name);
    return fs.statSync(entry).isDirectory();
  });

  const labels = new Set();
  const orders = [];

  for (const slug of slugs) {
    const mdxPath = path.join(dir, slug, 'index.mdx');
    if (!fs.existsSync(mdxPath)) continue;
    try {
      const { data } = matter(fs.readFileSync(mdxPath, 'utf8'));
      if (data.label) labels.add(data.label);
      if (typeof data.order === 'number') orders.push(data.order);
    } catch {
      // skip unreadable files
    }
  }

  const maxOrder = orders.length > 0 ? Math.max(...orders) : 0;
  const nextOrder = Math.min(maxOrder + 10, 90);

  return {
    existingLabels: [...labels],
    existingSlugs: slugs,
    nextOrder,
  };
}
