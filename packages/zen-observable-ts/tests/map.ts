import { assert } from 'chai';
import Observable from '../src/zenObservable';

describe('map', () => {
  it('Basics', () => {
    let list: Array<number> = [];

    return Observable.from([1, 2, 3])
      .map(x => x * 2)
      .forEach(x => list.push(x))
      .then(() => assert.deepEqual(list, [2, 4, 6]));
  });
});
