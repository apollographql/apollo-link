import { Observable } from '../zenObservable';

describe('map', () => {
  it('Basics', () => {
    let list: Array<number> = [];

    return Observable.from([1, 2, 3])
      .map(x => x * 2)
      .forEach(x => list.push(x))
      .then(() => expect(list).toEqual([2, 4, 6]));
  });

  it('throws on not a function', done => {
    try {
      Observable.from([1, 2, 3, 4])
        .map(<any>1)
        .forEach(x => void 0)
        .then(() => done.fail());
    } catch (e) {
      expect(e.message).toMatch(/not a function/);
      done();
    }
  });

  it('throws on error inside function', done => {
    const error = new Error('thrown');
    try {
      Observable.from([1, 2, 3, 4])
        .map(num => {
          expect(num).toEqual(1);
          debugger;
          throw error;
        })
        .subscribe({
          error: err => {
            expect(err).toEqual(error);
            done();
          },
        });
    } catch (e) {
      done.fail(e);
    }
  });

  it('does not throw on closed subscription', () => {
    const obs = Observable.from([1, 2, 3, 4]);
    obs.subscribe({}).unsubscribe();
    return expect(
      () => obs.map(x => x * 2).forEach(x => void 0).then,
    ).not.toThrow();
  });

  it('does not throw on internally closed subscription', () => {
    const obs = new Observable<number>(observer => {
      observer.next(1);
      observer.next(1);
      observer.complete();
      observer.next(1);
    });
    return expect(
      () => obs.map(x => x * 2).forEach(x => void 0).then,
    ).not.toThrow();
  });
});
