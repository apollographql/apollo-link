---
title: apollo-link-batch-http
description: Batch multiple operations into a single HTTP request
---

**Note: This package will be updated to remove the dependency on apollo-fetch an use the same options / API as the http-link**

`apollo-link-batch-http` batches multiple operations into a single HTTP request. Instead of sending a single operation, it sends an array of operations to the server.

## Installation

`npm install apollo-link-batch-http --save`

## Usage
```js
import { BatchHttpLink } from "apollo-link-batch-http";

const link = new BatchHttpLink({ uri: "/graphql" });
```

## Options
Batch HTTP Link takes an object with four options on it to customize the behavior of the link. The possible keys on this configuration object are:
- `uri`: a string of the server or a default of "/graphql"
- `batchMax`: a max number of items to batch, defaults at 10
- `batchInterval`: the interval at which to batch (in ms), defaults to 10
- `fetch`: an instance of ApolloFetch

By default, this link uses the [Apollo Fetch](https://github.com/apollographql/apollo-fetch) library for the HTTP transport.

## Context
The Batch HTTP Link uses the `headers` field on the context to allow passing headers to the HTTP request.

- `headers`: an object to be converted to headers for the http request

```js
import { BatchHttpLink } from "apollo-link-batch-http";
import ApolloClient from "apollo-client";
import InMemoryCache from "apollo-cache-inmemory";

const client = new ApolloClient({
  link: new BatchHttpLink({ uri: "/graphql" }),
  cache: new InMemoryCache()
});

// a query with apollo-client that will be batched
client.query({
  query: MY_QUERY,
  context: {
    // example of setting the headers with context per operation
    headers: {
      authoriztion: Meteor.userId()
    }
  }
})
```
