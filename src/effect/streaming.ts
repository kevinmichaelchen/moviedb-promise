/**
 * Streaming utilities for paginated TMDb API responses
 *
 * Provides Effect Stream-based pagination that automatically fetches all pages,
 * with built-in backpressure, rate limiting, and error handling.
 */

import { Effect, Option, Stream } from "effect";
import type { MovieDbErrors } from "./errors.ts";

/**
 * Common structure for paginated API responses
 */
export interface PaginatedResponse<T> {
  readonly page: number;
  readonly results: ReadonlyArray<T>;
  readonly totalPages: number;
  readonly totalResults: number;
}

/**
 * Options for paginated streaming
 */
export interface PaginationOptions {
  /**
   * Starting page number (default: 1)
   */
  readonly startPage?: number;

  /**
   * Maximum number of pages to fetch (default: unlimited)
   */
  readonly maxPages?: number;

  /**
   * Maximum total results to return (default: unlimited)
   */
  readonly maxResults?: number;
}

/**
 * Create a stream that automatically paginates through all pages of results
 *
 * Features:
 * - Automatic pagination until all pages fetched or maxPages reached
 * - Backpressure handling via Effect streams
 * - Respects rate limits through existing rate limiter
 * - Lazy evaluation - pages only fetched as consumed
 * - Error handling preserves structured errors
 *
 * @param fetchPage - Function to fetch a single page given page number
 * @param options - Pagination options
 * @returns Stream of individual results
 *
 * @example
 * ```ts
 * const popularMovies = paginatedStream(
 *   (page) => movie.getPopular({ page }),
 *   { maxPages: 5 }
 * )
 *
 * // Process first 100 results
 * yield* popularMovies.pipe(
 *   Stream.take(100),
 *   Stream.runCollect
 * )
 * ```
 */
export const paginatedStream = <T>(
  fetchPage: (page: number) => Effect.Effect<
    PaginatedResponse<T>,
    MovieDbErrors,
    never
  >,
  options: PaginationOptions = {},
): Stream.Stream<T, MovieDbErrors, never> => {
  const { startPage = 1, maxPages, maxResults } = options;

  // Track state: current page number and pages fetched
  interface State {
    readonly currentPage: number;
    readonly pagesFetched: number;
  }

  // Use paginateEffect for controlled pagination
  const pageStream: Stream.Stream<ReadonlyArray<T>, MovieDbErrors, never> =
    Stream.paginateEffect(
      { currentPage: startPage, pagesFetched: 0 } as State,
      (state) =>
        fetchPage(state.currentPage).pipe(
          Effect.annotateLogs({ page: state.currentPage }),
          Effect.map((response) => {
            // Check if we should stop after this page
            const isLastPage = state.currentPage >= response.totalPages;
            const hitMaxPages = maxPages !== undefined &&
              state.pagesFetched >= maxPages - 1;

            if (isLastPage || hitMaxPages) {
              // Return current page results and no next state (stops iteration)
              return [response.results, Option.none()] as const;
            } else {
              // Return current page results and next state
              return [
                response.results,
                Option.some({
                  currentPage: state.currentPage + 1,
                  pagesFetched: state.pagesFetched + 1,
                }),
              ] as const;
            }
          }),
        ),
    );

  // Flatten array chunks into individual items
  const flattened: Stream.Stream<T, MovieDbErrors, never> = pageStream.pipe(
    Stream.flatMap((results) => Stream.fromIterable(results)),
  );

  // Apply maxResults limit if specified
  return maxResults !== undefined
    ? Stream.take(flattened, maxResults)
    : flattened;
};

/**
 * Fetch all pages and collect into a single array
 *
 * ⚠️ Warning: This loads all results into memory. Use with caution for
 * large result sets. Consider using `paginatedStream` with `Stream.take`
 * for better memory efficiency.
 *
 * @param fetchPage - Function to fetch a single page
 * @param options - Pagination options
 * @returns Effect containing all results
 *
 * @example
 * ```ts
 * const allMovies = yield* collectAllPages(
 *   (page) => movie.getPopular({ page }),
 *   { maxPages: 10 }
 * )
 * console.log(`Fetched ${allMovies.length} movies`)
 * ```
 */
export const collectAllPages = <T>(
  fetchPage: (page: number) => Effect.Effect<
    PaginatedResponse<T>,
    MovieDbErrors,
    never
  >,
  options: PaginationOptions = {},
): Effect.Effect<ReadonlyArray<T>, MovieDbErrors, never> =>
  paginatedStream(fetchPage, options).pipe(
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
  );

/**
 * Process paginated results with a function, collecting the transformed results
 *
 * More memory efficient than `collectAllPages` + `map` as it processes
 * results in a streaming fashion.
 *
 * @param fetchPage - Function to fetch a single page
 * @param fn - Function to apply to each result
 * @param options - Pagination options
 * @returns Effect containing transformed results
 *
 * @example
 * ```ts
 * const movieTitles = yield* mapPaginated(
 *   (page) => movie.getPopular({ page }),
 *   (movie) => movie.title,
 *   { maxResults: 50 }
 * )
 * ```
 */
export const mapPaginated = <T, R>(
  fetchPage: (page: number) => Effect.Effect<
    PaginatedResponse<T>,
    MovieDbErrors,
    never
  >,
  fn: (item: T) => R,
  options: PaginationOptions = {},
): Effect.Effect<ReadonlyArray<R>, MovieDbErrors, never> =>
  paginatedStream(fetchPage, options).pipe(
    Stream.map(fn),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
  );

/**
 * Process paginated results with an effectful function
 *
 * Useful for operations that require side effects (API calls, logging, etc.)
 *
 * @param fetchPage - Function to fetch a single page
 * @param fn - Effectful function to apply to each result
 * @param options - Pagination options including concurrency control
 * @returns Effect containing transformed results
 *
 * @example
 * ```ts
 * // Fetch movie details for each popular movie (with concurrency limit)
 * const movieDetails = yield* mapPaginatedEffect(
 *   (page) => movie.getPopular({ page }),
 *   (movie) => movie.getDetails({ id: movie.id }),
 *   { maxResults: 20, concurrency: 5 }
 * )
 * ```
 */
export const mapPaginatedEffect = <T, R, E, Req>(
  fetchPage: (page: number) => Effect.Effect<
    PaginatedResponse<T>,
    MovieDbErrors,
    never
  >,
  fn: (item: T) => Effect.Effect<R, E, Req>,
  options: PaginationOptions & { readonly concurrency?: number } = {},
): Effect.Effect<ReadonlyArray<R>, MovieDbErrors | E, Req> => {
  const { concurrency = 1, ...paginationOptions } = options;

  return paginatedStream(fetchPage, paginationOptions).pipe(
    Stream.mapEffect(fn, { concurrency }),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
  );
};
