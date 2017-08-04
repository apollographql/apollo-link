import { assert } from 'chai';
// import * as sinon from 'sinon';
import BatchHttpLink from '../src/batchHttpLink';

// import * as Links from 'apollo-link-core';
// import { ApolloLink, execute } from 'apollo-link-core';

// import { createApolloFetch } from 'apollo-fetch';

// import { print } from 'graphql';
// import gql from 'graphql-tag';
// import * as fetchMock from 'fetch-mock';

describe('BatchHttpLink', () => {
  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new BatchHttpLink());
  });
});
