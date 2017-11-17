---
title: Error Link
---

## Purpose
An Apollo Link to allow sending error events to custom services or loggers.

## Installation

`npm install apollo-link-error --save`

## Usage
```js
import { onError } from "apollo-link-error";

const link = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  if (networkError) console.log(`[Network error]: ${networkError}`);
})
```

## Options
Error Link takes a function that is called in the event of an error. This function is called with an object containing the following keys:
- `operation`: The Operation that errored
- `response`: The Execution of the reponse
- `graphQLErrors`: An array of errors from the GraphQL endpoint
- `networkError`: any error during the link execution or server response

*Note*: `networkError` is the value from the downlink's `error` callback. In most cases, `graphQLErrors` is the `errors` field of the result from the last `next` call. A `networkError` can contain additional fields, such as a GraphQL object in the case of a [failing HTTP status code](http.html#Errors) from [`apollo-link-http`](http.html). In this situation, `graphQLErrors` is an alias for `networkError.result.errors` if the property exists.

### Ignoring errors
If you want to conditionally ignore errors, you can set `response.errors = null;` within the error handler:

```js
onError(({ response, operation }) => {
  if (operation.operationName === "IgnoreErrorsQuery") {
    response.errors = null;
  }
})
```

## Context
The Error Link does not use the context for anything
