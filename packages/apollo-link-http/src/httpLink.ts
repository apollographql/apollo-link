import { ApolloLink, Observable } from 'apollo-link';
import { print } from 'graphql/language/printer';

import { ApolloFetch } from 'apollo-fetch';

type ResponseError = Error & { response: Response; parseError: Error };

const parseAndCheckResponse = (response: Response) => {
  return response
    .json()
    .then(result => {
      if (response.status >= 300)
        throw new Error(
          `Response not successful: Received status code ${response.status}`,
        );
      return result;
    })
    .catch(e => {
      const httpError = new Error(
        `Network request failed with status ${response.status} - "${response.statusText}"`,
      ) as ResponseError;
      httpError.response = response;
      httpError.parseError = e;

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
        import { createFetchLink } from 'apollo-link-fetch';

        const link = createFetchLink({ uri: '/graphql', fetch: fetch });
      `,
    );
  }
};

export interface FetchOptions {
  uri?: string;
  fetch?: GlobalFetch['fetch'];
  includeExtensions?: boolean;
}
export const createFetchLink = (
  { uri, fetch: fetcher, includeExtensions }: FetchOptions = {},
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
        const { headers, credentials, fetcherOptions } = operation.getContext();
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
          throw new Error(
            `Network request failed. Payload is not serializable: ${e.message}`,
          );
        }

        const fetchOptions = {
          method: 'POST',
          ...fetcherOptions,
          headers: {
            // headers are case insensitive (https://stackoverflow.com/a/5259004)
            accept: '*/*',
            'content-type': 'application/json',
          },
          body: serializedBody,
        };

        if (credentials) fetchOptions.credentials = credentials;
        if (headers)
          fetchOptions.headers = { ...fetchOptions.headers, ...headers };

        fetcher(uri, fetchOptions)
          .then(parseAndCheckResponse)
          .then(result => {
            // we have data and can send it to back up the link chain
            observer.next(result);
            observer.complete();
            return result;
          })
          .catch(observer.error.bind(observer));

        return () => {
          // XXX support canceling this request
          // https://developers.google.com/web/updates/2017/09/abortable-fetch
        };
      }),
  );
};

export class FetchLink extends ApolloLink {
  private fetcher: ApolloLink;
  constructor(opts: FetchOptions) {
    super();
    this.fetcher = createFetchLink(opts);
  }

  public request(operation) {
    return this.fetcher.request(operation);
  }
}
