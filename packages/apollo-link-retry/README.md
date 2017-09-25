# Retry Link

## Purpose
An Apollo Link to allow multiple attempts when an operation has failed. One such use case is to try a request while a network connection is offline and retry until it comes back online. Retry's can vary based on operation through the configuration of the link.

## Usage
```js
import RetryLink from "apollo-link-retry";

const link = new RetryLink();
```

## Options
Retry Link takes an object with three options on it to customize the behavoir of the link.

|name|value|default|required|
|---|---|---|---|
|max|number or Operation => number|10|false|
|delay|number or Operation => number|300|false|
|interval|(delay: number, count: number) => number|delay => delay|false|
```js
import RetryLink from "apollo-link-retry"

const max = (operation) => operation.getContext().max
const delay = 5000;
const interval = (delay, count) => {
  if (count > 5) return 10,000;
  return delay;
}

const link = new RetryLink({
  max,
  delay,
  interval
});
```

## Context
The Retry Link does not use the context for anything
