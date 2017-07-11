import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
} from './types';
import * as Observable from 'zen-observable';

export default class CacheLink implements ApolloLink {

  private cache: Map<Operation, {results: FetchResult[], observers}> = new Map();
  // private merge: (cached: FetchResult, newData: FetchResult) => FetchResult;

  public request(operation: Operation, forward: NextLink) {
    //Or the cache could have an observable that can have multiple subscribers,
    //somehow needs to be notified of first data(could resend to everyone)
    if (this.cache.has(operation)) {
      const {results, observers} = this.cache.get(operation);
      return new Observable(observer => {
        observers.push(observer);
        results.map((result) => observer.next(result));
      });
    }

    const observable = forward(operation);
    return observable.map(result => {
      if (this.cache.has(operation)) {
        const { observers } = this.cache.get(operation);
        observers.next(result);
      } else {
        this.cache.set(operation, {
          results: [result],
          observers: [],
        });
      }
      return result;
    });
  }

}
