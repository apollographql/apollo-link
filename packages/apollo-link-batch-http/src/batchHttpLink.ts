import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import {
  serializeBody,
  selectURI,
  parseAndCheckResponse,
  checkFetcher,
  selectOptionsAndBody,
  createSignalIfSupported,
  LinkUtils,
} from 'apollo-link-utilities';
import { BatchLink } from 'apollo-link-batch';

export namespace BatchHttpLink {
  export interface Options extends LinkUtils.Options {
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
     * Sets the key for an Operation, which specifies the batch an operation is included in
     */
    batchKey?: (Operation) => string;
  }
}

/**
 * Transforms Operation for into HTTP results.
 * context can include the headers property, which will be passed to the fetch function
 */
export class BatchHttpLink extends ApolloLink {
  private batchInterval: number;
  private batchMax: number;
  private batcher: ApolloLink;

  constructor(fetchParams: BatchHttpLink.Options = {}) {
    super();

    let {
      uri = '/graphql',
      // use default global fetch is nothing passed in
      fetch: fetcher = fetch,
      includeExtensions,
      batchInterval,
      batchMax,
      ...requestOptions
    } = fetchParams;

    // dev warnings to ensure fetch is present
    checkFetcher(fetcher);

    const linkConfig = {
      http: { includeExtensions },
      options: requestOptions.fetchOptions,
      credentials: requestOptions.credentials,
      headers: requestOptions.headers,
    };

    this.batchInterval = batchInterval || 10;
    this.batchMax = batchMax || 10;

    const batchHandler = (operations: Operation[]) => {
      const chosenURI = selectURI(operations[0], uri);

      const context = operations[0].getContext();

      const contextConfig = {
        http: context.http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: context.headers,
      };

      //uses fallback, link, and then context to build options
      const optsAndBody = operations.map(operation =>
        selectOptionsAndBody(
          operation,
          LinkUtils.fallbackConfig,
          linkConfig,
          contextConfig,
        ),
      );

      const body = optsAndBody.map(({ body }) => body);
      const options = optsAndBody[0].options;

      (options as any).body = serializeBody(body);

      return new Observable<FetchResult[]>(observer => {
        const { controller, signal } = createSignalIfSupported();
        if (controller) (options as any).signal = signal;

        // the raw response is attached to the context in the BatchingLink
        fetcher(chosenURI, options)
          .then(parseAndCheckResponse(operations))
          .then(result => {
            // we have data and can send it to back up the link chain
            observer.next(result);
            observer.complete();
            return result;
          })
          .catch(err => {
            // fetch was cancelled so its already been cleaned up in the unsubscribe
            if (err.name === 'AbortError') return;
            observer.error(err);
          });

        return () => {
          // XXX support canceling this request
          // https://developers.google.com/web/updates/2017/09/abortable-fetch
          if (controller) controller.abort();
        };
      });
    };

    const batchKey = (operation: Operation) => {
      const context = operation.getContext();

      const contextConfig = {
        http: context.http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: context.headers,
      };

      //may throw error if config not serializable
      return selectURI(operation) + JSON.stringify(contextConfig);
    };

    this.batcher = new BatchLink({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchKey,
      batchHandler,
    });
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return this.batcher.request(operation);
  }
}
