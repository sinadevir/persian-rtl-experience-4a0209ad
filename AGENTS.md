<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

<!-- AGENT-MEMORY:BEGIN -->
- All backend calls go through `src/lib/api/client.ts` (`api.property` / `api.foundation`). Why: one place adds auth/tenant/correlation headers and turns ProblemDetails into `ApiError`.
- Per-domain API modules live in `src/features/<domain>/api.ts` (foundation services in `src/features/foundation/*.ts`): query option factories (`pagedQuery`/`listQuery`/`itemQuery`), `map*` readers and a `*Api` object of mutations typed with `src/lib/api/generated/*` (generated from `Docs/*.Swagger.json` by openapi-typescript; regenerate, never hand-edit). Why: Swagger documents requests only, so response readers use `pick/str/num` to tolerate camelCase/PascalCase and paged/array shapes.
- Pages read with `useQuery(xxxQuery(...))` in the component (no SSR loaders) and write with `useApiMutation` + `invalidate`. Why: the session token lives in browser storage, so data loads after hydration.
- Lists use `DataTable` in server mode (`usePaged` + `tableState`) whenever the endpoint has page/search params; forms use `FormSheet` (async onSubmit, `rule`/`validate`, `entity` pickers, `ref` reference-group codes); irreversible actions use `ConfirmAction`. Why: consistent loading/error/empty states and Persian validation.
- Hide actions with `<Can perm={P.X}>` / `useCan`; codes live in `src/lib/auth/permission-codes.ts`. When the user's roles cannot be read, permissions are "unknown" and the server's 403 decides. Why: permissions come from BusinessFoundation Access.
- Numeric enum codes whose meaning is not documented (address type, link role, assignment type…) use `type: "ref"` with a reference group, never invented labels. Why: Docs state those meanings are not fixed.
- No sign-in or settings pages for now: `AuthGate` in `__root` always renders `PermissionProvider` + `AppShell` after hydration. Server URLs come from `VITE_*` env only. Sidebar categories are collapsible (`NavCategory`), opening the one holding the current page.
- tsconfig keeps `strict` + `noUncheckedIndexedAccess` but turns off `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature`. Why: generated DTOs use `T | null` optionals and form values are an index map; those flags made every form submit a type error.
- Demo mode: when no server URL is configured, `apiRequest` answers GETs from `src/lib/api/demo.ts` (generic records built from the field names readers use, listed in `demo-keys.ts`) and fakes write success; the header shows a demo badge. Why: the backend is not connected yet and staff need to see screens filled; it switches off automatically once URLs are set.
<!-- AGENT-MEMORY:END -->
- `PersianText` (mounted in `__root`) rewrites rendered text: ISO dates become Solar Hijri and Latin digits become Persian; inputs/`[data-keep-latin]` are skipped. Why: user requires the whole UI in Persian with Solar Hijri dates only, including raw server values; still format dates with `toJalali*` in code.
- Right-to-left everywhere: `src/styles.css` forces `direction: rtl` on html/body and every table part, and `Table` sets `dir="rtl"`, so tables stay RTL even if the page `dir` is lost; `DirectionProvider dir="rtl"` in `__root` drives every Radix part; keep `@radix-ui/react-direction` pinned to the same version the Radix packages bundle, or the context is ignored and tabs/menus fall back to LTR. UI-kit classes use logical sides (`ps/pe/ms/me/start/end/text-start`), and inputs never get `dir="ltr"` (the `Field.ltr` flag no longer changes direction). Why: the user requires no left-to-right layout anywhere.
- Dates are formatted by hand in `src/lib/jalali.ts` with jalaali-js (not `Intl`), and short dates put a right-to-left mark (`RLM`) before each slash so the year sits on the right. Why: `Intl` fa-IR long dates came out in English order, and plain «۱۴۰۴/۰۲/۲۵» is laid out left-to-right by the browser; strip `RLM` before parsing a formatted date.
- Table filters live in the first header row (`Column.filter`, `src/components/cis/column-filter.tsx`). Every column gets one: declared filters (explicit `filter`/`param`, or a `filters` select matching a column) go to the server; other columns get an inferred yes/no, date, status pick list or text filter that narrows the rows already loaded (on server tables: the current page, noted in the footer). Why: user wants each column filtered in place with a control that fits it.
- Brand colours come from `--logo-blue` / `--logo-blue-light` in `src/styles.css` (primary, ring, sidebar, charts); never add another blue. Why: user requires the exact logo blues.
