import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.seglectic.com',
  integrations: [svelte(), mdx()],
  output: 'static',
});
