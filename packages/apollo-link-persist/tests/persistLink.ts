import { assert } from 'chai';

import PersistLink from '../src/persistLink';

describe('PersistLink', () => {
    it('constructs correctly with a query map', () => {
    assert.doesNotThrow(() => {
      new PersistLink({
        "fake_key": "fake_id",
      });
    });
  });
});
