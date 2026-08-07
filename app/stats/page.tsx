"use client";

import { getDecade } from "date-fns";
import _ from "lodash";
import { useEffect, useMemo, useState } from "react";

import type { AlbumJson } from "@/lib/albums-json";
import { buildDates, byArtist, processTracks, secondsToDuration, toDuration } from "@/lib/utils";

import styles from "./Stats.module.scss";

/**
 * Provides an array of decades in order of year.
 * @return e.g. [1990, 2000].
 */
const buildDecades = (from: number | string, to: number | string) => {
  const start = getDecade(new Date(parseInt(String(from), 10), 0, 1));
  const end = getDecade(new Date(parseInt(String(to), 10), 0, 1));
  return Array.from(Array((end - start) / 10 + 1), (_e, i) => start + i * 10);
};

const yearsOf = (albums: AlbumJson[]) => {
  const all = _.countBy(albums, "year");
  const decades = _.countBy(
    albums.map((album) => getDecade(new Date(album.year ?? 0, 0, 1))),
  );
  return {
    all,
    decades,
    oldest: Object.keys(all)[0],
    newest: Object.keys(all).filter(Number).slice(-1)[0],
  };
};

export default function StatsPage() {
  const [allAlbums, setAllAlbums] = useState<AlbumJson[]>();
  const [currentHost, setCurrentHost] = useState<string>();
  const [currentYear, setCurrentYear] = useState<number>();

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/albums.json");
      setAllAlbums(await response.json());
    }
    fetchData();
  }, []);

  // `host` is an object in albums.json, so count by its name — counting the
  // object itself collapsed every host into a single "[object Object]" key.
  const theHosts = useMemo(
    () => (allAlbums ? _.countBy(allAlbums, (album) => album.host.name) : {}),
    [allAlbums],
  );

  const theAlbums = useMemo(() => {
    if (!allAlbums) return undefined;
    if (currentHost) return allAlbums.filter((a) => a.host.name === currentHost);
    if (currentYear) {
      return allAlbums.filter((a) => a.played_on.slice(0, 4) === `${currentYear}`);
    }
    return allAlbums;
  }, [allAlbums, currentHost, currentYear]);

  const theYears = useMemo(() => (theAlbums ? yearsOf(theAlbums) : undefined), [theAlbums]);
  const theTracks = useMemo(() => (theAlbums ? processTracks(theAlbums) : undefined), [theAlbums]);

  const selectHost = (host: string) => {
    setCurrentHost(host || undefined);
    setCurrentYear(undefined);
  };

  const selectYear = (year: number | "") => {
    setCurrentHost(undefined);
    setCurrentYear(year || undefined);
  };

  if (!allAlbums || !theAlbums || !theYears) return <div style={{ margin: 30 }} />;

  const first = theAlbums.slice(-1)[0];
  const last = theAlbums[0];

  return (
    <div style={{ margin: 30 }}>
      <ul style={{ display: "inline" }}>
        <li style={{ display: "inline", margin: 8 }}>
          <button onClick={() => selectHost("")}>Everyone</button>
        </li>
        {Object.keys(theHosts).map((host) => (
          <li key={host} style={{ display: "inline", margin: 8 }}>
            <a href={`#${host}`} onClick={() => selectHost(host)}>
              {host} ({theHosts[host]})
            </a>
          </li>
        ))}
      </ul>

      <hr />

      <ol style={{ display: "inline" }}>
        <li style={{ display: "inline", margin: 8 }}>
          <button onClick={() => selectYear("")}>Every year</button>
        </li>
        {buildDates(
          allAlbums.slice(-1)[0].played_on,
          allAlbums[0].played_on,
        ).map((year) => (
          <li key={year} style={{ display: "inline", margin: 8 }}>
            <a href={`#${year}`} onClick={() => selectYear(year)}>
              {year}
            </a>
          </li>
        ))}
      </ol>

      <hr />

      <p>General</p>
      <ul>
        <li>{Object.keys(theHosts).length} hosts</li>
        <li>{_.sortBy(theHosts, []).slice(-1)} is the most anyone has hosted</li>
      </ul>

      {currentYear ? (
        <p>Hosted in {currentYear}</p>
      ) : (
        <p>Hosted by {currentHost ? currentHost : "everyone"}</p>
      )}
      <ul>
        <li><del>{theAlbums.length} albums</del></li>
        <li><del>{_.uniqBy(theAlbums, "artist").length} different artists</del></li>
        <li>
          <del>
            Host from {new Date(first.played_on).toDateString()} to{" "}
            {new Date(last.played_on).toDateString()}
          </del>
        </li>
        <li>
          <del>
            Spanned {toDuration(new Date(first.played_on), new Date(last.played_on))}
          </del>
        </li>
        <li><ins>Longest/shortest gap between albums</ins></li>
        <li><ins>Most popular day of the week</ins></li>
      </ul>

      <p>
        From <em>{_.filter(theAlbums, "year").length}</em> albums with{" "}
        <strong>year</strong> data…
      </p>
      <p><del>Most popular decade</del></p>
      <table>
        <tbody>
          <tr>
            {buildDecades(theYears.oldest, theYears.newest).map((year) => (
              <td className={styles.date} key={year}>
                {theYears.decades[year] && parseInt(String(theYears.decades[year]), 10)}
                {theYears.decades[year] ? (
                  <div
                    className={styles.dateCount}
                    style={{ height: `${parseInt(String(theYears.decades[year]), 10) * 10}px` }}
                  />
                ) : null}
                {year.toString(10).split("").slice(2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p>Most popular years</p>
      <table>
        <tbody>
          <tr>
            {buildDates(theYears.oldest, theYears.newest).map((year) => (
              <td className={styles.date} key={year}>
                {theYears.all[year] && parseInt(String(theYears.all[year]), 10)}
                {theYears.all[year] ? (
                  <div
                    className={styles.dateCount}
                    style={{ height: `${parseInt(String(theYears.all[year]), 10) * 10}px` }}
                  />
                ) : null}
                {year.toString(10).split("").slice(2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <ul>
        <li><del>Newest album</del></li>
        <li><del>Oldest album</del></li>
        <li><del>Freshest album (played since released)</del></li>
        <li><del>Most stale album (played since released)</del></li>
        <li><ins>Range of albums by year (years between oldest to newest)</ins></li>
      </ul>

      {!!theTracks && (
        <>
          <p>
            From <em>{theTracks.byCount.length}</em> albums with{" "}
            <strong>track</strong> data…
          </p>
          <ul>
            <li><del>{theTracks.totalCount} tracks played</del></li>
            <li>{theTracks.totalLength} seconds listened</li>
            <li><del>{secondsToDuration(theTracks.totalLength)} listened</del></li>
            <li><del>&quot;{theTracks.byLength[0]?.title}&quot; is the shortest album</del></li>
            <li><del>&quot;{theTracks.byLength.slice(-1)[0]?.title}&quot; is the longest album</del></li>
            <li><ins>Longest/shortest average track length</ins></li>
          </ul>

          <p><del>Eponymously titled albums</del></p>
          <ul>
            {theAlbums
              .filter((album) => album.title === album.artist)
              .map((album) => (
                <li key={album.number}>{album.title}</li>
              ))}
          </ul>

          <p>Artist</p>
          <ul>
            <li>
              <del>Artists played more than once</del>
              <ul>
                {Object.entries(byArtist(theAlbums))
                  .filter(([, albums]) => albums.length > 1)
                  .reverse()
                  .map(([artist, albums]) => (
                    <li key={artist}>
                      {artist}
                      <ul>
                        {albums.map((album) => (
                          <li key={album.number}>{album.title}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
