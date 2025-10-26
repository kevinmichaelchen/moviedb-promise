/**
 * Backward compatibility layer for Effect services
 *
 * Provides a Promise-based API that wraps the Effect services,
 * maintaining compatibility with the original MovieDb class API.
 */

import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { MovieDbClient } from "./client.ts";
import { MovieDbConfig, type MovieDbConfigOptions } from "./config.ts";
import { RateLimiterLive } from "./rate-limiter.ts";
import {
  Movie,
  type MovieCredits,
  type MovieDetails,
  type MovieImages,
  type MovieListResponse,
  type MovieVideos,
} from "./movie.ts";
import {
  type PersonCombinedCredits,
  type PersonDetails,
  type PersonImages,
  type PersonMovieCredits,
  type PersonPopularResponse,
  type PersonTvCredits,
  Person,
} from "./person.ts";
import {
  type SearchMovieResponse,
  type SearchMultiResponse,
  type SearchPersonResponse,
  type SearchTvResponse,
  Search,
} from "./search.ts";
import {
  type TvCredits,
  type TvImages,
  type TvShowDetails,
  type TvShowListResponse,
  type TvVideos,
  Tv,
} from "./tv.ts";

/**
 * Configuration options for MovieDbCompat
 */
export interface MovieDbCompatConfig {
  /** TMDb API key */
  readonly apiKey: string;
  /** Base URL for TMDb API (defaults to v3) */
  readonly baseUrl?: string;
  /** Requests per second limit (defaults to 50) */
  readonly requestsPerSecondLimit?: number;
}

/**
 * Backward-compatible MovieDb client
 *
 * Wraps Effect-based services with a Promise-based API that matches
 * the original MovieDb class interface.
 *
 * @example
 * ```ts
 * const movieDb = new MovieDbCompat({ apiKey: "your-api-key" });
 * const movie = await movieDb.movieInfo(550);
 * console.log(movie.title); // "Fight Club"
 * ```
 */
export class MovieDbCompat {
  private appLayer: Layer.Layer<
    Movie | Tv | Search | Person,
    never,
    never
  >;

  constructor(config: MovieDbCompatConfig) {
    const fullConfig: MovieDbConfigOptions = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.themoviedb.org/3/",
      requestsPerSecond: config.requestsPerSecondLimit ?? 50,
      burstCapacity: 10,
      bufferCapacity: 200,
      bufferStrategy: "dropping",
      maxConcurrent: 10,
    };

    const ConfigLayer = Layer.succeed(MovieDbConfig, fullConfig);

