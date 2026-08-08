import { toAlbumJson } from "@/lib/albums-json";
import { getContent } from "@/lib/content";

export const dynamic = "force-static";

export async function GET() {
  const { albums } = await getContent();
  return Response.json(albums.map(toAlbumJson));
}
