import { z } from "zod";

/**
 * js-yaml resolves unquoted `2024-11-22` to a Date (the YAML timestamp type)
 * but leaves quoted `'2024-11-22'` as a string. Both spellings appear in
 * albums.yml, so normalise to a plain `YYYY-MM-DD` string, and what code like
 * `played_on.slice(0, 4)` expects.
 *
 * Formatting goes through UTC deliberately: js-yaml parses a bare date as
 * midnight UTC, so local-time formatting would report the previous day for
 * anyone west of Greenwich.
 */
const YamlDate = z
  .union([z.date(), z.string()])
  .transform((value, ctx) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    ctx.addIssue({ code: "custom", message: `Expected a YYYY-MM-DD date, got "${value}"` });
    return z.NEVER;
  });

/**
 * Track durations are written as `3:57`. js-yaml v4 dropped sexagesimal
 * support, so the same file now yields the string "3:57". Convert explicitly
 * rather than relying on a parser quirk; a bare number is already seconds.
 */
const Duration = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "number") return value;
    const match = /^(\d+):([0-5]\d)$/.exec(value);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
    ctx.addIssue({ code: "custom", message: `Expected seconds or m:ss, got "${value}"` });
    return z.NEVER;
  });

/** `../images/covers/x.jpg` (relative to src/data) becomes a public/ URL. */
const CoverPath = z
  .string()
  .transform((value) => value.replace(/^\.\.\/images\//, "/"));

const Track = z.object({
  number: z.number().int(),
  name: z.string(),
  duration: Duration,
});

const Link = z.object({
  label: z.string(),
  url: z.string(),
});

export const AlbumSchema = z.object({
  number: z.number().int(),
  artist: z.string(),
  title: z.string(),
  hosted_by: z.string(),
  played_on: YamlDate,
  cover: CoverPath.nullish(),
  cover_external: z.string().nullish(),
  spotify: z.string().nullish(),
  label: z.string().nullish(),
  released_on: YamlDate.nullish(),
  year: z.number().int().nullish(),
  tracks: z.array(Track).nullish(),
  tags: z.array(z.string()).nullish(),
  links: z.array(Link).nullish(),
  // Legacy fields, carried by a handful of entries and unused by any view.
  // Declared so the schema stays a faithful record of the file.
  month_slot: YamlDate.nullish(),
  playcount: z.string().nullish(),
});

export const HostSchema = z.object({
  name: z.string(),
  display_name: z.string(),
});

/**
 * An empty YAML file parses to `undefined`. That is the project's deliberate
 * "zero state" (see the `zero` branch), not a broken file, so allow it — while
 * still failing the build on anything malformed.
 */
const emptyFileAsList = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((value) => value ?? [], z.array(item));

export const AlbumsFileSchema = emptyFileAsList(AlbumSchema);
export const HostsFileSchema = emptyFileAsList(HostSchema);

/**
 * One album on a published best-of list. `key` is whatever the list's `link`
 * style needs to point at this entry (an anchor id, a path segment or a query
 * value); without one the link falls back to a text fragment on `text`, or on
 * the title.
 */
const ListEntry = z.object({
  rank: z.number().int().nullish(),
  artist: z.string(),
  title: z.string(),
  year: z.number().int().nullish(),
  key: z.string().nullish(),
  text: z.string().nullish(),
});

/**
 * How an entry's link is built from the list `url`:
 *
 *   fragment  url#key
 *   path      url/key
 *   query     url?param=key
 *   text      url#:~:text=… (a browser text fragment, needs no key)
 */
const ListLinkStyle = z.enum(["fragment", "path", "query", "text"]);

/**
 * A best-of list declared in `site.yml`. Albums are matched to its entries by
 * artist and title at build time, so a newly added album picks up any list it
 * is on without touching `albums.yml`. `entries` is inline, or a path to a
 * YAML file in the data repo (e.g. `lists/guardian.yml`).
 */
const BestOfList = z.object({
  name: z.string(),
  url: z.string(),
  link: ListLinkStyle.default("text"),
  param: z.string().nullish(),
  /**
   * Badge background: any CSS colour, e.g. `blue`, `#c00`, `oklch(70% 0.1 200)`
   * or `var(--color-siena)`. Characters that could end the declaration are
   * refused, since the value is written into a style attribute.
   */
  color: z
    .string()
    .regex(/^[^;{}<>]+$/, "Expected a CSS colour")
    .nullish(),
  entries: z.union([z.string(), z.array(ListEntry)]),
});

export const ListEntriesFileSchema = emptyFileAsList(ListEntry);

/** `site.yml`: optional, and so is every key in it. */
export const SiteFileSchema = z.preprocess(
  (value) => value ?? {},
  z.object({
    title: z.string().nullish(),
    url: z.string().nullish(),
    font: z.string().nullish(),
    google_analytics_id: z.string().nullish(),
    lists: z.array(BestOfList).nullish(),
  }),
);

export type Album = z.infer<typeof AlbumSchema>;
export type Host = z.infer<typeof HostSchema>;
export type Track = z.infer<typeof Track>;
export type Link = z.infer<typeof Link>;
export type ListEntry = z.infer<typeof ListEntry>;
export type BestOfList = z.infer<typeof BestOfList>;
