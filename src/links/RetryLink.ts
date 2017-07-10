import * as Observable from 'zen-observable';

import Link, { OperationRequest } from '../';

export interface RetryOptions {
  max: number | ConfigurationFunc<number>;
  delay: number | ConfigurationFunc<number>;
  interval: (
    request: OperationRequest,
    options: RetryOptions,
    count: number,
  ) => number;
}

export type ConfigurationFunc<Result> = (
  request: OperationRequest,
  options: RetryOptions,
) => Result;

// allow each configuration item to return a function
// which takes the OperationRequest and the original options,
// otherwise, use an actual value
export const functionOrValue = <Result>(
  val: ConfigurationFunc<Result> | Result,
  request: OperationRequest,
  options: RetryOptions,
): Result => {
  return typeof val === 'function' ? val(request, options) : val;
};

// linear interval is the default
// it can be replaced in the constructor with any interval
export const defaultInterval = (_, { delay }) => delay;

export const defaultOptions = {
  max: 10,
  delay: 300,
  interval: defaultInterval,
};

// example using a class instead of a closure
// to form a Link by extending the base class
// for some stateful links, this may be a more simple
// implementation than using values inside a closure
// NOTE: the Link interface never calls `new` on Links,
// that is up to the developer to do when creating the Link instance
export default class Retry extends Link {
  count: number = 0;
  options: RetryOptions;

  constructor(options: RetryOptions) {
    super();

    // wrap all possible options in possible function call
    this.options = { ...defaultOptions, ...options };

    // XXX should we have a method to set this?
    this.value = this.retry;
  }

  retry(operation: OperationRequest, prev: Link) {
    // determine max amount from options
    const max = functionOrValue(this.options.max, operation, this.options);
    const interval = this.options.interval;

    // return an Observable for continuing the chain
    return new Observable(observer => {
      // keep access to timer and subscribe so they can be cleaned up
      // these could also be stored on the class
      let timer;
      let subscription;

      // we recreate a new subscription each retry attempt
      // this function allows us to recursively subscribe as needed
      const request = observable => {
        // store subscription reference for cleanup
        subscription = observable.subscribe({
          next: data => {
            // reset count if we had a successful response
            // otherwise there would be a fixed number of retries for
            // the entire application, instead of per request
            this.count = 0;
            // pass data down the observable chain
            observer.next(data);
          },
          // this is wheree we actually retry something
          error: error => {
            // retry only if we haven't reached the max yet
            if (this.count < max) {
              // increment our counter of retries
              this.count++;
              // bind the timer for cleanup
              timer = setTimeout(() => {
                // cleanup the previous subscription before
                // creatinga new one
                subscription.unsubscribe();
                // rebind retry for next attempt
                request(prev.request(operation));
                // calculate the next attempt interval
              }, interval(operation, this.options, this.count));
            } else {
              // if we have reached our attempt limit, we need to pass
              // the error up the chain
              observer.error(error);
            }
          },
        });
      };

      // bind retry from inital attempt
      request(prev.request(operation));

      // cleanup function
      return () => {
        if (subscription) subscription.unsubscribe();
        if (timer) clearTimeout(timer);
        observer.complete();
      };
    });
  }
}
