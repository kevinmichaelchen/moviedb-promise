/**
 * Person service for TMDb API
 *
 * Provides Effect-based methods for person-related endpoints.
 * All responses are validated and transformed from snake_case to camelCase.
 */

import { Effect, Schema, Stream } from "effect";
import { MovieDbClient } from "./client.ts";
import type { MovieDbErrors } from "./errors.ts";
import * as PersonSchemas from "./schemas/person.ts";
import { paginatedStream, type PaginationOptions } from "./streaming.ts";

/**
 * Re-export schema types for external use
 */
export type PersonDetails = typeof PersonSchemas.PersonDetails.Type;
export type MovieCreditCast = typeof PersonSchemas.MovieCreditCast.Type;
export type MovieCreditCrew = typeof PersonSchemas.MovieCreditCrew.Type;
export type PersonMovieCredits = typeof PersonSchemas.PersonMovieCredits.Type;
export type TvCreditCast = typeof PersonSchemas.TvCreditCast.Type;
export type TvCreditCrew = typeof PersonSchemas.TvCreditCrew.Type;
export type PersonTvCredits = typeof PersonSchemas.PersonTvCredits.Type;
export type CombinedCreditCast = PersonSchemas.CombinedCreditCast;
export type CombinedCreditCrew = PersonSchemas.CombinedCreditCrew;
export type PersonCombinedCredits =
  typeof PersonSchemas.PersonCombinedCredits.Type;
export type PersonImage = typeof PersonSchemas.PersonImage.Type;
export type PersonImages = typeof PersonSchemas.PersonImages.Type;
export type PersonPopularResult = typeof PersonSchemas.PersonPopularResult.Type;
export type PersonPopularResponse =
  typeof PersonSchemas.PersonPopularResponse.Type;

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
 * Person service
 *
 * Provides methods for interacting with TMDb person endpoints.
 * All responses are validated using Effect Schema and transformed to camelCase.
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const person = yield* Person
 *   const details = yield* person.getDetails({ id: 287 })
 *   console.log(details.name) // "Brad Pitt"
 *   console.log(details.placeOfBirth) // "Shawnee, Oklahoma, USA" - note camelCase!
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
       * @returns Person details with camelCase fields
       *
       * @example
       * ```ts
       * const details = yield* person.getDetails({ id: 287 })
       * console.log(details.knownForDepartment) // camelCase!
       * ```
       */
      getDetails: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonDetails, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/person/${id}${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonDetails)),
        );
      },

      /**
       * Get person movie credits (cast and crew)
       *
       * @param request - Person ID and optional language
       * @returns Person's movie credits with camelCase fields
       *
       * @example
       * ```ts
       * const credits = yield* person.getMovieCredits({ id: 287 })
       * console.log(credits.cast[0].releaseDate) // camelCase!
       * ```
       */
      getMovieCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonMovieCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/person/${id}/movie_credits${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonMovieCredits)),
        );
      },

      /**
       * Get person TV credits (cast and crew)
       *
       * @param request - Person ID and optional language
       * @returns Person's TV credits with camelCase fields
       *
       * @example
       * ```ts
       * const credits = yield* person.getTvCredits({ id: 287 })
       * console.log(credits.cast[0].firstAirDate) // camelCase!
       * ```
       */
      getTvCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonTvCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/person/${id}/tv_credits${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonTvCredits)),
        );
      },

      /**
       * Get person combined movie and TV credits
       *
       * @param request - Person ID and optional language
       * @returns Person's combined credits with camelCase fields
       *
       * @example
       * ```ts
       * const credits = yield* person.getCombinedCredits({ id: 287 })
       * // Each credit has a mediaType field to discriminate between movie and TV
       * console.log(credits.cast[0].mediaType) // "movie" or "tv"
       * ```
       */
      getCombinedCredits: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonCombinedCredits, MovieDbErrors, never> => {
        const { id, language } = request;
        const params = language ? `?language=${language}` : "";
        return client.get(`/person/${id}/combined_credits${params}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonCombinedCredits)),
        );
      },

      /**
       * Get person images (profile photos)
       *
       * @param request - Person ID
       * @returns Person's images with camelCase fields
       *
       * @example
       * ```ts
       * const images = yield* person.getImages({ id: 287 })
       * console.log(images.profiles[0].filePath) // camelCase!
       * ```
       */
      getImages: (
        request: PersonIdRequest,
      ): Effect.Effect<PersonImages, MovieDbErrors, never> => {
        const { id } = request;
        return client.get(`/person/${id}/images`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonImages)),
        );
      },

      /**
       * Get popular people
       *
       * @param request - Optional language and page
       * @returns Paginated list of popular people with camelCase fields
       *
       * @example
       * ```ts
       * const popular = yield* person.getPopular({ page: 1 })
       * console.log(popular.results[0].knownForDepartment) // camelCase!
       * ```
       */
      getPopular: (
        request?: PersonPopularRequest,
      ): Effect.Effect<PersonPopularResponse, MovieDbErrors, never> => {
        const params = new URLSearchParams();
        if (request?.language) params.set("language", request.language);
        if (request?.page) params.set("page", String(request.page));
        const query = params.toString();
        return client.get(`/person/popular${query ? `?${query}` : ""}`).pipe(
          Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonPopularResponse)),
        );
      },

      /**
       * Stream popular people across all pages
       *
       * @param request - Optional language
       * @param options - Pagination options
       * @returns Stream of popular people
       */
      streamPopular: (
        request?: Omit<PersonPopularRequest, "page">,
        options?: PaginationOptions,
      ): Stream.Stream<PersonPopularResult, MovieDbErrors, never> =>
        paginatedStream(
          (page) => {
            const params = new URLSearchParams();
            if (request?.language) params.set("language", request.language);
            params.set("page", String(page));
            const query = params.toString();
            return client.get(`/person/popular${query ? `?${query}` : ""}`).pipe(
              Effect.flatMap(Schema.decodeUnknown(PersonSchemas.PersonPopularResponse)),
              Effect.withSpan("person.stream.popular", {
                attributes: { "pagination.page": page },
              }),
            );
          },
          options,
        ),
    };
  }),
}) {}
