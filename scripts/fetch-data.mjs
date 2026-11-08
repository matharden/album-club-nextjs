/**
 * Puts a club's content where the app reads it: the YAML in `data/` and the
 * cover art in `public/covers/`. Both are build products, so both are
 * gitignored. Runs before `dev` and `build` (see package.json).
 *
 * The source is the first of these that is set:
 *
 *   ALBUM_CLUB_DATA_DIR    A local checkout of a data repo. Symlinked, so edits
 *                          (and `npm run optimise-covers`) land in that repo.
 *   ALBUM_CLUB_DATA_REPO   A GitHub repo, `owner/name` or a full https URL.
 *                          Shallow-cloned and copied in. Set
 *                          ALBUM_CLUB_DATA_TOKEN for a private repo, and
 *                          optionally ALBUM_CLUB_DATA_REF for a branch or tag.
 *   (neither)              The bundled `sample-data/`, so a fresh clone runs.
 *
 * A data repo holds `albums.yml`, `hosts.yml`, an optional `site.yml` and a
 * `covers/` directory. See `templates/data-repo/`.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const COVERS = path.join(ROOT, "public", "covers");
const CLONE = path.join(ROOT, ".data-repo");
const SAMPLE = path.join(ROOT, "sample-data");
const FILES = ["albums.yml", "hosts.yml", "site.yml"];

loadEnvFiles();

const {
  ALBUM_CLUB_DATA_DIR: localDir,
  ALBUM_CLUB_DATA_REPO: repo,
  ALBUM_CLUB_DATA_TOKEN: token,
  ALBUM_CLUB_DATA_REF: ref,
} = process.env;

if (localDir) {
  const source = path.resolve(ROOT, localDir);
  assertDataDir(source, "ALBUM_CLUB_DATA_DIR");
  link(source, DATA);
  link(path.join(source, "covers"), COVERS);
  console.log(`data: linked ${source}`);
} else if (repo) {
  clone(repo);
  assertDataDir(CLONE, "ALBUM_CLUB_DATA_REPO");
  install(CLONE);
  const sha = git(["-C", CLONE, "rev-parse", "--short", "HEAD"]).trim();
  console.log(`data: ${displayName(repo)}@${sha}`);
} else {
  install(SAMPLE);
  console.log("data: no ALBUM_CLUB_DATA_REPO set, using sample-data/");
}

/** Copies a data directory into place, replacing whatever was there. */
function install(source) {
  remove(DATA);
  remove(COVERS);
  fs.mkdirSync(DATA, { recursive: true });
  for (const file of FILES) {
    const from = path.join(source, file);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DATA, file));
  }
  const covers = path.join(source, "covers");
  if (fs.existsSync(covers)) fs.cpSync(covers, COVERS, { recursive: true });
  else fs.mkdirSync(COVERS, { recursive: true });
}

function link(target, at) {
  remove(at);
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.symlinkSync(target, at, "dir");
}

/** Removes a path, or just the link if it is a symlink. */
function remove(at) {
  fs.rmSync(at, { recursive: true, force: true });
}

function clone(spec) {
  remove(CLONE);
  const args = ["clone", "--quiet", "--depth", "1"];
  if (ref) args.push("--branch", ref);
  git([...args, cloneUrl(spec), CLONE]);
}

function cloneUrl(spec) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(spec) && !/^https?:/.test(spec)) {
    return spec; // ssh, file:// or a local path: handed to git untouched
  }
  const url = new URL(
    spec.startsWith("http") ? spec : `https://github.com/${spec}.git`,
  );
  if (token && url.protocol === "https:") {
    url.username = "x-access-token";
    url.password = token;
  }
  return url.toString();
}

function displayName(spec) {
  try {
    const url = new URL(cloneUrl(spec));
    return `${url.host}${url.pathname}`.replace(/\.git$/, "");
  } catch {
    return spec;
  }
}

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (error) {
    // The clone URL can carry the token; never let it reach the build log.
    const detail = String(error.stderr || error.message);
    fail(`git ${args[0]} failed: ${token ? detail.replaceAll(token, "***") : detail}`);
  }
}

function assertDataDir(dir, variable) {
  for (const file of ["albums.yml", "hosts.yml"]) {
    if (!fs.existsSync(path.join(dir, file))) {
      fail(`${variable}: ${file} not found in ${dir}`);
    }
  }
}

function fail(message) {
  console.error(`data: ${message.trim()}`);
  process.exit(1);
}

/**
 * npm runs this before Next has loaded `.env.local`, so read the variables
 * this script needs from the same files Next would. Real env vars win.
 */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = /^\s*(ALBUM_CLUB_DATA_\w+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
}
