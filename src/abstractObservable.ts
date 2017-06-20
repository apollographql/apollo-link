import {
  Observable,
  FetchResult,
  Subscriber,
  UnsubscribeHandler,
} from './types';
import { toSubscriber } from './subscriber';

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
    complete?: () => void): UnsubscribeHandler {

    if (this.terminated) {
      throw new Error('Observer already terminated');
    }

    const subscriber = toSubscriber<FetchResult>(nextOrSubscriber, error, complete);

    this.subscribers.push(subscriber);

    if (this.subscribers.length === 1) {
      this.start();
    }

    return () => {
      //remove the first matching subscriber, since a subscriber could subscribe multiple times a filter will not work
      this.subscribers.splice(this.subscribers.indexOf(subscriber), 1);
      if (this.subscribers.length === 0) {
        this.stop();
      }
    };
  }

  protected onNext = (data: FetchResult) => {
    this.subscribers.forEach(subscriber => setTimeout(() => subscriber.next(data), 0));
  }

  protected onError = (error) => {
    this.subscribers.forEach(subscriber => subscriber.error ? setTimeout(() => subscriber.error(error), 0) : null);
    this.terminated = true;
  }

  protected onComplete = () => {
    this.subscribers.forEach(subscriber => subscriber.complete ? setTimeout(subscriber.complete, 0) : null);
    this.terminated = true;
  }
}

