---
title: apollo-link-rest
description: Call your REST APIs inside your GraphQL queries.
---

Calling REST APIs from a GraphQL client opens the benefits GraphQL for more people, whether:

* You are in a front-end developer team that wants to try GraphQL without asking for the backend team to implement a GraphQL server.
* You have no access to change the backend because it's an existing set of APIs, potentially managed by a 3rd party.
* You have an existing codebase, but you're looking to evaluate whether GraphQL can work for your needs.
* You have a large codebase, and the GraphQL migration is happening on the backend, but you want to use GraphQL *now* without waiting!

With `apollo-link-rest`, you can now call your endpoints inside your GraphQL queries and have all your data managed by [`ApolloClient`](../../react/basics/setup.html#ApolloClient). `apollo-link-rest` is suitable for just dipping your toes in the water, or doing a full-steam ahead integration, and then later on migrating to a backend-driven GraphQL experience. `apollo-link-rest` combines well with other links such as [`apollo-link-context`](./context.html), [`apollo-link-state`](./state.html), and others! _For complex back-ends, you may want to consider consider using [`apollo-server`](/docs/apollo-server/) which you can try out at [launchpad.graphql.com](https://launchpad.graphql.com/)_

You can start using ApolloClient in your app today, let's see how!

<h2 id="start">Quick start</h2>

To get started, you need first to install apollo-client:

```bash
npm install --save apollo-client
```

For an apollo client to work, you need a link and a cache, [more info here](/docs/react/basics/setup.html#installation). Let's install the default in memory cache:

```bash
npm install --save apollo-cache-inmemory
```

Then it is time to install our link:

```bash
npm install apollo-link-rest --save
```

After this, you are ready to setup your apollo client:

```js
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { RestLink } from 'apollo-link-rest';

// setup your `RestLink` with your endpoint
const link = new RestLink({ uri: "https://swapi.co/api/" });

// setup your client
const client = new ApolloClient({
  link: restLink,
  cache: new InMemoryCache(),
});
```

Now it is time to write our first query, for this you need to install the `graphql-tag` package:

```bash
npm install graphql-tag --save
```

Defining a query is straightforward:

```js
const query = gql`
  query luke {
    person @rest(type: "Person", path: "people/1/") {
      name
    }
  }
`;
```

You can then fetch your data:

```js
// Invoke the query and log the person's name
client.query({ query }).then(response => {
  console.log(response.data.name);
});
```

<h2 id="options">Options</h2>

Construction of `RestLink` takes an options object to customize the behavior of the link. The options you can pass are outlined below:

* `uri: string`: the URI key is a string endpoint/domain for your requests to hit (_optional_ when `endpoints` provides a default)
* `endpoints: /map-of-endpoints/`: _optional_ map of endpoints -- If you use this, you need to provide `endpoint` to the `@rest(...)` directives.
* `customFetch?`: _optional_ a custom `fetch` to handle `REST` calls
* `headers?: Headers`: _optional_ an object representing values to be sent as headers with all requests. [Documented here](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers)
* `credentials?`: _optional_ a string representing the credentials policy the fetch call should operate with. [Document here](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)
* `fieldNameNormalizer?: /function/`: _optional_ function that takes the response field name and converts it into a GraphQL compliant name. -- This is useful if your `REST` API returns fields that aren't representable as GraphQL, or if you want to convert between `snake_case` field names in JSON to `camelCase` keyed fields.
* `fieldNameDenormalizer?: /function/`: _optional_ function that takes a GraphQL-compliant field name and converts it back into an endpoint-specific name.
* `typePatcher: /map-of-functions/`: _optional_ Structure to allow you to specify the `__typename` when you have nested objects in your REST response!

<h3 id="options.endpoints">Multiple endpoints</h3>

If you want to be able to use multiple endpoints, you should create your link like so:

```js
  const link = new RestLink({ endpoints: { v1: 'api.com/v1', v2: 'api.com/v2' } });
```

Then you need to specify in the rest directive the endpoint you want to use:

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

If you have a default endpoint, you can create your link like so:

```js
  const link = new RestLink({
    endpoints: { github: 'github.com' },
    uri: 'api.com',
  });
```

Then if you do not specify an endpoint in your query the default endpoint (the one you specify in the `uri` option.) will be used.

<h3 id="options.typePatcher">Typename patching</h3>

When sending such a query:

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

The outer response object (`data.planets`) gets its `__typename: "PlanetPayload"` from the [`@rest(...)` directive's `type` parameter](#rest). You, however, need to have a way to set the typename of `PlanetPayload.results`. To do so, you can define a `typePatcher`:

```typescript
const restLink = new RestLink({
  uri: '/api',
  typePatcher: {
    PlanetPayload: (
      data: any,
      outerType: string,
      patchDeeper: RestLink.FunctionalTypePatcher,
    ): any => {
      if (data.results != null) {
        data.results = data.results.map( planet => { __typename: "Planet", ...planet });
      }
      return data;
    },
    /* … other nested type patchers … */
  },
})
```

<h3 id=options.example>Complete options</h3>

Here is one way you might customize `RestLink`:

```js
  import fetch from 'node-fetch';
  import * as camelCase from 'camelcase';
  import * as snake_case from 'snack-case';

  const link = new RestLink({
    endpoints: { github: 'github.com' },
    uri: 'api.com',
    customFetch: fetch,
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    fieldNameNormalizer: (key: string) => camelCase(name),
    fieldNameDenormalizer: (key: string) => snake_case(key),
    typePatcher: {
      Post: ()=> {
        bodySnippet...
      }
    },
  });
```

<h2 id="context">Link Context</h2>

`RestLink` has an [interface `LinkChainContext`](https://github.com/apollographql/apollo-link-rest/blob/1824da47d5db77a2259f770d9c9dd60054c4bb1c/src/restLink.ts#L557-L570) which it uses as the structure of things that it will look for in the `context`, as it decides how to fulfill a specific `RestLink` request. (Please see the [`apollo-link-context`](./context.html) page for a discussion of why you might want this).

* `credentials?: RequestCredentials`: overrides the `RestLink`-level setting for `credentials`. [Values documented here](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers)
* `headers?: Headers`: Additional headers provided in this `context-link` [Values documented here](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers)
* `headersToOverride?: string[]` If you provide this array, we will merge the headers you provide in this link, by replacing any matching headers that exist in the root `RestLink` configuration. Alternatively you can use `headersMergePolicy` for more fine-grained customization of the merging behavior.
* `headersMergePolicy?: RestLink.HeadersMergePolicy`: This is a function that decide how the headers returned in this `contextLink` are merged with headers defined at the `RestLink`-level. If you don't provide this, the headers will be simply appended. To use this option, you can provide your own function that decides how to process the headers. [Code references](https://github.com/apollographql/apollo-link-rest/blob/8e57cabb5344209d9cfa391c1614fe8880efa5d9/src/restLink.ts#L462-L510)

<h3 id="context.headers">Example</h3>
`RestLink` uses the `headers` field on the [`apollo-link-context`](./context.html) so you can compose other links that provide additional & dynamic headers to a given query. These headers will be merged with

Here is one way to add `headers` to the context:

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
  link: ApolloLink.from([authRestLink, restLink]),
  cache: new InMemoryCache(),
});
```

<h2 id="order">Link order</h2>

If you are using multiple link types, `restLink` should go before `httpLink`, as `httpLink` will swallow any calls that should be routed through `apollo-link-rest`!

For example:

```js
const httpLink = createHttpLink({ uri: "server.com/graphql" });
const restLink = new RestLink({ uri: "api.server.com" });

const client = new ApolloClient({
  link: ApolloLink.from([authLink, restLink, errorLink, retryLink, httpLink]),
  // Note: httpLink is terminating so must be last, while retry & error wrap the links to their right
  //       state & context links should happen before (to the left of) restLink.
  cache: new InMemoryCache()
});
```

 _Note: you should also consider this if you're using [`apollo-link-context`](#context) to set `Headers`, you need that link to be before `restLink` as well._

<h2 id="rest">@rest directive</h2>

This is where you setup the endpoint you want to fetch.
The rest directive could be used at any depth in a query, but once it is used, nothing nested in it can be GraphQL data, it has to be from the `RestLink` or other resource (like the [`@client` directive](./state.html))

<h3 id="rest.arguments">Arguments</h3>

An `@rest(…)` directive takes two required and several optional arguments:

* `type: string`: The GraphQL type this will return
* `path: string`: uri-path to the REST API. This could be a path or a full url. If a path, the endpoint given on link creation or from the context is concatenated with it to produce a full `URI`.
* _optional_ `method?: "GET" | "PUT" | "POST" | "DELETE"`: the HTTP method to send the request via (i.e GET, PUT, POST)
* _optional_ `endpoint?: string` key to use when looking up the endpoint in the (optional) `endpoints` table if provided to RestLink at creation time.
* _optional_ `bodyKey?: string = "input"`: This is the name of the `variable` to use when looking to build a REST request-body for a `PUT` or `POST` request. It defaults to `input` if not supplied.
* _optional_ `bodyBuilder?: /function/`: If provided, this is the name a `function` that you provided to `variables`, that is called when a request-body needs to be built. This lets you combine arguments or encode the body in some format other than JSON.

<h3 id="rest.arguments.variables">Variables</h3>

You can use query `variables` inside nested queries, or in the the path argument of your directive:

```graphql
query postTitle {
  post(id: "1") @rest(type: "Post", path: "/post/:id") {
    id
    title
  }
}
```

<h4 id="rest.arguments.body">`bodyKey` / `bodyBuilder`</h4>

When making a `POST` or `PUT` HTTP request, you often need to provide a request body. By [convention](https://graphql.org/graphql-js/mutations-and-input-types/), GraphQL recommends you name your input-types as `input`, so by default that's where we'll look to find a JSON object for your body.

<h5 id="rest.arguments.body.key">`bodyKey`</h5>

If you need/want to name it something different, you can pass `bodyKey`, and we'll look at that variable instead.

In this example the publish API accepts a body in the variable `body` instead of input:

```graphql
mutation publishPost(
  $someApiWithACustomBodyKey: PublishablePostInput!
) {
  publishedPost: publish(input: "Foo", body: $someApiWithACustomBodyKey)
    @rest(
      type: "Post"
      path: "/posts/:input/new"
      method: "POST"
      bodyKey: "body"
    ) {
    id
    title
  }
}
```

[Unit Test](https://github.com/apollographql/apollo-link-rest/blob/c9d81ae308e5f61b5ae992061de7abc6cb2f78e0/src/__tests__/restLink.ts#L1803-L1846)

<h5 id="rest.arguments.body.builder">`bodyBuilder`</h5>

If you need to structure your data differently, or you need to custom encode your body (say as form-encoded), you can instead provide `bodyBuilder`

```graphql
mutation encryptedPost(
  $input: PublishablePostInput!
  $encryptor: any
) {
  publishedPost: publish(input: $input)
    @rest(
      type: "Post"
      path: "/posts/new"
      method: "POST"
      bodyBuilder: $encryptor
    ) {
    id
    title
  }
}
```

[Unit Test](https://github.com/apollographql/apollo-link-rest/blob/c9d81ae308e5f61b5ae992061de7abc6cb2f78e0/src/__tests__/restLink.ts#L1847-L1904)

<h2 id="export">@export directive</h2>

The export directive re-exposes a field for use in a later (nested) query. These are the same semantics that will be supported on the server, but when used in a `RestLink` you can use the exported variables for further calls (i.e. waterfall requests from nested fields)

 _Note: If you're constantly using @export you may prefer to take a look at [`apollo-server`](/docs/apollo-server/) which you can try out at [launchpad.graphql.com](https://launchpad.graphql.com/)_

<h3 id="export.arguments">Arguments</h3>

* `as: string`: name to create this as a variable to be used down the selection set

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

You can write also mutations with the apollo-link-rest, for example:

```graphql
  mutation deletePost($id: ID!) {
    deletePostResponse(id: $id)
      @rest(type: "Post", path: "/posts/:id", method: "DELETE") {
      NoResponse
    }
  }
```

<h2 id="troubleshooting">Troubleshooting</h2>

As you start using `apollo-link-rest` you may run into some standard issues that we thought we could help you solve.

* `Missing field __typename in ...` -- If you see this, it's possible you haven't provided `type:` to the [`@rest(...)`](#rest)-directive. Alternately you need to set up a [`typePatcher`](#options.typePatcher)
* `Headers is undefined` -- If you see something like this, you're running in a browser or other Javascript environment that does not yet support the full specification for the `Headers` API.

<h2 id="examples">Example apps</h2>

To get you started, here are some example apps:

* [Simple](https://github.com/apollographql/apollo-link-rest/tree/master/examples/simple):
  A very simple app with a single query that reflect the setup section.
* [Advanced](https://github.com/apollographql/apollo-link-rest/tree/master/examples/advanced):
  A more complex app that demonstrate how to use an export directive.

<h1 id="contributing">Contributing</h1>

Please join us on github: [apollographql/apollo-link-rest](https://github.com/apollographql/apollo-link-rest/) and in the ApolloGraphQL Slack in the `#apollo-link-rest` chat room.

If you have an example app that you'd like to be featured, please send us a PR! 😊 We'd love to hear how you're using `apollo-link-rest`.
