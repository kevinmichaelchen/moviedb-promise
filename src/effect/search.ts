/**
 * Search service for TMDb API
 *
 * Provides Effect-based methods for search endpoints.
 */

import { Effect } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";

/**
 * Common search request parameters
 */
export interface SearchRequest {
  /** Search query string */
  readonly query: string;
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
  /** Page number */
  readonly page?: number;
  /** Include adult content */
  readonly include_adult?: boolean;
}

export interface SearchMovieRequest extends SearchRequest {
  /** ISO 3166-1 region code (e.g., "US") */
  readonly region?: string;
  /** Filter by year */
  readonly year?: number;
  /** Filter by primary release year */
  readonly primary_release_year?: number;
}

export interface SearchTvRequest extends SearchRequest {
  /** Filter by first air date year */
  readonly first_air_date_year?: number;
}

export interface SearchPersonRequest extends SearchRequest {}

export interface SearchMultiRequest extends SearchRequest {}

/**
 * Search result types
 */
export interface MovieSearchResult {
  readonly id: number;
  readonly title: string;
  readonly original_title: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly release_date: string;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly popularity: number;
  readonly media_type?: "movie";
}

export interface TvSearchResult {
  readonly id: number;
  readonly name: string;
  readonly original_name: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly first_air_date: string;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly popularity: number;
  readonly media_type?: "tv";
}

export interface PersonSearchResult {
  readonly id: number;
  readonly name: string;
  readonly profile_path: string | null;
  readonly known_for_department: string;
  readonly popularity: number;
  readonly media_type?: "person";
  readonly known_for?: ReadonlyArray<MovieSearchResult | TvSearchResult>;
}

export type MultiSearchResult =
  | MovieSearchResult
  | TvSearchResult
  | PersonSearchResult;

export interface SearchMovieResponse {
  readonly page: number;
  readonly results: ReadonlyArray<MovieSearchResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

export interface SearchTvResponse {
  readonly page: number;
  readonly results: ReadonlyArray<TvSearchResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

export interface SearchPersonResponse {
  readonly page: number;
  readonly results: ReadonlyArray<PersonSearchResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

export interface SearchMultiResponse {
  readonly page: number;
  readonly results: ReadonlyArray<MultiSearchResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

/**
 * Search service
 *
 * Provides methods for searching movies, TV shows, and people.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const search = yield* Search
 *   const results = yield* search.searchMovie({ query: "fight club" })
 *   console.log(results.results[0].title)
 * })
 * ```
 */
export class Search extends Effect.Service<Search>()("Search", {
  effect: Effect.gen(function* () {
    const client = yield* MovieDbClient;

    return {
      /**
       * Search for movies
       *
       * @param request - Search query and optional filters
       * @returns Paginated movie search results
       *
       * @example
       * ```ts
       * const results = yield* search.searchMovie({
       *   query: "fight club",
       *   page: 1
       * })
       * ```
       */
      searchMovie: (
        request: SearchMovieRequest,
      ): Effect.Effect<SearchMovieResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        params.set("query", request.query);
        if (request.language) params.set("language", request.language);
        if (request.page) params.set("page", String(request.page));
        if (request.include_adult !== undefined) {
          params.set("include_adult", String(request.include_adult));
        }
        if (request.region) params.set("region", request.region);
        if (request.year) params.set("year", String(request.year));
        if (request.primary_release_year) {
          params.set(
            "primary_release_year",
            String(request.primary_release_year),
          );
        }

        return client.get<SearchMovieResponse>(
          `/search/movie?${params.toString()}`,
        );
      },

      /**
       * Search for TV shows
       *
       * @param request - Search query and optional filters
       * @returns Paginated TV show search results
       *
       * @example
       * ```ts
       * const results = yield* search.searchTv({
       *   query: "breaking bad",
       *   page: 1
       * })
       * ```
       */
      searchTv: (
        request: SearchTvRequest,
      ): Effect.Effect<SearchTvResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        params.set("query", request.query);
        if (request.language) params.set("language", request.language);
        if (request.page) params.set("page", String(request.page));
        if (request.include_adult !== undefined) {
          params.set("include_adult", String(request.include_adult));
        }
        if (request.first_air_date_year) {
          params.set(
            "first_air_date_year",
            String(request.first_air_date_year),
          );
        }

        return client.get<SearchTvResponse>(
          `/search/tv?${params.toString()}`,
        );
      },

      /**
       * Search for people
       *
       * @param request - Search query and optional filters
       * @returns Paginated person search results
       *
       * @example
       * ```ts
       * const results = yield* search.searchPerson({
       *   query: "brad pitt",
       *   page: 1
       * })
       * ```
       */
      searchPerson: (
        request: SearchPersonRequest,
      ): Effect.Effect<SearchPersonResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        params.set("query", request.query);
        if (request.language) params.set("language", request.language);
        if (request.page) params.set("page", String(request.page));
        if (request.include_adult !== undefined) {
          params.set("include_adult", String(request.include_adult));
        }

        return client.get<SearchPersonResponse>(
          `/search/person?${params.toString()}`,
        );
      },

      /**
       * Search across multiple media types (movies, TV shows, people)
       *
       * @param request - Search query and optional filters
       * @returns Paginated multi-search results
       *
       * @example
       * ```ts
       * const results = yield* search.searchMulti({
       *   query: "fight",
       *   page: 1
       * })
       * ```
       */
      searchMulti: (
        request: SearchMultiRequest,
      ): Effect.Effect<SearchMultiResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        params.set("query", request.query);
        if (request.language) params.set("language", request.language);
        if (request.page) params.set("page", String(request.page));
        if (request.include_adult !== undefined) {
          params.set("include_adult", String(request.include_adult));
        }

        return client.get<SearchMultiResponse>(
          `/search/multi?${params.toString()}`,
        );
      },
    };
  }),
}) {}
