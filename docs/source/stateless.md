---
title: Stateless Links
---

## Stateless Links

Links are created and shared between every request in your application. However, most links do the same thing for each request and don't need any knowledge about other operations being performed. These links are called stateless links because they have no shared execution state between requests. The alternative way to write links is a [stateful link](/stateful/).

Stateless links can be written as simple functions wrapped in the `ApolloLink` interface. For example:

```js
import { ApolloLink } from 'apollo-link';

const consoleLink = new ApolloLink((operation, forward) => {
  console.log(`starting request for ${operation.operationName}`);
  return forward(operation).map((data) => {
    console.log(`ending request for ${operation.operationName}`);
    return data;
  })
})
```

Stateless links are great for things like middleware and even network requests. Adding an auth header for `apollo-link-http` is as simple as this:

```js
import { ApolloLink } from 'apollo-link';

const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers }) => ({ headers: {
    authorization: Meteor.userId(), // however you get your token
    ...headers
  }}));
  return forward(operation);
});

```

This style of link also composes well for customization using a function:

```js
import { ApolloLink } from 'apollo-link';

const reportErrors = (errorCallback) => new ApolloLink((operation, forward) => {
  const observer = forward(operation);
  // errors will be sent to the errorCallback
  observer.subscribe({ error: errorCallback })
  return observer;
});

const link = reportErrors(console.error);
```

### Extending ApolloLink

Stateless links can also be written by extending the `ApolloLink` class and overwriting the constructor and request method. This is done as an alternative to the closure method shown directly above to pass details to the link. For example, the same `reportErrors` link written by extending the `ApolloLink` class:

```js
import { ApolloLink } from 'apollo-link';

class ReportErrorLink extends ApolloLink {
  constructor(errorCallback) {
    super();
    this.errorCallback = errorCallback;
  }
  request(operation, forward) {
    const observer = forward(operation);
    // errors will be sent to the errorCallback
    observer.subscribe({ error: this.errorCallback })
    return observer;
  }
}

const link = new ReportErrorLink(console.error);
```

Both of these methods work equally as well for creating links!
