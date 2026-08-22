"use client";

import cn from "classnames";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import Icon from "@/components/Icon";
import Search from "@/components/Search";

import Years from "./Years";
import styles from "./Menu.module.scss";

const Menu = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Escape dismisses the dialog itself, so the open state has to follow the
  // element rather than the other way round.
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.addEventListener("close", handleClose);
    return () => dialog?.removeEventListener("close", handleClose);
  }, [handleClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <dialog className={styles.el} ref={dialogRef}>
      <button onClick={handleClose} className={styles.close} type="button">
        <Icon icon="close_white" />
      </button>

      <Search
        className={cn({ [styles.newfixed]: !searchQuery })}
        onQueryChange={handleQueryChange}
      />

      {/* The sticky rule and the mask that hides content scrolling under it.
          Search renders its own pair once it has a query. */}
      {!searchQuery && (
        <>
          <div className={styles.line} />
          <div className={styles.inner} />
        </>
      )}

      <div className={styles.menu} hidden={!!searchQuery}>
        <nav>
          <ul className={styles.navGroup}>
            <li className={styles.navGroupItem}>
              <Link href="/" className={styles.navLink}>
                Home
              </Link>
            </li>
            <li className={styles.navGroupItem}>
              <Link href="/archive" className={styles.navLink}>
                Archive
              </Link>
            </li>
          </ul>
          <Years />
        </nav>
      </div>
    </dialog>
  );
};

export default Menu;
