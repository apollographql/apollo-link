import { Operation, NextLink, FetchResult } from '../types';

import * as Observable from 'zen-observable';

import { ApolloLink } from '../link';

export default class SetContextLink extends ApolloLink {
  constructor(
    private setContext: (
      context: Record<string, any>,
    ) => Record<string, any> = c => c,
  ) {
    super();
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    operation.setContext(this.setContext(operation.getContext()));
    return forward(operation);
  }
}
