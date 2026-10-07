// Runs Shopify Theme Check (recommended config) against ../theme.
import { themeCheckRun } from '@shopify/theme-check-node';
import path from 'node:path';
const root = path.resolve('../theme');
const { offenses } = await themeCheckRun(root, undefined, () => {});
const bySeverity = {};
for (const o of offenses) {
  const sev = ['error', 'warning', 'info'][o.severity] || o.severity;
  bySeverity[sev] = (bySeverity[sev] || 0) + 1;
  if (o.severity <= 1) console.log(`${sev} ${o.check} ${path.relative(root, o.uri.replace('file://', ''))}:${o.start?.line + 1} ${o.message}`);
}
console.log(bySeverity);
