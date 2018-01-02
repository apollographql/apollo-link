---
title: apollo-link-rest
description: Call your REST APIs inside your graphQL queries.
---

[**Read the announcement post! ( to be pusblished soon )
🎉**](https://dev-blog.apollodata.com/)

Calling a REST API from a graphQL client open the graphQL world for new people, whether :

* You are in a front developpers team that want to try graphQL without asking for the backend team to implement a graphQL server.
* You have no possibility to change the backend, whether it is in your team or an existing public APIs.

With apollo-link-rest, you can now call your enpoints inside your graphQL queries and have all your datas managed by Apollo client.

You can start using apollo client in your app now, let's see how.

<h2 id="start">Quick start</h2>

To get started, you need first to install apollo-client :

```bash
npm install --save apollo-client
```

For an apollo client to work, you need a link and a cache, [more infos here](/docs/react/basics/setup.html#installation). Let's install the default in memory cache :

```bash
npm install --save apollo-cache-inmemory
```

Then it is time to install our link :

```bash
npm install apollo-link-rest --save
```

After this, you are ready to setup your apollo client :

```js
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { RestLink } from 'apollo-link-rest';

// setup your Rest link with your endpoint
const link = new RestLink({ uri: "https://swapi.co/api/" });

// setup your client
const client = new ApolloClient({
  link: restLink,
  cache: new InMemoryCache(),
});
```

Now it is time to write our first query, for this you need to install the `graphql-tag` package :

```bash
npm install graphql-tag --save
```

Defining a query is pretty straighforward :

```js
const query = gql`
  query luke {
    person @rest(type: "Person", path: "people/1/") {
      name
    }
  }
`;
```

You can then fetch your data :

```js
// Invoke the query and log the person's name
client.query({ query }).then(response => {
  console.log(response.data.name);
});
```

<h2 id="options">Options</h2>

REST Link takes an object with some options on it to customize the behavior of the link. The options you can pass are outlined below:

- `uri`: the URI key is a string endpoint (optional when `endpoints` provides a default)
- `endpoints`: root endpoint (uri) to apply paths to or a map of endpoints
- `customFetch`: a custom `fetch` to handle REST calls
- `headers`: an object representing values to be sent as headers on the request
- `credentials`: a string representing the credentials policy you want for the fetch call
- `fieldNameNormalizer`: function that takes the response field name and converts it into a GraphQL compliant name
- `fieldNameDenormalizer`: function that takes a GraphQL-compliant field name and converts it back into an endpoint-specific name
- `typePatcher`: Structure to allow you to specify the __typename when you have nested objects in your REST response!


<h3 id="options.endpoints">Mutiple endpoints</h3>

If you want to be able to use multiple endpoints, you should create your link like so :

```js
  const link = new RestLink({ endpoints: { v1: 'api.com/v1', v2: 'api.com/v2' } });
```

Then you need to specify in the rest directive the endpoint you want to use :

```js
  const postTitleQuery1 = gql`
    query postTitle {
      post @rest(type: "Post", path: "/post", endpoint: "v1") {
        id
        title
      }
    }
  `;
  const postTitleQuery2 = gql`
    query postTitle {
      post @rest(type: "[Tag]", path: "/tags", endpoint: "v2") {
        id
        tags
      }
    }
  `;
```



If you have a default endpoint, you can create your link like so :

```js
  const link = new RestLink({
    endpoints: { github: 'github.com' },
    uri: 'api.com',
  });
```

Then if you do not specify an endpoint in your query the default endpoint ( the one you specify in the uri option ) will be used.


<h3 id="options.typePatcher">Type Patcher</h3>

When sending such a query :

```graphql
query MyQuery {
  planets @rest(type: "PlanetPayload", path: "planets/") {
    count
    next
    results {
      name
    }
  }
}
```

You need to have a way to set the typename of results. To do so, you can define a type patcher :

<h3 id=options.example>Complete options</h3>

Here is how you can customize Rest Link :

```js
  import fetch from 'node-fetch';
  import * as camelCase from 'camelcase';
  import snack_case from 'snack-case';

  const link = new RestLink({
    endpoints: { github: 'github.com' },
    uri: 'api.com',
    customFetch: fetch,
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    fieldNameNormalizer: camelCase,
    fieldNameDenormalizer: snake_case,
  });
```

<h2 id="order">Links order</h2>

If you are using multiple link types, restLink should go before httpLink, as httpLink will swallow any calls that should be routed through rest!

For example :

```js
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from "apollo-link-http";
import { InMemoryCache } from 'apollo-cache-inmemory';
import { RestLink } from 'apollo-link-rest';

// setting httpLink
const httpLink = createHttpLink({ uri: "server.com/graphql" });
// setting restLink
const restLink = new RestLink({ uri: "api.server.com" });

const client = new ApolloClient({
  link: ApolloLink.from([restLink, httpLink]),
  cache: new InMemoryCache()
});

```

<h2 id="context">Context</h2>

REST Link uses the `headers` field on the context to allow passing headers to the HTTP request. It also supports the `credentials` field for defining credentials policy.

- `headers`: an object representing values to be sent as headers on the request
- `credentials`: a string representing the credentials policy you want for the fetch call

Here is a way to add `headers` to the context.

```js
const authRestLink = setContext(async () => {
  const token = await localStorage.getItem("token");
  return {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    }
  };
);

const restLink = new RestLink({ uri: "uri" });

const client = new ApolloClient({
  link: ApolloLink.from([authRestLink, restLink ]),
  cache: new InMemoryCache(),
});
```

<h2 id="rest">@rest directive</h2>

This is where you setup the endpoint you want to fetch.
The rest directive could be used at any depth in a query, but once it is used, nothing nested in it can be GraphQL data, it has to be from the rest link or other resource (like a @client directive)

<h3 id="rest.arguments">Arguments</h3>

A `@rest` directive takes three arguments:
  - path: path to rest endpoint. This could be a path or a full url. If a path, add to the endpoint given on link creation or from the context is concatenated to it.
  - method: the HTTP method to send the request via (i.e GET, PUT, POST)
  - type: The GraphQL type this will return
  - endpoint: which endpoint (if using a map of endpoints) to use for the request

<h3 id="rest.variables">Variables</h3>

You can use query variables inside the path argument of your directive for example

```graphql
query postTitle {
  post(id: "1") @rest(type: "Post", path: "/post/:id") {
    id
    title
  }
}
```

<h2 id="export">@export directive</h2>

The export directive re-exposes a field for use in a later (nested) query. These are the same semantics that will be supported on the server, but when used in a rest link you can use the exported variables for futher calls (i.e. waterfall requests from nested fields)

<h3 id="export.arguments">Arguments</h3>
  - as: the string name to create this as a variable to be used down the selection set

<h3 id="export.example">Example</h3>

An example use-case would be getting a list of users, and hitting a different endpoint to fetch more data using the exported field in the REST query args.

```graphql
const QUERY = gql`
  query RestData($email: String!) {
    users @rest(path: '/users/email/:email', params: { email: $email }, method: 'GET', type: 'User') {
      id @export(as: "id")
      firstName
      lastName
      friends @rest(path: '/friends/:id', params: { id: $id }, type: '[User]') {
        firstName
        lastName
      }
    }
  }
`;
```

<h2 id="mutation">Mutations</h2>

You can write also mutations with the apollo-link-rest, for example :

```graphql
  mutation deletePost($id: ID!) {
    deletePostResponse(id: $id)
      @rest(type: "Post", path: "/posts/:id", method: "DELETE") {
      NoResponse
    }
  }
```

<h2 id="example">Example apps</h2>

To get you started, here are some example apps:

* [Simple](https://github.com/apollographql/apollo-link-rest/tree/master/examples/simple):
  A very simple app with a single query that reflect the setup section.
* [Advanced](https://github.com/apollographql/apollo-link-rest/tree/master/examples/advanced):
  A more complex app that demonstate how to use an export directive.

If you have an example app that you'd like to be featured, please send us a PR!
😊 We'd love to hear how you're using `apollo-link-rest`.

