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
  export interface ParamFnOrNumber {
    (operation: Operation): number | number;
  }

  export interface IntervalFn {
    (delay: number, count: number): number;
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

export class RetryLink extends ApolloLink {
  private delay: RetryLink.ParamFnOrNumber;
  private max: RetryLink.ParamFnOrNumber;
  private interval: RetryLink.IntervalFn;
  private subscriptions: { [key: string]: ZenObservable.Subscription } = {};
  private timers = {};
  private counts: { [key: string]: number } = {};

  constructor(params?: RetryLink.Options) {
    super();
    this.max = operationFnOrNumber((params && params.max) || 10);
    this.delay = operationFnOrNumber((params && params.delay) || 300);
    this.interval = (params && params.interval) || defaultInterval;
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    const key = operation.toKey();
    if (!this.counts[key]) this.counts[key] = 0;
    return new Observable(observer => {
      const subscriber = {
        next: data => {
          this.counts[key] = 0;
          observer.next(data);
        },
        error: error => {
          this.counts[key]++;
          if (this.counts[key] < this.max(operation)) {
            this.timers[key] = setTimeout(() => {
              const observable = forward(operation);
              this.subscriptions[key] = observable.subscribe(subscriber);
            }, this.interval(this.delay(operation), this.counts[key]));
          } else {
            observer.error(error);
          }
        },
        complete: observer.complete.bind(observer),
      };

      this.subscriptions[key] = forward(operation).subscribe(subscriber);

      return () => {
        this.subscriptions[key].unsubscribe();
        if (this.timers[key]) clearTimeout(this.timers[key]);
      };
    });
  }
}
