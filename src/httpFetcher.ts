import {
  ApolloFetcher,
  Operation,
  Observable,
} from './types';
import { print } from 'graphql';
import HttpObservable from './httpObservable';
import { validateOperation } from './fetcherUtils';
import HttpUtils from './httpUtils';
import 'isomorphic-fetch';

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
    const fetchResult = this._fetch ? this._fetch(uri, {headers, body, method}) : fetch(uri, {headers, body, method});
    return new HttpObservable(fetchResult.then(res => res.json()));
  }

}

