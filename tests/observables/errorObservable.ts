import AbstractObservable from '../../src/abstractObservable';

export default class ErrorObservable extends AbstractObservable {

  constructor(private error?: Error) {
    super();
  }

  public start() {
    this.onError(this.error);
  }

  public stop() {
    return void 0;
  }
}
