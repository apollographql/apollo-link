import Observable from '../zenObservable';

describe('filter ', () => {
  it('Basics', () => {
    const list: Array<number> = [];

    return Observable.from([1, 2, 3, 4])
      .filter(x => x > 2)
      .forEach(x => list.push(x))
      .then(() => expect(list).toEqual([3, 4]));
  });

  it('throws on not a function', () => {
    const list: Array<number> = [];
    return expect(
      () =>
        Observable.from([1, 2, 3, 4])
          .filter(<any>1)
          .forEach(x => list.push(x)).then,
    ).toThrow();
  });

  it('throws on error inside function', done => {
    const error = new Error('thrown');
    return expect(() =>
      Observable.from([1, 2, 3, 4])
        .filter(() => {
          throw error;
        })
        .subscribe({
          error: err => {
            expect(err).toEqual(error);
            done();
          },
        }),
    ).not.toThrow();
  });

  it('does not throw on closed subscription', () => {
    const list: Array<number> = [];
    const obs = Observable.from([1, 2, 3, 4]);
    obs.subscribe({}).unsubscribe();
    return expect(
      () => obs.filter(x => x > 2).forEach(x => list.push(x)).then,
    ).not.toThrow();
  });

  it('does not throw on internally closed subscription', () => {
    const list: Array<number> = [];
    const obs = new Observable<number>(observer => {
      observer.next(1);
      observer.next(1);
      observer.complete();
      observer.next(1);
    });

    return expect(
      () => obs.filter(x => x > 2).forEach(x => list.push(x)).then,
    ).not.toThrow();
  });
});
