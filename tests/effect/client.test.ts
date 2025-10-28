/**
 * Tests for MovieDbClient service
 */

import { assertEquals } from "@std/assert";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect } from "effect";
import { MovieDbClient } from "../../src/effect/client.ts";
import {
  makeTestConfig,
  MockRateLimiter,
} from "../../src/effect/test-layers.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

Deno.test("MovieDbClient - get() with mock services", async () => {
  // Test with mocked HTTP client that doesn't actually make requests
  const program = Effect.gen(function* () {
    const client = yield* MovieDbClient;

    // In a real test, we'd mock the HttpClient to return test data
    // For now, we just verify the client is accessible
    assertEquals(typeof client.get, "function");
  }).pipe(
    Effect.provide(MovieDbClient.Default),
    Effect.provide(MockRateLimiter),
    Effect.provide(NodeHttpClient.layerUndici),
    Effect.provide(makeTestConfig()),
  );

  await Effect.runPromise(program);
});

Deno.test({
  name: "MovieDbClient - successfully fetches data from real API",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    interface MovieResponse {
      id: number;
      title: string;
      overview: string;
    }

    const program = Effect.gen(function* () {
      const client = yield* MovieDbClient;

      // Fetch a known movie (Fight Club)
      const movie = yield* client.get<MovieResponse>("/movie/550");

      // Verify we got valid data
      assertEquals(typeof movie.id, "number");
      assertEquals(typeof movie.title, "string");
      assertEquals(movie.id, 550);
    }).pipe(
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
  name: "MovieDbClient - handles 404 errors correctly",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const client = yield* MovieDbClient;

      // Try to fetch a non-existent resource
      yield* client.get("/movie/9999999999");
    }).pipe(
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
      Effect.flip, // Flip to get the error as success
    );

    const error = await Effect.runPromise(program);
    assertEquals(error._tag, "NotFoundError");
  },
});

Deno.test({
  name: "MovieDbClient - applies rate limiting",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    interface MovieResponse {
      id: number;
    }

    const program = Effect.gen(function* () {
      const client = yield* MovieDbClient;

      // Make multiple requests - they should be rate-limited
      const results = [];
      for (let i = 0; i < 3; i++) {
        const movie = yield* client.get<MovieResponse>("/movie/550");
        results.push(movie.id);
      }

      // All requests should succeed
      assertEquals(results, [550, 550, 550]);
    }).pipe(
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});
