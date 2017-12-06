import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';

export namespace RetryLink {
  /**
   * Advanced mode: a function that determines both whether a particular
   * response should be retried, and the delay if so.
   */
  export interface DelayFunction {
    (count: number, operation: Operation, error: any): number | false;
  }

  export interface SimpleOptions {
    /**
     * The number of milliseconds to wait before attempting the first retry.
     *
     * Delays will increase exponentially for each attempt.  E.g. if this is
     * set to 100, subsequent retries will be delayed by 200, 400, 800, etc,
     * until they reach maxDelay.
     *
     * Note that if jittering is enabled, this is the _average_ delay.
     *
     * Defaults to 300.
     */
    initialDelay?: number;

    /**
     * The maximum number of milliseconds that the link should wait for any
     * retry.
     *
     * Defaults to Infinity.
     */
    maxDelay?: number;

    /**
     * The max number of times to try a single operation before giving up.
     *
     * Note that this INCLUDES the initial request as part of the count.
     * E.g. maxTries of 1 indicates no retrying should occur.
     *
     * Defaults to 5.  Pass Infinity for infinite retries.
     */
    maxTries?: number;

    /**
     * Enable randomization of delay values.
     *
     * This helps avoid thundering herd type situations by better distributing
     * load during major outages.
     *
     * Defaults to true.
     */
    jitter?: boolean;

    /**
     * Predicate function that determines whether a particular response should
     * be retried.
     *
     * By default, any response with an error will be retried.
     */
    retryIf?: (count: number, operation: Operation, error: any) => boolean;
  }

  export type Options = DelayFunction | SimpleOptions;
}

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
    private retryAfter: RetryLink.DelayFunction,
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
    const delay = this.retryAfter(this.retryCount, this.operation, error);
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
  private delayFunction: RetryLink.DelayFunction;

  constructor(optionsOrDelayFunction?: RetryLink.Options) {
    super();

    if (typeof optionsOrDelayFunction === 'function') {
      this.delayFunction = optionsOrDelayFunction;
    } else {
      this.delayFunction = RetryLink.buildDelayFunction(optionsOrDelayFunction);
    }
    // const max = operationFnOrNumber((params && params.max) || 10);
    // const delay = operationFnOrNumber((params && params.delay) || 300);
    // const interval = (params && params.interval) || defaultInterval;

    // this.delayFunction = (operation, count) => {
    //   if (count >= max(operation)) return false;
    //   return interval(delay(operation), count);
    // };
  }

  public request(
    operation: Operation,
    nextLink: NextLink,
  ): Observable<FetchResult> {
    const retryable = new RetryableOperation(
      operation,
      nextLink,
      this.delayFunction,
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

export namespace RetryLink {
  export const defaultOptions = {
    initialDelay: 300,
    maxDelay: Infinity,
    maxTries: 5,
    jitter: true,
    retryIf: (_count, _operation, error) => !!error,
  };

  export function buildDelayFunction(options?: SimpleOptions): DelayFunction {
    options = { ...defaultOptions, ...options };
    const { initialDelay, maxDelay, maxTries, jitter, retryIf } = options;

    let baseDelay;
    if (jitter) {
      // If we're jittering, baseDelay is half of the maximum delay for that
      // attempt (and is, on average, the delay we will encounter).
      baseDelay = initialDelay;
    } else {
      // If we're not jittering, adjust baseDelay so that the first attempt
      // lines up with initialDelay, for everyone's sanity.
      baseDelay = initialDelay / 2;
    }

    return function delayFunction(
      count: number,
      operation: Operation,
      error: any,
    ) {
      if (count >= maxTries) return false;
      if (!retryIf(count, operation, error)) return false;

      let delay = Math.min(maxDelay, baseDelay * 2 ** count);
      if (jitter) {
        // We opt for a full jitter approach for a mostly uniform distribution,
        // but bound it within initialDelay and delay for everyone's sanity.
        delay = Math.random() * delay;
      }

      return delay;
    };
  }
}
