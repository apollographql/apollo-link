import AbstractObservable from '../../src/abstractObservable';
import {
  FetchResult,
} from '../../src/types';

export default class SuccessObservable extends AbstractObservable {

  constructor(private data?: FetchResult) {
    super();
  }

  public start() {
    this.onNext(this.data);
    this.onComplete();
  }

  public stop() {
    return void 0;
  }

}
