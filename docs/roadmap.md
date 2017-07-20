## Planned Links

### Terminating:

* Websocket: subscriptions support
* Batching-\*: support for batching operations with a transport

### Intermediate:

* Caching: returns data if result in the cache and stores data in cache on response
* Catch: catch all errors and modify the Observable to return something else
* Dedup: saves query signatures that are currently on the wire and returns the result for all of those queries
* Batch: batches operations then performs a function on the batched operations

### Adapter (not a Link):

* Backwards-compatibility Wrapper: exposes `query`, `mutate`, and `subscribe`

## Use Cases Informing Future Development

Apollo Links are designed to be used as an isomorphic stand-alone extensible GraphQL client.
In addition, links fit all current and anticipated needs of Apollo Client.
As such, links are targeted towards the following use-cases:

* Do a simple GraphQL query with it that resolves only once
* Do a simple GraphQL mutation that resolves only once
* Do a subscription
* Do a GraphQL query that contains @defer, @stream or @live
  * Support custom annotations, such as @connection

<br>

* Modify query, variables, operationName and context
  * Use persistent queries
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
* Route operations to alternate endpoints
  * Partial operations to REST endpoint
  * Partial operations to GraphQL endpoint
  * Partial operations to Mock
* Split single operation into multiple operations
  * Race one operation to local storage and another to network
* Per request retries based on network status or response
* Polling
* Batching at the transport/fetch layer
  * Perform batch operations within a composed link
* Deduplicate of on-the-wire requests
* Re-route and modify errors
  * transform network error into GraphQL error

<br>

* Network layer caching
  * Denormalized
  * Normalized
  * Local Storage
  * IndexDB
  * Native iOS bridge

<br>

* Offline data management
  * Local client state
    * local mutations
    * local queries
  * Partial local queries

If you think of more use-cases, please open a PR adding to this list and make sure to clearly explain your use-case.

## Open questions, discussion

Throughout the design process, a couple questions have surfaced that may prompt conversation.
If you want to see something here, please open a PR with your proposed change or an Issue for discussion.

### Should we include `status()` the Link interface that could contain user defined data and an enum for state?

```js
enum State {
  cold
  started
  stopped
  errored
  completed
}
```

If `status` exists and an `Observable` has terminated, should `subscribe` throw an error or call complete immediately, avoiding memory leaks.

### Which convenience functions would you like?

The current functions provided:

* ApolloLink
  * makePromise

Proposed additions include:

* Pull information from the Operation as part of `Operation` or `LinkUtil` library
  * hasQuery
  * hasMutation
  * hasSubscription
  * getQuery
  * getMutation
  * getSubscription
  * annotation support?

### Should Link include some form of synchronous adapter/behavior? What use cases warrant this?

Currently, everything in `apollo-link` is asynchronous.
There have been some abstract thoughts around providing some sort of synchronous adapter or cache.
Use cases and other thoughts are encouraged!
