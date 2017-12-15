---
title: Composing Links
---

Links represent small portions of how you want your GraphQL operation to be handled. In order to serve all of the needs of your app, Apollo Link is designed to be composed with other links to build complex actions as needed. Composition is managed in two main ways: additive and directional. Additive composition is how you can combine multiple links into a single chain and directional is how you can control which links are used depending on the operation.

It's important to note that no matter how many links you have in your chain, your [terminating link](./overview.html#terminating) has to be last.

*NOTE Future composition mechanisms like `race` are being considered. If you have ideas please submit an issue or PR for the style you need!*

<h2 id="additive">Additive Composition</h2>

Apollo Link ships with two ways to compose links. The first is a method called `from` which is both exported, and is on the `ApolloLink` interface. `from` takes an array of links and combines them all into a single link. For example:

```js
import { ApolloLink } from 'apollo-link';
import Retry from 'apollo-link-retry';
import HttpLink from 'apollo-link-http';
import MyAuthLink from '../auth';

const link = ApolloLink.from([
  new Retry(),
  new AuthLink(),
  new HttpLink({ uri: '/graphql' })
]);
```

`from` is typically used when you have many links to join together all at once. The alternative way to join links is the `concat` method which joins two links together into one.


```js
import { ApolloLink } from 'apollo-link';
import Retry from 'apollo-link-retry';
import HttpLink from 'apollo-link-http';

const link = ApolloLink.concat(new Retry(), new HttpLink({ uri: '/graphql' }));
```

<h2 id="directional">Directional Composition</h2>

Given that links are a way of implementing custom control flow for your GraphQL operation, Apollo Link provides and easy way to use different links depending on the operation itself (or any other global state). This is done using the `split` method which is exported as a function and is on the `ApolloLink` interface. Using the split function can be done like this:

```js
import { ApolloLink } from 'apollo-link';
import Retry from 'apollo-link-retry';
import HttpLink from 'apollo-link-http';

const link = new Retry().split(
  (operation) => operation.getContext().version === 1,
  new HttpLink({ uri: "/v1/graphql" }),
  new HttpLink({ uri: "/v2/graphql" })
);
```

`split` takes two required parameters and one optional one. The first argument to split is a function which receives the operation and returns `true` for the first link and `false` for the second link. The second argument is the first link to be split between. The third argument is an optional second link to send the operation to if it doesn't match.

Using `split` allows for per operation based control flow for things like sending mutations to a different server or giving them more retry attempts, for using a WS link for subscriptions and Http for everything else, it can even be used to customize which links are used for an authenticated user vs a public client.

<h2 id="usage">Usage</h2>

`split`, `from`, and `concat` are all exported as part of the ApolloLink interface as well as individual functions which can be uses. Both are great ways to build link chains and they are identical in functionality.
