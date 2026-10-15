// Runs Shopify Theme Check (recommended config) against ../theme.
import { themeCheckRun } from '@shopify/theme-check-node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../theme');
const { theme, offenses } = await themeCheckRun(root, undefined, () => {});
for (const o of offenses) {
  const sev = ['error', 'warning', 'info'][o.severity] || o.severity;
  console.log(`${sev} ${o.check} ${path.relative(root, o.uri.replace('file://', ''))}:${o.start?.line + 1} ${o.message}`);
}
console.log(`${theme.length} files, ${offenses.length} offenses`);
process.exitCode = offenses.some(o => o.severity === 0) ? 1 : 0;
