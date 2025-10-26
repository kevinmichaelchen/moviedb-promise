# moviedb-promise

[![npm](https://img.shields.io/npm/dw/moviedb-promise.svg?style=for-the-badge)](https://www.npmjs.com/package/moviedb-promise)

A modern, type-safe TypeScript client for The Movie Database (TMDb) API, built with [Effect](https://effect.website/).

## Why moviedb-promise?

**✨ Built for modern TypeScript applications**

- 🎯 **Fully type-safe** - End-to-end type safety with Effect Schema
- 🔄 **Automatic retry** - Resilient API calls with smart retry logic
- 🚦 **Built-in rate limiting** - Stay within API limits automatically
- 📊 **Streaming pagination** - Memory-efficient data processing with backpressure
- 🔍 **Observability** - Built-in logging, tracing, and metrics
- 🧪 **Easy to test** - Dependency injection makes testing simple
- 🛡️ **Structured error handling** - Type-safe error channels
- 🔌 **CamelCase transforms** - Automatic snake_case → camelCase conversion

## Quick Start

### Installation

```bash
npm install moviedb-promise effect @effect/platform @effect/platform-node
```

### Basic Usage

```typescript
import { NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Movie, MovieDbClient, MovieDbConfig, RateLimiterLive } from "moviedb-promise";

// Create config layer
const ConfigLive = Layer.succeed(MovieDbConfig, {
  apiKey: "your-api-key",
  baseUrl: "https://api.themoviedb.org/3",
});

// Simple movie search
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  const details = yield* movie.getDetails({ id: 550 });
  console.log(details.title); // "Fight Club"
  console.log(details.releaseDate); // "1999-10-15" - camelCase!
});

// Run the program
const main = program.pipe(
  Effect.provide(Movie.Default),
  Effect.provide(MovieDbClient.Default),
  Effect.provide(RateLimiterLive),
  Effect.provide(NodeHttpClient.layerUndici),
  Effect.provide(ConfigLive),
  Effect.scoped,
);

await Effect.runPromise(main);
```

## Core Features

### 🎬 Movie Service

Get movie details, credits, videos, and images:

```typescript
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  // Get movie details
  const details = yield* movie.getDetails({ id: 550 });

  // Get credits (cast and crew)
  const credits = yield* movie.getCredits({ id: 550 });
  console.log(credits.cast[0].name); // "Brad Pitt"

  // Get videos (trailers, teasers)
  const videos = yield* movie.getVideos({ id: 550 });

  // Get images (posters, backdrops)
  const images = yield* movie.getImages({ id: 550 });
});
```

### 📺 TV Service

Access TV show information:

```typescript
const program = Effect.gen(function* () {
  const tv = yield* Tv;

  const show = yield* tv.getDetails({ id: 1396 }); // Breaking Bad
  const credits = yield* tv.getCredits({ id: 1396 });
  const popular = yield* tv.getPopular({ page: 1 });
});
```

### 🔍 Search Service

Search across movies, TV shows, and people:

```typescript
const program = Effect.gen(function* () {
  const search = yield* Search;

  // Search movies
  const movies = yield* search.searchMovie({
    query: "fight club",
    year: 1999,
  });

  // Search TV shows
  const shows = yield* search.searchTv({ query: "breaking bad" });

  // Search people
  const people = yield* search.searchPerson({ query: "brad pitt" });

  // Search everything
  const results = yield* search.searchMulti({ query: "matrix" });
});
```

### 👤 Person Service

Get information about actors, directors, and crew:

```typescript
const program = Effect.gen(function* () {
  const person = yield* Person;

  const details = yield* person.getDetails({ id: 287 }); // Brad Pitt
  const movieCredits = yield* person.getMovieCredits({ id: 287 });
  const tvCredits = yield* person.getTvCredits({ id: 287 });
  const combined = yield* person.getCombinedCredits({ id: 287 });
});
```

## 🚀 Advanced Features

### Streaming Pagination

Efficiently process large datasets with automatic pagination and backpressure:

```typescript
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  // Get first 100 popular movies efficiently
  const movies = yield* movie.streamPopular({}, { maxResults: 100 }).pipe(
    Stream.runCollect,
  );

  // Process with controlled concurrency
  yield* movie.streamNowPlaying({}, { maxPages: 5 }).pipe(
    Stream.mapEffect(
      (movie) => processMovie(movie),
      { concurrency: 10 } // Max 10 concurrent operations
    ),
    Stream.runDrain,
  );

  // Stop when you find what you need (lazy evaluation)
  const highlyRated = yield* movie.streamTopRated().pipe(
    Stream.filter((m) => m.voteAverage > 9.0),
    Stream.take(1),
    Stream.runCollect,
  );
});
```

**See examples:**
- [Basic Streaming Examples](examples/effect/streaming-basic.ts) - Simple pagination patterns
- [Advanced Streaming Examples](examples/effect/streaming-advanced.ts) - Backpressure, batching, error handling

### Built-in Retry Logic

Automatic retry for transient failures:

```typescript
// Retries automatically on:
// - Network errors (connection failures, timeouts)
// - Rate limit errors (429) with exponential backoff
// - Server errors (5xx)

const program = Effect.gen(function* () {
  const movie = yield* Movie;

  // This will automatically retry up to 3 times if it fails
  const details = yield* movie.getDetails({ id: 550 });
});
```

### Rate Limiting

Stay within TMDb API limits (40 requests/second):

```typescript
// Rate limiting is automatic - no configuration needed!
// The library ensures you never exceed API limits

const program = Effect.gen(function* () {
  const movie = yield* Movie;

  // Make many requests - they'll be automatically rate limited
  const movies = yield* Effect.all(
    Array.from({ length: 100 }, (_, i) =>
      movie.getDetails({ id: i + 1 })
    ),
    { concurrency: 50 } // Library handles rate limiting
  );
});
```

### Observability

Built-in logging, tracing, and metrics:

```typescript
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  // Every request includes:
  // - Structured logs with request/response details
  // - Distributed tracing spans
  // - Metrics (request count, duration, errors)

  const details = yield* movie.getDetails({ id: 550 });

  // Logs include:
  // - timestamp, path, duration_ms
  // - error details if request fails
  // - Request tags for filtering
});
```

### Type-Safe Error Handling

Structured errors with full type safety:

```typescript
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  const result = yield* movie.getDetails({ id: 999999 }).pipe(
    Effect.catchTags({
      NotFoundError: (error) =>
        Console.log("Movie not found"),

      AuthenticationError: (error) =>
        Console.log("Invalid API key"),

      RateLimitError: (error) =>
        Console.log("Rate limited - will retry"),

      NetworkError: (error) =>
        Console.log("Network issue - will retry"),
    })
  );
});
```

**Error Types:**
- `NotFoundError` - Resource not found (404)
- `AuthenticationError` - Invalid API key (401)
- `RateLimitError` - Rate limit exceeded (429)
- `ValidationError` - Invalid request (400, 422)
- `ServerError` - TMDb server error (5xx)
- `NetworkError` - Network/connection issues

### CamelCase Transformation

All API responses automatically converted from snake_case to camelCase:

```typescript
const program = Effect.gen(function* () {
  const movie = yield* Movie;

  const details = yield* movie.getDetails({ id: 550 });

  // TMDb API returns: release_date, original_title, vote_average
  // You get: releaseDate, originalTitle, voteAverage

  console.log(details.releaseDate);      // ✅ camelCase
  console.log(details.originalTitle);    // ✅ camelCase
  console.log(details.voteAverage);      // ✅ camelCase
});
```

## 📚 API Reference

### Services

All services follow the same pattern with Effect dependency injection:

```typescript
import { Movie, Tv, Search, Person } from "moviedb-promise";

// Use in Effect.gen
const program = Effect.gen(function* () {
  const movie = yield* Movie;
  const tv = yield* Tv;
  const search = yield* Search;
  const person = yield* Person;
});
```

### Movie Service Methods

**Details & Metadata:**
- `getDetails({ id, language? })` - Get movie details
- `getCredits({ id, language? })` - Get cast and crew
- `getVideos({ id, language? })` - Get trailers and clips
- `getImages({ id, language?, include_image_language? })` - Get posters and backdrops

**Lists:**
- `getNowPlaying({ language?, page?, region? })` - Movies in theaters
- `getPopular({ language?, page?, region? })` - Popular movies
- `getTopRated({ language?, page?, region? })` - Top rated movies

**Streaming:**
- `streamNowPlaying(request?, options?)` - Stream now playing movies
- `streamPopular(request?, options?)` - Stream popular movies
- `streamTopRated(request?, options?)` - Stream top rated movies

### TV Service Methods

**Details & Metadata:**
- `getDetails({ id, language? })` - Get TV show details
- `getCredits({ id, language? })` - Get cast and crew
- `getVideos({ id, language? })` - Get trailers and clips
- `getImages({ id, language?, include_image_language? })` - Get images

**Lists:**
- `getAiringToday({ language?, page?, timezone? })` - Shows airing today
- `getOnTheAir({ language?, page?, timezone? })` - Shows currently on air
- `getPopular({ language?, page? })` - Popular shows
- `getTopRated({ language?, page? })` - Top rated shows

**Streaming:**
- `streamAiringToday(request?, options?)` - Stream airing today
- `streamOnTheAir(request?, options?)` - Stream on the air
- `streamPopular(request?, options?)` - Stream popular shows
- `streamTopRated(request?, options?)` - Stream top rated shows

### Search Service Methods

**Search:**
- `searchMovie({ query, language?, page?, year?, ... })` - Search movies
- `searchTv({ query, language?, page?, ... })` - Search TV shows
- `searchPerson({ query, language?, page?, ... })` - Search people
- `searchMulti({ query, language?, page?, ... })` - Search everything

**Streaming:**
- `streamSearchMovie(request, options?)` - Stream movie search results
- `streamSearchTv(request, options?)` - Stream TV search results
- `streamSearchPerson(request, options?)` - Stream person search results
- `streamSearchMulti(request, options?)` - Stream multi-search results

### Person Service Methods

**Details:**
- `getDetails({ id, language? })` - Get person details
- `getMovieCredits({ id, language? })` - Get movie credits
- `getTvCredits({ id, language? })` - Get TV credits
- `getCombinedCredits({ id, language? })` - Get all credits
- `getImages({ id })` - Get profile images

**Lists:**
- `getPopular({ language?, page? })` - Popular people

**Streaming:**
- `streamPopular(request?, options?)` - Stream popular people

### Pagination Options

All streaming methods accept `PaginationOptions`:

```typescript
interface PaginationOptions {
  startPage?: number;    // Start from specific page (default: 1)
  maxPages?: number;     // Limit number of pages to fetch
  maxResults?: number;   // Limit total results to return
}

// Examples:
movie.streamPopular({}, { maxPages: 5 })      // First 5 pages
movie.streamPopular({}, { maxResults: 100 })  // First 100 results
movie.streamPopular({}, { startPage: 3 })     // Start from page 3
```

## 🧪 Testing

The library is designed for easy testing with dependency injection:

```typescript
import { makeTestConfig, MockRateLimiter } from "moviedb-promise/test-layers";

const testProgram = Effect.gen(function* () {
  const movie = yield* Movie;
  const details = yield* movie.getDetails({ id: 550 });
  // Your test assertions
}).pipe(
  Effect.provide(Movie.Default),
  Effect.provide(MovieDbClient.Default),
  Effect.provide(MockRateLimiter),           // No rate limiting in tests
  Effect.provide(NodeHttpClient.layerUndici),
  Effect.provide(makeTestConfig({ apiKey: "test-key" })),
  Effect.scoped,
);
```

## 🔧 Configuration

### Basic Configuration

```typescript
import { Layer } from "effect";
import { MovieDbConfig } from "moviedb-promise";

const ConfigLive = Layer.succeed(MovieDbConfig, {
  apiKey: process.env.TMDB_API_KEY!,
  baseUrl: "https://api.themoviedb.org/3",

  // Optional: Rate limiting (defaults shown)
  requestsPerSecond: 40,    // TMDb limit
  burstCapacity: 10,
  bufferCapacity: 100,
  bufferStrategy: "dropping",
  maxConcurrent: 10,
});
```

### Environment Variables

```bash
# .env
TMDB_API_KEY=your_api_key_here
```

```typescript
import dotenv from "dotenv";
dotenv.config();

const ConfigLive = Layer.succeed(MovieDbConfig, {
  apiKey: process.env.TMDB_API_KEY!,
  baseUrl: "https://api.themoviedb.org/3",
});
```

## 📖 Examples

Check out complete examples in the `examples/effect/` directory:

- **[streaming-basic.ts](examples/effect/streaming-basic.ts)** - Basic streaming patterns
  - Get first N results
  - Limit by pages
  - Stop when condition is met
  - Transform while streaming

- **[streaming-advanced.ts](examples/effect/streaming-advanced.ts)** - Advanced patterns
  - Backpressure with concurrent processing
  - Batch processing
  - Complex pipelines
  - Error handling
  - Side effects during streaming

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Testing

```bash
# Run all tests
deno test --allow-net --allow-env

# Run specific test file
deno test --allow-net --allow-env tests/effect/movie.test.ts

# Format code
deno fmt
```

### Requirements

- Use TypeScript
- Follow Effect patterns
- Add tests for new features
- Run `deno fmt` before committing
- Keep documentation up to date

## 📝 License

[MIT](LICENSE.md)

## 🙏 Credits

Built with [Effect](https://effect.website/) - A powerful TypeScript framework for building robust applications.

API data provided by [The Movie Database (TMDb)](https://www.themoviedb.org/).

---

**Note:** This library requires an API key from TMDb. Get your free API key at https://www.themoviedb.org/settings/api
