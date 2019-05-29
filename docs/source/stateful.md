---
title: Stateful Links
---

## Stateful Links

Links are created and shared between every request in your application. Some links may share state between requests to provided added functionality. The links are called stateful links and are written using the `ApolloLink` interface. The alternative way to write links is a [stateless link](/stateless/).

Stateful links typically (though are not required to) overwrite the constructor of `ApolloLink` and are required to implement a `request` function with the same signature as a stateless link. For example:

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

This stateful implementation maintains a counter called `operations` as an instance variable. Every time a request is passed through the link, we increment `operations`. This means that `operations` counts the number of operations that have been requested of the link.

Consider the case where we'd like to keep track of the requests within the link. Suppose that we call `request` on this link with an operation instance `A`. While this operation is still in-flight, we fire another operation instance `B.` Unless we're careful, it is easy to accidentally overwrite operation `A` with operation `B`. Take for example a portion of the dedup link:

```js
import { ApolloLink } from 'apollo-link';

export default class DedupLink extends ApolloLink {
  private inFlightRequestObservables: {
    [key: string]: Observable<FetchResult>;
  };

  constructor() {
    super();
    this.inFlightRequestObservables = {};
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    const key = operation.toKey();
    if (!this.inFlightRequestObservables[key]) {
      this.inFlightRequestObservables[key] = forward(operation);
    }

    return new Observable<FetchResult>(observer => {
      const subscription = this.inFlightRequestObservables[key].subscribe({
        next: (result) => {
          delete this.inFlightRequestObservables[key];
          observer.next(result);
        },
        error: error => {
          delete this.inFlightRequestObservables[key];
          observer.error(error);
        },
        complete: observer.complete.bind(observer),
      });

      return () => {
        if (subscription) subscription.unsubscribe();
        delete this.inFlightRequestObservables[key];
      };
    });
  }
}


```

More commonly, stateful links are used for complex control flow like batching and deduplication of operations.
