import { Observable } from '../zenObservable';
describe('reduce ', () => {
  it('No seed', () => {
    return Observable.from([1, 2, 3, 4, 5, 6])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(x => {
        expect(x).toBe(21);
      });
  });

  it('No seed - one value', () => {
    return Observable.from([1])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(x => {
        expect(x).toBe(1);
      });
  });

  it('No seed - empty (throws)', () => {
    return Observable.from([])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(() => null)
      .then(() => expect(false), () => expect(true));
  });

  it('Seed', () => {
    return Observable.from([1, 2, 3, 4, 5, 6])
      .reduce((a, b) => {
        return a + b;
      }, 100)
      .forEach(x => {
        expect(x).toBe(121);
      });
  });

  it('Seed - empty', () => {
    return Observable.from([])
      .reduce((a, b) => {
        return a + b;
      }, 100)
      .forEach(x => {
        expect(x).toBe(100);
      });
  });

  it('throws on not a function', done => {
    try {
      Observable.from([1, 2, 3, 4])
        .reduce(<any>1)
        .forEach(x => void 0)
        .then(() => done.fail());
    } catch (e) {
      expect(e.message).toMatch(/not a function/);
      done();
    }
  });

  it('throws on error inside function', done => {
    const error = new Error('thrown');
    return expect(() =>
      Observable.from([1, 2, 3, 4])
        .reduce(() => {
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
    const obs = Observable.from([1, 2, 3, 4]);

    obs.subscribe({}).unsubscribe();
    return expect(
      () =>
        obs
          .reduce((a, b) => {
            return a + b;
          }, 100)
          .forEach(x => {
            expect(x).toBe(110);
          }).then,
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
      () =>
        obs
          .reduce((a, b) => {
            return a + b;
          }, 100)
          .forEach(x => {
            expect(x).toBe(102);
          }).then,
    ).not.toThrow();
  });
});
