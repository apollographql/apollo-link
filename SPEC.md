## Apollo Fetchers

The purpose of apollo-fetcher is to define an extensible standard interface for fetching GraphQL results. To that end, apollo-fetcher describes an interface containing a single method that connects a GraphQL `Operation` (also called request), to an `Observable` which delivers the results of the operation. Operations that return a single result can easily be mapped to a promise, since the observable's `next` function is called only once. In the general case, Apollo Fetcher uses observables to support GraphQL subscriptions and live queries. The apollo-fetcher's `Observable` follows the ECMAScript [proposal](https://github.com/tc39/proposal-observable). A basic fetcher is visualized as follows:

<p align="center">
  <br>
  <img src="images/apollo-fetcher.png" alt="Apollo Fetcher"/>
</p>

Apollo Fetchers are designed to be used as an isomorphic stand-alone extensible GraphQL client. In addition, fetchers fit all current and anticipated needs of Apollo Client. As such, fetchers are targetted towards the following use-cases:

* Do a simple GraphQL query with it that resolves only once
* Do a simple GraphQL mutation that resolves only once
* Do a subscription
* Do a GraphQL query that contains @defer, @stream or @live
  * Support custom annotations, such as @connection

<br>

* Modify headers as middleware currently does
  * Add authenication headers
* Modify query, variables, operationName and context
  * Use persistent queries
* Support afterware to modify response or add side effects
  * Log queries
  * Perform analytics
  * Logout on 401
* Include extra metadata to server along with queries
  * Include component sending query
  * Send time stamp of query leaving transport
* Receive extra metadata with the query result
  * Send caching information

<br>

* Use HTTP transport, websocket transport, hybrid transport
* Use alternative transports
  * File System
  * DDP
* Mock partial or full response
* Route of requests to alternate endpoints
  * Partial requests to REST endpoint
  * Partial requests to Mock
* Split single request into multiple requests
  * one request to local storage and
* Per request retries based on network status or response
* Polling
* Batching at the transport layer
* Deduplicate on-the-wire requests

<br>

* Network layer caching
  * Denormalized
  * Normalized
  * Local Storage

If you can think of more use-cases, please open a PR adding to this list and make sure to clearly explain your use-case.

In order to support all these use cases with a simple fetcher design, we want to use a modular architecture that composition of fetchers to stack functionality. An Intermediate Fetcher that modifies the operation passed down or the response received is represented below:

<p align="center">
  <br>
  <img src="images/generic-stack.png" alt="Generic Fetcher Stack"/>
</p>


## Examples

http-fetcher sends an operation over HTTP to a server at a constructor specified URI. Additionally, the constructor accepts an optional fetch function and defaults to isomorphic-fetch. A custom fetch function would contain the HTTP specific behavior normally found in middleware or afterware. In this manner, http-fetcher can function as a stand-alone GraphQL client:

<p align="center">
  <br>
  <img src="images/http-fetcher.png" alt="Http Fetcher"/>
</p>

```js
const httpFetcher = new HTTPFetcher({ uri: 'http://api.githunt.com/graphql' });

const responseObservable = httpFetcher.request({
  query,
  variables,
  operationName,
  context,
});

responseObservable.subscribe({
  next(data){ console.log('received data', data); },
  error(error){ console.error(error); },
  complete(){ console.error('request complete'); },
});
```

To illustrate composing fetchers, a polling fetcher can send a query operation to an http fetcher on a specified interval. Each request is routed through the http fetcher and returned through the observable from the polling fetcher. Using this type of delegation, fetchers of discrete functionality can form stacks.

<p align="center">
  <br>
  <img src="images/polling-stack.png" alt="Polling Fetcher Stack"/>
</p>


```js
const pollingFetcher = new PollingFetcher(
  10000, //Polling Interval in ms
  new HTTPFetcher({ uri: 'http://api.githunt.com/graphql' })
);
```

In addition to the query, operationName, and variables, `Operation` includes a context, which is modified and passed down the stack of fetchers. In addition, this context is sent to the server to through the query body. In this example, `context` is used by a polling fetcher to tell a caching fetcher whether a request should be returned from the cache or the network.

<p align="center">
  <br>
  <img src="images/context.png" alt="Context Passing Stack Example"/>
</p>

## API

The fetcher interface contains a single method:

```js
ApolloFetcher{
  request: (Operation) => Observable<FetchResult>
}
```

An `Operation` contains all the information necessary to execute a GraphQL query, including the GraphQL AST:

```js
Operation {
  query: DocumentNode,
  operationName: string,
  variables: object,
  context: object,
}
```

An `Observable` is returned from `request` and notifies a `Subscriber` on the life-cycle of a GraphQL request:

```js
Observable{
  //Causes the underlying producer to start
  subscribe: (Subscriber<FetchResult>) => UnsubscribeHandler
  subscribe: (
    next: (FetchResult) => void,
    error: (any) => void,
    complete: () => void,
  ) => Subscription
```

A `Subscriber` is passed to `subscribe`

```js
Subscriber<T>{
  next?: (T) => void,
  error?: (any) => void,
  complete?: () => void,
}
```

`Subscription` is returned from `subscribe`.
`closed` returns if this `Subscription` is terminated by an `unsubscribe`, `complete`, or `error`

```js
Subscription {
    unsubscribe: () => void;
    get closed: () => boolean;
}
```

`FetchResult` is passed to the `next` callback of `Subscriber`

```js
FetchResult{
  data?: object,
  errors?: object[],
  extensions?: any,
  context?:object,
}
```

## More examples

Here is a list of planned fetchers with selected diagrams:

Base:

* Websocket: subscriptions support
* Batching-\*: support for batching operations with a transport

<p align="center">
  <br>
  <img src="images/batch-fetcher.png" alt="Batch Fetcher"/>
</p>

Intermediate:

* Polling: repeats requests on a specified interval

<p align="center">
  <br>
  <img src="images/polling-fetcher.png" alt="Polling Fetcher"/>
</p>

* Caching: returns data if result in the cache and stores data in cache on response
* Compose: combines a list of fetchers (would require additional semantics around constructor argument order)
* Dedup: saves query signatures that are currently on the wire and returns the result for all of those queries
* Retry: error callback causes the request to retry
* Mock: returns fake data for all or part of a request ← implement with BaseFetcher (eg. executes `graphql`)

Fork:

* Split: split operations between fetchers depending on a function passed in
* Hybrid: uses split-fetcher to fill query and mutations with http and subscriptions with websockets

<p align="center">
  <br>
  <img src="images/hybrid-fetcher.png" alt="Hybrid Fetcher"/>
</p>

Adapter (not a Fetcher):

* Promise Wrapper

<p align="center">
  <br>
  <img src="images/fetcher-as-promise.png" alt="Fetcher Promise Wrapper"/>
</p>

* Backwards-compatablility Wrapper: exposes `query`, `mutate`, and `subscribe`

## Open questions, discussion

Throughout the design process, a couple questions have surfaced that may prompt conversation. If you want to see something here, please open a PR with your proposed change or an Issue for discussion.

### How should we pass context to `next` callback along with the query data?

Should we pass the context from the response (for example relevant HTTP headers or status code) to the `next` callback of the observable like this:

```js
next({
  data,
  errors,
  extensions,
  context
})
```

or like this:

```js
next({
  result: {
    data,
    errors,
    extensions
  },
  context
})
```

### Should we include `status()` the Fetcher interface that could contain user defined data and an enum for state?

```js
enum State{
  cold
  started
  stopped
  errored
  completed
}
```

If `status` exists and an `Observable` has terminated, should `subscribe` throw an error or call complete immediately, avoiding memory leaks.

### Does the subscribe method need to be overloaded?

Currently the `subscribe` method has two different signatures, one that takes three functions `next`, `error`, and `complete` and antoher that takes a `Subscriber`.
Positional arguments are more prone to errors than passing object containing arguments.
The three function signature is present for compatability with GraphiQL.

The suggested behavior of dealing with the overload is found in `AbstractObservable`.

### Which convenience functions would you like?

The current functions provided:

* toSubscriber

Proposed additions include:

* Pull information from the Operation as part of `Operation` or `FetcherUtil` library
  * hasQuery
  * hasMutation
  * hasSubscription
  * getQuery
  * getMutation
  * getSubscription
  * annotation support?
* Observable additions as required or optional part of interface and implemented in `AbstractObservable`
  * `map`
  * `filter`
  * `catch`
  * `finally`
* Library to compose fetchers together ex: `Fetcher.of(httpFetcher).concat(pollingFetcher)` or `Fetcher.first(pollingFetcher).next(httpFetcher)`
  * [original proposal](https://github.com/apollographql/apollo-fetcher/pull/6#discussion_r122868492)
  * [spliting wtih a filter](https://github.com/apollographql/apollo-fetcher/pull/6#discussion_r122869654)
  * [another splitting option](https://github.com/apollographql/apollo-fetcher/pull/6#issuecomment-310239651)

### Should GraphQL errors be propagated up the stack with `next` or `error`?

Currently GraphQL errors are returned as data to `next`.
In the case of a network error, `error` is called.

### Should Fetcher be functions or classes with wrapped constructors?

```js
const httpFetcher = HttpFetcher({uri: 'localhost'});
//or
const httpFetcher = new HttpFetcher({uri: 'localhost'});
const httpFetcher = createHttpFetcher({uri: 'localhost'});
```

