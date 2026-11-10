"use client";

import { useEffect, useState } from "react";

import type { ListJson } from "@/app/lists.json/route";

/** The static /lists.json, for the menu. Memoised like `useAlbums`. */
let request: Promise<ListJson[]> | undefined;

const load = () =>
  (request ??= fetch("/lists.json").then(
    (response) => response.json() as Promise<ListJson[]>,
  ));

export function useLists(): ListJson[] | undefined {
  const [lists, setLists] = useState<ListJson[]>();

  useEffect(() => {
    let current = true;
    load().then((data) => {
      if (current) setLists(data);
    });
    return () => {
      current = false;
    };
  }, []);

  return lists;
}
