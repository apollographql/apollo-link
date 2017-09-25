# Dedup Link

## Purpose
An Apollo Link to deduplicate matching requests before making a request.

*NOTE* This link is included by default when using apollo-client.

## Installation

`npm install apollo-link-dedup --save`

To use this package in a web browser or mobile app, you'll need a build system capable of loading NPM packages on the client.
Some common choices include Browserify, Webpack, and Meteor +1.3.

## Usage
```js
import DedupLink from "apollo-link-dedup";

const link = new DedupLink();
```

## Options
The Dedup Link does not take any options when creating the link.

## Context
The Dedup Link can be overriden by using the context on a per opearation basis:

|name|value|default|required|
|---|---|---|---|
|forceFetch|boolean|false|false|

```js
import Link from "apollo-link-http";
import ApolloClient from "apollo-client";
import InMemoryCache from "apollo-cache-inmemory";

const client = new ApolloClient({
  link: new Link({ uri: "/graphql" }),
  cache: new InMemoryCache()
});

// a query with apollo-client that will not be deduped
client.query({
  query: MY_QUERY,
  context: {
    forceFetch: true
  }
})
```


