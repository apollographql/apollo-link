import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';

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
     *
     */
    reduceOptions: (left: RequestInit, right: RequestInit) => RequestInit;

    /**
     * Passes the extensions field to your graphql server.
     *
     * Defaults to false.
     */
    includeExtensions?: boolean;

    /**
     * A `fetch`-compatible API to use when making requests.
     */
    fetch?: GlobalFetch['fetch'];

    /**
     * An object representing values to be sent as headers on the request.
     */
    headers?: any;

    /**
     * The credentials policy you want to use for the fetch call.
     */
    credentials?: string;

    /**
     * Any overrides of the fetch options argument to pass to the fetch call.
     */
    fetchOptions?: any;
  }

  /**
   * Contains all of the options for batching
   */
  export interface BatchingOptions {
    batchInterval?: number;
    batchMax?: number;
    reduceOptions: (left: RequestInit, right: RequestInit) => RequestInit;
  }
}

/** Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export class BatchHttpLink extends ApolloLink {
  private batchInterval: number;
  private batchMax: number;
  private batcher: ApolloLink;

  constructor(options?: BatchHttpLink.Options) {
    super();

    this.batchInterval = (options && options.batchInterval) || 10;
    this.batchMax = (options && options.batchMax) || 10;

    this.batcher = createHttpLink({
      uri: options && options.uri,
      includeExtensions: options && options.includeExtensions,
      headers: options && options.headers,
      credentials: options && options.credentials,
      fetch: options && options.fetch,
      fetchOptions: options && options.fetchOptions,
      batchOptions: {
        batchInterval: this.batchInterval,
        batchMax: this.batchMax,
        //TODO: export some more ways to reduce the options, so that this link does something more than just mirror apollo-link-http
        reduceOptions: options && options.reduceOptions,
      },
    });
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.batcher.request(operation);
  }
}
