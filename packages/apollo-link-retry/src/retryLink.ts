import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';

const operationFnOrNumber = prop =>
  typeof prop === 'number' ? () => prop : prop;

const defaultInterval = delay => delay;

export namespace RetryLink {
  export type ParamFnOrNumber = number | ((operation: Operation) => number);

  export interface IntervalFn {
    (delay: number, count: number): number;
  }

  export interface IntervalPredicate {
    (operation: Operation, count: number): number | false;
  }

  export interface Options {
    /**
     * The max number of times to try a single operation before giving up.
     *
     * Can be a function that determines the number of attempts for a particular operation.
     *
     * Defaults to 10.
     */
    max?: ParamFnOrNumber;

    /**
     * Number of milliseconds to wait after a failed attempt before retrying.
     *
     * Can be a function that determines the delay for a particular operation.
     *
     * Defaults to 300.
     */
    delay?: ParamFnOrNumber;

    /**
     * A function that returns the actual milliseconds to wait after a failed attempt before retrying.
     *
     * Its first argument is the value of `delay` for that operation.
     *
     * Defaults to just passing the delay through.
     */
    interval?: IntervalFn;
  }
}

// For backwards compatibility.
export import ParamFnOrNumber = RetryLink.ParamFnOrNumber;

/**
 * Tracking and management of operations that may be (or currently are) retried.
 */
class RetryableOperation<TValue = any> {
  private retryCount: number = 0;
  private values: any[] = [];
  private error: any;
  private complete = false;
  private canceled = false;
  private observers: ZenObservable.Observer<TValue>[] = [];
  private currentSubscription: ZenObservable.Subscription = null;
  private timerId: number;

  constructor(
    private operation: Operation,
    private nextLink: NextLink,
    private retryAfter: RetryLink.IntervalPredicate,
  ) {}

  /**
   * Register a new observer for this operation.
   *
   * If the operation has previously emitted other events, they will be
   * immediately triggered for the observer.
   */
  subscribe(observer: ZenObservable.Observer<TValue>) {
    if (this.canceled) {
      throw new Error(
        `Subscribing to a retryable link that was canceled is not supported`,
      );
    }
    this.observers.push(observer);

    // If we've already begun, catch this observer up.
    for (const value of this.values) {
      observer.next(value);
    }

    if (this.complete) {
      observer.complete();
    } else if (this.error) {
      observer.error(this.error);
    }
  }

  /**
   * Remove a previously registered observer from this operation.
   *
   * If no observers remain, the operation will stop retrying, and unsubscribe
   * from its downstream link.
   */
  unsubscribe(observer: ZenObservable.Observer<TValue>) {
    const index = this.observers.indexOf(observer);
    if (index < 0) {
      throw new Error(
        `RetryLink BUG! Attempting to unsubscribe unknown observer!`,
      );
    }
    // Note that we are careful not to change the order of length of the array,
    // as we are often mid-iteration when calling this method.
    this.observers[index] = null;

    // If this is the last observer, we're done.
    if (this.observers.every(o => o === null)) {
      this.cancel();
    }
  }

  /**
   * Start the initial request.
   */
  start() {
    if (this.currentSubscription) return; // Already started.

    this.try();
  }

  /**
   * Stop retrying for the operation, and cancel any in-progress requests.
   */
  cancel() {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    clearTimeout(this.timerId);
    this.timerId = null;
    this.currentSubscription = null;
    this.canceled = true;
  }

  private try() {
    this.currentSubscription = this.nextLink(this.operation).subscribe({
      next: this.onNext,
      error: this.onError,
      complete: this.onComplete,
    });
  }

  private onNext = (value: any) => {
    this.values.push(value);
    for (const observer of this.observers) {
      observer.next(value);
    }
  };

  private onComplete = () => {
    this.complete = true;
    for (const observer of this.observers) {
      observer.complete();
    }
  };

  private onError = error => {
    this.retryCount += 1;
    const delay = this.retryAfter(this.operation, this.retryCount);
    // Should we retry?
    if (typeof delay === 'number') {
      this.scheduleRetry(delay);
      return;
    }

    this.error = error;
    for (const observer of this.observers) {
      observer.error(error);
    }
  };

  private scheduleRetry(delay) {
    if (this.timerId) {
      throw new Error(`RetryLink BUG! Encountered overlapping retries`);
    }

    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.try();
    }, delay);
  }
}

export class RetryLink extends ApolloLink {
  private intervalPredicate: RetryLink.IntervalPredicate;

  constructor(params?: RetryLink.Options) {
    super();

    const max = operationFnOrNumber((params && params.max) || 10);
    const delay = operationFnOrNumber((params && params.delay) || 300);
    const interval = (params && params.interval) || defaultInterval;

    this.intervalPredicate = (operation, count) => {
      if (count >= max(operation)) return false;
      return interval(delay(operation), count);
    };
  }

  public request(
    operation: Operation,
    nextLink: NextLink,
  ): Observable<FetchResult> {
    const retryable = new RetryableOperation(
      operation,
      nextLink,
      this.intervalPredicate,
    );
    retryable.start();

    return new Observable(observer => {
      retryable.subscribe(observer);
      return () => {
        retryable.unsubscribe(observer);
      };
    });
  }
}
