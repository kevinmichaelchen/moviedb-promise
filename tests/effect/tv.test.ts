/**
 * Tests for TV service
 */

import { assertEquals } from "@std/assert";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect } from "effect";
import { Tv } from "../../src/effect/tv.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import {
  makeTestConfig,
  MockRateLimiter,
} from "../../src/effect/test-layers.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

// Breaking Bad TV show ID for testing
const BREAKING_BAD_ID = 1396;

Deno.test({
  name: "Tv - getDetails returns TV show information",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const details = yield* tv.getDetails({ id: BREAKING_BAD_ID });

      // Verify Breaking Bad metadata
      assertEquals(details.id, BREAKING_BAD_ID);
      assertEquals(details.name, "Breaking Bad");
      assertEquals(details.originalName, "Breaking Bad");
      assertEquals(details.firstAirDate, "2008-01-20");
      assertEquals(details.lastAirDate, "2013-09-29");

      // Verify tagline exists
      assertEquals(typeof details.tagline, "string");

      // Verify overview mentions key elements
      assertEquals(
        details.overview.includes("chemistry") ||
          details.overview.includes("teacher"),
        true,
        "Overview should mention chemistry or teacher",
      );

      // Verify genres include Drama
      const genreNames = details.genres.map((g) => g.name);
      assertEquals(
        genreNames.includes("Drama"),
        true,
        "Should include Drama genre",
      );

      // Verify season/episode counts
      assertEquals(details.numberOfSeasons, 5);
      assertEquals(details.numberOfEpisodes, 62);

      // Verify show is completed
      assertEquals(details.status, "Ended");
      assertEquals(details.inProduction, false);
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getCredits returns cast and crew",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const credits = yield* tv.getCredits({ id: BREAKING_BAD_ID });

      // Verify we got valid credits data
      assertEquals(credits.id, BREAKING_BAD_ID);
      assertEquals(Array.isArray(credits.cast), true);
      assertEquals(Array.isArray(credits.crew), true);
      assertEquals(credits.cast.length > 0, true);
      assertEquals(credits.crew.length > 0, true);

      // Verify Bryan Cranston is in the cast as Walter White
      const bryanCranston = credits.cast.find((c) =>
        c.name === "Bryan Cranston"
      );
      assertEquals(
        bryanCranston !== undefined,
        true,
        "Bryan Cranston should be in cast",
      );
      assertEquals(bryanCranston?.character, "Walter White");

      // Verify Aaron Paul is in the cast as Jesse Pinkman
      const aaronPaul = credits.cast.find((c) => c.name === "Aaron Paul");
      assertEquals(
        aaronPaul !== undefined,
        true,
        "Aaron Paul should be in cast",
      );
      assertEquals(aaronPaul?.character, "Jesse Pinkman");

      // Verify Vince Gilligan is in the crew
      const vinceGilligan = credits.crew.find((c) =>
        c.name === "Vince Gilligan"
      );
      assertEquals(
        vinceGilligan !== undefined,
        true,
        "Vince Gilligan should be in crew",
      );
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getVideos returns trailers and clips",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const videos = yield* tv.getVideos({ id: BREAKING_BAD_ID });

      // Verify we got valid videos data
      assertEquals(videos.id, BREAKING_BAD_ID);
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
      Effect.provide(Tv.Default),
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
  name: "Tv - getImages returns posters and backdrops",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const images = yield* tv.getImages({ id: BREAKING_BAD_ID });

      // Verify we got valid images data
      assertEquals(images.id, BREAKING_BAD_ID);
      assertEquals(Array.isArray(images.backdrops), true);
      assertEquals(Array.isArray(images.posters), true);
      assertEquals(Array.isArray(images.logos), true);

      // Verify we have at least some images
      assertEquals(images.posters.length > 0, true);

      if (images.posters.length > 0) {
        const firstPoster = images.posters[0];
        assertEquals(typeof firstPoster.filePath, "string");
        assertEquals(typeof firstPoster.width, "number");
        assertEquals(typeof firstPoster.height, "number");
      }
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getAiringToday returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const airingToday = yield* tv.getAiringToday({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof airingToday.page, "number");
      assertEquals(typeof airingToday.totalPages, "number");
      assertEquals(typeof airingToday.totalResults, "number");
      assertEquals(Array.isArray(airingToday.results), true);

      // Results might be empty depending on the day
      if (airingToday.results.length > 0) {
        const firstShow = airingToday.results[0];
        assertEquals(typeof firstShow.id, "number");
        assertEquals(typeof firstShow.name, "string");
        assertEquals(typeof firstShow.overview, "string");
      }
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getOnTheAir returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const onTheAir = yield* tv.getOnTheAir({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof onTheAir.page, "number");
      assertEquals(typeof onTheAir.totalPages, "number");
      assertEquals(typeof onTheAir.totalResults, "number");
      assertEquals(Array.isArray(onTheAir.results), true);
      assertEquals(onTheAir.results.length > 0, true);
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getPopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const popular = yield* tv.getPopular({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof popular.page, "number");
      assertEquals(typeof popular.totalPages, "number");
      assertEquals(typeof popular.totalResults, "number");
      assertEquals(Array.isArray(popular.results), true);
      assertEquals(popular.results.length > 0, true);
    }).pipe(
      Effect.provide(Tv.Default),
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
  name: "Tv - getTopRated returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const tv = yield* Tv;

      const topRated = yield* tv.getTopRated({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof topRated.page, "number");
      assertEquals(typeof topRated.totalPages, "number");
      assertEquals(typeof topRated.totalResults, "number");
      assertEquals(Array.isArray(topRated.results), true);
      assertEquals(topRated.results.length > 0, true);
    }).pipe(
      Effect.provide(Tv.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test("Tv - service is accessible via Effect.Service", async () => {
  const program = Effect.gen(function* () {
    const tv = yield* Tv;

    // Verify service methods exist
    assertEquals(typeof tv.getDetails, "function");
    assertEquals(typeof tv.getCredits, "function");
    assertEquals(typeof tv.getVideos, "function");
    assertEquals(typeof tv.getImages, "function");
    assertEquals(typeof tv.getAiringToday, "function");
    assertEquals(typeof tv.getOnTheAir, "function");
    assertEquals(typeof tv.getPopular, "function");
    assertEquals(typeof tv.getTopRated, "function");
  }).pipe(
    Effect.provide(Tv.Default),
    Effect.provide(MovieDbClient.Default),
    Effect.provide(MockRateLimiter),
    Effect.provide(NodeHttpClient.layerUndici),
    Effect.provide(makeTestConfig()),
  );

  await Effect.runPromise(program);
});
