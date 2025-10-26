/**
 * TV service for TMDb API
 *
 * Provides Effect-based methods for TV show-related endpoints.
 */

import { Effect } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";

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
 * Response types
 */
export interface TvShowDetails {
  readonly id: number;
  readonly name: string;
  readonly original_name: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly first_air_date: string;
  readonly last_air_date: string;
  readonly number_of_seasons: number;
  readonly number_of_episodes: number;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly genres: ReadonlyArray<{ id: number; name: string }>;
  readonly status: string;
  readonly tagline: string | null;
  readonly type: string;
  readonly in_production: boolean;
}

export interface TvCastMember {
  readonly id: number;
  readonly name: string;
  readonly character: string;
  readonly profile_path: string | null;
  readonly order: number;
}

export interface TvCrewMember {
  readonly id: number;
  readonly name: string;
  readonly job: string;
  readonly department: string;
  readonly profile_path: string | null;
}

export interface TvCredits {
  readonly id: number;
  readonly cast: ReadonlyArray<TvCastMember>;
  readonly crew: ReadonlyArray<TvCrewMember>;
}

export interface TvVideo {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly site: string;
  readonly type: string;
  readonly official: boolean;
  readonly published_at: string;
}

export interface TvVideos {
  readonly id: number;
  readonly results: ReadonlyArray<TvVideo>;
}

export interface TvImage {
  readonly file_path: string;
  readonly width: number;
  readonly height: number;
  readonly vote_average: number;
  readonly vote_count: number;
}

export interface TvImages {
  readonly id: number;
  readonly backdrops: ReadonlyArray<TvImage>;
  readonly posters: ReadonlyArray<TvImage>;
  readonly logos: ReadonlyArray<TvImage>;
}

export interface TvShowListResult {
  readonly id: number;
  readonly name: string;
  readonly original_name: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly first_air_date: string;
  readonly vote_average: number;
  readonly vote_count: number;
}

export interface TvShowListResponse {
  readonly page: number;
  readonly results: ReadonlyArray<TvShowListResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

/**
 * TV service
 *
 * Provides methods for interacting with TMDb TV show endpoints.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const tv = yield* Tv
 *   const details = yield* tv.getDetails({ id: 1396 })
 *   console.log(details.name) // "Breaking Bad"
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
       * @returns TV show details
       *
       * @example
       * ```ts
       * const details = yield* tv.getDetails({ id: 1396 })
       * ```
       */
      getDetails: (
        request: TvIdRequest,
      ): Effect.Effect<TvShowDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<TvShowDetails>(`/tv/${id}${params}`);
      },

      /**
       * Get TV show credits (cast and crew)
       *
       * @param request - TV show ID and optional language
       * @returns TV show credits
       *
       * @example
       * ```ts
       * const credits = yield* tv.getCredits({ id: 1396 })
       * ```
       */
      getCredits: (
        request: TvIdRequest,
      ): Effect.Effect<TvCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<TvCredits>(`/tv/${id}/credits${params}`);
      },

      /**
       * Get TV show videos (trailers, teasers, clips)
       *
       * @param request - TV show ID and optional language
       * @returns TV show videos
       *
       * @example
       * ```ts
       * const videos = yield* tv.getVideos({ id: 1396 })
       * ```
       */
      getVideos: (
        request: TvIdRequest,
      ): Effect.Effect<TvVideos, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<TvVideos>(`/tv/${id}/videos${params}`);
      },

      /**
       * Get TV show images (posters, backdrops, logos)
       *
       * @param request - TV show ID and optional image language filter
       * @returns TV show images
       *
       * @example
       * ```ts
       * const images = yield* tv.getImages({
       *   id: 1396,
       *   include_image_language: "en,null"
       * })
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
        return client.get<TvImages>(
          `/tv/${id}/images${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get TV shows airing today
       *
       * @param request - Optional language, page, and timezone
       * @returns Paginated list of TV shows airing today
       *
       * @example
       * ```ts
       * const airingToday = yield* tv.getAiringToday({ page: 1 })
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
        return client.get<TvShowListResponse>(
          `/tv/airing_today${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get TV shows currently on the air
       *
       * @param request - Optional language, page, and timezone
       * @returns Paginated list of TV shows on the air
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
        return client.get<TvShowListResponse>(
          `/tv/on_the_air${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get popular TV shows
       *
       * @param request - Optional language and page
       * @returns Paginated list of popular TV shows
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
        return client.get<TvShowListResponse>(
          `/tv/popular${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get top rated TV shows
       *
       * @param request - Optional language and page
       * @returns Paginated list of top rated TV shows
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
        return client.get<TvShowListResponse>(
          `/tv/top_rated${query ? `?${query}` : ""}`,
        );
      },
    };
  }),
}) {}
