import { assert } from 'chai';
import SingleRequestLink from '../src/singleRequestLink';


describe('SingleRequestLink', () => {
  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new SingleRequestLink());
  });
});
