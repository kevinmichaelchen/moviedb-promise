/**
 * Example: Advanced Streaming Patterns
 *
 * Complex streaming patterns for advanced use cases including backpressure,
 * concurrency control, batch processing, and error handling.
 *
 * Run with:
 * ```
 * MOVIEDB_API_KEY=your_key deno run --allow-env --allow-net examples/effect/streaming-advanced.ts
 * ```
 */

import { NodeHttpClient } from "@effect/platform-node";
import { Console, Effect, Layer, Stream } from "effect";
import { Movie } from "../../src/effect/movie.ts";
import { Search } from "../../src/effect/search.ts";
import { MovieDbClient } from "../../src/effect/client.ts";
import { MovieDbConfig } from "../../src/effect/config.ts";
import { RateLimiterLive } from "../../src/effect/rate-limiter.ts";

/**
 * Example 1: Backpressure with Concurrent Processing
 *
 * Process stream items with effectful operations while controlling
 * how many operations run concurrently. This demonstrates backpressure -
 * new items are only pulled from the stream as processing slots become available.
 */
const example1 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 1: Concurrent Processing with Backpressure ===");

  const movie = yield* Movie;

  // Process movies with controlled concurrency
  const processed = yield* movie.streamNowPlaying({}, { maxResults: 20 }).pipe(
    Stream.mapEffect(
      (m) =>
        Effect.gen(function* () {
          // Simulate processing (e.g., fetching additional data, transforming)
          yield* Effect.sleep("50 millis");
          yield* Console.log(`  Processing: ${m.title}`);
          return {
            title: m.title,
            rating: m.voteAverage,
            processed: true,
          };
        }),
      { concurrency: 5 }, // Max 5 concurrent operations
    ),
    Stream.runCollect,
  );

  yield* Console.log(`✓ Processed ${processed.length} movies (max 5 concurrent)`);
});

/**
 * Example 2: Batch Processing
 *
 * Group stream items into batches for bulk operations.
 * Useful for bulk database inserts, API calls, or processing chunks.
 */
const example2 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 2: Batch Processing ===");

  const movie = yield* Movie;

  // Process movies in batches of 10
  const batches = yield* movie.streamTopRated({}, { maxResults: 30 }).pipe(
    Stream.grouped(10), // Group into chunks of 10
    Stream.mapEffect((batch) =>
      Effect.gen(function* () {
        const titles = Array.from(batch).map((m) => m.title);
        yield* Console.log(`  Processing batch of ${titles.length} movies`);

        // Simulate bulk operation (e.g., bulk insert to database)
        yield* Effect.sleep("100 millis");

        return {
          count: titles.length,
          titles,
          processedAt: new Date(),
        };
      })
    ),
    Stream.runCollect,
  );

  yield* Console.log(`✓ Processed ${batches.length} batches`);
});

/**
 * Example 3: Complex Pipeline with Multiple Transformations
 *
 * Chain multiple stream operations together for complex data processing.
 */
const example3 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 3: Complex Pipeline ===");

  const search = yield* Search;

  const result = yield* search.streamSearchMovie(
    { query: "star" },
    { maxPages: 3 },
  ).pipe(
    // Filter: Only movies with rating > 7
    Stream.filter((m) => m.voteAverage > 7),
    // Transform: Extract just title and rating
    Stream.map((m) => ({
      title: m.title,
      rating: m.voteAverage,
      year: m.releaseDate.split("-")[0],
    })),
    // Group by decade
    Stream.runCollect,
  );

  const movies = Array.from(result);
  yield* Console.log(`✓ Found ${movies.length} highly rated movies`);

  // Group by decade
  const byDecade = movies.reduce((acc, m) => {
    const decade = Math.floor(Number(m.year) / 10) * 10;
    if (!acc[decade]) acc[decade] = [];
    acc[decade].push(m);
    return acc;
  }, {} as Record<number, typeof movies>);

  yield* Console.log(`  Decades represented: ${Object.keys(byDecade).join(", ")}`);
});

/**
 * Example 4: Error Handling and Recovery
 *
 * Handle errors gracefully during streaming with custom recovery logic.
 */
const example4 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 4: Error Handling ===");

  const movie = yield* Movie;

  // Stream with error handling
  const result = yield* movie.streamPopular({}, { maxPages: 1 }).pipe(
    Stream.take(10),
    Stream.runCollect,
    // Catch any errors and return empty result
    Effect.catchAll((error) =>
      Console.error(`⚠ Error occurred: ${error._tag}`).pipe(
        Effect.map(() => []),
      )
    ),
  );

  yield* Console.log(`✓ Successfully fetched ${result.length} movies with error handling`);
});

/**
 * Example 5: Streaming with Side Effects
 *
 * Perform side effects (logging, metrics, notifications) while streaming
 * without interrupting the flow.
 */
const example5 = Effect.gen(function* () {
  yield* Console.log("\n=== Example 5: Side Effects During Streaming ===");

  const movie = yield* Movie;
  let count = 0;

  const movies = yield* movie.streamNowPlaying({}, { maxResults: 15 }).pipe(
    // Tap for side effects without changing the stream
    Stream.tap((m) =>
      Effect.gen(function* () {
        count++;
        if (count % 5 === 0) {
          yield* Console.log(`  Progress: ${count} movies processed...`);
        }
      })
    ),
    Stream.runCollect,
  );

  yield* Console.log(`✓ Processed ${movies.length} movies with progress tracking`);
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
  yield* example5;

  yield* Console.log("\n✅ All advanced examples completed!");
}).pipe(
  Effect.provide(Movie.Default),
  Effect.provide(Search.Default),
  Effect.provide(MovieDbClient.Default),
  Effect.provide(RateLimiterLive),
  Effect.provide(NodeHttpClient.layerUndici),
  Effect.provide(makeConfigLayer()),
  Effect.scoped,
);

await Effect.runPromise(main);
