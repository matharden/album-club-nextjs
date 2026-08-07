import { getContent, siteMetadata } from "@/lib/content";

import Home from "./Home";

export default async function HomePage() {
  const { albums } = await getContent();
  return <Home albums={albums} title={siteMetadata.title} />;
}
