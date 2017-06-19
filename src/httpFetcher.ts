import {
  ApolloFetcher,
  Operation,
  Observable,
} from './types';
import { print } from 'graphql';
import {
  DocumentNode,
  DefinitionNode,
  OperationDefinitionNode,
} from 'graphql/language/ast';
import HttpObservable from './httpObservable';
import 'isomorphic-fetch';

export default class HttpFetcher implements ApolloFetcher {

  private _fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  private _uri: string;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  }) {

    this._fetch = fetchParams && fetchParams.fetch ? fetchParams.fetch : fetch;
    this._uri = fetchParams && fetchParams.uri ? fetchParams.uri : '';
  }

  public request(operation: Operation): Observable {
    if (!this.checkOperation(operation)) {
      //TODO provide exact argument
      throw new Error('illegal argument');
    }
    const { query, variables, operationName, context } = operation;

    //Queries sent with GET requests
    const method = this.getRequestType(query);

    const headers = { 'Accept': '*/*' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    return new HttpObservable(
      () => this._fetch(
        method === 'GET' ? this.buildURI(this._uri, operation) : this._uri,
        {
          body: JSON.stringify({
            query: print(query),
            variables: variables || {},
            operationName,
            context,
          }),
          method,
          headers,
      }),
    );
  }

  private queryParameters(op: Operation): string {
    const query = encodeURIComponent(print(op.query).replace(/\s\s+/g, ' '));

    let params = `query=${query}`;
    params += op.operationName ? `&operationName=${encodeURIComponent(op.operationName)}` : '';
    params += op.variables ? `&variables=${encodeURIComponent(JSON.stringify(op.variables))}` : '';
    params += op.context ? `&context=${encodeURIComponent(JSON.stringify(op.context))}` : '';

    return params;
  }

  private buildURI(uri: string, operation: Operation): string {
    return `${uri}?${this.queryParameters(operation)}`;
  }

  private isQuery(definition: DefinitionNode): boolean {
    if (definition.kind !== 'OperationDefinition') {
      return false;
    }
    const operationNode = <OperationDefinitionNode>definition;
    return operationNode.operation === 'query';
  }

  private getRequestType(query: DocumentNode) {
    const definitions = query.definitions;
    const nonQuery = definitions.find(def => !this.isQuery(def));
    return nonQuery ? 'POST' : 'GET';
  }

  private checkOperation(operation: Operation): boolean {
    let count = 0;
    count += operation.hasOwnProperty('query') ? 1 : 0;
    count += operation.hasOwnProperty('operationName') ? 1 : 0;
    count += operation.hasOwnProperty('variables') ? 1 : 0;
    count += operation.hasOwnProperty('context') ? 1 : 0;

    return count === Object.keys(operation).length;
  }
}
