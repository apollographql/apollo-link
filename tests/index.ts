import { assert } from 'chai';
import ApolloFetcher from '../src/index.js';

describe('mockNetworkInterfaceWithSchema', () => {
  it('can run a test', () => {
    const apolloFetcher = new ApolloFetcher();
    assert(apolloFetcher.canTest());
  });
});
