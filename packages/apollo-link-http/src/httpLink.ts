import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';

import { print } from 'graphql/language/printer';

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
  // XXX log a warning if you don't have fetch and you didn't pass one in
  // link you unfetch ponyfill as a solution or node-fetch is no window
  if (!fetcher && typeof fetch === 'undefined') {
    // link to unfetch
    let link: string = '';
    if (typeof window === 'undefined') {
      link = 'some link to node fetch';
    }
    throw new Error(
      `fetch is not found globally and no fetcher passed, to fix pass a fetch via ${link}`,
    );
  }

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

        const fetchOptions = {
          method: 'POST',
          headers: {
            // headers are case insensitive (https://stackoverflow.com/a/5259004)
            accept: '*/*',
            'content-type': 'application/json',
          },
          // XXX add error handling
          body: JSON.stringify(body),
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
         * - support error handling for StatusCodes
         * - add in safety check like making sure request is serializeable
         * - add in helpful dev warnings
         * - add in migration guide warnings
         *    - useAfter no longer exists....
         *
         */

        fetcher(uri, fetchOptions)
          .then(parseResponse)
          .then(handleError)
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
