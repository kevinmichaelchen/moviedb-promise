/**
 * Tests for backward compatibility layer
 */

import { assertEquals } from "@std/assert";
import { MovieDbCompat } from "../../src/effect/compat.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

// Test IDs
const FIGHT_CLUB_ID = 550;
const BREAKING_BAD_ID = 1396;
const BRAD_PITT_ID = 287;

Deno.test({
  name: "Compat - movieInfo accepts number ID",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const movie = await movieDb.movieInfo(FIGHT_CLUB_ID);

    // Verify Fight Club metadata
    assertEquals(movie.id, FIGHT_CLUB_ID);
    assertEquals(movie.title, "Fight Club");
    assertEquals(movie.releaseDate, "1999-10-15");
  },
});

Deno.test({
  name: "Compat - movieInfo accepts string ID",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const movie = await movieDb.movieInfo(String(FIGHT_CLUB_ID));

    // Verify Fight Club metadata
    assertEquals(movie.id, FIGHT_CLUB_ID);
    assertEquals(movie.title, "Fight Club");
  },
});

Deno.test({
  name: "Compat - movieInfo accepts object params",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const movie = await movieDb.movieInfo({ id: FIGHT_CLUB_ID });

    // Verify Fight Club metadata
    assertEquals(movie.id, FIGHT_CLUB_ID);
    assertEquals(movie.title, "Fight Club");
  },
});

Deno.test({
  name: "Compat - movieCredits returns cast and crew",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const credits = await movieDb.movieCredits(FIGHT_CLUB_ID);

    // Verify Brad Pitt is in the cast
    const bradPitt = credits.cast.find((c) => c.name === "Brad Pitt");
    assertEquals(bradPitt?.character, "Tyler Durden");
  },
});

Deno.test({
  name: "Compat - moviePopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const popular = await movieDb.moviePopular({ page: 1 });

    // Verify pagination structure
    assertEquals(typeof popular.page, "number");
    assertEquals(typeof popular.totalPages, "number");
    assertEquals(Array.isArray(popular.results), true);
    assertEquals(popular.results.length > 0, true);
  },
});

Deno.test({
  name: "Compat - tvInfo accepts number ID",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const tv = await movieDb.tvInfo(BREAKING_BAD_ID);

    // Verify Breaking Bad metadata
    assertEquals(tv.id, BREAKING_BAD_ID);
    assertEquals(tv.name, "Breaking Bad");
    assertEquals(tv.numberOfSeasons, 5);
  },
});

Deno.test({
  name: "Compat - tvCredits returns cast and crew",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const credits = await movieDb.tvCredits(BREAKING_BAD_ID);

    // Verify Bryan Cranston is in the cast
    const bryanCranston = credits.cast.find(
      (c) => c.name === "Bryan Cranston",
    );
    assertEquals(bryanCranston?.character, "Walter White");
  },
});

Deno.test({
  name: "Compat - tvPopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const popular = await movieDb.tvPopular({ page: 1 });

    // Verify pagination structure
    assertEquals(typeof popular.page, "number");
    assertEquals(typeof popular.totalPages, "number");
    assertEquals(Array.isArray(popular.results), true);
    assertEquals(popular.results.length > 0, true);
  },
});

Deno.test({
  name: "Compat - searchMovie finds Fight Club",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const results = await movieDb.searchMovie({
      query: "fight club",
      page: 1,
    });

    // Find Fight Club in results
    const fightClub = results.results.find(
      (m) => m.title === "Fight Club" && m.releaseDate === "1999-10-15",
    );
    assertEquals(fightClub !== undefined, true);
    assertEquals(fightClub?.id, FIGHT_CLUB_ID);
  },
});

Deno.test({
  name: "Compat - searchTv finds Breaking Bad",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const results = await movieDb.searchTv({
      query: "breaking bad",
      page: 1,
    });

    // Find Breaking Bad in results
    const breakingBad = results.results.find(
      (show) =>
        show.name === "Breaking Bad" && show.firstAirDate === "2008-01-20",
    );
    assertEquals(breakingBad !== undefined, true);
    assertEquals(breakingBad?.id, BREAKING_BAD_ID);
  },
});

Deno.test({
  name: "Compat - searchPerson finds Brad Pitt",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const results = await movieDb.searchPerson({
      query: "brad pitt",
      page: 1,
    });

    // Find Brad Pitt in results
    const bradPitt = results.results.find(
      (person) => person.name === "Brad Pitt",
    );
    assertEquals(bradPitt !== undefined, true);
    assertEquals(bradPitt?.id, BRAD_PITT_ID);
  },
});

Deno.test({
  name: "Compat - personInfo accepts number ID",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const person = await movieDb.personInfo(BRAD_PITT_ID);

    // Verify Brad Pitt metadata
    assertEquals(person.id, BRAD_PITT_ID);
    assertEquals(person.name, "Brad Pitt");
    assertEquals(person.birthday, "1963-12-18");
  },
});

Deno.test({
  name: "Compat - personMovieCredits returns cast and crew",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const credits = await movieDb.personMovieCredits(BRAD_PITT_ID);

    // Verify Fight Club is in the cast
    const fightClub = credits.cast.find(
      (c) => c.title === "Fight Club" && c.character === "Tyler Durden",
    );
    assertEquals(fightClub !== undefined, true);
    assertEquals(fightClub?.id, FIGHT_CLUB_ID);
  },
});

Deno.test({
  name: "Compat - personPopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const popular = await movieDb.personPopular({ page: 1 });

    // Verify pagination structure
    assertEquals(typeof popular.page, "number");
    assertEquals(typeof popular.totalPages, "number");
    assertEquals(Array.isArray(popular.results), true);
    assertEquals(popular.results.length > 0, true);
  },
});

Deno.test({
  name: "Compat - constructor accepts custom baseUrl",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb = new MovieDbCompat({
      apiKey: REAL_API_KEY!,
      baseUrl: "https://api.themoviedb.org/3/",
      requestsPerSecondLimit: 50,
    });

    const movie = await movieDb.movieInfo(FIGHT_CLUB_ID);
    assertEquals(movie.id, FIGHT_CLUB_ID);
  },
});

Deno.test({
  name: "Compat - multiple instances can coexist",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const movieDb1 = new MovieDbCompat({ apiKey: REAL_API_KEY! });
    const movieDb2 = new MovieDbCompat({ apiKey: REAL_API_KEY! });

    const [movie1, movie2] = await Promise.all([
      movieDb1.movieInfo(FIGHT_CLUB_ID),
      movieDb2.tvInfo(BREAKING_BAD_ID),
    ]);

    assertEquals(movie1.id, FIGHT_CLUB_ID);
    assertEquals(movie2.id, BREAKING_BAD_ID);
  },
});
