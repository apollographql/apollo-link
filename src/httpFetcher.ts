import {
  ApolloFetcher,
  Operation,
  Observable,
} from './types';
import {
  DocumentNode,
  DefinitionNode,
  OperationDefinitionNode,
} from 'graphql/language/ast';
import { print } from 'graphql';
import HttpObservable from './httpObservable';
import { validateOperation } from './apolloFetchHelpers';
import 'isomorphic-fetch';

class HttpUtils {

  public static buildURI(uri: string, operation: Operation): string {
    return `${uri}?${HttpUtils.queryParameters(operation)}`;
  }

  public static getRequestType(query: DocumentNode) {
    const definitions = query.definitions;
    const nonQuery = definitions.find(def => !this.isOperationType(def, 'query'));
    return nonQuery ? 'POST' : 'GET';
  }

  private static queryParameters(op: Operation): string {
    let params = [];
    if (op.query) {
      params.push(`query=${encodeURIComponent(print(op.query))}`);
    }
    if (op.operationName) {
      params.push(`operationName=${encodeURIComponent(op.operationName)}`);
    }
    if (op.variables) {
      params.push(`variables=${encodeURIComponent(JSON.stringify(op.variables))}`);
    }
    if (op.context) {
      params.push(`context=${encodeURIComponent(JSON.stringify(op.context))}`);
    }

    return params.join('&');
  }

  private static isOperationType(definition: DefinitionNode, operationType: string): boolean {
    if (definition.kind !== 'OperationDefinition') {
      return false;
    }
    const operationNode = <OperationDefinitionNode>definition;
    return operationNode.operation === operationType;
  }

}

export default class HttpFetcher implements ApolloFetcher {

  private _fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  private _uri: string;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  }) {

    this._fetch = fetchParams && fetchParams.fetch;
    this._uri = fetchParams && fetchParams.uri ? fetchParams.uri : '';
  }

  public request(operation: Operation): Observable {
    validateOperation(operation);
    const { query, variables, operationName, context } = operation;

    //Queries sent with GET requests
    const method = HttpUtils.getRequestType(query);

    const headers = { 'Accept': '*/*' };
    switch (method) {
      case 'GET':
        const uri = HttpUtils.buildURI(this._uri, operation);
        return this.createHttpObservable({
          uri,
          headers,
          method,
        });
      case 'POST':
        headers['Content-Type'] = 'application/json';
        const body = JSON.stringify({
          query: print(query),
          variables,
          operationName,
          context,
        });
        return this.createHttpObservable({
          uri: this._uri,
          headers,
          method,
          body,
        });
      default:
        throw new Error('');
    }
  }

  private createHttpObservable = (fetchParams: {
    uri?: string,
    body?: string,
    method: string,
    headers?: object,
  }) => {
    const { uri, body, method, headers } =  fetchParams;
    const fetchFunction = () => this._fetch ? this._fetch(uri, {headers, body, method}) : fetch(uri, {headers, body, method});
    return new HttpObservable(fetchFunction);
  }

}

