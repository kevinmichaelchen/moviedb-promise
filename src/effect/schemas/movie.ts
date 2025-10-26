/**
 * Effect Schemas for Movie API responses
 *
 * Transforms snake_case API responses to camelCase TypeScript objects
 */

import { Schema } from "effect";

/**
 * Movie details schema with camelCase fields
 */
export class MovieDetails extends Schema.Class<MovieDetails>("MovieDetails")({
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
  runtime: Schema.NullOr(Schema.Number),
  voteAverage: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_average"),
  ),
  voteCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_count"),
  ),
  popularity: Schema.Number,
  budget: Schema.Number,
  revenue: Schema.Number,
  tagline: Schema.NullOr(Schema.String),
  status: Schema.String,
  genres: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      name: Schema.String,
    }),
  ),
}) {}

/**
 * Movie cast member schema
 */
export class MovieCastMember extends Schema.Class<MovieCastMember>(
  "MovieCastMember",
)({
  id: Schema.Number,
  name: Schema.String,
  character: Schema.String,
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
  order: Schema.Number,
}) {}

/**
 * Movie crew member schema
 */
export class MovieCrewMember extends Schema.Class<MovieCrewMember>(
  "MovieCrewMember",
)({
  id: Schema.Number,
  name: Schema.String,
  job: Schema.String,
  department: Schema.String,
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
}) {}

/**
 * Movie credits schema
 */
export class MovieCredits extends Schema.Class<MovieCredits>("MovieCredits")({
  id: Schema.Number,
  cast: Schema.Array(MovieCastMember),
  crew: Schema.Array(MovieCrewMember),
}) {}

/**
 * Movie video schema
 */
export class MovieVideo extends Schema.Class<MovieVideo>("MovieVideo")({
  id: Schema.String,
  key: Schema.String,
  name: Schema.String,
  site: Schema.String,
  type: Schema.String,
  official: Schema.Boolean,
  publishedAt: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("published_at"),
  ),
}) {}

/**
 * Movie videos response schema
 */
export class MovieVideos extends Schema.Class<MovieVideos>("MovieVideos")({
  id: Schema.Number,
  results: Schema.Array(MovieVideo),
}) {}

/**
 * Movie image schema
 */
export class MovieImage extends Schema.Class<MovieImage>("MovieImage")({
  filePath: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("file_path"),
  ),
  width: Schema.Number,
  height: Schema.Number,
  voteAverage: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_average"),
  ),
  voteCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_count"),
  ),
}) {}

/**
 * Movie images response schema
 */
export class MovieImages extends Schema.Class<MovieImages>("MovieImages")({
  id: Schema.Number,
  backdrops: Schema.Array(MovieImage),
  posters: Schema.Array(MovieImage),
  logos: Schema.Array(MovieImage),
}) {}

/**
 * Movie list result schema
 */
export class MovieListResult extends Schema.Class<MovieListResult>(
  "MovieListResult",
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
}) {}

/**
 * Movie list response schema
 */
export class MovieListResponse extends Schema.Class<MovieListResponse>(
  "MovieListResponse",
)({
  page: Schema.Number,
  results: Schema.Array(MovieListResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}
