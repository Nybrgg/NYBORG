---
name: awesome-design-md
description: Library of 70+ DESIGN.md design-system analyses of well-known brands (Apple, Stripe, Linear, Vercel, Notion, Airbnb, Spotify, Tesla, etc.) with colors, typography, spacing, components and tone. Use when the user wants a site or UI "in the style of" a brand, needs a design-system reference or inspiration, or asks to pick a visual direction.
---

# Awesome DESIGN.md

Source: https://github.com/VoltAgent/awesome-design-md (MIT).

Each folder in `designs/<brand>/DESIGN.md` describes one brand's visual language:
YAML front matter with design tokens (colors, type, radii, spacing) followed by prose on
layout, components, imagery and do's/don'ts.

## How to use

1. List the available brands: `ls .claude/skills/awesome-design-md/designs`
2. Pick the one(s) matching the request (or suggest 2–3 fitting options if the user has none in mind).
3. Read that `DESIGN.md` fully before writing UI code, and carry its tokens into CSS variables / Tailwind config.
4. Use it as inspiration for the visual language — do not copy logos, trademarks or brand names into the user's product.
