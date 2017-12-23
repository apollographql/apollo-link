import { Observable, Operation, NextLink, FetchResult } from 'apollo-link';

export type BatchHandler = (
  operations: Operation[],
  forward?: (NextLink | undefined)[],
) => Observable<FetchResult[]> | null;

export interface BatchableRequest {
  operation: Operation;
  forward?: NextLink;

  // promise is created when the query fetch request is
  // added to the queue and is resolved once the result is back
  // from the server.
  observable?: Observable<FetchResult>;
  next?: Array<(result: FetchResult) => void>;
  error?: Array<(error: Error) => void>;
  complete?: Array<() => void>;
}

// QueryBatcher doesn't fire requests immediately. Requests that were enqueued within
// a certain amount of time (configurable through `batchInterval`) will be batched together
// into one query.
export class OperationBatcher {
  // Queue on which the QueryBatcher will operate on a per-tick basis.
  public queuedRequests: BatchableRequest[] = [];

  private batchInterval: number;
  private batchMax: number;

  //This function is called to the queries in the queue to the server.
  private batchHandler: BatchHandler;

  constructor({
    batchInterval,
    batchMax = 0,
    batchHandler,
  }: {
    batchInterval: number;
    batchMax?: number;
    batchHandler: BatchHandler;
  }) {
    this.queuedRequests = [];
    this.batchInterval = batchInterval;
    this.batchMax = batchMax;
    this.batchHandler = batchHandler;
  }

  public enqueueRequest(request: BatchableRequest): Observable<FetchResult> {
    const requestCopy = {
      ...request,
    };
    let queued = false;

    requestCopy.observable =
      requestCopy.observable ||
      new Observable<FetchResult>(observer => {
        //called for each subscriber, so need to save all listeners(next, error, complete)
        if (!queued) {
          this.queuedRequests.push(requestCopy);
          queued = true;
        }

        requestCopy.next = requestCopy.next || [];
        if (observer.next) requestCopy.next.push(observer.next.bind(observer));

        requestCopy.error = requestCopy.error || [];
        if (observer.error)
          requestCopy.error.push(observer.error.bind(observer));

        requestCopy.complete = requestCopy.complete || [];
        if (observer.complete)
          requestCopy.complete.push(observer.complete.bind(observer));

        // The first enqueued request triggers the queue consumption after `batchInterval` milliseconds.
        if (this.queuedRequests.length === 1) {
          this.scheduleQueueConsumption();
        }

        // When amount of requests reaches `batchMax`, trigger the queue consumption without waiting on the `batchInterval`.
        if (this.queuedRequests.length === this.batchMax) {
          this.consumeQueue();
        }
      });

    return requestCopy.observable;
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
    this.queuedRequests.forEach((batchableRequest, index) => {
      observables.push(batchableRequest.observable);
      nexts.push(batchableRequest.next);
      errors.push(batchableRequest.error);
      completes.push(batchableRequest.complete);
    });

    this.queuedRequests = [];

    const batchedObservable =
      this.batchHandler(requests, forwards) || Observable.of();

    batchedObservable.subscribe({
      next: results => {
        if (!Array.isArray(results)) {
          results = [results];
          if (nexts.length != 1)
            console.warn(
              `server returned single result, expected array of length ${
                nexts.length
              }`,
            );
        }
        // console.log(results);
        results.forEach((result, index) => {
          // console.log(result);
          // console.log(`${result} at ${index}`);
          // attach the raw response to the context for usage
          requests[index].setContext({ response: result });
          if (nexts[index]) {
            nexts[index].forEach(next => next(result));
          }
        });
      },
      error: error => {
        //each callback list in batch
        errors.forEach((rejecter, index) => {
          if (errors[index]) {
            //each subscriber to request
            errors[index].forEach(e => e(error));
          }
        });
      },
      complete: () => {
        completes.forEach(complete => {
          if (complete) {
            //each subscriber to request
            complete.forEach(c => c());
          }
        });
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
