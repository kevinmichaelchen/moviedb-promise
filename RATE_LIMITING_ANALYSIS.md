# Rate Limiting Analysis: Current Strategy vs Effect Patterns

## Executive Summary

This document analyzes the current rate-limiting implementation in `moviedb-promise` and compares it with Effect's stream processing patterns: **Buffering**, **Debouncing**, and **Throttling**. We also explore how **Semaphores** and **Queues** can provide more sophisticated rate limiting.

---

## Current Implementation

### Overview

**Location**: `moviedb.ts:10,17-20,134`

The library currently uses the `promise-throttle` package (v1.1.2) to limit API requests:

```typescript
import PromiseThrottle from 'promise-throttle'

export class MovieDb {
  private queue: PromiseThrottle

  constructor(
    apiKey: string,
    baseUrl: string = 'https://api.themoviedb.org/3/',
    requestsPerSecondLimit: number = 50
  ) {
    this.queue = new PromiseThrottle({
      requestsPerSecond: requestsPerSecondLimit,
      promiseImplementation: Promise,
    })
  }

  private makeRequest(...): Promise<any> {
    // ... request setup ...
    return this.queue.add(async () => (await axios.request(request)).data)
  }
}
```

### How It Works

1. **Queue-Based**: Each request is added to a queue
2. **Fixed Rate**: Limits requests to N per second (default: 50)
3. **FIFO Processing**: Requests are processed in order
4. **Global Limit**: All API methods share the same rate limit

### Characteristics

| Aspect | Behavior |
|--------|----------|
| **Strategy** | Time-based throttling with a fixed rate |
| **Queueing** | Unlimited queue (all requests are enqueued) |
| **Backpressure** | No backpressure - queue grows indefinitely |
| **Burst Support** | No - strictly enforces per-second rate |
| **Request Prioritization** | FIFO only |
| **Cancellation** | Not supported |
| **Error Handling** | Basic Promise rejection |

### Strengths

✅ **Simple**: Easy to understand and use
✅ **Predictable**: Consistent rate limiting across all requests
✅ **API Compliant**: Respects TMDb's rate limits

### Weaknesses

❌ **No Backpressure**: Queue can grow unbounded during bursts
❌ **Not Cancellable**: Requests in queue can't be cancelled
❌ **No Burst Support**: Can't temporarily exceed limits
❌ **Fixed Rate**: Can't adapt to different API endpoint limits
❌ **Memory Concerns**: Large queues during high load
❌ **No Priority**: Important requests can't jump the queue

---

## Effect Patterns Comparison

### 1. Throttling (Stream.throttle)

**Best Match for Current Behavior** ⭐

Effect's throttling uses the **token bucket algorithm** to regulate emission rates.

```typescript
Stream.throttle({
  cost: () => 1,           // Each request costs 1 token
  duration: "1 second",     // Refill rate
  units: 50,                // 50 tokens per duration
  strategy: "shape",        // "shape" or "enforce"
  burst: 10                 // Allow burst capacity
})
```

#### Comparison with Current Implementation

| Feature | Current (promise-throttle) | Effect Throttling |
|---------|---------------------------|-------------------|
| **Algorithm** | Queue + timer | Token bucket |
| **Burst Support** | ❌ No | ✅ Yes (configurable) |
| **Strategies** | One (queue) | Two (shape/enforce) |
| **Backpressure** | ❌ No | ✅ Yes |
| **Memory Efficiency** | ❌ Queue grows | ✅ Controlled |
| **Cancellation** | ❌ No | ✅ Yes (via interruption) |
| **Cost Per Request** | Fixed (1) | ✅ Configurable |

#### Shape Strategy (Default)

Delays emissions until bandwidth constraints are met:

```typescript
// Delays requests to match rate limits
Stream.throttle({
  cost: () => 1,
  duration: "1 second",
  units: 50,
  strategy: "shape"  // Delays emission (similar to current queue)
})
```

**Use Case**: When you want to process ALL requests eventually (like current behavior).

