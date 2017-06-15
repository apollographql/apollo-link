import { Observable, Subscriber, FetchResult } from './types';
import { toSubscriber } from './subscriber';

abstract class AbstractObservable implements Observable {

  private subscribers: Array<Subscriber<FetchResult>>;

  constructor(request: () => Promise<Response>) {
    this.subscribers = [];
    this.onNext = this.onNext.bind(this);
    this.onError = this.onError.bind(this);
    this.onComplete = this.onComplete.bind(this);
  }

  public subscribe(
    nextOrSubscriber: Subscriber<FetchResult> | ((result: FetchResult) => void),
    error?: (error: any) => void,
    complete?: () => void) {

    //throw error when incorect state? or fail silently
    const subscriber = toSubscriber<FetchResult>(nextOrSubscriber, error, complete);
    this.subscribers.push(subscriber);

    this.start();

    return () => this.subscribers.filter(sub => sub !== subscriber);
  }

  public abstract status(): object;
  public abstract start(): void;
  public abstract stop(): void;


  protected onNext = (data: FetchResult) => {
    this.subscribers.forEach(subscriber => setTimeout(() => subscriber.next(data), 0));
  }

  protected onError = (error) => {
    this.subscribers.forEach(subscriber => setTimeout(() => subscriber.error(error), 0));
  }

  protected onComplete = () => {
    this.subscribers.forEach(subscriber => subscriber.complete ? setTimeout(subscriber.complete, 0) : null);
  }

}
