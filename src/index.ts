import * as ApolloFetcher from './types';
import HttpFetcher from './httpFetcher';
import BatchHttpFetcher from './batchHttpFetcher';
import createHttpFetcherNetworkInterface from './httpFetcherNetworkInterface';
import createBatchHttpFetcherNetworkInterface from './batchHttpFetcherNetworkInterface';

import {
  fetcherPromiseWrapper,
  fetcherToNetworkInterface,
}  from './fetcher-as-promise';

export {
  fetcherPromiseWrapper,
  fetcherToNetworkInterface,

  HttpFetcher,
  createHttpFetcherNetworkInterface,

  BatchHttpFetcher,
  createBatchHttpFetcherNetworkInterface,
};
export default ApolloFetcher;
