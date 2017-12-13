---
title: Retry Link
---

## Purpose

An Apollo Link to allow multiple attempts when an operation has failed, due to network or server errors. `RetryLink` provides exponential backoff, and jitters delays between attempts by default. It does not (currently) support retries for GraphQL errors.

One such use case is to try a request while a network connection is offline and retry until it comes back online.

## Installation

```sh
npm install apollo-link-retry --save
```

## Usage

```ts
import { RetryLink } from "apollo-link-retry";

const link = new RetryLink();
```

## Options

The standard retry strategy provides exponential backoff with jittering, and takes the following options, grouped into `delay` and `attempt` strategies:

- `delay.initial`: The number of milliseconds to wait before attempting the first retry.

- `delay.max`: The maximum number of milliseconds that the link should wait for any retry.

- `delay.jitter`: Whether delays between attempts should be randomized.

- `attempts.max`: The max number of times to try a single operation before giving up.

- `attempts.retryIf`: A predicate function that can determine whether a particular response should be retried.

The default configuration is equivalent to:

```ts
new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => !!error,
  },
});
```

### On Exponential Backoff & Jitter

Starting with `initialDelay`, the delay of each subsequent retry is increased exponentially (by a power of 2).  For example, if `initialDelay` is 100, additional retries will occur after delays of 200, 400, 800, etc.

Additionally, with `jitter` enabled, delays are randomized anywhere between 0ms (instant), and 2x the configured delay so that, on average, they should occur at the same intervals.

These two features combined help alleviate [the thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem), by distributing load during major outages.

### Custom Strategies

Instead of the options object, you may pass a function for `delay` and/or `attempts`, which implement custom strategies for each.  In both cases the function is given the same arguments (`count`, `operation`, `error`).

The `attempts` function should return a boolean indicating whether the response should be retried.  If yes, the `delay` function is then called, and should return the number of milliseconds to delay by.

```ts
import { RetryLink } from "apollo-link-retry";

const link = new RetryLink(
  attempts: (count, operation, error) => {
    return !!error && operation.operationName != 'specialCase';
  },
  delay: (count, operation, error) => {
    return count * 1000 * Math.random();
  },
});
```

## Context
The Retry Link does not use the context for anything.
