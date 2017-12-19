---
title: apollo-link-error
description: Handle and inspect errors in your GraphQL network stack.
---

Use this link to do some custom logic when a GraphQL or network error happens:

```js
import { onError } from "apollo-link-error";

const link = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  if (networkError) console.log(`[Network error]: ${networkError}`);
});
```

Apollo Link is a system of modular components for GraphQL networking. [Read the docs](https://www.apollographql.com/docs/link/#usage) to learn how to use this link with libraries like Apollo Client and graphql-tools, or as a standalone client.

<h2 id="callback">Callback</h2>

Error Link takes a function that is called in the event of an error. This function is called with an object containing the following keys:

* `operation`: The Operation that errored
* `response`: The result returned from lower down in the link chain
* `graphQLErrors`: An array of errors from the GraphQL endpoint
* `networkError`: Any error during the link execution or server response, that wasn't delivered as part of the `errors` field in the GraphQL result

<h2 id="error-categories">Error categorization</h2>

An error is passed as a `networkError` if a link further down the chain called the `error` callback on the observable. In most cases, `graphQLErrors` is the `errors` field of the result from the last `next` call.

A `networkError` can contain additional fields, such as a GraphQL object in the case of a [failing HTTP status code](http.html#Errors) from [`apollo-link-http`](http.html). In this situation, `graphQLErrors` is an alias for `networkError.result.errors` if the property exists.

<h2 id="ignoring-errors">Ignoring errors</h2>

If you want to conditionally ignore errors, you can set `response.errors = null;` within the error handler:

```js
onError(({ response, operation }) => {
  if (operation.operationName === "IgnoreErrorsQuery") {
    response.errors = null;
  }
});
```
