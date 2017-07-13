import {
  Operation,
  NextLink,
  FetchResult,
} from './types';

import * as Observable from 'zen-observable';

import {
  ApolloLink,
} from './link';


export default class PollingLink extends ApolloLink {

  private pollInterval: number;
  private timer;

  constructor(pollInterval?: number) {
    super();
    this.pollInterval = pollInterval || 0;
  }

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    return new Observable(observer => {
      const subscriber = {
          next: (data) => {
            observer.next(data);
          },
          error: (error) => observer.error(error),
      };

      const poll = (() => {
        forward(operation).subscribe(subscriber);
      }).bind(this);

      if (this.pollInterval) {
        this.timer = setInterval(poll, this.pollInterval);
      }

      forward(operation).subscribe(subscriber);

      return () => {
        clearInterval(this.timer);
      };
    });
  }

}
