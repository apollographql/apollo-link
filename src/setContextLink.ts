import {
  ApolloLink,
  Operation,
  NextLink,
  Observable,
} from './types';

export default class SetContextLink implements ApolloLink {

  constructor (private context: object) {

  }

  public request(operation: Operation, forward: NextLink): Observable {
    if (!operation.context) {
      operation.context = {};
    }
    operation.context = {
      ...operation.context,
      ...this.context,
    };
    return forward(operation);
  }

}
