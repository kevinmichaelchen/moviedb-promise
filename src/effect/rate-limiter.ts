/**
 * Rate limiting service for MovieDb API client
 *
 * Uses Effect's built-in RateLimiter with token-bucket algorithm.
 */

import {
  Context,
  Effect,
  Layer,
  RateLimiter as EffectRateLimiter,
  Scope,
} from "effect";
import type { MovieDbConfigOptions } from "./config.ts";
import { MovieDbConfig } from "./config.ts";

/**
 * RateLimiter service interface
 *
 * Provides rate-limited execution of Effect programs using Effect's built-in
 * token-bucket rate limiter.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   const result = yield* limiter.execute(
 *     Effect.tryPromise(() => fetch("https://api.themoviedb.org/3/movie/550"))
 *   )
 * })
 * ```
 */
export interface RateLimiterService {
  /**
   * Execute an Effect with rate limiting
   *
   * Applies token-bucket rate limiting to the effect. The effect will wait
   * for a token before starting execution.
   *
   * @param effect - The Effect to execute with rate limiting
   * @returns The result of the effect, rate-limited
   */
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
}

/**
 * RateLimiter service tag
 */
export class RateLimiter extends Context.Tag("RateLimiter")<
  RateLimiter,
  RateLimiterService
>() {}

/**
 * Create a RateLimiter from configuration
 *
 * Uses Effect's built-in RateLimiter with token-bucket algorithm:
 * - Spreads requests evenly over the interval
 * - Allows burst capacity naturally via token accumulation
 * - Scoped resource (automatic cleanup)
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   // ... use limiter
 * }).pipe(
 *   Effect.provide(RateLimiterLive),
 *   Effect.provide(MovieDbConfigLayer),
 *   Effect.scoped
 * )
 * ```
 */
export const makeRateLimiter = (
  config: MovieDbConfigOptions,
): Effect.Effect<RateLimiterService, never, Scope.Scope> =>
  Effect.gen(function* () {
    // Create the Effect RateLimiter with token-bucket algorithm
    // For 50 requests/second, each request can start every 20ms
    const rateLimiter = yield* EffectRateLimiter.make({
      limit: config.requestsPerSecond,
      interval: "1 seconds",
      algorithm: "token-bucket",
    });

    return {
      execute: <A, E, R>(effect: Effect.Effect<A, E, R>) => rateLimiter(effect),
    };
  });

/**
 * Layer that provides the RateLimiter service
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   const result = yield* limiter.execute(myEffect)
 * }).pipe(
 *   Effect.provide(RateLimiterLive),
 *   Effect.provide(MovieDbConfigLayer),
 *   Effect.scoped
 * )
 * ```
 */
export const RateLimiterLive: Layer.Layer<
  RateLimiter,
  never,
  MovieDbConfig
> = Layer.scoped(
  RateLimiter,
  Effect.gen(function* () {
    const config = yield* MovieDbConfig;
    return yield* makeRateLimiter(config);
  }),
);
