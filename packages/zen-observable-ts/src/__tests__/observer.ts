import Observable from '../zenObservable';

describe('of', () => {
  it('Basics', () => {
    let list: Array<number> = [];

    return Observable.of(1, 2, 3)
      .map(x => x * 2)
      .forEach(x => list.push(x))
      .then(() => expect(list).toEqual([2, 4, 6]));
  });
});

describe('subscription', () => {
  it('can close multiple times', () => {
    const sub = Observable.of(1).subscribe({});
    sub.unsubscribe();
    sub.unsubscribe();
  });

  it('can close multiple times', () => {
    let sub = Observable.of(1, 2).subscribe({});
    sub = Observable.of(1, 2).subscribe({
      next: sub.unsubscribe,
    });
  });
});

describe('observer', () => {
  it('throws when cleanup is not a function', () => {
    expect(() => {
      const sub = new Observable<number>(observer => {
        return <any>1;
      }).subscribe({});
      sub.unsubscribe();
    }).toThrow();
  });

  it('recalling next, error, complete have no effect', () => {
    const spy = jest.fn();
    const list: Array<number> = [];
    return new Observable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
      observer.next(4);
      observer.complete();
      spy();
    })
      .map(x => x * 2)
      .forEach(x => list.push(x))
      .then(() => expect(list).toEqual([2, 4, 6]))
      .then(() => expect(spy).toBeCalled());
  });

  it('throws on non function Observer', () => {
    expect(() => new Observable<number>(<any>1)).toThrow();
  });

  it('completes after error', () => {
    const error = new Error('completed');
    return new Promise((resolve, reject) =>
      new Observable<number>(observer => {
        observer.complete();
      }).subscribe({
        complete: () => {
          reject(error);
        },
      }),
    ).catch(err => expect(err).toEqual(error));
  });

  it('calling without options does not throw', () => {
    new Observable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).subscribe({});
  });

  it('calling without options does not throw', () => {
    let num = 0;
    return new Promise((resolve, reject) => {
      new Observable<number>(observer => {
        observer.next(1);
        observer.next(2);
        observer.next(3);
        observer.complete();
      }).subscribe(val => expect(++num).toBe(val), reject, resolve);
    });
  });

  it('throws error after complete', () => {
    const spy = jest.fn();
    const error = new Error('throws');
    return new Promise((resolve, reject) => {
      new Observable<number>(observer => {
        observer.complete();
        observer.error(error);
        spy();
      }).subscribe({
        next: reject,
        error: reject,
      });
    }).catch(err => {
      expect(spy).not.toBeCalled();
      expect(err).toEqual(error);
    });
  });
});
