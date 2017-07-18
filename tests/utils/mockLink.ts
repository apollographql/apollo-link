import {
  Operation,
  RequestHandler,
  NextLink,
  FetchResult,
} from '../../src/types';

import * as Observable from 'zen-observable';

import { ApolloLink } from '../../src/link';

export default class MockLink extends ApolloLink {

  constructor(handleRequest: RequestHandler = () => null) {
    super();
    this.request = handleRequest;
  }

  public request(operation: Operation, forward?: NextLink): Observable<FetchResult> | null {
    throw Error('should be overridden');
  }
}
