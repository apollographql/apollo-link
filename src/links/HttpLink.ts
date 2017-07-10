import { createApolloFetch } from 'apollo-fetch';
import * as Observable from 'zen-observable';

import Link, { OperationRequest } from '../';

// set an endpoint for requests
export default (uri: string) => {
  // XXX if apollo-fetch supports context on the request,
  // we can use `map` to implement middleware and
  // `map` on the result to implement afterware
  const fetcher = createApolloFetch({ uri });

  // create Link from request and previous link
  return new Link((request: OperationRequest, prev = Link.empty()) => {
    // hook up Observable
    return new Observable(observer => {
      const subscription = prev.request(request).subscribe({
        // merge previous data after
        next: (data = {}) => {
          // make the actual request
          fetcher(request)
            .then(result => {
              observer.next({ ...data, ...result });
              // since this only runs once, complete the observer
              observer.complete();
            })
            .catch(error => {
              observer.error(error);
            });
        },
        error: error => {
          observer.error(error);
        },
      });

      // can this support cancellation?
      return () => subscription.unsubscribe();
    });
  });
};
