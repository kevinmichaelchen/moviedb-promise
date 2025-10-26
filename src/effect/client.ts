/**
 * MovieDb API client service
 *
 * Provides the main client interface for making TMDb API requests with
 * automatic rate limiting, error handling, and retries.
 */

import { Effect } from "effect";
import type { MovieDbErrors } from "./errors.ts";
import { executeJson, makeMovieDbHttpClient } from "./http-client.ts";
import { RateLimiter } from "./rate-limiter.ts";

/**
 * MovieDbClient service
 *
 * Main client for interacting with the TMDb API. Provides methods for making
 * requests with automatic rate limiting, error handling, and retries.
 *
 * @example
 * ```ts
 * import { Effect } from "effect";
 * import { MovieDbClient } from "./client.ts";
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* MovieDbClient;
 *   const list = yield* client.get<{ id: number }>("/list/1");
 *   console.log(list.id); // 1
 * });
 * ```
 */
export class MovieDbClient extends Effect.Service<MovieDbClient>()(
  "MovieDbClient",
  {
    effect: Effect.gen(function* () {
      const httpClient = yield* makeMovieDbHttpClient();
      const rateLimiter = yield* RateLimiter;

      return {
        /**
         * Make a GET request to the TMDb API
         *
         * Automatically applies:
         * - Rate limiting via token-bucket algorithm
         * - Bearer token authentication
         * - Error mapping to typed errors
         * - Retry logic for transient failures
         *
         * @param path - API endpoint path (e.g., "/list/1")
         * @returns Parsed JSON response
         *
         * @example
         * ```ts
         * const list = yield* client.get<{ id: number }>("/list/1")
         * ```
         */
        get: <A>(path: string): Effect.Effect<A, MovieDbErrors, never> =>
          rateLimiter.execute(executeJson<A>(httpClient, path)),
      };
    }),
  },
) {}
