import type { Metadata } from "next";
import Link from "next/link";

import Layout, { Footer } from "@/components/Layout";
import { getContent, siteMetadata } from "@/lib/content";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const { tags } = await getContent();

  return (
    <Layout title={siteMetadata.title}>
      <h1>Tags</h1>
      <p className="stat">
        {tags.length} tag{tags.length === 1 ? "" : "s"}
      </p>

      <ul>
        {tags.map((tag) => (
          <li key={tag.slug}>
            <Link href={`/tag/${tag.slug}`}>{tag.name}</Link> ({tag.albums.length})
          </li>
        ))}
      </ul>

      <Footer />
    </Layout>
  );
}
