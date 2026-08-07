import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

import Album from "@/components/Album";
import { Grid, GridItem } from "@/components/Grid";
import Layout from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import type { AlbumWithHost } from "@/lib/content";
import { rangeToDuration, toMinutes } from "@/lib/utils";

import styles from "./album.module.scss";

const Neighbour = ({
  album,
  label,
  before,
}: {
  album: AlbumWithHost;
  label: string;
  before?: boolean;
}) => {
  const cover = album.cover ?? album.cover_external;
  return (
    <Link href={`/${album.slug}`} className={styles.direction}>
      {before && <span>{label}</span>}
      {cover && <Image src={cover} alt="" width={50} height={50} />}
      {!before && <span>{label}</span>}
    </Link>
  );
};

export default function AlbumView({
  album,
  previous,
  next,
  title,
}: {
  album: AlbumWithHost;
  previous: AlbumWithHost | null;
  next: AlbumWithHost | null;
  title: string;
}) {
  const { age, year, released_on, spotify, tracks, links, tags } = album;

  return (
    <Layout
      title={title}
      breadcrumb={`${album.number} ${album.title}`}
      sticky={
        <Grid className={styles.number}>
          <GridItem cols={2}>
            <AlbumNumber data={album} sticky />
          </GridItem>
        </Grid>
      }
    >
      <Grid className={styles.album}>
        <GridItem>
          <Album data={album} />
        </GridItem>
        <GridItem>
          {tracks && (
            <table className={styles.tracks}>
              <tbody>
                {tracks.map((track) => (
                  <tr key={track.number}>
                    <td>{track.number}</td>
                    <td>{track.name}</td>
                    <td className={styles.duration}>{toMinutes(track.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(tracks || year) && (
            <dl className={styles.meta}>
              {tracks && (
                <>
                  <dt>Length</dt>
                  <dd>
                    {toMinutes(tracks.reduce((all, track) => track.duration + all, 0))}
                  </dd>
                </>
              )}
              {released_on && (
                <>
                  <dt>Released on</dt>
                  <dd>
                    {format(new Date(released_on), "d MMM")}{" "}
                    <Link href={`/${format(new Date(released_on), "yyyy")}`}>
                      {format(new Date(released_on), "yyyy")}
                    </Link>
                  </dd>
                </>
              )}
              {age != null && (
                <>
                  <dt>Played after</dt>
                  <dd>{rangeToDuration(new Date(1970, 0, 1), age, "days")}</dd>
                </>
              )}
            </dl>
          )}
          {tags && (
            <ul className={styles.tags}>
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
          {links && (
            <ul className={styles.links}>
              {links.map((link) => (
                <li key={link.label}>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
            </ul>
          )}
          {spotify && (
            <iframe
              className={styles.spotify}
              title="player"
              src={`https://open.spotify.com/embed/album/${spotify}?utm_source=generator&theme=0`}
              width="100%"
              height={tracks ? 80 : 380}
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          )}
        </GridItem>
      </Grid>
      <Grid>
        <GridItem cols={2}>
          <div className={styles.nav}>
            {next && <Neighbour album={next} label="Before" before />}
            {previous && <Neighbour album={previous} label="After" />}
          </div>
        </GridItem>
      </Grid>
    </Layout>
  );
}
