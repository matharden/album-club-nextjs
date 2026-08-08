import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import yaml from "js-yaml";
import { kebabCase } from "lodash";

import {
  AlbumsFileSchema,
  HostsFileSchema,
  type Album,
  type Host,
} from "./schema";

/** An album with its host joined in and build-time derivations attached. */
export type AlbumWithHost = Album & {
  host: Host;
  /** Route for this album, e.g. `167-the-crossing`. */
  slug: string;
  /**
   * Milliseconds between release and play, or null when `released_on` is
   * absent. Formerly computed per-page by `augmentAlbums()` in src/utils.
   */
  age: number | null;
};

const DATA_DIR = path.join(process.cwd(), "data");

async function readYaml(file: string): Promise<unknown> {
  const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
  return yaml.load(raw);
}

function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Reads, validates and indexes the YAML content.
 *
 * `cache()` dedupes this across every route in a single build; without it the
 * files are re-read and re-parsed once per page.
 */
export const getContent = cache(async () => {
  const [albumsRaw, hostsRaw] = await Promise.all([
    readYaml("albums.yml"),
    readYaml("hosts.yml"),
  ]);

  const albumsData = AlbumsFileSchema.parse(albumsRaw);
  const hosts = HostsFileSchema.parse(hostsRaw);

  const hostsByName = new Map(hosts.map((host) => [host.name, host]));

  // Fail the build when host is missing — the YAML is hand-edited and this is
  // the main safety net.
  const albums: AlbumWithHost[] = albumsData.map((album) => {
    const host = hostsByName.get(album.hosted_by);
    if (!host) {
      throw new Error(
        `Album #${album.number} ("${album.title}") is hosted_by "${album.hosted_by}", ` +
          `which is not defined in data/hosts.yml.`,
      );
    }

    return {
      ...album,
      host,
      slug: kebabCase(`${album.number}-${album.title}`),
      age: album.released_on
        ? new Date(album.played_on).getTime() - new Date(album.released_on).getTime()
        : null,
    };
  });

  // File order is meaningful: albums.yml is newest-first, and the views rely on
  // it (`albums[0]` is the latest, `albums.slice(-1)[0]` the first ever).
  const byNumber = new Map(albums.map((album) => [album.number, album]));
  const bySlug = new Map(albums.map((album) => [album.slug, album]));

  const byHost = new Map<string, AlbumWithHost[]>(
    hosts.map((host) => [
      host.name,
      albums.filter((album) => album.hosted_by === host.name),
    ]),
  );

  const byYear = new Map<number, AlbumWithHost[]>();
  const byDecade = new Map<number, AlbumWithHost[]>();
  for (const album of albums) {
    if (album.year == null) continue;
    push(byYear, album.year, album);
    push(byDecade, decadeOf(album.year), album);
  }
  // The decades template sorted by year ascending; years came through in file order.
  for (const list of byDecade.values()) {
    list.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  }

  return {
    albums,
    hosts,
    byNumber,
    bySlug,
    byHost,
    byYear,
    byDecade,
    /** Distinct years, ascending — replaces `allAlbumsYaml { distinct(field: year) }`. */
    years: [...byYear.keys()].sort((a, b) => a - b),
    /** Distinct decades, ascending. */
    decades: [...byDecade.keys()].sort((a, b) => a - b),
  };
});

/**
 * The album before and after in file order. With the list newest-first, `next`
 * is the older album.
 */
export const getNeighbours = cache(async (slug: string) => {
  const { albums } = await getContent();
  const index = albums.findIndex((album) => album.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: albums[index - 1] ?? null,
    next: albums[index + 1] ?? null,
  };
});

export const siteMetadata = {
  title: process.env.SITE_TITLE ?? "",
  siteUrl: process.env.SITE_URL ?? "http://example.com",
  fontName: process.env.GOOGLE_FONT_NAME ?? "",
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID ?? "",
};
