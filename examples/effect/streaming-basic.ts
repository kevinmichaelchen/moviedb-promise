/**
 * Example: Basic Streaming Pagination
 *
 * Simple examples demonstrating common streaming patterns for TMDb API.
 *
 * Run with:
 * ```
 * MOVIEDB_API_KEY=your_key deno run --allow-env --allow-net examples/effect/streaming-basic.ts
 * ```
 */

import { NodeHttpClient } from "@effect/platform-node";
import { Console, Effect, Layer, Stream } from "effect";
import { Movie } from "../../src/effect/movie.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import { MovieDbConfig } from "../../src/effect/config.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

/**
 * Example 1: Get first N results
 *
 * The simplest use case - fetch a specific number of items
 * without worrying about pages.
 */
const example1 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 1: Get First 10 Movies ===");

  const movie = yield* Movie;

  // Stream.take(10) automatically fetches only what's needed
  const movies = yield* movie.streamPopular().pipe(
    Stream.take(10),
    Stream.runCollect,
  );

  yield* Console.log(`✓ Fetched ${movies.length} movies`);
  yield* Console.log(`  First: ${Array.from(movies)[0].title}`);
});

/**
 * Example 2: Limit by pages
 *
 * Control exactly how many pages to fetch.
 * Useful when you want consistent pagination.
 */
const example2 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 2: Fetch 2 Pages ===");

  const movie = yield* Movie;

  // maxPages: 2 fetches exactly 2 pages (typically 40 movies)
  const movies = yield* movie.streamPopular({}, { maxPages: 2 }).pipe(
    Stream.runCollect,
  );

  yield* Console.log(`✓ Fetched ${movies.length} movies from 2 pages`);
});

/**
 * Example 3: Stop when condition is met
 *
 * Stream automatically stops when you find what you need.
 * Very efficient - no unnecessary API calls.
 */
const example3 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 3: Find First Highly Rated Movie ===");

  const movie = yield* Movie;

  // Stream stops as soon as we find a match
  const highlyRated = yield* movie.streamPopular().pipe(
    Stream.filter((m) => m.voteAverage > 8.5),
    Stream.take(1), // Just get the first match
    Stream.runCollect,
  );

  const found = Array.from(highlyRated)[0];
  if (found) {
    yield* Console.log(`✓ Found: ${found.title} (rating: ${found.voteAverage})`);
  }
});

/**
 * Example 4: Transform while streaming
 *
 * Extract just the data you need - more memory efficient
 * than fetching everything then mapping.
 */
const example4 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 4: Extract Movie Titles ===");

  const movie = yield* Movie;

  // Stream.map transforms each item as it arrives
  const titles = yield* movie.streamTopRated({}, { maxResults: 20 }).pipe(
    Stream.map((m) => m.title),
    Stream.runCollect,
  );

  yield* Console.log(`✓ Extracted ${titles.length} titles`);
  yield* Console.log(`  Examples: ${Array.from(titles).slice(0, 3).join(", ")}...`);
});

// Create config layer from environment
const makeConfigLayer = () => {
  const apiKey = Deno.env.get("MOVIEDB_API_KEY");

  if (!apiKey) {
    throw new Error("Please set MOVIEDB_API_KEY environment variable");
  }

  return Layer.succeed(MovieDbConfig, {
    apiKey,
    baseUrl: "https://api.themoviedb.org/3",
    requestsPerSecond: 40,
    burstCapacity: 10,
    bufferCapacity: 100,
    bufferStrategy: "dropping" as const,
    maxConcurrent: 10,
  });
};

// Run all examples
const main = Effect.gen(function* () {
  yield* example1;
  yield* example2;
  yield* example3;
  yield* example4;

  yield* Console.log("\n✅ All examples completed!");
}).pipe(
  Effect.provide(Movie.Default),
  Effect.provide(MovieDbClient.Default),
  Effect.provide(RateLimiterLive),
  Effect.provide(NodeHttpClient.layerUndici),
  Effect.provide(makeConfigLayer()),
  Effect.scoped,
);

await Effect.runPromise(main);
