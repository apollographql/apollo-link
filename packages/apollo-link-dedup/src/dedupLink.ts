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
    // sometimes we might not want to deduplicate a request, for example when we want to force fetch it.
    if (operation.getContext().forceFetch) {
      return forward(operation);
    }

    const key = operation.toKey();
    if (!this.inFlightRequestObservables[key]) {
      this.inFlightRequestObservables[key] = forward(operation);
    }
    return new Observable<FetchResult>(observer => {
      const subscription = this.inFlightRequestObservables[key].subscribe({
        next: observer.next.bind(observer),
        error: error => {
          delete this.inFlightRequestObservables[key];
          observer.error(error);
        },
        complete: () => {
          delete this.inFlightRequestObservables[key];
          observer.complete();
        },
      });

      return () => {
        if (subscription) subscription.unsubscribe();
        delete this.inFlightRequestObservables[key];
      };
    });
  }
}
