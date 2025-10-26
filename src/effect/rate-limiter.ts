/**
 * Rate limiting service for MovieDb API client
 *
 * Implements buffered throttling using Effect's Stream API:
 * - Token bucket algorithm via Stream.throttle
 * - Bounded buffering via Stream.buffer to prevent unbounded queue growth
 * - Semaphore for concurrent connection limits
 */

import {
  Chunk,
  Context,
  Deferred,
  Effect,
  Fiber,
  Metric,
  Queue,
  Stream,
} from "effect";
import type { MovieDbConfigOptions } from "./config.ts";

/**
 * Request with its deferred result
 * @internal
 */
export interface RateLimitedRequest<E, A> {
  readonly effect: Effect.Effect<A, E, never>;
  readonly deferred: Deferred.Deferred<A, E>;
}

/**
 * RateLimiter service interface
 *
 * Provides rate-limited execution of Effect programs using buffered throttling.
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
   * Queues the effect and executes it according to rate limit rules.
   * Returns immediately if within rate limits, or waits for capacity.
   *
   * @param effect - The Effect to execute with rate limiting
   * @returns The result of the effect, rate-limited
   */
  readonly execute: <A, E>(
    effect: Effect.Effect<A, E, never>,
  ) => Effect.Effect<A, E, never>;

  /**
   * Get current rate limiter statistics
   */
  readonly stats: () => Effect.Effect<RateLimiterStats, never, never>;

  /**
   * Shutdown the rate limiter gracefully
   *
   * Waits for in-flight requests to complete, then releases resources.
   */
  readonly shutdown: () => Effect.Effect<void, never, never>;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  /**
   * Number of requests currently queued
   */
  readonly queueSize: number;

  /**
   * Number of requests currently executing
   */
  readonly inFlight: number;

  /**
   * Number of requests completed
   */
  readonly completed: number;

  /**
   * Number of requests dropped (if using dropping strategy)
   */
  readonly dropped: number;
}

/**
 * RateLimiter service tag
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   const result = yield* limiter.execute(myEffect)
 * })
 * ```
 */
export class RateLimiter extends Context.Tag("RateLimiter")<
  RateLimiter,
  RateLimiterService
>() {}

/**
 * Create a RateLimiter implementation from configuration
 *
 * Implements buffered throttling strategy:
 * 1. Requests are added to a bounded queue (bufferCapacity)
 * 2. Queue uses specified overflow strategy (dropping/sliding)
 * 3. Stream.throttle applies token bucket rate limiting
 * 4. Semaphore enforces concurrent connection limits
 *
 * @param config - Configuration options for rate limiting
 * @returns Layer that provides RateLimiter service
 *
 * @example
 * ```ts
 * const config = createConfig({ apiKey: "your-key" })
 * const layer = makeRateLimiter(config)
 *
 * const program = Effect.gen(function* () {
 *   const limiter = yield* RateLimiter
 *   const result = yield* limiter.execute(myEffect)
 * }).pipe(Effect.provide(layer))
 * ```
 */
export const makeRateLimiter = (
  config: MovieDbConfigOptions,
): Effect.Effect<RateLimiterService, never, never> => {
  return Effect.gen(function* () {
    // Create metrics for tracking statistics
    const baseCompletedCounter = Metric.counter("moviedb_requests_completed", {
      description: "Number of rate-limited requests completed",
      incremental: true,
    });

    const baseDroppedCounter = Metric.counter("moviedb_requests_dropped", {
      description: "Number of requests dropped due to buffer overflow",
      incremental: true,
    });

    // Apply tags for test isolation if provided
    const completedCounter = config.metricsTag
      ? baseCompletedCounter.pipe(
        Metric.tagged("instance", config.metricsTag),
      )
      : baseCompletedCounter;

    const droppedCounter = config.metricsTag
      ? baseDroppedCounter.pipe(Metric.tagged("instance", config.metricsTag))
      : baseDroppedCounter;

    // Create semaphore for concurrent connection limits
    const semaphore = yield* Effect.makeSemaphore(config.maxConcurrent ?? 10);

    // Create bounded queue for buffering requests
    const queue = yield* Queue.bounded<RateLimitedRequest<unknown, unknown>>(
      config.bufferCapacity,
    );

    // Start the rate-limited stream processor
    const fiber = yield* Stream.fromQueue(queue).pipe(
      // Apply buffering strategy
      Stream.buffer({
        capacity: config.burstCapacity,
        strategy: config.bufferStrategy,
      }),
      // Apply token bucket throttling
      Stream.throttle({
        cost: Chunk.size,
        units: 1,
        duration: `${1000 / config.requestsPerSecond} millis`,
        burst: config.burstCapacity,
      }),
      // Execute each request with semaphore
      Stream.mapEffect((req) =>
        semaphore.withPermits(1)(
          req.effect.pipe(
            Effect.flatMap((result) => Deferred.succeed(req.deferred, result)),
            Effect.catchAllCause((cause) =>
              Deferred.failCause(req.deferred, cause)
            ),
            // Track completion in metrics
            Effect.tap(() => completedCounter(Effect.succeed(1))),
          ),
        )
      ),
      Stream.runDrain,
      Effect.forkDaemon,
    );

    return {
      execute: <A, E>(effect: Effect.Effect<A, E, never>) =>
        Effect.gen(function* () {
          const deferred = yield* Deferred.make<A, E>();

          const offered = yield* Queue.offer(
            queue,
            { effect, deferred } as RateLimitedRequest<unknown, unknown>,
          );

          if (!offered && config.bufferStrategy === "dropping") {
            // Track dropped request in metrics
            yield* droppedCounter(Effect.succeed(1));
            return yield* Effect.die(
              new Error("Rate limiter queue full, request dropped"),
            );
          }

          return yield* Deferred.await(deferred);
        }),

      stats: () =>
        Effect.gen(function* () {
          const queueSize = yield* Queue.size(queue);
          const completedState = yield* Metric.value(completedCounter);
          const droppedState = yield* Metric.value(droppedCounter);

          // Calculate in-flight by taking permits
          const permits = yield* semaphore.take(0);
          const maxConcurrent = config.maxConcurrent ?? 10;
          const inFlight = maxConcurrent - permits;

          return {
            queueSize,
            inFlight,
            completed: completedState.count,
            dropped: droppedState.count,
          };
        }),

      shutdown: () =>
        Effect.gen(function* () {
          yield* Queue.shutdown(queue);
          yield* Fiber.interrupt(fiber);
        }),
    };
  });
};
