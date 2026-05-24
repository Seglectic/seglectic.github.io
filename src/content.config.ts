import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      status: z.enum(['active', 'prototype', 'released', 'shelved', 'archived']),
      label: z.string(),
      tags: z.array(z.string()).default([]),
      hero: z
        .discriminatedUnion('type', [
          z.object({
            type: z.literal('image'),
            image: image(),
          }),
          z.object({
            type: z.literal('video'),
            video: z.string().regex(/\.webm$/i, 'Hero video must be a .webm asset'),
            poster: image(),
          }),
        ]),
      heroOverlay: z
        .object({
          image: image(),
          alt: z.string().optional(),
          variant: z.enum(['canopticon', 'custom']).default('custom'),
          size: z.string().optional(),
          position: z
            .object({
              x: z.string().optional(),
              y: z.string().optional(),
            })
            .optional(),
          motion: z
            .object({
              amplitude: z.number().optional(),
              periodMs: z.number().optional(),
            })
            .optional(),
          shadow: z.string().optional(),
        })
        .optional(),
      summary: z.string(),
      github: z.string().url().optional(),
      demo: z.string().url().optional(),
      docs: z.string().url().optional(),
      featured: z.boolean().default(false),
      order: z.number().default(99),
    }),
});

const devlog = defineCollection({
  loader: glob({
    pattern: '*/devlog/**/index.{md,mdx}',
    base: './src/content/projects',
    generateId: ({ entry }) =>
      entry
        .replace(/\/index\.(md|mdx)$/, '')
        .replace(/\.(md|mdx)$/, ''),
  }),
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
