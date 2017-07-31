import { assert } from 'chai';
// import * as sinon from 'sinon';
import WebSocketLink from '../src/webSocketLink';

// import { ApolloLink, execute } from 'apollo-link-core';

const uri = 'ws://end.point';

describe('WebSocketLink', () => {
  it('constructs', () => {
    const client = <any>{};
    assert.doesNotThrow(() => new WebSocketLink({ uri, client }));
    assert(true);
  });
});
