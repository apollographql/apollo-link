import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link';

export namespace PollingLink {
  /**
   * Frequency (in milliseconds) that an operation should be polled on.
   */
  export interface PollInterval {
    (operation: Operation): number | null;
  }
}

export class PollingLink extends ApolloLink {
  private pollInterval: PollingLink.PollInterval;
  private timer;
  private subscription: ZenObservable.Subscription;

  constructor(pollInterval: PollingLink.PollInterval) {
    super();
    this.pollInterval = pollInterval;
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    return new Observable(observer => {
      const subscriber = {
        next: data => {
          observer.next(data);
        },
        error: error => observer.error(error),
      };

      const poll = () => {
        this.subscription.unsubscribe();
        this.subscription = forward(operation).subscribe(subscriber);
      };

      const interval = this.pollInterval(operation);
      if (interval !== null) {
        this.timer = setInterval(poll, interval);
      }

      this.subscription = forward(operation).subscribe(subscriber);

      return () => {
        if (this.timer) {
          clearInterval(this.timer);
        }
        this.subscription.unsubscribe();
      };
    });
  }
}
