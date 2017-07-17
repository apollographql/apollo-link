## Apollo Link

Apollo Link is an extensible standard interface for modifying control flow of GraphQL queries and fetching GraphQL results.

## Basic Usage

Links can be used as a stand-alone client or with most major GraphQL clients.

### Stand-alone

`execute` accepts a standard GraphQL reqeust with a query string or AST.
`execute` returns an [Observable](https://github.com/zenparsing/zen-observable#api) that can be subscribed to.
Links use observables to support GraphQL subscriptions and live queries, in addition to single response queries and mutations.

```js
import {
  execute,
  HttpLink,
} from 'apollo-link';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({ uri });

execute(link, operation).subscribe({
  next: data => console.log(`received data ${data}`),
  error: error => console.log(`received errro ${error}`),
  complete: () => console.log(`complete`),
})
```

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

Attempts to resends a GraphQL request when failed and fails after a certain time

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

Adds authentication headers, using the context

```js
import {
  ApolloLink,
  execute,
  HttpLink,
  SetContextLink,
} from 'apollo-link'

const uri = 'http://api.githunt.com/graphql';
const context = {
  headers: {
    auth: 'token',
  },
};

const link = ApolloLink.from([
  new SetContextLink(context),
  new HttpLink({ uri });
])

<GraphiQL fetcher={(operation) => execute(link, operation)}/>,
```

### Retry Authenticated Operation

const link = ApolloLink.from([
  new RetryLink(),
  new SetContextLink(context),
  new HttpLink({ uri });
])

### Polling

const link = ApolloLink.from([
  new PollingLink({ pollInteval: 5000 }),
  new HttpLink({ uri });
])

## External API and Currently Supported Links

### execute

```js
execute(
  link: ApolloLink
  operation: {
  query: DocumentNode | string,
  operationName?: string
  variables?: object
  context?: object
  },
)
```

### HttpLink

```js
new HttpLink({ uri, fetch });
```

* `uri` is the GraphQL endpoint, defaults to `/graphql`
* `fetch` is a custom fetch function, defaults to `ApolloFetch`

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
* `interval(delay, count)` calculates the time defaults to returning `delay`

### SetContextLink

```js
new SetContextLink( context );
```

* `context` sets the context of the operation, which other links can access

### MockLink

```js
new MockLink( requestHandler );
```

* `requestHandler(operation)` returns an Observable of the result

