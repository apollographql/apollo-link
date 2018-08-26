namespace Observable {

}

import { ZenObservable } from './types';

export { ZenObservable };

export type Observer<T> = ZenObservable.Observer<T>;
export type Subscriber<T> = ZenObservable.Subscriber<T>;
export type ObservableLike<T> = ZenObservable.ObservableLike<T>;

export declare class Observable<T> {
  constructor(subscriber: ZenObservable.Subscriber<T>);

  public subscribe(
    observer: ZenObservable.Observer<T>,
  ): ZenObservable.Subscription;
  public subscribe(
    onNext: (value: T) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ): ZenObservable.Subscription;

  public forEach(callback: (value: T) => void): Promise<void>;
  public map<R>(callback: (value: T) => R): Observable<R>;
  public filter(callback: (value: T) => boolean): Observable<T>;
  public reduce(
    callback: (previousValue: T, currentValue: T) => T,
    initialValue?: T,
  ): Observable<T>;
  public reduce<R>(
    callback: (previousValue: R, currentValue: T) => R,
    initialValue?: R,
  ): Observable<R>;
  public flatMap<R>(
    callback: (value: T) => ZenObservable.ObservableLike<R>,
  ): Observable<R>;
  public concat<R>(...observable: Array<Observable<R>>): Observable<R>;

  public static from<R>(
    observable: Observable<R> | ZenObservable.ObservableLike<R> | ArrayLike<R>,
  ): Observable<R>;
  public static of<R>(...items: R[]): Observable<R>;
}
