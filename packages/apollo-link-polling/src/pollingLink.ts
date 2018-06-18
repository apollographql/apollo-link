import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link';

import { interval } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

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

  constructor(pollInterval: PollingLink.PollInterval) {
    super();
    this.pollInterval = pollInterval;
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    return interval(this.pollInterval(operation)).pipe(
      mergeMap(() => forward(operation)),
    );
  }
}
