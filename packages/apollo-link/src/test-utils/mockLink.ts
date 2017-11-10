import { Operation, RequestHandler, NextLink, FetchResult } from '../types';

import * as Observable from 'zen-observable';

import { ApolloLink } from '../link';

export default class MockLink extends ApolloLink {
  constructor(handleRequest: RequestHandler = () => Observable.of()) {
    super();
    this.request = handleRequest;
  }

  public request(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> {
    throw Error('should be overridden');
  }
}
