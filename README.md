# Dagsform

Lugn app för struktur i vardagen: att göra, rutiner och mjuka påminnelser, byggd
för hjärnor med sämre exekutiva funktioner.

**Live app**: https://routine-buddy-52.lovable.app
**Bygg vidare i Lovable**: https://lovable.dev/projects/1a52bf89-3a57-4f4c-9bcc-370f5d46a600

## Tech

TanStack Start v1 (React 19, Vite, filbaserad routing i `src/routes`), Tailwind
CSS v4 (`src/styles.css`), shadcn/Radix-komponenter i `src/components/ui`,
backend via Lovable Cloud (Supabase) i `src/integrations/supabase`.

## Köra lokalt (t.ex. i Antigravity IDE)

1. **Få hem koden.** I Lovable: Project Settings → Git → anslut GitHub/GitLab
   (Lovable skapar ett privat repo och håller det synkat), eller **Download
   codebase** som zip.
2. **Klona och öppna mappen** i din IDE.
3. **Installera beroenden** – `bun install`. Låsfilen `bun.lock` följer med
   repot, så bun är det som rekommenderas. `npm install` fungerar också men
   skriver en egen låsfil (`package-lock.json`) – håll dig till ett verktyg så
   att du inte committar två låsfiler som kan hamna ur synk.
4. **Starta** – `bun run dev:local` (laddar `.env` och `.env.local` in i
   processen innan Vite startar). Vanlig `bun run dev` ger bara webbläsarvari-
   ablerna, då slutar inloggningen fungera.

### Värden som inte följer med repot

Hemligheter lagras i Lovable och exporteras aldrig. Skapa en `.env.local` utifrån
`.env.example`. Utan dem fungerar appen men:

| Saknas | Konsekvens |
| --- | --- |
| `PIN_PEPPER` | Befintliga konton kan inte loggas in lokalt – skapa ett testkonto |
| `VAPID_*` | Push-notiser skickas inte |
| `REMINDER_CRON_SECRET` | Påminnelsejobbet nekas |
| `SUPABASE_SERVICE_ROLE_KEY` | Kontoskapande och PIN-byte kräver den, och den finns inte att hämta från Lovable |

### Lokalt = samma riktiga data

`.env` pekar mot den gemensamma databasen som även den publicerade appen använder.
Använd ett testkonto och testuppgifter när du skriver lokalt, och ta bort dem
efteråt.

## Synka tillbaka till Lovable

Lovable redigerar och synkar en gren i taget (oftast `main`).

- Arbeta på en egen gren, merge in i den synkade grenen – Lovable plockar upp
  ändringarna i editorn.
- Force-pusha, rebasea eller squash:a **inte** commits som redan finns på den
  synkade grenen. Ångra du dig, gör en ny commit som återställer.
- Publicering sker fortfarande från Lovable.

## Kommandon

```sh
bun install         # installera beroenden (bun.lock är låsfilen)
bun run dev:local   # utvecklingsserver med alla värden laddade
bun run dev         # bara webbläsarvariablerna (inloggning fungerar ej)
bun run build       # produktionsbygge
bun run lint        # eslint
bun run format      # prettier
bunx tsgo --noEmit  # kontrollera typfelen
```

Allt ovan fungerar med `npm` i stället för `bun` (då `npx` i stället för
`bunx`). `bunfig.toml` innehåller en leverantörskedjeregel: bun hoppar över
paketversioner som släppts för mindre än ett dygn sedan. Behöver du en alldeles
ny version, lägg till ett undantag i `minimumReleaseAgeExcludes` – säg till
först, annars smyger sig den regeln bort.

## Lokalt testkonto

Lokalt saknas den hemliga PIN-pepparn, så dina vanliga konton går inte att logga in med där.
Använd i stället utvecklingskontot (lämna `PIN_PEPPER` tom i `.env.local`):

- E-post: `lokal@dagsform.dev`
- PIN: `1234`

Kontot ligger i samma databas som appen, men syns bara för den som loggar in med det.
Det går **inte** att logga in med det i den publicerade appen (där används den riktiga pepparn).
