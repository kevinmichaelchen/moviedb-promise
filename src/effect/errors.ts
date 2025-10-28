/**
 * Typed error hierarchy for MovieDb API client
 *
 * Uses Effect's Data.TaggedError for exhaustive error handling and pattern matching.
 */

import { Data, Match, ParseResult } from "effect";

/**
 * Base error for all MovieDb-related errors
 */
export class MovieDbError extends Data.TaggedError("MovieDbError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Network-related errors (connection failures, timeouts, etc.)
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly url?: string;
}> {}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate limit exceeded errors
 */
export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  /**
   * Number of seconds to wait before retrying (from Retry-After header)
   */
  readonly retryAfter?: number;
  /**
   * Current rate limit (requests per time window)
   */
  readonly limit?: number;
  /**
   * Number of requests remaining in current window
   */
  readonly remaining?: number;
}> {}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly resource: string;
  readonly id: string | number;
}> {}

/**
 * Invalid request errors (400, validation failures)
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Server errors (5xx)
 */
export class ServerError extends Data.TaggedError("ServerError")<{
  readonly message: string;
  readonly statusCode: number;
  readonly cause?: unknown;
}> {}

/**
 * Request timeout errors
 */
export class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly message: string;
  readonly timeoutMs: number;
}> {}

/**
 * Union of all possible MovieDb errors
 *
 * Use this for exhaustive error handling:
 *
 * @example
 * ```ts
 * Effect.catchTags({
 *   NotFoundError: (error) => Effect.succeed(null),
 *   RateLimitError: (error) => Effect.sleep(error.retryAfter ?? 5000),
 *   NetworkError: (error) => Effect.retry(...),
 *   ParseError: (error) => Effect.fail(new ValidationError({ message: error.message }))
 * })
 * ```
 */
export type MovieDbErrors =
  | MovieDbError
  | NetworkError
  | AuthenticationError
  | RateLimitError
  | NotFoundError
  | ValidationError
  | ServerError
  | TimeoutError
  | ParseResult.ParseError;

/**
 * Helper to create a NetworkError from an unknown error
 */
export const toNetworkError = (
  error: unknown,
  url?: string,
): NetworkError => {
  const message = error instanceof Error ? error.message : String(error);

  return new NetworkError({
    message: `Network request failed: ${message}`,
    cause: error,
    url,
  });
};

/**
 * Helper to create an error from HTTP status code using pattern matching
 */
export const fromHttpStatus = (
  statusCode: number,
  message: string,
  context?: {
    resource?: string;
    id?: string | number;
    retryAfter?: number;
  },
): MovieDbErrors =>
  Match.value(statusCode).pipe(
    // 401 or 403: Authentication/Authorization error
    Match.when(
      (code) => code === 401 || code === 403,
      () =>
        new AuthenticationError({
          message: `Authentication failed: ${message}`,
        }),
    ),
    // 404: Not Found error
    Match.when(
      404,
      () =>
        new NotFoundError({
          message,
          resource: context?.resource ?? "unknown",
          id: context?.id ?? "unknown",
        }),
    ),
    // 429: Rate Limit error
    Match.when(
      429,
      () =>
        new RateLimitError({
          message: `Rate limit exceeded: ${message}`,
          retryAfter: context?.retryAfter,
        }),
    ),
    // 400 or 422: Validation error
    Match.when(
      (code) => code === 400 || code === 422,
      () =>
        new ValidationError({
          message: `Validation failed: ${message}`,
        }),
    ),
    // 5xx: Server error
    Match.when(
      (code) => code >= 500,
      (code) =>
        new ServerError({
          message: `Server error: ${message}`,
          statusCode: code,
        }),
    ),
    // Default: Generic MovieDb error
    Match.orElse((code) =>
      new MovieDbError({
        message: `HTTP ${code}: ${message}`,
      })
    ),
  );
