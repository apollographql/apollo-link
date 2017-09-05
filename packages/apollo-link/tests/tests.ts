import * as Allpollo from '../src/index';
import ApolloLinkAsDefault from '../src/index';
import { assert } from 'chai';

describe('Exports', () => {
  describe('HttpLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.HttpLink());
    });
  });

  describe('BatchLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(
        () => new Allpollo.BatchLink({ batchHandler: () => void 0 }),
      );
    });
  });

  describe('BatchHttpLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.BatchHttpLink());
    });
  });

  describe('RetryLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.RetryLink());
    });
  });

  describe('SetContextLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.SetContextLink());
    });
  });

  describe('PollingLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.PollingLink(() => 1));
    });
  });

  describe('DedupLink', () => {
    it('constructor', () => {
      assert.doesNotThrow(() => new Allpollo.DedupLink());
    });
  });

  describe('WebSocketLink', () => {
    it('constructor', () => {
      //Check that WebSocket has ApolloLink Methods
      assert.property(Allpollo.WebSocketLink, 'split');
      assert.property(Allpollo.WebSocketLink, 'from');
    });
  });

  describe('Link Core', () => {
    describe('execute', () => {
      it('exists', () => {
        assert.doesNotThrow(() => {
          Allpollo.execute(Allpollo.ApolloLink.from([() => null]), {});
        });
      });
    });
    describe('Observable', () => {
      it('exists', () => {
        assert.doesNotThrow(Allpollo.Observable.of);
      });
    });
    describe('makePromise', () => {
      it('exists', () => {
        assert.doesNotThrow(() => {
          Allpollo.makePromise(Allpollo.Observable.of());
        });
      });
    });
    describe('ApolloLink', () => {
      it('exists', () => {
        assert.doesNotThrow(() => {
          let apolloLink: Allpollo.ApolloLink;
          apolloLink = apolloLink;
        });
      });
    });
    describe('ApolloLink imported from default', () => {
      it('exists', () => {
        assert.doesNotThrow(() => {
          let apolloLink: ApolloLinkAsDefault;
          apolloLink = apolloLink;
        });
      });
    });
  });
});
