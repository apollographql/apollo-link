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

const link = new DedupLink();
```

## Options
The Dedup Link does not take any options when creating the link.

## Context
Deduplication is enabled by default when using apollo-client. It can be disabled globally in the client constructor options, and can be overridden by using the context on a per operation basis:
- `queryDeduplication`: a boolean to bypass the client-wide deduplication setting per request. If not provided, the client setting is used (defaults to true).

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
    queryDeduplication: false
  }
})
```
