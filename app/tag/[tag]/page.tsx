import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getContent, siteMetadata } from "@/lib/content";

import ListView from "../../[slug]/ListView";

type Params = { params: Promise<{ tag: string }> };

// Tags live under /tag/ rather than the shared `[slug]` route because some
// collide with it: a "1974" tag would otherwise shadow the 1974 year page.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { tags } = await getContent();
  return tags.map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const { byTag } = await getContent();
  const found = byTag.get(tag);
  return found ? { title: `Tagged ${found.name}` } : {};
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const { byTag } = await getContent();
  const found = byTag.get(tag);

  if (!found) notFound();

  return (
    <ListView
      albums={found.albums}
      heading={`Tagged ${found.name}`}
      title={siteMetadata.title}
    />
  );
}
