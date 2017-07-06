import {
  Observable,
  ApolloLink,
  Operation,
  RequestHandler,
  NextLink,
} from './types';
import {
  validateOperation,
} from './linkUtils';

export default class MockLink implements ApolloLink {

  constructor(private handleRequest?: RequestHandler) {

  }

  public request(operation: Operation, next?: NextLink): Observable {
    validateOperation(operation);

    return this.handleRequest(operation, next);
  }
}
