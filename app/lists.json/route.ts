import { getContent } from "@/lib/content";

export const dynamic = "force-static";

export type ListJson = { slug: string; name: string; count: number };

/** The best-of lists for the client-side menu. Empty when site.yml has none. */
export async function GET() {
  const { lists } = await getContent();
  return Response.json(
    lists.map((list): ListJson => ({
      slug: list.slug,
      name: list.name,
      count: list.albums.length,
    })),
  );
}
