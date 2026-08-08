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

export type Album = z.infer<typeof AlbumSchema>;
export type Host = z.infer<typeof HostSchema>;
export type Track = z.infer<typeof Track>;
export type Link = z.infer<typeof Link>;
