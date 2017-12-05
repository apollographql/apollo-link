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

  constructor(params?: RetryLink.Options) {
    super();
    this.max = operationFnOrNumber((params && params.max) || 10);
    this.delay = operationFnOrNumber((params && params.delay) || 300);
    this.interval = (params && params.interval) || defaultInterval;
  }

  public request(
    operation: Operation,
    nextLink: NextLink,
  ): Observable<FetchResult> {
    let retryCount = 0;
    const values = [];
    let complete = false;
    const observers = [];
    let currentSubscription;
    let timerId;

    const subscriber = {
      next: data => {
        retryCount = 0;
        values.push(data);
        for (const observer of observers) {
          observer.next(data);
        }
      },
      error: error => {
        retryCount++;
        if (retryCount < this.max(operation)) {
          timerId = setTimeout(() => {
            const observable = nextLink(operation);
            currentSubscription = observable.subscribe(subscriber);
          }, this.interval(this.delay(operation), retryCount));
        } else {
          for (const observer of observers) {
            observer.error(error);
          }
        }
      },
      complete() {
        for (const observer of observers) {
          observer.complete();
        }
        complete = true;
      },
    };

    currentSubscription = nextLink(operation).subscribe(subscriber);

    return new Observable(observer => {
      observers.push(observer);
      for (const value of values) {
        observer.next(value);
      }
      if (complete) {
        observer.complete();
      }

      return () => {
        currentSubscription.unsubscribe();
        if (timerId) clearTimeout(timerId);
      };
    });
  }
}
