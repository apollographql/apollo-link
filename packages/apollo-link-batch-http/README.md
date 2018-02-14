---
title: apollo-link-batch-http
description: Batch multiple operations into a single HTTP request
---

`apollo-link-batch-http` batches multiple operations into a single HTTP
request. Instead of sending a single operation, it sends an array of operations
to the server. The behaviors around setting fetch options, using the context,
and handling errors are the same as [apollo-link-http](link/http.html#options)

```js
import { BatchHttpLink } from "apollo-link-batch-http";

const link = new BatchHttpLink({ uri: "/graphql" });
```

<h2 id="options">Options</h2>

Batch HTTP Link takes an object with some options on it to customize the
behavior of the link. There are two different categories of options: http and
batch. The http options follow the same structure as the [apollo-link-http](link/http.html#options):

* `uri`: the URI key is a string endpoint -- will default to "/graphql" if not
  specified
* `includeExtensions`: allow passing the extensions field to your graphql
  server, defaults to false
* `fetch`: a `fetch` compatiable API for making a request
* `headers`: an object representing values to be sent as headers on the request
* `credentials`: a string representing the credentials policy you want for the
  fetch call
* `fetchOptions`: any overrides of the fetch options argument to pass to the
  fetch call

The batching options indicate how operations are batched together, the size of
batches, and the maximum time a batch will wait before automatically being sent
over the network.

- `batchMax`: a max number of items to batch, defaults at 10
- `batchInterval`: the interval at which to batch (in ms), defaults to 10
- `batchKey`: a function that accepts an operation and returns the string key
  that specifies which batch the operation belongs to, defaults to returning
  the same string

<h2 id="context">Context</h2>

The batch http link currently uses the context in two different ways, per batch
and per query. The context fields below are used per batch and taken from the first
operation in the batch. They are applied to the fetch options in a similar
manner as [apollo-link-http](link/http.html#context).

* `headers`: an object representing values to be sent as headers on the request
* `credentials`: a string representing the credentials policy you want for the
  fetch call
* `uri`: a string of the endpoint you want to fetch from
* `fetchOptions`: any overrides of the fetch options argument to pass to the
  fetch call
* `response`: this is the raw response from the fetch request after it is made.

For each query, the `http` field is used to modify each individual query in the
batch, such as persisted queries (see below)

<h3 id="persisted-queries">Persisted queries</h3>

The http link supports an advanced GraphQL feature called persisted queries. This allows you to not send the stringified query over the wire, but instead send some kind of identifier of the query. To support this you need to attach the id somewhere to the extensions field and pass the following options to the context:

```js
operation.setContext({
  http: {
    includeExtensions: true,
    includeQuery: false,
  }
})
```

The `http` object on context currently supports two keys:

* `includeExtensions`: Send the extensions object for this request.
* `includeQuery`: Don't send the `query` field for this request.

One way to use persisted queries is with [apollo-link-persisted-queries](https://github.com/apollographql/apollo-link-persisted-queries) and [Apollo Engine](https://www.apollographql.com/docs/engine/auto-persisted-queries.html).
