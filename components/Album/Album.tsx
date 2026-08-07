import cn from "classnames";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./Album.module.scss";

/** The fields any album-card needs; satisfied by `AlbumWithHost`. */
export type AlbumCard = {
  number: number;
  title: string;
  artist: string;
  slug: string;
  cover?: string | null;
  cover_external?: string | null;
};

const Album = ({
  data,
  small,
  suffix,
}: {
  data: AlbumCard;
  small?: boolean;
  suffix?: ReactNode;
}) => {
  const cover = data.cover ?? data.cover_external;

  return (
    <div className={cn(styles.el, { [styles.elSmall]: small })}>
      <Link href={`/${data.slug}`} className={styles.link}>
        {cover && (
          <Image
            src={cover}
            alt=""
            className={styles.cover}
            fill
            // Two columns on wide viewports, four in the `small` grids.
            sizes={small ? "(min-width: 800px) 20vw, 45vw" : "(min-width: 800px) 45vw, 90vw"}
          />
        )}
      </Link>
      <h2 className={styles.title}>
        <Link href={`/${data.slug}`}>{data.title}</Link>
      </h2>
      <p className={styles.artist}>
        by {data.artist}
        {suffix}
      </p>
    </div>
  );
};

export default Album;
