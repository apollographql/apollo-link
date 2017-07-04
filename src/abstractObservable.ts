import {
  Observable,
  FetchResult,
  Subscriber,
  Subscription,
} from './types';
import { toSubscriber } from './linkUtils';

export default abstract class AbstractObservable implements Observable {
  private subscribers: Array<Subscriber<FetchResult>>;
  private terminated: boolean;

  constructor() {
    this.subscribers = [];
    this.onNext = this.onNext.bind(this);
    this.onError = this.onError.bind(this);
    this.onComplete = this.onComplete.bind(this);
    this.terminated = false;
  }

  protected abstract start();
  protected abstract stop();

  public subscribe(
    nextOrSubscriber: Subscriber<FetchResult> | ((result: FetchResult) => void),
    error?: (error: any) => void,
    complete?: () => void): Subscription {


    const subscriber = toSubscriber<FetchResult>(nextOrSubscriber, error, complete);

    //Could throw an error instead of immediate complete
    if (this.terminated) {
      if (subscriber.complete) {
        subscriber.complete();
      }

      return {
        get closed() { return true; },
        unsubscribe: () => void 0,
      };
    }

    this.subscribers.push(subscriber);

    if (this.subscribers.length === 1) {
      this.start();
    }

    return (function (subscribers) {
      let finished = false;
      return {
        get closed() {
          return finished;
        },
        unsubscribe: () => {
          //remove the first matching subscriber, since a subscriber could subscribe multiple times a filter will not work
          subscribers.splice(subscribers.indexOf(subscriber), 1);
          if (subscribers.length === 0) {
            this.stop();
          }
          finished = true;
        },
      };
    }).bind(this)(this.subscribers);
  }

  protected onNext(data: FetchResult) {
    this.subscribers.forEach(subscriber => setTimeout(() => subscriber.next(data), 0));
  }

  protected onError(error) {
    this.subscribers.forEach(subscriber => subscriber.error ? setTimeout(() => subscriber.error(error), 0) : null);
    this.terminate();
  }

  protected onComplete() {
    this.subscribers.forEach(subscriber => subscriber.complete ? setTimeout(subscriber.complete, 0) : null);
    this.terminate();
  }

  private terminate = () => {
    this.subscribers = [];
    this.terminated = true;
  }
}

