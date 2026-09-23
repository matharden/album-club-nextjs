import cn from "classnames";
import { format } from "date-fns";
import Link from "next/link";
import { Fragment } from "react";

import Album from "@/components/Album";
import Graph from "@/components/Graph";
import { Grid, GridItem } from "@/components/Grid";
import Layout, { Footer } from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import type { AlbumWithHost } from "@/lib/content";
import type { Host } from "@/lib/schema";
import {
  hostProfile,
  markupDuration,
  rangeToDuration,
  secondsToDuration,
  toMinutes,
} from "@/lib/utils";

import styles from "./host.module.scss";

/** Durations are measured from the epoch, as they are on the home page. */
const EPOCH = new Date(1970, 0, 1);

const releaseDate = (album: AlbumWithHost) =>
  album.released_on ? format(new Date(album.released_on), "d MMM yyyy") : "";

/** "6 years older", or null when the two averages round to the same year. */
const yearLean = (host: number | null, club: number | null) => {
  if (host == null || club == null) return null;
  const delta = Math.round(host - club);
  if (delta === 0) return null;
  const years = Math.abs(delta);
  return `${years} year${years === 1 ? "" : "s"} ${delta < 0 ? "older" : "newer"}`;
};

/** "3:14 longer", or null when the two averages are within a minute. */
const lengthLean = (host: number | null, club: number | null) => {
  if (host == null || club == null) return null;
  const delta = Math.round(host - club);
  if (Math.abs(delta) < 60) return null;
  return `${toMinutes(Math.abs(delta))} ${delta < 0 ? "shorter" : "longer"}`;
};

const ordinal = (n: number) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return `${n}${suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0]}`;
};

/**
 * A host's own page: what they have chosen, how often they come round, and how
 * their taste sits against the club's. The years and decades routes keep the
 * plain `ListView` — only hosts have enough of a story for this.
 */