    this.appLayer = Layer.mergeAll(
      Movie.Default,
      Tv.Default,
      Search.Default,
      Person.Default,
    ).pipe(
      Layer.provide(MovieDbClient.Default),
      Layer.provide(RateLimiterLive),
      Layer.provide(NodeHttpClient.layerUndici),
      Layer.provide(ConfigLayer),
    );
  }

  /**
   * Helper to run an Effect program and return a Promise
   */
  private runEffect<A, E>(
    effect: Effect.Effect<A, E, Movie | Tv | Search | Person>,
  ): Promise<A> {
    return Effect.runPromise(
      effect.pipe(
        Effect.provide(this.appLayer),
        Effect.scoped,
      ),
    );
  }

  /**
   * Helper to normalize params from string/number to object
   */
  private normalizeIdParams(
    params: string | number | { id: number; language?: string },
  ): { id: number; language?: string } {
    if (typeof params === "string" || typeof params === "number") {
      return { id: Number(params) };
    }
    return params;
  }

  // ===== Movie Methods =====

  /**
   * Get movie details
   *
   * @param params - Movie ID or request object
   * @returns Movie details
   *
   * @example
   * ```ts
   * const movie = await movieDb.movieInfo(550);
   * ```
   */
  movieInfo(
    params: string | number | { id: number; language?: string },
  ): Promise<MovieDetails> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getDetails(normalized);
      }),
    );
  }

  /**
   * Get movie credits
   *
   * @param params - Movie ID or request object
   * @returns Movie credits
   */
  movieCredits(
    params: string | number | { id: number; language?: string },
  ): Promise<MovieCredits> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getCredits(normalized);
      }),
    );
  }

  /**
   * Get movie videos
   *
   * @param params - Movie ID or request object
   * @returns Movie videos
   */
  movieVideos(
    params: string | number | { id: number; language?: string },
  ): Promise<MovieVideos> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getVideos(normalized);
      }),
    );
  }

  /**
   * Get movie images
   *
   * @param params - Movie ID or request object
   * @returns Movie images
   */
  movieImages(
    params:
      | string
      | number
      | { id: number; language?: string; include_image_language?: string },
  ): Promise<MovieImages> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getImages(normalized);
      }),
    );
  }

  /**
   * Get now playing movies
   *
   * @param params - Optional request parameters
   * @returns Now playing movies
   */
  movieNowPlaying(params?: {
    language?: string;
    page?: number;
    region?: string;
  }): Promise<MovieListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getNowPlaying(params);
      }),
    );
  }

  /**
   * Get popular movies
   *
   * @param params - Optional request parameters
   * @returns Popular movies
   */
  moviePopular(params?: {
    language?: string;
    page?: number;
    region?: string;
  }): Promise<MovieListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getPopular(params);
      }),
    );
  }

  /**
   * Get top rated movies
   *
   * @param params - Optional request parameters
   * @returns Top rated movies
   */
  movieTopRated(params?: {
    language?: string;
    page?: number;
    region?: string;
  }): Promise<MovieListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const movie = yield* Movie;
        return yield* movie.getTopRated(params);
      }),
    );
  }

  // ===== TV Methods =====

  /**
   * Get TV show details
   *
   * @param params - TV show ID or request object
   * @returns TV show details
   */
  tvInfo(
    params: string | number | { id: number; language?: string },
  ): Promise<TvShowDetails> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getDetails(normalized);
      }),
    );
  }

  /**
   * Get TV show credits
   *
   * @param params - TV show ID or request object
   * @returns TV show credits
   */
  tvCredits(
    params: string | number | { id: number; language?: string },
  ): Promise<TvCredits> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getCredits(normalized);
      }),
    );
  }

  /**
   * Get TV show videos
   *
   * @param params - TV show ID or request object
   * @returns TV show videos
   */
  tvVideos(
    params: string | number | { id: number; language?: string },
  ): Promise<TvVideos> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getVideos(normalized);
      }),
    );
  }

  /**
   * Get TV show images
   *
   * @param params - TV show ID or request object
   * @returns TV show images
   */
  tvImages(
    params:
      | string
      | number
      | { id: number; language?: string; include_image_language?: string },
  ): Promise<TvImages> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getImages(normalized);
      }),
    );
  }

  /**
   * Get TV shows airing today
   *
   * @param params - Optional request parameters
   * @returns TV shows airing today
   */
  tvAiringToday(params?: {
    language?: string;
    page?: number;
    timezone?: string;
  }): Promise<TvShowListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getAiringToday(params);
      }),
    );
  }

  /**
   * Get TV shows on the air
   *
   * @param params - Optional request parameters
   * @returns TV shows on the air
   */
  tvOnTheAir(params?: {
    language?: string;
    page?: number;
    timezone?: string;
  }): Promise<TvShowListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getOnTheAir(params);
      }),
    );
  }

  /**
   * Get popular TV shows
   *
   * @param params - Optional request parameters
   * @returns Popular TV shows
   */
  tvPopular(params?: {
    language?: string;
    page?: number;
  }): Promise<TvShowListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getPopular(params);
      }),
    );
  }

  /**
   * Get top rated TV shows
   *
   * @param params - Optional request parameters
   * @returns Top rated TV shows
   */
  tvTopRated(params?: {
    language?: string;
    page?: number;
  }): Promise<TvShowListResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const tv = yield* Tv;
        return yield* tv.getTopRated(params);
      }),
    );
  }

  // ===== Search Methods =====

  /**
   * Search for movies
   *
   * @param params - Search request
   * @returns Movie search results
   */
  searchMovie(params: {
    query: string;
    language?: string;
    page?: number;
    include_adult?: boolean;
    region?: string;
    year?: number;
    primary_release_year?: number;
  }): Promise<SearchMovieResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.searchMovie(params);
      }),
    );
  }

  /**
   * Search for TV shows
   *
   * @param params - Search request
   * @returns TV show search results
   */
  searchTv(params: {
    query: string;
    language?: string;
    page?: number;
    include_adult?: boolean;
    first_air_date_year?: number;
  }): Promise<SearchTvResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.searchTv(params);
      }),
    );
  }

  /**
   * Search for people
   *
   * @param params - Search request
   * @returns Person search results
   */
  searchPerson(params: {
    query: string;
    language?: string;
    page?: number;
    include_adult?: boolean;
  }): Promise<SearchPersonResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.searchPerson(params);
      }),
    );
  }

  /**
   * Search across multiple media types
   *
   * @param params - Search request
   * @returns Multi-search results
   */
  searchMulti(params: {
    query: string;
    language?: string;
    page?: number;
    include_adult?: boolean;
  }): Promise<SearchMultiResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const search = yield* Search;
        return yield* search.searchMulti(params);
      }),
    );
  }

  // ===== Person Methods =====

  /**
   * Get person details
   *
   * @param params - Person ID or request object
   * @returns Person details
   */
  personInfo(
    params: string | number | { id: number; language?: string },
  ): Promise<PersonDetails> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getDetails(normalized);
      }),
    );
  }

  /**
   * Get person movie credits
   *
   * @param params - Person ID or request object
   * @returns Person's movie credits
   */
  personMovieCredits(
    params: string | number | { id: number; language?: string },
  ): Promise<PersonMovieCredits> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getMovieCredits(normalized);
      }),
    );
  }

  /**
   * Get person TV credits
   *
   * @param params - Person ID or request object
   * @returns Person's TV credits
   */
  personTvCredits(
    params: string | number | { id: number; language?: string },
  ): Promise<PersonTvCredits> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getTvCredits(normalized);
      }),
    );
  }

  /**
   * Get person combined credits
   *
   * @param params - Person ID or request object
   * @returns Person's combined credits
   */
  personCombinedCredits(
    params: string | number | { id: number; language?: string },
  ): Promise<PersonCombinedCredits> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getCombinedCredits(normalized);
      }),
    );
  }

  /**
   * Get person images
   *
   * @param params - Person ID or request object
   * @returns Person's images
   */
  personImages(
    params: string | number | { id: number; language?: string },
  ): Promise<PersonImages> {
    const normalized = this.normalizeIdParams(params);
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getImages(normalized);
      }),
    );
  }

  /**
   * Get popular people
   *
   * @param params - Optional request parameters
   * @returns Popular people
   */
  personPopular(params?: {
    language?: string;
    page?: number;
  }): Promise<PersonPopularResponse> {
    return this.runEffect(
      Effect.gen(function* () {
        const person = yield* Person;
        return yield* person.getPopular(params);
      }),
    );
  }
}
