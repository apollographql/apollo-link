# Error Link

## Purpose
An Apollo Link to allow sending error events to custom services or loggers.

## Installation

`npm install apollo-link-error --save`

## Usage
```js
import { onError } from "apollo-link-error";

const link = onError(({ graphqlErrors, networkError }) => {
  console.error({ graphqlErrors, networkError });
})
```

## Options
Error Link takes a function that is called in the event of an error.

## Context
The Error Link does not use the context for anything
