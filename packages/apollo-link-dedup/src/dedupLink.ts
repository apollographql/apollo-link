import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link';

/*
 * Expects context to contain the forceFetch field if no dedup
 */
export class DedupLink extends ApolloLink {
  private inFlightRequestObservables: Map<
    string,
    Observable<FetchResult>
  > = new Map();
  private subscribers: Map<string, any> = new Map();

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    // sometimes we might not want to deduplicate a request, for example when we want to force fetch it.
    if (operation.getContext().forceFetch) {
      return forward(operation);
    }

    const key = operation.toKey();

    const cleanup = operationKey => {
      this.inFlightRequestObservables.delete(operationKey);
      const prev = this.subscribers.get(operationKey);
      return prev;
    };

    if (!this.inFlightRequestObservables.get(key)) {
      // this is a new request, i.e. we haven't deduplicated it yet
      // call the next link
      const singleObserver = forward(operation);
      let subscription;

      const sharedObserver = new Observable(observer => {
        // this will still be called by each subscriber regardless of
        // deduplication status
        let prev = this.subscribers.get(key);
        if (!prev) prev = { next: [], error: [], complete: [] };

        this.subscribers.set(key, {
          next: prev.next.concat([observer.next.bind(observer)]),
          error: prev.error.concat([observer.error.bind(observer)]),
          complete: prev.complete.concat([observer.complete.bind(observer)]),
        });

        if (!subscription) {
          subscription = singleObserver.subscribe({
            next: result => {
              const previous = cleanup(key);
              this.subscribers.delete(key);
              if (previous) {
                previous.next.forEach(next => next(result));
                previous.complete.forEach(complete => complete());
              }
            },
            error: error => {
              const previous = cleanup(key);
              this.subscribers.delete(key);
              if (previous) previous.error.forEach(err => err(error));
            },
          });
        }

        return () => {
          if (subscription) subscription.unsubscribe();
          this.inFlightRequestObservables.delete(key);
        };
      });

      this.inFlightRequestObservables.set(key, sharedObserver);
    }

    // return shared Observable
    return this.inFlightRequestObservables.get(key);
  }
}
