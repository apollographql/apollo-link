---
title: Apollo Link
sidebar_title: Introduction
description: Apollo Link is a standard interface for modifying control flow of GraphQL requests and fetching GraphQL results.
---

This is the official guide for getting started with Apollo Link in your application. Apollo Link is a simple yet powerful way to describe how you want to execute a GraphQL operation, and what you want to do with the results. It is completely customizable, which means you can use links with Apollo Client, `graphql-tools`, GraphiQL, and even as a standalone client.

<h2 id="installation">Installation</h2>

First, you'll need to install the `apollo-link` npm package.
```bash
npm install apollo-link --save
```

Apollo Link has two main exports, the `ApolloLink` interface and the `execute` function. The `ApolloLink` interface is used to create custom links, compose multiple links together, and can be extended to support more powerful use cases. The `execute` function is how to use a link and an operation to create a request. For a deeper dive on how to use links in your application, check out our Apollo Link [concepts guide](./overview.html).

<h2 id="apollo-client">Usage</h2>

To get you started quickly, we've already created a couple links to cover some of the most common use cases. Let's look at some examples.

<h3 id="apollo-client">Apollo Client</h3>

Apollo Client is designed to work seamlessly with Apollo Link. A link is one of the required items when creating an [Apollo Client instance](/core/apollo-client-api.html#constructor). For a simple request link, we recommend using [`apollo-link-http`](https://github.com/apollographql/apollo-link/tree/master/packages/apollo-link-http):

```js
import { ApolloLink } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import Cache from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://api.githunt.com/graphql' }),
  cache: new Cache()
});
```

The `HttpLink` is a replacement for `createNetworkInterface` from Apollo Client 1.0. For more information on how to upgrade from 1.0 to 2.0, including examples for using middleware and setting headers, please check out our [upgrade guide](https://github.com/apollographql/apollo-link/tree/master/packages/apollo-link-http#upgrading-from-apollo-fetch--apollo-client).

<h3 id="graphql-tools">graphql-tools</h3>

You can also use Apollo Link with `graphql-tools` to facilitate schema stitching by using `node-fetch` as your request link's fetcher function and passing it to `makeRemoteExecutableSchema`.

```js
import { HttpLink } from 'apollo-link-http';
import fetch from 'node-fetch';

const link = new HttpLink({ uri: 'http://api.githunt.com/graphql', fetch });

const schema = await introspectSchema(link);

const executableSchema = makeRemoteExecutableSchema({
  schema,
  link,
});
```

<h3 id="graphiql">GraphiQL</h3>

GraphiQL is a great way to document and explore your GraphQL API. In this example, we're setting up GraphiQL's fetcher function by using the `execute` function exported from Apollo Link. This function takes a link and an operation to create a GraphQL request.

```js
import React from 'react';
import ReactDOM from 'react-dom';
import '../node_modules/graphiql/graphiql.css'
import GraphiQL from 'graphiql';
import { parse } from 'graphql';

import { execute } from 'apollo-link';
import HttpLink from 'apollo-link-http';

const link = new HttpLink({
  uri: 'http://api.githunt.com/graphql'
});

const fetcher = (operation) => {
  operation.query = parse(operation.query);
  return execute(link, operation);
};

ReactDOM.render(
  <GraphiQL fetcher={fetcher}/>,
  document.body,
);
```
<h3 id="standalone">Relay Modern</h3>

You can use Apollo Link as a network layer with Relay Modern.

```js
import {Environment, Network, RecordSource, Store} from 'relay-runtime';
import {execute, makePromise} from 'apollo-link';
import {HttpLink} from 'apollo-link-http';
import {parse} from 'graphql';

const link = new HttpLink({
  uri: 'http://api.githunt.com/graphql'
});

const source = new RecordSource();
const store = new Store(source);
const network = Network.create(
  (operation, variables) => makePromise(
    execute(link, {
      query: parse(operation.text),
      variables
    })
  )
);

const environment = new Environment({
    network,
    store
});
```

<h3 id="standalone">Standalone</h3>

You can also use Apollo Link as a standalone client. Here, we're using the `execute` function exported by Apollo Link.

```js
import { execute, makePromise } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({ uri });

// execute returns an Observable so it can be subscribed to
execute(link, operation).subscribe({
  next: data => console.log(`received data ${data}`),
  error: error => console.log(`received error ${error}`),
  complete: () => console.log(`complete`),
})

// For single execution operations, a Promise can be used
makePromise(execute(link, operation))
  .then(data => console.log(`received data ${data}`))
  .catch(error => console.log(`received error ${error}`))
```

`execute` accepts a standard GraphQL request and returns an [Observable](https://github.com/tc39/proposal-observable) that allows subscribing. A GraphQL request is an object with a `query` which is a GraphQL document AST, `variables` which is an object to be sent to the server, an optional `operationName` string to make it easy to debug a query on the server, and a `context` object to send data directly to a link in the chain.
Links use observables to support GraphQL subscriptions, live queries, and polling, in addition to single response queries and mutations.

`makePromise` is similar to execute, except it returns a Promise. You can use `makePromise` for single response operations such as queries and mutations.

If you want to control how you handle errors, `next` will receive GraphQL errors, while `error` be called on a network error. We recommend using [`apollo-link-error`](https://github.com/apollographql/apollo-link/tree/master/packages/apollo-link-error) instead.

<h3 id="customization">Customizing your own links</h3>

Our links have you covered for the most common use cases, but what if you want to write your own middleware? What about offline support or persisted queries? The `ApolloLink` interface was designed to be customizable to fit your application's needs. To get started, first read our [concepts guide](./overview.html) and then learn how to write your own [stateless link](./stateless.html).
