/**
 * Tests for Person service
 */

import { assertEquals } from "@std/assert";
import { NodeHttpClient } from "@effect/platform-node";
import { Effect } from "effect";
import { Person } from "../../src/effect/person.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import {
  makeTestConfig,
  MockRateLimiter,
} from "../../src/effect/test-layers.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

const REAL_API_KEY = Deno.env.get("MOVIEDB_API_KEY");

// Brad Pitt ID for testing
const BRAD_PITT_ID = 287;

Deno.test({
  name: "Person - getDetails returns person information",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const details = yield* person.getDetails({ id: BRAD_PITT_ID });

      // Verify Brad Pitt metadata
      assertEquals(details.id, BRAD_PITT_ID);
      assertEquals(details.name, "Brad Pitt");
      assertEquals(details.birthday, "1963-12-18");
      assertEquals(details.placeOfBirth, "Shawnee, Oklahoma, USA");
      assertEquals(details.knownForDepartment, "Acting");
      assertEquals(details.gender, 2); // Male

      // Verify biography exists
      assertEquals(typeof details.biography, "string");
      assertEquals(details.biography.length > 0, true);

      // Verify IMDb ID
      assertEquals(details.imdbId, "nm0000093");

      // Verify popularity
      assertEquals(typeof details.popularity, "number");
      assertEquals(details.popularity > 0, true);
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Person - getMovieCredits returns cast and crew roles",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const credits = yield* person.getMovieCredits({ id: BRAD_PITT_ID });

      // Verify we got valid credits data
      assertEquals(credits.id, BRAD_PITT_ID);
      assertEquals(Array.isArray(credits.cast), true);
      assertEquals(Array.isArray(credits.crew), true);
      assertEquals(credits.cast.length > 0, true);

      // Verify Fight Club is in the cast
      const fightClub = credits.cast.find((c) =>
        c.title === "Fight Club" && c.character === "Tyler Durden"
      );
      assertEquals(
        fightClub !== undefined,
        true,
        "Brad Pitt should have played Tyler Durden in Fight Club",
      );
      assertEquals(fightClub?.id, 550);

      // Verify Ocean's Eleven is in the cast
      const oceansEleven = credits.cast.find((c) =>
        c.title === "Ocean's Eleven"
      );
      assertEquals(
        oceansEleven !== undefined,
        true,
        "Brad Pitt should be in Ocean's Eleven",
      );

      // Verify crew credits exist (if any)
      if (credits.crew.length > 0) {
        const firstCrew = credits.crew[0];
        assertEquals(typeof firstCrew.job, "string");
        assertEquals(typeof firstCrew.department, "string");
      }
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Person - getTvCredits returns TV show roles",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const credits = yield* person.getTvCredits({ id: BRAD_PITT_ID });

      // Verify we got valid TV credits data
      assertEquals(credits.id, BRAD_PITT_ID);
      assertEquals(Array.isArray(credits.cast), true);
      assertEquals(Array.isArray(credits.crew), true);

      // Brad Pitt has appeared in TV shows
      if (credits.cast.length > 0) {
        const firstCredit = credits.cast[0];
        assertEquals(typeof firstCredit.id, "number");
        assertEquals(typeof firstCredit.name, "string");
        assertEquals(typeof firstCredit.character, "string");
      }
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Person - getCombinedCredits returns both movie and TV credits",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const credits = yield* person.getCombinedCredits({ id: BRAD_PITT_ID });

      // Verify we got valid combined credits data
      assertEquals(credits.id, BRAD_PITT_ID);
      assertEquals(Array.isArray(credits.cast), true);
      assertEquals(Array.isArray(credits.crew), true);
      assertEquals(credits.cast.length > 0, true);

      // Verify Fight Club is in combined credits with media_type
      const fightClub = credits.cast.find((c) =>
        "title" in c && c.title === "Fight Club"
      );
      assertEquals(
        fightClub !== undefined,
        true,
        "Fight Club should be in combined credits",
      );
      assertEquals(fightClub?.mediaType, "movie");

      // Verify we have media_type for all credits
      credits.cast.forEach((credit) => {
        assertEquals(
          credit.mediaType === "movie" || credit.mediaType === "tv",
          true,
          "Each credit should have media_type",
        );
      });

      // Verify movie credits have title
      const movieCredits = credits.cast.filter((c) => c.mediaType === "movie");
      if (movieCredits.length > 0) {
        movieCredits.forEach((credit) => {
          assertEquals("title" in credit, true);
        });
      }

      // Verify TV credits have name
      const tvCredits = credits.cast.filter((c) => c.mediaType === "tv");
      if (tvCredits.length > 0) {
        tvCredits.forEach((credit) => {
          assertEquals("name" in credit, true);
        });
      }
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Person - getImages returns profile photos",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const images = yield* person.getImages({ id: BRAD_PITT_ID });

      // Verify we got valid images data
      assertEquals(images.id, BRAD_PITT_ID);
      assertEquals(Array.isArray(images.profiles), true);
      assertEquals(images.profiles.length > 0, true);

      // Verify first image has required fields
      const firstImage = images.profiles[0];
      assertEquals(typeof firstImage.filePath, "string");
      assertEquals(typeof firstImage.width, "number");
      assertEquals(typeof firstImage.height, "number");
      assertEquals(firstImage.width > 0, true);
      assertEquals(firstImage.height > 0, true);
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test({
  name: "Person - getPopular returns paginated results",
  ignore: !REAL_API_KEY,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const program = Effect.gen(function* () {
      const person = yield* Person;

      const popular = yield* person.getPopular({ page: 1 });

      // Verify pagination structure
      assertEquals(typeof popular.page, "number");
      assertEquals(typeof popular.totalPages, "number");
      assertEquals(typeof popular.totalResults, "number");
      assertEquals(Array.isArray(popular.results), true);
      assertEquals(popular.results.length > 0, true);

      // Verify first person has required fields
      const firstPerson = popular.results[0];
      assertEquals(typeof firstPerson.id, "number");
      assertEquals(typeof firstPerson.name, "string");
      assertEquals(typeof firstPerson.knownForDepartment, "string");
      assertEquals(typeof firstPerson.popularity, "number");
      assertEquals(firstPerson.popularity > 0, true);

      // Verify knownFor exists and has entries
      if (firstPerson.knownFor) {
        assertEquals(Array.isArray(firstPerson.knownFor), true);
        if (firstPerson.knownFor.length > 0) {
          const firstKnownFor = firstPerson.knownFor[0];
          assertEquals(typeof firstKnownFor.id, "number");
          assertEquals(
            firstKnownFor.mediaType === "movie" ||
              firstKnownFor.mediaType === "tv",
            true,
          );
        }
      }
    }).pipe(
      Effect.provide(Person.Default),
      Effect.provide(MovieDbClient.Default),
      Effect.provide(RateLimiterLive),
      Effect.provide(NodeHttpClient.layerUndici),
      Effect.provide(makeTestConfig({ apiKey: REAL_API_KEY! })),
      Effect.scoped,
    );

    await Effect.runPromise(program);
  },
});

Deno.test("Person - service is accessible via Effect.Service", async () => {
  const program = Effect.gen(function* () {
    const person = yield* Person;

    // Verify service methods exist
    assertEquals(typeof person.getDetails, "function");
    assertEquals(typeof person.getMovieCredits, "function");
    assertEquals(typeof person.getTvCredits, "function");
    assertEquals(typeof person.getCombinedCredits, "function");
    assertEquals(typeof person.getImages, "function");
    assertEquals(typeof person.getPopular, "function");
  }).pipe(
    Effect.provide(Person.Default),
    Effect.provide(MovieDbClient.Default),
    Effect.provide(MockRateLimiter),
    Effect.provide(NodeHttpClient.layerUndici),
    Effect.provide(makeTestConfig()),
  );

  await Effect.runPromise(program);
});
