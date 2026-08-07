"use client";

import cn from "classnames";
import Link from "next/link";
import { useMemo } from "react";

import styles from "./Graph.module.scss";

const Graph = ({
  className,
  data = {},
  linkSuffix = "",
  sort,
}: {
  className?: string;
  data?: Record<string, number>;
  linkSuffix?: string;
  sort?: string;
}) => {
  const rows = useMemo(() => {
    const entries = Object.entries(data);
    return sort === "count"
      ? entries.sort(([, a], [, b]) => b - a)
      : entries;
  }, [data, sort]);

  const total = Math.max(...Object.values(data));

  return (
    <table
      className={cn(styles.el, className)}
      style={{ "--total": total } as React.CSSProperties}
    >
      <tbody>
        {rows.map(([label, count]) => (
          <tr key={label}>
            <th>
              <Link href={`/${label.toLowerCase()}${linkSuffix}`}>{label}</Link>
            </th>
            <td>
              <div
                className={cn(styles.bar, label.replaceAll(" ", "-"))}
                style={{ "--count": count } as React.CSSProperties}
              />
            </td>
            <td>{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Graph;
