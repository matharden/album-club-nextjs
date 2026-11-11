import type { CSSProperties, ReactNode } from "react";
import cn from "classnames";

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
  <span
    className={cn(styles.el, {
      [styles["has-child"]]: children,
    })}
    style={color ? ({ "--color": color } as CSSProperties) : undefined}
  >
    <a
      href={url}
      className={styles.badge}
    >
      {rank != null ? <strong>#{rank}</strong> : "On"}
    </a>
    {children && <> {children}</>}
  </span>
);

export default BestOfBadge;
