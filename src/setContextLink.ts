import {
  Operation,
  NextLink,
  FetchResult,
} from './types';
import * as Observable from 'zen-observable';

import {
  ApolloLink,
} from './link';

export default class SetContextLink extends ApolloLink {

  constructor (private context?: any) {
    super();
  }

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
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
