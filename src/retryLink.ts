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
  ensureForward,
} from './linkUtils';


class RetryObservable extends AbstractObservable {

  private runRequest: () => Observable;
  private queryCount: number = 0;
  private retryDelay: number;
  private maxRetries: number = 10;

  private subscriber: Subscriber<FetchResult> = {
    next: data => {
      this.onNext(data);
      this.queryCount = 0;
    },
    error: error => {
      if (this.queryCount < this.maxRetries) {
        setTimeout(() => this.runRequest().subscribe(this.subscriber), Math.pow(this.retryDelay, this.queryCount));
      } else {
        this.onError(error);
      }
    },
    complete: this.onComplete,
  };

  constructor (runRequest: () => Observable, params?: {maxRetries?: number, delay?: number}) {
    super();
    this.runRequest = () => {
      this.queryCount++;
      return runRequest();
    };
    this.retryDelay = (params && params.delay) || 2;
    this.maxRetries = (params && params.maxRetries) || 10;
  }

  public start() {
    this.runRequest().subscribe(this.subscriber);
  }

  public stop() {
    return void 0;
  }
}

export default class RetryLink implements ApolloLink {

  constructor (private params?: {maxRetries?: number, delay?: number}) {

  }

  public request(operation: Operation, forward?: NextLink): Observable {
    ensureForward(forward);

    return new RetryObservable(() => forward(operation), this.params);
  }
}
