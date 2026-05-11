import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  site: 'https://www.seglectic.com',
  integrations: [svelte(), mdx()],
  output: 'static',
  vite: {
    plugins: [
      Icons({
        compiler: 'astro',
      }),
    ],
  },
});
