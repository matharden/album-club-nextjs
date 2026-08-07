import "server-only";

import { getContent, type AlbumWithHost } from "./content";
import type { Host } from "./schema";

/**
 * Gatsby's `createPages` put albums, hosts, years and decades all at the root
 * of the URL space. Next allows only one dynamic segment per level, so a single
 * `app/[slug]` route resolves the lot. Static routes (/archive, /stats) still
 * take precedence over the dynamic segment.
 */
export type Route =
  | { kind: "album"; album: AlbumWithHost }
  /** `/185` — the numeric shortcut, which Gatsby served as a meta-refresh page. */
  | { kind: "album-redirect"; album: AlbumWithHost }
  | { kind: "host"; host: Host; albums: AlbumWithHost[] }
  | { kind: "year"; year: number; albums: AlbumWithHost[] }
  | { kind: "decade"; decade: number; albums: AlbumWithHost[] };

export async function resolveRoute(slug: string): Promise<Route | null> {
  const { bySlug, byNumber, byHost, byYear, byDecade, hosts } = await getContent();

  const album = bySlug.get(slug);
  if (album) return { kind: "album", album };

  if (/^\d+$/.test(slug)) {
    const numbered = byNumber.get(parseInt(slug, 10));
    if (numbered) return { kind: "album-redirect", album: numbered };

    const year = parseInt(slug, 10);
    const inYear = byYear.get(year);
    if (inYear) return { kind: "year", year, albums: inYear };
  }

  const decadeMatch = /^(\d{4})s$/.exec(slug);
  if (decadeMatch) {
    const decade = parseInt(decadeMatch[1], 10);
    const inDecade = byDecade.get(decade);
    if (inDecade) return { kind: "decade", decade, albums: inDecade };
  }

  const host = hosts.find((h) => h.name === slug);
  if (host) return { kind: "host", host, albums: byHost.get(host.name) ?? [] };

  return null;
}

/** Every root-level path Gatsby's createPages used to generate. */
export async function allRouteSlugs(): Promise<string[]> {
  const { albums, hosts, years, decades } = await getContent();
  return [
    ...albums.map((album) => album.slug),
    ...albums.map((album) => String(album.number)),
    ...hosts.map((host) => host.name),
    ...years.map((year) => String(year)),
    ...decades.map((decade) => `${decade}s`),
  ];
}
