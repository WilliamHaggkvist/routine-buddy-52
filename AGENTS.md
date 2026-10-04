<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Dagsform – working rules

The app is a Swedish-language, mobile-first daily-structure tool for a user with
ADHD/autism. Non-negotiables:

- All user-facing text is Swedish. Keep copy short, warm, never scolding.
- Mobile-first: large hit targets (min-h-16 rows, h-14 inputs, size-14 buttons),
  bottom navigation, safe-area insets, no modals for core flows.
- Visual progress and gentle nudging over numbers, scores or streak pressure.
- Weeks always run Monday–Sunday.

## Structure

- Routes are file-based in `src/routes` (TanStack Start). Never hand-edit
  `src/routeTree.gen.ts`. Never introduce `react-router-dom` or a page switcher.
- Server logic: `createServerFn` from `@tanstack/react-start` in client-safe
  modules (`src/lib/*.functions.ts`); `*.server.ts` stays server-only; public
  HTTP endpoints under `src/routes/api/public/*`.
- Read secrets with `process.env['NAME']` inside handlers. Server-only values are
  injected by the platform; locally they come from `.env.local` via
  `bun run dev:local`.
- Do not edit generated files: `src/integrations/supabase/*`, `.env`,
  `supabase/config.toml`.
- Keep the request middleware in `src/start.ts` intact.
- Every new public table needs GRANTs, RLS enabled and policies in the same
  migration. Roles never live on the profile table.
- Colors and shadows come from the design tokens in `src/styles.css` — no
  hardcoded color utilities.

## Verify before finishing

- `bunx tsgo --noEmit` for types, `bun run build` for the bundle. Install with
  `bun install` (`bun.lock` is the committed lockfile; `bunfig.toml`'s 24h
  supply-chain guard must stay).
- For UI/state behaviour, drive the running app with Playwright (viewport
  390×1400) instead of assuming.
- Local runs hit the same live database — use throwaway accounts and clean up.
