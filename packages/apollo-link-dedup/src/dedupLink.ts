import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link';

type Observer<T> = ZenObservable.Observer<T>;

/*
 * Expects context to contain the forceFetch field if no dedup
 */
export class DedupLink extends ApolloLink {
  private inFlightRequestObservables: Map<
    string,
    Observable<FetchResult>
  > = new Map();
  private subscribers: Map<string, Array<Observer<FetchResult>>> = new Map();

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
      const prevs = this.subscribers.get(operationKey);
      this.subscribers.delete(operationKey);
      return prevs;
    };

    if (!this.inFlightRequestObservables.get(key)) {
      // this is a new request, i.e. we haven't deduplicated it yet
      // call the next link
      const singleObserver = forward(operation);
      let subscription;

      const sharedObserver = new Observable(observer => {
        // this will still be called by each subscriber regardless of
        // deduplication status
        const prevs = this.subscribers.get(key) || [];
        this.subscribers.set(key, prevs.concat(observer));

        if (!subscription) {
          subscription = singleObserver.subscribe({
            next: result => {
              const previous = cleanup(key);
              if (previous) {
                previous.forEach(prev => {
                  prev.next(result);
                  prev.complete();
                });
              }
            },
            error: error => {
              const previous = cleanup(key);
              if (previous) {
                previous.forEach(prev => prev.error(error));
              }
            },
          });
        }

        return () => {
          let observers = this.subscribers.get(key);
          observers = observers.filter(ob => ob !== observer);
          if (observers.length === 0) {
            cleanup(key);
            subscription.unsubscribe();
          } else {
            this.subscribers.set(key, observers);
          }
        };
      });

      this.inFlightRequestObservables.set(key, sharedObserver);
    }

    // return shared Observable
    return this.inFlightRequestObservables.get(key);
  }
}
