"use client";

import cn from "classnames";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAlbums } from "@/lib/use-albums";

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
  children,
  className,
  initialQuery = "",
  onQueryChange,
  onSubmit,
}: {
  /** Rendered inside the form, alongside the input. */
  children?: ReactNode;
  className?: string;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  /**
   * Called on submit instead of the form's own navigation. Left out where
   * pressing enter should do nothing, as in the menu, which searches as you
   * type.
   */
  onSubmit?: (query: string) => void;
}) => {
  const [query, setQuery] = useState(initialQuery);
  const albums = useAlbums();

  const searchData = useMemo<Result[] | undefined>(
    () =>
      albums
        ?.map(({ artist, host, number, played_on, title, tracks, year }) => ({
          artist,
          host: host.display_name,
          number,
          title,
          year,
          // The sigils make a term searchable on its own: `@mat` for the host,
          // `#42` for the album number, `!1994` for the release year.
          search: JSON.stringify(
            [
              artist,
              `@${host.display_name}`,
              `#${number}`,
              played_on.slice(0, 10),
              title,
              tracks?.map(({ name }) => name),
              `!${year}`,
            ].join(";"),
          ).toLowerCase(),
        }))
        .reverse(),
    [albums],
  );

  const results = useMemo(
    () =>
      searchData?.filter((album) => album.search.includes(query.toLowerCase())),
    [query, searchData],
  );

  // Follow the query from the URL, which the standalone search page updates.
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(query);
  };

  return (
    <div className={cn(styles.el, className)}>
      <form action="/search" onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.query}
          id="search"
          name="q"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search"
          type="search"
          value={query}
        />
        {children}
      </form>
      {query && (
        <>
          <div className={styles.line} />
          <div className={styles.inner} />
        </>
      )}
      {results && query && (
        <ul className={styles.results}>
          {results.map((result) => (
            <li className={styles.result} key={result.number}>
              <Link href={`/${result.number}`}>
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
