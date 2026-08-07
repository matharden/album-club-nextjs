"use client";

import _ from "lodash";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import type { AlbumJson } from "@/lib/albums-json";
import { toMinutes } from "@/lib/utils";

/**
 * An authoring aid: paste a Spotify album URL to get YAML ready to drop into
 * data/albums.yml, and find albums still missing a given field.
 *
 * The token was previously hardcoded in the source. It now comes from the
 * environment — get a fresh one from the Spotify developer console (they expire
 * after an hour) and set NEXT_PUBLIC_SPOTIFY_TOKEN in .env.local.
 */
const accessToken = process.env.NEXT_PUBLIC_SPOTIFY_TOKEN;

type FetchedAlbum = {
  label: string;
  id: string;
  released_on: string;
  tracks: { number: number; name: string; duration: string }[];
};

async function getAlbum(id: string): Promise<FetchedAlbum> {
  const response = await fetch(`https://api.spotify.com/v1/albums/${id}?market=GB`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Spotify returned ${response.status}. The token is probably missing or expired.`,
    );
  }

  const data = await response.json();
  return {
    label: data.label,
    id: data.id,
    released_on: data.release_date,
    tracks: data.tracks.items.map((track: { track_number: number; name: string; duration_ms: number }) => ({
      number: track.track_number,
      name: track.name,
      duration: toMinutes(Math.round(track.duration_ms / 1000)),
    })),
  };
}

const FIELDS = ["tags", "links", "released_on", "year"] as const;

export default function GetterPage() {
  const [albums, setAlbums] = useState<AlbumJson[]>();
  const [theAlbum, setTheAlbum] = useState<FetchedAlbum>();
  const [error, setError] = useState<string>();
  const [number, setNumber] = useState(0);
  const [spotify, setSpotify] = useState("");
  const [dataType, setDataType] = useState<(typeof FIELDS)[number] | "">("");

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/albums.json");
      setAlbums(await response.json());
    }
    fetchData();
  }, []);

  // Start with the latest album.
  useEffect(() => {
    if (albums) setNumber(albums.length);
  }, [albums]);

  const getSpotify = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setError(undefined);
    // e.g. https://open.spotify.com/album/0XwEfJMejqTpgalJwtp1CM?si=go9_IkE2Q5S
    const id = spotify.match(/([a-zA-Z0-9]{22})/)?.[0];
    if (!id) {
      setError("Could not find a 22-character album ID in that value.");
      return;
    }
    try {
      setTheAlbum(await getAlbum(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const missing = dataType ? _.filter(albums, { [dataType]: null }) : [];

  return (
    <div>
      <Link href="/stats">Stats</Link>
      {!accessToken && (
        <p>
          <strong>NEXT_PUBLIC_SPOTIFY_TOKEN is not set</strong> — lookups will fail.
        </p>
      )}
      <form onSubmit={getSpotify}>
        <fieldset>
          <label htmlFor="spotify">Spotify </label>
          <input
            id="spotify"
            type="text"
            value={spotify}
            onChange={(e) => setSpotify(e.target.value)}
          />{" "}
          <button>Get</button>
          {error && <p>{error}</p>}
          {theAlbum && (
            <pre>
              {"  "}spotify: {theAlbum.id}
              <br />  label: {theAlbum.label}
              <br />  year: {theAlbum.released_on.slice(0, 4)}
              <br />  released_on: {theAlbum.released_on}
              <br />  tracks:
              {theAlbum.tracks.map((track) => (
                <Fragment key={track.number}>
                  <br />  - number: {track.number}
                  <br />{"    "}name: {track.name}
                  <br />{"    "}duration: {track.duration}
                </Fragment>
              ))}
            </pre>
          )}
        </fieldset>
      </form>
      <br />
      <fieldset>
        <label htmlFor="album">Album </label>
        <input
          id="album"
          type="number"
          value={number}
          onChange={(e) => setNumber(parseInt(e.target.value, 10) || 0)}
        />
      </fieldset>

      <div>
        {FIELDS.map((field, index) => (
          <Fragment key={field}>
            {index > 0 && " • "}
            <button onClick={() => setDataType(field)}>{field}</button>
          </Fragment>
        ))}
      </div>
      <p>
        Albums missing {dataType}: {missing.length}
      </p>
      {missing.length > 0 && (
        <>
          {" "}jump to next{" "}
          <button
            style={{ color: "blue", textDecoration: "underline" }}
            onClick={() => setNumber(missing[0].number)}
          >
            {missing[0].number}
          </button>
        </>
      )}

      {!!number && (
        <pre style={{ fontFamily: "monospace" }}>
          {JSON.stringify(_.filter(albums, { number }), null, 2)}
        </pre>
      )}
    </div>
  );
}
