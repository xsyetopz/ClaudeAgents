---
name: performance-guide
description: Performance optimization patterns and profiling guidance. Use when the user mentions "performance", "optimize", "slow", "bottleneck", "profiling", "latency", "throughput", "benchmark", "speed up", or asks why something is slow or how to make it faster.
---

# Performance Guide

## Measure First

Profile before optimizing. Assumptions about bottlenecks are usually wrong.

| Platform | Tools                                              |
| -------- | -------------------------------------------------- |
| Rust     | `cargo flamegraph`, `criterion` benchmarks, `perf` |
| Node.js  | `--prof`, `clinic.js`, Chrome DevTools             |
| Bun      | Built-in profiler                                  |
| Go       | `pprof`, `go test -bench`                          |
| Database | `EXPLAIN ANALYZE`, slow query log                  |

## Common Bottlenecks

### Database

- **N+1 queries**: batch load related data with `JOIN` or `IN` clause
- **Missing indexes**: add indexes on `WHERE`/`JOIN`/`ORDER BY` columns
- **Over-fetching**: `SELECT` only needed columns
- **Connection pool exhaustion**: tune pool size, release connections promptly
- **Lock contention**: reduce transaction scope, use optimistic locking

### Computation

- **Repeated computation**: memoize pure functions with stable inputs
- **Unnecessary serialization**: pass objects in-process instead of JSON round-trips
- **Blocking event loop**: move CPU-intensive work to worker threads
- **String allocation**: use `Cow<str>` (Rust), `StringBuilder` (Java), buffer reuse

### Memory

- **Leaks**: event listeners not removed, caches growing without eviction
- **Large object graphs**: stream large datasets instead of loading all at once
- **Frequent GC**: reduce allocation rate in hot paths, use object pools
- **Copying**: use references/borrows instead of cloning large structures

## Caching Strategies

Cache at the right layer:

1. **In-process** — fastest, not shared across instances
2. **Redis/Memcached** — shared, survives restarts
3. **CDN** — static assets and cacheable API responses

Cache invalidation rules:

- Set explicit TTL — no permanent caches
- Invalidate on write
- Cache stampede protection: probabilistic early expiration or locks
- Log cache hit rates — a cache with <80% hit rate needs rethinking

## Frontend Performance

- **Bundle size**: code splitting, tree-shaking, analyze with source-map-explorer
- **Images**: WebP/AVIF format, lazy load below-the-fold content
- **Critical path**: inline critical CSS, defer non-critical JS
- **Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1

## Optimization Checklist

Before optimizing, answer:

1. Is this actually slow? (measure, don't guess)
2. Where is the time spent? (profile, find the hotspot)
3. What's the simplest fix? (algorithm change > micro-optimization)
4. Does the fix maintain correctness? (benchmark + test together)
