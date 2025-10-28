/**
 * Tests for streaming/pagination utilities
 */

import { Chunk, Effect, Stream } from "effect";
import { assertEquals } from "jsr:@std/assert";
import {
  collectAllPages,
  mapPaginated,
  mapPaginatedEffect,
  paginatedStream,
  type PaginatedResponse,
} from "../../src/effect/streaming.ts";

// Mock paginated response factory
const createMockPage = <T>(
  page: number,
  totalPages: number,
  itemsPerPage: number,
  itemFactory: (index: number) => T,
): PaginatedResponse<T> => {
  const startIndex = (page - 1) * itemsPerPage;
  const results = Array.from(
    { length: itemsPerPage },
    (_, i) => itemFactory(startIndex + i),
  );

  return {
    page,
    results,
    totalPages,
    totalResults: totalPages * itemsPerPage,
  };
};

Deno.test("paginatedStream - fetches all pages", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 3, 2, (i) => ({ id: i, name: `Item ${i}` })),
    );

  const program = Effect.gen(function* () {
    const chunk = yield* paginatedStream(fetchPage).pipe(
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 6); // 3 pages * 2 items
    assertEquals(results[0].id, 0);
    assertEquals(results[5].id, 5);
  });

  await Effect.runPromise(program);
});

Deno.test("paginatedStream - respects maxPages limit", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 10, 5, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const chunk = yield* paginatedStream(fetchPage, { maxPages: 2 }).pipe(
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 10); // 2 pages * 5 items
  });

  await Effect.runPromise(program);
});

Deno.test("paginatedStream - respects maxResults limit", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 10, 5, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const chunk = yield* paginatedStream(fetchPage, { maxResults: 12 }).pipe(
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 12); // Limited to 12 items
  });

  await Effect.runPromise(program);
});

Deno.test("paginatedStream - supports custom startPage", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 5, 2, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const chunk = yield* paginatedStream(fetchPage, {
      startPage: 2,
      maxPages: 2,
    }).pipe(
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 4); // 2 pages * 2 items
    // Starting from page 2 means items start at index 2
    assertEquals(results[0].id, 2);
  });

  await Effect.runPromise(program);
});

Deno.test("paginatedStream - handles single page", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 1, 3, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const chunk = yield* paginatedStream(fetchPage).pipe(
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 3);
  });

  await Effect.runPromise(program);
});

Deno.test("paginatedStream - lazy evaluation", async () => {
  let pagesRequested = 0;

  const fetchPage = (page: number) => {
    pagesRequested++;
    return Effect.succeed(
      createMockPage(page, 10, 5, (i) => ({ id: i })),
    );
  };

  const program = Effect.gen(function* () {
    // Only take 3 items - should only fetch 1 page
    const chunk = yield* paginatedStream(fetchPage).pipe(
      Stream.take(3),
      Stream.runCollect,
    );
    const results = Chunk.toReadonlyArray(chunk);

    assertEquals(results.length, 3);
    assertEquals(pagesRequested, 1); // Only 1 page fetched!
  });

  await Effect.runPromise(program);
});

Deno.test("collectAllPages - collects all results", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 3, 2, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const results = yield* collectAllPages(fetchPage);

    assertEquals(results.length, 6);
    assertEquals(results[0].id, 0);
    assertEquals(results[5].id, 5);
  });

  await Effect.runPromise(program);
});

Deno.test("collectAllPages - respects maxPages", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 10, 5, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const results = yield* collectAllPages(fetchPage, { maxPages: 2 });

    assertEquals(results.length, 10);
  });

  await Effect.runPromise(program);
});

Deno.test("mapPaginated - transforms results", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 2, 3, (i) => ({ id: i, value: i * 10 })),
    );

  const program = Effect.gen(function* () {
    const results = yield* mapPaginated(
      fetchPage,
      (item) => item.value,
    );

    assertEquals(results.length, 6);
    assertEquals(results[0], 0);
    assertEquals(results[5], 50);
  });

  await Effect.runPromise(program);
});

Deno.test("mapPaginatedEffect - applies effectful function", async () => {
  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 2, 2, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    const results = yield* mapPaginatedEffect(
      fetchPage,
      (item) => Effect.succeed(item.id * 2),
      { maxResults: 3 },
    );

    assertEquals(results.length, 3);
    assertEquals(results[0], 0);
    assertEquals(results[1], 2);
    assertEquals(results[2], 4);
  });

  await Effect.runPromise(program);
});

Deno.test("mapPaginatedEffect - respects concurrency", async () => {
  let concurrentCount = 0;
  let maxConcurrent = 0;

  const fetchPage = (page: number) =>
    Effect.succeed(
      createMockPage(page, 2, 5, (i) => ({ id: i })),
    );

  const program = Effect.gen(function* () {
    yield* mapPaginatedEffect(
      fetchPage,
      (_item) =>
        Effect.gen(function* () {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          yield* Effect.sleep("10 millis");
          concurrentCount--;
          return true;
        }),
      { concurrency: 3 },
    );

    // With concurrency: 3, should never exceed 3 concurrent operations
    assertEquals(maxConcurrent <= 3, true);
  });

  await Effect.runPromise(program);
});
