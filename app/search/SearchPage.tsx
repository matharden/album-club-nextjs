"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Icon from "@/components/Icon";
import Search from "@/components/Search";
import styles from "@/components/Search/Search.module.scss";

/**
 * The same search as the menu's, on its own page so a query can be linked to
 * and shared. The form also posts here without JavaScript.
 */
const SearchPage = () => {
  const router = useRouter();
  const query = useSearchParams().get("q") ?? "";

  return (
    <Search
      className={styles.page}
      initialQuery={query}
      onSubmit={(next) => router.push(`/search?q=${encodeURIComponent(next)}`)}
    >
      <Link href="/" className={styles.home} aria-label="Home">
        <Icon icon="home" />
      </Link>
    </Search>
  );
};

export default SearchPage;
