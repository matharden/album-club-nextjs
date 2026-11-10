import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getContent, siteMetadata } from "@/lib/content";

import BestOfListView from "./BestOfListView";

type Params = { params: Promise<{ list: string }> };

// Best-of lists from site.yml, at /lists/<entries file name>. Like tags, they
// sit outside the shared `[slug]` route so a list name can never shadow it.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { lists } = await getContent();
  return lists.map((list) => ({ list: list.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { list } = await params;
  const { bySlugList } = await getContent();
  const found = bySlugList.get(list);
  return found ? { title: found.name } : {};
}

export default async function BestOfListPage({ params }: Params) {
  const { list } = await params;
  const { bySlugList } = await getContent();
  const found = bySlugList.get(list);

  if (!found) notFound();

  return <BestOfListView list={found} title={siteMetadata.title} />;
}
