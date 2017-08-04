import { Observable, Operation, FetchResult } from 'apollo-link-core';
import { ApolloFetch, GraphQLRequest } from 'apollo-fetch';

import { print } from 'graphql/language/printer';

export interface QueryFetchRequest {
  operation: Operation;

  // promise is created when the query fetch request is
  // added to the queue and is resolved once the result is back
  // from the server.
  observable?: Observable<FetchResult>;
  next?: (result: FetchResult) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

// QueryBatcher doesn't fire requests immediately. Requests that were enqueued within
// a certain amount of time (configurable through `batchInterval`) will be batched together
// into one query.
export default class QueryBatcher {
  // Queue on which the QueryBatcher will operate on a per-tick basis.
  public queuedRequests: QueryFetchRequest[] = [];

  private batchInterval: number;
  private batchMax: number;

  //This function is called to the queries in the queue to the server.
  private apolloFetch: ApolloFetch;

  constructor({
    batchInterval,
    batchMax = 0,
    apolloFetch,
  }: {
    batchInterval: number;
    batchMax?: number;
    apolloFetch: ApolloFetch;
  }) {
    this.queuedRequests = [];
    this.batchInterval = batchInterval;
    this.batchMax = batchMax;
    this.apolloFetch = apolloFetch;
  }

  public enqueueRequest(operation: Operation): Observable<FetchResult> {
    const fetchRequest: QueryFetchRequest = {
      operation,
    };
    this.queuedRequests.push(fetchRequest);
    fetchRequest.observable = new Observable(observer => {
      fetchRequest.next = observer.next.bind(observer);
      fetchRequest.error = observer.error.bind(observer);
      fetchRequest.complete = observer.complete.bind(observer);
    });

    // The first enqueued request triggers the queue consumption after `batchInterval` milliseconds.
    if (this.queuedRequests.length === 1) {
      this.scheduleQueueConsumption();
    }

    // When amount of requests reaches `batchMax`, trigger the queue consumption without waiting on the `batchInterval`.
    if (this.queuedRequests.length === this.batchMax) {
      this.consumeQueue();
    }

    return fetchRequest.observable;
  }

  // Consumes the queue.
  // Returns a list of promises (one for each query).
  public consumeQueue(): (Observable<FetchResult> | undefined)[] | undefined {
    const requests: GraphQLRequest[] = this.queuedRequests.map(
      queuedRequest => ({
        ...queuedRequest.operation,
        query: print(queuedRequest.operation.query),
      }),
    );

    const observables: (Observable<FetchResult> | undefined)[] = [];
    const nexts: any[] = [];
    const errors: any[] = [];
    const completes: any[] = [];
    this.queuedRequests.forEach((fetchRequest, index) => {
      observables.push(fetchRequest.observable);
      nexts.push(fetchRequest.next);
      errors.push(fetchRequest.error);
      completes.push(fetchRequest.complete);
    });

    this.queuedRequests = [];

    const batchedPromise = this.apolloFetch(requests);

    batchedPromise
      .then(results => {
        results.forEach((result, index) => {
          nexts[index](result);
          completes[index]();
        });
      })
      .catch(error => {
        errors.forEach((rejecter, index) => {
          errors[index](error);
        });
      });

    return observables;
  }

  private scheduleQueueConsumption(): void {
    setTimeout(() => {
      if (this.queuedRequests.length) {
        this.consumeQueue();
      }
    }, this.batchInterval);
  }
}
