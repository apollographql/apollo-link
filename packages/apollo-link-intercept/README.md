---
title: apollo-link-intercept
description: Intercept data and errors from links further in the chain
---

Use this link to respond to results and/or errors from a link further in the chain. Use cases include:

- logging or recording metrics on successful and failed GraphQL operations
- treating certain results as errors, or errors as successful results
- retrying failed operations (see [apollo-link-retry](../apollo-link-retry))

<h2 id="example">Example</h2>

Here’s an example of using `apollo-link-intercept` and [`hot-shots`](https://www.npmjs.com/package/hot-shots) to record statistics on GraphQL operations:

```js
import { ApolloLink } from "apollo-link";
import { interceptLink } from "apollo-link-intercept";
import StatsD from "hot-shots";

const statsd = new StatsD();

const intercept = interceptLink(operation => {
  const startTime = Date.now()
  const tags = [`operation:${operation.operationName}`]

  return {
    next(result, { next }) {
      let duration = Date.now() - startTime
      let hasError = result.errors && result.errors.length > 0
      statsd.timing('graphql.response.time', duration, tags.concat([`error:${error}`]))
      next(result)
    },

    error(err, { error }) {
      let duration = Date.now() - startTime
      statsd.timing('graphql.response.time', duration, tags.concat(['error:yes']))
      error(err)
    },
  }
})

export default ApolloLink.of([
  intercept,
  http, // a link you set up that actually talks to your GraphQL server
])
```
