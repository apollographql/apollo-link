import AbstractObservable from '../../src/abstractObservable';

export default class ColdObservable extends AbstractObservable {

  constructor(private init?: () => void) {
    super();
  }

  public start() {
    if (this.init) {
      return this.init();
    }
  }
  public stop() {
    return void 0;
  }

  public onNext(data) {
    super.onNext(data);
  }

  public onError(error) {
    super.onError(error);
  }

  public onComplete() {
    super.onComplete();
  }

}
