/**
 * Movie service for TMDb API
 *
 * Provides Effect-based methods for movie-related endpoints.
 * All responses are validated and transformed from snake_case to camelCase.
 */

import { Effect, Schema } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";
import * as MovieSchemas from "./schemas/movie.ts";

/**
 * Re-export schema types for external use
 */
export type MovieDetails = typeof MovieSchemas.MovieDetails.Type;
export type MovieCastMember = typeof MovieSchemas.MovieCastMember.Type;
export type MovieCrewMember = typeof MovieSchemas.MovieCrewMember.Type;
export type MovieCredits = typeof MovieSchemas.MovieCredits.Type;
export type MovieVideo = typeof MovieSchemas.MovieVideo.Type;
export type MovieVideos = typeof MovieSchemas.MovieVideos.Type;
export type MovieImage = typeof MovieSchemas.MovieImage.Type;
export type MovieImages = typeof MovieSchemas.MovieImages.Type;
export type MovieListResult = typeof MovieSchemas.MovieListResult.Type;
export type MovieListResponse = typeof MovieSchemas.MovieListResponse.Type;

/**
 * Common request parameters
 */
export interface MovieIdRequest {
  /** Movie ID */
  readonly id: number;
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
}

export interface MovieImagesRequest extends MovieIdRequest {
  /** Include image language (e.g., "en,null") */
  readonly include_image_language?: string;
}

export interface MovieListRequest {
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
  /** Page number */
  readonly page?: number;
  /** ISO 3166-1 region code (e.g., "US") */
  readonly region?: string;
}

/**
 * Movie service
 *
 * Provides methods for interacting with TMDb movie endpoints.
 * All responses are validated using Effect Schema and transformed to camelCase.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const movie = yield* Movie
 *   const details = yield* movie.getDetails({ id: 550 })
 *   console.log(details.title) // "Fight Club"
 *   console.log(details.releaseDate) // "1999-10-15" - note camelCase!
 * })
 * ```
 */
export class Movie extends Effect.Service<Movie>()("Movie", {
  effect: Effect.gen(function* () {
    const client = yield* MovieDbClient;

    return {
      /**
       * Get movie details
       *
       * @param request - Movie ID and optional language
       * @returns Movie details with camelCase fields
       *
       * @example
       * ```ts
       * const details = yield* movie.getDetails({ id: 550 })
       * console.log(details.originalTitle) // "Fight Club"
       * ```
       */
      getDetails: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/movie/${id}${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieDetails)),
        );
      },

      /**
       * Get movie credits (cast and crew)
       *
       * @param request - Movie ID and optional language
       * @returns Movie credits with camelCase fields
       *
       * @example
       * ```ts
       * const credits = yield* movie.getCredits({ id: 550 })
       * console.log(credits.cast[0].profilePath) // camelCase!
       * ```
       */
      getCredits: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/movie/${id}/credits${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieCredits)),
        );
      },

      /**
       * Get movie videos (trailers, teasers, clips)
       *
       * @param request - Movie ID and optional language
       * @returns Movie videos with camelCase fields
       *
       * @example
       * ```ts
       * const videos = yield* movie.getVideos({ id: 550 })
       * console.log(videos.results[0].publishedAt) // camelCase!
       * ```
       */
      getVideos: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieVideos, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/movie/${id}/videos${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieVideos)),
        );
      },

      /**
       * Get movie images (posters, backdrops, logos)
       *
       * @param request - Movie ID and optional image language filter
       * @returns Movie images with camelCase fields
       *
       * @example
       * ```ts
       * const images = yield* movie.getImages({
       *   id: 550,
       *   include_image_language: "en,null"
       * })
       * console.log(images.posters[0].filePath) // camelCase!
       * ```
       */
      getImages: (
        request: MovieImagesRequest,
      ): Effect.Effect<MovieImages, MovieDbErrors, never> => {
        const { id, language, include_image_language } = request;
        const params = new URLSearchParams();
        if (language) params.set("language", language);
        if (include_image_language) {
          params.set("include_image_language", include_image_language);
        }
        const query = params.toString();
        return client.get(`/movie/${id}/images${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieImages)),
        );
      },

      /**
       * Get movies now playing in theaters
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of now playing movies with camelCase fields
       *
       * @example
       * ```ts
       * const nowPlaying = yield* movie.getNowPlaying({ page: 1 })
       * console.log(nowPlaying.results[0].releaseDate) // camelCase!
       * ```
       */
      getNowPlaying: (
        request?: MovieListRequest,
      ): Effect.Effect<MovieListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        if (request?.region) params.set("region", request.region);
        const query = params.toString();
        return client.get(`/movie/now_playing${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieListResponse)),
        );
      },

      /**
       * Get popular movies
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of popular movies with camelCase fields
       *
       * @example
       * ```ts
       * const popular = yield* movie.getPopular({ page: 1 })
       * ```
       */
      getPopular: (
        request?: MovieListRequest,
      ): Effect.Effect<MovieListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        if (request?.region) params.set("region", request.region);
        const query = params.toString();
        return client.get(`/movie/popular${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieListResponse)),
        );
      },

      /**
       * Get top rated movies
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of top rated movies with camelCase fields
       *
       * @example
       * ```ts
       * const topRated = yield* movie.getTopRated({ page: 1 })
       * ```
       */
      getTopRated: (
        request?: MovieListRequest,
      ): Effect.Effect<MovieListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        if (request?.region) params.set("region", request.region);
        const query = params.toString();
        return client.get(`/movie/top_rated${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(MovieSchemas.MovieListResponse)),
        );
      },
    };
  }),
}) {}
