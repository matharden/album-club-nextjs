import { toAlbumJson } from "@/lib/albums-json";
import { getContent } from "@/lib/content";

/** Replaces the `fs.writeFileSync(public/albums.json)` step in gatsby-node.js. */
export const dynamic = "force-static";

export async function GET() {
  const { albums } = await getContent();
  return Response.json(albums.map(toAlbumJson));
}
