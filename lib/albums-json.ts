import type { AlbumWithHost } from "./content";
import type { Host, Link, Track } from "./schema";

export type AlbumJson = {
  number: number;
  title: string;
  artist: string;
  host: Host;
  played_on: string;
  spotify?: string | null;
  label?: string | null;
  year?: number | null;
  released_on?: string | null;
  /** Durations are seconds. */
  tracks?: Track[];
  links?: Link[] | null;
  tags?: string[] | null;
};

/**
 * /getter finds gaps with `_.filter(albums, { tags: null })` — which does not
 * match a key that is merely missing. Absent values are emitted as null rather
 * than dropped by JSON.stringify.
 */
const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

export const toAlbumJson = (album: AlbumWithHost): AlbumJson => ({
  number: album.number,
  title: album.title,
  artist: album.artist,
  host: album.host,
  played_on: album.played_on,
  spotify: orNull(album.spotify),
  label: orNull(album.label),
  year: orNull(album.year),
  released_on: orNull(album.released_on),
  // Tracks are omitted entirely when there are no tracks.
  ...(album.tracks ? { tracks: album.tracks } : {}),
  links: orNull(album.links),
  tags: orNull(album.tags),
});
