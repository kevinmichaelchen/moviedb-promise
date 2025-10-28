/**
 * Test layers for mocking Effect services
 *
 * Provides mock implementations of services for unit testing.
 */

import { Effect, Layer } from "effect";
import type { MovieDbConfigOptions } from "./config.ts";
import { MovieDbConfig } from "./config.ts";
import { RateLimiter } from "./rate-limiter.ts";

/**
 * Create a test MovieDbConfig layer with customizable options
 *
 * @example
 * ```ts
 * const testConfig = makeTestConfig({ apiKey: "test-key" })
 * const program = Effect.gen(function* () {
 *   const config = yield* MovieDbConfig
 *   console.log(config.apiKey) // "test-key"
 * }).pipe(Effect.provide(testConfig))
 * ```
 */
export const makeTestConfig = (
  overrides?: Partial<MovieDbConfigOptions>,
): Layer.Layer<MovieDbConfig, never, never> => {
  const config: MovieDbConfigOptions = {
    apiKey: "test-api-key",
    baseUrl: "https://api.themoviedb.org/3/",
    requestsPerSecond: 50,
    burstCapacity: 10,
    bufferCapacity: 200,
    bufferStrategy: "dropping",
    maxConcurrent: 10,
    ...overrides,
  };

  return Layer.succeed(MovieDbConfig, config);
};

/**
 * Mock RateLimiter that executes effects immediately without rate limiting
 *
 * Useful for testing without dealing with timing concerns.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   const result = yield* limiter.execute(Effect.succeed(42))
 *   console.log(result) // 42
 * }).pipe(Effect.provide(MockRateLimiter))
 * ```
 */
export const MockRateLimiter: Layer.Layer<RateLimiter, never, never> = Layer
  .succeed(
    RateLimiter,
    RateLimiter.of({
      // Execute immediately without rate limiting
      execute: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect,
    }),
  );

/**
 * Full test layer combining all mock services
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const config = yield* MovieDbConfig
 *   const limiter = yield* RateLimiter
 *   // ... test code
 * }).pipe(Effect.provide(TestLayer))
 * ```
 */
export const TestLayer: Layer.Layer<
  MovieDbConfig | RateLimiter,
  never,
  never
> = Layer.mergeAll(
  makeTestConfig(),
  MockRateLimiter,
);

/**
 * Custom test layer with config overrides
 *
 * @example
 * ```ts
 * const layer = makeTestLayer({ apiKey: "custom-key" })
 * const program = myEffect.pipe(Effect.provide(layer))
 * ```
 */
export const makeTestLayer = (
  configOverrides?: Partial<MovieDbConfigOptions>,
): Layer.Layer<MovieDbConfig | RateLimiter, never, never> =>
  Layer.mergeAll(
    makeTestConfig(configOverrides),
    MockRateLimiter,
  );
