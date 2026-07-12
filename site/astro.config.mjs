import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  integrations: [svelte()],
  vite: {
    plugins: [tailwind()],
    // /changelog renders the repo-root CHANGELOG.md via a ?raw import; let
    // the dev server read one level above the Astro root (build is unaffected).
    server: { fs: { allow: ['..'] } },
  },
});
