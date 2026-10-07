// Builds the universe bundles into the theme's assets folder.
// node build.mjs          -> minified production bundles
// node build.mjs --dev    -> unminified bundle for dev/index.html
import * as esbuild from '../tools/node_modules/esbuild/lib/main.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const nodePaths = [path.join(here, '../tools/node_modules')];
const common = { bundle: true, format: 'esm', target: 'es2020', nodePaths, legalComments: 'eof', logLevel: 'info', charset: 'utf8', tsconfigRaw: {} };

if (dev) {
  await esbuild.build({ ...common, entryPoints: [path.join(here, 'src/world/index.js')], outfile: path.join(here, 'dev/world.js'), sourcemap: 'inline' });
} else {
  await esbuild.build({ ...common, entryPoints: [path.join(here, 'src/world/index.js')], outfile: path.join(here, '../theme/assets/pf-world.js'), minify: true });
  await esbuild.build({ ...common, entryPoints: [path.join(here, 'src/shared.js')], outfile: path.join(here, '../theme/assets/pf-world-shared.js'), minify: true });
}
