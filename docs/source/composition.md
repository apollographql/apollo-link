---
title: Composing Links
---

Links represent small portions of how you want your GraphQL operation to be handled. In order to serve all of the needs of your app, Apollo Link is designed to be composed with other links to build complex actions as needed. Composition is managed in two main ways: additive and directional. Additive composition is how you can combine multiple links into a single chain and directional composition is how you can control which links are used depending on the operation.

It's important to note that no matter how many links you have in your chain, your [terminating link](/overview/#terminating-links) has to be last.

*NOTE Future composition mechanisms like `race` are being considered. If you have ideas please submit an issue or PR for the style you need!*

## Additive Composition

Apollo Link ships with two ways to compose links. The first is a method called `from` which is both exported, and is on the `ApolloLink` interface. `from` takes an array of links and combines them all into a single link. For example:

```js
import { ApolloLink } from 'apollo-link';
import { RetryLink } from 'apollo-link-retry';
import { HttpLink } from 'apollo-link-http';
import MyAuthLink from '../auth';

const link = ApolloLink.from([
  new RetryLink(),
  new MyAuthLink(),
  new HttpLink({ uri: 'http://localhost:4000/graphql' })
]);
```

`from` is typically used when you have many links to join together all at once. The alternative way to join links is the `concat` method which joins two links together into one.


```js
import { ApolloLink } from 'apollo-link';
import { RetryLink } from 'apollo-link-retry';
import { HttpLink } from 'apollo-link-http';

const link = ApolloLink.concat(new RetryLink(), new HttpLink({ uri: 'http://localhost:4000/graphql' }));
```

## Directional Composition

Given that links are a way of implementing custom control flow for your GraphQL operation, Apollo Link provides an easy way to use different links depending on the operation itself (or any other global state). This is done using the `split` method which is exported as a function and is on the `ApolloLink` interface. Using the `split` function can be done like this:

```js
import { ApolloLink } from 'apollo-link';
import { RetryLink } from 'apollo-link-retry';
import { HttpLink } from 'apollo-link-http';

const link = new RetryLink().split(
  (operation) => operation.getContext().version === 1,
  new HttpLink({ uri: "http://localhost:4000/v1/graphql" }),
  new HttpLink({ uri: "http://localhost:4000/v2/graphql" })
);
```

`split` takes two required parameters and one optional one. The first argument to split is a function which receives the operation and returns `true` for the first link and `false` for the second link. The second argument is the first link to be split between. The third argument is an optional second link to send the operation to if it doesn't match.

Using `split` allows for per operation based control flow for things like sending mutations to a different server or giving them more retry attempts, for using a WS link for subscriptions and Http for everything else, it can even be used to customize which links are used for an authenticated user vs a public client.

## Usage

`split`, `from`, and `concat` are all exported as part of the ApolloLink interface as well as individual functions which can be used. Both are great ways to build link chains and they are identical in functionality.
