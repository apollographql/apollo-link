---
title: Setup and options
---
<h2 id="installation">Installation</h2>

To get started with Apollo Link, install the `apollo-link` npm package. This exports everything you need to get started, though there may already be a link with the functionality you wan't on npm.

```bash
npm install apollo-link --save
```

Apollo Link has two main exports, the `ApolloLink` interface and the `execute` function. The interface is used to create custom links, compose mutliple links together, and can be extended to support more powerful usecases. The `execute` function is how to use a link and an operation to create a request.

<h2 id="basic-usage">Basic Usage</h2>

Links can be used as a stand-alone client or with most major GraphQL clients.

```js
import { execute, makePromise } from 'apollo-link';
import HttpLink from 'apollo-link-http';

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

`execute` accepts a standard GraphQL request with an AST (parsed query string using a library like graphql-tag) and returns an [Observable](https://github.com/zenparsing/zen-observable#api) that allows subscribing.
Links use observables to support GraphQL subscriptions, live queries, and polling, in addition to single response queries and mutations.

`next` will receive GraphQL errors, while `error` be called on a network error.

<h2 id="apollo-client">Use with Apollo Client</h2>

Apollo Client is specially designed to work with Apollo Link. A link is one of the required items when creating an Apollo Client instance. For more information see the getting started section [here](/core/apollo-client-api.html#constructor). For a simple http link, try `apollo-link-http`:

```js
import { ApolloClient } from 'apollo-client';
import HttpLink from 'apollo-link-http';

const client = new ApolloClient({
  link: new HttpLink({ "/graphql" }),
  // more options
});
```

Under the hood, Apollo Client uses the `execute` function for each operation requested.

<h2 id="graphiql">GraphiQL</h2>

GraphiQL provides a simple way of testing a link.

```js
import React from 'react';
import ReactDOM from 'react-dom';
import '../node_modules/graphiql/graphiql.css'
import GraphiQL from 'graphiql';

import { execute } from 'apollo-link';
import HttpLink from 'apollo-link-http';

const uri = 'http://api.githunt.com/graphql';
const link = new HttpLink({ uri });

ReactDOM.render(
  <GraphiQL fetcher={(operation) => execute(link, operation)}/>,
  document.body,
);
```
