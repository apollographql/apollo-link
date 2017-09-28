# Batch HTTP Link

## Purpose
An Apollo Link to allow batching of multiple operations into a single http request. Instead of sending a single operation, it sends an array of operations to the server.

## Installation

`npm install apollo-link-batch-http --save`

## Usage
```js
import BatchLink from "apollo-link-batch-http";

const link = new BatchLink({ uri: "/graphql" });
```

## Options
Batch HTTP Link takes an object with four options on it to customize the behavoir of the link.

|name|value|default|required|
|---|---|---|---|
|uri|string|"/graphql"|false|
|batchMax|number|10|false|
|batchInterval|number|10|false|
|fetch|ApolloFetch|ApolloFetch|false|

By default, this link uses the [Apollo Fetch](https://github.com/apollographql/apollo-fetch) library for the HTTP transport.

## Context
The Batch HTTP Link uses the `headers` field on the context to allow passing headers to the HTTP request.

|name|value|default|required|
|---|---|---|---|
|headers|Headers (or object)|{}|false|

```js
import BatchLink from "apollo-link-batch-http";
import ApolloClient from "apollo-client";
import InMemoryCache from "apollo-cache-inmemory";

const client = new ApolloClient({
  link: new BatchLink({ uri: "/graphql" }),
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
