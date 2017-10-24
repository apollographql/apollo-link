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
