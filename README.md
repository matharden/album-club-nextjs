# Album Club

A Next.js (App Router) site for a record-listening club. `data/albums.yml` is
the CMS: commit a change to it and Vercel rebuilds.

## Running locally

```shell
cp .env.example .env.local   # then fill in SITE_TITLE etc.
npm install
npm run dev
```

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build — also validates the YAML |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run optimise-covers` | Re-encode `public/covers` to WebP (`-- --dry-run` to preview) |

There is also a `docker-compose up` setup.

## Architecture

```
data/albums.yml        # the CMS — 185 albums
data/hosts.yml         # host name -> display name
lib/schema.ts          # zod schema; the build fails on violations
lib/content.ts         # read + validate + derive, once per build
lib/routes.ts          # resolves a root-level slug to a page kind
app/**/page.tsx        # Server Components call getContent() directly
```

`getContent()` is wrapped in React's `cache()`, so the YAML is read, parsed and
indexed once per build rather than once per route. It returns the albums plus
derived indexes (`bySlug`, `byNumber`, `byHost`, `byYear`, `byDecade`).

`lib/content.ts` imports `server-only`, so pulling it into a Client Component
fails at build time instead of trying to bundle `fs`.

### Routing

Leverage dynamic segments for albums, hosts, years and decades using
`app/[slug]` route resolving all of them via `lib/routes.ts`:

| Path | Page |
| --- | --- |
| `/185-fire-and-water` | Album |
| `/185` | Redirects to the album |
| `/mat` | Albums chosen by a host |
| `/1994` | Albums released that year |
| `/1990s` | Albums released that decade |
| `/archive`, `/stats`, `/getter` | Static routes, which take precedence |

`/albums.json` is a static Route Handler. Its shape is a contract — the search 
box, `/stats` and `/getter` all fetch it.

## Editing content

Add an album to the top of `data/albums.yml`. Only `number`, `artist`, `title`,
`hosted_by` and `played_on` are required; the views already cope with the rest
being absent. `hosted_by` must match a `name` in `data/hosts.yml` or the build
fails.

Covers go in `public/covers/` and are referenced as
`cover: ../images/covers/<file>`, rewritten to a public URL by the schema. An
album with no local cover falls back to `cover_external`.

After adding art, run `npm run optimise-covers`. It re-encodes anything that is
not already WebP within a 1000px ceiling, renames the file, and updates the
`cover:` paths in `data/albums.yml` to match. Covers arrive at wildly varying
sizes — the initial pass took 115MB down to 17MB — and while `next/image`
re-encodes on the fly so delivered bytes are unchanged, the originals are dead
repo and deploy weight. The script is safe to re-run: a cover already within the
ceiling is left untouched rather than re-encoded, so quality never compounds
away. It also reports covers referenced by the YAML but missing from disk, and
files no album uses. Pass `-- --dry-run` to see what it would do first.

## Notes from the Gatsby migration

Three data-layer details are worth knowing, because they are silent traps:

- **Track durations.** These are written `3:57`. Gatsby's js-yaml v3 resolved
  that to `237` via YAML 1.1 sexagesimal integers, which is why the old schema
  declared `duration: Int!`. js-yaml v4 dropped sexagesimal support and yields
  the string `"3:57"`. `lib/schema.ts` now converts to seconds explicitly
  rather than relying on the parser.
- **Dates.** Unquoted `2024-11-22` parses to a `Date`; quoted `'2024-11-22'`
  stays a string. Both spellings appear in the file. The schema normalises to a
  `YYYY-MM-DD` string — what `@dateformat` used to hand the components, and what
  code like `played_on.slice(0, 4)` still expects. Formatting goes through UTC,
  since a bare YAML date is midnight UTC and local formatting would report the
  previous day west of Greenwich.
- **Empty YAML** parses to `undefined`. That is the project's deliberate zero
  state, so the schema maps it to `[]`; anything actually malformed still fails
  the build.

### Mapping

| Gatsby | Here |
| --- | --- |
| Page query / `useStaticQuery` | `await getContent()` |
| `gatsby-node.js` → `createPages` | `generateStaticParams()` |
| `createSchemaCustomization` | `lib/schema.ts` (zod) |
| `@link(by: "name", from: "hosted_by")` | Join in `getContent()` |
| `gatsby-source-filesystem` + transformer | `fs.readFile` + `js-yaml` |
| `gatsby-plugin-image` / sharp | `next/image` |
| `react-helmet` / `Head` export | `metadata` / `generateMetadata()` |
| `gatsby-plugin-google-gtag` | `next/script` in `app/layout.tsx` |
| `gatsby-omni-font-loader` | `<link>` to Google Fonts in `app/layout.tsx` |
| `gatsby-plugin-sass` | Built in (`sass` installed) |
| GraphQL filters/sorts | `.filter()`, `.sort()`, `Map` indexes |

## Environment variables

All are read at build time, so changing one needs a rebuild. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `SITE_TITLE` | Header text and page-title suffix |
| `SITE_URL` | Metadata base for absolute URLs |
| `GOOGLE_FONT_NAME` | Google Font to load, exposed as `--font-name` |
| `GOOGLE_ANALYTICS_ID` | Optional; no script is injected when unset |
| `NEXT_PUBLIC_SPOTIFY_TOKEN` | Optional; `/getter` only |
