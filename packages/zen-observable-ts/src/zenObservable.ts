declare function require(name: string);
const _Observable = require('zen-observable');

import { ZenObservable } from './types';

export { ZenObservable };

export type Observer<T> = ZenObservable.Observer<T>;
export type Subscriber<T> = ZenObservable.Subscriber<T>;
export type ObservableLike<T> = ZenObservable.ObservableLike<T>;

export default class Observable<T> extends (_Observable as {
  new (subscriber: any): any;
  from(...args): any;
  of(...args): any;
}) {
  public static from<R>(
    observable: Observable<R> | ZenObservable.ObservableLike<R> | ArrayLike<R>,
  ): Observable<R> {
    return super.from(observable);
  }

  public static of<R>(...items: R[]): Observable<R> {
    return super.of(...items);
  }

  constructor(subscriber: ZenObservable.Subscriber<T>) {
    super(subscriber) as any;
  }

  public subscribe(
    observerOrNext: ((value: T) => void) | ZenObservable.Observer<T>,
    error?: (error: any) => void,
    complete?: () => void,
  ): ZenObservable.Subscription {
    return super.subscribe(observerOrNext, error, complete);
  }

  public forEach(fn: (value: T) => void): Promise<void> {
    return super.forEach(fn);
  }

  public map<R>(fn: (value: T) => R): Observable<R> {
    return super.map(fn);
  }

  public filter(fn: (value: T) => boolean): Observable<T> {
    return super.filter(fn);
  }

  public reduce<R = T>(
    fn: (previousValue: R | T, currentValue: T) => R | T,
    initialValue?: R | T,
  ): Observable<R | T> {
    return super.reduce(fn, initialValue);
  }

  public concat(...sources: Array<Observable<T>>) {
    return super.concat(...sources);
  }

  public flatMap<R>(
    fn: (value: T) => ZenObservable.ObservableLike<R>,
  ): Observable<R> {
    if (this.observable.flatMap) {
      return super.flatMap(fn);
    } else {
      console.error('this zen-observable does does not support flatMap');
    }
  }
}
