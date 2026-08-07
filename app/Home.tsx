"use client";

import cn from "classnames";
import { format } from "date-fns";
import _ from "lodash";
import { Fragment, useMemo, useState } from "react";

import Album from "@/components/Album";
import Graph from "@/components/Graph";
import { Grid, GridItem } from "@/components/Grid";
import Icon from "@/components/Icon";
import Layout, { Footer } from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import type { AlbumWithHost } from "@/lib/content";
import {
  buildDates,
  byArtist,
  hostsByPlayed,
  markupDuration,
  processTracks,
  rangeToDuration,
  secondsToDuration,
  toMinutes,
  years,
} from "@/lib/utils";

import styles from "./Home.module.scss";

type Filter =
  | { kind: "all" }
  | { kind: "host"; value: string }
  | { kind: "year"; value: number };

const releaseDate = (album: AlbumWithHost) =>
  album.released_on ? format(new Date(album.released_on), "d MMM yyyy") : "";

const Home = ({ albums: allAlbums, title }: { albums: AlbumWithHost[]; title: string }) => {
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [showFilters, setShowFilters] = useState(false);
  const [decadesAsc, setDecadesAsc] = useState("");
  const [yearsAsc, setYearsAsc] = useState("");

  const theHosts = useMemo(() => hostsByPlayed(allAlbums), [allAlbums]);

  const theAlbums = useMemo(() => {
    if (filter.kind === "host") {
      return allAlbums.filter((album) => album.hosted_by === filter.value);
    }
    if (filter.kind === "year") {
      return allAlbums.filter(
        (album) => album.played_on.slice(0, 4) === `${filter.value}`,
      );
    }
    return allAlbums;
  }, [allAlbums, filter]);

  const theTracks = useMemo(() => processTracks(theAlbums), [theAlbums]);
  const theYears = useMemo(() => years(theAlbums), [theAlbums]);

  const latestAlbum = (filter.kind === "all" ? allAlbums : theAlbums)[0];

  const multipleAppearances = useMemo(
    () =>
      Object.entries(byArtist(theAlbums))
        .filter(([, albums]) => albums.length > 1)
        .reverse(),
    [theAlbums],
  );

  const eponymous = useMemo(
    () => theAlbums.filter((album) => album.title === album.artist),
    [theAlbums],
  );

  // Every year in which an album was played, newest first.
  const filterYears = useMemo(() => {
    const played = allAlbums.filter((album) => album.played_on);
    if (played.length === 0) return [];
    return buildDates(
      played.slice(-1)[0].played_on,
      played[0].played_on,
    ).reverse();
  }, [allAlbums]);

  const first = theAlbums.slice(-1)[0];
  const last = theAlbums[0];
  const byReleased = useMemo(
    () => _.sortBy(theAlbums.filter((a) => a.released_on), "released_on"),
    [theAlbums],
  );
  const byAge = useMemo(
    () => _.sortBy(theAlbums.filter((a) => a.age != null), "age"),
    [theAlbums],
  );
  const withLength = theTracks.byLength.filter((album) => album.length > 0);

  return (
    <Layout title={title}>
      <div className={styles.el}>
        <Grid>
          <GridItem>
            {/* Albums */}
            <p className={cn(styles.stat, styles.big)}>
              <strong className={styles.huge}>{theAlbums.length}</strong> albums
            </p>

            {/* Artists */}
            <p className={cn(styles.stat, styles.big)}>
              <strong className={styles.huge}>
                {_.uniqBy(theAlbums, "artist").length}
              </strong>{" "}
              artists
            </p>

            {/* Hosted */}
            <p className={cn(styles.stat, styles.big)}>
              {!!theAlbums.length &&
                markupDuration(rangeToDuration(first.played_on, last.played_on))}
            </p>

            {/* Tracks played */}
            <p className={cn(styles.stat, styles.big)}>
              <strong className={styles.huge}>
                {theTracks.totalCount.toLocaleString()}
              </strong>{" "}
              tracks played
            </p>

            {/* Listening time */}
            <p className={cn(styles.stat, styles.big)}>
              {markupDuration(secondsToDuration(theTracks.totalLength))}{" "}
              <span>listened</span>
            </p>

            {/* Hosting time */}
            {!!theAlbums.length && (
              <p className={cn(styles.stat)}>
                From{" "}
                <time className={styles.strong}>
                  {new Date(first.played_on).toDateString()}
                </time>{" "}
                to{" "}
                <time className={styles.strong}>
                  {new Date(last.played_on).toDateString()}
                </time>
              </p>
            )}

            <Icon
              icon="filter"
              className={cn(styles.filter, { [styles.filterOn]: showFilters })}
              onClick={() => setShowFilters((f) => !f)}
            />

            <ul className={cn(styles.list, { [styles.listShow]: showFilters })}>
              <li>
                <a href="#everything" onClick={() => setFilter({ kind: "all" })}>
                  Everything
                </a>
              </li>
              {theHosts.map((album) => (
                <li key={album.number}>
                  <a
                    id={album.host.name}
                    href={`#${album.host.name}`}
                    onClick={() => setFilter({ kind: "host", value: album.hosted_by })}
                  >
                    {album.host.display_name}
                  </a>
                </li>
              ))}

              {filterYears.map((year) => (
                <li key={year}>
                  <a
                    id={`${year}`}
                    href={`#${year}`}
                    onClick={() => setFilter({ kind: "year", value: year })}
                  >
                    {year}
                  </a>
                </li>
              ))}
            </ul>
          </GridItem>

          <GridItem>
            {latestAlbum && (
              <>
                <AlbumNumber data={latestAlbum} />
                <Album data={latestAlbum} />
              </>
            )}
          </GridItem>

          {theAlbums.length > 1 && (
            <GridItem>
              <h2 className={styles.heading2}>
                Covering {Object.keys(theYears.decades).length} decades
                <button
                  className={styles.sort}
                  onClick={() => setDecadesAsc((v) => (v !== "" ? "" : "count"))}
                >
                  <Icon icon="sort" />
                </button>
              </h2>
              <Graph
                className={styles.graph}
                data={theYears.decades}
                sort={decadesAsc}
                linkSuffix="s"
              />

              <Grid small half>
                <GridItem>
                  <h2 className={styles.heading}>Newest album</h2>
                  {byReleased.slice(-1).map((album) => (
                    <Album
                      data={album}
                      small
                      key={album.number}
                      suffix={` released ${releaseDate(album)}`}
                    />
                  ))}
                </GridItem>

                <GridItem>
                  <h2 className={styles.heading}>Oldest album</h2>
                  {byReleased.slice(0, 1).map((album) => (
                    <Album
                      data={album}
                      small
                      key={album.number}
                      suffix={` released ${releaseDate(album)}`}
                    />
                  ))}
                </GridItem>

                <GridItem>
                  {/* Contemporary album - data incomplete */}
                  <h2 className={styles.heading}>Contemporary album</h2>
                  {byAge.slice(0, 1).map((album) => (
                    <Album
                      data={album}
                      small
                      key={album.number}
                      suffix={
                        <span className={styles.suffix}>
                          {" "}
                          played after{" "}
                          {markupDuration(
                            rangeToDuration(new Date(1970, 0, 1), album.age!, "days"),
                          )}
                        </span>
                      }
                    />
                  ))}
                </GridItem>

                <GridItem>
                  {/* Classic album - data incomplete */}
                  <h2 className={styles.heading}>Classic album</h2>
                  {byAge.slice(-1).map((album) => (
                    <Album
                      data={album}
                      small
                      key={album.number}
                      suffix={
                        <span className={styles.suffix}>
                          {" "}
                          played after{" "}
                          {markupDuration(
                            rangeToDuration(new Date(1970, 0, 1), album.age!, "days"),
                          )}
                        </span>
                      }
                    />
                  ))}
                </GridItem>
              </Grid>

              {withLength.length > 0 && (
                <Grid small half>
                  <GridItem>
                    {/* Shortest album */}
                    <h2 className={styles.heading}>Shortest album</h2>
                    <Album
                      data={withLength[0]}
                      small
                      suffix={` at ${toMinutes(withLength[0].length)}`}
                    />
                  </GridItem>

                  <GridItem>
                    {/* Longest album */}
                    <h2 className={styles.heading}>Longest album</h2>
                    <Album
                      data={withLength.slice(-1)[0]}
                      small
                      suffix={` at ${toMinutes(withLength.slice(-1)[0].length)}`}
                    />
                  </GridItem>
                </Grid>
              )}
            </GridItem>
          )}

          {theAlbums.length > 1 && (
            <GridItem>
              <h2 className={styles.heading2}>
                From {Object.keys(theYears.all).length} different years (spanning{" "}
                {Number(Object.keys(theYears.all).slice(-1)[0]) -
                  Number(Object.keys(theYears.all)[0])}{" "}
                years)
                <button
                  className={styles.sort}
                  onClick={() => setYearsAsc((v) => (v !== "" ? "" : "count"))}
                >
                  <Icon icon="sort" />
                </button>
              </h2>
              <Graph className={styles.graph} data={theYears.all} sort={yearsAsc} />
            </GridItem>
          )}
        </Grid>

        {!!multipleAppearances.length && (
          <h2 className={styles.heading}>Multiple appearances</h2>
        )}
        <Grid small>
          {multipleAppearances.map(([artist, albums]) => (
            <Fragment key={artist}>
              {albums.map((album) => (
                <GridItem key={album.number}>
                  <Album data={album} small />
                </GridItem>
              ))}
            </Fragment>
          ))}
        </Grid>

        {!!eponymous.length && (
          <h2 className={styles.heading}>Eponymously titled albums</h2>
        )}
        <Grid small>
          {eponymous.map((album) => (
            <GridItem key={album.number}>
              <Album data={album} small />
            </GridItem>
          ))}
        </Grid>
      </div>

      <Footer />
    </Layout>
  );
};

export default Home;
