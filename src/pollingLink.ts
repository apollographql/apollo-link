import {
  Operation,
  NextLink,
} from './types';

import * as Observable from 'zen-observable';

import {
  ApolloLink,
} from './link';


export default class PollingLink extends ApolloLink {

  private pollInterval: number;

  constructor(pollInterval?: number) {
    super();
    this.pollInterval = pollInterval || 0;
  }

  public request(operation: Operation, forward: NextLink) {
    return new Observable(observer => {
      if (this.pollInterval) {
        setTimeout(() => {
          if (!observer.closed) {
            forward(operation).subscribe(observer);
          }
        }, this.pollInterval);
      }

      forward(operation).subscribe(
        observer,
      );
    });
  }

}
