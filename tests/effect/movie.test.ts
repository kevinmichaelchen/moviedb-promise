/**
 * Tests for Movie service
 */

import { assertEquals } from "@std/assert";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect } from "effect";
import { Movie } from "../../src/effect/movie.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import {
  makeTestConfig,
  MockRateLimiter,
} from "../../src/effect/test-layers.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

// Fight Club movie ID for testing
const FIGHT_CLUB_ID = 550;

Deno.test({
  name: "Movie - getDetails returns movie information",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const details = yield* movie.getDetails({ id: FIGHT_CLUB_ID });

      // Verify Fight Club metadata
      assertEquals(details.id, FIGHT_CLUB_ID);
      assertEquals(details.title, "Fight Club");
      assertEquals(details.original_title, "Fight Club");
      assertEquals(details.release_date, "1999-10-15");
      assertEquals(details.tagline, "Mischief. Mayhem. Soap.");

      // Verify overview contains key plot elements
      assertEquals(
        details.overview.includes("discontented") ||
        details.overview.includes("insomniac"),
        true,
        "Overview should mention insomnia/discontent"
      );

      // Verify genres include Drama
      const genreNames = details.genres.map(g => g.name);
      assertEquals(genreNames.includes("Drama"), true, "Should include Drama genre");

      // Verify runtime is correct (139 minutes)
      assertEquals(details.runtime, 139);
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getCredits returns cast and crew",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const credits = yield* movie.getCredits({ id: FIGHT_CLUB_ID });

      // Verify we got valid credits data
      assertEquals(credits.id, FIGHT_CLUB_ID);
      assertEquals(Array.isArray(credits.cast), true);
      assertEquals(Array.isArray(credits.crew), true);
      assertEquals(credits.cast.length > 0, true);
      assertEquals(credits.crew.length > 0, true);

      // Verify Brad Pitt is in the cast as Tyler Durden
      const bradPitt = credits.cast.find(c => c.name === "Brad Pitt");
      assertEquals(bradPitt !== undefined, true, "Brad Pitt should be in cast");
      assertEquals(bradPitt?.character, "Tyler Durden");

      // Verify Edward Norton is in the cast as Narrator
      const edwardNorton = credits.cast.find(c => c.name === "Edward Norton");
      assertEquals(edwardNorton !== undefined, true, "Edward Norton should be in cast");
      assertEquals(edwardNorton?.character, "Narrator");

      // Verify David Fincher is in the crew as Director
      const davidFincher = credits.crew.find(c =>
        c.name === "David Fincher" && c.job === "Director"
      );
      assertEquals(davidFincher !== undefined, true, "David Fincher should be director");
      assertEquals(davidFincher?.department, "Directing");
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getVideos returns trailers and clips",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const videos = yield* movie.getVideos({ id: FIGHT_CLUB_ID });

      // Verify we got valid videos data
      assertEquals(videos.id, FIGHT_CLUB_ID);
      assertEquals(Array.isArray(videos.results), true);

      if (videos.results.length > 0) {
        const firstVideo = videos.results[0];
        assertEquals(typeof firstVideo.id, "string");
        assertEquals(typeof firstVideo.key, "string");
        assertEquals(typeof firstVideo.name, "string");
        assertEquals(typeof firstVideo.site, "string");
        assertEquals(typeof firstVideo.type, "string");
      }
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getImages returns posters and backdrops",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const images = yield* movie.getImages({ id: FIGHT_CLUB_ID });

      // Verify we got valid images data
      assertEquals(images.id, FIGHT_CLUB_ID);
      assertEquals(Array.isArray(images.backdrops), true);
      assertEquals(Array.isArray(images.posters), true);
      assertEquals(Array.isArray(images.logos), true);

      // Verify we have at least some images
      assertEquals(images.posters.length > 0, true);

      if (images.posters.length > 0) {
        const firstPoster = images.posters[0];
        assertEquals(typeof firstPoster.file_path, "string");
        assertEquals(typeof firstPoster.width, "number");
        assertEquals(typeof firstPoster.height, "number");
      }
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getNowPlaying returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const nowPlaying = yield* movie.getNowPlaying({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof nowPlaying.page, "number");
      assertEquals(typeof nowPlaying.total_pages, "number");
      assertEquals(typeof nowPlaying.total_results, "number");
      assertEquals(Array.isArray(nowPlaying.results), true);
      assertEquals(nowPlaying.results.length > 0, true);

      // Verify movie structure
      const firstMovie = nowPlaying.results[0];
      assertEquals(typeof firstMovie.id, "number");
      assertEquals(typeof firstMovie.title, "string");
      assertEquals(typeof firstMovie.overview, "string");
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getPopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const popular = yield* movie.getPopular({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof popular.page, "number");
      assertEquals(typeof popular.total_pages, "number");
      assertEquals(typeof popular.total_results, "number");
      assertEquals(Array.isArray(popular.results), true);
      assertEquals(popular.results.length > 0, true);
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Movie - getTopRated returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const movie = yield* Movie;

      const topRated = yield* movie.getTopRated({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof topRated.page, "number");
      assertEquals(typeof topRated.total_pages, "number");
      assertEquals(typeof topRated.total_results, "number");
      assertEquals(Array.isArray(topRated.results), true);
      assertEquals(topRated.results.length > 0, true);
    }).pipe(
      Effect.provide(Movie.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test("Movie - service is accessible via Effect.Service", async () => {
  const program = Effect.gen(function* () {
    const movie = yield* Movie;

    // Verify service methods exist
    assertEquals(typeof movie.getDetails, "function");
    assertEquals(typeof movie.getCredits, "function");
    assertEquals(typeof movie.getVideos, "function");
    assertEquals(typeof movie.getImages, "function");
    assertEquals(typeof movie.getNowPlaying, "function");
    assertEquals(typeof movie.getPopular, "function");
    assertEquals(typeof movie.getTopRated, "function");
  }).pipe(
    Effect.provide(Movie.Default),
    Effect.provide(MovieDbClient.Default),
    Effect.provide(MockRateLimiter),
    Effect.provide(NodeHttpClient.layerUndici),
    Effect.provide(makeTestConfig()),
  );

  await Effect.runPromise(program);
});
