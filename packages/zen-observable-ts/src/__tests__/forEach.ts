import { Observable } from '../zenObservable';

describe('forEach ', () => {
  it.skip('throws on not a function', done => {
    try {
      Observable.from([1, 2, 3, 4]).forEach(<any>1);
    } catch (e) {
      try {
        expect(e.message).toMatch(/not a function/);
        done();
      } catch (e) {
        done.fail(e);
      }
    }
  });

  it('throws on not a function', () => {
    const error = new Error('completed');
    return new Observable<number>(observer => {
      observer.complete();
      throw error;
    })
      .forEach(x => x)
      .catch(err => expect(err).toEqual(error));
  });
});
