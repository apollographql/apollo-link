---
title: Http Link
---

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
HTTP Link takes an object with some options on it to customize the behavior of the link. If your server supports it, the HTTP link can also send over metadata about the request in the extensions field. To enable this, pass `includeExtensions` as true. The options you can pass are outlined below:
- `uri`: the URI key is a string endpoint -- will default to "/graphql" if not specified
- `includeExtensions`: allow passing the extensions field to your graphql server, defaults to false
- `fetch`: a `fetch` compatiable API for making a request
- `headers`: an object representing values to be sent as headers on the request
- `credentials`: a string representing the credentials policy you want for the fetch call
- `fetchOptions`: any overrides of the fetch options argument to pass to the fetch call


## Context
The Http Link uses the `headers` field on the context to allow passing headers to the HTTP request. It also supports the `credentials` field for defining credentials policy, `uri` for changing the endpoint dynamically, and `fetchOptions` to allow generic fetch overrides (i.e. method: "GET"). These options will override the same key if passed when creating the the link.

This link also attaches the response from the `fetch` operation on the context as `response` so you can access it from within another link.

- `headers`: an object representing values to be sent as headers on the request
- `credentials`: a string representing the credentials policy you want for the fetch call
- `uri`: a string of the endpoint you want to fetch from
- `fetchOptions`: any overrides of the fetch options argument to pass to the fetch call
- `response`: this is the raw response from the fetch request after it is made.
- `http`: this is an object to control fine grained aspects of the http link itself (see below)

**http options**
The http link supports an advanced GraphQL feature (and maybe more in the future) called persisted queries. This allows you to not send the stringified query over the wire, but instead send some kind of identifier of the query. To support this you need to attach the id somewhere to the extensions field and pass the following options to the context:

```
operation.setContext({
  http: {
    includeExtensions: true,
    includeQuery: false,
  }
})
```

the `http` object on context currently supports two keys:
- `includeExtensions`: allowing you to send the extensions object per request
- `includeQuery`: allowing you to not send a query as part of the request


```js
import HttpLink from "apollo-link-http";
import ApolloClient from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";

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

## Errors
The Http Link draws a distinction between client, server and GraphQL errors. Server errors can occur in three different scenerios: parse, network and data errors. [`apollo-link-error`](error.html) provides an [interface](error.html#Usage) for handling these errors. This list describes the scenerios that cause different errors:

* *Client parse error*: the request body is not-serializable due to circular references for example
* *Server parse error*: the response from the server cannot be parsed ([response.json()](https://developer.mozilla.org/en-US/docs/Web/API/Body/json))
* *Server network error*: the response has a status of >= 300
* *Server data error*:  the parse request does not contain `data` or `errors`
* *GraphQL error*: an objects in the `errors` array for a 200 level status

Since many server implementations can return a valid GraphQL result on a server network error, the thrown `Error` object contains the parsed server result. A server data error also receives the parsed result.

The table below provides a summary of error, `Observable` method called by the HTTP link, and type of error thrown for each failure:

| Error   |      Callback      |Error Type |
|----------|:-------------:|------|
| Client Parse |    `error`   | `ClientParseError` |
| Server Parse |    `error`   | `ServerParseError` |
| Server Network |  `error`   | `ServerError` |
| Server Data |     `error`   | `ServerError` |
| GraphQL Error |   `next`    | `Object` |

All error types inherit the `name`, `message`, and nullable `stack` properties from the generic javascript [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error).

```js
//type ClientParseError
{
  parseError: Error;                // Error returned from response.json()
};

//type ServerParseError
{
  response: Response;               // Object returned from fetch()
  statusCode: number;               // HTTP status code
  bodyText: string                  // text that was returned from server
};

//type ServerError
{
  result: Record<string, any>;      // Parsed object from server response
  response: Response;               // Object returned from fetch()
  statusCode: number;               // HTTP status code
};
```

## Sending GET requests / custom fetching
You can use the `fetch` option when creating an http-link to do a lot of custom networking. This is useful if you want to modify the request based on the headers calculated, send the request as a 'GET' via a query string, or calculate the uri based on the operation:

#### Sending a GET request
```js
const customFetch = (uri, options) => {
  const { body, ...newOptions } = options;
  // turn the object into a query string, try `object-to-querystring` package
  const queryString = objectToQuery(JSON.parse(body));
  requestedString = uri + queryString;
  return fetch(requestedString, newOptions);
};
const link = createHttpLink({
  uri: "data",
  fetchOptions: { method: "GET" },
  fetch: customFetch
});
```

#### Custom auth
```js
const customFetch = (uri, options) => {
  const { header } = Hawk.client.header(
    'http://example.com:8000/resource/1?b=1&a=2',
    'GET',
    { credentials: credentials, ext: 'some-app-data' }
  );
  options.headers.Authorization = header;
  return fetch(uri, options);
};

const link = createHttpLink({ fetch: customFetch });
```

#### Dynamic URI from operation information
```js
const customFetch = (uri, options) => {
  const { operationName } = JSON.parse(options.body);
  return fetch(`${uri}/graph/graphql?opname=${operationName}`, options);
};

const link = createHttpLink({ fetch: customFetch });
```

## Upgrading from `apollo-fetch` / `apollo-client`
If you previously used either `apollo-fetch` or `apollo-client`'s `createNetworkInterface`, you will need to change the way `use` and `useAfter` are implemented in your app. Both can be implemented by writing a custom link. It's important to note that regardless of whether you're adding middleware or afterware, your Http link will always be last in the chain since it's a terminating link.

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
    if (response.statusCode === 401) {
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
