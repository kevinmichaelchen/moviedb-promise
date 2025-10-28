/**
 * Effect Schemas for Person API responses
 *
 * Transforms snake_case API responses to camelCase TypeScript objects
 */

import { Schema } from "effect";

/**
 * Person details schema with camelCase fields
 */
export class PersonDetails extends Schema.Class<PersonDetails>(
  "PersonDetails",
)({
  id: Schema.Number,
  name: Schema.String,
  biography: Schema.String,
  birthday: Schema.NullOr(Schema.String),
  deathday: Schema.NullOr(Schema.String),
  placeOfBirth: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("place_of_birth"),
  ),
  profilePath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("profile_path"),
  ),
  knownForDepartment: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("known_for_department"),
  ),
  gender: Schema.Number,
  popularity: Schema.Number,
  alsoKnownAs: Schema.propertySignature(Schema.Array(Schema.String)).pipe(
    Schema.fromKey("also_known_as"),
  ),
  adult: Schema.Boolean,
  imdbId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("imdb_id"),
  ),
}) {}

/**
 * Movie credit cast schema
 */
export class MovieCreditCast extends Schema.Class<MovieCreditCast>(
  "MovieCreditCast",
)({
  id: Schema.Number,
  title: Schema.String,
  character: Schema.String,
  releaseDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("release_date"),
  ),
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  creditId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("credit_id"),
  ),
}) {}

/**
 * Movie credit crew schema
 */
export class MovieCreditCrew extends Schema.Class<MovieCreditCrew>(
  "MovieCreditCrew",
)({
  id: Schema.Number,
  title: Schema.String,
  job: Schema.String,
  department: Schema.String,
  releaseDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("release_date"),
  ),
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  creditId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("credit_id"),
  ),
}) {}

/**
 * Person movie credits schema
 */
export class PersonMovieCredits extends Schema.Class<PersonMovieCredits>(
  "PersonMovieCredits",
)({
  id: Schema.Number,
  cast: Schema.Array(MovieCreditCast),
  crew: Schema.Array(MovieCreditCrew),
}) {}

/**
 * TV credit cast schema
 */
export class TvCreditCast extends Schema.Class<TvCreditCast>("TvCreditCast")({
  id: Schema.Number,
  name: Schema.String,
  character: Schema.String,
  firstAirDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("first_air_date"),
  ),
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  creditId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("credit_id"),
  ),
}) {}

/**
 * TV credit crew schema
 */
export class TvCreditCrew extends Schema.Class<TvCreditCrew>("TvCreditCrew")({
  id: Schema.Number,
  name: Schema.String,
  job: Schema.String,
  department: Schema.String,
  firstAirDate: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("first_air_date"),
  ),
  posterPath: Schema.propertySignature(Schema.NullOr(Schema.String)).pipe(
    Schema.fromKey("poster_path"),
  ),
  creditId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("credit_id"),
  ),
}) {}

/**
 * Person TV credits schema
 */
export class PersonTvCredits extends Schema.Class<PersonTvCredits>(
  "PersonTvCredits",
)({
  id: Schema.Number,
  cast: Schema.Array(TvCreditCast),
  crew: Schema.Array(TvCreditCrew),
}) {}

/**
 * Combined credit cast schema (with media_type)
 */
const CombinedCreditCastMovie = Schema.Struct({
  ...MovieCreditCast.fields,
  mediaType: Schema.propertySignature(Schema.Literal("movie")).pipe(
    Schema.fromKey("media_type"),
  ),
});

const CombinedCreditCastTv = Schema.Struct({
  ...TvCreditCast.fields,
  mediaType: Schema.propertySignature(Schema.Literal("tv")).pipe(
    Schema.fromKey("media_type"),
  ),
});

export const CombinedCreditCast = Schema.Union(
  CombinedCreditCastMovie,
  CombinedCreditCastTv,
);
export type CombinedCreditCast = Schema.Schema.Type<
  typeof CombinedCreditCast
>;

/**
 * Combined credit crew schema (with media_type)
 */
const CombinedCreditCrewMovie = Schema.Struct({
  ...MovieCreditCrew.fields,
  mediaType: Schema.propertySignature(Schema.Literal("movie")).pipe(
    Schema.fromKey("media_type"),
  ),
});

const CombinedCreditCrewTv = Schema.Struct({
  ...TvCreditCrew.fields,
  mediaType: Schema.propertySignature(Schema.Literal("tv")).pipe(
    Schema.fromKey("media_type"),
  ),
});

export const CombinedCreditCrew = Schema.Union(
  CombinedCreditCrewMovie,
  CombinedCreditCrewTv,
);
export type CombinedCreditCrew = Schema.Schema.Type<
  typeof CombinedCreditCrew
>;

/**
 * Person combined credits schema
 */
export class PersonCombinedCredits extends Schema.Class<PersonCombinedCredits>(
  "PersonCombinedCredits",
)({
  id: Schema.Number,
  cast: Schema.Array(CombinedCreditCast),
  crew: Schema.Array(CombinedCreditCrew),
}) {}

/**
 * Person image schema
 */
export class PersonImage extends Schema.Class<PersonImage>("PersonImage")({
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
 * Person images response schema
 */
export class PersonImages extends Schema.Class<PersonImages>("PersonImages")({
  id: Schema.Number,
  profiles: Schema.Array(PersonImage),
}) {}

/**
 * Person popular result schema
 */
export class PersonPopularResult extends Schema.Class<PersonPopularResult>(
  "PersonPopularResult",
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
  adult: Schema.Boolean,
  knownFor: Schema.propertySignature(
    Schema.Array(
      Schema.Struct({
        id: Schema.Number,
        mediaType: Schema.propertySignature(
          Schema.Union(Schema.Literal("movie"), Schema.Literal("tv")),
        ).pipe(Schema.fromKey("media_type")),
        title: Schema.optional(Schema.String),
        name: Schema.optional(Schema.String),
      }),
    ),
  ).pipe(Schema.fromKey("known_for")),
}) {}

/**
 * Person popular response schema
 */
export class PersonPopularResponse extends Schema.Class<PersonPopularResponse>(
  "PersonPopularResponse",
)({
  page: Schema.Number,
  results: Schema.Array(PersonPopularResult),
  totalPages: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_pages"),
  ),
  totalResults: Schema.propertySignature(Schema.Number).pipe(
    Schema.fromKey("total_results"),
  ),
}) {}
