import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
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
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/devlog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    project: z.string().optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().optional(),
    publish: z.boolean().default(false),
    hero: z.string().optional(),
  }),
});

export const collections = { projects, devlog };
