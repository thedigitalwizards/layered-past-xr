import { existsSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { validateContent } from './src/core/validate.ts';

/** Fails the build when examples/demo/content.json is invalid, so a broken file is never published. */
const validateDemoContent = (): Plugin => ({
  name: 'validate-demo-content',
  buildStart: () => {
    const root = new URL('./', import.meta.url);
    const result = validateContent(
      JSON.parse(readFileSync(new URL('examples/demo/content.json', root), 'utf8')),
      (path) => existsSync(new URL(`examples/demo/public/${path}`, root)),
    );
    if (!result.ok) throw new Error(`examples/demo/content.json is invalid:\n${result.errors.join('\n')}`);
  },
});

export default defineConfig({
  // Relative paths, so the build works from any sub-path (GitHub Pages project sites).
  base: './',
  // The example's public files (its voices) are served and copied into the build.
  publicDir: 'examples/demo/public',
  plugins: [validateDemoContent()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        editor: new URL('./editor/index.html', import.meta.url).pathname,
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
