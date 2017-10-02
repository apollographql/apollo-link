# HTTP Link

## Purpose
An Apollo Link to allow sending a single http request per operation.

## Installation

`npm install apollo-link-http --save`

## Usage
```js
import { HttpLink } from "apollo-link-http";

const link = new HttpLink({ uri: "/graphql" });

// or
import { createHttpLink } from "apollo-link-http";

const link = createHttpLink({ uri: "/graphql" });
```

## Global Fetch
The HTTP Link relies on having `fetch` present in your runtime environment. If you are running on react-native, or modern browsers, this should be no problem. If you are targeting an environment without `fetch` such as older browsers of the server, you will need to pass your own `fetch` to the link through the options. We recommend `unfetch` for older browsers and `node-fetch` for running in node.

## Options
HTTP Link takes an object with three options on it to customize the behavior of the link. If your server supports it, the HTTP link can also send over metadata about the request in the extensions field. To enable this, pass `includeExtensions` as true.

|name|value|default|required|
|---|---|---|---|
|uri|string|"/graphql"|false|
|includeExtensions|boolean|false|false|
|fetch|fetch|global fetch|false|


## Context
The HTTP Link uses the `headers` field on the context to allow passing headers to the HTTP request. It also supports the `credentials` field for defining credentials policy for fetch and `fetchOptions` to allow generic fetch overrides (i.e. method: "GET").

|name|value|default|required|
|---|---|---|---|
|headers|Headers (or object)|{}|false|
|credentials|string|none|false|
|fetchOptions|Fetch Options (object)|none|false|

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
      authorization: Meteor.userId()
    }
  }
})
```

### Upgrading from `apollo-fetch` / `apollo-client` 
If you previously used either `apollo-fetch` or `apollo-client`, you will need to change the way `use` and `useAfter` are implemented in your app. They can both be implemented in a link like so:

#### Middleware

*Before*
```js
// before
import ApolloClient, { createNetworkInterface } from 'apollo-client';

const networkInterface = createNetworkInterface({ uri: '/graphql' });

networkInterface.use([{
  applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};  // Create the header object if needed.
    }
    req.options.headers['authorization'] = localStorage.getItem('token') ? localStorage.getItem('token') : null;
    next();
  }
}]);

```

*After*
```js
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';

const httpLink = createHttpLink({ uri: '/graphql' });
const middlewareLink = new ApolloLink((operation, forward) => {
  operation.setContext({
    headers: {
      authorization: localStorage.getItem('token') || null
    }
  });
  return forward(operation)
})

// use with apollo-client
const link = middlewareLink.concat(httpLink);
```

#### Afterware (error)

*Before*
```js
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { logout } from './logout';

const networkInterface = createNetworkInterface({ uri: '/graphql' });

networkInterface.useAfter([{
  applyAfterware({ response }, next) {
    if (response.status === 401) {
      logout();
    }
    next();
  }
}]);
```
*After*

```js
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { onError } from 'apollo-link-error';

import { logout } from './logout';

const httpLink = createHttpLink({ uri: '/graphql' });
const errorLink = onError(({ networkError }) => {
  if (networkError.status === 401) {
    logout();
  }
})

// use with apollo-client
const link = errorLink.concat(httpLink);
```

#### Afterware (data manipulation)
*Before*
```js
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { logout } from './logout';

const networkInterface = createNetworkInterface({ uri: '/graphql' });

networkInterface.useAfter([{
  applyAfterware({ response }, next) {
    if (response.data.user.lastLoginDate) {
      response.data.user.lastLoginDate = new Date(response.data.user.lastLoginDate)
    }
    next();
  }
}]);
```

*After*
```js
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';

const httpLink = createHttpLink({ uri: '/graphql' });
const addDatesLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    if (response.data.user.lastLoginDate) {
      response.data.user.lastLoginDate = new Date(response.data.user.lastLoginDate)
    }
    return response;
  })
})

// use with apollo-client
const link = addDatesLink.concat(httpLink);
```
