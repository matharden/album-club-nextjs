import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import {
  ListEntriesFileSchema,
  type Album,
  type BestOfList,
  type ListEntry,
} from "./schema";

/** An album's place on one best-of list, ready to render. */
export type ListAppearance = {
  /** The list's page on this site, `/lists/<slug>`. */
  slug: string;
  name: string;
  /** Badge colour from site.yml, any CSS colour. */
  color: string | null;
  rank: number | null;
  /** Deep link to the entry on the list's page. */
  url: string;
};

/** A best-of list with the club's albums that are on it. */
export type ResolvedList<A extends Album = Album> = {
  slug: string;
  name: string;
  url: string;
  color: string | null;
  /** Matched albums, by rank (best first), unranked ones last in file order. */
  albums: { album: A; rank: number | null; url: string }[];
};

/**
 * URL slug for a list: its entries file without the extension
 * (`lists/guardian-21st-century.yml` -> `guardian-21st-century`), or the
 * slugified name for an inline list.
 */
export function listSlug(list: BestOfList): string {
  const source = typeof list.entries === "string"
    ? path.basename(list.entries).replace(/\.ya?ml$/i, "")
    : list.name;
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Loose key for matching an album to a list entry: case, accents, "&"/"and",
 * a leading "The" and punctuation are all ignored, so "Nick Cave & The Bad
 * Seeds" matches "Nick Cave and the Bad Seeds".
 */
export function matchKey(artist: string, title: string): string {
  const norm = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/^\s*the\s+/, "")
      .replace(/[^a-z0-9]+/g, "");
  return `${norm(artist)}|${norm(title)}`;
}

/**
 * Text fragments use `-` and `,` as syntax, so both must be escaped on top of
 * the usual URI encoding.
 */
function textFragment(text: string): string {
  return `#:~:text=${encodeURIComponent(text).replace(/-/g, "%2D").replace(/,/g, "%2C")}`;
}

export function entryUrl(list: BestOfList, entry: ListEntry): string {
  const key = entry.key ? encodeURIComponent(entry.key) : null;
  const base = (entry.url ?? list.url).replace(/#.*$/, "");

  if (key && list.link === "fragment") return `${base}#${key}`;
  if (key && list.link === "path") return `${base.replace(/\/+$/, "")}/${key}`;
  if (key && list.link === "query") {
    const url = new URL(base);
    url.searchParams.set(list.param ?? "q", entry.key!);
    return url.toString();
  }
  return `${base}${textFragment(entry.text ?? entry.title)}`;
}

function loadEntries(list: BestOfList, dataDir: string): ListEntry[] {
  if (Array.isArray(list.entries)) return list.entries;
  const file = path.join(dataDir, list.entries);
  let raw: unknown;
  try {
    raw = yaml.load(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`site.yml list "${list.name}": cannot read ${list.entries}: ${error}`);
  }
  const parsed = ListEntriesFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`site.yml list "${list.name}": ${list.entries} is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Matches every album against every list. Returns the lists in `site.yml`
 * order, and album number -> the lists that album appears on.
 */
export function matchLists<A extends Album>(
  albums: A[],
  lists: BestOfList[],
  dataDir: string,
): { lists: ResolvedList<A>[]; byAlbum: Map<number, ListAppearance[]> } {
  const byAlbum = new Map<number, ListAppearance[]>();
  const resolved: ResolvedList<A>[] = [];

  const byKey = new Map<string, A[]>();
  for (const album of albums) {
    const key = matchKey(album.artist, album.title);
    const existing = byKey.get(key);
    if (existing) existing.push(album);
    else byKey.set(key, [album]);
  }

  const seen = new Set<string>();
  for (const list of lists) {
    const slug = listSlug(list);
    if (seen.has(slug)) {
      throw new Error(`site.yml: two lists share the slug "${slug}"; give one a different entries file or name.`);
    }
    seen.add(slug);

    const matched: ResolvedList<A>["albums"] = [];
    for (const entry of loadEntries(list, dataDir)) {
      // A list's subtitle in brackets, e.g. "Scary Monsters (And Super
      // Creeps)", still matches the club's shorter "Scary Monsters". Only the
      // list side is trimmed, so a club's "Liquid Swords (Instrumentals)"
      // never matches a list's plain "Liquid Swords".
      const short = entry.title.replace(/\s*[([][^)\]]*[)\]]\s*$/, "");
      const found =
        byKey.get(matchKey(entry.artist, entry.title)) ??
        (short && short !== entry.title ? byKey.get(matchKey(entry.artist, short)) : undefined) ??
        [];
      for (const album of found) {
        const rank = entry.rank ?? null;
        const url = entryUrl(list, entry);
        matched.push({ album, rank, url });
        const appearance: ListAppearance = {
          slug,
          name: list.name,
          color: list.color ?? null,
          rank,
          url,
        };
        const existing = byAlbum.get(album.number);
        if (existing) existing.push(appearance);
        else byAlbum.set(album.number, [appearance]);
      }
    }
    // Stable sort: unranked entries keep file order after the ranked ones.
    matched.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));

    resolved.push({
      slug,
      name: list.name,
      url: list.url,
      color: list.color ?? null,
      albums: matched,
    });
  }

  return { lists: resolved, byAlbum };
}
