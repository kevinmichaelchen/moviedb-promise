/**
 * TV service for TMDb API
 *
 * Provides Effect-based methods for TV show-related endpoints.
 * All responses are validated and transformed from snake_case to camelCase.
 */

import { Effect, Schema } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";
import * as TvSchemas from "./schemas/tv.ts";

/**
 * Re-export schema types for external use
 */
export type TvShowDetails = typeof TvSchemas.TvShowDetails.Type;
export type TvCastMember = typeof TvSchemas.TvCastMember.Type;
export type TvCrewMember = typeof TvSchemas.TvCrewMember.Type;
export type TvCredits = typeof TvSchemas.TvCredits.Type;
export type TvVideo = typeof TvSchemas.TvVideo.Type;
export type TvVideos = typeof TvSchemas.TvVideos.Type;
export type TvImage = typeof TvSchemas.TvImage.Type;
export type TvImages = typeof TvSchemas.TvImages.Type;
export type TvShowListResult = typeof TvSchemas.TvShowListResult.Type;
export type TvShowListResponse = typeof TvSchemas.TvShowListResponse.Type;

/**
 * Common request parameters
 */
export interface TvIdRequest {
  /** TV show ID */
  readonly id: number;
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
}

export interface TvImagesRequest extends TvIdRequest {
  /** Include image language (e.g., "en,null") */
  readonly include_image_language?: string;
}

export interface TvListRequest {
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
  /** Page number */
  readonly page?: number;
  /** ISO 3166-1 region code (e.g., "US") */
  readonly timezone?: string;
}

/**
 * TV service
 *
 * Provides methods for interacting with TMDb TV show endpoints.
 * All responses are validated using Effect Schema and transformed to camelCase.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const tv = yield* Tv
 *   const details = yield* tv.getDetails({ id: 1396 })
 *   console.log(details.name) // "Breaking Bad"
 *   console.log(details.firstAirDate) // "2008-01-20" - note camelCase!
 * })
 * ```
 */
export class Tv extends Effect.Service<Tv>()("Tv", {
  effect: Effect.gen(function* () {
    const client = yield* MovieDbClient;

    return {
      /**
       * Get TV show details
       *
       * @param request - TV show ID and optional language
       * @returns TV show details with camelCase fields
       *
       * @example
       * ```ts
       * const details = yield* tv.getDetails({ id: 1396 })
       * console.log(details.originalName) // "Breaking Bad"
       * ```
       */
      getDetails: (
        request: TvIdRequest,
      ): Effect.Effect<TvShowDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/tv/${id}${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvShowDetails)),
        );
      },

      /**
       * Get TV show credits (cast and crew)
       *
       * @param request - TV show ID and optional language
       * @returns TV show credits with camelCase fields
       *
       * @example
       * ```ts
       * const credits = yield* tv.getCredits({ id: 1396 })
       * console.log(credits.cast[0].profilePath) // camelCase!
       * ```
       */
      getCredits: (
        request: TvIdRequest,
      ): Effect.Effect<TvCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/tv/${id}/credits${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvCredits)),
        );
      },

      /**
       * Get TV show videos (trailers, teasers, clips)
       *
       * @param request - TV show ID and optional language
       * @returns TV show videos with camelCase fields
       *
       * @example
       * ```ts
       * const videos = yield* tv.getVideos({ id: 1396 })
       * console.log(videos.results[0].publishedAt) // camelCase!
       * ```
       */
      getVideos: (
        request: TvIdRequest,
      ): Effect.Effect<TvVideos, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/tv/${id}/videos${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvVideos)),
        );
      },

      /**
       * Get TV show images (posters, backdrops, logos)
       *
       * @param request - TV show ID and optional image language filter
       * @returns TV show images with camelCase fields
       *
       * @example
       * ```ts
       * const images = yield* tv.getImages({
       *   id: 1396,
       *   include_image_language: "en,null"
       * })
       * console.log(images.posters[0].filePath) // camelCase!
       * ```
       */
      getImages: (
        request: TvImagesRequest,
      ): Effect.Effect<TvImages, MovieDbErrors, never> => {
        const { id, language, include_image_language } = request;
        const params = new URLSearchParams();
        if (language) params.set("language", language);
        if (include_image_language) {
          params.set("include_image_language", include_image_language);
        }
        const query = params.toString();
        return client.get(`/tv/${id}/images${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvImages)),
        );
      },

      /**
       * Get TV shows airing today
       *
       * @param request - Optional language, page, and timezone
       * @returns Paginated list of TV shows airing today with camelCase fields
       *
       * @example
       * ```ts
       * const airingToday = yield* tv.getAiringToday({ page: 1 })
       * console.log(airingToday.results[0].firstAirDate) // camelCase!
       * ```
       */
      getAiringToday: (
        request?: TvListRequest,
      ): Effect.Effect<TvShowListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        if (request?.timezone) params.set("timezone", request.timezone);
        const query = params.toString();
        return client.get(`/tv/airing_today${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvShowListResponse)),
        );
      },

      /**
       * Get TV shows currently on the air
       *
       * @param request - Optional language, page, and timezone
       * @returns Paginated list of TV shows on the air with camelCase fields
       *
       * @example
       * ```ts
       * const onTheAir = yield* tv.getOnTheAir({ page: 1 })
       * ```
       */
      getOnTheAir: (
        request?: TvListRequest,
      ): Effect.Effect<TvShowListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        if (request?.timezone) params.set("timezone", request.timezone);
        const query = params.toString();
        return client.get(`/tv/on_the_air${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvShowListResponse)),
        );
      },

      /**
       * Get popular TV shows
       *
       * @param request - Optional language and page
       * @returns Paginated list of popular TV shows with camelCase fields
       *
       * @example
       * ```ts
       * const popular = yield* tv.getPopular({ page: 1 })
       * ```
       */
      getPopular: (
        request?: TvListRequest,
      ): Effect.Effect<TvShowListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        const query = params.toString();
        return client.get(`/tv/popular${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvShowListResponse)),
        );
      },

      /**
       * Get top rated TV shows
       *
       * @param request - Optional language and page
       * @returns Paginated list of top rated TV shows with camelCase fields
       *
       * @example
       * ```ts
       * const topRated = yield* tv.getTopRated({ page: 1 })
       * ```
       */
      getTopRated: (
        request?: TvListRequest,
      ): Effect.Effect<TvShowListResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        const query = params.toString();
        return client.get(`/tv/top_rated${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(TvSchemas.TvShowListResponse)),
        );
      },
    };
  }),
}) {}
