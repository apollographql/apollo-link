import { Observable, Operation, NextLink, FetchResult } from 'apollo-link-core';

export type BatchOperation = (
  operations: Operation[],
  forward: NextLink[],
) => Observable<FetchResult[]>;

export interface QueryFetchRequest {
  operation: Operation;
  forward?: NextLink;

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
export class QueryBatcher {
  // Queue on which the QueryBatcher will operate on a per-tick basis.
  public queuedRequests: QueryFetchRequest[] = [];

  private batchInterval: number;
  private batchMax: number;

  //This function is called to the queries in the queue to the server.
  private batchOperation: BatchOperation;

  constructor({
    batchInterval,
    batchMax = 0,
    batchOperation,
  }: {
    batchInterval: number;
    batchMax?: number;
    batchOperation: BatchOperation;
  }) {
    this.queuedRequests = [];
    this.batchInterval = batchInterval;
    this.batchMax = batchMax;
    this.batchOperation = batchOperation;
  }

  public enqueueRequest(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> {
    const fetchRequest: QueryFetchRequest = {
      operation,
      forward,
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
    const requests: Operation[] = this.queuedRequests.map(
      queuedRequest => queuedRequest.operation,
    );

    const forwards: NextLink[] = this.queuedRequests.map(
      queuedRequest => queuedRequest.forward,
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

    const batchedObservable = this.batchOperation(requests, forwards);

    batchedObservable.subscribe({
      next: results => {
        results.forEach((result, index) => {
          nexts[index](result);
        });
      },
      error: error => {
        errors.forEach((rejecter, index) => {
          errors[index](error);
        });
      },
      complete: () => {
        completes.forEach(complete => complete());
      },
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
