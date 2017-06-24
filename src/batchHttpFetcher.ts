import {
  ApolloFetcher,
  Operation,
  Observable,
} from './types';
import { print } from 'graphql';
import HttpObservable from './httpObservable';
import { validateOperation } from './fetcherUtils';
import 'isomorphic-fetch';

//Fetch per tick by default
const DEFAULT_BATCH = 0;

interface BatchedRequest {
  operation: Operation;
  resolve;
  reject;
}

export default class BatchHttpFetcher implements ApolloFetcher {

  private _fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  private _uri: string;

  private outstandingRequests: BatchedRequest[];
  private startedInterval: boolean;
  private batchInterval: number;

  constructor(fetchParams?: {
    uri?: string,
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
    batchInterval?: number,
  }) {

    this._fetch = fetchParams && fetchParams.fetch;
    this._uri = fetchParams && fetchParams.uri ? fetchParams.uri : '';
    this.batchInterval = fetchParams && fetchParams.batchInterval ? fetchParams.batchInterval : DEFAULT_BATCH;
    this.outstandingRequests = [];
    this.startedInterval = false;

    this.sendBatch = this.sendBatch.bind(this);
  }

  public request(operation: Operation): Observable {
    validateOperation(operation);

    const observable = new HttpObservable(new Promise((resolve, reject) => {
      this.outstandingRequests.push({operation, resolve, reject});
    }));

    if (!this.startedInterval) {
      this.startedInterval = true;
      setTimeout(this.sendBatch, this.batchInterval);
    }

    return observable;
  }

  private printRequest(operation: Operation) {
    return {
      ...operation,
      query: print(operation.query),
    };
  }

  private sendBatch() {

    const requestsToService = this.outstandingRequests;
    this.outstandingRequests = [];

    const printedRequests = requestsToService.map((request) => {
      return this.printRequest(request.operation);
    });

    const options = {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printedRequests),
    };

    const batchedResults: Promise<Response> = this._fetch ? this._fetch(this._uri, options) : fetch(this._uri, options);
    batchedResults.then(res => res.json())
    .then((results => {
      results.forEach((result, i) => requestsToService[i].resolve(result));
    }))
    .catch(error => {
      requestsToService.forEach(request => request.reject(error));
    });
    this.startedInterval = false;
  }
}
