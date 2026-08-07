import type { ReactNode } from "react";

import Album from "@/components/Album";
import { Grid, GridItem } from "@/components/Grid";
import Layout, { Footer } from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import type { AlbumWithHost } from "@/lib/content";

/**
 * The hosts, years and decades templates were three copies of the same view
 * differing only in heading, so they collapse into one.
 */
export default function ListView({
  albums,
  heading,
  title,
}: {
  albums: AlbumWithHost[];
  heading: ReactNode;
  title: string;
}) {
  return (
    <Layout title={title}>
      <h1>{heading}</h1>
      <p className="stat">
        {albums.length} album{albums.length > 1 && "s"}
      </p>

      <Grid medium>
        {albums.map((album) => (
          <GridItem key={album.number} id={album.number}>
            <AlbumNumber data={album} />
            <Album data={album} />
          </GridItem>
        ))}
      </Grid>

      <Footer />
    </Layout>
  );
}
