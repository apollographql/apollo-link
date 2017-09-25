# HTTP Link

## Purpose
An Apollo Link to allow sending a single http request per operation.

## Installation

`npm install apollo-link-http --save`

To use this package in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.

## Usage
```js
import HttpLink from "apollo-link-http";

const link = new HttpLink({ uri: "/graphql" });
```

## Options
HTTP Link takes an object with three options on it to customize the behavoir of the link. If your server supports it, the HTTP link can also send over metadata about the request in the extensions field. To enable this, pass includeExtensions as true

|name|value|default|required|
|---|---|---|---|
|uri|string|"/graphql"|false|
|includeExtensions|boolean|false|false|
|fetch|ApolloFetch|ApolloFetch|false|

By default, this link uses the [Apollo Fetch](https://github.com/apollographql/apollo-fetch) library for the HTTP transport.

## Context
The HTTP Link uses the `headers` field on the context to allow passing headers to the HTTP request.

|name|value|default|required|
|---|---|---|---|
|headers|Headers (or object)|{}|false|

```js
import HttpLink from "apollo-link-http";
import ApolloClient from "apollo-client";
import InMemoryCache from "apollo-cache-inmemory";

const client = new ApolloClient({
  link: new HttpLink({ uri: "/graphql" }),
  cache: new InMemoryCache()
});

// a query with apollo-client
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
