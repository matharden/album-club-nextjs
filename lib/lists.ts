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
  name: string;
  rank: number | null;
  /** Deep link to the entry on the list's page. */
  url: string;
};

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
  const base = list.url.replace(/#.*$/, "");

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
 * Matches every album against every list. Returns album number -> the lists
 * it appears on, in `site.yml` order.
 */
export function matchLists(
  albums: Album[],
  lists: BestOfList[],
  dataDir: string,
): Map<number, ListAppearance[]> {
  const result = new Map<number, ListAppearance[]>();
  if (lists.length === 0) return result;

  const byKey = new Map<string, Album[]>();
  for (const album of albums) {
    const key = matchKey(album.artist, album.title);
    const existing = byKey.get(key);
    if (existing) existing.push(album);
    else byKey.set(key, [album]);
  }

  for (const list of lists) {
    for (const entry of loadEntries(list, dataDir)) {
      for (const album of byKey.get(matchKey(entry.artist, entry.title)) ?? []) {
        const appearance: ListAppearance = {
          name: list.name,
          rank: entry.rank ?? null,
          url: entryUrl(list, entry),
        };
        const existing = result.get(album.number);
        if (existing) existing.push(appearance);
        else result.set(album.number, [appearance]);
      }
    }
  }

  return result;
}
