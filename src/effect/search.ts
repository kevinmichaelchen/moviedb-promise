/**
 * Search service for TMDb API
 *
 * Provides Effect-based methods for search endpoints.
 * All responses are validated and transformed from snake_case to camelCase.
 */

import { Effect, Schema } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";
import * as SearchSchemas from "./schemas/search.ts";

/**
 * Re-export schema types for external use
 */
export type MovieSearchResult = typeof SearchSchemas.MovieSearchResult.Type;
export type TvSearchResult = typeof SearchSchemas.TvSearchResult.Type;
export type PersonSearchResult = typeof SearchSchemas.PersonSearchResult.Type;
export type MultiSearchResult = SearchSchemas.MultiSearchResult;
export type SearchMovieResponse = typeof SearchSchemas.SearchMovieResponse.Type;
export type SearchTvResponse = typeof SearchSchemas.SearchTvResponse.Type;
export type SearchPersonResponse =
  typeof SearchSchemas.SearchPersonResponse.Type;
export type SearchMultiResponse = typeof SearchSchemas.SearchMultiResponse.Type;

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
 * Search service
 *
 * Provides methods for searching movies, TV shows, and people.
 * All responses are validated using Effect Schema and transformed to camelCase.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const search = yield* Search
 *   const results = yield* search.searchMovie({ query: "fight club" })
 *   console.log(results.results[0].title)
 *   console.log(results.results[0].releaseDate) // camelCase!
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
       * @returns Paginated movie search results with camelCase fields
       *
       * @example
       * ```ts
       * const results = yield* search.searchMovie({
       *   query: "fight club",
       *   page: 1
       * })
       * console.log(results.results[0].originalTitle) // camelCase!
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

        return client.get(`/search/movie?${params.toString()}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(SearchSchemas.SearchMovieResponse)),
        );
      },

      /**
       * Search for TV shows
       *
       * @param request - Search query and optional filters
       * @returns Paginated TV show search results with camelCase fields
       *
       * @example
       * ```ts
       * const results = yield* search.searchTv({
       *   query: "breaking bad",
       *   page: 1
       * })
       * console.log(results.results[0].firstAirDate) // camelCase!
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

        return client.get(`/search/tv?${params.toString()}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(SearchSchemas.SearchTvResponse)),
        );
      },

      /**
       * Search for people
       *
       * @param request - Search query and optional filters
       * @returns Paginated person search results with camelCase fields
       *
       * @example
       * ```ts
       * const results = yield* search.searchPerson({
       *   query: "brad pitt",
       *   page: 1
       * })
       * console.log(results.results[0].profilePath) // camelCase!
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

        return client.get(`/search/person?${params.toString()}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(SearchSchemas.SearchPersonResponse)),
        );
      },

      /**
       * Search across multiple media types (movies, TV shows, people)
       *
       * @param request - Search query and optional filters
       * @returns Paginated multi-search results with camelCase fields
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

        return client.get(`/search/multi?${params.toString()}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(SearchSchemas.SearchMultiResponse)),
        );
      },
    };
  }),
}) {}
