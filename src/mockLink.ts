import {
  Operation,
  RequestHandler,
  NextLink,
  FetchResult,
} from './types';
import {
  validateOperation,
} from './linkUtils';

import * as Observable from 'zen-observable';

import { ApolloLink } from './link';

export default class MockLink extends ApolloLink {

  constructor(private handleRequest?: RequestHandler) {
    super();
  }

  public request(operation: Operation, forward?: NextLink): Observable<FetchResult> {
    validateOperation(operation);

    return this.handleRequest(operation, forward);
  }
}
