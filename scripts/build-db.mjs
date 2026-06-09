/**
 * build-db.mjs
 *
 * Reads the four IMDB TSV files from ~/Desktop/imdb-data and builds a SQLite
 * database at data/game.db that contains only what the draft game needs.
 *
 * Run with:  node scripts/build-db.mjs
 *
 * How it works (plain English):
 *  1. Load every movie that has at least 10,000 IMDB votes.
 *  2. For each movie, record which people worked on it and in what role.
 *  3. Score each person by summing votes across all their qualifying movies.
 *  4. Keep only the top N people per role (200 actors, 200 actresses, etc.).
 *  5. For each keeper, group their movies by decade and keep only decades
 *     where they have ≥ 2 qualifying credits.
 *  6. Write everything to SQLite so the game can query it instantly.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

// ─── Configuration ────────────────────────────────────────────────────────────

const IMDB_DIR = join(os.homedir(), 'Desktop', 'imdb-data');
const DB_DIR   = join(process.cwd(), 'data');
const DB_PATH  = join(DB_DIR, 'game.db');

const MIN_VOTES   = 10_000;   // a title needs at least this many votes to count
const MIN_CREDITS = 3;        // a person needs this many titles in a decade to get a card

// How many people to keep per role (we rank by total vote count)
const POOL_SIZES = {
  director:        30,
  actor:          200,
  actress:        200,
  cinematographer: 20,
  writer:          20,
};

// The IMDB "category" values we care about
const ROLES_WE_TRACK = new Set(Object.keys(POOL_SIZES));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decade(year) {
  return Math.floor(year / 10) * 10;
}

// Streams a gzipped TSV line by line and calls `onRow(fields)` for each data row.
// Returns a Promise that resolves when the file is fully read.
function streamTSV(filePath, onRow) {
  return new Promise((resolve, reject) => {
    const fileStream = createReadStream(filePath);
    const gunzip     = createGunzip();
    const rl         = createInterface({ input: fileStream.pipe(gunzip), crlfDelay: Infinity });

    let firstLine = true;
    rl.on('line', (line) => {
      if (firstLine) { firstLine = false; return; } // skip header
      onRow(line.split('\t'));
    });
    rl.on('close', resolve);
    rl.on('error', reject);
    fileStream.on('error', reject);
  });
}

function log(msg) {
  process.stdout.write(`\r${msg}                    `);
}

function logLine(msg) {
  console.log(`\n${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

  // ── Pass 1: load ratings ──────────────────────────────────────────────────
  // We only care about movies with enough votes. Build a Map of tconst → votes.
  logLine('Pass 1/4 — loading ratings (10k+ votes only)...');
  const ratings = new Map(); // tconst → { avgRating, numVotes }
  let ratingCount = 0;
  await streamTSV(`${IMDB_DIR}/title.ratings.tsv.gz`, ([tconst, avgRating, numVotes]) => {
    const votes = parseInt(numVotes, 10);
    if (votes >= MIN_VOTES) {
      ratings.set(tconst, { avgRating: parseFloat(avgRating), numVotes: votes });
      if (++ratingCount % 10_000 === 0) log(`  ${ratingCount.toLocaleString()} titles with ${MIN_VOTES.toLocaleString()}+ votes loaded`);
    }
  });
  logLine(`  ✓ ${ratings.size.toLocaleString()} titles pass the vote threshold`);

  // ── Pass 2: filter to movies only ─────────────────────────────────────────
  // title.basics tells us the type (movie/short/tvSeries/etc.) and the year.
  // We only want titleType === 'movie'.
  logLine('Pass 2/4 — filtering to movies with a release year...');
  const movies = new Map(); // tconst → { year, decade, title }
  let movieCount = 0;
  await streamTSV(`${IMDB_DIR}/title.basics.tsv.gz`, ([tconst, titleType, primaryTitle, , , startYear]) => {
    if (titleType !== 'movie') return;
    if (!ratings.has(tconst)) return;
    const year = parseInt(startYear, 10);
    if (isNaN(year)) return;
    movies.set(tconst, { year, decade: decade(year), title: primaryTitle, ...ratings.get(tconst) });
    if (++movieCount % 5_000 === 0) log(`  ${movieCount.toLocaleString()} qualifying movies found`);
  });
  logLine(`  ✓ ${movies.size.toLocaleString()} qualifying movies`);

  // ── Pass 2b: load primary professions ────────────────────────────────────
  // We only want people whose main IMDB profession matches the role.
  // This filters out extras, stunt performers, and crew who appear in
  // high-rated films but aren't really actors/directors/etc.
  logLine('Pass 2b — loading primary professions...');
  const professions = new Map(); // nconst → primaryProfession (first listed)
  await streamTSV(`${IMDB_DIR}/name.basics.tsv.gz`, ([nconst, , , , primaryProfession]) => {
    if (primaryProfession && primaryProfession !== '\\N') {
      professions.set(nconst, primaryProfession.split(',')[0]); // first = primary
    }
  });
  logLine(`  ✓ ${professions.size.toLocaleString()} people loaded`);

  // Which primary professions are acceptable for each role
  const ALLOWED_PROFESSIONS = {
    director:        new Set(['director']),
    actor:           new Set(['actor', 'actress']),
    actress:         new Set(['actress', 'actor']),
    cinematographer: new Set(['cinematographer']),
    writer:          new Set(['writer']),
  };

  // ── Pass 3: scan principals ───────────────────────────────────────────────
  // For each person×role×decade, collect the movies they appeared in.
  // Structure: personCredits[nconst][role][decade] = [{ tconst, numVotes, ... }]
  logLine('Pass 3/4 — scanning principals (this is the big file, ~a minute)...');
  // personTotalVotes[nconst][role] = sum of votes across all qualifying movies
  const personTotalVotes  = new Map(); // nconst → Map(role → totalVotes)
  // personDecadeFilms[nconst][role][decade] = array of movie objects
  const personDecadeFilms = new Map();

  let lineCount = 0;
  await streamTSV(`${IMDB_DIR}/title.principals.tsv.gz`, ([tconst, , nconst, category]) => {
    if (++lineCount % 500_000 === 0) log(`  ${(lineCount / 1_000_000).toFixed(1)}M principal rows scanned`);
    if (!ROLES_WE_TRACK.has(category)) return;
    const movie = movies.get(tconst);
    if (!movie) return;
    // Skip people whose primary profession doesn't match this role
    const prof = professions.get(nconst);
    if (!prof || !ALLOWED_PROFESSIONS[category]?.has(prof)) return;

    // Update total vote tally for this person in this role
    if (!personTotalVotes.has(nconst)) personTotalVotes.set(nconst, new Map());
    const roleVotes = personTotalVotes.get(nconst);
    roleVotes.set(category, (roleVotes.get(category) ?? 0) + movie.numVotes);

    // Store this film under person → role → decade (deduplicate by tconst)
    if (!personDecadeFilms.has(nconst)) personDecadeFilms.set(nconst, new Map());
    const byRole = personDecadeFilms.get(nconst);
    if (!byRole.has(category)) byRole.set(category, new Map());
    const byDecade = byRole.get(category);
    if (!byDecade.has(movie.decade)) byDecade.set(movie.decade, new Map());
    byDecade.get(movie.decade).set(tconst, { tconst, title: movie.title, numVotes: movie.numVotes, avgRating: movie.avgRating, year: movie.year });
  });
  logLine(`  ✓ Scanned ${lineCount.toLocaleString()} rows; found credits for ${personTotalVotes.size.toLocaleString()} people`);

  // ── Rank and trim ─────────────────────────────────────────────────────────
  // For each role, sort people by total vote count descending, keep top N.
  logLine('Pass 4/4 — ranking people, building cards, writing database...');

  const qualifiedPeople = new Map(); // nconst → Set(roles they qualified for)
  for (const [role, limit] of Object.entries(POOL_SIZES)) {
    // Collect everyone who has this role
    const candidates = [];
    for (const [nconst, roleVotes] of personTotalVotes) {
      if (roleVotes.has(role)) {
        candidates.push({ nconst, totalVotes: roleVotes.get(role) });
      }
    }
    // Sort by total votes descending, keep top N
    candidates.sort((a, b) => b.totalVotes - a.totalVotes);
    const keepers = candidates.slice(0, limit);
    for (const { nconst } of keepers) {
      if (!qualifiedPeople.has(nconst)) qualifiedPeople.set(nconst, new Set());
      qualifiedPeople.get(nconst).add(role);
    }
    logLine(`  ${role}: ${keepers.length} people qualified (from ${candidates.length} candidates)`);
  }

  // ── Build name lookup ─────────────────────────────────────────────────────
  // We need the person's real name. Load only for qualified people.
  logLine('  Loading names for qualified people...');
  const names = new Map(); // nconst → primaryName
  await streamTSV(`${IMDB_DIR}/name.basics.tsv.gz`, ([nconst, primaryName]) => {
    if (qualifiedPeople.has(nconst)) names.set(nconst, primaryName);
  });

  // ── Write SQLite ──────────────────────────────────────────────────────────
  if (existsSync(DB_PATH)) {
    // Delete old database so we start clean
    const { unlinkSync } = await import('fs');
    unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE people (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL
    );

    -- A "card" is one person × role × decade combination.
    -- avg_rating is the person's average IMDB score across their qualifying
    -- films in that decade (used for the score reveal at the end).
    CREATE TABLE cards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id   TEXT NOT NULL REFERENCES people(id),
      role        TEXT NOT NULL,
      decade      INTEGER NOT NULL,
      avg_rating  REAL NOT NULL,
      num_films   INTEGER NOT NULL
    );

    -- The top 3 films shown on a card face.
    CREATE TABLE card_films (
      card_id   INTEGER NOT NULL REFERENCES cards(id),
      tconst    TEXT NOT NULL,
      title     TEXT NOT NULL,
      year      INTEGER NOT NULL,
      num_votes INTEGER NOT NULL,
      avg_rating REAL NOT NULL
    );

    CREATE INDEX idx_cards_role ON cards(role);

    -- Well-known reference movies at each score level (rounded to 1 decimal).
    -- Used on the results screen to show "same score as: Home Alone, ..."
    CREATE TABLE reference_movies (
      tconst    TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      rating    REAL NOT NULL,   -- rounded to 1 decimal
      num_votes INTEGER NOT NULL
    );
    CREATE INDEX idx_ref_rating ON reference_movies(rating);
  `);

  const insertPerson = db.prepare('INSERT OR IGNORE INTO people (id, name) VALUES (?, ?)');
  const insertCard   = db.prepare('INSERT INTO cards (person_id, role, decade, avg_rating, num_films) VALUES (?, ?, ?, ?, ?)');
  const insertFilm   = db.prepare('INSERT INTO card_films (card_id, tconst, title, year, num_votes, avg_rating) VALUES (?, ?, ?, ?, ?, ?)');
  const insertRef    = db.prepare('INSERT OR IGNORE INTO reference_movies (tconst, title, rating, num_votes) VALUES (?, ?, ?, ?)');

  let cardCount = 0;
  const insertAll = db.transaction(() => {
    for (const [nconst, roles] of qualifiedPeople) {
      const name = names.get(nconst);
      if (!name) continue;
      insertPerson.run(nconst, name);

      for (const role of roles) {
        const byDecade = personDecadeFilms.get(nconst)?.get(role);
        if (!byDecade) continue;

        for (const [dec] of byDecade) {
          const films = [...byDecade.get(dec).values()];
          // Only decades with at least MIN_CREDITS qualifying films
          if (films.length < MIN_CREDITS) continue;

          // Average IMDB rating for this person in this decade
          const avgRating = films.reduce((s, f) => s + f.avgRating, 0) / films.length;

          // Top 3 films by vote count (highest votes = most well-known)
          const top3 = films.slice().sort((a, b) => b.numVotes - a.numVotes).slice(0, 3);

          const { lastInsertRowid } = insertCard.run(nconst, role, dec, avgRating, films.length);
          for (const f of top3) {
            insertFilm.run(lastInsertRowid, f.tconst, f.title, f.year, f.numVotes, f.avgRating);
          }
          cardCount++;
        }
      }
    }
  });
  insertAll();

  // ── Reference movies ──────────────────────────────────────────────────────
  // For each 0.1-step rating bucket, store the 5 most-voted movies.
  // These are used on the results screen ("same score as: ...").
  // We bucket by ROUND(avgRating, 1) and take the top 5 by numVotes,
  // but require at least 100k votes so only well-known films appear.
  logLine('  Building reference movies table...');
  const MIN_REF_VOTES = 100_000;
  const byRating = new Map(); // rounded rating → sorted array of {tconst, title, numVotes}
  for (const [tconst, movie] of movies) {
    if (movie.numVotes < MIN_REF_VOTES) continue;
    const bucket = Math.round(movie.avgRating * 10) / 10;
    if (!byRating.has(bucket)) byRating.set(bucket, []);
    byRating.get(bucket).push({ tconst, title: movie.title, numVotes: movie.numVotes });
  }
  const insertRefs = db.transaction(() => {
    for (const [rating, films] of byRating) {
      films.sort((a, b) => b.numVotes - a.numVotes);
      films.slice(0, 5).forEach(f => insertRef.run(f.tconst, f.title, rating, f.numVotes));
    }
  });
  insertRefs();
  logLine(`  ✓ Reference movies written for ${byRating.size} rating buckets`);

  db.close();

  logLine(`\n✅ Done! Database written to ${DB_PATH}`);
  logLine(`   ${cardCount.toLocaleString()} cards created across all roles and decades.`);
  logLine('\nQuick sanity check — card counts per role:');

  // Re-open just to print a quick summary
  const db2 = new Database(DB_PATH, { readonly: true });
  const summary = db2.prepare(`
    SELECT role, COUNT(*) as cards, COUNT(DISTINCT person_id) as people
    FROM cards GROUP BY role ORDER BY cards DESC
  `).all();
  console.table(summary);
  db2.close();
}

main().catch(err => {
  console.error('\n\n❌ Script failed:', err);
  process.exit(1);
});
