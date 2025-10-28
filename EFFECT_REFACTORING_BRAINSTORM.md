# Effect Refactoring Brainstorm for moviedb-promise

This document outlines ideas and strategies for refactoring the
`moviedb-promise` library to use [Effect](https://effect.website/), a powerful
TypeScript library for building complex, synchronous, and asynchronous programs
with advanced error handling, dependency injection, and resource management.

> **📘 Companion Document**: For a detailed analysis of rate limiting strategies
> (Throttling, Buffering, Debouncing, Semaphores, and Queues), see
> **[RATE_LIMITING_ANALYSIS.md](./RATE_LIMITING_ANALYSIS.md)**

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Key Benefits of Using Effect](#key-benefits-of-using-effect)
3. [Proposed Architecture](#proposed-architecture)
4. [Detailed Refactoring Areas](#detailed-refactoring-areas)
5. [Migration Strategy](#migration-strategy)
6. [Code Examples](#code-examples)
7. [Challenges and Considerations](#challenges-and-considerations)

---

## Current Architecture Analysis

### Current Implementation

The current `moviedb-promise` library (v4.0.7) is built with:

- **HTTP Client**: Uses `axios` for making HTTP requests
- **Rate Limiting**: Uses `promise-throttle` for managing API rate limits (50
  requests/second by default)
- **State Management**: Class-based approach with instance properties:
  - `apiKey`: API key for authentication
  - `token`: Cached authentication token with expiration
  - `sessionId`: User session identifier
  - `baseUrl`: API base URL
  - `queue`: Promise throttle queue
- **Error Handling**: Traditional Promise-based error handling
- **Architecture**: Monolithic class with ~100+ methods in `moviedb.ts:1-1006`

### Pain Points

1. **Limited Error Types**: No typed error channels - errors are generic Promise
   rejections
2. **Manual Resource Management**: Token caching and expiration handled manually
3. **Implicit Dependencies**: Services like axios are hard-coded, making testing
   difficult
4. **No Built-in Retry Logic**: Clients must implement their own retry
   mechanisms
5. **Rate Limiting Abstraction**: The throttle queue is an implementation detail
   exposed through the constructor
6. **Type Safety**: Limited type-level guarantees about effects and dependencies

---

## Key Benefits of Using Effect

### 1. **Typed Error Handling**

Effect provides a typed error channel, making error handling explicit and
composable:

```typescript
Effect<Success, Error, Requirements>
         ↑       ↑          ↑
      Success  Error    Dependencies
       type    type      needed
```

### 2. **Service-Based Architecture**

Effect's Context and Layer system enables:

- Dependency injection at the type level
- Easy mocking for tests
- Clean separation of concerns
- Composable service layers

### 3. **Built-in Retry & Resilience**

Effect includes powerful retry mechanisms with:

- Exponential backoff
- Configurable retry policies
- Schedule combinators

### 4. **Resource Management**

Effect's Scope system ensures:

- Automatic cleanup of resources
- Safe handling of long-lived connections
- Structured concurrency

### 5. **Observability**

Effect provides first-class support for:

- Distributed tracing
- Structured logging
- Metrics collection

---

## Proposed Architecture

### Service Layer Design

```
┌─────────────────────────────────────────┐
│         MovieDbClient (Service)         │
│  ┌───────────────────────────────────┐  │
│  │   Public API Methods              │  │
│  │   - movieInfo()                   │  │
│  │   - searchMovie()                 │  │
│  │   - tvInfo()                      │  │
│  │   etc...                          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓ depends on
┌─────────────────────────────────────────┐
│      Internal Services (Layers)         │
│                                         │
│  ┌─────────────────┐                   │
│  │ HttpClient      │ (from @effect)    │
│  │ - request()     │                   │
│  └─────────────────┘                   │
│                                         │
│  ┌─────────────────┐                   │
│  │ RateLimiter     │ (custom service)  │
│  │ - withLimit()   │                   │
│  └─────────────────┘                   │
│                                         │
│  ┌─────────────────┐                   │
│  │ AuthService     │ (custom service)  │
│  │ - getToken()    │                   │
│  │ - getSession()  │                   │
│  └─────────────────┘                   │
│                                         │
│  ┌─────────────────┐                   │
│  │ Config          │ (configuration)   │
│  │ - apiKey        │                   │
│  │ - baseUrl       │                   │
│  └─────────────────┘                   │
└─────────────────────────────────────────┘
```

---

## Detailed Refactoring Areas

### 1. **Replace Axios with Effect HttpClient**

**Current**: `moviedb.ts:1` - Uses axios directly

**Proposed**: Use `@effect/platform`'s HttpClient service

**Benefits**:

- Native Effect integration
- Automatic tracing and observability
- Type-safe error handling
- Built-in retry mechanisms

**Dependencies**:

```bash
npm install @effect/platform @effect/platform-node
```

### 2. **Service-Based Configuration**

**Current**: Constructor parameters in `moviedb.ts:14-21`

**Proposed**: Create a `MovieDbConfig` service

```typescript
class MovieDbConfig extends Context.Tag("MovieDbConfig")<
  MovieDbConfig,
  {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly requestsPerSecond: number;
  }
>() {}
```

**Benefits**:

- Testable configuration
- Environment-based configuration
- Type-safe access

### 3. **Rate Limiting Service**

**Current**: `promise-throttle` queue in `moviedb.ts:10,17-20`

**Proposed**: Multiple strategies available (see detailed analysis in
`RATE_LIMITING_ANALYSIS.md`)

**Recommended Approach**: Buffered Throttling using Effect's `Stream.throttle`

```typescript
Stream.throttle({
  cost: () => 1,
  duration: "1 second",
  units: 50,
  burst: 10,
  strategy: "shape",
});
```

**Benefits**:

- Token bucket algorithm (industry standard)
- Burst support for better UX
- Built-in backpressure for memory safety
- Cancellable via interruption
- Composable with buffering and other stream operations

**Alternative Patterns**:

- **Semaphore**: For concurrent connection limits
- **Queue + Worker**: For explicit queue management
- **Debouncing**: For search-as-you-type features (supplement, not replacement)

**⚠️ See `RATE_LIMITING_ANALYSIS.md` for comprehensive comparison of Throttling,
Buffering, Debouncing, Semaphores, and Queues.**

### 4. **Authentication Service**

**Current**: Token management in `moviedb.ts:28-50`

**Proposed**: Dedicated `MovieDbAuth` service with cached token management

**Benefits**:

- Separation of concerns
- Automatic token refresh using Effect's resource management
- Built-in expiration handling with `Resource.auto`

**Pattern**: Use `Resource` for auto-refreshing tokens

### 5. **Typed Error Handling**

**Current**: Generic Promise rejections

**Proposed**: Create a typed error hierarchy

```typescript
// Domain errors
export class MovieDbError extends Data.TaggedError("MovieDbError")<{
  readonly message: string;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly cause: unknown;
}> {}

export class AuthenticationError
  extends Data.TaggedError("AuthenticationError")<{
    readonly message: string;
  }> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter?: number;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string;
  readonly id: string | number;
}> {}

export type MovieDbErrors =
  | NetworkError
  | AuthenticationError
  | RateLimitError
  | NotFoundError
  | MovieDbError;
```

**Benefits**:

- Exhaustive error handling at compile time
- Pattern matching on errors
- Better error messages

### 6. **Retry Logic with Exponential Backoff**

**Current**: No built-in retry logic

**Proposed**: Use Effect's `Schedule` for retry policies

**Pattern**: Apply retry-with-backoff pattern from Effect patterns

```typescript
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(5))
)

// Apply to API calls
const movieInfo = (id: number) =>
  Effect.retry(makeRequest(...), retryPolicy)
```

**Benefits**:

- Resilient to transient failures
- Configurable backoff strategies
- Composable retry policies

### 7. **Request/Response Pipeline**

**Current**: Manual parameter compilation in `moviedb.ts:55-135`

**Proposed**: Use Effect's pipeline operators for request transformation

**Benefits**:

- Composable request transformations
- Declarative pipeline definition
- Easy to add middleware (logging, tracing, etc.)

### 8. **Concurrent Operations**

**Current**: Sequential operation by default

**Proposed**: Leverage Effect's concurrency primitives

**Pattern**: Use `Effect.forEach` with concurrency options for batch operations

```typescript
// Process multiple movie IDs concurrently with max 10 parallel requests
const fetchMovies = (ids: number[]) =>
  Effect.forEach(
    ids,
    (id) => movieInfo(id),
    { concurrency: 10 },
  );
```

**Benefits**:

- Controlled parallelism
- Automatic error handling across concurrent operations
- Respects rate limits through RateLimiter service

---

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)

1. **Add Effect dependencies**
   - Install `effect`, `@effect/platform`, `@effect/platform-node`
   - Update TypeScript configuration for Effect

2. **Create core services**
   - `MovieDbConfig` service
   - `RateLimiter` service
   - Error type hierarchy

3. **Set up testing infrastructure**
   - Create test layers
   - Mock services for unit tests

### Phase 2: Core Infrastructure (Weeks 3-4)

1. **Implement HttpClient integration**
   - Create base request builder
   - Implement retry logic
   - Add error mapping

2. **Implement AuthService**
   - Token management with `Resource`
   - Session handling
   - Auto-refresh logic

3. **Create base MovieDbClient service**
   - Define service interface
   - Implement core request logic

### Phase 3: API Migration (Weeks 5-8)

1. **Migrate API methods in batches**
   - Movie endpoints
   - TV endpoints
   - Search endpoints
   - Person endpoints
   - etc.

2. **Maintain backward compatibility**
   - Create adapter layer for existing Promise-based API
   - Deprecate old methods gradually

### Phase 4: Polish & Optimization (Weeks 9-10)

1. **Add observability**
   - Tracing
   - Metrics
   - Structured logging

2. **Performance optimization**
   - Request caching
   - Response streaming for large datasets

3. **Documentation**
   - Migration guide
   - New API examples
   - Best practices

---

## Code Examples

### Example 1: Service Definition

```typescript
import { Context, Effect, Layer } from "effect";
import { HttpClient } from "@effect/platform";

// Config service
export class MovieDbConfig extends Context.Tag("MovieDbConfig")<
  MovieDbConfig,
  {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly requestsPerSecond: number;
  }
>() {}

// Auth service interface
export class MovieDbAuth extends Context.Tag("MovieDbAuth")<
  MovieDbAuth,
  {
    readonly getToken: Effect.Effect<string, AuthenticationError>;
    readonly getSession: Effect.Effect<string, AuthenticationError>;
  }
>() {}

// Main client service
export class MovieDbClient extends Context.Tag("MovieDbClient")<
  MovieDbClient,
  {
    readonly movieInfo: (
      id: number,
    ) => Effect.Effect<MovieResponse, MovieDbErrors>;
    readonly searchMovie: (
      query: string,
    ) => Effect.Effect<SearchResults, MovieDbErrors>;
    // ... other methods
  }
>() {}
```

### Example 2: Implementation with Layers

```typescript
import { Context, Effect, Layer } from "effect";
import { HttpClient } from "@effect/platform";

// Auth service implementation
export const MovieDbAuthLive = Layer.effect(
  MovieDbAuth,
  Effect.gen(function* () {
    const config = yield* MovieDbConfig;
    const http = yield* HttpClient.HttpClient;

    // Token cache using Resource for auto-refresh
    const tokenResource = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        const response = yield* http.get(
          `${config.baseUrl}/authentication/token/new`,
          {
            searchParams: { api_key: config.apiKey },
          },
        );
        const token = yield* response.json;
        return {
          value: token.request_token,
          expiresAt: new Date(token.expires_at),
        };
      }),
      () => Effect.void, // Cleanup
    );

    return {
      getToken: Effect.succeed(tokenResource.value),
      getSession: Effect.gen(function* () {
        const token = yield* this.getToken;
        const response = yield* http.get(
          `${config.baseUrl}/authentication/session/new`,
          {
            searchParams: {
              api_key: config.apiKey,
              request_token: token,
            },
          },
        );
        const data = yield* response.json;
        return data.session_id;
      }),
    };
  }),
);
```

### Example 3: Using the Service

```typescript
import { Effect } from "effect";

// Using the service in application code
const program = Effect.gen(function* () {
  const client = yield* MovieDbClient;

  // Get movie info with automatic retry on transient failures
  const movie = yield* client.movieInfo(550);

  console.log(`Title: ${movie.title}`);
  console.log(`Rating: ${movie.vote_average}`);
});

// Provide all layers and run
const runnable = program.pipe(
  Effect.provide(MovieDbClientLive),
  Effect.provide(MovieDbAuthLive),
  Effect.provide(RateLimiterLive),
  Effect.provide(HttpClient.layer),
);

Effect.runPromise(runnable);
```

### Example 4: Error Handling

```typescript
import { Effect, Match } from "effect";

const program = Effect.gen(function* () {
  const client = yield* MovieDbClient;

  const result = yield* client.movieInfo(99999).pipe(
    Effect.catchTags({
      NotFoundError: (error) =>
        Effect.succeed({
          title: "Movie not found",
          error: error.message,
        }),
      RateLimitError: (error) =>
        Effect.gen(function* () {
          yield* Effect.sleep(error.retryAfter ?? "5 seconds");
          return yield* client.movieInfo(99999);
        }),
      NetworkError: (error) =>
        Effect.retry(
          client.movieInfo(99999),
          Schedule.exponential("1 second"),
        ),
    }),
  );

  return result;
});
```

### Example 5: Batch Operations with Concurrency

```typescript
import { Effect } from "effect";

const fetchMultipleMovies = (ids: number[]) =>
  Effect.gen(function* () {
    const client = yield* MovieDbClient;

    // Fetch up to 10 movies concurrently
    const movies = yield* Effect.forEach(
      ids,
      (id) => client.movieInfo(id),
      { concurrency: 10 },
    );

    return movies;
  });

// Usage
const program = fetchMultipleMovies([550, 551, 552, 553, 554]);
```

---

## Challenges and Considerations

### 1. **Breaking Changes**

**Challenge**: Effect introduces a fundamentally different programming model

**Mitigation**:

- Create compatibility layer that wraps Effect programs in Promises
- Provide gradual migration path
- Maintain v4.x for existing users while developing v5.x with Effect

### 2. **Bundle Size**

**Challenge**: Effect adds ~100KB to bundle size

**Mitigation**:

- Tree-shaking optimization
- Provide ESM builds
- Document bundle size impact
- Consider creating a micro version using `effect/Micro` for size-sensitive
  applications

### 3. **Learning Curve**

**Challenge**: Effect has a steeper learning curve than Promises

**Mitigation**:

- Comprehensive documentation with examples
- Migration guide
- Video tutorials
- Code snippets for common patterns

### 4. **TypeScript Version Requirements**

**Challenge**: Effect requires TypeScript 5.0+

**Mitigation**:

- Document version requirements clearly
- Provide polyfills if possible
- Consider this a major version bump (v5.0.0)

### 5. **Testing Changes**

**Challenge**: Testing Effect code requires different patterns

**Mitigation**:

- Provide test utilities
- Document testing patterns
- Create example test suites
- Use Effect's built-in testing support

### 6. **Streaming Large Responses**

**Challenge**: Some API endpoints return large datasets

**Opportunity**:

- Use Effect's Stream for pagination
- Implement cursor-based pagination
- Automatic backpressure handling

---

## Recommended Next Steps

1. **Proof of Concept**
   - Implement 2-3 endpoints using Effect
   - Measure performance and bundle size
   - Validate architecture decisions

2. **Community Feedback**
   - Create RFC (Request for Comments) issue
   - Share proof of concept
   - Gather feedback from users

3. **Documentation**
   - Write migration guide
   - Create comparison examples
   - Document new patterns

4. **Gradual Migration**
   - Start with new v5.x branch
   - Keep v4.x maintained
   - Provide compatibility shims

---

## Additional Resources

- [Effect Documentation](https://effect.website/docs/introduction)
- [Effect Platform HttpClient](https://effect.website/docs/guides/platform/http-client)
- [Effect Layers Guide](https://effect.website/docs/guides/context-management/layers)
- [Effect Error Handling](https://effect.website/docs/guides/error-management)
- [Effect Concurrency](https://effect.website/docs/guides/concurrency)

---

## Conclusion

Refactoring `moviedb-promise` to use Effect would provide:

✅ **Type-safe error handling** with exhaustive checking ✅ **Dependency
injection** through services and layers ✅ **Built-in retry logic** with
exponential backoff ✅ **Better resource management** with automatic cleanup ✅
**Observability** through tracing and logging ✅ **Concurrent operations** with
controlled parallelism ✅ **Composable abstractions** for building complex
workflows

While the migration requires significant effort and introduces breaking changes,
the benefits of Effect's programming model would make the library more robust,
maintainable, and developer-friendly for building production applications.

The key is to approach this as a major version bump (v5.0.0) with a clear
migration path and compatibility layer for existing users.
