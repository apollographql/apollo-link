import * as Observable from 'zen-observable';

import Link, { OperationRequest } from '../';

// linear interval
export const defaultInterval = (delay, count) => delay;

// example using a class instead of a closure
export default class Retry extends Link {
  max: number = 10;
  delay: number = 300;
  count: number = 0;
  interval: (delay: number, count: number) => number;

  constructor(
    { max, delay }: { max: number; delay: number },
    interval = defaultInterval,
  ) {
    super();
    this.max = max;
    this.delay = delay;
    this.interval = interval;
    this.value = this.retry;
  }

  retry(operation: OperationRequest, prev: Link) {
    return new Observable(observer => {
      let timer;
      let subscription;

      // const observable = prev.request(operation)

      const request = observable => {
        subscription = observable.subscribe({
          next: data => {
            this.count = 0;
            observer.next(data);
          },
          error: error => {
            if (this.count < this.max) {
              this.count++;
              timer = setTimeout(() => {
                subscription.unsubscribe();
                // rebind retry for next attempt
                request(prev.request(operation));
              }, this.interval(this.delay, this.count));
            } else {
              observer.error(error);
            }
          },
        });
      };

      // bind retry from inital attempt
      request(prev.request(operation));

      return () => {
        if (subscription) subscription.unsubscribe();
        if (timer) clearTimeout(timer);
        observer.complete();
      };
    });
  }
}
