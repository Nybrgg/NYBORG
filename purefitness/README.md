# PureFitness Shopify-tema 2.0

- `theme/` er Shopify-temaet. Det er det, der uploades (zip indholdet af mappen).
- Temaet bruger det oprindelige 3D-univers (`theme/assets/pf-world-6B2FQJYY.js` og `pf-world-K5HFMRHI.js`) med den nye brugerflade (`pf-universe-dom.css`).
- `universe/` er kildekoden til en alternativ, nyskrevet 3D-verden (Three.js r186). Den indgår ikke i temaet; `node build.mjs` bygger den til `theme/assets/pf-world.js` og `pf-world-shared.js`, hvis man vil skifte (importerne i `theme/assets/pf-universe.js` og `worldModule` i `pf-universe.liquid` skal så pege på de nye filer).
- `tools/` indeholder en lokal forhåndsvisning af temaet (liquidjs) og scripts til skærmbilleder.

## Byg 3D-universet

```bash
cd tools && npm install
cd ../universe && node build.mjs        # produktion -> theme/assets
node build.mjs --dev                    # udviklingsbundle til dev/index.html
```

## Lokal forhåndsvisning

```bash
cd tools && node preview.mjs 4173
# http://localhost:4173/                 forside
# http://localhost:4173/?view=univers    3D-universet
# http://localhost:4173/dev/index.html?t=0.43   3D-verdenen alene (t = 0..1)
```

## Teksturer og lys

Teksturerne er CC0-scanninger fra Poly Haven (se `theme/assets/sources.json`), og himlen ved solnedgang er `sunset.hdr`.
Billederne af miljøerne på forsiden (`pf-env-*.webp`) er renderet fra det oprindelige 3D-univers med `tools/old-stills.mjs`.
