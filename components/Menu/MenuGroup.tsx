"use client";

import cn from "classnames";
import Link from "next/link";

import styles from "./Menu.module.scss";

export type MenuItem = {
  href: string;
  label: string;
};

const MenuGroup = ({
  className,
  items = [],
}: {
  className?: string;
  items?: MenuItem[];
}) => (
  <ol className={cn(styles.navGroup, className)}>
    {items.map(({ href, label }) => (
      <li key={href} className={styles.navGroupItem}>
        <Link className={styles.navLink} href={href}>
          {label}
        </Link>
      </li>
    ))}
  </ol>
);

export default MenuGroup;
