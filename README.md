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
3. **Installera beroenden** – `bun install` (låsfilen `bun.lock` finns med)
   eller `npm install`.
4. **Starta** – `npm run dev:local` (laddar `.env` och `.env.local` in i
   processen innan Vite startar). Vanlig `npm run dev` ger bara webbläsarvari-
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
npm run dev:local   # utvecklingsserver med alla värden laddade
npm run dev         # bara webbläsarvariablerna (inloggning fungerar ej)
npm run build       # produktionsbygge
npm run lint        # eslint
npm run format      # prettier
```
