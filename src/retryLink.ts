import {
  Operation,
  NextLink,
  FetchResult,
} from './types';
import * as Observable from 'zen-observable';
import {
  ensureForward,
} from './linkUtils';

import {
  ApolloLink,
} from './link';

export default class RetryLink extends ApolloLink {

  private count: number = 0;
  private delay: number;
  private max: number;
  private interval: (delay: number, count: number) => number;

  constructor (params?: {
    max?: number,
    delay?: number,
    interval?: (delay: number, count: number) => number,
  }) {
    super();
    this.max = params && params.max || 10;
    this.delay =  params && params.delay || 300;
    this.interval =  params && params.interval || this.defaultInterval;
  }

  public request(operation: Operation, forward?: NextLink): Observable<FetchResult> {
    ensureForward(forward);


    return new Observable(observer => {
      const subscriber = {
        next: data => {
          observer.next(data);
          this.count = 0;
        },
        error: error => {
          this.count++;
          if (this.count < this.max) {
            setTimeout(() => {
              const observable = forward(operation);
              observable.subscribe(subscriber);
            }, this.interval(this.delay, this.count));
          } else {
            observer.error(error);
          }
        },
        complete: () => {
          observer.complete();
        },
        // This causes an error, not sure why
        // complete: observer.complete
      };

      forward(operation).subscribe(subscriber);
    });
  }

  private defaultInterval = (delay, count) => delay;
}
