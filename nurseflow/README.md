# NurseFlow Shopify-tema 1.0

Online Store 2.0-tema til NurseFlow – den gratis AI-studieplatform for danske sygeplejestuderende. Liquid glass-design i blå og lilla, alt på dansk.

- `theme/` er selve temaet. Det er indholdet af denne mappe, der zippes og uploades.
- `tools/` indeholder lokal forhåndsvisning (liquidjs), Shopify Theme Check og et skærmbillede-script.

## Upload til Shopify

```bash
cd theme && zip -r ../NurseFlow-Shopify-1.0.zip . -x '.*'
```

Shopify-admin → **Webshop → Temaer → Tilføj tema → Upload zip-fil** → vælg `NurseFlow-Shopify-1.0.zip` → **Tilpas**.

Efter upload:

1. **Temaindstillinger → Identitet → Link til webappen**: indsæt NurseFlow-appens adresse. Alle "Kom i gang"-knapper uden eget link peger herhen.
2. Sæt links til App Store/Google Play på blokkene i sektionen **Web og app**, når apps er ude, og skift status fra "Kommer snart".
3. Opret siden *Kontakt* med skabelonen `page.contact`, hvis du vil have kontaktformularen.

## Forsidens sektioner

| Sektion | Indhold |
| --- | --- |
| Hero | Overskrift, knapper, nøgletal og en app-illustration med en trinvis ampulberegning |
| Funktioner | Bento-kort: AI-assistent, medicinregner, noter, quiz, fremdrift, profil |
| Medicinregner | Fungerende regner med alle 9 typer: givet → formel → beregning → resultat → kontrol, komma som decimaltegn, advarsler (fx pædiatri) |
| AI-assistent | Skift mellem Perplexity, GPT-4o og "Sammenlign begge" med eksempelsvar (SBAR) |
| Målgruppe og værdi | Semesterbånd 1.–7. og tabellen behov → hvad NurseFlow giver |
| Sådan virker det | Tre trin |
| Web og app | Webapp, iOS, Android med status |
| FAQ | Gratis, klinisk sikkerhed, AI-modeller, data |
| Call to action, Footer | Inkl. ansvarsfraskrivelse |

Nurse-maskotten (kan trækkes rundt, reagerer på beregninger) slås til/fra under **Temaindstillinger → Nurse-maskot**. Medicinregneren kan dybdelinkes, fx `/#medicinregner-draaber`.

Medicinregneren i temaet er deterministisk (ingen AI) og kun til undervisning; ansvarsfraskrivelsen kan redigeres i sektionen.

## Udvikling

```bash
cd tools && npm install
node check.mjs                  # Shopify Theme Check
node preview.mjs 4173           # http://localhost:4173/  (?template=page.contact, /cart, /404 …)
node shoot.mjs http://localhost:4173 shots   # skærmbilleder + test af alle 9 beregninger
```
