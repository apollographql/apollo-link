---
title: Http Link
---

## Purpose
An Apollo Link to allow mocking and server rendering

## Installation

`npm install apollo-link-local --save`


## Usage
```js
const typeDefs = `
  Query {
  ...
  }
`;

const mocks = {
  Query: () => ...,
  Mutation: () => ...
};

const schema = makeExecutableSchema({ typeDefs });
addMockFunctionsToSchema({
  schema,
  mocks
});

const apolloCache = new InMemoryCache(window.__APOLLO_STATE_);

const graphqlClient = new ApolloClient({
  cache: apolloCache,
  link: new LocalLink({ schema })
});
```

