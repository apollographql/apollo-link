import {
  ApolloLink,
  NextLink,
  Operation,
  FetchResult,
  Observable,
} from 'apollo-link-core';

import {
  OutputMap,
  getQueryDocumentKey,
} from 'persistgraphql';

export default class PersistLink extends ApolloLink {
  private queryMap: OutputMap;

  constructor(
    queryMap: OutputMap,
  ) {
    super();

    this.queryMap = queryMap;
  }

  public request(
    operation?: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    const queryDocument = operation.query;
    const queryKey = getQueryDocumentKey(queryDocument);

    // If we are unable to find the query inside the query
    // map, we error on the returned observable and don't
    // proceed within the link stack.
    if (!this.queryMap[queryKey]) {
      return new Observable(observer => {
        observer.error(new Error('Could not find query inside query map.'));
      });
    }

    return forward({
      query: null,
      variables: operation.variables,
      operationName: operation.operationName,
      context: {
        queryId: this.queryMap[queryKey],
      },
    } as Operation);
  }
}


