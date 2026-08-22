import type { Metadata } from "next";
import { Suspense } from "react";

import SearchPage from "./SearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  // `useSearchParams` opts the tree into client-side rendering, which Next
  // requires a suspense boundary for.
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
