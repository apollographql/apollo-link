import AbstractObservable from './abstractObservable';
import { FetchResult } from './types';

export default class HttpObservable extends AbstractObservable {

  private result: Promise<FetchResult>;
  private started: boolean;
  private stopped: boolean;

  constructor(result: Promise<FetchResult>) {
    super();
    this.result = result;
    this.started = false;
    this.stopped = false;
  }

  //Called on first subscribe
  public start() {
    if (this.started) {
      return; //Could throw an error
    }

    this.result.then(data => {
      if (!this.stopped) {
        this.onNext(data);
        this.onComplete();
      }
    })
    .catch(error => {
      if (!this.stopped) {
        this.onError(error);
      }
    });

    this.started = true;
  }

  public stop() {
    //cancel the fetch if possible
    this.onComplete();
    this.stopped = true;
  }
}
