import { assert } from 'chai';
import Observable from '../src/zenObservable';

describe('filter ', () => {
  it('Basics', () => {
    let list: Array<number> = [];

    return Observable.from([1, 2, 3, 4])
      .filter(x => x > 2)
      .forEach(x => list.push(x))
      .then(() => assert.deepEqual(list, [3, 4]));
  });
});
