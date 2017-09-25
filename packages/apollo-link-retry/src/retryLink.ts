import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
  ZenObservable,
} from 'apollo-link';

const operationFnOrNumber = prop =>
  typeof prop === 'number' ? () => prop : prop;

const defaultInterval = delay => delay;

export type ParamFnOrNumber = (Operation) => number | number;

export default class RetryLink extends ApolloLink {
  private count: number = 0;
  private delay: ParamFnOrNumber;
  private max: ParamFnOrNumber;
  private interval: (delay: number, count: number) => number;
  private subscription: ZenObservable.Subscription;
  private timer;

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
    return new Observable(observer => {
      const subscriber = {
        next: data => {
          this.count = 0;
          observer.next(data);
        },
        error: error => {
          this.count++;
          if (this.count < this.max(operation)) {
            this.timer = setTimeout(() => {
              const observable = forward(operation);
              this.subscription = observable.subscribe(subscriber);
            }, this.interval(this.delay(operation), this.count));
          } else {
            observer.error(error);
          }
        },
        complete: observer.complete.bind(observer),
      };

      this.subscription = forward(operation).subscribe(subscriber);

      return () => {
        this.subscription.unsubscribe();
        if (this.timer) clearTimeout(this.timer);
      };
    });
  }
}
