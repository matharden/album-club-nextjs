"use client";

import { useEffect, useState } from "react";

import type { AlbumJson } from "./albums-json";

/**
 * The static /albums.json is the client-side view of the content, used by the
 * search index and the menu's year/host lists. The promise is memoised at
 * module scope so several components mounting together share one request.
 */
let request: Promise<AlbumJson[]> | undefined;

const load = () =>
  (request ??= fetch("/albums.json").then(
    (response) => response.json() as Promise<AlbumJson[]>,
  ));

export function useAlbums(): AlbumJson[] | undefined {
  const [albums, setAlbums] = useState<AlbumJson[]>();

  useEffect(() => {
    let current = true;
    load().then((data) => {
      if (current) setAlbums(data);
    });
    return () => {
      current = false;
    };
  }, []);

  return albums;
}
