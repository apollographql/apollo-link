import AbstractObservable from '../../src/abstractObservable';
import {
  FetchResult,
} from '../../src/types';

export default class SuccessObservable extends AbstractObservable {

  constructor(private data?: FetchResult, private count?: number) {
    super();
  }

  public start() {
    let i = this.count || 0;

    do {
      this.onNext(this.data);
    } while (--i > 0);

    this.onComplete();
  }

  public stop() {
    return void 0;
  }

}
