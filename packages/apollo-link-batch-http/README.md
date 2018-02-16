---
title: apollo-link-batch-http
description: Batch multiple operations into a single HTTP request
---

`apollo-link-batch-http` is a terminating link that combines multiple GraphQL
operations into a single HTTP request. This link batches together individual
operations into an array that is sent to a single GraphQL endpoint.

```js
import { createBatchHttpLink } from "apollo-link-batch-http";

const link = createBatchHttpLink({ uri: "/graphql" });
```

<h2 id="options">Options</h2>

The batch http link accpets an object with some options to customize the behavior
of the link. There are two different categories of options: http and batch. The
http options follow the same structure as the
[apollo-link-http](http.html#options):

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
- `batchKey`: a function that accepts an operation and returns a string key,
  which uniquely names the batch the operation belongs to, defaults to
  returning the same string

<h2 id="fetch">Fetch polyfill</h2>

The batch http link relies on having `fetch` present in your runtime environment. If you are running on react-native, or modern browsers, this should be no problem. If you are targeting an environment without `fetch` such as older browsers of the server, you will need to pass your own `fetch` to the link through the options. We recommend [`unfetch`](https://github.com/developit/unfetch) for older browsers and [`node-fetch`](https://github.com/bitinn/node-fetch) for running in Node.

<h2 id="context">Context</h2>

The Batch Http Link currently uses the context in two different ways, per batch
and per query. The context fields below are used per batch and taken from the first
operation in the batch. They are applied to the fetch options in a similar
manner as [apollo-link-http](http.html#context).

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

The batch http link supports an advanced GraphQL feature called persisted queries. This allows you to not send the stringified query over the wire, but instead send some kind of identifier of the query. To support this you need to attach the id somewhere to the extensions field and pass the following options to the context:

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

<h2 id="error">Errors</h2>

The batch http link handles errors on a per batch basis with the same semantics found in [apollo-link-http](http.html#error):

<h2 id="custom">Custom fetching</h2>

You can use the `fetch` option when creating an http-link to do a lot of custom networking. This is useful if you want to modify the request based on the headers calculated, send the request as a 'GET' via a query string, or calculate the uri based on the operation:

<h3 id="get-request">Sending a GET request</h3>

```js
const customFetch = (uri, options) => {
  const { body, ...newOptions } = options;
  // turn the object into a query string, try `object-to-querystring` package
  const queryString = objectToQuery(JSON.parse(body));
  requestedString = uri + queryString;
  return fetch(requestedString, newOptions);
};
const link = createBatchHttpLink({
  uri: "data",
  fetchOptions: { method: "GET" },
  fetch: customFetch
});
```

<h3 id="custom-auth">Custom auth</h3>

```js
const customFetch = (uri, options) => {
  const { header } = Hawk.client.header(
    "http://example.com:8000/resource/1?b=1&a=2",
    "GET",
    { credentials: credentials, ext: "some-app-data" }
  );
  options.headers.Authorization = header;
  return fetch(uri, options);
};

const link = createBatchHttpLink({ fetch: customFetch });
```

<h3 id="dynamic-uri">Dynamic URI</h3>

```js
const customFetch = (uri, options) => {
  const operationNames = JSON.parse(options.body).map(operation => operation.operationName);
  return fetch(`${uri}/graph/graphql?opname=${operationNames}`, options);
};

const link = createBatchHttpLink({ fetch: customFetch });
```
