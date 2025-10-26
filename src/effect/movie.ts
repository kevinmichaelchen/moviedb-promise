/**
 * Movie service for TMDb API
 *
 * Provides Effect-based methods for movie-related endpoints.
 */

import { Effect } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";

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
 * Response types
 */
export interface MovieDetails {
  readonly id: number;
  readonly title: string;
  readonly original_title: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly release_date: string;
  readonly runtime: number | null;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly genres: ReadonlyArray<{ id: number; name: string }>;
  readonly status: string;
  readonly tagline: string | null;
}

export interface CastMember {
  readonly id: number;
  readonly name: string;
  readonly character: string;
  readonly profile_path: string | null;
  readonly order: number;
}

export interface CrewMember {
  readonly id: number;
  readonly name: string;
  readonly job: string;
  readonly department: string;
  readonly profile_path: string | null;
}

export interface MovieCredits {
  readonly id: number;
  readonly cast: ReadonlyArray<CastMember>;
  readonly crew: ReadonlyArray<CrewMember>;
}

export interface Video {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly site: string;
  readonly type: string;
  readonly official: boolean;
  readonly published_at: string;
}

export interface MovieVideos {
  readonly id: number;
  readonly results: ReadonlyArray<Video>;
}

export interface MovieImage {
  readonly file_path: string;
  readonly width: number;
  readonly height: number;
  readonly vote_average: number;
  readonly vote_count: number;
}

export interface MovieImages {
  readonly id: number;
  readonly backdrops: ReadonlyArray<MovieImage>;
  readonly posters: ReadonlyArray<MovieImage>;
  readonly logos: ReadonlyArray<MovieImage>;
}

export interface MovieListResult {
  readonly id: number;
  readonly title: string;
  readonly original_title: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly release_date: string;
  readonly vote_average: number;
  readonly vote_count: number;
}

export interface MovieListResponse {
  readonly page: number;
  readonly results: ReadonlyArray<MovieListResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

/**
 * Movie service
 *
 * Provides methods for interacting with TMDb movie endpoints.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const movie = yield* Movie
 *   const details = yield* movie.getDetails({ id: 550 })
 *   console.log(details.title) // "Fight Club"
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
       * @returns Movie details
       *
       * @example
       * ```ts
       * const details = yield* movie.getDetails({ id: 550 })
       * ```
       */
      getDetails: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<MovieDetails>(`/movie/${id}${params}`);
      },

      /**
       * Get movie credits (cast and crew)
       *
       * @param request - Movie ID and optional language
       * @returns Movie credits
       *
       * @example
       * ```ts
       * const credits = yield* movie.getCredits({ id: 550 })
       * ```
       */
      getCredits: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<MovieCredits>(`/movie/${id}/credits${params}`);
      },

      /**
       * Get movie videos (trailers, teasers, clips)
       *
       * @param request - Movie ID and optional language
       * @returns Movie videos
       *
       * @example
       * ```ts
       * const videos = yield* movie.getVideos({ id: 550 })
       * ```
       */
      getVideos: (
        request: MovieIdRequest,
      ): Effect.Effect<MovieVideos, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<MovieVideos>(`/movie/${id}/videos${params}`);
      },

      /**
       * Get movie images (posters, backdrops, logos)
       *
       * @param request - Movie ID and optional image language filter
       * @returns Movie images
       *
       * @example
       * ```ts
       * const images = yield* movie.getImages({
       *   id: 550,
       *   include_image_language: "en,null"
       * })
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
        return client.get<MovieImages>(
          `/movie/${id}/images${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get now playing movies
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of now playing movies
       *
       * @example
       * ```ts
       * const nowPlaying = yield* movie.getNowPlaying({ page: 1 })
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
        return client.get<MovieListResponse>(
          `/movie/now_playing${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get popular movies
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of popular movies
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
        return client.get<MovieListResponse>(
          `/movie/popular${query ? `?${query}` : ""}`,
        );
      },

      /**
       * Get top rated movies
       *
       * @param request - Optional language, page, and region
       * @returns Paginated list of top rated movies
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
        return client.get<MovieListResponse>(
          `/movie/top_rated${query ? `?${query}` : ""}`,
        );
      },
    };
  }),
}) {}
