import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
} from 'apollo-link';

import { switchMap } from 'rxjs/operators/switchMap';
import { interval } from 'rxjs/observable/interval';

export class PollingLink extends ApolloLink {
  private pollInterval: (operation: Operation) => number | null;

  constructor(pollInterval: (operation: Operation) => number | null) {
    super();
    this.pollInterval = pollInterval;
  }

  public request(
    operation: Operation,
    forward: NextLink,
  ): Observable<FetchResult> {
    const intervalValue = this.pollInterval(operation);

    return interval(intervalValue).pipe(switchMap(() => forward(operation)));
  }
}
