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

    if (!this.inFlightRequestObservables.get(key)) {
      // this is a new request, i.e. we haven't deduplicated it yet
      // call the next link
      const singleObserver = forward(operation);
      let subscription;

      const sharedObserver = new Observable(observer => {
        // this will still be called by each subscriber regardless of
        // deduplication status
        if (!this.subscribers.has(key)) this.subscribers.set(key, new Set());

        this.subscribers.get(key).add(observer);

        if (!subscription) {
          subscription = singleObserver.subscribe({
            next: result => {
              const subscribers = this.subscribers.get(key);
              this.subscribers.delete(key);
              this.inFlightRequestObservables.delete(key);
              if (subscribers) {
                subscribers.forEach(obs => obs.next(result));
                subscribers.forEach(obs => obs.complete());
              }
            },
            error: error => {
              const subscribers = this.subscribers.get(key);
              this.subscribers.delete(key);
              this.inFlightRequestObservables.delete(key);
              if (subscribers) {
                subscribers.forEach(obs => obs.error(error));
              }
            },
          });
        }

        return () => {
          if (this.subscribers.has(key)) {
            this.subscribers.get(key).delete(observer);
            if (this.subscribers.get(key).size === 0) {
              this.inFlightRequestObservables.delete(key);
              if (subscription) subscription.unsubscribe();
            }
          }
        };
      });

      this.inFlightRequestObservables.set(key, sharedObserver);
    }

    // return shared Observable
    return this.inFlightRequestObservables.get(key);
  }
}
