import type { Metadata } from "next";

import Album from "@/components/Album";
import { Grid, GridItem } from "@/components/Grid";
import Layout from "@/components/Layout";
import AlbumNumber from "@/components/Number";
import { getContent, siteMetadata } from "@/lib/content";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const { albums } = await getContent();
  const first = albums.slice(-1)[0];
  const last = albums[0];

  return (
    <Layout title={siteMetadata.title}>
      <h1>The archive</h1>
      <p className="stat">
        {albums.length} album{albums.length > 1 && "s"}
        {albums.length > 0 && (
          <>
            {" "}
            from <time>{new Date(first.played_on).toDateString()}</time> to{" "}
            <time>{new Date(last.played_on).toDateString()}</time>
          </>
        )}
      </p>

      <Grid medium>
        {albums.map((album) => (
          <GridItem key={album.number} id={album.number}>
            <AlbumNumber data={album} />
            <Album data={album} />
          </GridItem>
        ))}
      </Grid>
    </Layout>
  );
}
