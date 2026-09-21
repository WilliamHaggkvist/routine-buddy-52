# Vardagsstruktur – en lugn to-do och rutin-app

En mobilanpassad sida som ersätter Microsoft To Do, byggd för hjärnor med svaga exekutiva funktioner: få val, tydlig visuell progress, mjuka nudgar, streaks och poäng.

## Bärande idé

Startsidan är **Idag** och inget annat. Den visar en progressring med dagens andel avklarat, och under den en kort lista med det som faktiskt ska göras nu. Allt annat (listor, rutiner, inställningar, statistik) ligger bakom en enkel meny i botten.

```text
+----------------------------+
|  God kväll, William        |
|        ( 7 / 10 )          |  <- stor progressring
|   Streak: 12 dagar 🔥      |
+----------------------------+
|  NU                        |
|  [ ] Kvällsrutin  3/5      |
|  [ ] Ta medicin   20:00    |
+----------------------------+
|  SENARE IDAG               |
|  [ ] Diska                 |
+----------------------------+
|  MISSAT (1)  – flytta fram |
+----------------------------+
| Idag | Rutiner | Listor | Jag|
+----------------------------+
```

## Funktioner

**Uppgifter**
- Snabbinmatning: ett fält, en knapp. Titel räcker.
- Valfritt: datum, klockslag, lista, återkommande (varje dag / veckodagar / varje vecka).
- Underuppgifter för större saker, så en uppgift kan delas i små steg.
- Energinivå/tidsuppskattning (2 min, 10 min, 30 min) så du kan filtrera "vad orkar jag nu".
- Missade uppgifter samlas i en egen sektion med knapparna "Gör idag" och "Släpp den" – ingen skamlista.

**Rutiner** (hudvård, kvällsrutin, morgon)
- Checklista med alla steg synliga, bocka av i valfri ordning.
- Varje rutin har tidsfönster (t.ex. 21:00–23:00) och veckodagar, och dyker upp på Idag i sitt fönster.
- Rutinen nollställs automatiskt varje dag/tillfälle.
- Egen progressrad per rutin (3/5) och egen streak.

**Motivation**
- Dagsprogressring + veckoöversikt med fyllda dagar.
- Streak per rutin och en total dagsstreak, med "nådedag" så en missad dag inte nollar allt.
- Poäng för avklarat, med små firanden (konfetti/vibration) vid avbockning och vid fullt hus.

**Påminnelser och nudgar**
- Push-notiser i telefonen (du godkänner notiser en gång, sidan kan sparas på hemskärmen).
- E-postpåminnelser: morgonöversikt och/eller kvällskoll.
- Nudgar inne i appen: mjuka meddelanden när något ligger orört, när ett rutinfönster snart stängs, eller när något missats.
- Egen inställningssida: per typ av påminnelse väljer du kanal (telefon / e-post / bara i appen), tider för morgon- och kvällskoll, tysta timmar och hur peppig tonen ska vara.

**Inloggning**
- Du registrerar dig en gång med e-post (behövs ändå för e-postpåminnelser) och väljer en fyrsiffrig PIN-kod.
- Efter det möts du bara av PIN-koden: fyra stora siffror, ingen e-post, inget lösenord. Enheten håller dig inloggad.
- PIN:en kan bytas under "Jag", och e-posten används för att återställa åtkomst om du glömmer PIN.

## Så här bygger vi, steg för steg

1. **Designförslag** – jag tar fram tre visuella riktningar (lugna, mobilförsta, stora tryckytor) och du väljer en.
2. **Grund + inloggning** – databas, PIN-lås, tom Idag-vy.
3. **Uppgifter och listor** – skapa, bocka av, återkommande, missat-hantering.
4. **Rutiner** – checklistor med tidsfönster och nollställning.
5. **Progress, streaks, poäng** – ringar, veckovy, firanden.
6. **Påminnelser** – notiser i telefonen, e-post, in-app-nudgar och inställningssidan.

Du får se och testa efter varje steg, så vi kan justera tonen och känslan innan vi går vidare.

## Tekniska detaljer

- TanStack Start + Tailwind, Lovable Cloud för databas, konto och serverlogik.
- Tabeller: `profiles` (namn, tidszon, pin_hash, poäng), `lists`, `tasks` (med `due_at`, `recurrence`, `estimate_minutes`, `parent_id`), `task_completions`, `routines`, `routine_steps`, `routine_runs`, `routine_step_completions`, `streaks`, `notification_settings`, `notifications`, `push_subscriptions`. RLS på allt, scopat till `auth.uid()`, med GRANTs.
- PIN: registrering skapar ett vanligt konto (e-post + genererat starkt lösenord som appen håller). PIN-koden hashas server-side (bcrypt) och låser upp den lokalt sparade sessionen; låst läge döljer innehållet. Detta hålls i en server function så PIN-hashen aldrig lämnar servern.
- Återkommande uppgifter och rutiner materialiseras per dag vid inläsning i användarens tidszon, inte via bakgrundsjobb – ger korrekt "idag" oavsett när du öppnar sidan.
- Notiser: Web Push (VAPID-nycklar som secrets) + e-post via Resend, båda triggade från en cron som anropar en publik API-route med delad hemlighet. In-app-nudgar räknas ut klientsidan från dagens data.
- Mobilfokus: installerbar (PWA-manifest), stora träffytor, botten-navigation, inga modaler som kräver precision.
