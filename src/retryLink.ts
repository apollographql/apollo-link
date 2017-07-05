import {
  Observable,
  ApolloLink,
  Operation,
  NextLink,
  Subscriber,
  FetchResult,
} from './types';
import AbstractObservable from './abstractObservable';
import {
  validateOperation,
  ensureNext,
} from './linkUtils';


class RetryObservable extends AbstractObservable {

  private runRequest: () => Observable;
  private queryCount: number = 0;
  private retryDelay: number;
  private maxQueries: number = 10;

  private subscriber: Subscriber<FetchResult> = {
    next: data => {
      this.onNext(data);
      this.queryCount = 0;
    },
    error: error => {
      if (this.queryCount < this.maxQueries) {
        setTimeout(() => this.runRequest().subscribe(this.subscriber), Math.pow(this.retryDelay, this.queryCount));
      } else {
        this.onError(error);
      }
    },
    complete: this.onComplete,
  };

  constructor (runRequest: () => Observable, params?: {maxQueries?: number, delay?: number}) {
    super();
    this.runRequest = () => {
      this.queryCount++;
      return runRequest();
    };
    this.retryDelay = (params && params.delay) || 2;
    this.maxQueries = (params && params.maxQueries) || 10;
  }

  public start() {
    this.runRequest().subscribe(this.subscriber);
  }

  public stop() {
    return void 0;
  }
}

export default class RetryLink implements ApolloLink {

  constructor (private params?: {maxQueries?: number, delay?: number}) {

  }

  public request(operation: Operation, next?: NextLink): Observable {
    validateOperation(operation);
    ensureNext(next);

    return new RetryObservable(() => next(operation), this.params);
  }
}
