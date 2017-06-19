import AbstractObservable from './abstractObservable';

export default class HttpObservable extends AbstractObservable {
  private request: () => Promise<Response>;
  private started: boolean;

  constructor(request: () => Promise<Response>) {
    super();
    this.request = request;
  }

  public start() {
    if (this.started) {
      throw Error('Observer already started');
    }

    this.handleResponse(this.request());
    this.started = true;
  }

  public stop() {
    super.onComplete();
  }

  private handleResponse(response: Promise<Response>) {
      response.then( result => result.json() )
      .then(
        data => {
          super.onNext(data);
          super.onComplete();
        },
      )
      .catch(super.onError);
  }
}
