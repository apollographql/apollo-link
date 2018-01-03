import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { ApolloFetch, createApolloFetch } from 'apollo-fetch';
import { BatchLink } from 'apollo-link-batch';

import { print } from 'graphql/language/printer';

export namespace BatchHttpLink {
  /**
   * Note: This package will be updated to remove the dependency on apollo-fetch an use the same options / API as the http-link.
   */
  export interface Options {
    /**
     * The URI to use when fetching operations.
     *
     * Defaults to '/graphql'.
     */
    uri?: string;

    /**
     * The maximum number of operations to include in one fetch.
     *
     * Defaults to 10.
     */
    batchMax?: number;

    /**
     * The interval at which to batch, in milliseconds.
     *
     * Defaults to 10.
     */
    batchInterval?: number;

    /**
     * An instance of ApolloFetch to use when making requests.
     */
    fetch?: ApolloFetch;
  }
}

/** Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export class BatchHttpLink extends ApolloLink {
  private headers = {};
  private apolloFetch: ApolloFetch;
  private batchInterval: number;
  private batchMax: number;
  private batcher: ApolloLink;

  constructor(fetchParams?: BatchHttpLink.Options) {
    super();

    this.batchInterval = (fetchParams && fetchParams.batchInterval) || 10;
    this.batchMax = (fetchParams && fetchParams.batchMax) || 10;

    this.apolloFetch =
      (fetchParams && fetchParams.fetch) ||
      createApolloFetch({ uri: fetchParams && fetchParams.uri });

    this.apolloFetch.batchUse((request, next) => {
      request.options.headers = {
        ...request.options.headers,
        ...this.headers,
      };
      next();
    });

    const batchHandler = (operations: Operation[]) => {
      return new Observable<FetchResult[]>(observer => {
        const printedOperations = operations.map((operation: Operation) => ({
          ...operation,
          query: print(operation.query),
        }));

        this.apolloFetch(printedOperations)
          .then(data => {
            observer.next(data);
            observer.complete();
          })
          .catch(observer.error.bind(observer));
      });
    };

    this.batcher = new BatchLink({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchHandler,
    });
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    this.headers = operation.getContext().headers || this.headers;
    return this.batcher.request(operation);
  }
}
