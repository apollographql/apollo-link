# Error Link

## Purpose
An Apollo Link to allow sending error events to custom services or loggers.

## Installation

`npm install apollo-link-error --save`

## Usage
```js
import { onError } from "apollo-link-error";

const link = onError(({ graphQLErrors, networkError }) => {
  console.error({ graphQLErrors, networkError });
})
```

## Options
Error Link takes a function that is called in the event of an error. This function is called with an object containing the following keys:
- operation: The Operation that errored
- data: any data that returned alongside GraphQL errors
- graphQLErrors: any errors from the GraphQL endpoint
- networkError: any error during the link execution or server response

## Context
The Error Link does not use the context for anything
