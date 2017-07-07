import { createApolloFetch } from 'apollo-fetch';
import * as Observerable from 'zen-observable';

import Link from '../';

export default (uri: string) => {
  // create HTTP utility
  const fetcher = createApolloFetch({ uri });

  // create Link from request and previous link
  return new Link((request, prev = Link.empty()) => {
    // hook up Observerable
    return new Observerable(observer => {
      const subscription = prev.request(request).subscribe({
        // merge previous data after
        next: (data = {}) => {
          // make the actual request
          fetcher(request)
            .then(result => {
              observer.next({ ...data, ...result });
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

      return () => subscription.unsubscribe();
    });
  });
};
