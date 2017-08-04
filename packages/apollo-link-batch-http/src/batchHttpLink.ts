import {
  ApolloLink,
  Operation,
  FetchResult,
  Observable,
} from 'apollo-link-core';
import { ApolloFetch, createApolloFetch } from 'apollo-fetch';
import QueryBatcher from './batching';

/** Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export default class BatchHttpLink extends ApolloLink {
  private headers = {};
  private _fetch: ApolloFetch;
  private batchInterval: number;
  private batchMax: number;
  private batcher: QueryBatcher;

  constructor(fetchParams?: {
    uri?: string;
    batchInterval: number;
    batchMax: number;
    fetch?: ApolloFetch;
  }) {
    super();

    this.batchInterval = fetchParams.batchInterval || 10;
    this.batchMax = fetchParams.batchMax || 10;

    this._fetch =
      (fetchParams && fetchParams.fetch) ||
      createApolloFetch({ uri: fetchParams && fetchParams.uri });

    this._fetch.batchUse((request, next) => {
      request.options.headers = {
        ...request.options.headers,
        ...this.headers,
      };
      next();
    });

    if (typeof this.batchInterval !== 'number') {
      throw new Error(
        `batchInterval must be a number, got ${this.batchInterval}`,
      );
    }

    if (typeof this.batchMax !== 'number') {
      throw new Error(`batchMax must be a number, got ${this.batchMax}`);
    }

    this.batcher = new QueryBatcher({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      apolloFetch: this._fetch,
    });
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.batcher.enqueueRequest(operation);
  }
}
