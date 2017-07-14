import {
  Operation,
  FetchResult,
} from './types';
import * as Observable from 'zen-observable';
import {
  createApolloFetch,
  ApolloFetch,
} from 'apollo-fetch';
import { print } from 'graphql/language/printer';

import {
  ApolloLink,
} from './link';

export default class SingleRequestLink extends ApolloLink {

  private _fetch: ApolloFetch;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: ApolloFetch,
  }) {
    super();
    this._fetch = fetchParams && fetchParams.fetch || createApolloFetch({ uri: fetchParams && fetchParams.uri });
  }

  public request(operation: Operation): Observable<FetchResult> {
    const request = {
      ...operation,
      query: print(operation.query),
    };

    return new Observable<FetchResult>(observer => {
      this._fetch(request)
      .then(data => {
        if (!observer.closed) {
          observer.next(data);
          observer.complete();
        }
      })
      .catch(error => {
        if (!observer.closed) {
          observer.error(error);
        }
      });
    });
  }

}

