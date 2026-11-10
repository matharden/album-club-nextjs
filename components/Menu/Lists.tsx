"use client";

import { useLists } from "@/lib/use-lists";

import MenuGroup from "./MenuGroup";
import styles from "./Menu.module.scss";

/** Best-of lists from site.yml; hidden when a club has none. */
const Lists = () => {
  const lists = useLists();
  if (!lists?.length) return null;

  return (
    <ol className={styles.navGroup}>
      <li className={styles.navGroupGrid}>
        <span className={styles.navText}>Lists</span>
        <MenuGroup
          className={styles.vert}
          items={lists.map((list) => ({
            href: `/lists/${list.slug}`,
            label: list.name,
          }))}
        />
      </li>
    </ol>
  );
};

export default Lists;
