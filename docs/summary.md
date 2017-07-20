## Apollo Link

Apollo Link is an extensible standard interface for modifying control flow of GraphQL queries and fetching GraphQL results.

## Basic Usage

Links can be used as a stand-alone client or with most major GraphQL clients.

```js
import {
  execute,
  HttpLink,
} from 'apollo-link';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({ uri });

execute(link, operation).subscribe({
  next: data => console.log(`received data ${data}`),
  error: error => console.log(`received error ${error}`),
  complete: () => console.log(`complete`),
})

//For single execution operations, a Promise can be used
makePromise((execute(link, operation))
  .then(data => console.log(`received data ${data}`))
  .catch(error => console.log(`received error ${error}`))
```

`execute` accepts a standard GraphQL request with a query string or AST and returns an [Observable](https://github.com/zenparsing/zen-observable#api) that allows subscribing.
Links use observables to support GraphQL subscriptions, live queries, and polling, in addition to single response queries and mutations.

`next` will receive GraphQL errors, while `error` be called on a network error.

### Apollo Client

Links can be used as a replacement for the current network interface.

```js
import {
  execute,
  HttpLink,
} from 'apollo-link';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({uri});

const client = new ApolloClient({
  networkInterface: link,
});
```

The `HttpLink` constructor accepts an optional fetch function and defaults to an `ApolloFetch` from [apollo-fetch](https://github.com/apollographql/apollo-fetch).
Additionally, `ApolloFetch` provides a transition point for middleware and afterware.

### GraphiQL

GraphiQL provides a simple way of testing a link.

```js
import React from 'react';
import ReactDOM from 'react-dom';
import '../node_modules/graphiql/graphiql.css'
import GraphiQL from 'graphiql';

import {
  execute,
} from 'apollo-link';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({uri});

ReactDOM.render(
  <GraphiQL fetcher={(operation) => execute(link, operation)}/>,
  document.body,
);
```

If using `create-react-app`, your `index.js` would look similar to above.

## Adding Functionality

Links can composed together to form a new link using `ApolloLink.from`.

### Retry

Attempts to resend a GraphQL request when a network error is received and calls error after a number of retries.

```js
import {
  ApolloLink,
  execute,
  HttpLink,
  RetryLink,
} from 'apollo-link'

const uri = 'http://api.githunt.com/graphql';

const link = ApolloLink.from([
  new RetryLink();
  new HttpLink({ uri });
])

<GraphiQL fetcher={(operation) => execute(link, operation)}/>,

const client = new ApolloClient({
  networkInterface: link,
});
```

### Authentication

In this example, `SetContextLink` adds headers to the `operation`'s context property.
`HttpLink` reads the context and adds authentication headers.

```js
import {
  ApolloLink,
  execute,
  HttpLink,
  SetContextLink,
} from 'apollo-link'

const uri = 'http://api.githunt.com/graphql';
const setContext = (context) => {
  ...context,
  headers: {
    ...context.headers,
    auth: 'token',
  },
};

const link = ApolloLink.from([
  new SetContextLink(setContext),
  new HttpLink({ uri });
])

<GraphiQL fetcher={(operation) => execute(link, operation)}/>,
```

## More Examples of Link Combinations

### Polling

This combination polls requests on `pollInterval`.

```js
const link = ApolloLink.from([
  new PollingLink({ pollInterval: 5000 }),
  new HttpLink({ uri });
])
```

### Retrying an Authenticated Operation

```js
const link = ApolloLink.from([
  new RetryLink(),
  new SetContextLink(setContextHeaders),
  new HttpLink({ uri });
])
```

`setContextHeaders` applies the authorization token to `headers` in the Operation's context.

## External API

### execute

```js
execute(
  link: ApolloLink
  operation: {
    query: DocumentNode | string,
    operationName?: string
    variables?: Record<string, any>
    context?: Record<string, any>
  },
) => Observable<FetchResult>
```

### makePromise

```js
makePromise(observable) => Promise<FetchResult>
```

### FetchResult

Contains `data` and `errors` that follow GraphQL's standard `ExecutionResult` and `extensions` and `context`.

```js
FetchResult {
  data: { [key: string]: any }
  errors: GraphQLError[]
  extensions: Record<string, any>
  context: Record<string, any>
}
```

## Currently Supported Links

### HttpLink

```js
new HttpLink({ uri, fetch });
```

* `uri` is the GraphQL endpoint, defaults to `/graphql`
* `fetch(request, options)` is a custom fetch function, defaults to `ApolloFetch`

`HttpLink` checks for `headers` on the context and adds them to the fetch options.

### PollingLink

```js
new PollingLink({ interval });
```

* `interval` is the polling interval

### RetryLink

```js
new RetryLink({ max, delay, interval });
```

* `max` is the maximum number of requests for an operation, defaults to 10
* `delay` is used to calculate the time between retries, defaults to 300
* `interval(delay, count) => number` calculates the time between retries, defaults to returning `delay`

### SetContextLink

```js
new SetContextLink( setContext );
```

* `setContext(context)` sets the context of the operation, which the next links can access
