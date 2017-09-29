import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { print } from 'graphql/language/printer';

type ResponseError = Error | { response?: Response; parseError?: Error };
const parseAndCheckResponse = response => {
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
      const httpError: ResponseError = new Error(
        `Network request failed with status ${response.status} - "${response.statusText}"`,
      );
      httpError.response = response;
      httpError.parseError = e;

      throw httpError;
    });
};

const checkFetcher = fetcher => {
  if (
    fetcher.use &&
    fetcher.useAfter &&
    fetcher.batchUse &&
    fetcher.batchUseAfter
  ) {
    throw new Error(
      `It looks like you're using apollo-fetch! Apollo Link now uses the native fetch implementation, so apollo-fetch is not needed. If you want to use your existing apollo-fetch middleware, please check this guide to upgrade: https://github.com/apollographql/apollo-link/blob/master/docs/implementation.md`,
    );
  }
};

export interface FetchOptions {
  uri?: string;
  fetch?: Fetch;
  includeExtensions?: boolean;
}
export const createFetchLink = ({
  uri,
  fetch: fetcher,
  includeExtensions,
}: FetchOptions) => {
  if (!fetcher && typeof fetch === 'undefined') {
    let link: string = 'https://www.npmjs.com/package/unfetch';
    if (typeof window === 'undefined') {
      link = 'https://www.npmjs.com/package/node-fetch';
    }
    throw new Error(
      `fetch is not found globally and no fetcher passed, to fix pass a fetch via ${link}`,
    );
  }

  if (fetcher) checkFetcher(fetcher);

  // use default global fetch is nothing passed in
  if (!fetcher) fetcher = fetch;
  if (!uri) uri = '/graphql';

  return new ApolloLink(
    operation =>
      new Observable(observer => {
        const { headers, credentials, fetcherOptions } = operation.getContext();
        const { operationName, extensions, variables, query } = operation;

        const body = { operationName, variables, query: print(query) };
        if (includeExtensions) body.extensions = extensions;

        try {
          const serializedBody = JSON.stringify(body);
        } catch (e) {
          throw new Error(
            `Network request failed. Payload is not serializable: ${e.message}`,
          );
        }

        const fetchOptions = {
          method: 'POST',
          headers: {
            // headers are case insensitive (https://stackoverflow.com/a/5259004)
            accept: '*/*',
            'content-type': 'application/json',
          },
          body: serializedBody,
        };
        // XXX check for signal API;

        if (credentials) fetchOptions.credentials = credentials;
        if (headers)
          fetchOptions.headers = { ...fetchOptions.headers, ...headers };

        /*
         * XXX
         *
         * - support an array of operations (batch)
         * - support canceling
         *
         */

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
  constructor(opts: FetchOptions) {
    this.request = createFetchLink(opts);
  }
}
