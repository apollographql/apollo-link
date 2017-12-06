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

The standard retry strategy provides exponential backoff with jittering, and takes the following options:

- `initialDelay`: The number of milliseconds to wait before attempting the first retry, with a default of `300`.

- `maxDelay`: The maximum number of milliseconds that the link should wait for any retry, with a default of `Infinity`.

- `maxTries`: The max number of times to try a single operation before giving up, with a default of `5`.

- `jitter`: Whether delays between attempts should be randomized, with a default of `true`.

- `retryIf`: A predicate function that can determine whether a particular response should be retried.  By default, any response with an `error` is retried.

### On Exponential Backoff & Jitter

Starting with `initialDelay`, the delay of each subsequent retry is increased exponentially (by a power of 2).  For example, if `initialDelay` is 100, additional retries will occur after delays of 200, 400, 800, etc.

Additionally, with `jitter` enabled, delays are randomized anywhere between 0ms (instant), and 2x the configured delay so that, on average, they should occur at the same intervals.

These two features combined help alleviate [the thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem), by distributing load during major outages.

### Advanced Mode

Instead of the options object, you may pass a function that provides full control over whether and how a particular error response should be retried.

```ts
import { RetryLink } from "apollo-link-retry";

const link = new RetryLink((count, operation, error) => {
  // Return false if you want to stop retrying this operation.
  //
  // Or, alternatively, return the number of milliseconds that it should be
  // retried after.
});
```

## Context
The Retry Link does not use the context for anything.