#### Enforce Strategy

Discards requests that exceed bandwidth:

```typescript
// Drops requests that exceed limits
Stream.throttle({
  cost: () => 1,
  duration: "1 second",
  units: 50,
  strategy: "enforce"  // Drops excess requests
})
```

**Use Case**: When failing fast is better than queueing (e.g., real-time search).

#### Burst Support

Allows temporary rate limit violations:

```typescript
Stream.throttle({
  cost: () => 1,
  duration: "200 millis",
  units: 5,
  burst: 2  // Allow 2 extra tokens initially
})
```

**Use Case**: Handle initial bursts without queueing everything.

**Recommendation**: This is the **closest equivalent** to the current implementation and offers significant improvements with burst support and backpressure handling.

---

### 2. Buffering (Stream.buffer)

**For Managing Producer-Consumer Speed Mismatch**

Buffering creates a queue between fast producers and slow consumers:

```typescript
Stream.buffer({
  capacity: 100  // Max buffer size
})

// Or with different strategies:
Stream.buffer({
  capacity: 100,
  strategy: "sliding"   // Drop oldest
})

Stream.buffer({
  capacity: 100,
  strategy: "dropping"  // Drop newest
})
```

#### Comparison with Current Implementation

| Feature | Current | Effect Buffering |
|---------|---------|------------------|
| **Queue Capacity** | ❌ Unlimited | ✅ Configurable |
| **Drop Strategy** | ❌ None | ✅ Sliding/Dropping |
| **Backpressure** | ❌ No | ✅ Yes |
| **Use Case** | Rate limiting | Speed mismatch |

#### When to Use Buffer vs Current Approach

**Current approach** is better for:
- Ensuring ALL requests eventually execute
- Simple rate limiting

**Buffering** is better for:
- Preventing unbounded memory growth
- When dropping requests is acceptable
- Managing speed differences between producer/consumer

#### Example: Bounded Buffer + Throttle

```typescript
const apiStream = requestStream.pipe(
  // First, buffer with capacity limit
  Stream.buffer({
    capacity: 100,
    strategy: "dropping"  // Drop new requests when full
  }),
  // Then throttle the emission rate
  Stream.throttle({
    cost: () => 1,
    duration: "1 second",
    units: 50
  })
)
```

**Recommendation**: Use buffering **in addition to** throttling to prevent unbounded queue growth.

---

### 3. Debouncing (Stream.debounce)

**For Eliminating Redundant Rapid Requests**

Debouncing delays emission until a pause occurs:

```typescript
Stream.debounce("100 millis")
```

**How it works**:
- Only emits after N milliseconds of silence
- Resets timer on each new value
- Emits only the LAST value after a pause

#### Comparison with Current Implementation

| Feature | Current | Effect Debouncing |
|---------|---------|-------------------|
| **Processes All** | ✅ Yes | ❌ No (only last) |
| **Delay** | Minimal | Variable |
| **Redundancy Elimination** | ❌ No | ✅ Yes |
| **Use Case** | Rate limiting | Rapid input handling |

#### When Debouncing is NOT a Replacement

Debouncing is **fundamentally different** from rate limiting:

```typescript
// Debouncing: Only emits "c" because rapid fire
searchMovie("a")  // ← cancelled
searchMovie("ab") // ← cancelled
searchMovie("abc") // ← emits after 100ms pause

// Rate limiting: All 3 execute, just slower
searchMovie("a")   // → executes at T=0
searchMovie("ab")  // → executes at T=20ms
searchMovie("abc") // → executes at T=40ms
```

#### When to Use Debouncing

**Use debouncing for**:
- Search-as-you-type features
- Auto-save functionality
- Window resize handlers
- Scroll events

**Don't use debouncing for**:
- API rate limiting (requests must all execute)
- Critical operations
- Sequential operations

#### Example: Debounce THEN Rate Limit

