/**
 * Configuration service for MovieDb API client
 *
 * Provides centralized configuration management using Effect's Context system.
 */

import { Context } from "effect";

/**
 * Configuration options for the MovieDb API client
 */
export interface MovieDbConfigOptions {
  /**
   * The Movie Database API key
   * @see https://developers.themoviedb.org/3/getting-started/introduction
   */
  readonly apiKey: string;

  /**
   * Base URL for the TMDb API
   * @default "https://api.themoviedb.org/3/"
   */
  readonly baseUrl: string;

  /**
   * Maximum number of requests per second
   * @default 50
   */
  readonly requestsPerSecond: number;

  /**
   * Burst capacity for token bucket rate limiting
   * Allows temporary rate limit violations for better UX
   * @default 10
   */
  readonly burstCapacity: number;

  /**
   * Maximum buffer size for request queue
   * Prevents unbounded memory growth during traffic spikes
   * @default 200
   */
  readonly bufferCapacity: number;

  /**
   * Buffer overflow strategy
   * - "dropping": Drop new requests when buffer is full
   * - "sliding": Drop oldest requests when buffer is full
   * @default "dropping"
   */
  readonly bufferStrategy: "dropping" | "sliding";

  /**
   * Maximum number of concurrent HTTP connections
   * @default 10
   */
  readonly maxConcurrent?: number;
}

/**
 * MovieDb configuration service tag
 *
 * Use this to access configuration in your Effect programs:
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const config = yield* MovieDbConfig
 *   console.log(config.apiKey)
 * })
 * ```
 */
export class MovieDbConfig extends Context.Tag("MovieDbConfig")<
  MovieDbConfig,
  MovieDbConfigOptions
>() {}

/**
 * Default configuration values
 */
export const defaultConfig: Omit<MovieDbConfigOptions, "apiKey"> = {
  baseUrl: "https://api.themoviedb.org/3/",
  requestsPerSecond: 50,
  burstCapacity: 10,
  bufferCapacity: 200,
  bufferStrategy: "dropping",
  maxConcurrent: 10,
};

/**
 * Create a MovieDbConfig from partial options
 *
 * @example
 * ```ts
 * const config = createConfig({ apiKey: "your-api-key" })
 * ```
 */
export const createConfig = (
  options:
    & Pick<MovieDbConfigOptions, "apiKey">
    & Partial<Omit<MovieDbConfigOptions, "apiKey">>,
): MovieDbConfigOptions => ({
  ...defaultConfig,
  ...options,
});
