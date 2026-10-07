// Asset URLs are injected by the Liquid section as window.__pfUniverseAssets.
export function assetUrl(name) {
  const url = window.__pfUniverseAssets?.[name];
  if (!url) throw new Error(`Missing Purefitness world asset: ${name}`);
  return url;
}

export function hasAsset(name) {
  return Boolean(window.__pfUniverseAssets?.[name]);
}
