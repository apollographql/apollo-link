import { assert } from 'chai';
import Observable from '../src/zenObservable';

describe('flatMap', () => {
  it('Observable.from', () => {
    let list: Array<number> = [];

    return Observable.from([1, 2, 3])
      .flatMap(x => {
        return Observable.from([x * 1, x * 2, x * 3]);
      })
      .forEach(x => {
        list.push(x);
      })
      .then(() => {
        assert.deepEqual(list, [1, 2, 3, 2, 4, 6, 3, 6, 9]);
      });
  });

  it('Error if return value is not observable', () => {
    return Observable.from([1, 2, 3])
      .flatMap(() => {
        return <any>1;
      })
      .forEach(() => null)
      .then(() => assert(false), () => assert(true));
  });
});
