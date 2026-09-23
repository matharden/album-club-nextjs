import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getContent, getNeighbours, siteMetadata } from "@/lib/content";
import { allRouteSlugs, resolveRoute } from "@/lib/routes";

import AlbumView from "./AlbumView";
import HostView from "./HostView";
import ListView from "./ListView";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await allRouteSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const route = await resolveRoute(slug);

  switch (route?.kind) {
    case "album":
      return { title: route.album.title };
    case "host":
      return { title: `Hosted by ${route.host.display_name}` };
    case "year":
      return { title: `Released in ${route.year}` };
    case "decade":
      return { title: `Released in ${route.decade}s` };
    default:
      return {};
  }
}

export default async function SlugPage({ params }: Params) {
  const { slug } = await params;
  const route = await resolveRoute(slug);

  if (!route) notFound();

  switch (route.kind) {
    case "album": {
      const { previous, next } = await getNeighbours(route.album.slug);
      return (
        <AlbumView
          album={route.album}
          previous={previous}
          next={next}
          title={siteMetadata.title}
        />
      );
    }

    case "album-redirect":
      redirect(`/${route.album.slug}`);

    // Hosts get their own view; years and decades keep the plain list. The
    // whole club comes along for the averages — `getContent()` is cached, so
    // this is the same read the route resolver already did.
    case "host": {
      const { albums } = await getContent();
      return (
        <HostView
          albums={route.albums}
          allAlbums={albums}
          host={route.host}
          title={siteMetadata.title}
        />
      );
    }

    case "year":
      return (
        <ListView
          albums={route.albums}
          heading={`Released in ${route.year}`}
          title={siteMetadata.title}
        />
      );

    case "decade":
      return (
        <ListView
          albums={route.albums}
          heading={`Released in ${route.decade}s`}
          title={siteMetadata.title}
        />
      );
  }
}
