import Album from "@/components/Album";
import BestOfBadge from "@/components/BestOf";
import { Grid, GridItem } from "@/components/Grid";
import Layout, { Footer } from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import type { AlbumWithHost } from "@/lib/content";
import type { ResolvedList } from "@/lib/lists";

import styles from "./list.module.scss";

/** A best-of list: the club's albums that are on it, by list position. */
export default function BestOfListView({
  list,
  title,
}: {
  list: ResolvedList<AlbumWithHost>;
  title: string;
}) {
  const count = list.albums.length;

  return (
    <Layout title={title}>
      <h1>{list.name}</h1>
      <p className="stat">
        {count} album{count !== 1 && "s"}
      </p>
      <p>
        <a href={list.url}>Read the full list</a>
      </p>

      <Grid medium>
        {list.albums.map(({ album, rank, url }) => (
          <GridItem key={album.number} id={album.number}>
            <div className={styles.rank}>
              <BestOfBadge rank={rank} url={url} />
            </div>
            <AlbumNumber data={album} />
            <Album data={album} />
          </GridItem>
        ))}
      </Grid>

      <Footer />
    </Layout>
  );
}
