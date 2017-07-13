import { ApolloLink } from './link';
import {
  Operation,
  NextLink,
  FetchResult,
} from './types';
import SingleRequestLink from './singleRequestLink';
import { ApolloFetch, createApolloFetch } from 'apollo-fetch';

import * as Observable from 'zen-observable';

export default class HttpLink extends ApolloLink {

  private headers = {};
  private _fetch: ApolloFetch;
  private requestLink: ApolloLink;

  constructor (fetchParams?: {
    uri?: string,
    fetch?: ApolloFetch,
  }) {
    super();
    this._fetch = fetchParams && fetchParams.fetch || createApolloFetch({ uri: fetchParams && fetchParams.uri });
    this._fetch.use((request, next) => {
      request.options.headers = {
        ...request.options.headers,
        ...this.headers,
      };
      next();
    });

    this.requestLink = new SingleRequestLink({
      ...(fetchParams || {}),
      fetch: this._fetch,
    });
  }

  public request(operation: Operation, forward?: NextLink): Observable<FetchResult> | null {
    this.headers = operation.context && operation.context.headers || {};
    return this.requestLink.request(operation, forward);
  }
}
