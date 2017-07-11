import {
  ApolloLink,
  Operation,
  NextLink,
} from './types';
import * as Observable from 'zen-observable';
import {
  ensureForward,
} from './linkUtils';

export default class RetryLink implements ApolloLink {

  private count: number = 0;
  private delay: number;
  private max: number;
  private interval: (delay: number, count: number) => number;

  constructor (params?: {
    max?: number,
    delay?: number,
    interval?: (delay: number, count: number) => number,
  }) {
    this.max = params && params.max || 10;
    this.delay =  params && params.delay || 300;
    this.interval =  params && params.interval || this.defaultInterval;
  }

  public request(operation: Operation, forward?: NextLink) {
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
