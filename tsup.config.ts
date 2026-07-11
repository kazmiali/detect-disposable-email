import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    wildcard: 'src/wildcard-entry.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  // Sourcemaps disabled: the bundle is mostly inlined JSON, for which source
  // maps balloon the tarball (~9MB extra) with no debugging value. Consumers
  // get a lean package; the inlined data IS the source.
  sourcemap: false,
  clean: true,
  treeshake: true,
  platform: 'neutral',
})
