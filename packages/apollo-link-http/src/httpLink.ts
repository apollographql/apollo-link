import { ApolloLink, Observable, RequestHandler, Operation } from 'apollo-link';
import { BatchLink } from 'apollo-link-batch';
import { print } from 'graphql/language/printer';

// types
import { ApolloFetch } from 'apollo-fetch';

export namespace HttpLink {
  /**
   * A function that generates the URI to use when fetching a particular operation.
   */
  export interface UriFunction {
    (operation: Operation): string;
  }

  /**
   * Contains all of the options for batching
   */
  export interface BatchingOptions {
    batchInterval?: number;
    batchMax?: number;
    reduceOptions: (left: RequestInit, right: RequestInit) => RequestInit;
  }

  export interface Options {
    /**
     * The URI to use when fetching operations.
     *
     * Defaults to '/graphql'.
     */
    uri?: string | UriFunction;

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

    /**
     * Options that enable batching
     */
    batchOptions?: BatchingOptions;
  }
}

// For backwards compatibility.
export import FetchOptions = HttpLink.Options;
export import UriFunction = HttpLink.UriFunction;

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
  bodyText: string;
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

const parseAndCheckResponse = operations => (response: Response) => {
  return response
    .text()
    .then(bodyText => {
      try {
        return JSON.parse(bodyText);
      } catch (err) {
        const parseError = err as ServerParseError;
        parseError.response = response;
        parseError.statusCode = response.status;
        parseError.bodyText = bodyText;
        return Promise.reject(parseError);
      }
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
          `Server response was missing for query '${operations.map(
            op => op.operationName,
          )}'.`,
        );
      }
      return result;
    });
};

const checkFetcher = (fetcher: ApolloFetch | GlobalFetch['fetch']) => {
  if ((fetcher as ApolloFetch).use) {
    throw new Error(`
      It looks like you're using apollo-fetch! Apollo Link now uses native fetch
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

interface HttpOptions {
  includeQuery?: boolean;
  includeExtensions?: boolean;
}

const defaultHttpOptions: HttpOptions = {
  includeQuery: true,
  includeExtensions: false,
};

const defaultHeaders = {
  // headers are case insensitive (https://stackoverflow.com/a/5259004)
  accept: '*/*',
  'content-type': 'application/json',
};

const defaultOptions = {
  method: 'POST',
};

const fallbackConfig = {
  http: defaultHttpOptions,
  headers: defaultHeaders,
  options: defaultOptions,
};

interface ConfigOptions {
  http?: HttpOptions;
  options?: any;
  headers?: any; //overrides headers in options
  credentials?: any;
}

const createOptionsAndBody = (
  operation: Operation,
  fallbackConfig: ConfigOptions,
  ...configs: Array<ConfigOptions>
) => {
  let options: ConfigOptions = {
    ...fallbackConfig.options,
    headers: fallbackConfig.headers,
    credentials: fallbackConfig.credentials,
  };
  let http: HttpOptions = fallbackConfig.http;

  /*
   * use the rest of the configs to populate the options
   * configs later in the list will overwrite earlier fields
   */
  configs.forEach(config => {
    options = {
      ...options,
      ...config.options,
      headers: {
        ...options.headers,
        ...config.headers,
      },
    };
    if (config.credentials) options.credentials = config.credentials;

    http = {
      ...http,
      ...config.http,
    };
  });

  //The body depends on the http options
  const { operationName, extensions, variables, query } = operation;
  const body = { operationName, variables };

  if (http.includeExtensions) (body as any).extensions = extensions;

  // not sending the query (i.e persisted queries)
  if (http.includeQuery) (body as any).query = print(query);

  return {
    options,
    body,
  };
};

const serializeBody = body => {
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
  return serializedBody;
};

const simpleSpread = (left, right) => {
  return {
    ...left,
    ...right,
  };
};

export const createHttpLink = (linkOptions: HttpLink.Options = {}) => {
  let {
    uri,
    fetch: fetcher,
    includeExtensions,
    batchOptions,
    ...requestOptions
  } = linkOptions;

  const linkConfig = {
    http: { includeExtensions },
    options: requestOptions.fetchOptions,
    credentials: requestOptions.credentials,
    headers: requestOptions.headers,
  };

  // dev warnings to ensure fetch is present
  warnIfNoFetch(fetcher);
  if (fetcher) checkFetcher(fetcher);

  // use default global fetch is nothing passed in
  if (!fetcher) fetcher = fetch;
  if (!uri) uri = '/graphql';

  //currently all operations in a single batch use the same uri
  let choosenURI: string;

  return new BatchLink({
    batchInterval: (batchOptions && batchOptions.batchInterval) || 0, //default to no batching
    batchMax: (batchOptions && batchOptions.batchMax) || 1,
    batchHandler: operations => {
      const optsAndBodies = operations.map(operation => {
        const context = operation.getContext();
        const contextURI = context.uri;

        //TODO Add support for multiple URI's, would need to make a fetch request per uri and then place the result in the correct index in result array
        if (contextURI) {
          choosenURI = contextURI;
        } else if (typeof uri === 'function') {
          choosenURI = uri(operation);
        } else {
          choosenURI = (uri as string) || '/graphql';
        }

        const contextConfig = {
          http: context.http,
          options: context.fetchOptions,
          credentials: context.credentials,
          headers: context.headers,
        };

        //creates an { options, body } object
        //uses fallback, link, and then context to build options
        return createOptionsAndBody(
          operation,
          fallbackConfig,
          linkConfig,
          contextConfig,
        );
      });

      const body = optsAndBodies.map(({ body }) => body);
      const allOptions = optsAndBodies.map(({ options }) => options);
      const options = allOptions.reduce(
        (batchOptions && batchOptions.reduceOptions) || simpleSpread,
      );

      return new Observable(observer => {
        const { controller, signal } = createSignalIfSupported();
        if (controller) (options as any).signal = signal;

        if (body.length === 1) {
          //use non-array for compatility with servers that do not support batching
          (options as any).body = serializeBody(body[0]);
        } else {
          (options as any).body = serializeBody(body);
        }

        fetcher(choosenURI, options)
          .then(response => {
            // the raw response is attached to the context in the BatchingLink
            return response;
          })
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
            // if it is a network error, BUT there is graphql result info
            // fire the next observer before calling error
            // this gives apollo-client (and react-apollo) the `graphqlErrors` and `networErrors`
            // to pass to UI
            if (err.result && err.result.errors) {
              // if we dont' call next, the UI can only show networkError because AC didn't
              // get andy graphqlErrors
              // this is graphql execution result info (i.e errors and possibly data)
              // this is because there is no formal spec how errors should translate to
              // http status codes. So an auth error (401) could have both data
              // from a public field, errors from a private field, and a status of 401
              // {
              //  user { // this will have errors
              //    firstName
              //  }
              //  products { // this is public so will have data
              //    cost
              //  }
              // }
              //
              // the result of above *could* look like this:
              // {
              //   data: { products: [{ cost: "$10" }] },
              //   errors: [{
              //      message: 'your session has timed out',
              //      path: []
              //   }]
              // }
              // status code of above would be a 401
              // in the UI you want to show data where you can, errors as data where you can
              // and use correct http status codes
              observer.next(err.result);
            }
            observer.error(err);
          });

        return () => {
          // XXX support canceling this request
          // https://developers.google.com/web/updates/2017/09/abortable-fetch
          if (controller) controller.abort();
        };
      });
    },
  });
};

export class HttpLink extends ApolloLink {
  public requester: RequestHandler;
  constructor(opts?: HttpLink.Options) {
    super(createHttpLink(opts).request);
  }
}
