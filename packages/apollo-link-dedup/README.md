---
title: apollo-link-dedup
description: Deduplicate matching requests before making a request
---

*NOTE* This link is included by default when using apollo-client so you don't need to add it to your link chain if using apollo-client.

## Installation

`npm install apollo-link-dedup --save`

## Usage
```js
import { DedupLink } from "apollo-link-dedup";

const link = new DedupLink({ useContext: true });
```

## Options

The Dedup Link takes an optional object with the following options:

* `useContext`: if true, uses the operation context when determining uniqueness
for deduping requests. This is useful to avoid accidental deduping of identical
requests that have different per-request headers (e.g. auth headers). Defaults
to false.

## Context
The Dedup Link can be overridden by using the context on a per operation basis:
- `forceFetch`: a true or false (defaults to false) to bypass deduplication per request

```js
import { createHttpLink } from "apollo-link-http";
import ApolloClient from "apollo-client";
import InMemoryCache from "apollo-cache-inmemory";

const client = new ApolloClient({
  link: createHttpLink({ uri: "/graphql" }),
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
