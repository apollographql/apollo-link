import { Subscriber } from './types';

function isSubscriber<T>(object: any): object is Subscriber<T> {
  return typeof object !== 'function';
}

export function toSubscriber<T>(
  nextOrSubscriber: Subscriber<T> | ((result: T) => void),
  error?: (error: any) => void,
  complete?: () => void): Subscriber<T> {

  if (isSubscriber(nextOrSubscriber)) {
    return <Subscriber<T>>nextOrSubscriber;
  } else {
    return {
      next: nextOrSubscriber,
      error,
      complete,
    };
  }
}
