# Idag som en riktig dagsvy + uppgifter som i To Do

Idag-sidan blir en tidsordnad dag där rutiner och enstaka uppgifter blandas, uppgifter får riktiga detaljer (datum, klockslag, lista, hur lång tid det tar, återkommande), och en ny flik **Planerat** visar det som ligger framåt.

## 1. Idag – blandad tidslinje

- Dagens innehåll sorteras efter tid i en enda ström: uppgifter med klockslag och rutiner med tidsfönster blandas i tidsordning.
- Saker utan tid hamnar i en egen grupp "När som helst idag" direkt efter tidslinjen.
- Rutiner ser ut som idag (hopfällbart kort med steg och egen progress), uppgifter som en rad man bockar av.
- Grupper i ordning: **Nu** (pågår eller inom kort), **Senare idag** (tidsordnat), **När som helst idag**, **Klart idag** (hopfällt), **Missat**.
- Progressringen, veckostaplarna och streaken är kvar oförändrade högst upp.

## 2. Lägga till uppgifter

Snabbfältet finns kvar, men får snabbval precis under fältet innan man sparar:

- Datum: Idag / Imorgon / Välj datum (kalender)
- Klockslag (valfritt)
- Lista (valfritt, dina egna listor)
- Hur lång tid: 2 / 10 / 30 min
- Återkommer: varje dag / vardagar / valda veckodagar

Valen visas som små knappar som kommer fram när man börjar skriva, så fältet är lugnt när man inte behöver dem.

## 3. Detaljvy för en uppgift

Trycker man på texten i en uppgift (var som helst i appen) glider en detaljpanel upp underifrån:

- Ändra titel, anteckning, datum, klockslag, lista, tidsuppskattning och återkommande
- Delsteg (underuppgifter) som kan bockas av
- Knappar: Flytta till idag, Flytta till imorgon, Släpp den, Ta bort
- Att bocka av uppgiften fungerar även härifrån

## 4. Ny flik: Planerat

- Visar kommande dagar grupperade: Imorgon, Denna vecka, Senare, samt Utan datum
- Varje rad kan flyttas till idag eller öppnas i detaljvyn
- Bottenmenyn får fem flikar: Idag, Planerat, Rutiner, Listor, Jag – med kortare etiketter så de får plats på telefonen

## 5. Listor

- Idag-knappen per uppgift är kvar (din valda väg att plocka in saker i dagen)
- Uppgifter i listor visar datum och klockslag tydligare och öppnar samma detaljvy
- Uppgifter utan lista samlas under "Inkorg"

## Tekniska detaljer

- Databasen räcker som den är: `tasks` har redan `due_date`, `due_time`, `list_id`, `parent_id`, `notes`, `recurrence`, `recurrence_days`, `estimate_minutes`. Ingen migration behövs.
- `getDashboard` utökas med en sorteringsnyckel per uppgift/rutin (klockslag respektive `window_start`) och behåller `bucket` (`today`/`missed`/`later`/`backlog`) så Planerat kan filtrera på `later` + uppgifter utan datum.
- `createTask` tar redan emot alla fält; snabbvalen skickar dem direkt. `updateTask` används av detaljvyn (patch-baserad) och `recomputeDay` körs som idag efter ändringar som rör dagens datum.
- Ny gemensam komponent `TaskSheet` (shadcn Sheet, botten-variant) plus `TaskComposer` för snabbvalen, används från Idag, Planerat och Listor. Datum via shadcn Calendar i Popover.
- Ny rutt `src/routes/_authenticated/planerat.tsx` med egen head-metadata; `BottomNav` uppdateras till fem flikar.
- Allt byggs mobilförst: stora träffytor, inga smala rader, tidsordningen beräknas i användarens tidszon som idag.
