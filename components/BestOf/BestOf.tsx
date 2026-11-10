import type { CSSProperties, ReactNode } from "react";

import styles from "./BestOf.module.css";

/**
 * A highlighted pill for an album's place on a best-of list. The rank links
 * to the entry on the publisher's page; `children` (usually the list name)
 * follow it. `color` (any CSS colour, from site.yml) replaces the default
 * background.
 */
const BestOfBadge = ({
  rank,
  url,
  color,
  children,
}: {
  rank: number | null;
  url: string;
  color?: string | null;
  children?: ReactNode;
}) => (
  <span className={styles.badge} style={color ? ({ "--color": color } as CSSProperties) : undefined}>
    <a href={url}>{rank != null ? <strong>#{rank}</strong> : "On"}</a>
    {children && <> {children}</>}
  </span>
);

export default BestOfBadge;
