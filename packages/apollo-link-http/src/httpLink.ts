import { ApolloLink, Observable, RequestHandler } from 'apollo-link';
import { print } from 'graphql/language/printer';

// types
import { ApolloFetch } from 'apollo-fetch';

// XXX replace with actual typings when available
declare var AbortController: any;

//Used for any Error for data from the server
//on a request with a Status >= 300
//response contains no data or errors
type ServerError = Error & {
  response: Response;
  result: Record<string, any>;
  statusCode: number;
};

//Thrown when server's resonse is cannot be parsed
type ServerParseError = Error & {
  response: Response;
  statusCode: number;
};

type ClientParseError = Error & {
  parseError: Error;
};

const throwServerError = (response, result, message) => {
  const error = new Error(message) as ServerError;

  error.response = response;
  error.statusCode = response.status;
  error.result = result;

  throw error;
};

const parseAndCheckResponse = request => (response: Response) => {
  return response
    .json()
    .catch(e => {
      const parseError = e as ServerParseError;
      parseError.response = response;
      parseError.statusCode = response.status;

      throw parseError;
    })
    .then(result => {
      if (response.status >= 300) {
        //Network error
        throwServerError(
          response,
          result,
          `Response not successful: Received status code ${response.status}`,
        );
      }
      if (!result.hasOwnProperty('data') && !result.hasOwnProperty('errors')) {
        //Data error
        throwServerError(
          response,
          result,
          `Server response was missing for query '${request.operationName}'.`,
        );
      }
      return result;
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

const defaultHttpOptions = {
  includeQuery: true,
  includeExtensions: false,
};

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
          http: httpOptions = {},
        } = operation.getContext();
        const { operationName, extensions, variables, query } = operation;
        const http = { ...defaultHttpOptions, ...httpOptions };
        const body = { operationName, variables };

        if (includeExtensions || http.includeExtensions)
          (body as any).extensions = extensions;

        // not sending the query (i.e persisted queries)
        if (http.includeQuery) (body as any).query = print(query);

        let serializedBody;
        try {
          serializedBody = JSON.stringify(body);
        } catch (e) {
          const parseError = new Error(
            `Network request failed. Payload is not serializable: ${e.message}`,
          ) as ClientParseError;
          parseError.parseError = e;
          throw parseError;
        }

        let options = fetchOptions;
        if (requestOptions.fetchOptions)
          options = { ...requestOptions.fetchOptions, ...options };
        const fetcherOptions: any = {
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
    super(createHttpLink(opts).request);
  }
}
