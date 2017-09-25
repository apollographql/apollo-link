---
title: Stateful Links
---

<h2 id="stateless">Stateless Links</h2>

Links are created and shared between every request in your application. Some links may share state between requests to provided added functionality. The links are called stateful links and are written using the `ApolloLink` interface. The alternative way to write links is a [stateless link](./links/stateless).

Stateful links typically (though are not required to) ovewrite the constructor of `ApolloLink` and are required to implement a `request` function with the same signature as a stateless link. For example:

```js
import { ApolloLink } from 'apollo-link';

class OperationCountLink extends ApolloLink {
  constructor() {
    super();
    this.operations = 0;
  }
  request(operation, forward) {
    this.operations++
    return forward(operation);
  }
}

const link = new OperationCountLink();
```

It is important when managing stateful links where the request is being saved to implement a key value store for the requests. Otherwise, it is easy to accidently override an in-flight request with another operation happening. Take the for example a link that captures the time of each operation:

```js
import { ApolloLink } from 'apollo-link';

class OperationTimingLink extends ApolloLink {
  constructor() {
    super();
    this.operations = {};
  }
  request(operation, forward) {
    const key = operation.toKey();
    if (!this.operations[key]) this.operations[key] = {}
    this.operations[key].start = new Date();
    return forward(operation).map((data) => {
        this.operations[key].elapsed = new Date() - this.operations[key].start;
        return data;
    });
  }
}

const link = new OperationTimingLink();

```

More commonly, stateful links are used for complex control flow like batching and deduplication of operations.