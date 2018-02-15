import { Observable, ApolloLink, execute } from 'apollo-link';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

import {
  parseAndCheckResponse,
  selectOptionsAndBody,
  selectURI,
  serializeBody,
} from '../index';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

describe('Link Utilities', () => {
  describe('parseAndCheckResponse', () => {
    it('throws a network error with a status code and result', () => {});
    it('throws a server error on incorrect data', () => {});
    it('is able to return a correct result and add it to the context', () => {});
  });

  describe('selectOptionsAndBody', () => {
    it('throws a network error', () => {});
  });

  describe('selectURI', () => {
    it('returns a passed in string', () => {});
    it('returns a fallback of /graphql', () => {});
    it('returns the result of a UriFunction', () => {});
  });

  describe('serializeBody', () => {
    it('throws a parse error on an unparsable body', () => {});
    it('returns a correctly parsed body', () => {});
  });
});
