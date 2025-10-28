/**
 * Integration tests for MovieDb HttpClient
 */

import { NodeHttpClient } from "@effect/platform-node";
import { assertEquals } from "@std/assert";
import { Effect } from "effect";
import { makeMovieDbHttpClient } from "../../src/effect/http-client.ts";
import { makeTestConfig } from "../../src/effect/test-layers.ts";

// Get real API key from environment for integration tests
const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

Deno.test({
  name: "HttpClient - successfully fetches and parses JSON",
  ignore: !REAL_API_KEY, // Skip if no real API key
  sanitizeOps: false, // Ignore timer leaks from retry logic
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const client = yield* makeMovieDbHttpClient();

      // Make a simple request to get movie details (v3 API endpoint)
      const response = yield* client.get("/movie/550");
      const data = yield* response.json;

      // Verify we got a valid response with expected fields
      assertEquals(typeof data, "object");
      assertEquals(data !== null, true);
    }).pipe(
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "HttpClient - maps 404 to NotFoundError",
  ignore: !REAL_API_KEY, // Skip if no real API key
  sanitizeOps: false, // Ignore timer leaks from retry logic
  sanitizeResources: false,
  fn: async () => {
    const { executeJson } = await import("../../src/effect/http-client.ts");

    const program = Effect.gen(function* () {
      const client = yield* makeMovieDbHttpClient();

      // Try to fetch a non-existent movie - should map 404 to NotFoundError
      yield* executeJson(client, "/movie/9999999999");
    }).pipe(
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
      Effect.flip, // Flip error to success channel
    );

    // Should get NotFoundError (mapped from 404 ResponseError)
    const error = await Effect.runPromise(program);
    assertEquals(error._tag, "NotFoundError");
  },
});

Deno.test({
  name: "HttpClient - maps 401 to AuthenticationError via executeJson",
  sanitizeOps: false, // Ignore timer leaks from retry logic
  sanitizeResources: false,
  fn: async () => {
    const { executeJson } = await import("../../src/effect/http-client.ts");

    const program = Effect.gen(function* () {
      const client = yield* makeMovieDbHttpClient();

      // Use an invalid API key to trigger 401
      yield* executeJson(client, "/movie/550");
    }).pipe(
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(
        makeTestConfig({
          apiKey: "invalid-key",
        }),
      ),
      Effect.scoped,
      Effect.flip, // Flip error to success channel
    );

    // Should get AuthenticationError
    const error = await Effect.runPromise(program);
    assertEquals(error._tag, "AuthenticationError");
  },
});

Deno.test({
  name: "HttpClient - handles network errors",
  sanitizeOps: false, // Ignore timer leaks from retry logic
  sanitizeResources: false,
  fn: async () => {
    const { executeJson } = await import("../../src/effect/http-client.ts");

    const program = Effect.gen(function* () {
      const client = yield* makeMovieDbHttpClient();

      // Try to connect to an invalid URL (should cause network error)
      yield* executeJson(client, "/movie/550");
    }).pipe(
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(
        makeTestConfig({
          baseUrl: "https://invalid-domain-that-does-not-exist.test/",
        }),
      ),
      Effect.scoped,
      Effect.flip, // Flip error to success channel
    );

    // Should get NetworkError
    const error = await Effect.runPromise(program);
    assertEquals(error._tag, "NetworkError");
  },
});
