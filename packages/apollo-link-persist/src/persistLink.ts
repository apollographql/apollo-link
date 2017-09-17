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
    
  request(
    operation?: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    const queryDocument = operation.query;
    const queryKey = getQueryDocumentKey(queryDocument);

    if (!this.queryMap[queryKey]) {
      // TODO handle the error if the query key is not found
    }

    return forward({
      query: null,
      id: this.queryMap[queryKey],
      variables: operation.variables,
      operationName: operation.operationName,
    } as Operation);
  }
}