```typescript
const searchStream = userInputs.pipe(
  // First, debounce user input
  Stream.debounce("300 millis"),
  // Then apply rate limiting to resulting requests
  Stream.mapEffect((query) => searchMovie(query)),
  Stream.throttle({
    cost: () => 1,
    duration: "1 second",
    units: 50
  })
)
```

**Recommendation**: Use debouncing **in addition to** rate limiting for user-driven search features, but NOT as a replacement for rate limiting.

---

## Alternative Approaches with Effect

### 4. Semaphore-Based Rate Limiting

**For Fine-Grained Concurrency Control**

Semaphores control how many operations run concurrently:

```typescript
const program = Effect.gen(function* () {
  // Create a semaphore with N permits
  const rateLimiter = yield* Effect.makeSemaphore(50)

  // Wrap API calls to require a permit
  const movieInfo = (id: number) =>
    rateLimiter.withPermits(1)(
      Effect.tryPromise(() => axios.get(`/movie/${id}`))
    )

  // At most 50 concurrent requests
  yield* Effect.forEach(
    movieIds,
    (id) => movieInfo(id),
    { concurrency: "unbounded" }
  )
})
```

#### Comparison with Current Implementation

| Feature | Current | Semaphore |
|---------|---------|-----------|
| **Limit Type** | Requests per second | Concurrent requests |
| **Control** | Time-based | Count-based |
| **Flexibility** | Fixed rate | Variable permits |
| **Cancellation** | ❌ No | ✅ Yes |
| **Priority** | ❌ No | ✅ Via separate semaphores |

#### When to Use Semaphores

**Use semaphores for**:
- Limiting concurrent connections
- Managing connection pools
- Controlling resource access

**Use throttling for**:
- Rate limiting (requests per time unit)
- API quotas
- Network bandwidth management

#### Hybrid: Semaphore + Throttle

```typescript
const program = Effect.gen(function* () {
  const connectionPool = yield* Effect.makeSemaphore(10)  // Max 10 concurrent

  const requests = Stream.fromIterable(movieIds).pipe(
    // Limit to 10 concurrent requests
    Stream.mapEffect(
      (id) => connectionPool.withPermits(1)(fetchMovie(id)),
      { concurrency: "unbounded" }
    ),
    // ALSO throttle to 50 requests per second
    Stream.throttle({
      cost: () => 1,
      duration: "1 second",
      units: 50
    })
  )

  return yield* Stream.runCollect(requests)
})
```

**Recommendation**: Combine semaphores with throttling for sophisticated rate limiting that respects both concurrent connection limits AND requests-per-second limits.

---

### 5. Queue-Based Rate Limiting

**For More Control Than Current Implementation**

Effect's Queue offers multiple strategies:

```typescript
// Bounded queue with backpressure (blocks when full)
const queue = yield* Queue.bounded<Request>(100)

// Dropping queue (drops new items when full)
const queue = yield* Queue.dropping<Request>(100)

// Sliding queue (drops oldest when full)
const queue = yield* Queue.sliding<Request>(100)

// Unbounded queue (like current implementation)
const queue = yield* Queue.unbounded<Request>()
```

#### Comparison with Current Implementation

| Feature | Current | Effect Queue |
|---------|---------|--------------|
| **Queue Type** | Hidden (in promise-throttle) | Explicit |
| **Capacity** | Unlimited | Configurable |
| **Strategies** | One (FIFO) | Multiple (bounded/dropping/sliding) |
| **Backpressure** | ❌ No | ✅ Yes |
| **Cancellation** | ❌ No | ✅ Yes (shutdown) |
| **Inspection** | ❌ No | ✅ Yes (size, isEmpty, etc.) |

#### Example: Queue + Worker Pattern

