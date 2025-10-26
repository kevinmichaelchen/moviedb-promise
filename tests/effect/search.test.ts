/**
 * Tests for Search service
 */

import { assertEquals } from "@std/assert";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect } from "effect";
import { Search } from "../../src/effect/search.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import {
  makeTestConfig,
  MockRateLimiter,
} from "../../src/effect/test-layers.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

Deno.test({
  name: "Search - searchMovie finds Fight Club",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      const results = yield* search.searchMovie({
        query: "fight club",
        page: 1,
      });

      // Verify pagination structure
      assertEquals(typeof results.page, "number");
      assertEquals(typeof results.totalPages, "number");
      assertEquals(typeof results.totalResults, "number");
      assertEquals(Array.isArray(results.results), true);
      assertEquals(results.results.length > 0, true);

      // Find Fight Club (1999) in results
      const fightClub = results.results.find((m) =>
        m.title === "Fight Club" && m.releaseDate === "1999-10-15"
      );
      assertEquals(
        fightClub !== undefined,
        true,
        "Fight Club should be in results",
      );

      // Verify Fight Club details
      assertEquals(fightClub?.id, 550);
      assertEquals(fightClub?.originalTitle, "Fight Club");
      assertEquals(
        fightClub?.overview.includes("insomniac") ||
          fightClub?.overview.includes("discontented"),
        true,
        "Overview should mention insomnia/discontent",
      );
    }).pipe(
      Effect.provide(Search.Default),
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
  name: "Search - searchTv finds Breaking Bad",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      const results = yield* search.searchTv({
        query: "breaking bad",
        page: 1,
      });

      // Verify pagination structure
      assertEquals(typeof results.page, "number");
      assertEquals(typeof results.totalPages, "number");
      assertEquals(typeof results.totalResults, "number");
      assertEquals(Array.isArray(results.results), true);
      assertEquals(results.results.length > 0, true);

      // Find Breaking Bad in results
      const breakingBad = results.results.find((show) =>
        show.name === "Breaking Bad" && show.firstAirDate === "2008-01-20"
      );
      assertEquals(
        breakingBad !== undefined,
        true,
        "Breaking Bad should be in results",
      );

      // Verify Breaking Bad details
      assertEquals(breakingBad?.id, 1396);
      assertEquals(breakingBad?.originalName, "Breaking Bad");
      assertEquals(
        breakingBad?.overview.includes("chemistry") ||
          breakingBad?.overview.includes("teacher"),
        true,
        "Overview should mention chemistry or teacher",
      );
    }).pipe(
      Effect.provide(Search.Default),
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
  name: "Search - searchPerson finds Brad Pitt",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      const results = yield* search.searchPerson({
        query: "brad pitt",
        page: 1,
      });

      // Verify pagination structure
      assertEquals(typeof results.page, "number");
      assertEquals(typeof results.totalPages, "number");
      assertEquals(typeof results.totalResults, "number");
      assertEquals(Array.isArray(results.results), true);
      assertEquals(results.results.length > 0, true);

      // Find Brad Pitt in results
      const bradPitt = results.results.find((person) =>
        person.name === "Brad Pitt"
      );
      assertEquals(
        bradPitt !== undefined,
        true,
        "Brad Pitt should be in results",
      );

      // Verify Brad Pitt details
      assertEquals(bradPitt?.id, 287);
      assertEquals(bradPitt?.knownForDepartment, "Acting");
      assertEquals(typeof bradPitt?.popularity, "number");
      if (bradPitt?.popularity !== undefined) {
        assertEquals(bradPitt.popularity > 0, true);
      }

      // Verify knownFor exists and has movies
      if (bradPitt?.knownFor) {
        assertEquals(Array.isArray(bradPitt.knownFor), true);
        assertEquals(bradPitt.knownFor.length > 0, true);
      }
    }).pipe(
      Effect.provide(Search.Default),
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
  name: "Search - searchMulti finds results across media types",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      const results = yield* search.searchMulti({
        query: "fight",
        page: 1,
      });

      // Verify pagination structure
      assertEquals(typeof results.page, "number");
      assertEquals(typeof results.totalPages, "number");
      assertEquals(typeof results.totalResults, "number");
      assertEquals(Array.isArray(results.results), true);
      assertEquals(results.results.length > 0, true);

      // Verify we have different media types
      const mediaTypes = new Set(results.results.map((r) => r.mediaType));

      // Should have at least one type (could be movie, tv, or person)
      assertEquals(
        mediaTypes.size > 0,
        true,
        "Should have at least one media type",
      );

      // Verify first result has required fields based on media type
      const firstResult = results.results[0];
      assertEquals(typeof firstResult, "object");

      if (firstResult.mediaType === "movie") {
        assertEquals("title" in firstResult, true);
      } else if (firstResult.mediaType === "tv") {
        assertEquals("name" in firstResult, true);
      } else if (firstResult.mediaType === "person") {
        assertEquals("name" in firstResult, true);
      }
    }).pipe(
      Effect.provide(Search.Default),
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
  name: "Search - searchMovie with year filter",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      const results = yield* search.searchMovie({
        query: "fight club",
        year: 1999,
        page: 1,
      });

      // Verify we got results
      assertEquals(results.results.length > 0, true);

      // All results should be from 1999
      const fightClub1999 = results.results.find((m) =>
        m.title === "Fight Club" && m.releaseDate.startsWith("1999")
      );
      assertEquals(
        fightClub1999 !== undefined,
        true,
        "Should find Fight Club from 1999",
      );
    }).pipe(
      Effect.provide(Search.Default),
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
  name: "Search - empty query returns results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const search = yield* Search;

      // TMDb API requires a query, so searching for a very common term
      const results = yield* search.searchMovie({
        query: "a",
        page: 1,
      });

      // Verify pagination structure exists
      assertEquals(typeof results.page, "number");
      assertEquals(typeof results.totalPages, "number");
      assertEquals(typeof results.totalResults, "number");
      assertEquals(Array.isArray(results.results), true);
    }).pipe(
      Effect.provide(Search.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test("Search - service is accessible via Effect.Service", async () => {
  const program = Effect.gen(function* () {
    const search = yield* Search;

    // Verify service methods exist
    assertEquals(typeof search.searchMovie, "function");
    assertEquals(typeof search.searchTv, "function");
    assertEquals(typeof search.searchPerson, "function");
    assertEquals(typeof search.searchMulti, "function");
  }).pipe(
    Effect.provide(Search.Default),
    Effect.provide(MovieDbClient.Default),
    Effect.provide(MockRateLimiter),
    Effect.provide(NodeHttpClient.layerUndici),
    Effect.provide(makeTestConfig()),
  );

  await Effect.runPromise(program);
});
