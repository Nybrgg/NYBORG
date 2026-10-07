# PureFitness Shopify-tema 2.0

- `theme/` er Shopify-temaet. Det er det, der uploades (zip indholdet af mappen).
- `universe/` er kildekoden til 3D-universet (Three.js r186), der bygges til `theme/assets/pf-world.js` og `theme/assets/pf-world-shared.js`.
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
Billederne af miljøerne på forsiden (`pf-env-*.webp`) og `next-universe.webp` er renderet fra 3D-verdenen med `tools/stills.mjs`.
