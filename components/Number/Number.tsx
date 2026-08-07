import { format, formatDistance, formatISO } from "date-fns";
import Link from "next/link";

import styles from "./Number.module.scss";

export type NumberAlbum = {
  number: number;
  played_on: string;
  host: { name: string; display_name: string };
};

const Number = ({ data, sticky }: { data: NumberAlbum; sticky?: boolean }) => {
  const playedOn = new Date(data.played_on);

  return (
    <div className={[styles.el, sticky && styles.sticky].filter(Boolean).join(" ")}>
      <span className={styles.number}>#{data.number}</span>
      <time
        className={styles.date}
        dateTime={formatISO(playedOn)}
        // "x ago" is relative to render time, so the prerendered value and the
        // one the browser computes at hydration will not always agree.
        suppressHydrationWarning
        title={`${formatDistance(playedOn, new Date())} ago`}
      >
        {format(playedOn, "MMM yyyy")}
      </time>
      <span className={styles.host}>
        <Link href={`/${data.host.name}`}>{data.host.display_name}</Link>
      </span>
    </div>
  );
};

export default Number;
