"use client";

import cn from "classnames";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import Icon from "@/components/Icon";
import Menu from "@/components/Menu";

import styles from "./Layout.module.scss";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      <Menu open={menuOpen} onClose={handleMenuClose} />

      <header className={cn(styles.header, { [styles.headerMenuOpen]: menuOpen })}>
        <Link href="/" className={styles.title}>
          {title}
        </Link>
        {/* {breadcrumb && ` / ${breadcrumb}`} */}
        <button onClick={() => setMenuOpen(true)} className={styles.button}>
          <Icon icon="menu" />
        </button>
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
