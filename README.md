# Album Club

A Next.js (App Router) site for a record-listening club. `data/albums.yml` is
the CMS: commit a change to it and Vercel rebuilds.

Migrated from the GatsbyJS version, with the GraphQL data layer removed.

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

There is also a `docker-compose up` setup, carried over from the Gatsby project.

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
derived indexes (`bySlug`, `byNumber`, `byHost`, `byYear`, `byDecade`), each of
which replaces a GraphQL query the Gatsby version ran.

`lib/content.ts` imports `server-only`, so pulling it into a Client Component
fails at build time instead of trying to bundle `fs`.

### Routing

Gatsby's `createPages` put albums, hosts, years and decades all at the root of
the URL space. Next allows one dynamic segment per level, so a single
`app/[slug]` route resolves all of them via `lib/routes.ts`:

| Path | Page |
| --- | --- |
| `/185-fire-and-water` | Album |
| `/185` | Redirects to the album (Gatsby used a `<meta refresh>`) |
| `/mat` | Albums chosen by a host |
| `/1994` | Albums released that year |
| `/1990s` | Albums released that decade |
| `/archive`, `/stats`, `/getter` | Static routes, which take precedence |

`/albums.json` is a static Route Handler replacing the `fs.writeFileSync` step
in `gatsby-node.js`. Its shape is a contract — the search box, `/stats` and
`/getter` all fetch it.

## Editing content

Add an album to the top of `data/albums.yml`. Only `number`, `artist`, `title`,
`hosted_by` and `played_on` are required; the views already cope with the rest
being absent. `hosted_by` must match a `name` in `data/hosts.yml` or the build
fails.

Covers go in `public/covers/` and are referenced as
`cover: ../images/covers/<file>` — the path the Gatsby version used, rewritten
to a public URL by the schema. An album with no local cover falls back to
`cover_external`.

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

Behaviour that changed deliberately:

- `/185` is a real HTTP redirect rather than a meta-refresh page.
- The host name on the album number badge is now styled — the Gatsby version
  passed `styles.host.name`, which was `undefined`, so `.host` never applied.
- `/stats` counted hosts with `countBy(albums, "host")`, which collapsed every
  host into one `[object Object]` bucket once `host` became an object. It counts
  by `host.name` now.
- Clicking a search result closes the search overlay, which client-side
  navigation no longer does for free.
- `/getter` reads its Spotify token from `NEXT_PUBLIC_SPOTIFY_TOKEN` instead of
  a hardcoded constant.

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

Gatsby inlined every env var into the browser bundle. Next only exposes
`NEXT_PUBLIC_*`, so the site title is read on the server and passed to the
layout as a prop.
