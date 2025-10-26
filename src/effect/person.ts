/**
 * Person service for TMDb API
 *
 * Provides Effect-based methods for person-related endpoints.
 */

import { Effect } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";

/**
 * Common request parameters
 */
export interface PersonIdRequest {
  /** Person ID */
  readonly id: number;
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
}

export interface PersonPopularRequest {
  /** ISO 639-1 language code (e.g., "en-US") */
  readonly language?: string;
  /** Page number */
  readonly page?: number;
}

/**
 * Response types
 */
export interface PersonDetails {
  readonly id: number;
  readonly name: string;
  readonly biography: string;
  readonly birthday: string | null;
  readonly deathday: string | null;
  readonly place_of_birth: string | null;
  readonly profile_path: string | null;
  readonly known_for_department: string;
  readonly gender: number;
  readonly popularity: number;
  readonly also_known_as: ReadonlyArray<string>;
  readonly adult: boolean;
  readonly imdb_id: string;
}

export interface MovieCreditCast {
  readonly id: number;
  readonly title: string;
  readonly character: string;
  readonly release_date: string;
  readonly poster_path: string | null;
  readonly credit_id: string;
}

export interface MovieCreditCrew {
  readonly id: number;
  readonly title: string;
  readonly job: string;
  readonly department: string;
  readonly release_date: string;
  readonly poster_path: string | null;
  readonly credit_id: string;
}

export interface PersonMovieCredits {
  readonly id: number;
  readonly cast: ReadonlyArray<MovieCreditCast>;
  readonly crew: ReadonlyArray<MovieCreditCrew>;
}

export interface TvCreditCast {
  readonly id: number;
  readonly name: string;
  readonly character: string;
  readonly first_air_date: string;
  readonly poster_path: string | null;
  readonly credit_id: string;
}

export interface TvCreditCrew {
  readonly id: number;
  readonly name: string;
  readonly job: string;
  readonly department: string;
  readonly first_air_date: string;
  readonly poster_path: string | null;
  readonly credit_id: string;
}

export interface PersonTvCredits {
  readonly id: number;
  readonly cast: ReadonlyArray<TvCreditCast>;
  readonly crew: ReadonlyArray<TvCreditCrew>;
}

export type CombinedCreditCast = (MovieCreditCast | TvCreditCast) & {
  readonly media_type: "movie" | "tv";
};

export type CombinedCreditCrew = (MovieCreditCrew | TvCreditCrew) & {
  readonly media_type: "movie" | "tv";
};

export interface PersonCombinedCredits {
  readonly id: number;
  readonly cast: ReadonlyArray<CombinedCreditCast>;
  readonly crew: ReadonlyArray<CombinedCreditCrew>;
}

export interface PersonImage {
  readonly file_path: string;
  readonly width: number;
  readonly height: number;
  readonly vote_average: number;
  readonly vote_count: number;
}

export interface PersonImages {
  readonly id: number;
  readonly profiles: ReadonlyArray<PersonImage>;
}

export interface PersonPopularResult {
  readonly id: number;
  readonly name: string;
  readonly profile_path: string | null;
  readonly known_for_department: string;
  readonly popularity: number;
  readonly adult: boolean;
  readonly known_for: ReadonlyArray<{
    readonly id: number;
    readonly media_type: "movie" | "tv";
    readonly title?: string;
    readonly name?: string;
  }>;
}

export interface PersonPopularResponse {
  readonly page: number;
  readonly results: ReadonlyArray<PersonPopularResult>;
  readonly total_pages: number;
  readonly total_results: number;
}

/**
 * Person service
 *
 * Provides methods for interacting with TMDb person endpoints.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const person = yield* Person
 *   const details = yield* person.getDetails({ id: 287 })
 *   console.log(details.name) // "Brad Pitt"
 * })
 * ```
 */
export class Person extends Effect.Service<Person>()("Person", {
  effect: Effect.gen(function* () {
    const client = yield* MovieDbClient;

    return {
      /**
       * Get person details
       *
       * @param request - Person ID and optional language
       * @returns Person details
       *
       * @example
       * ```ts
       * const details = yield* person.getDetails({ id: 287 })
       * ```
       */
      getDetails: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<PersonDetails>(`/person/${id}${params}`);
      },

      /**
       * Get person movie credits (cast and crew)
       *
       * @param request - Person ID and optional language
       * @returns Person's movie credits
       *
       * @example
       * ```ts
       * const credits = yield* person.getMovieCredits({ id: 287 })
       * ```
       */
      getMovieCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonMovieCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<PersonMovieCredits>(
          `/person/${id}/movie_credits${params}`,
        );
      },

      /**
       * Get person TV credits (cast and crew)
       *
       * @param request - Person ID and optional language
       * @returns Person's TV credits
       *
       * @example
       * ```ts
       * const credits = yield* person.getTvCredits({ id: 287 })
       * ```
       */
      getTvCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonTvCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<PersonTvCredits>(
          `/person/${id}/tv_credits${params}`,
        );
      },

      /**
       * Get person combined movie and TV credits
       *
       * @param request - Person ID and optional language
       * @returns Person's combined credits
       *
       * @example
       * ```ts
       * const credits = yield* person.getCombinedCredits({ id: 287 })
       * ```
       */
      getCombinedCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonCombinedCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get<PersonCombinedCredits>(
          `/person/${id}/combined_credits${params}`,
        );
      },

      /**
       * Get person images (profile photos)
       *
       * @param request - Person ID
       * @returns Person's images
       *
       * @example
       * ```ts
       * const images = yield* person.getImages({ id: 287 })
       * ```
       */
      getImages: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonImages, MovieDbErrors, never> => {
        const { id } = request;
        return client.get<PersonImages>(`/person/${id}/images`);
      },

      /**
       * Get popular people
       *
       * @param request - Optional language and page
       * @returns Paginated list of popular people
       *
       * @example
       * ```ts
       * const popular = yield* person.getPopular({ page: 1 })
       * ```
       */
      getPopular: (
        request?: PersonPopularRequest,
      ): Effect.Effect<PersonPopularResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        const query = params.toString();
        return client.get<PersonPopularResponse>(
          `/person/popular${query ? `?${query}` : ""}`,
        );
      },
    };
  }),
}) {}
