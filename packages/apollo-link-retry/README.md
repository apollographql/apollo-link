# Retry Link

## Purpose
An Apollo Link to allow multiple attempts when an operation has failed. One such use case is to try a request while a network connection is offline and retry until it comes back online. You can configure a RetryLink to vary the number of times it retries and how long it waits between retries through its configuration.

## Installation

`npm install apollo-link-retry --save`

## Usage
```js
import RetryLink from "apollo-link-retry";

const link = new RetryLink();
```

## Options
Retry Link takes an object with three options on it to customize the behavior of the link.

Retry Link retries on network errors only, not on GraphQL errors.

The default delay algorithm is to wait `delay` ms between each retry. You can customize the algorithm (eg, replacing with exponential backoff) with the `interval` option.

|name|value|default|meaning|
|---|---|---|---|
|max|number or (Operation => number)|10|max number of times to try a single operation before giving up|
|delay|number or (Operation => number)|300|input to the interval function below|
|interval|(delay: number, count: number) => number|(delay, count => delay)|amount of time (in ms) to wait before the next attempt; count is the number of requests previously tried|
```js
import RetryLink from "apollo-link-retry";

const max = (operation) => operation.getContext().max;
const delay = 5000;
const interval = (delay, count) => {
  if (count > 5) return 10000;
  return delay;
}

const link = new RetryLink({
  max,
  delay,
  interval
});
```

## Context
The Retry Link does not use the context for anything.
