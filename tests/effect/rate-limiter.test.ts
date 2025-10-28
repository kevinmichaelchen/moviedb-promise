/**
 * Tests for RateLimiter service using Effect's built-in token-bucket limiter
 */

import { assertEquals } from "@std/assert";
import { Effect } from "effect";
import { makeRateLimiter } from "../../src/effect/rate-limiter.ts";
import type { MovieDbConfigOptions } from "../../src/effect/config.ts";

const makeTestRateLimiter = (overrides?: Partial<MovieDbConfigOptions>) => {
  const config: MovieDbConfigOptions = {
    apiKey: "test-key",
    baseUrl: "https://api.themoviedb.org/4/",
    requestsPerSecond: 10, // 1 request per 100ms
    burstCapacity: 2,
    bufferCapacity: 5,
    bufferStrategy: "dropping",
    maxConcurrent: 2,
    metricsTag: crypto.randomUUID(),
    ...overrides,
  };
  return makeRateLimiter(config);
};

Deno.test("RateLimiter - executes effects successfully", async () => {
  const program = Effect.gen(function* () {
    const limiter = yield* makeTestRateLimiter();
    const result = yield* limiter.execute(Effect.succeed(42));
    assertEquals(result, 42);
  }).pipe(Effect.scoped);

  await Effect.runPromise(program);
});

Deno.test("RateLimiter - executes multiple effects", async () => {
  const program = Effect.gen(function* () {
    const limiter = yield* makeTestRateLimiter({
      requestsPerSecond: 100, // Fast rate for testing
    });

    // Execute multiple tasks through the rate limiter
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = yield* limiter.execute(Effect.succeed(i));
      results.push(result);
    }

    // All tasks should complete successfully
    assertEquals(results, [0, 1, 2, 3, 4]);
  }).pipe(Effect.scoped);

  await Effect.runPromise(program);
});

Deno.test("RateLimiter - handles errors in rate-limited effects", async () => {
  const program = Effect.gen(function* () {
    const limiter = yield* makeTestRateLimiter();

    // Effect that fails
    const failingEffect = Effect.fail(new Error("Test error"));

    const result = yield* limiter.execute(failingEffect).pipe(
      Effect.flip, // Flip to get the error as success
    );

    assertEquals(result.message, "Test error");
  }).pipe(Effect.scoped);

  await Effect.runPromise(program);
});

Deno.test("RateLimiter - automatic cleanup via Scope", async () => {
  const program = Effect.gen(function* () {
    const limiter = yield* makeTestRateLimiter();

    // Execute some work
    const result1 = yield* limiter.execute(Effect.succeed(1));
    const result2 = yield* limiter.execute(Effect.succeed(2));

    assertEquals(result1, 1);
    assertEquals(result2, 2);

    // RateLimiter will be automatically cleaned up when scope ends
  }).pipe(Effect.scoped);

  await Effect.runPromise(program);
});
