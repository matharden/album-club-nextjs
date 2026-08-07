import { formatDuration, getDecade, intervalToDuration } from "date-fns";
import _ from "lodash";
import { Fragment, type ReactNode } from "react";

/** Anything album-shaped that the stats helpers below need to read. */
type StatAlbum = {
  number: number;
  artist: string;
  title: string;
  year?: number | null;
  played_on: string;
  tracks?: { duration: number }[] | null;
};

export const years = <T extends StatAlbum>(albums: T[]) => {
  const all = _.countBy(albums, "year");
  const decades = _.countBy(
    albums.map((album) => getDecade(new Date(album.year ?? 0, 0, 1))),
  );
  return {
    all,
    decades,
    oldest: Object.keys(all)[0],
    newest: Object.keys(all).filter(Number).slice(-1)[0],
  };
};

export const processTracks = <T extends StatAlbum>(albums: T[]) => {
  const withLength = albums
    .filter((album) => album.tracks)
    .map((album) => ({
      ...album,
      length: album.tracks!.reduce((total, track) => track.duration + total, 0),
      count: album.tracks!.length,
    }));

  return {
    byLength: _.sortBy(withLength, "length"),
    totalLength: withLength.reduce((total, album) => total + album.length, 0),
    byCount: _.sortBy(withLength, "tracks"),
    totalCount: withLength.reduce((total, album) => total + album.count, 0),
  };
};

export const byArtist = <T extends StatAlbum>(albums: T[]) =>
  albums.reduce<Record<string, T[]>>(
    (artists, album) => ({
      ...artists,
      [album.artist]: ([] as T[]).concat(album, artists[album.artist] ?? []),
    }),
    {},
  );

/** Most recent album for each host — drives the host filter list. */
export const hostsByPlayed = <T extends StatAlbum & { hosted_by: string }>(
  albums: T[],
) => _.uniqBy(_.sortBy(albums, "played_on").reverse(), "hosted_by");

/** From and To are numbers (e.g. 1998). */
export const buildDates = (from: number | string, to: number | string) => {
  const start = parseInt(String(from), 10);
  const end = parseInt(String(to), 10);
  return Array.from(Array(end - start + 1), (_e, i) => i + start);
};

/** start and end are dates. */
export const toDuration = (start: Date, end: Date, mode?: "days") =>
  formatDuration(intervalToDuration({ start, end }), {
    delimiter: ", ",
    format:
      mode === "days"
        ? ["years", "months", "weeks", "days"]
        : ["years", "months", "weeks", "days", "hours", "minutes", "seconds"],
  });

export const secondsToDuration = (seconds: number) => {
  const start = new Date(1970, 0, 1);
  const end = new Date(start);
  end.setSeconds(seconds);
  return toDuration(start, end);
};

export const toMinutes = (t: number) => {
  const r = t % 60;
  return `${(t - r) / 60}:${pad(r)}`;
};

export const pad = (n: number) => `00${n}`.slice(-2);

/**
 * Mode is a quick hack. "days" means format as far as days. Otherwise use all
 * formats up to seconds.
 */
export const rangeToDuration = (
  from: Date | string | number,
  to: Date | string | number,
  mode?: "days",
) => toDuration(new Date(from), new Date(to), mode);

/** Renders "2 years, 3 months" with each count emboldened, one unit per line. */
export const markupDuration = (duration: string): ReactNode => {
  const units = duration.split(", ").map((unit) => {
    const [count, name] = unit.split(" ");
    return (
      <Fragment key={name}>
        <strong>{count}</strong> {name}
      </Fragment>
    );
  });

  if (units.length === 0) return null;

  return units.reduce((prev, curr, index) => (
    <Fragment key={index}>
      {prev}
      <br />
      {curr}
    </Fragment>
  ));
};
