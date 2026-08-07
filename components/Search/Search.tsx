"use client";

import cn from "classnames";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Icon from "@/components/Icon";
import type { AlbumJson } from "@/lib/albums-json";

import styles from "./Search.module.scss";

type Result = {
  artist: string;
  host: string;
  number: number;
  title: string;
  year?: number | null;
  /** The concatenated haystack actually queried. */
  search: string;
};

const Search = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
}) => {
  const [query, setQuery] = useState("");
  const [searchData, setSearchData] = useState<Result[]>();

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/albums.json");
      const albums: AlbumJson[] = await response.json();
      setSearchData(
        albums
          .map(({ artist, host, number, played_on, title, tracks, year }) => ({
            artist,
            host: host.display_name,
            number,
            title,
            year,
            search: JSON.stringify(
              [
                artist,
                host.display_name,
                `#${number}`,
                played_on.slice(0, 10),
                title,
                tracks?.map(({ name }) => name),
                `@${year}`,
              ].join(";"),
            ).toLowerCase(),
          }))
          .reverse(),
      );
    }
    fetchData();
  }, []);

  const results = useMemo(
    () =>
      searchData?.filter((album) => album.search.includes(query.toLowerCase())),
    [query, searchData],
  );

  return (
    <div className={cn(styles.el, { [styles.open]: open })}>
      <input
        placeholder="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.query}
      />
      <button onClick={() => onClose(false)} className={styles.close}>
        <Icon icon="close_white" />
      </button>
      {results && query && (
        <ul className={styles.results}>
          {results.map((result) => (
            <li className={styles.result} key={result.number}>
              <Link href={`/${result.number}`} onClick={() => onClose(false)}>
                #{result.number} {result.title}
                <span className={styles.sub}>
                  {result.artist} • {result.year} • {result.host}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
