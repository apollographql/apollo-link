import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link-core';

import { print } from 'graphql/language/printer';

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
    if (operation.context.forceFetch) {
      return forward(operation);
    }

    const key = this.getKey(operation);
    if (!this.inFlightRequestObservables[key]) {
      this.inFlightRequestObservables[key] = forward(operation);
    }
    return new Observable<FetchResult>(observer =>
      this.inFlightRequestObservables[key].subscribe({
        next: observer.next.bind(observer),
        error: error => {
          delete this.inFlightRequestObservables[key];
          observer.error(error);
        },
        complete: () => {
          delete this.inFlightRequestObservables[key];
          observer.complete();
        },
      }),
    );
  }

  private getKey(operation: Operation) {
    // XXX we're assuming here that variables will be serialized in the same order.
    // that might not always be true
    return `${print(operation.query)}|${JSON.stringify(
      operation.variables,
    )}|${operation.operationName}`;
  }
}
