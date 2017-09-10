import {
  ApolloLink,
} from 'apollo-link-core';

import {
  OutputMap,
} from 'persistgraphql';

export default class PersistLink extends ApolloLink {
  private queryMap: OutputMap;

  request(
    operation?: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    // TODO Implement query lookups
  }
}


