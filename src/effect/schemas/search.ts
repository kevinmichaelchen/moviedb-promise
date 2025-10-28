/**
 * Effect Schemas for Search API responses
 *
 * Transforms snake_case API responses to camelCase TypeScript objects
 */

import { Schema } from "effect";

/**
 * Movie search result schema
 */
export class MovieSearchResult extends Schema.Class<MovieSearchResult>(
  "MovieSearchResult",
)({
  id: Schema.Number,
  title: Schema.String,
  originalTitle: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("original_title"),
  ),
  overview: Schema.String,
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  backdropPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("backdrop_path"),
  ),
  releaseDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("release_date"),
  ),
  voteAverage: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_average"),
  ),
  voteCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_count"),
  ),
  popularity: Schema.Number,
  mediaType: Schema.optional(Schema.Literal("movie")).pipe(
    Schema.fromKey("media_type"),
  ),
}) {}

/**
 * TV search result schema
 */
export class TvSearchResult extends Schema.Class<TvSearchResult>(
  "TvSearchResult",
)({
  id: Schema.Number,
  name: Schema.String,
  originalName: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("original_name"),
  ),
  overview: Schema.String,
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  backdropPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("backdrop_path"),
  ),
  firstAirDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("first_air_date"),
  ),
  voteAverage: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_average"),
  ),
  voteCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_count"),
  ),
  popularity: Schema.Number,
  mediaType: Schema.optional(Schema.Literal("tv")).pipe(
    Schema.fromKey("media_type"),
  ),
}) {}

/**
 * Person search result schema
 */
export class PersonSearchResult extends Schema.Class<PersonSearchResult>(
  "PersonSearchResult",
)({
  id: Schema.Number,
  name: Schema.String,
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
  knownForDepartment: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("known_for_department"),
  ),
  popularity: Schema.Number,
  mediaType: Schema.optional(Schema.Literal("person")).pipe(
    Schema.fromKey("media_type"),
  ),
  knownFor: Schema.optional(
    Schema.Array(Schema.Union(MovieSearchResult, TvSearchResult)),
  ).pipe(Schema.fromKey("known_for")),
}) {}

/**
 * Multi-search result union
 */
export const MultiSearchResult = Schema.Union(
  MovieSearchResult,
  TvSearchResult,
  PersonSearchResult,
);
export type MultiSearchResult = Schema.Schema.Type<typeof MultiSearchResult>;

/**
 * Search movie response schema
 */
export class SearchMovieResponse extends Schema.Class<SearchMovieResponse>(
  "SearchMovieResponse",
)({
  page: Schema.Number,
  results: Schema.Array(MovieSearchResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}

/**
 * Search TV response schema
 */
export class SearchTvResponse extends Schema.Class<SearchTvResponse>(
  "SearchTvResponse",
)({
  page: Schema.Number,
  results: Schema.Array(TvSearchResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}

/**
 * Search person response schema
 */
export class SearchPersonResponse extends Schema.Class<SearchPersonResponse>(
  "SearchPersonResponse",
)({
  page: Schema.Number,
  results: Schema.Array(PersonSearchResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}

/**
 * Search multi response schema
 */
export class SearchMultiResponse extends Schema.Class<SearchMultiResponse>(
  "SearchMultiResponse",
)({
  page: Schema.Number,
  results: Schema.Array(MultiSearchResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}
