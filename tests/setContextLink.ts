import { assert } from 'chai';

import SetContextLink from '../src/setContextLink';
import gql from 'graphql-tag';

import {
  ApolloLink,
  execute,
} from '../src/link';

const query = gql`
query SampleQuery {
  stub{
    id
  }
}
`;


describe('SetContextLink', () => {
  it('should construct without arguments', () => {
    assert.doesNotThrow(() => new SetContextLink());
  });

  it('should construct with a context', () => {
    assert.doesNotThrow(() => new SetContextLink({ prop: 'testing' }));
  });

  it('should create a context', (done) => {
    const context = new SetContextLink();
    execute(ApolloLink.from([context, (operation) => {
      assert.property(operation, 'context');
      assert.deepEqual(operation.context, {});
      return done();
    }]), {query});
  });

  it('should modify context', (done) => {
    const meta = { prop: 'testing' };
    const context = new SetContextLink(meta);
    execute(ApolloLink.from([context, (operation) => {
      assert.property(operation, 'context');
      assert.deepEqual(operation.context, meta);
      return done();
    }]), {query});

  });

});
