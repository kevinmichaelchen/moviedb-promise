/**
 * HTTP Client integration for MovieDb API
 *
 * Provides base request builder with retry logic and error mapping.
 */

import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect, Schedule } from "effect";
import { MovieDbConfig } from "./config.ts";
import { fromHttpStatus, toNetworkError } from "./errors.ts";
import type { MovieDbErrors } from "./errors.ts";

/**
 * Create an HTTP client configured for TMDb API
 *
 * Features:
 * - Base URL prepended to all requests
 * - API key added to query parameters
 * - Automatic error mapping from HTTP status codes
 * - Retry logic for transient failures
 *
 * @returns Effect that provides a configured HttpClient
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const client = yield* makeMovieDbHttpClient()
 *   const response = yield* client.get("/movie/550")
 *   const data = yield* response.json
 * })
 * ```
 */
export const makeMovieDbHttpClient = () =>
  Effect.gen(function* () {
    const config = yield* MovieDbConfig;
    const baseClient = yield* HttpClient.HttpClient;

    // Configure client with base URL and Bearer token authentication
    const clientWithBase = baseClient.pipe(
      // Prepend base URL to all requests
      HttpClient.mapRequest(
        HttpClientRequest.prependUrl(config.baseUrl),
      ),
      // Add Bearer token to Authorization header
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("Authorization", `Bearer ${config.apiKey}`),
      ),
      // Add accept header for JSON responses
      HttpClient.mapRequest(
        HttpClientRequest.setHeader("accept", "application/json"),
      ),
      // Filter non-2xx status codes (creates ResponseError)
      HttpClient.filterStatusOk,
    );

    return clientWithBase;
  });

/**
 * Retry policy for TMDb API requests
 *
 * Retries on:
 * - Network errors (connection failures, timeouts)
 * - Rate limit errors (429) - backs off using Retry-After header
 * - Server errors (5xx) - transient failures
 *
 * Does NOT retry on:
 * - Authentication errors (401, 403)
 * - Not found errors (404)
 * - Validation errors (400, 422)
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const client = yield* makeMovieDbHttpClient()
 *   const response = yield* client.get("/movie/550").pipe(
 *     withRetry
 *   )
 * })
 * ```
 */
export const withRetry = <A, E extends MovieDbErrors, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.retry(effect, {
    // Retry up to 3 times
    times: 3,
    // Only retry on specific errors
    while: (error) => {
      // Retry on network errors, rate limits, and server errors
      return error._tag === "NetworkError" ||
        error._tag === "RateLimitError" ||
        error._tag === "ServerError";
    },
    // Use exponential backoff schedule
    schedule: Schedule.exponential("100 millis", 2).pipe(
      // Cap maximum delay at 10 seconds
      Schedule.either(Schedule.spaced("10 seconds")),
    ),
  });

/**
 * Helper to execute a GET request and parse JSON response
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const client = yield* makeMovieDbHttpClient()
 *   const movie = yield* executeJson<MovieResponse>(client, "/movie/550")
 * })
 * ```
 */
export const executeJson = <A>(
  client: HttpClient.HttpClient,
  path: string,
): Effect.Effect<A, MovieDbErrors, never> =>
  client.get(path).pipe(
    Effect.flatMap((response) => response.json),
    Effect.scoped,
    // Map HttpClientError to MovieDbErrors
    Effect.catchTags({
      ResponseError: (error) =>
        Effect.fail(
          fromHttpStatus(
            error.response.status,
            error.message,
          ),
        ),
      RequestError: (error) =>
        Effect.fail(toNetworkError(error.cause ?? error, error.request.url)),
    }),
    // Apply retry logic after error mapping
    withRetry,
  ) as Effect.Effect<A, MovieDbErrors, never>;
