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
  // Public only for testing
  public queuedRequests: Map<string, BatchableRequest[]>;

  private batchInterval: number;
  private batchMax: number;

  //This function is called to the queries in the queue to the server.
  private batchHandler: BatchHandler;
  private batchKey: (operation: Operation) => string;

  constructor({
    batchInterval,
    batchMax = 0,
    batchHandler,
    batchKey = () => '',
  }: {
    batchInterval: number;
    batchMax?: number;
    batchHandler: BatchHandler;
    batchKey?: (operation: Operation) => string;
  }) {
    this.queuedRequests = new Map();
    this.batchInterval = batchInterval;
    this.batchMax = batchMax;
    this.batchHandler = batchHandler;
    this.batchKey = batchKey;
  }

  public enqueueRequest(request: BatchableRequest): Observable<FetchResult> {
    const requestCopy = {
      ...request,
    };
    let queued = false;

    const key = this.batchKey(request.operation);

    if (!requestCopy.observable) {
      requestCopy.observable = new Observable<FetchResult>(observer => {
        if (!this.queuedRequests.has(key)) {
          this.queuedRequests.set(key, []);
        }

        if (!queued) {
          this.queuedRequests.get(key).push(requestCopy);
          queued = true;
        }

        //called for each subscriber, so need to save all listeners(next, error, complete)
        requestCopy.next = requestCopy.next || [];
        if (observer.next) requestCopy.next.push(observer.next.bind(observer));

        requestCopy.error = requestCopy.error || [];
        if (observer.error)
          requestCopy.error.push(observer.error.bind(observer));

        requestCopy.complete = requestCopy.complete || [];
        if (observer.complete)
          requestCopy.complete.push(observer.complete.bind(observer));

        // The first enqueued request triggers the queue consumption after `batchInterval` milliseconds.
        if (this.queuedRequests.get(key).length === 1) {
          this.scheduleQueueConsumption(key);
        }

        // When amount of requests reaches `batchMax`, trigger the queue consumption without waiting on the `batchInterval`.
        if (this.queuedRequests.get(key).length === this.batchMax) {
          this.consumeQueue(key);
        }
      });
    }

    return requestCopy.observable;
  }

  // Consumes the queue.
  // Returns a list of promises (one for each query).
  public consumeQueue(
    key: string = '',
  ): (Observable<FetchResult> | undefined)[] | undefined {
    const queuedRequests = this.queuedRequests.get(key);

    if (!queuedRequests) {
      return;
    }

    this.queuedRequests.delete(key);

    const requests: Operation[] = queuedRequests.map(
      queuedRequest => queuedRequest.operation,
    );

    const forwards: NextLink[] = queuedRequests.map(
      queuedRequest => queuedRequest.forward,
    );

    const observables: (Observable<FetchResult> | undefined)[] = [];
    const nexts: any[] = [];
    const errors: any[] = [];
    const completes: any[] = [];
    queuedRequests.forEach((batchableRequest, index) => {
      observables.push(batchableRequest.observable);
      nexts.push(batchableRequest.next);
      errors.push(batchableRequest.error);
      completes.push(batchableRequest.complete);
    });

    const batchedObservable =
      this.batchHandler(requests, forwards) || Observable.of();

    const onError = error => {
      //each callback list in batch
      errors.forEach(rejecters => {
        if (rejecters) {
          //each subscriber to request
          rejecters.forEach(e => e(error));
        }
      });
    };

    batchedObservable.subscribe({
      next: results => {
        if (!Array.isArray(results)) {
          results = [results];
        }

        if (nexts.length !== results.length) {
          const error = new Error(
            `server returned results with length ${
              results.length
            }, expected length of ${nexts.length}`,
          );
          (error as any).result = results;

          return onError(error);
        }

        results.forEach((result, index) => {
          // attach the raw response to the context for usage
          requests[index].setContext({ response: result });
          if (nexts[index]) {
            nexts[index].forEach(next => next(result));
          }
        });
      },
      error: onError,
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

  private scheduleQueueConsumption(key: string = ''): void {
    setTimeout(() => {
      if (this.queuedRequests.get(key) && this.queuedRequests.get(key).length) {
        this.consumeQueue(key);
      }
    }, this.batchInterval);
  }
}
