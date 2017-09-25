import { assert } from 'chai';
import gql from 'graphql-tag';

import {
  NextLink,
  Operation,
} from 'apollo-link-core';

import {
  getQueryDocumentKey,
} from 'persistgraphql';

import PersistLink from '../src/persistLink';

describe('PersistLink', () => {
  it('constructs correctly with a query map', () => {
    assert.doesNotThrow(() => {
      // have to disable tslint because it doesn't expect
      // side-effects.
      /* tslint:disable */
      new PersistLink({
        "fake_key": "fake_id",
      });
      /* tslint:enable */
    });
  });

  it('returns an observable which emits an error if a query key is not found', (done) => {
    const pLink = new PersistLink({});
    pLink.request({
      query: gql`
        query {
          root
        }`,
    }).subscribe({
      next() {
        done(new Error('Returned result when it should not have.'));
      },
      error(err) {
        if (err.message.includes('Could not find query')) {
          done();
        } else {
          done(new Error('Returned the wrong error.'));
        }
      },
    });
  });

  it('calls the next link in the chain with the correct object', (done) => {
    const variables = {};
    const operationName = 'Authors';
    const queryId = 3;
    const queryDoc = gql`
      query Authors {
        authors {
          name
        }
      }`;
    const queryMap = {
      [ getQueryDocumentKey(queryDoc) ]: queryId,
    };

    const pLink = new PersistLink(queryMap);
    const nLink: NextLink = (operation: Operation) => {
      assert.deepEqual(operation, {
        query: null,
        variables,
        operationName,
        context: { queryId },
      });
      done();
      return null;
    };
    pLink.request({
      query: queryDoc,
      operationName,
      variables,
    }, nLink).subscribe({
      next() {
        done(new Error('Should be done before getting to this point.'));
      },
      error(err) {
        done(new Error('Errored when it should not have.'));
      },
    });
  });
});
