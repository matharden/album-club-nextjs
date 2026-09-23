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

/** The extra fields the host profile reads, on top of `StatAlbum`. */
type ProfileAlbum = StatAlbum & {
  hosted_by: string;
  released_on?: string | null;
  /** Milliseconds between release and play; derived in `content.ts`. */
  age?: number | null;
};

const mean = (values: number[]): number | null =>
  values.length ? _.sum(values) / values.length : null;

const releaseYears = <T extends ProfileAlbum>(albums: T[]) =>
  albums
    .map((album) => album.year)
    .filter((year): year is number => year != null);

const lengths = <T extends ProfileAlbum>(albums: T[]) =>
  processTracks(albums)
    .byLength.map((album) => album.length)
    .filter((length) => length > 0);

/**
 * Everything the host page shows: one host's picks, alongside the club-wide
 * figures that give them a reference point — an average release year only says
 * something next to everyone else's.
 *
 * Both lists arrive newest-first (file order), so anything chronological sorts
 * on `played_on` rather than trusting that.
 */
export const hostProfile = <T extends ProfileAlbum>(albums: T[], allAlbums: T[]) => {
  const tracks = processTracks(albums);
  const withLength = tracks.byLength.filter((album) => album.length > 0);
  const byPlayed = _.sortBy(albums, "played_on");
  const byReleased = _.sortBy(
    albums.filter((album) => album.released_on),
    "released_on",
  );
  const byAge = _.sortBy(
    albums.filter((album) => album.age != null),
    "age",
  );

  // Gaps between consecutive picks — how often this host comes round.
  const gaps = byPlayed
    .slice(1)
    .map(
      (album, index) =>
        new Date(album.played_on).getTime() -
        new Date(byPlayed[index].played_on).getTime(),
    );

  const decades = _.countBy(
    releaseYears(albums).map((year) => getDecade(new Date(year, 0, 1))),
  );

  const hostCounts = Object.values(_.countBy(allAlbums, "hosted_by"));

  return {
    count: albums.length,
    artists: _.uniqBy(albums, "artist").length,
    /** Fraction of the whole club this host has chosen. */
    share: allAlbums.length ? albums.length / allAlbums.length : 0,
    /** Position among the hosts by album count, 1 being the most prolific. */
    rank: hostCounts.filter((count) => count > albums.length).length + 1,
    hosts: hostCounts.length,
    first: byPlayed[0],
    last: byPlayed.at(-1),
    /** Mean milliseconds between picks; null for a host with a single album. */
    cadence: mean(gaps),
    totalTracks: tracks.totalCount,
    totalLength: tracks.totalLength,
    averageYear: mean(releaseYears(albums)),
    clubAverageYear: mean(releaseYears(allAlbums)),
    averageLength: mean(withLength.map((album) => album.length)),
    clubAverageLength: mean(lengths(allAlbums)),
    decades,
    favouriteDecade: _.maxBy(Object.entries(decades), ([, count]) => count),
    oldest: byReleased[0],
    newest: byReleased.at(-1),
    contemporary: byAge[0],
    classic: byAge.at(-1),
    shortest: withLength[0],
    longest: withLength.at(-1),
    multipleAppearances: Object.entries(byArtist(albums)).filter(
      ([, list]) => list.length > 1,
    ),
  };
};

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

/**
 * Renders "2 years, 3 months" with each count emboldened, one unit per line.
 *
 * The comma is kept alongside the line break: `.stat.small` hides the `<br>`,
 * and the units then need it as their only separator.
 */
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
      {prev},{" "}
      <br />
      {curr}
    </Fragment>
  ));
};
