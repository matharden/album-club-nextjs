import type { ReactNode } from "react";

import styles from "./BestOf.module.css";

/**
 * A highlighted pill for an album's place on a best-of list. The rank links
 * to the entry on the publisher's page; `children` (usually the list name)
 * follow it.
 */
const BestOfBadge = ({
  rank,
  url,
  children,
}: {
  rank: number | null;
  url: string;
  children?: ReactNode;
}) => (
  <span className={styles.badge}>
    <a href={url}>{rank != null ? <strong>#{rank}</strong> : "On"}</a>
    {children && <> {children}</>}
  </span>
);

export default BestOfBadge;
