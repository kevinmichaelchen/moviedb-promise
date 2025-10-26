/**
 * Effect Schemas for TV API responses
 *
 * Transforms snake_case API responses to camelCase TypeScript objects
 */

import { Schema } from "effect";

/**
 * TV show details schema with camelCase fields
 */
export class TvShowDetails extends Schema.Class<TvShowDetails>(
  "TvShowDetails",
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
  lastAirDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("last_air_date"),
  ),
  numberOfSeasons: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("number_of_seasons"),
  ),
  numberOfEpisodes: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("number_of_episodes"),
  ),
  voteAverage: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_average"),
  ),
  voteCount: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("vote_count"),
  ),
  genres: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      name: Schema.String,
    }),
  ),
  status: Schema.String,
  tagline: Schema.NullOr(Schema.String),
  type: Schema.String,
  inProduction: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.fromKey("in_production"),
  ),
}) {}

/**
 * TV cast member schema
 */
export class TvCastMember extends Schema.Class<TvCastMember>("TvCastMember")({
  id: Schema.Number,
  name: Schema.String,
  character: Schema.String,
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
  order: Schema.Number,
}) {}

/**
 * TV crew member schema
 */
export class TvCrewMember extends Schema.Class<TvCrewMember>("TvCrewMember")({
  id: Schema.Number,
  name: Schema.String,
  job: Schema.String,
  department: Schema.String,
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
}) {}

/**
 * TV credits schema
 */
export class TvCredits extends Schema.Class<TvCredits>("TvCredits")({
  id: Schema.Number,
  cast: Schema.Array(TvCastMember),
  crew: Schema.Array(TvCrewMember),
}) {}

/**
 * TV video schema
 */
export class TvVideo extends Schema.Class<TvVideo>("TvVideo")({
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
 * TV videos response schema
 */
export class TvVideos extends Schema.Class<TvVideos>("TvVideos")({
  id: Schema.Number,
  results: Schema.Array(TvVideo),
}) {}

/**
 * TV image schema
 */
export class TvImage extends Schema.Class<TvImage>("TvImage")({
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
 * TV images response schema
 */
export class TvImages extends Schema.Class<TvImages>("TvImages")({
  id: Schema.Number,
  backdrops: Schema.Array(TvImage),
  posters: Schema.Array(TvImage),
  logos: Schema.Array(TvImage),
}) {}

/**
 * TV show list result schema
 */
export class TvShowListResult extends Schema.Class<TvShowListResult>(
  "TvShowListResult",
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
}) {}

/**
 * TV show list response schema
 */
export class TvShowListResponse extends Schema.Class<TvShowListResponse>(
  "TvShowListResponse",
)({
  page: Schema.Number,
  results: Schema.Array(TvShowListResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}
