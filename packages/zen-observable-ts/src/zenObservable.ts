declare function require(name: string);
const _Observable = require('zen-observable');

import { ZenObservable } from './types';

export { ZenObservable };

export type Observer<T> = ZenObservable.Observer<T>;
export type Subscriber<T> = ZenObservable.Subscriber<T>;
export type ObservableLike<T> = ZenObservable.ObservableLike<T>;

export default class Observable<T> {
  private observable: any;

  public static from<R>(
    observable: Observable<R> | ZenObservable.ObservableLike<R> | ArrayLike<R>,
  ): Observable<R> {
    return _Observable.from(observable);
  }

  public static of<R>(...items: R[]): Observable<R> {
    return new Observable(observer => {
      for (let i = 0; i < items.length; ++i) {
        observer.next(items[i]);
        if (observer.closed) {
          return;
        }
      }

      if (observer.complete) {
        observer.complete();
      }
    });
  }

  constructor(subscriber: ZenObservable.Subscriber<T>) {
    this.observable = new _Observable(subscriber);
  }

  public subscribe(
    observerOrNext: ((value: T) => void) | ZenObservable.Observer<T>,
    error?: (error: any) => void,
    complete?: () => void,
  ): ZenObservable.Subscription {
    return new _Observable(observerOrNext, error, complete);
  }

  public forEach(fn: (value: T) => void): Promise<void> {
    return this.observable.forEach(fn);
  }

  public map<R>(fn: (value: T) => R): Observable<R> {
    return this.observable.map(fn);
  }

  public filter(fn: (value: T) => boolean): Observable<T> {
    return this.observable.filter(fn);
  }

  public reduce<R = T>(
    fn: (previousValue: R | T, currentValue: T) => R | T,
    initialValue?: R | T,
  ): Observable<R | T> {
    return this.observable.reduce(fn, initialValue);
  }

  public concat(...sources: Array<Observable<T>>) {
    return this.observable.concat(...sources);
  }

  public flatMap<R>(
    fn: (value: T) => ZenObservable.ObservableLike<R>,
  ): Observable<R> {
    if (this.observable.flatMap) {
      return this.observable.flatMap(fn);
    } else {
      console.error('this zen-observable does does not support flatMap');
    }
  }
}
