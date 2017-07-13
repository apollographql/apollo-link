import {
  Operation,
  FetchResult,
  NextLink,
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

  private _fetch: (operation: Operation) => Promise<FetchResult>;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: ApolloFetch,
  }) {
    super();
    this._fetch = fetchParams && fetchParams.fetch || createApolloFetch({ uri: fetchParams && fetchParams.uri });
  }

  public request(operation: Operation, forward?: NextLink) {
    const request = {
      ...operation,
      query: print(operation.query),
    };

    return new Observable<FetchResult>(observer => {
      let closed = false;

      this._fetch(request)
      .then(data => {
        if (!closed) {
          observer.next(data);
          observer.complete();
        }
      })
      .catch(error => {
        if (!closed) {
          observer.error(error);
        }
      });

      return () => { closed = true; };
    });
  }

}

