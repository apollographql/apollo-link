import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link-core';

import { print } from 'graphql/language/printer';

/*
 * Expects context to contain the deduplicate field
 */
export class DedupLink extends ApolloLink {
  private inFlightRequestPromises: { [key: string]: Observable<FetchResult> };

  constructor() {
    super();
    this.inFlightRequestPromises = {};
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    // sometimes we might not want to deduplicate a request, for example when we want to force fetch it.
    if (!operation.context.deduplicate) {
      return forward(operation);
    }

    const key = this.getKey(operation);
    if (!this.inFlightRequestPromises[key]) {
      this.inFlightRequestPromises[key] = forward(operation);
    }
    return new Observable<FetchResult>(observer => {
      this.inFlightRequestPromises[key].subscribe({
        next: observer.next.bind(observer),
        error: error => {
          observer.error(error);
          delete this.inFlightRequestPromises[key];
        },
        complete: () => {
          observer.complete();
          delete this.inFlightRequestPromises[key];
        },
      });
    });
  }

  private getKey(operation: Operation) {
    // XXX we're assuming here that variables will be serialized in the same order.
    // that might not always be true
    return `${print(operation.query)}|${JSON.stringify(
      operation.variables,
    )}|${operation.operationName}`;
  }
}
