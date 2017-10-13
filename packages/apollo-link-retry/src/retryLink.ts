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

export type ParamFnOrNumber = (operation: Operation) => number | number;

export class RetryLink extends ApolloLink {
  private delay: ParamFnOrNumber;
  private max: ParamFnOrNumber;
  private interval: (delay: number, count: number) => number;
  private subscriptions: { [key: string]: ZenObservable.Subscription } = {};
  private timers = {};
  private counts: { [key: string]: number } = {};

  constructor(params?: {
    max?: ParamFnOrNumber;
    delay?: ParamFnOrNumber;
    interval?: (delay: number, count: number) => number;
  }) {
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
