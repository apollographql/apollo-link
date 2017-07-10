import * as Observable from 'zen-observable';

import Link, { OperationRequest } from '../';

// default to polling every second
export default (
  // allow caculating the polling amount based on the request
  interval: (request: OperationRequest) => number | number = 1000,
) =>
  new Link(
    (request: OperationRequest, prev?: Link) =>
      new Observable(observer => {
        let timer = setInterval(() => {
          // polling cannot come first in the link
          // it will poll the links prior but nothing after
          // so put polling near / at the bottom of a chain
          if (prev) {
            // make the execution request
            const stack = prev.request(request);

            // store for unsubscribe in complete function
            const subscription = stack.subscribe({
              // XXX why doesnt spreading the observer work here?
              next: data => observer.next(data),
              error: e => observer.error(e),
              // cleanup everything
              complete: () => {
                if (subscription) subscription.unsubscribe();
              },
            });

            return subscription;
          }

          // no previous link, so nothing to poll
          observer.error(
            new Error('polling link should be used after a data fetching link'),
          );
        }, typeof interval === 'function' ? interval(request) : interval);

        // cleanup
        return () => {
          observer.complete();
          if (timer) clearInterval(timer);
        };
      }),
  );