```typescript
const program = Effect.gen(function* () {
  // Create a bounded queue
  const requestQueue = yield* Queue.bounded<ApiRequest>(100)

  // Worker that processes requests with rate limiting
  const worker = Stream.fromQueue(requestQueue).pipe(
    Stream.throttle({
      cost: () => 1,
      duration: "1 second",
      units: 50
    }),
    Stream.mapEffect((req) => makeRequest(req)),
    Stream.runDrain
  )

  // Fork worker in background
  yield* Effect.fork(worker)

  // Offer requests to queue
  yield* Queue.offer(requestQueue, { endpoint: "/movie/550" })

  // Queue automatically applies backpressure when full
})
```

**Recommendation**: Use Effect Queues for more control over queue behavior, especially when you need backpressure or different dropping strategies.

---

## Recommended Strategy for moviedb-promise

### Option 1: Direct Throttling (Simplest Migration)

**Best for**: Maintaining current behavior with improvements

```typescript
class MovieDbClient extends Context.Tag("MovieDbClient")<...>() {}

const MovieDbClientLive = Layer.effect(
  MovieDbClient,
  Effect.gen(function* () {
    const config = yield* MovieDbConfig
    const http = yield* HttpClient.HttpClient

    // Convert requests to a stream for throttling
    const makeRequest = (endpoint: string, params: any) =>
      Stream.make({ endpoint, params }).pipe(
        Stream.throttle({
          cost: () => 1,
          duration: "1 second",
          units: config.requestsPerSecond,
          burst: 10,  // Allow initial burst
          strategy: "shape"
        }),
        Stream.mapEffect(({ endpoint, params }) =>
          http.get(`${config.baseUrl}${endpoint}`, { searchParams: params })
        ),
        Stream.runHead,
        Effect.flatten
      )

    return {
      movieInfo: (id) => makeRequest(`movie/${id}`, { api_key: config.apiKey })
    }
  })
)
```

**Pros**:
- ✅ Similar to current behavior
- ✅ Adds burst support
- ✅ Built-in backpressure
- ✅ Cancellable requests

**Cons**:
- ❌ Still processes all requests (memory concern for large bursts)

---

### Option 2: Buffered Throttling (Recommended)

**Best for**: Production use with controlled memory

```typescript
const MovieDbClientLive = Layer.effect(
  MovieDbClient,
  Effect.gen(function* () {
    const config = yield* MovieDbConfig
    const http = yield* HttpClient.HttpClient

    // Create a bounded queue for requests
    const requestQueue = yield* Queue.bounded<ApiRequest>(200)

    // Background worker with buffering + throttling
    const worker = Stream.fromQueue(requestQueue).pipe(
      // Buffer to handle bursts
      Stream.buffer({
        capacity: 100,
        strategy: "dropping"  // Drop new requests if overwhelmed
      }),
      // Throttle at configured rate
      Stream.throttle({
        cost: () => 1,
        duration: "1 second",
        units: config.requestsPerSecond,
        burst: config.requestsPerSecond / 5,  // 20% burst capacity
        strategy: "shape"
      }),
      // Execute requests
      Stream.mapEffect((req) =>
        http.get(`${config.baseUrl}${req.endpoint}`, {
          searchParams: req.params
        })
      ),
      Stream.runDrain
    )

    // Start worker in background
    yield* Effect.forkScoped(worker)

    return {
      movieInfo: (id) =>
        Effect.gen(function* () {
          const promise = yield* Effect.promise<MovieResponse>()
          yield* Queue.offer(requestQueue, {
            endpoint: `movie/${id}`,
            params: { api_key: config.apiKey },
            resolve: promise.resolve,
            reject: promise.reject
          })
          return yield* promise.await
        })
    }
  })
)
```

**Pros**:
- ✅ Controlled memory usage
- ✅ Handles bursts gracefully
- ✅ Backpressure protection
- ✅ Production-ready

**Cons**:
- ❌ More complex than Option 1
- ❌ May drop requests during extreme load

---

### Option 3: Hybrid Semaphore + Throttle (Most Sophisticated)

**Best for**: High-performance applications with complex requirements

