import {
  ApolloLink,
  Operation,
  Observable,
  FetchResult,
} from './types';
import OneTimeObservable from './oneTimeObservable';
import { validateOperation } from './linkUtils';
import {
  createApolloFetch,
  ApolloFetch,
} from 'apollo-fetch';
import { print } from 'graphql/language/printer';

export default class SingleRequestLink implements ApolloLink {

  private _fetch: (operation: Operation) => Promise<FetchResult>;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: ApolloFetch,
  }) {
    this._fetch = fetchParams && fetchParams.fetch || createApolloFetch({ uri: fetchParams && fetchParams.uri });
  }

  public request(operation: Operation): Observable {
    validateOperation(operation);

    const request = {
      ...operation,
      query: print(operation.query),
    };

    return new OneTimeObservable(this._fetch(request));
  }

}

