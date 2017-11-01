import { ApolloLink, Observable, RequestHandler } from 'apollo-link';
import { print } from 'graphql/language/printer';

// types
import { ExecutionResult } from 'graphql';
import { ApolloFetch } from 'apollo-fetch';

// XXX replace with actual typings when available
declare var AbortController: any;

type ResponseError = Error & {
  response?: Response;
  parseError: Error;
  statusCode?: number;
};

const parseAndCheckResponse = request => (response: Response) => {
  return response
    .json()
    .then(result => {
      if (response.status >= 300)
        throw new Error(
          `Response not successful: Received status code ${response.status}`,
        );
      if (!result.hasOwnProperty('data') && !result.hasOwnProperty('errors')) {
        throw new Error(
          `Server response was missing for query '${request.operationName}'.`,
        );
      }
      return result;
    })
    .catch(e => {
      const httpError = new Error(
        `Network request failed with status ${response.status} - "${response.statusText}"`,
      ) as ResponseError;
      httpError.response = response;
      httpError.parseError = e;
      httpError.statusCode = response.status;

      throw httpError;
    });
};

const checkFetcher = (fetcher: ApolloFetch | GlobalFetch['fetch']) => {
  if (
    (fetcher as ApolloFetch).use &&
    (fetcher as ApolloFetch).useAfter &&
    (fetcher as ApolloFetch).batchUse &&
    (fetcher as ApolloFetch).batchUseAfter
  ) {
    throw new Error(`
      It looks like you're using apollo-fetch! Apollo Link now uses the native fetch
      implementation, so apollo-fetch is not needed. If you want to use your existing
      apollo-fetch middleware, please check this guide to upgrade:
        https://github.com/apollographql/apollo-link/blob/master/docs/implementation.md
    `);
  }
};

const warnIfNoFetch = fetcher => {
  if (!fetcher && typeof fetch === 'undefined') {
    let library: string = 'unfetch';
    if (typeof window === 'undefined') library = 'node-fetch';
    throw new Error(
      `fetch is not found globally and no fetcher passed, to fix pass a fetch for
      your environment like https://www.npmjs.com/package/${library}.

      For example:
        import fetch from '${library}';
        import { createHttpLink } from 'apollo-link-http';

        const link = createHttpLink({ uri: '/graphql', fetch: fetch });
      `,
    );
  }
};

const createSignalIfSupported = () => {
  if (typeof AbortController === 'undefined')
    return { controller: false, signal: false };

  const controller = new AbortController();
  const signal = controller.signal;
  return { controller, signal };
};

export interface FetchOptions {
  uri?: string;
  fetch?: GlobalFetch['fetch'];
  includeExtensions?: boolean;
  credentials?: string;
  headers?: any;
  fetchOptions?: any;
}
export const createHttpLink = (
  {
    uri,
    fetch: fetcher,
    includeExtensions,
    ...requestOptions,
  }: FetchOptions = {},
) => {
  // dev warnings to ensure fetch is present
  warnIfNoFetch(fetcher);
  if (fetcher) checkFetcher(fetcher);

  // use default global fetch is nothing passed in
  if (!fetcher) fetcher = fetch;
  if (!uri) uri = '/graphql';

  return new ApolloLink(
    operation =>
      new Observable(observer => {
        const {
          headers,
          credentials,
          fetchOptions = {},
          uri: contextURI,
        } = operation.getContext();
        const { operationName, extensions, variables, query } = operation;

        const body = {
          operationName,
          variables,
          query: print(query),
        };
        if (includeExtensions) (body as any).extensions = extensions;

        let serializedBody;
        try {
          serializedBody = JSON.stringify(body);
        } catch (e) {
          const parseError = new Error(
            `Network request failed. Payload is not serializable: ${e.message}`,
          ) as ResponseError;
          parseError.parseError = e;
          throw parseError;
        }

        let options = fetchOptions;
        if (requestOptions.fetchOptions)
          options = { ...requestOptions.fetchOptions, ...options };
        const fetcherOptions = {
          method: 'POST',
          ...options,
          headers: {
            // headers are case insensitive (https://stackoverflow.com/a/5259004)
            accept: '*/*',
            'content-type': 'application/json',
          },
          body: serializedBody,
        };

        if (requestOptions.credentials)
          fetcherOptions.credentials = requestOptions.credentials;
        if (credentials) fetcherOptions.credentials = credentials;

        if (requestOptions.headers)
          fetcherOptions.headers = {
            ...fetcherOptions.headers,
            ...requestOptions.headers,
          };
        if (headers)
          fetcherOptions.headers = { ...fetcherOptions.headers, ...headers };

        const { controller, signal } = createSignalIfSupported();
        if (controller) fetcherOptions.signal = signal;

        fetcher(contextURI || uri, fetcherOptions)
          // attach the raw response to the context for usage
          .then(response => {
            operation.setContext({ response });
            return response;
          })
          .then(parseAndCheckResponse(operation))
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
      }),
  );
};

export class HttpLink extends ApolloLink {
  public requester: RequestHandler;
  constructor(opts: FetchOptions) {
    super();
    this.requester = createHttpLink(opts).request;
  }

  public request(op): Observable<ExecutionResult> | null {
    return this.requester(op);
  }
}
