"use client";

import Link from "next/link";

import { useAlbums } from "@/lib/use-albums";

import MenuGroup, { type MenuItem } from "./MenuGroup";
import styles from "./Menu.module.scss";

/** Replaces Gatsby's `distinct(field: hosted_by)` / `distinct(field: year)`. */
const Years = () => {
  const albums = useAlbums();

  const hosts: MenuItem[] = [
    ...new Map(
      albums?.map(({ host }) => [
        host.name,
        { href: `/${host.name}`, label: host.display_name },
      ]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label));

  const years = [
    ...new Set(
      albums
        ?.map(({ year }) => year)
        .filter((year): year is number => year != null),
    ),
  ].sort((a, b) => a - b);

  const yearsByDecade = years.reduce<Record<number, MenuItem[]>>(
    (all, year) => ({
      ...all,
      [Math.floor(year / 10) * 10]: [
        ...(all[Math.floor(year / 10) * 10] ?? []),
        { href: `/${year}`, label: String(year) },
      ],
    }),
    {},
  );

  return (
    <>
      <ol className={styles.navGroup}>
        <li className={styles.navGroupGrid}>
          <span className={styles.navText}>Hosts</span>
          <MenuGroup items={hosts} />
        </li>
      </ol>

      <ol className={styles.navGroup}>
        {Object.keys(yearsByDecade).map((decade) => (
          <li key={decade} className={styles.navGroupGrid}>
            <Link href={`/${decade}s`} className={styles.navLink}>
              {decade}s
            </Link>
            <MenuGroup items={yearsByDecade[Number(decade)]} />
          </li>
        ))}
      </ol>
    </>
  );
};

export default Years;
