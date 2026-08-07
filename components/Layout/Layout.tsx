"use client";

import cn from "classnames";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import Icon from "@/components/Icon";
import Search from "@/components/Search";

import styles from "./Layout.module.scss";

/**
 * `title` is threaded through as a prop rather than read from `process.env`
 * here: Gatsby inlined env vars into the browser bundle, whereas in Next only
 * `NEXT_PUBLIC_*` reaches the client. The server layer reads it and passes it
 * down.
 */
const Layout = ({
  breadcrumb,
  children,
  sticky,
  title,
}: {
  breadcrumb?: string;
  children?: ReactNode;
  sticky?: ReactNode;
  title: string;
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
  }, [searchOpen]);

  return (
    <>
      <header className={cn(styles.header, { [styles.headerSearchOpen]: searchOpen })}>
        <Link href="/" className={styles.title}>
          {title}
        </Link>
        {/* {breadcrumb && ` / ${breadcrumb}`} */}
        <button onClick={() => setSearchOpen((s) => !s)} className={styles.button}>
          <Icon icon="search" />
        </button>
        <Search open={searchOpen} onClose={setSearchOpen} />
      </header>
      <div className={styles.line} />
      <div className={styles.inner} />
      <div className={styles.stickyWrapper}>{sticky}</div>
      <div className={styles.el}>{children}</div>
    </>
  );
};

export default Layout;

export const Footer = ({ className }: { className?: string }) => (
  <footer className={cn(styles.footer, className)}>
    <Link href="/archive" className={styles.archive}>
      <Icon icon="inventory_2" />
      Browse the archive
    </Link>
  </footer>
);
