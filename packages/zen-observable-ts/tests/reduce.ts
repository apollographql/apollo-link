import { assert } from 'chai';
import Observable from '../src/zenObservable';

describe('reduce ', () => {
  it('No seed', () => {
    return Observable.from([1, 2, 3, 4, 5, 6])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(x => {
        assert.equal(x, 21);
      });
  });

  it('No seed - one value', () => {
    return Observable.from([1])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(x => {
        assert.equal(x, 1);
      });
  });

  it('No seed - empty (throws)', () => {
    return Observable.from([])
      .reduce((a, b) => {
        return a + b;
      })
      .forEach(() => null)
      .then(() => assert(false), () => assert(true));
  });

  it('Seed', () => {
    return Observable.from([1, 2, 3, 4, 5, 6])
      .reduce((a, b) => {
        return a + b;
      }, 100)
      .forEach(x => {
        assert.equal(x, 121);
      });
  });

  it('Seed - empty', () => {
    return Observable.from([])
      .reduce((a, b) => {
        return a + b;
      }, 100)
      .forEach(x => {
        assert.equal(x, 100);
      });
  });
});