export default function HostView({
  albums,
  allAlbums,
  host,
  title,
}: {
  albums: AlbumWithHost[];
  /** The whole club, for the averages this host is compared against. */
  allAlbums: AlbumWithHost[];
  host: Host;
  title: string;
}) {
  const profile = hostProfile(albums, allAlbums);
  const { first, last } = profile;

  const leans = [
    yearLean(profile.averageYear, profile.clubAverageYear),
    lengthLean(profile.averageLength, profile.clubAverageLength),
  ].filter((lean): lean is string => lean != null);

  return (
    <Layout title={title}>
      <div className={styles.el}>
        <h1>Chosen by {host.display_name}</h1>

        {profile.count === 0 ? (
          <p className="stat">No albums yet.</p>
        ) : (
          <>
            <Grid>
              <GridItem>
                <p className={cn(styles.stat, styles.big)}>
                  <strong className={styles.huge}>{profile.count}</strong> album
                  {profile.count === 1 ? "" : "s"}
                </p>

                <p className={cn(styles.stat, styles.big)}>
                  <strong className={styles.huge}>{profile.artists}</strong> artist
                  {profile.artists === 1 ? "" : "s"}
                </p>

                <p className={cn(styles.stat, styles.big)}>
                  <strong className={styles.huge}>
                    {profile.totalTracks.toLocaleString()}
                  </strong>{" "}
                  tracks played
                </p>

                <p className={cn(styles.stat, styles.big)}>
                  {markupDuration(secondsToDuration(profile.totalLength))}{" "}
                  <span>listened</span>
                </p>

                {first && last && (
                  <p className={styles.stat}>
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

                {/* {profile.cadence != null && (
                  <p className={cn(styles.stat, styles.small)}>
                    A pick every{" "}
                    {markupDuration(rangeToDuration(EPOCH, profile.cadence, "days"))}{" "}
                    on average
                  </p>
                )} */}

                <p className={cn(styles.stat, styles.small)}>
                  <strong>{Math.round(profile.share * 100)}%</strong> of the club —
                  the{" "}
                  {profile.rank > 1 && <strong>{ordinal(profile.rank)} </strong>}
                  most prolific of <strong>{profile.hosts}</strong> hosts
                </p>
              </GridItem>

              <GridItem>
                {last && (
                  <>
                    <AlbumNumber data={last} />
                    <Album data={last} />
                  </>
                )}
              </GridItem>
            </Grid>

            <Grid>
              <GridItem>
                <h2 className={styles.heading2}>
                  Covering {Object.keys(profile.decades).length} decade
                  {Object.keys(profile.decades).length === 1 ? "" : "s"}
                </h2>
                <Graph className={styles.graph} data={profile.decades} linkSuffix="s" />

                {profile.count > 1 && (
                  <Grid half>
                    {profile.oldest && (
                      <GridItem>
                        <h2 className={styles.heading}>Oldest pick</h2>
                        <Album
                          data={profile.oldest}
                          small
                          suffix={` released ${releaseDate(profile.oldest)}`}
                        />
                      </GridItem>
                    )}

                    {profile.newest && (
                      <GridItem>
                        <h2 className={styles.heading}>Newest pick</h2>
                        <Album
                          data={profile.newest}
                          small
                          suffix={` released ${releaseDate(profile.newest)}`}
                        />
                      </GridItem>
                    )}

                    {profile.contemporary && (
                      <GridItem>
                        <h2 className={styles.heading}>Freshest pick</h2>
                        <Album
                          data={profile.contemporary}
                          small
                          suffix={
                            <span className={styles.suffix}>
                              {" "}
                              played after{" "}
                              {markupDuration(
                                rangeToDuration(EPOCH, profile.contemporary.age!, "days"),
                              )}
                            </span>
                          }
                        />
                      </GridItem>
                    )}

                    {profile.classic && (
                      <GridItem>
                        <h2 className={styles.heading}>Longest wait</h2>
                        <Album
                          data={profile.classic}
                          small
                          suffix={
                            <span className={styles.suffix}>
                              {" "}
                              played after{" "}
                              {markupDuration(
                                rangeToDuration(EPOCH, profile.classic.age!, "days"),
                              )}
                            </span>
                          }
                        />
                      </GridItem>
                    )}

                    {profile.shortest && profile.longest && (
                      <>
                        <GridItem>
                          <h2 className={styles.heading}>Shortest album</h2>
                          <Album
                            data={profile.shortest}
                            small
                            suffix={` at ${toMinutes(profile.shortest.length)}`}
                          />
                        </GridItem>

                        <GridItem>
                          <h2 className={styles.heading}>Longest album</h2>
                          <Album
                            data={profile.longest}
                            small
                            suffix={` at ${toMinutes(profile.longest.length)}`}
                          />
                        </GridItem>
                      </>
                    )}
                  </Grid>
                )}
              </GridItem>

              <GridItem>
                <h2 className={styles.heading2}>Against the club</h2>
                <dl className={styles.compare}>
                  {profile.averageYear != null && (
                    <>
                      <dt>Average release year</dt>
                      <dd>
                        <strong>{Math.round(profile.averageYear)}</strong>
                        {profile.clubAverageYear != null && (
                          <span>club {Math.round(profile.clubAverageYear)}</span>
                        )}
                      </dd>
                    </>
                  )}

                  {profile.averageLength != null && (
                    <>
                      <dt>Average album length</dt>
                      <dd>
                        <strong>{toMinutes(Math.round(profile.averageLength))}</strong>
                        {profile.clubAverageLength != null && (
                          <span>
                            club {toMinutes(Math.round(profile.clubAverageLength))}
                          </span>
                        )}
                      </dd>
                    </>
                  )}

                  {profile.favouriteDecade && (
                    <>
                      <dt>Favourite decade</dt>
                      <dd>
                        <Link
                          href={`/${profile.favouriteDecade[0]}s`}
                          className={styles.strong}
                        >
                          {profile.favouriteDecade[0]}s
                        </Link>
                        <span>{profile.favouriteDecade[1]} albums</span>
                      </dd>
                    </>
                  )}
                </dl>

                {leans.length > 0 && (
                  <p className={styles.lean}>
                    {host.display_name}&rsquo;s picks run{" "}
                    {leans.map((lean, index) => (
                      <Fragment key={lean}>
                        {index > 0 && " and "}
                        <strong>{lean}</strong>
                      </Fragment>
                    ))}{" "}
                    than the club average.
                  </p>
                )}
              </GridItem>
            </Grid>

            {profile.multipleAppearances.length > 0 && (
              <>
                <h2 className={styles.heading}>Artists chosen more than once</h2>
                <Grid small>
                  {profile.multipleAppearances.map(([artist, list]) => (
                    <Fragment key={artist}>
                      {list.map((album) => (
                        <GridItem key={album.number}>
                          <Album data={album} small />
                        </GridItem>
                      ))}
                    </Fragment>
                  ))}
                </Grid>
              </>
            )}

            <h2 className={styles.heading}>Every pick</h2>
            <Grid medium>
              {albums.map((album) => (
                <GridItem key={album.number} id={album.number}>
                  <AlbumNumber data={album} />
                  <Album data={album} />
                </GridItem>
              ))}
            </Grid>
          </>
        )}
      </div>

      <Footer />
    </Layout>
  );
}
