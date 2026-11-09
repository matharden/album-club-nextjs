# Album Club

A Next.js (App Router) site for a record-listening club. The app holds no club
content: each club keeps its albums, hosts, site settings and cover art in a
separate data repo, pulled in at build time. One app, many clubs, each with its
own data repo and Vercel project.

## Data repos

A data repo looks like `templates/data-repo/`:

```
albums.yml                       # newest first
hosts.yml                        # host name -> display name
site.yml                         # optional: title, url, font, google_analytics_id, lists
lists/                           # optional: best-of list entries named in site.yml
covers/                          # cover art, referenced as ../images/covers/<file>
.github/workflows/deploy.yml     # pings a Vercel deploy hook on push to main
```

### Best-of lists

`site.yml` can name published best-of lists. Each album page then shows the
lists that album is on, matched by artist and title at build time, so a new
album picks them up without any edit to `albums.yml`:

```yaml
lists:
  - name: "The Guardian: 100 best albums of the 21st century"
    url: https://www.theguardian.com/music/2019/sep/13/100-best-albums-of-the-21st-century
    link: fragment   # fragment (url#key) | path (url/key) | query (url?param=key) | text
    entries: lists/guardian-21st-century.yml   # or an inline list
```

An entry is `artist`, `title` and optionally `rank`, `year` and `key` (the
anchor, path segment or query value for that entry). With `link: text`, or an
entry without a `key`, the link is a browser text fragment on the title (or on
the entry's `text`). The entries live in the data repo rather than being
scraped, so builds stay fast and don't break when a publisher changes its page.

`scripts/fetch-data.mjs` runs before `dev` and `build` and fills the gitignored
`data/` and `public/covers/` from the first source that is set:

| Variable | Source |
| --- | --- |
| `ALBUM_CLUB_DATA_DIR` | A local checkout, symlinked so edits land in that repo |
| `ALBUM_CLUB_DATA_REPO` | `owner/name` or a git URL, shallow-cloned |
| neither | The bundled `sample-data/`, so a fresh clone just runs |

`ALBUM_CLUB_DATA_TOKEN` authenticates the clone of a private repo, and
`ALBUM_CLUB_DATA_REF` picks a branch or tag. `npm run data` re-runs the fetch on
its own.

### Setting up a new club

1. Create a repo from `templates/data-repo/` and fill in the YAML.
2. Create a Vercel project from this app repo. Set `ALBUM_CLUB_DATA_REPO`, and
   for a private data repo `ALBUM_CLUB_DATA_TOKEN`: a fine-grained GitHub token
   with read-only Contents access to that one repo.
3. In Vercel, Project Settings → Git → Deploy Hooks, create a hook for the
   production branch. Save its URL in the data repo as the Actions secret
   `VERCEL_DEPLOY_HOOK`. Every push to the data repo's `main` now redeploys.

Pushes to this app repo still redeploy every club's project as usual.

## Running locally

```shell
cp .env.example .env.local   # optionally point ALBUM_CLUB_DATA_DIR at a data repo
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
scripts/fetch-data.mjs # fills data/ and public/covers/ from a data repo
data/                  # fetched content (gitignored)
sample-data/           # fallback content when no data repo is set
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

Content is edited in the data repo, not here. Set `ALBUM_CLUB_DATA_DIR` to a
local checkout of it to preview changes with `npm run dev`.

Add an album to the top of `albums.yml`. Only `number`, `artist`, `title`,
`hosted_by` and `played_on` are required; the views already cope with the rest
being absent. `hosted_by` must match a `name` in `hosts.yml` or the build
fails.

Covers go in the data repo's `covers/` and are referenced as
`cover: ../images/covers/<file>`, rewritten to a public URL by the schema. An
album with no local cover falls back to `cover_external`.

After adding art, run `npm run optimise-covers`. It re-encodes anything that is
not already WebP within a 1000px ceiling, renames the file, and updates the
`cover:` paths in `albums.yml` to match. With `ALBUM_CLUB_DATA_DIR` set, it
works on the data repo checkout through the symlinks, so commit the result there. Covers arrive at wildly varying
sizes — the initial pass took 115MB down to 17MB — and while `next/image`
re-encodes on the fly so delivered bytes are unchanged, the originals are dead
repo and deploy weight. The script is safe to re-run: a cover already within the
ceiling is left untouched rather than re-encoded, so quality never compounds
away. It also reports covers referenced by the YAML but missing from disk, and
files no album uses. Pass `-- --dry-run` to see what it would do first.

## Notes on data management

- **Dates.** Unquoted `2024-11-22` parses to a `Date`; quoted `'2024-11-22'`
  stays a string. Both spellings appear in the file. The schema normalises to a
  `YYYY-MM-DD` string — what `@dateformat` used to hand the components, and what
  code like `played_on.slice(0, 4)` still expects. Formatting goes through UTC,
  since a bare YAML date is midnight UTC and local formatting would report the
  previous day west of Greenwich.
- **Empty YAML** parses to `undefined`. That is the project's deliberate zero
  state, so the schema maps it to `[]`; anything actually malformed still fails
  the build.

## Environment variables

All are read at build time, so changing one needs a rebuild. See `.env.example`.
The data source variables are covered under [Data repos](#data-repos).

The site settings default to the data repo's `site.yml`; a non-empty env var
overrides the file.

| Variable | `site.yml` key | Purpose |
| --- | --- | --- |
| `SITE_TITLE` | `title` | Header text and page-title suffix |
| `SITE_URL` | `url` | Metadata base for absolute URLs |
| `GOOGLE_FONT_NAME` | `font` | Google Font to load, exposed as `--font-name` |
| `GOOGLE_ANALYTICS_ID` | `google_analytics_id` | Optional; no script is injected when unset |
| `NEXT_PUBLIC_SPOTIFY_TOKEN` | | Optional; `/getter` only |