```typescript
const MovieDbClientLive = Layer.effect(
  MovieDbClient,
  Effect.gen(function* () {
    const config = yield* MovieDbConfig
    const http = yield* HttpClient.HttpClient

    // Semaphore for concurrent connection limit
    const connectionPool = yield* Effect.makeSemaphore(10)

    // Combine semaphore + throttling
    const makeRequest = (endpoint: string, params: any) =>
      connectionPool.withPermits(1)(
        Stream.make({ endpoint, params }).pipe(
          Stream.throttle({
            cost: () => 1,
            duration: "1 second",
            units: config.requestsPerSecond,
            burst: 10
          }),
          Stream.mapEffect(({ endpoint, params }) =>
            http.get(`${config.baseUrl}${endpoint}`, {
              searchParams: params
            })
          ),
          Stream.runHead,
          Effect.flatten
        )
      )

    return {
      movieInfo: (id) => makeRequest(`movie/${id}`, { api_key: config.apiKey })
    }
  })
)
```

**Pros**:
- ✅ Fine-grained control
- ✅ Respects both concurrent AND per-second limits
- ✅ Best resource utilization

**Cons**:
- ❌ Most complex
- ❌ Overkill for simple use cases

---

## Migration Decision Matrix

| Requirement | Option 1 (Throttle) | Option 2 (Buffer+Throttle) | Option 3 (Semaphore+Throttle) |
|-------------|---------------------|---------------------------|------------------------------|
| **Simple migration** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Memory efficiency** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Burst handling** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Request dropping** | ❌ | ✅ | ✅ |
| **Concurrent control** | ❌ | ❌ | ✅ |
| **Production ready** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Complexity** | Low | Medium | High |

---

## Pattern Comparison Summary

| Pattern | Use Case | Replaces Current? | Memory | Complexity |
|---------|----------|------------------|--------|------------|
| **Throttling** | Rate limiting (requests/time) | ✅ Yes | Controlled | Medium |
| **Buffering** | Producer/consumer mismatch | ⚠️ Supplement | Bounded | Low |
| **Debouncing** | Eliminate redundant rapid requests | ❌ No | Low | Low |
| **Semaphore** | Concurrent request limiting | ⚠️ Supplement | N/A | Low |
| **Queue** | Explicit queue management | ✅ Yes | Configurable | Medium |

---

## Final Recommendations

### For Immediate Migration (v5.0.0)

**Use Option 2: Buffered Throttling**

Rationale:
1. ✅ Maintains backward compatibility (all requests eventually execute)
2. ✅ Adds burst support for better UX
3. ✅ Bounded buffer prevents memory issues
4. ✅ Production-ready with backpressure
5. ✅ Reasonable complexity

### For Advanced Use Cases

Consider **adding** (not replacing) these patterns:

1. **Debouncing for search**: `searchMovie()` could debounce user input
2. **Semaphore for connections**: Limit concurrent HTTP connections
3. **Priority queues**: VIP requests could skip the queue (future enhancement)

### Configuration Options to Expose

```typescript
interface RateLimitConfig {
  requestsPerSecond: number        // Default: 50
  burstCapacity: number             // Default: 10
  bufferCapacity: number            // Default: 200
  bufferStrategy: "dropping" | "sliding"  // Default: "dropping"
  maxConcurrent?: number            // Optional: concurrent connection limit
}
```

---

## Conclusion

The current `promise-throttle` implementation serves its purpose but lacks modern features like backpressure, burst support, and cancellation. **Effect's Stream.throttle** is the natural successor, offering:

1. ✅ **Token bucket algorithm** (industry standard)
2. ✅ **Burst support** for better UX
3. ✅ **Backpressure** for memory safety
4. ✅ **Cancellation** via interruption
5. ✅ **Composability** with other stream operations

**Recommended path forward**:
- Start with Option 2 (Buffered Throttling) for v5.0.0
- Add debouncing to search methods
- Consider semaphores for connection pooling in future versions

The combination of **buffering** + **throttling** provides a robust, production-ready rate limiting strategy that improves upon the current implementation while maintaining familiar behavior.
